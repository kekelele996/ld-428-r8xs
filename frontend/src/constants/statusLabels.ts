import {
  ArtworkReviewStatus,
  ArtworkStatus,
  ExhibitionStatus,
  ReviewResult,
  WithdrawalReason,
} from '../types/enums';

export const artworkStatusLabels: Record<ArtworkStatus, string> = {
  [ArtworkStatus.Draft]: '草稿',
  [ArtworkStatus.Published]: '已公开',
  [ArtworkStatus.Sold]: '已售',
  [ArtworkStatus.Archived]: '已归档',
};

export const artworkReviewLabels: Record<ArtworkReviewStatus, string> = {
  [ArtworkReviewStatus.Unsubmitted]: '未提交',
  [ArtworkReviewStatus.PendingReview]: '待审核',
  [ArtworkReviewStatus.Approved]: '审核通过',
  [ArtworkReviewStatus.Rejected]: '已退回',
};

export const exhibitionStatusLabels: Record<ExhibitionStatus, string> = {
  [ExhibitionStatus.Planning]: '策划中',
  [ExhibitionStatus.PendingReview]: '待审核',
  [ExhibitionStatus.Active]: '进行中',
  [ExhibitionStatus.Ended]: '已结束',
  [ExhibitionStatus.Rejected]: '已退回',
  [ExhibitionStatus.Archived]: '已归档',
};

export const reviewResultLabels: Record<ReviewResult, string> = {
  [ReviewResult.Approved]: '通过',
  [ReviewResult.Rejected]: '退回',
  [ReviewResult.Flagged]: '送审',
};

export const withdrawalReasonLabels: Record<WithdrawalReason, string> = {
  [WithdrawalReason.ArtworkRejected]: '作品被审核退回',
  [WithdrawalReason.ArtworkTakenDown]: '作品被艺术家下架',
  [WithdrawalReason.ApprovalOverturned]: '作品审核结果被管理员推翻',
};
