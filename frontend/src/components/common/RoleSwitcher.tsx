import { useLocation, useNavigate } from 'react-router-dom';

import { useArtworkStore } from '../../stores/artworkStore';
import { useExhibitionStore } from '../../stores/exhibitionStore';
import { useSessionStore } from '../../stores/sessionStore';
import type { SessionRole } from '../../api/auth';

const roles: SessionRole[] = ['Admin', 'Curator', 'Artist', 'Viewer'];

const roleLabel: Record<SessionRole, string> = {
  Admin: '管理员',
  Curator: '策展人',
  Artist: '艺术家',
  Viewer: '访客',
};

/** 顶栏角色切换：开发演示 RBAC 与审核工作流。切换后重新拉取并留在当前页。 */
export function RoleSwitcher() {
  const user = useSessionStore((state) => state.user);
  const switchRole = useSessionStore((state) => state.switchRole);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitch = async (role: SessionRole) => {
    await switchRole(role);
    // 角色切换后按新权限重新加载列表，保证三个页面状态一致
    await Promise.all([useArtworkStore.getState().loadArtworks(true), useExhibitionStore.getState().loadExhibitions(true)]);
    navigate(location.pathname);
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      {roles.map((role) => (
        <button
          key={role}
          onClick={() => void handleSwitch(role)}
          className={`rounded-full px-3 py-1.5 font-semibold transition ${
            user.role === role ? 'bg-ink text-rice' : 'border border-ink/20 text-ink/65 hover:border-clay hover:text-clay'
          }`}
        >
          {roleLabel[role]}
        </button>
      ))}
    </div>
  );
}
