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

export enum ReviewResult {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Flagged = 'Flagged',
}

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
