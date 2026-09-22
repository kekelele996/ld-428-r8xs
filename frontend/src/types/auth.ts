import type { UserRole } from './enums';

export interface AuthUser {
  id: string;
  role: UserRole;
  artistId?: string;
}
