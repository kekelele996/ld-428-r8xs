import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

import { AuthRequest, RequestUser, UserRole } from '../types/interfaces';

export const ROLES_KEY = 'roles';

/** 标注接口允许访问的角色。 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** 从请求中取出鉴权用户（authMiddleware 注入）。 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.user ?? { id: 'anonymous', role: 'Viewer' as UserRole };
  },
);
