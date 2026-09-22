import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Exhibition, ExhibitionDocument } from '../models/exhibition.schema';
import {
  ArtworkReviewStatus,
  ExhibitionStatus,
  ReviewResult,
} from '../types/enums';
import { RequestUser } from '../types/interfaces';
import { isExhibitionPublic } from '../utils/visibility';
import { ArtworkService } from './artwork.service';
import { ReviewService } from './review.service';

@Injectable()
export class ExhibitionService {
  constructor(
    @InjectModel(Exhibition.name) private readonly exhibitionModel: Model<ExhibitionDocument>,
    private readonly reviewService: ReviewService,
    @Inject(forwardRef(() => ArtworkService))
    private readonly artworkService: ArtworkService,
  ) {}

  async listAll() {
    return this.exhibitionModel.find().sort({ startDate: -1 }).lean();
  }

  /** 普通观众视角：只看管理员已批准（Active）的展览。 */
  async listPublic() {
    const items = await this.listAll();
    return items.filter(isExhibitionPublic);
  }

  async find(id: string) {
    return this.exhibitionModel.findById(id).lean();
  }

  async getRequired(id: string) {
    const exhibition = await this.find(id);
    if (!exhibition) throw new NotFoundException('展览不存在。');
    return exhibition;
  }

  /** 非 Active 展览仅策展人本人与管理员可见。 */
  async getVisible(id: string, user?: RequestUser) {
    const exhibition = await this.getRequired(id);
    if (!isExhibitionPublic(exhibition)) {
      const staff = user?.role === 'Admin' || user?.role === 'Curator';
      if (!staff) throw new NotFoundException('展览不存在或尚未公开。');
    }
    return exhibition;
  }

  async create(input: Partial<Exhibition>, user: RequestUser) {
    return this.exhibitionModel.create({
      ...input,
      curatorId: input.curatorId ?? user.id,
      artworkIds: input.artworkIds ?? [],
      status: ExhibitionStatus.Planning,
      reviewComment: '',
    });
  }

  private assertCuratorOrAdmin(exhibition: { curatorId: string }, user: RequestUser) {
    if (user.role === 'Admin') return;
    if (user.role === 'Curator' && user.id === exhibition.curatorId) return;
    throw new ForbiddenException('只有该展览的策展人或管理员可以执行此操作。');
  }

  /**
   * 策展人挑选作品：只能选“已通过作品审核”的作品，
   * 且该作品当前不能正在另一个进行中展览中。只能在策划中/被退回状态下调整阵容。
   */
  async addArtwork(id: string, artworkId: string, user: RequestUser) {
    const exhibition = await this.getRequired(id);
    this.assertCuratorOrAdmin(exhibition, user);
    if (![ExhibitionStatus.Planning, ExhibitionStatus.Rejected].includes(exhibition.status)) {
      throw new ConflictException('展览已送审或已开展，不能再调整作品阵容。');
    }
    const artwork = await this.artworkService.getRequired(artworkId);
    if (artwork.reviewStatus !== ArtworkReviewStatus.Approved) {
      throw new ConflictException('只能挑选已通过审核的作品。');
    }
    if (artwork.activeExhibitionId && artwork.activeExhibitionId !== id) {
      throw new ConflictException('该作品正在另一个进行中展览中展出，无法重复参展。');
    }
    await this.exhibitionModel.findByIdAndUpdate(id, { $addToSet: { artworkIds: artworkId } });
    return this.getRequired(id);
  }

  /** 策展人在策划阶段移除候选作品。 */
  async removeArtwork(id: string, artworkId: string, user: RequestUser) {
    const exhibition = await this.getRequired(id);
    this.assertCuratorOrAdmin(exhibition, user);
    if (![ExhibitionStatus.Planning, ExhibitionStatus.Rejected].includes(exhibition.status)) {
      throw new ConflictException('展览送审后不能直接移除作品，请使用撤出流程。');
    }
    return this.exhibitionModel.findByIdAndUpdate(id, { $pull: { artworkIds: artworkId } }, { new: true });
  }

  /** 内部使用：自动撤出时静默从展览阵容移除。 */
  async removeArtworkSilently(id: string, artworkId: string) {
    await this.exhibitionModel.findByIdAndUpdate(id, { $pull: { artworkIds: artworkId } });
  }

