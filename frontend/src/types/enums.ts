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

export enum ExhibitionType {
  Solo = 'Solo',
  Group = 'Group',
  Thematic = 'Thematic',
  Permanent = 'Permanent',
}

export enum ArtistStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

/** 作品上展审核状态 */
export enum ArtworkReviewStatus {
  Unsubmitted = 'Unsubmitted',
  PendingReview = 'PendingReview',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum ReviewResult {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Flagged = 'Flagged',
}

/** 作品撤出进行中展览的原因 */
export enum WithdrawalReason {
  ArtworkRejected = 'ArtworkRejected',
  ArtworkTakenDown = 'ArtworkTakenDown',
  ApprovalOverturned = 'ApprovalOverturned',
}

export type UserRole = 'Admin' | 'Curator' | 'Artist' | 'Viewer';
