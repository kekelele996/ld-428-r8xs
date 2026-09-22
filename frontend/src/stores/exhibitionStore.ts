import { create } from 'zustand';

import {
  addArtworkToExhibition,
  approveExhibition,
  createExhibition,
  endExhibition,
  fetchExhibitions,
  rejectExhibition,
  removeArtworkFromExhibition,
  submitExhibition,
} from '../api/exhibition';
import type { Exhibition } from '../types/exhibition';

interface ExhibitionState {
  exhibitions: Exhibition[];
  loading: boolean;
  error: string | null;
  loadExhibitions: () => Promise<void>;
  createExhibition: (input: Parameters<typeof createExhibition>[0]) => Promise<void>;
  runExhibitionAction: (id: string, action: (exhibitionId: string) => Promise<Exhibition>) => Promise<void>;
  addArtwork: (id: string, artworkId: string) => Promise<void>;
  removeArtwork: (id: string, artworkId: string) => Promise<void>;
  submitExhibition: (id: string) => Promise<void>;
  approveExhibition: (id: string, comment?: string) => Promise<void>;
  rejectExhibition: (id: string, comment?: string) => Promise<void>;
  endExhibition: (id: string) => Promise<void>;
  clearError: () => void;
}

function upsert(list: Exhibition[], exhibition: Exhibition): Exhibition[] {
  const index = list.findIndex((item) => item.id === exhibition.id);
  if (index === -1) return [exhibition, ...list];
  const next = [...list];
  next[index] = exhibition;
  return next;
}

export const useExhibitionStore = create<ExhibitionState>((set, get) => ({
  exhibitions: [],
  loading: false,
  error: null,
  loadExhibitions: async () => {
    set({ loading: true });
    try {
      const exhibitions = await fetchExhibitions();
      set({ exhibitions, loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : '加载展览失败' });
    }
  },
  createExhibition: async (input) => {
    const exhibition = await createExhibition(input);
    set((state) => ({ exhibitions: upsert(state.exhibitions, exhibition) }));
  },
  runExhibitionAction: async (id, action) => {
    set({ error: null });
    try {
      const updated = await action(id);
      set((state) => ({ exhibitions: upsert(state.exhibitions, updated) }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败';
      set({ error: message });
      throw error;
    }
  },
  addArtwork: async (id, artworkId) =>
    get().runExhibitionAction(id, (exhibitionId) => addArtworkToExhibition(exhibitionId, artworkId)),
  removeArtwork: async (id, artworkId) =>
    get().runExhibitionAction(id, (exhibitionId) => removeArtworkFromExhibition(exhibitionId, artworkId)),
  submitExhibition: async (id) => get().runExhibitionAction(id, (exhibitionId) => submitExhibition(exhibitionId)),
  approveExhibition: async (id, comment) =>
    get().runExhibitionAction(id, (exhibitionId) => approveExhibition(exhibitionId, comment)),
  rejectExhibition: async (id, comment) =>
    get().runExhibitionAction(id, (exhibitionId) => rejectExhibition(exhibitionId, comment)),
  endExhibition: async (id) => get().runExhibitionAction(id, (exhibitionId) => endExhibition(exhibitionId)),
  clearError: () => set({ error: null }),
}));
