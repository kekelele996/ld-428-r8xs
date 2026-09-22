import { Body, Controller, Post } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

import { jwtConfig } from '../config/jwt.config';
import { ok } from '../utils/response';

interface DevLoginBody {
  role?: 'Admin' | 'Curator' | 'Artist' | 'Viewer';
  userId?: string;
}

/**
 * 开发环境角色登录：签发 JWT，前端工作台用它切换角色演示审核流程。
 */
@Controller('auth')
export class AuthController {
  @Post('dev-token')
  devToken(@Body() body: DevLoginBody) {
    const role = body.role ?? 'Viewer';
    const id = body.userId ?? `dev-${role.toLowerCase()}`;
    const token = jwt.sign({ id, role }, jwtConfig.secret, { expiresIn: '7d' });
    return ok({ token, user: { id, role } });
  }
}
