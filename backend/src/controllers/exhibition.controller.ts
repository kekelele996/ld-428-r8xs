import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ExhibitionService } from '../services/exhibition.service';
import { ReviewService } from '../services/review.service';
import { ok } from '../utils/response';
import type { RequestUser } from '../types/interfaces';

@Controller('exhibitions')
export class ExhibitionController {
  constructor(
    private readonly exhibitionService: ExhibitionService,
    private readonly reviewService: ReviewService,
  ) {}

  @Get()
  async list() {
    return ok(await this.exhibitionService.list());
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    return ok(await this.exhibitionService.find(id));
  }

  @Post()
  async create(@Body() body: Record<string, unknown>, @Req() req: Request & { user: RequestUser }) {
    return ok(await this.exhibitionService.create(body, req.user.id));
  }

  /** 策展人挑选已通过审核的作品加入展览 */
  @Post(':id/artworks')
  async addArtwork(
    @Param('id') id: string,
    @Body() body: { artworkId?: string },
    @Req() req: Request & { user: RequestUser },
  ) {
    return ok(await this.exhibitionService.addArtwork(id, body.artworkId ?? '', req.user.id, req.user.role));
  }

  /** 策展阶段主动移除作品（留痕） */
  @Delete(':id/artworks/:artworkId')
  async removeArtwork(
    @Param('id') id: string,
    @Param('artworkId') artworkId: string,
    @Body() body: { reason?: string },
    @Req() req: Request & { user: RequestUser },
  ) {
    return ok(await this.exhibitionService.removeArtwork(id, artworkId, body.reason ?? '', req.user.id, req.user.role));
  }

  /** 策展人送审展览 */
  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() body: { comment?: string }, @Req() req: Request & { user: RequestUser }) {
    return ok(await this.reviewService.submitExhibition(id, body.comment ?? '', req.user));
  }
}
