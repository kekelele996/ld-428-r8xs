import { create } from 'zustand';

import { fetchToken } from '../api/auth';
import type { AuthUser } from '../types/auth';
import type { UserRole } from '../types/enums';

const TOKEN_KEY = 'art-gallery-token';
const ROLE_KEY = 'art-gallery-role';

interface AuthState {
  token: string | null;
  user: AuthUser;
  switchRole: (role: UserRole) => Promise<void>;
  /** 切换到无后端的本地演示身份（不签发 token）。 */
  setLocalRole: (role: UserRole) => void;
}

function defaultUser(role: UserRole): AuthUser {
  if (role === 'Artist') return { id: 'user-lin', role, artistId: 'artist-lin' };
  if (role === 'Admin') return { id: 'user-admin', role };
  if (role === 'Curator') return { id: 'user-curator', role };
  return { id: 'anonymous', role: 'Viewer' };
}

const savedRole = (localStorage.getItem(ROLE_KEY) as UserRole | null) ?? 'Artist';
const savedToken = localStorage.getItem(TOKEN_KEY);

export const useAuthStore = create<AuthState>((set) => ({
  token: savedToken,
  user: defaultUser(savedRole),
  switchRole: async (role) => {
    try {
      const { token, user } = await fetchToken(role);
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ROLE_KEY, role);
      set({ token, user });
    } catch {
      // 后端不可用时退回本地演示身份
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(ROLE_KEY, role);
      set({ token: null, user: defaultUser(role) });
    }
  },
  setLocalRole: (role) => {
    localStorage.setItem(ROLE_KEY, role);
    set({ token: null, user: defaultUser(role) });
  },
}));
