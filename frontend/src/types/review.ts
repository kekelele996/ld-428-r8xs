import { ReviewAction, ReviewResult } from './enums';

export type ReviewTargetType = 'Artwork' | 'Exhibition';

export interface ReviewLog {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  reviewerId: string;
  action: ReviewAction;
  result?: ReviewResult;
  comment: string;
  relatedId?: string;
  createdAt: string;
}
