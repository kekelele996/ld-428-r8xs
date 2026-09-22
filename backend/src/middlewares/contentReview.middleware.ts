import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Artwork, ArtworkDocument } from '../models/artwork.schema';
import { Exhibition, ExhibitionDocument } from '../models/exhibition.schema';
import { PUBLIC_ARTWORK_STATUSES, PUBLIC_EXHIBITION_STATUSES } from '../types/enums';
import type { RequestUser } from '../types/interfaces';
import { getApiPath } from '../utils/requestPath';

/**
 * 未审核/未公开内容不公开返回：
 * - 列表：Viewer（含匿名）只看到已发布作品与已开展览
 * - 详情：Viewer 访问未公开对象得到 404，避免侧链泄露
 * 创作者/策展人/管理员可以看到全部对象（工作台与审核页依赖这一点）。
 */
@Injectable()
export class ContentReviewMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Artwork.name) private readonly artworkModel: Model<ArtworkDocument>,
    @InjectModel(Exhibition.name) private readonly exhibitionModel: Model<ExhibitionDocument>,
  ) {}

  use(req: Request & { user?: RequestUser }, res: Response, next: NextFunction) {
    if (req.method !== 'GET') {
      res.setHeader('X-Content-Review', 'enabled');
      return next();
    }

    const user: RequestUser = req.user ?? { id: 'anonymous', role: 'Viewer' };
    const isViewer = user.role === 'Viewer' || user.id === 'anonymous';

    if (!isViewer) return next();

    const path = getApiPath(req);
    const artworkId = /^\/api\/artworks\/([a-f\d]+)$/i.exec(path)?.[1];
    const exhibitionId = /^\/api\/exhibitions\/([a-f\d]+)$/.exec(path)?.[1];

    if (artworkId) {
      void this.guardDetail(
        res,
        next,
        this.artworkModel.findById(artworkId).lean() as Promise<{ status?: string } | null>,
        (doc) => PUBLIC_ARTWORK_STATUSES.includes(doc.status as (typeof PUBLIC_ARTWORK_STATUSES)[number]),
      );
      return;
    }
    if (exhibitionId) {
      void this.guardDetail(
        res,
        next,
        this.exhibitionModel.findById(exhibitionId).lean() as Promise<{ status?: string } | null>,
        (doc) => PUBLIC_EXHIBITION_STATUSES.includes(doc.status as (typeof PUBLIC_EXHIBITION_STATUSES)[number]),
      );
      return;
    }

    if (path === '/api/artworks' || path === '/api/exhibitions') {
      const allowed: readonly string[] = path === '/api/artworks' ? PUBLIC_ARTWORK_STATUSES : PUBLIC_EXHIBITION_STATUSES;
      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => originalJson(this.filterList(body, (item) => allowed.includes(item.status ?? '')))) as Response['json'];
    }

    next();
  }

  private async guardDetail(
    res: Response,
    next: NextFunction,
    query: Promise<{ status?: string } | null>,
    isPublic: (doc: { status?: string }) => boolean,
  ) {
    const doc = await query;
    if (!doc || !isPublic(doc)) {
      res.status(404).json({ statusCode: 404, message: '内容未公开或正在审核中。' });
      return;
    }
    next();
  }

  private filterList(body: unknown, keep: (item: { status?: string }) => boolean) {
    if (Array.isArray(body)) return body.filter(keep);
    if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
      return { ...(body as object), data: (body as { data: { status?: string }[] }).data.filter(keep) };
    }
    return body;
  }
}
