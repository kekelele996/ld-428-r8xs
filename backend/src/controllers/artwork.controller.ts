import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ArtworkService } from '../services/artwork.service';
import { ReviewService } from '../services/review.service';
import { ok } from '../utils/response';
import type { RequestUser } from '../types/interfaces';

@Controller('artworks')
export class ArtworkController {
  constructor(
    private readonly artworkService: ArtworkService,
    private readonly reviewService: ReviewService,
  ) {}

  @Get()
  async list() {
    return ok(await this.artworkService.list());
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return ok(await this.artworkService.find(id));
  }

  @Post()
  async create(@Body() body: Record<string, unknown>, @Req() req: Request & { user: RequestUser }) {
    return ok(await this.artworkService.create({ ...body, artistId: String(body.artistId ?? req.user.id) }));
  }

  /** 艺术家提交作品，进入待审 */
  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() body: { comment?: string }, @Req() req: Request & { user: RequestUser }) {
    return ok(await this.reviewService.submitArtwork(id, body.comment ?? '', req.user));
  }

  /** 下架作品：自动撤出进行中的展览 */
  @Post(':id/takedown')
  async takeDown(@Param('id') id: string, @Body() body: { comment?: string }, @Req() req: Request & { user: RequestUser }) {
    return ok(await this.reviewService.takeDownArtwork(id, body.comment ?? '', req.user));
  }
}
