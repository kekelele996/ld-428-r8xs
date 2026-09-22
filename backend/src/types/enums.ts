export enum ArtworkStatus {
  Draft = 'Draft',
  PendingReview = 'PendingReview',
  Approved = 'Approved',
  Rejected = 'Rejected',
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
  Rejected = 'Rejected',
  Active = 'Active',
  Ended = 'Ended',
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

/** 审核/工作流动作，写入 ReviewLog 作为可追溯的操作轨迹 */
export enum ReviewAction {
  ArtworkSubmitted = 'ArtworkSubmitted',
  ArtworkApproved = 'ArtworkApproved',
  ArtworkRejected = 'ArtworkRejected',
  ArtworkFlagged = 'ArtworkFlagged',
  ArtworkOverturned = 'ArtworkOverturned',
  ArtworkTakenDown = 'ArtworkTakenDown',
  ArtworkRemovedFromExhibition = 'ArtworkRemovedFromExhibition',
  ExhibitionSubmitted = 'ExhibitionSubmitted',
  ExhibitionApproved = 'ExhibitionApproved',
  ExhibitionRejected = 'ExhibitionRejected',
  ExhibitionFlagged = 'ExhibitionFlagged',
  ExhibitionOverturned = 'ExhibitionOverturned',
}

/** 公开可见的作品/展览状态 */
export const PUBLIC_ARTWORK_STATUSES: ArtworkStatus[] = [ArtworkStatus.Published, ArtworkStatus.Sold];
export const PUBLIC_EXHIBITION_STATUSES: ExhibitionStatus[] = [ExhibitionStatus.Active, ExhibitionStatus.Ended];

/** 占用作品「唯一在展」资格的展览状态 */
export const EXCLUSIVE_EXHIBITION_STATUSES: ExhibitionStatus[] = [
  ExhibitionStatus.Planning,
  ExhibitionStatus.PendingReview,
  ExhibitionStatus.Active,
];
