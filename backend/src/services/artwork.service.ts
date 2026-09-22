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

import { Artwork, ArtworkDocument } from '../models/artwork.schema';
import {
  ArtworkReviewStatus,
  ArtworkStatus,
  ReviewResult,
  WithdrawalReason,
} from '../types/enums';
import { RequestUser } from '../types/interfaces';
import { isArtworkPublic } from '../utils/visibility';
import { ReviewService } from './review.service';
import { WithdrawalService } from './withdrawal.service';
import { ExhibitionService } from './exhibition.service';

@Injectable()
export class ArtworkService {
  constructor(
    @InjectModel(Artwork.name) private readonly artworkModel: Model<ArtworkDocument>,
    private readonly reviewService: ReviewService,
    private readonly withdrawalService: WithdrawalService,
    @Inject(forwardRef(() => ExhibitionService))
    private readonly exhibitionService: ExhibitionService,
  ) {}

  async listAll() {
    return this.artworkModel.find().sort({ updatedAt: -1 }).lean();
  }

  /** 普通观众视角：只返回已审核通过且随展览公开的作品。 */
  async listPublic() {
    const items = await this.listAll();
    return items.filter(isArtworkPublic);
  }

  async find(id: string) {
    return this.artworkModel.findById(id).lean();
  }

  async getRequired(id: string) {
    const artwork = await this.find(id);
    if (!artwork) throw new NotFoundException('作品不存在。');
    return artwork;
  }

  /** 普通观众不能查看未公开作品（策展/管理工作台除外）。 */
  async getVisible(id: string, user?: RequestUser) {
    const artwork = await this.getRequired(id);
    const staff = user?.role === 'Admin' || user?.role === 'Curator';
    const owner = user?.role === 'Artist' && (user.artistId === artwork.artistId || user.id === artwork.artistId);
    if (!isArtworkPublic(artwork) && !staff && !owner) {
      throw new NotFoundException('作品不存在或尚未公开。');
    }
    return artwork;
  }

  async create(input: Partial<Artwork>, user: RequestUser) {
    const artistId = input.artistId ?? user.artistId;
    if (!artistId) throw new BadRequestException('缺少 artistId，无法关联艺术家。');
    return this.artworkModel.create({
      ...input,
      artistId,
      status: ArtworkStatus.Draft,
      reviewStatus: ArtworkReviewStatus.Unsubmitted,
      reviewComment: '',
      activeExhibitionId: null,
      exhibitionIds: input.exhibitionIds ?? [],
    });
  }

  /** 艺术家仅能在未提交 / 被退回阶段编辑作品。 */
  async updateDraft(id: string, patch: Partial<Artwork>, user: RequestUser) {
    const artwork = await this.getRequired(id);
    this.assertOwnerOrAdmin(artwork.artistId, user);
    if (![ArtworkReviewStatus.Unsubmitted, ArtworkReviewStatus.Rejected].includes(artwork.reviewStatus)) {
      throw new ConflictException('作品已进入审核流程，当前状态不可编辑。');
    }
    const editable: Partial<Artwork> = { ...patch };
    delete editable.status;
    delete editable.reviewStatus;
    delete editable.activeExhibitionId;
    delete editable.exhibitionIds;
    return this.artworkModel.findByIdAndUpdate(id, editable, { new: true });
  }

  /** 艺术家提交审核：Unsubmitted/Rejected -> PendingReview。重复提交只生效一次。 */
  async submitForReview(id: string, user: RequestUser) {
    const artwork = await this.getRequired(id);
    this.assertOwnerOrAdmin(artwork.artistId, user);
    if (artwork.reviewStatus === ArtworkReviewStatus.PendingReview) {
      throw new ConflictException('作品已在待审队列中，请勿重复提交。');
    }
    if (artwork.reviewStatus === ArtworkReviewStatus.Approved) {
      throw new ConflictException('作品已通过审核，无需重复提交。');
    }
    await this.reviewService.addLog({
      targetType: 'Artwork',
      targetId: id,
      reviewerId: user.id,
      result: ReviewResult.Flagged,
      action: 'Submit',
      comment: '艺术家提交上展审核',
    });
    return this.artworkModel.findByIdAndUpdate(
      id,
      { reviewStatus: ArtworkReviewStatus.PendingReview, reviewComment: '' },
      { new: true },
    );
  }

