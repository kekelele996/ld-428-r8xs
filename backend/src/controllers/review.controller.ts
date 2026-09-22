import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ReviewResult } from '../types/enums';
import type { RequestUser } from '../types/interfaces';
import { ReviewService } from '../services/review.service';
import { ok } from '../utils/response';

/**
 * 管理员审核中心：作品审批、展览批准、结论推翻，以及审核轨迹查询。
 */
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('logs')
  async logs(@Query() query: { targetType?: string; targetId?: string }, @Req() req: Request & { user: RequestUser }) {
    if (req.user.role === 'Viewer') {
      return ok([]);
    }
    return ok(await this.reviewService.listLogs(query));
  }

  @Post('artworks/:id/decision')
  async decideArtwork(
    @Param('id') id: string,
    @Body() body: { result?: ReviewResult; comment?: string },
    @Req() req: Request & { user: RequestUser },
  ) {
    return ok(
      await this.reviewService.decideArtwork({
        targetType: 'Artwork',
        targetId: id,
        result: (body.result ?? ReviewResult.Flagged) as ReviewResult,
        comment: body.comment ?? '',
        actor: req.user,
      }),
    );
  }

  @Post('exhibitions/:id/decision')
  async decideExhibition(
    @Param('id') id: string,
    @Body() body: { result?: ReviewResult; comment?: string },
    @Req() req: Request & { user: RequestUser },
  ) {
    return ok(
      await this.reviewService.decideExhibition({
        targetType: 'Exhibition',
        targetId: id,
        result: (body.result ?? ReviewResult.Flagged) as ReviewResult,
        comment: body.comment ?? '',
        actor: req.user,
      }),
    );
  }

  @Post('artworks/:id/overturn')
  async overturnArtwork(
    @Param('id') id: string,
    @Body() body: { result?: ReviewResult.Approved | ReviewResult.Rejected; comment?: string },
    @Req() req: Request & { user: RequestUser },
  ) {
    return ok(await this.reviewService.overturnArtwork(id, body.result ?? ReviewResult.Rejected, body.comment ?? '', req.user));
  }

  @Post('exhibitions/:id/overturn')
  async overturnExhibition(
    @Param('id') id: string,
    @Body() body: { result?: ReviewResult.Approved | ReviewResult.Rejected; comment?: string },
    @Req() req: Request & { user: RequestUser },
  ) {
    return ok(await this.reviewService.overturnExhibition(id, body.result ?? ReviewResult.Rejected, body.comment ?? '', req.user));
  }
}
