import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from '../services/auth.service';
import { UserRole } from '../types/interfaces';
import { ok } from '../utils/response';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 演示登录：按角色签发 JWT，供工作台切换身份、验证越权防护。 */
  @Post('token')
  issueToken(@Body('role') role: UserRole) {
    return ok(this.authService.issueToken(role));
  }
}
