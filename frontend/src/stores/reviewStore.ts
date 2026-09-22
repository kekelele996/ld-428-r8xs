import { create } from 'zustand';

import { fetchReviewLogs } from '../api/review';
import type { ReviewLog, ReviewTargetType } from '../types/review';

interface ReviewState {
  logs: ReviewLog[];
  loadLogs: (targetType?: ReviewTargetType, targetId?: string) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set) => ({
  logs: [],
  loadLogs: async (targetType, targetId) => {
    try {
      set({ logs: await fetchReviewLogs(targetType, targetId) });
    } catch {
      set({ logs: [] });
    }
  },
}));
