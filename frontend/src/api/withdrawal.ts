import { apiPaths } from '../constants/apiPaths';
import { request } from '../utils/request';
import type { WithdrawalLog } from '../types/withdrawal';

export async function fetchWithdrawals(filter: { exhibitionId?: string; artworkId?: string } = {}): Promise<WithdrawalLog[]> {
  const params = new URLSearchParams();
  if (filter.exhibitionId) params.set('exhibitionId', filter.exhibitionId);
  if (filter.artworkId) params.set('artworkId', filter.artworkId);
  const query = params.toString();
  return request<WithdrawalLog[]>(`${apiPaths.withdrawals}${query ? `?${query}` : ''}`);
}

export async function fetchExhibitionWithdrawals(exhibitionId: string): Promise<WithdrawalLog[]> {
  return request<WithdrawalLog[]>(`${apiPaths.exhibitions}/${exhibitionId}/withdrawals`);
}
