import { create } from 'zustand';

import {
  approveArtwork,
  createArtwork,
  fetchArtworks,
  rejectArtwork,
  submitArtwork,
  takeDownArtwork,
  overturnArtwork,
} from '../api/artwork';
import type { Artwork } from '../types/artwork';

interface ArtworkState {
  artworks: Artwork[];
  loading: boolean;
  error: string | null;
  loadArtworks: () => Promise<void>;
  /** 统一执行变更动作并刷新本地状态，失败时抛出并记录错误信息。 */
  runArtworkAction: (id: string, action: (artworkId: string) => Promise<Artwork>) => Promise<void>;
  uploadArtwork: (input: Parameters<typeof createArtwork>[0]) => Promise<void>;
  submitArtwork: (id: string) => Promise<void>;
  takeDownArtwork: (id: string, comment?: string) => Promise<void>;
  approveArtwork: (id: string, comment?: string) => Promise<void>;
  rejectArtwork: (id: string, comment?: string) => Promise<void>;
  overturnArtwork: (id: string, comment?: string) => Promise<void>;
  updateArtworkMetrics: (id: string, patch: Partial<Pick<Artwork, 'likes' | 'bookmarks' | 'views'>>) => void;
  clearError: () => void;
}

function upsert(list: Artwork[], artwork: Artwork): Artwork[] {
  const index = list.findIndex((item) => item.id === artwork.id);
  if (index === -1) return [artwork, ...list];
  const next = [...list];
  next[index] = artwork;
  return next;
}

export const useArtworkStore = create<ArtworkState>((set, get) => ({
  artworks: [],
  loading: false,
  error: null,
  loadArtworks: async () => {
    set({ loading: true });
    try {
      const artworks = await fetchArtworks();
      set({ artworks, loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : '加载作品失败' });
    }
  },
  runArtworkAction: async (id, action) => {
    set({ error: null });
    try {
      const updated = await action(id);
      set((state) => ({ artworks: upsert(state.artworks, updated) }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败';
      set({ error: message });
      throw error;
    }
  },
  uploadArtwork: async (input) => {
    const artwork = await createArtwork(input);
    set((state) => ({ artworks: upsert(state.artworks, artwork) }));
  },
  submitArtwork: async (id) => get().runArtworkAction(id, (artworkId) => submitArtwork(artworkId)),
  takeDownArtwork: async (id, comment) => get().runArtworkAction(id, (artworkId) => takeDownArtwork(artworkId, comment)),
  approveArtwork: async (id, comment) => get().runArtworkAction(id, (artworkId) => approveArtwork(artworkId, comment)),
  rejectArtwork: async (id, comment) => get().runArtworkAction(id, (artworkId) => rejectArtwork(artworkId, comment)),
  overturnArtwork: async (id, comment) => get().runArtworkAction(id, (artworkId) => overturnArtwork(artworkId, comment)),
  updateArtworkMetrics: (id, patch) =>
    set((state) => ({
      artworks: state.artworks.map((artwork) => (artwork.id === id ? { ...artwork, ...patch } : artwork)),
    })),
  clearError: () => set({ error: null }),
}));
