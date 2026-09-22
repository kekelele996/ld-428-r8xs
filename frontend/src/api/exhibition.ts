import { apiPaths } from '../constants/apiPaths';
import { exhibitions } from '../utils/mockData';
import { request } from '../utils/request';
import type { Exhibition } from '../types/exhibition';

export async function fetchExhibitions(): Promise<Exhibition[]> {
  try {
    return await request<Exhibition[]>(apiPaths.exhibitions);
  } catch {
    return exhibitions;
  }
}

export async function fetchExhibition(id: string): Promise<Exhibition | undefined> {
  try {
    return await request<Exhibition>(`${apiPaths.exhibitions}/${id}`);
  } catch {
    return (await fetchExhibitions()).find((exhibition) => exhibition.id === id);
  }
}

export function createExhibition(input: Partial<Exhibition>): Promise<Exhibition> {
  return request<Exhibition>(apiPaths.exhibitions, { method: 'POST', body: JSON.stringify(input) });
}

async function patchExhibition(id: string, action: string, body?: Record<string, unknown>): Promise<Exhibition> {
  return request<Exhibition>(`${apiPaths.exhibitions}/${id}/${action}`, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {}),
  });
}

/** 策展人从已通过审核的作品中挑选作品加入展览。 */
export const addArtworkToExhibition = (id: string, artworkId: string) =>
  patchExhibition(id, 'artworks', { artworkId });

export const removeArtworkFromExhibition = (id: string, artworkId: string) =>
  request<Exhibition>(`${apiPaths.exhibitions}/${id}/artworks/${artworkId}`, { method: 'DELETE' });

/** 策展人送审展览。 */
export const submitExhibition = (id: string) => patchExhibition(id, 'submit');
export const approveExhibition = (id: string, comment?: string) => patchExhibition(id, 'approve', { comment });
export const rejectExhibition = (id: string, comment?: string) => patchExhibition(id, 'reject', { comment });
export const endExhibition = (id: string) => patchExhibition(id, 'end');
