import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types/enums';

export function RequireRole({ allow, children }: { allow: UserRole[]; children: JSX.Element }) {
  const role = useAuthStore((state) => state.user.role);
  if (!allow.includes(role)) {
    return <Navigate to="/gallery" replace />;
  }
  return children;
}
