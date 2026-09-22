import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MongoServerError } from 'mongodb';
import { Model } from 'mongoose';

import { Artwork, ArtworkDocument } from '../models/artwork.schema';
import { Exhibition, ExhibitionDocument } from '../models/exhibition.schema';
import { ReviewLog, ReviewLogDocument } from '../models/reviewLog.schema';
import {
  ArtworkStatus,
  ExhibitionStatus,
  ReviewAction,
  ReviewResult,
} from '../types/enums';
import { WithdrawalService } from './withdrawal.service';
import { withId, withIds } from '../utils/normalize';

interface Actor {
  id: string;
  role: string;
}

interface DecisionInput {
  targetType: 'Artwork' | 'Exhibition';
  targetId: string;
  result: ReviewResult;
  comment: string;
  actor: Actor;
}

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(ReviewLog.name) private readonly reviewModel: Model<ReviewLogDocument>,
    @InjectModel(Artwork.name) private readonly artworkModel: Model<ArtworkDocument>,
    @InjectModel(Exhibition.name) private readonly exhibitionModel: Model<ExhibitionDocument>,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  async listLogs(query: { targetType?: string; targetId?: string }) {
    const docs = await this.reviewModel.find(query).sort({ createdAt: -1 }).lean();
    return withIds(docs);
  }

  // ---------- 作品工作流 ----------

  /** 艺术家提交作品：Draft / 上次被退回 -> 待审。重复提交幂等（只生效一次）。 */
  async submitArtwork(artworkId: string, comment: string, actor: Actor) {
    const artwork = await this.artworkModel.findById(artworkId);
    if (!artwork) throw new NotFoundException('作品不存在。');
    if (actor.role !== 'Admin' && artwork.artistId !== actor.id) {
      throw new ForbiddenException('只能提交自己的作品。');
    }
    if (artwork.status === ArtworkStatus.PendingReview) {
      return withId(artwork.toObject());
    }

    // 条件原子更新：并发重复提交只有一次生效
    const update = await this.artworkModel.updateOne(
      { _id: artworkId, status: { $in: [ArtworkStatus.Draft, ArtworkStatus.Rejected] } },
      { $set: { status: ArtworkStatus.PendingReview, reviewReason: '' } },
    );
    if (update.matchedCount === 0) {
      throw new ConflictException('当前作品状态不能提交审核。');
    }

    await this.reviewModel.create({
      targetType: 'Artwork',
      targetId: artworkId,
      reviewerId: actor.id,
      action: ReviewAction.ArtworkSubmitted,
      comment: comment || '艺术家提交作品审核。',
    });
    const refreshed = await this.artworkModel.findById(artworkId);
    return withId(refreshed!.toObject());
  }

  /** 管理员给出作品审核结论。Flagged 只标记留痕，不改变待审状态。 */
  async decideArtwork(input: DecisionInput) {
    const { targetId, result, comment, actor } = input;
    this.assertAdmin(actor, '只有管理员可以审核作品。');

    const artwork = await this.artworkModel.findById(targetId);
    if (!artwork) throw new NotFoundException('作品不存在。');

    if (result === ReviewResult.Flagged) {
      if (artwork.status !== ArtworkStatus.PendingReview) {
        throw new ConflictException('该作品不在待审队列。');
      }
      await this.reviewModel.create({
        targetType: 'Artwork', targetId, reviewerId: actor.id,
        action: ReviewAction.ArtworkFlagged, result, comment,
      });
      const unchanged = await this.artworkModel.findById(targetId);
      return withId(unchanged!.toObject());
    }

    // 条件原子更新：并发/重复审核只有一次能离开待审队列
    const nextStatus = result === ReviewResult.Approved ? ArtworkStatus.Approved : ArtworkStatus.Rejected;
    const reason = result === ReviewResult.Approved ? comment : comment || '作品未通过审核。';
    const update = await this.artworkModel.updateOne(
      { _id: targetId, status: ArtworkStatus.PendingReview },
      { $set: { status: nextStatus, reviewReason: reason } },
    );
    if (update.matchedCount === 0) {
      throw new ConflictException('该作品不在待审队列，重复审核只生效一次。');
    }

    await this.reviewModel.create({
      targetType: 'Artwork',
      targetId,
      reviewerId: actor.id,
      action: result === ReviewResult.Approved ? ReviewAction.ArtworkApproved : ReviewAction.ArtworkRejected,
      result,
      comment,
    });
    const refreshed = await this.artworkModel.findById(targetId);
    return withId(refreshed!.toObject());
  }

  /**
   * 管理员推翻作品审核结果。
   * Approved/Published/Sold -> Rejected：自动撤出所有进行中展览；若原本在公开展览，回落状态。
   * Rejected -> Approved：重新进入已通过状态。
   */
  async overturnArtwork(targetId: string, nextResult: ReviewResult.Approved | ReviewResult.Rejected, comment: string, actor: Actor) {
    this.assertAdmin(actor, '只有管理员可以推翻审核结果。');
    const artwork = await this.artworkModel.findById(targetId);
    if (!artwork) throw new NotFoundException('作品不存在。');

    if (!comment) throw new BadRequestException('推翻审核必须填写原因。');

    if (nextResult === ReviewResult.Approved) {
      const update = await this.artworkModel.updateOne(
        { _id: targetId, status: { $in: [ArtworkStatus.Rejected, ArtworkStatus.Archived] } },
        { $set: { status: ArtworkStatus.Approved, reviewReason: comment } },
      );
      if (update.matchedCount === 0) {
        throw new ConflictException('只有被退回/下架的作品可以恢复为通过。');
      }
    } else {
      const guard = await this.artworkModel.updateOne(
        { _id: targetId, status: { $in: [ArtworkStatus.Approved, ArtworkStatus.Published, ArtworkStatus.Sold] } },
        { $set: { status: ArtworkStatus.Rejected, reviewReason: comment } },
      );
      if (guard.matchedCount === 0) {
        throw new ConflictException('该作品当前结论不是通过，无需推翻。');
      }
      const withdrawals = await this.withdrawalService.withdrawArtwork(targetId, `审核结果被推翻：${comment}`);
      await this.logWithdrawals(targetId, withdrawals, actor.id, ReviewAction.ArtworkOverturned);
    }

    await this.reviewModel.create({
      targetType: 'Artwork', targetId, reviewerId: actor.id,
      action: ReviewAction.ArtworkOverturned, result: nextResult, comment,
    });
    const refreshedArtwork = await this.artworkModel.findById(targetId);
    return withId(refreshedArtwork!.toObject());
  }

  /** 下架作品：从所有进行中展览撤出并记录原因，作品转为 Archived。 */
  async takeDownArtwork(targetId: string, comment: string, actor: Actor) {
    if (actor.role !== 'Admin' && actor.role !== 'Curator') {
      throw new ForbiddenException('只有管理员或策展人可以下架作品。');
    }
    if (!comment) throw new BadRequestException('下架必须填写原因。');
    const exists = await this.artworkModel.exists({ _id: targetId });
    if (!exists) throw new NotFoundException('作品不存在。');

    // 条件原子更新：重复/并发下架只生效一次
    const guard = await this.artworkModel.updateOne(
      { _id: targetId, status: { $ne: ArtworkStatus.Archived } },
      { $set: { status: ArtworkStatus.Archived, reviewReason: comment } },
    );
    if (guard.matchedCount === 0) {
      throw new ConflictException('作品已下架，重复下架只生效一次。');
    }

    const withdrawals = await this.withdrawalService.withdrawArtwork(targetId, `作品下架：${comment}`);

    await this.logWithdrawals(targetId, withdrawals, actor.id, ReviewAction.ArtworkTakenDown);
    await this.reviewModel.create({
      targetType: 'Artwork', targetId, reviewerId: actor.id,
      action: ReviewAction.ArtworkTakenDown, comment,
    });
    const refreshed = await this.artworkModel.findById(targetId);
    return withId(refreshed!.toObject());
  }

  // ---------- 展览工作流 ----------

  /** 策展人送审展览（仅自己策划的、筹备中/被退回的展览，且至少含一件作品）。 */
  async submitExhibition(exhibitionId: string, comment: string, actor: Actor) {
    const exhibition = await this.exhibitionModel.findById(exhibitionId);
    if (!exhibition) throw new NotFoundException('展览不存在。');
    if (actor.role !== 'Admin' && exhibition.curatorId !== actor.id) {
      throw new ForbiddenException('只能送审自己策划的展览。');
    }
    if (exhibition.status === ExhibitionStatus.PendingReview) {
      return withId(exhibition.toObject());
    }
    if (![ExhibitionStatus.Planning, ExhibitionStatus.Rejected].includes(exhibition.status)) {
      throw new ConflictException('当前展览状态不能送审。');
    }
    if (exhibition.activeArtworkIds.length === 0) {
      throw new ConflictException('空展览不能送审。');
    }

    // 送审前复核：作品必须仍然存在且处于可展出状态，防止「挑选后被退回/下架」的作品混入
    const validArtworks = await this.artworkModel.find({
      _id: { $in: exhibition.activeArtworkIds },
      status: { $in: [ArtworkStatus.Approved, ArtworkStatus.Published, ArtworkStatus.Sold] },
    }).select('_id');
    const validIds = validArtworks.map((item) => String(item._id));
    const dropped = exhibition.activeArtworkIds.filter((id) => !validIds.includes(id));
    if (dropped.length) {
      throw new ConflictException('展内有作品已被退回或下架，请调整后再送审。');
    }

    // 条件原子更新：并发重复送审只有一次生效
    const update = await this.exhibitionModel.updateOne(
      { _id: exhibitionId, status: { $in: [ExhibitionStatus.Planning, ExhibitionStatus.Rejected] } },
      { $set: { status: ExhibitionStatus.PendingReview, reviewReason: '' } },
    );
    if (update.matchedCount === 0) {
      throw new ConflictException('当前展览状态不能送审。');
    }

    await this.reviewModel.create({
      targetType: 'Exhibition', targetId: exhibitionId, reviewerId: actor.id,
      action: ReviewAction.ExhibitionSubmitted, comment: comment || '策展人送审展览。',
    });
    const refreshed = await this.exhibitionModel.findById(exhibitionId);
    return withId(refreshed!.toObject());
  }

  /** 管理员审批展览。批准即原子开展，展内作品才公开。 */
  async decideExhibition(input: DecisionInput) {
    const { targetId, result, comment, actor } = input;
    this.assertAdmin(actor, '只有管理员可以批准展览。');

    const exhibition = await this.exhibitionModel.findById(targetId);
    if (!exhibition) throw new NotFoundException('展览不存在。');

    if (result === ReviewResult.Flagged) {
      if (exhibition.status !== ExhibitionStatus.PendingReview) {
        throw new ConflictException('该展览不在待审队列。');
      }
      await this.reviewModel.create({
        targetType: 'Exhibition', targetId, reviewerId: actor.id,
        action: ReviewAction.ExhibitionFlagged, result, comment,
      });
      const unchanged = await this.exhibitionModel.findById(targetId);
      return withId(unchanged!.toObject());
    }

    if (result === ReviewResult.Rejected) {
      return this.rejectExhibition(exhibition, comment || '展览未通过审批。', actor, ReviewAction.ExhibitionRejected, ReviewResult.Rejected);
    }
    return this.activateExhibition(exhibition, comment, actor, ReviewAction.ExhibitionApproved, ReviewResult.Approved);
  }

  /** 管理员推翻展览结论：Active -> Rejected（闭展并释放作品）；Rejected -> Approved（重新开展）。 */
  async overturnExhibition(targetId: string, nextResult: ReviewResult.Approved | ReviewResult.Rejected, comment: string, actor: Actor) {
    this.assertAdmin(actor, '只有管理员可以推翻展览结论。');
    if (!comment) throw new BadRequestException('推翻结论必须填写原因。');
    const exhibition = await this.exhibitionModel.findById(targetId);
    if (!exhibition) throw new NotFoundException('展览不存在。');

    if (nextResult === ReviewResult.Rejected) {
      if (exhibition.status !== ExhibitionStatus.Active) {
        throw new ConflictException('只有已开展览的批准可以被推翻为退回。');
      }
      return this.rejectExhibition(exhibition, `批准被推翻：${comment}`, actor, ReviewAction.ExhibitionOverturned, ReviewResult.Rejected);
    }

    if (exhibition.status !== ExhibitionStatus.Rejected) {
      throw new ConflictException('只有被退回的展览可以恢复为批准。');
    }
    if (exhibition.activeArtworkIds.length === 0) {
      throw new ConflictException('作品已在退回时释放，请重新挑选作品并送审。');
    }
    return this.activateExhibition(exhibition, `退回决定被推翻：${comment}`, actor, ReviewAction.ExhibitionOverturned, ReviewResult.Approved);
  }

  // ---------- 内部原子操作 ----------

  /**
   * 原子开展：条件更新确保并发发布只有一次生效。
   * 仅审批时存在的作品公开，防止「审批途中加入未审作品」。
   */
  private async activateExhibition(
    exhibition: ExhibitionDocument,
    comment: string,
    actor: Actor,
    action: ReviewAction,
    result: ReviewResult,
  ) {
    const artworkIds = [...exhibition.activeArtworkIds];

    // 批准时再次复核：只有仍可展出的作品才公开（审批途中作品可能已被下架/退回）
    const validArtworks = await this.artworkModel.find({
      _id: { $in: artworkIds },
      status: { $in: [ArtworkStatus.Approved, ArtworkStatus.Published, ArtworkStatus.Sold] },
    }).select('_id');
    if (validArtworks.length !== artworkIds.length) {
      throw new ConflictException('展内有作品已不再可展出，请退回策展人调整后重新送审。');
    }

    let update: import('mongoose').UpdateResult;
    try {
      update = await this.exhibitionModel.updateOne(
        { _id: exhibition._id, status: exhibition.status },
        { $set: { status: ExhibitionStatus.Active, reviewReason: comment || '展览已批准开展。' } },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('展内作品已在其他进行中的展览，不能并发开展。');
      }
      throw error;
    }
    if (update.matchedCount === 0) {
      throw new ConflictException('展览状态已变化，本次发布未生效。');
    }

    // 已售（Sold）保持原状态，已通过（Approved）的作品随展览公开发布
    await this.artworkModel.updateMany(
      { _id: { $in: artworkIds }, status: ArtworkStatus.Approved },
      { $set: { status: ArtworkStatus.Published } },
    );
    await this.artworkModel.updateMany(
      { _id: { $in: artworkIds } },
      { $addToSet: { exhibitionIds: exhibition.id } },
    );

    await this.reviewModel.create({
      targetType: 'Exhibition', targetId: exhibition.id, reviewerId: actor.id,
      action, result, comment,
    });

    const refreshed = await this.exhibitionModel.findById(exhibition._id);
    return withId(refreshed!.toObject());
  }

  /** 退回展览：闭展、释放所有作品占用，作品若无其他开展览承载则回落为未公开。 */
  private async rejectExhibition(
    exhibition: ExhibitionDocument,
    comment: string,
    actor: Actor,
    action: ReviewAction,
    result: ReviewResult,
  ) {
    const released = [...exhibition.activeArtworkIds];
    const removedAt = new Date();

    const update = await this.exhibitionModel.updateOne(
      { _id: exhibition._id, status: exhibition.status },
      {
        $set: { status: ExhibitionStatus.Rejected, reviewReason: comment },
        $pullAll: { activeArtworkIds: released },
        $push: {
          removedArtworks: {
            $each: released.map((artworkId) => ({ artworkId, reason: comment, removedAt })),
            $position: 0,
          },
        },
      },
    );
    if (update.matchedCount === 0) {
      throw new ConflictException('展览状态已变化，本次退回未生效。');
    }

    await this.artworkModel.updateMany(
      { _id: { $in: released } },
      { $pull: { exhibitionIds: exhibition.id } },
    );
    for (const artworkId of released) {
      await this.withdrawalService.demoteIfNoLongerPublic(artworkId);
    }

    await this.reviewModel.create({
      targetType: 'Exhibition', targetId: exhibition.id, reviewerId: actor.id,
      action, result, comment,
    });

    const refreshed = await this.exhibitionModel.findById(exhibition._id);
    return withId(refreshed!.toObject());
  }

  private async logWithdrawals(artworkId: string, withdrawals: { exhibitionId: string }[], actorId: string, action: ReviewAction) {
    if (!withdrawals.length) return;
    await this.reviewModel.insertMany(
      withdrawals.map((item) => ({
        targetType: 'Artwork' as const,
        targetId: artworkId,
        reviewerId: actorId,
        action,
        comment: '作品自动从进行中展览撤出。',
        relatedId: item.exhibitionId,
      })),
    );
  }

  private assertAdmin(actor: Actor, message: string) {
    if (actor.role !== 'Admin') throw new ForbiddenException(message);
  }
}
