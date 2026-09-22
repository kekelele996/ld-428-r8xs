import { apiPaths } from '../constants/apiPaths';
import type { AuthUser } from '../types/auth';
import type { UserRole } from '../types/enums';
import { request } from '../utils/request';

export async function fetchToken(role: UserRole): Promise<{ token: string; user: AuthUser }> {
  return request(apiPaths.authToken, { method: 'POST', body: JSON.stringify({ role }) });
}
