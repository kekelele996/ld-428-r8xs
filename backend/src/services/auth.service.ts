import { BadRequestException, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

import { jwtConfig } from '../config/jwt.config';
import { RequestUser, UserRole } from '../types/interfaces';

/**
 * 演示用身份目录：前端工作台可切换角色，后端据此签发真实 JWT。
 * 生产环境应由用户体系替换。
 */
export const demoUsers: Record<string, RequestUser> = {
  admin: { id: 'user-admin', role: 'Admin' },
  curator: { id: 'user-curator', role: 'Curator' },
  artist: { id: 'user-lin', role: 'Artist', artistId: 'artist-lin' },
  viewer: { id: 'anonymous', role: 'Viewer' },
};

@Injectable()
export class AuthService {
  issueToken(role: UserRole): { token: string; user: RequestUser } {
    const user = Object.values(demoUsers).find((item) => item.role === role);
    if (!user) throw new BadRequestException('未知角色。');
    const token = jwt.sign({ ...user }, jwtConfig.secret, { expiresIn: '7d' });
    return { token, user };
  }
}
