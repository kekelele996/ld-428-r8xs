import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import type { RequestUser } from '../types/interfaces';
import { getApiPath } from '../utils/requestPath';

/**
 * 基于路径的细粒度 RBAC。
 * 越权写操作在这里拦截；「只能操作自己的资源」在 service 中按资源 owner 校验。
 */
interface RbacRule {
  method: string;
  pattern: RegExp;
  roles: Array<RequestUser['role']>;
}

const rules: RbacRule[] = [
  // 作品：艺术家创建/提交；管理员/策展人下架
  { method: 'POST', pattern: /^\/api\/artworks\/[^/]+\/submit$/, roles: ['Artist', 'Admin'] },
  { method: 'POST', pattern: /^\/api\/artworks\/[^/]+\/takedown$/, roles: ['Admin', 'Curator'] },
  { method: 'POST', pattern: /^\/api\/artworks$/, roles: ['Artist', 'Admin'] },

  // 展览：策展人/管理员策划、挑作品、送审
  { method: 'POST', pattern: /^\/api\/exhibitions\/[^/]+\/artworks(\/[^/]*)?$/, roles: ['Curator', 'Admin'] },
  { method: 'DELETE', pattern: /^\/api\/exhibitions\/[^/]+\/artworks\/[^/]+$/, roles: ['Curator', 'Admin'] },
  { method: 'POST', pattern: /^\/api\/exhibitions\/[^/]+\/submit$/, roles: ['Curator', 'Admin'] },
  { method: 'POST', pattern: /^\/api\/exhibitions$/, roles: ['Curator', 'Admin'] },

  // 审核中心：仅管理员
  { method: 'POST', pattern: /^\/api\/reviews\/.+$/, roles: ['Admin'] },
];

@Injectable()
export class RbacMiddleware implements NestMiddleware {
  use(req: Request & { user?: RequestUser }, _res: Response, next: NextFunction) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    const path = getApiPath(req);
    if (path === '/api/auth/dev-token') return next();
    // 互动（点赞/评论/收藏）所有登录角色可用
    if (path.startsWith('/api/interactions')) return next();

    const user: RequestUser = req.user ?? { id: 'anonymous', role: 'Viewer' };
    const rule = rules.find((item) => item.method === req.method && item.pattern.test(path));

    if (rule && !rule.roles.includes(user.role)) {
      throw new ForbiddenException('越权操作：当前角色无权执行该动作。');
    }
    if (!rule && user.role === 'Viewer') {
      throw new ForbiddenException('Viewer 只能浏览和互动。');
    }
    next();
  }
}