  /** 管理员裁决作品审核。重复裁决同一结果只生效一次。 */
  async decideReview(id: string, result: ReviewResult.Approved | ReviewResult.Rejected, reviewerId: string, comment = '') {
    const artwork = await this.getRequired(id);
    if (artwork.reviewStatus === ArtworkReviewStatus.Approved && result === ReviewResult.Approved) {
      throw new ConflictException('该作品已通过审核，重复审核不生效。');
    }
    if (artwork.reviewStatus === ArtworkReviewStatus.Rejected && result === ReviewResult.Rejected) {
      throw new ConflictException('该作品已被退回，重复审核不生效。');
    }
    const isApproval = result === ReviewResult.Approved;
    await this.reviewService.addLog({
      targetType: 'Artwork',
      targetId: id,
      reviewerId,
      result,
      action: 'Decision',
      comment,
    });

    if (!isApproval) {
      const wasOnDisplay = Boolean(artwork.activeExhibitionId);
      // 退回：若作品正在进行中展览展出，立即撤出。
      if (wasOnDisplay) {
        await this.withdrawFromActiveExhibition(artwork, WithdrawalReason.ArtworkRejected, comment, reviewerId);
      }
      return this.artworkModel.findByIdAndUpdate(
        id,
        {
          reviewStatus: ArtworkReviewStatus.Rejected,
          reviewComment: comment,
          // 只有原本随展公开的作品才需收回公开发布状态。
          ...(wasOnDisplay ? { status: ArtworkStatus.Draft, activeExhibitionId: null } : {}),
        },
        { new: true },
      );
    }

    return this.artworkModel.findByIdAndUpdate(
      id,
      { reviewStatus: ArtworkReviewStatus.Approved, reviewComment: comment },
      { new: true },
    );
  }

  /** 管理员推翻既有审核结果（通过 -> 退回）。正在展出的作品必须撤出。 */
  async overturnApproval(id: string, reviewerId: string, comment = '') {
    const artwork = await this.getRequired(id);
    if (artwork.reviewStatus !== ArtworkReviewStatus.Approved) {
      throw new ConflictException('只有已通过审核的作品才能被推翻。');
    }
    await this.reviewService.addLog({
      targetType: 'Artwork',
      targetId: id,
      reviewerId,
      result: ReviewResult.Rejected,
      action: 'Overturn',
      comment,
    });
    if (artwork.activeExhibitionId) {
      await this.withdrawFromActiveExhibition(artwork, WithdrawalReason.ApprovalOverturned, comment, reviewerId);
    }
    return this.artworkModel.findByIdAndUpdate(
      id,
      {
        reviewStatus: ArtworkReviewStatus.Rejected,
        reviewComment: comment,
        status: ArtworkStatus.Draft,
        activeExhibitionId: null,
      },
      { new: true },
    );
  }

  /** 艺术家下架自己已发布的作品：从进行中展览撤出并回到未提交状态。 */
  async takeDown(id: string, user: RequestUser, comment = '') {
    const artwork = await this.getRequired(id);
    this.assertOwnerOrAdmin(artwork.artistId, user);
    if (artwork.status !== ArtworkStatus.Published) {
      throw new ConflictException('只有已公开发布的作品可以下架。');
    }
    if (artwork.activeExhibitionId) {
      await this.withdrawFromActiveExhibition(artwork, WithdrawalReason.ArtworkTakenDown, comment, user.id);
    }
    return this.artworkModel.findByIdAndUpdate(
      id,
      {
        status: ArtworkStatus.Draft,
        reviewStatus: ArtworkReviewStatus.Unsubmitted,
        activeExhibitionId: null,
        reviewComment: comment,
      },
      { new: true },
    );
  }

  /**
   * 原子地把作品“占用”给某个进行中展览。
   * 条件更新保证并发下同一作品只会被一个 Active 展览抢占（唯一索引兜底）。
   * 返回 true 表示抢占成功。
   */
  async claimForActiveExhibition(artworkId: string, exhibitionId: string): Promise<boolean> {
    const updated = await this.artworkModel.findOneAndUpdate(
      { _id: artworkId, activeExhibitionId: null },
      { $set: { activeExhibitionId: exhibitionId, status: ArtworkStatus.Published }, $addToSet: { exhibitionIds: exhibitionId } },
      { new: true },
    );
    return Boolean(updated);
  }

  /** 回滚已抢占的作品占用（仅当仍归属于该展览时）。 */
  async releaseActiveClaim(artworkId: string, exhibitionId: string) {
    await this.artworkModel.updateOne(
      { _id: artworkId, activeExhibitionId: exhibitionId },
      { $set: { activeExhibitionId: null } },
    );
  }

  /** 从进行中展览撤出作品：同步双方状态并留痕。 */
  private async withdrawFromActiveExhibition(
    artwork: { _id: unknown; activeExhibitionId: string | null },
    reason: WithdrawalReason,
    comment: string,
    operatorId: string,
  ) {
    const exhibitionId = artwork.activeExhibitionId as string;
    const artworkId = String(artwork._id);
    await this.exhibitionService.removeArtworkSilently(exhibitionId, artworkId);
    await this.artworkModel.updateOne(
      { _id: artworkId, activeExhibitionId: exhibitionId },
      { $set: { activeExhibitionId: null } },
    );
    await this.withdrawalService.record({
      artworkId,
      exhibitionId,
      reason,
      comment,
      operatorId,
    });
  }

  private assertOwnerOrAdmin(ownerArtistId: string, user: RequestUser) {
    const isAdmin = user.role === 'Admin';
    const isOwner = user.role === 'Artist' && (user.artistId === ownerArtistId || user.id === ownerArtistId);
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('不能操作他人的作品。');
    }
  }

  async incrementMetric(id: string, field: 'likes' | 'bookmarks' | 'views', amount = 1) {
    return this.artworkModel.findByIdAndUpdate(id, { $inc: { [field]: amount } }, { new: true });
  }
}
