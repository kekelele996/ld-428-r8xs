import { apiPaths } from '../constants/apiPaths';
import { request } from '../utils/request';
import type { ReviewLog, ReviewTargetType } from '../types/review';

export async function fetchReviewLogs(targetType?: ReviewTargetType, targetId?: string): Promise<ReviewLog[]> {
  const params = new URLSearchParams();
  if (targetType) params.set('targetType', targetType);
  if (targetId) params.set('targetId', targetId);
  const query = params.toString();
  return request<ReviewLog[]>(`${apiPaths.reviews}${query ? `?${query}` : ''}`);
}
