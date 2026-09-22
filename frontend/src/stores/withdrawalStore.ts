import { create } from 'zustand';

import { fetchWithdrawals } from '../api/withdrawal';
import type { WithdrawalLog } from '../types/withdrawal';

interface WithdrawalState {
  logs: WithdrawalLog[];
  loadWithdrawals: (filter?: { exhibitionId?: string; artworkId?: string }) => Promise<void>;
}

export const useWithdrawalStore = create<WithdrawalState>((set) => ({
  logs: [],
  loadWithdrawals: async (filter) => {
    try {
      set({ logs: await fetchWithdrawals(filter) });
    } catch {
      set({ logs: [] });
    }
  },
}));
