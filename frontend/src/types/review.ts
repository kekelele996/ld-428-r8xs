import { ReviewResult } from './enums';

export type ReviewTargetType = 'Artwork' | 'Exhibition';

export interface ReviewLog {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  reviewerId: string;
  result: ReviewResult;
  action: 'Submit' | 'Decision' | 'Overturn';
  comment: string;
  createdAt: string;
}
