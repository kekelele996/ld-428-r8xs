import { apiPaths, exhibitionPath } from '../constants/apiPaths';
import { exhibitions } from '../utils/mockData';
import { isOffline } from '../utils/apiError';
import { request } from '../utils/request';
import type { Exhibition } from '../types/exhibition';

export async function fetchExhibitions(): Promise<Exhibition[]> {
  try {
    return await request<Exhibition[]>(apiPaths.exhibitions);
  } catch (error) {
    if (isOffline(error)) return exhibitions;
    throw error;
  }
}

export async function fetchExhibition(id: string): Promise<Exhibition | undefined> {
  try {
    return await request<Exhibition>(exhibitionPath(id));
  } catch (error) {
    if (isOffline(error)) return exhibitions.find((exhibition) => exhibition.id === id);
    throw error;
  }
}

export function createExhibition(input: {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: string;
  coverUrl: string;
}) {
  return request<Exhibition>(apiPaths.exhibitions, { method: 'POST', body: JSON.stringify(input) });
}

/** 从已通过审核的作品中挑选加入展览 */
export function addArtworkToExhibition(exhibitionId: string, artworkId: string) {
  return request<Exhibition>(`${apiPaths.exhibitions}/${exhibitionId}/artworks`, {
    method: 'POST',
    body: JSON.stringify({ artworkId }),
  });
}

export function removeArtworkFromExhibition(exhibitionId: string, artworkId: string, reason: string) {
  return request<Exhibition>(`${apiPaths.exhibitions}/${exhibitionId}/artworks/${artworkId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

/** 策展人把展览送审 */
export function submitExhibition(exhibitionId: string, comment = '') {
  return request<Exhibition>(exhibitionPath(exhibitionId, 'submit'), { method: 'POST', body: JSON.stringify({ comment }) });
}
