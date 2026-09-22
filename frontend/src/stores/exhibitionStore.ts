import { create } from 'zustand';

import {
  addArtworkToExhibition,
  createExhibition,
  fetchExhibitions,
  removeArtworkFromExhibition,
  submitExhibition,
} from '../api/exhibition';
import type { Exhibition } from '../types/exhibition';

interface ExhibitionState {
  exhibitions: Exhibition[];
  loadedAt: number;
  loadExhibitions: (force?: boolean) => Promise<void>;
  upsertExhibition: (exhibition: Exhibition) => void;
  create: (input: Parameters<typeof createExhibition>[0]) => Promise<Exhibition>;
  addArtwork: (exhibitionId: string, artworkId: string) => Promise<void>;
  removeArtwork: (exhibitionId: string, artworkId: string, reason: string) => Promise<void>;
  submit: (exhibitionId: string, comment?: string) => Promise<void>;
}

export const useExhibitionStore = create<ExhibitionState>((set, get) => ({
  exhibitions: [],
  loadedAt: 0,
  loadExhibitions: async (force = false) => {
    const exhibitions = await fetchExhibitions();
    set({ exhibitions, loadedAt: Date.now() });
  },
  upsertExhibition: (exhibition) =>
    set((state) => {
      const exists = state.exhibitions.some((item) => item.id === exhibition.id);
      return {
        exhibitions: exists
          ? state.exhibitions.map((item) => (item.id === exhibition.id ? exhibition : item))
          : [exhibition, ...state.exhibitions],
      };
    }),
  create: async (input) => {
    const saved = await createExhibition(input);
    get().upsertExhibition(saved);
    return saved;
  },
  addArtwork: async (exhibitionId, artworkId) => {
    const updated = await addArtworkToExhibition(exhibitionId, artworkId);
    get().upsertExhibition(updated);
  },
  removeArtwork: async (exhibitionId, artworkId, reason) => {
    const updated = await removeArtworkFromExhibition(exhibitionId, artworkId, reason);
    get().upsertExhibition(updated);
  },
  submit: async (exhibitionId, comment) => {
    const updated = await submitExhibition(exhibitionId, comment);
    get().upsertExhibition(updated);
  },
}));