  /** 策展人送审展览：Planning/Rejected -> PendingReview。重复送审只生效一次。 */
  async submitForReview(id: string, user: RequestUser) {
    const exhibition = await this.getRequired(id);
    this.assertCuratorOrAdmin(exhibition, user);
    if (exhibition.status === ExhibitionStatus.PendingReview) {
      throw new ConflictException('展览已在待审队列中，请勿重复送审。');
    }
    if (exhibition.status === ExhibitionStatus.Active) {
      throw new ConflictException('展览已批准开展，无需重复送审。');
    }
    if (!exhibition.artworkIds.length) {
      throw new BadRequestException('展览至少需要包含一件作品才能送审。');
    }
    await this.reviewService.addLog({
      targetType: 'Exhibition',
      targetId: id,
      reviewerId: user.id,
      result: ReviewResult.Flagged,
      action: 'Submit',
      comment: '策展人送审展览',
    });
    return this.exhibitionModel.findByIdAndUpdate(
      id,
      { status: ExhibitionStatus.PendingReview, reviewComment: '' },
      { new: true },
    );
  }

  /**
   * 管理员批准展览：PendingReview -> Active。
   * 原子逐件抢占作品；任一作品已在别的进行中展览（并发发布）则整体回滚、本次批准不生效。
   * 并发批准只生效一次。
   */
  async approve(id: string, reviewerId: string, comment = '') {
    const exhibition = await this.getRequired(id);
    if (exhibition.status === ExhibitionStatus.Active) {
      throw new ConflictException('该展览已批准开展，重复批准不生效。');
    }
    if (exhibition.status !== ExhibitionStatus.PendingReview) {
      throw new ConflictException('只有待审中的展览可以被批准。');
    }
    if (!exhibition.artworkIds.length) {
      throw new BadRequestException('空展览无法批准开展。');
    }

    const claimed: string[] = [];
    for (const artworkId of exhibition.artworkIds) {
      const artwork = await this.artworkService.find(artworkId);
      if (!artwork) {
        await this.rollbackClaims(claimed, id);
        throw new ConflictException(`作品 ${artworkId} 不存在，无法开展。`);
      }
      if (artwork.reviewStatus !== ArtworkReviewStatus.Approved) {
        await this.rollbackClaims(claimed, id);
        throw new ConflictException(`作品「${artwork.title}」未通过作品审核，不能随展公开。`);
      }
      // 条件原子更新：activeExhibitionId 已被其他进行中展览占用时失败。
      const ok = await this.artworkService.claimForActiveExhibition(artworkId, id);
      if (!ok) {
        await this.rollbackClaims(claimed, id);
        throw new ConflictException(`作品「${artwork.title}」已在其他进行中展览中，本次发布未生效。`);
      }
      claimed.push(artworkId);
    }

    const updated = await this.exhibitionModel.findOneAndUpdate(
      { _id: id, status: ExhibitionStatus.PendingReview },
      { $set: { status: ExhibitionStatus.Active, reviewComment: comment } },
      { new: true },
    );
    if (!updated) {
      // 并发下已被另一请求处理：回滚全部抢占，保证并发发布只生效一次。
      await this.rollbackClaims(claimed, id);
      throw new ConflictException('展览状态已变更，本次并发发布未生效。');
    }

    await this.reviewService.addLog({
      targetType: 'Exhibition',
      targetId: id,
      reviewerId,
      result: ReviewResult.Approved,
      action: 'Decision',
      comment,
    });
    return updated;
  }

  private async rollbackClaims(claimedArtworkIds: string[], exhibitionId: string) {
    for (const artworkId of claimedArtworkIds) {
      await this.artworkService.releaseActiveClaim(artworkId, exhibitionId);
    }
  }

  /** 管理员退回送审中的展览：PendingReview -> Rejected。 */
  async reject(id: string, reviewerId: string, comment = '') {
    const exhibition = await this.getRequired(id);
    if (exhibition.status !== ExhibitionStatus.PendingReview) {
      throw new ConflictException('只有待审中的展览可以被退回。');
    }
    await this.reviewService.addLog({
      targetType: 'Exhibition',
      targetId: id,
      reviewerId,
      result: ReviewResult.Rejected,
      action: 'Decision',
      comment,
    });
    return this.exhibitionModel.findByIdAndUpdate(
      id,
      { status: ExhibitionStatus.Rejected, reviewComment: comment },
      { new: true },
    );
  }

  /** 结束进行中展览：Active -> Ended，并释放全部作品的“在展占用”。 */
  async end(id: string, user: RequestUser) {
    const exhibition = await this.getRequired(id);
    this.assertCuratorOrAdmin(exhibition, user);
    if (exhibition.status !== ExhibitionStatus.Active) {
      throw new ConflictException('只有进行中的展览可以结束。');
    }
    const ended = await this.exhibitionModel.findOneAndUpdate(
      { _id: id, status: ExhibitionStatus.Active },
      { $set: { status: ExhibitionStatus.Ended } },
      { new: true },
    );
    if (ended) {
      for (const artworkId of exhibition.artworkIds) {
        await this.artworkService.releaseActiveClaim(artworkId, id);
      }
    }
    return ended;
  }
}
