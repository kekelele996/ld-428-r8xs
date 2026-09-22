import { apiPaths } from '../constants/apiPaths';
import { artworks } from '../utils/mockData';
import { request } from '../utils/request';
import type { Artwork } from '../types/artwork';
import type { ArtworkReviewStatus } from '../types/enums';

export async function fetchArtworks(): Promise<Artwork[]> {
  try {
    return await request<Artwork[]>(apiPaths.artworks);
  } catch {
    return artworks;
  }
}

export async function fetchArtwork(id: string): Promise<Artwork | undefined> {
  try {
    return await request<Artwork>(`${apiPaths.artworks}/${id}`);
  } catch {
    return (await fetchArtworks()).find((artwork) => artwork.id === id);
  }
}

export async function createArtwork(input: Pick<Artwork, 'title' | 'description'> & Partial<Artwork>): Promise<Artwork> {
  return request<Artwork>(apiPaths.artworks, { method: 'POST', body: JSON.stringify(input) });
}

async function patchArtwork(id: string, action: string, comment?: string): Promise<Artwork> {
  return request<Artwork>(`${apiPaths.artworks}/${id}/${action}`, {
    method: 'PATCH',
    body: JSON.stringify(comment === undefined ? {} : { comment }),
  });
}

export const submitArtwork = (id: string) => patchArtwork(id, 'submit');
export const takeDownArtwork = (id: string, comment?: string) => patchArtwork(id, 'takedown', comment);
export const approveArtwork = (id: string, comment?: string) => patchArtwork(id, 'approve', comment);
export const rejectArtwork = (id: string, comment?: string) => patchArtwork(id, 'reject', comment);
export const overturnArtwork = (id: string, comment?: string) => patchArtwork(id, 'overturn', comment);

export const artworkReviewStatus = (artwork: Artwork): ArtworkReviewStatus => artwork.reviewStatus;
