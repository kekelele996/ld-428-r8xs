import { apiPaths } from '../constants/apiPaths';
import { request } from '../utils/request';

export type SessionRole = 'Admin' | 'Curator' | 'Artist' | 'Viewer';

export interface SessionUser {
  id: string;
  role: SessionRole;
}

export async function fetchDevToken(role: SessionRole, userId?: string): Promise<{ token: string; user: SessionUser }> {
  return request<{ token: string; user: SessionUser }>(`${apiPaths.auth}/dev-token`, {
    method: 'POST',
    body: JSON.stringify({ role, userId }),
  });
}
