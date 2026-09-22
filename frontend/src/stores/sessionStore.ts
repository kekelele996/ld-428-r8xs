import { create } from 'zustand';

import { fetchDevToken, type SessionRole, type SessionUser } from '../api/auth';
import { getToken, setToken } from '../utils/request';

interface SessionState {
  user: SessionUser;
  ready: boolean;
  init: () => Promise<void>;
  switchRole: (role: SessionRole) => Promise<void>;
  signOut: () => void;
}

const userIdForRole = (role: SessionRole) =>
  role === 'Admin' ? 'admin-1' : role === 'Curator' ? 'curator-1' : role === 'Artist' ? 'artist-1' : 'viewer-1';

/** 开发演示用的角色会话：不同角色登录后看到不同工作台操作。 */
export const useSessionStore = create<SessionState>((set) => ({
  user: { id: 'anonymous', role: 'Viewer' },
  ready: false,
  init: async () => {
    if (getToken()) {
      // 已有 token 时默认以艺术家身份继续（JWT 内角色以服务端为准，这里仅做 UI 初始值）
      set({ user: { id: userIdForRole('Artist'), role: 'Artist' }, ready: true });
      return;
    }
    try {
      const { token, user } = await fetchDevToken('Viewer');
      setToken(token);
      set({ user, ready: true });
    } catch {
      // 后端不可用时保持访客身份，页面走本地 mock 数据
      set({ user: { id: 'anonymous', role: 'Viewer' }, ready: true });
    }
  },
  switchRole: async (role) => {
    try {
      const { token, user } = await fetchDevToken(role, userIdForRole(role));
      setToken(token);
      set({ user, ready: true });
    } catch {
      // 离线演示：仅切换本地 UI 角色
      set({ user: { id: userIdForRole(role), role }, ready: true });
    }
  },
  signOut: () => {
    setToken(null);
    set({ user: { id: 'anonymous', role: 'Viewer' } });
  },
}));
