import { apiPaths, artworkPath } from '../constants/apiPaths';
import { artworks } from '../utils/mockData';
import { isOffline } from '../utils/apiError';
import { request } from '../utils/request';
import type { Artwork } from '../types/artwork';

export async function fetchArtworks(): Promise<Artwork[]> {
  try {
    return await request<Artwork[]>(apiPaths.artworks);
  } catch (error) {
    if (isOffline(error)) return artworks;
    throw error;
  }
}

export async function fetchArtwork(id: string): Promise<Artwork | undefined> {
  try {
    return await request<Artwork>(artworkPath(id));
  } catch (error) {
    if (isOffline(error)) return artworks.find((artwork) => artwork.id === id);
    throw error;
  }
}

export async function createArtwork(input: Pick<Artwork, 'title' | 'description' | 'year' | 'medium' | 'materials' | 'size' | 'imageUrls' | 'tags'>): Promise<Artwork> {
  return request<Artwork>(apiPaths.artworks, { method: 'POST', body: JSON.stringify(input) });
}

/** 艺术家提交作品，进入待审队列 */
export function submitArtwork(id: string, comment = '') {
  return request<Artwork>(artworkPath(id, 'submit'), { method: 'POST', body: JSON.stringify({ comment }) });
}

/** 下架作品：后端会自动把它从进行中的展览撤出 */
export function takeDownArtwork(id: string, comment: string) {
  return request<Artwork>(artworkPath(id, 'takedown'), { method: 'POST', body: JSON.stringify({ comment }) });
}
