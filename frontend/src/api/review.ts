import { apiPaths, reviewDecisionPath, reviewOverturnPath } from '../constants/apiPaths';
import { ReviewResult } from '../types/enums';
import type { Artwork } from '../types/artwork';
import type { Exhibition } from '../types/exhibition';
import type { ReviewLog, ReviewTargetType } from '../types/review';
import { request } from '../utils/request';

export function fetchReviewLogs(targetType?: ReviewTargetType, targetId?: string): Promise<ReviewLog[]> {
  const query = targetType && targetId ? `?targetType=${targetType}&targetId=${targetId}` : '';
  return request<ReviewLog[]>(`${apiPaths.reviews}/logs${query}`);
}

export function decideArtwork(id: string, result: ReviewResult, comment: string) {
  return request<Artwork>(reviewDecisionPath('artworks', id), { method: 'POST', body: JSON.stringify({ result, comment }) });
}

export function decideExhibition(id: string, result: ReviewResult, comment: string) {
  return request<Exhibition>(reviewDecisionPath('exhibitions', id), { method: 'POST', body: JSON.stringify({ result, comment }) });
}

export function overturnArtwork(id: string, result: ReviewResult.Approved | ReviewResult.Rejected, comment: string) {
  return request<Artwork>(reviewOverturnPath('artworks', id), { method: 'POST', body: JSON.stringify({ result, comment }) });
}

export function overturnExhibition(id: string, result: ReviewResult.Approved | ReviewResult.Rejected, comment: string) {
  return request<Exhibition>(reviewOverturnPath('exhibitions', id), { method: 'POST', body: JSON.stringify({ result, comment }) });
}
