import { apiPaths } from '../constants/apiPaths';
import { artists } from '../utils/mockData';
import { isOffline } from '../utils/apiError';
import { request } from '../utils/request';
import type { Artist } from '../types/artist';

export async function fetchArtists(): Promise<Artist[]> {
  try {
    return await request<Artist[]>(apiPaths.artists);
  } catch (error) {
    if (isOffline(error)) return artists;
    throw error;
  }
}

export async function fetchArtist(id: string): Promise<Artist | undefined> {
  const list = await fetchArtists();
  return list.find((artist) => artist.id === id);
}
