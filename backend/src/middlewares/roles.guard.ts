import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthRequest, UserRole } from '../types/interfaces';
import { ROLES_KEY } from '../utils/decorators';

/**
 * 控制器/方法级 RBAC：配合 @Roles() 装饰器使用。
 * 粗粒度的写入角色校验仍在 rbacMiddleware，这里负责具体接口的越权防护。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const role = req.user?.role ?? 'Viewer';
    if (!required.includes(role)) {
      throw new ForbiddenException(`该操作仅限 ${required.join(' / ')}。`);
    }
    return true;
  }
}
