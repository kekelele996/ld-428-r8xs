import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { AuthRequest } from '../types/interfaces';

/** 只读 + 互动角色集合。 */
const writeRoles = new Set(['Admin', 'Curator', 'Artist']);

/**
 * 路由级 RBAC 粗粒度规则（细粒度的属主/越权校验在 service/controller 中）：
 * - Viewer 只能浏览和互动；
 * - 作品写操作（上传/提交/下架/审核）仅限 Artist/Admin；
 * - 展览策划（建展/挑作品/送审）仅限 Curator/Admin；
 * - 审核裁决（approve/reject/overturn）仅限 Admin，由 RolesGuard 强制。
 */
@Injectable()
export class RbacMiddleware implements NestMiddleware {
  use(req: AuthRequest, _res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    // 全局中间件挂在 Express 根上时 req.path 可能为 '/'，用 originalUrl 还原完整路径。
    const path = req.originalUrl?.split('?')[0] ?? `${req.baseUrl ?? ''}${req.path ?? ''}`;
    const role = req.user?.role ?? 'Viewer';

    if (!writeRoles.has(role) && !path.includes('/interactions') && path !== '/api/auth/token') {
      throw new ForbiddenException('Viewer 只能浏览和互动。');
    }

    if ((path.startsWith('/api/exhibitions') || path.includes('/exhibitions')) && role === 'Artist' && !path.includes('/interactions')) {
      throw new ForbiddenException('Artist 不能策划展览。');
    }

    if (path.startsWith('/api/artworks') && role === 'Curator') {
      throw new ForbiddenException('Curator 不能直接修改作品。');
    }

    if ((path.includes('/withdrawals')) && !['Admin', 'Curator', 'Artist'].includes(role)) {
      throw new ForbiddenException('无权查看撤出记录。');
    }

    next();
  }
}
