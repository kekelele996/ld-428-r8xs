import { create } from 'zustand';

import { createArtwork, fetchArtworks, submitArtwork, takeDownArtwork } from '../api/artwork';
import type { Artwork } from '../types/artwork';

interface ArtworkState {
  artworks: Artwork[];
  loading: boolean;
  loadedAt: number;
  loadArtworks: (force?: boolean) => Promise<void>;
  upsertArtwork: (artwork: Artwork) => void;
  updateArtworkMetrics: (id: string, patch: Partial<Pick<Artwork, 'likes' | 'bookmarks' | 'views'>>) => void;
  create: (input: Parameters<typeof createArtwork>[0]) => Promise<Artwork>;
  submit: (id: string, comment?: string) => Promise<void>;
  takeDown: (id: string, comment: string) => Promise<void>;
  removeArtwork: (id: string) => void;
}

export const useArtworkStore = create<ArtworkState>((set, get) => ({
  artworks: [],
  loading: false,
  loadedAt: 0,
  loadArtworks: async (force = false) => {
    // 页面刷新或跨页时强制拉取，保证工作台、展览页、详情页看到同一份最新状态
    if (!force && get().loading) return;
    set({ loading: true });
    try {
      const artworks = await fetchArtworks();
      set({ artworks, loading: false, loadedAt: Date.now() });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  upsertArtwork: (artwork) =>
    set((state) => {
      const exists = state.artworks.some((item) => item.id === artwork.id);
      return {
        artworks: exists
          ? state.artworks.map((item) => (item.id === artwork.id ? artwork : item))
          : [artwork, ...state.artworks],
      };
    }),
  updateArtworkMetrics: (id, patch) =>
    set((state) => ({
      artworks: state.artworks.map((artwork) => (artwork.id === id ? { ...artwork, ...patch } : artwork)),
    })),
  create: async (input) => {
    const saved = await createArtwork(input);
    get().upsertArtwork(saved);
    return saved;
  },
  submit: async (id, comment) => {
    const updated = await submitArtwork(id, comment);
    get().upsertArtwork(updated);
  },
  takeDown: async (id, comment) => {
    const updated = await takeDownArtwork(id, comment);
    get().upsertArtwork(updated);
  },
  removeArtwork: (id) => set((state) => ({ artworks: state.artworks.filter((item) => item.id !== id) })),
}));
