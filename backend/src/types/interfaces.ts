import type { Request } from 'express';

export type UserRole = 'Admin' | 'Curator' | 'Artist' | 'Viewer';

export interface RequestUser {
  id: string;
  role: UserRole;
  artistId?: string;
}

export interface AuthRequest extends Request {
  user?: RequestUser;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
