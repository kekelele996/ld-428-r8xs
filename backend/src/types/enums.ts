export enum ArtworkStatus {
  Draft = 'Draft',
  Published = 'Published',
  Sold = 'Sold',
  Archived = 'Archived',
}

export enum Medium {
  OilPainting = 'OilPainting',
  Watercolor = 'Watercolor',
  Acrylic = 'Acrylic',
  Ink = 'Ink',
  Sculpture = 'Sculpture',
  Photography = 'Photography',
  Digital = 'Digital',
  Mixed = 'Mixed',
  Installation = 'Installation',
  Other = 'Other',
}

export enum ExhibitionStatus {
  Planning = 'Planning',
  PendingReview = 'PendingReview',
  Active = 'Active',
  Ended = 'Ended',
  Rejected = 'Rejected',
  Archived = 'Archived',
}

export enum InteractionType {
  Like = 'Like',
  Comment = 'Comment',
  Bookmark = 'Bookmark',
  Share = 'Share',
}

export enum ReviewResult {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Flagged = 'Flagged',
}

/** 作品上展审核状态：艺术家提交 -> 管理员审核 -> 通过后才能被策展人选入展览 */
export enum ArtworkReviewStatus {
  Unsubmitted = 'Unsubmitted',
  PendingReview = 'PendingReview',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

/** 作品被撤出进行中展览的原因 */
export enum WithdrawalReason {
  ArtworkRejected = 'ArtworkRejected',
  ArtworkTakenDown = 'ArtworkTakenDown',
  ApprovalOverturned = 'ApprovalOverturned',
}
