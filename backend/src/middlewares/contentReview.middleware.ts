import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { ArtworkReviewStatus, ArtworkStatus, ExhibitionStatus } from '../types/enums';
import { AuthRequest } from '../types/interfaces';

interface ArtworkLike {
  status?: ArtworkStatus;
  reviewStatus?: ArtworkReviewStatus;
}

interface ExhibitionLike {
  status?: ExhibitionStatus;
}

/**
 * 内容审核拦截（纵深防御）：
 * 业务 service 已按角色过滤，这里再兜底一层——普通观众（Viewer）调用
 * 列表接口时，从响应中剥离任何未通过审核/未公开的作品与未批准的展览，
 * 保证“未审核内容不公开返回”。
 */
@Injectable()
export class ContentReviewMiddleware implements NestMiddleware {
  use(req: AuthRequest, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Review', 'enabled');

    const role = req.user?.role ?? 'Viewer';
    if (role !== 'Viewer' || req.method !== 'GET') return next();

    // 全局中间件挂在 Express 根上时 req.path 可能为 '/'，用 originalUrl 还原路径。
    const path = req.originalUrl?.split('?')[0] ?? req.path;

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const payload = body as { data?: unknown } | undefined;
      if (payload && typeof payload === 'object' && 'data' in payload) {
        if (path === '/api/artworks' && Array.isArray(payload.data)) {
          payload.data = (payload.data as ArtworkLike[]).filter(isArtworkPublic);
        }
        if (path === '/api/exhibitions' && Array.isArray(payload.data)) {
          payload.data = (payload.data as ExhibitionLike[]).filter((item) => item.status === ExhibitionStatus.Active);
        }
      }
      return originalJson(payload);
    };

    next();
  }
}

function isArtworkPublic(artwork: ArtworkLike): boolean {
  return artwork.status === ArtworkStatus.Published && artwork.reviewStatus === ArtworkReviewStatus.Approved;
}
