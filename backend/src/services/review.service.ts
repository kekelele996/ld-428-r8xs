import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ReviewLog, ReviewLogDocument, ReviewTargetType } from '../models/reviewLog.schema';
import { ArtworkReviewStatus, ExhibitionStatus, ReviewResult } from '../types/enums';

interface CreateLogInput {
  targetType: ReviewTargetType;
  targetId: string;
  reviewerId: string;
  result: ReviewResult;
  comment?: string;
  action?: 'Submit' | 'Decision' | 'Overturn';
}

@Injectable()
export class ReviewService {
  constructor(@InjectModel(ReviewLog.name) private readonly reviewModel: Model<ReviewLogDocument>) {}

  async addLog(input: CreateLogInput) {
    return this.reviewModel.create({ action: 'Decision', comment: '', ...input });
  }

  /** 最新一条裁决（Decision/Overturn）日志；送审 Submit 不算裁决结果。 */
  private async latestDecision(targetType: ReviewTargetType, targetId: string) {
    return this.reviewModel
      .findOne({ targetType, targetId, action: { $in: ['Decision', 'Overturn'] } })
      .sort({ createdAt: -1 })
      .lean();
  }

  async listLogs(targetType?: ReviewTargetType, targetId?: string) {
    const query: Partial<Record<string, string>> = {};
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;
    return this.reviewModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async listForTarget(targetType: ReviewTargetType, targetId: string) {
    return this.reviewModel.find({ targetType, targetId }).sort({ createdAt: -1 }).lean();
  }

  /** 最新裁决是否为通过（支持“审核结果被推翻”：以最新一条为准）。 */
  async hasApproval(targetType: ReviewTargetType, targetId: string): Promise<boolean> {
    const latest = await this.latestDecision(targetType, targetId);
    return latest?.result === ReviewResult.Approved;
  }

  /** 由审核日志推导作品审核状态。 */
  async artworkReviewStatus(targetId: string): Promise<ArtworkReviewStatus> {
    const latest = await this.latestDecision('Artwork', targetId);
    if (latest?.result === ReviewResult.Approved) return ArtworkReviewStatus.Approved;
    if (latest?.result === ReviewResult.Rejected) return ArtworkReviewStatus.Rejected;
    // 无最终裁决：已送审（含被标记 Flagged）即待审，否则未提交。
    const hasSubmission = await this.reviewModel.exists({ targetType: 'Artwork', targetId });
    return hasSubmission ? ArtworkReviewStatus.PendingReview : ArtworkReviewStatus.Unsubmitted;
  }

  /** 由审核日志推导展览状态（Active 之外的审核态）。 */
  async exhibitionReviewState(
    targetId: string,
  ): Promise<ExhibitionStatus.PendingReview | ExhibitionStatus.Rejected | ExhibitionStatus.Planning | ExhibitionStatus.Active> {
    const latest = await this.latestDecision('Exhibition', targetId);
    if (latest?.result === ReviewResult.Rejected) return ExhibitionStatus.Rejected;
    if (latest?.result === ReviewResult.Approved) return ExhibitionStatus.Active;
    const latestAny = await this.reviewModel.findOne({ targetType: 'Exhibition', targetId }).sort({ createdAt: -1 }).lean();
    return latestAny ? ExhibitionStatus.PendingReview : ExhibitionStatus.Planning;
  }
}
