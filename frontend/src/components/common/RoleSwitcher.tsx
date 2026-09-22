import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types/enums';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'Admin', label: '管理员' },
  { value: 'Curator', label: '策展人' },
  { value: 'Artist', label: '艺术家' },
  { value: 'Viewer', label: '观众' },
];

/** 工作台/导航栏中的角色切换器：切换后以对应角色调用后端（签发 JWT）。 */
export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  const role = useAuthStore((state) => state.user.role);
  const switchRole = useAuthStore((state) => state.switchRole);

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${compact ? '' : 'text-ink/70'}`}>
      <span className="text-xs uppercase tracking-wide text-ink/45">身份</span>
      <select
        value={role}
        onChange={(event) => void switchRole(event.target.value as UserRole)}
        className="border border-ink/20 bg-rice px-2 py-1 text-sm outline-none focus:border-clay"
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
