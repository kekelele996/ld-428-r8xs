import { Navigate } from 'react-router-dom';

import { useSessionStore } from '../stores/sessionStore';
import type { SessionRole } from '../api/auth';

export function RequireRole({ allow, children }: { allow: SessionRole[]; children: JSX.Element }) {
  const role = useSessionStore((state) => state.user.role);
  if (!allow.includes(role)) {
    return <Navigate to="/gallery" replace />;
  }
  return children;
}
