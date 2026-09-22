import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { RolesGuard } from '../middlewares/roles.guard';
import { ExhibitionService } from '../services/exhibition.service';
import { WithdrawalService } from '../services/withdrawal.service';
import { Exhibition } from '../models/exhibition.schema';
import { CurrentUser, Roles } from '../utils/decorators';
import { RequestUser } from '../types/interfaces';
import { ok } from '../utils/response';

@Controller('api/exhibitions')
export class ExhibitionController {
  constructor(
    private readonly exhibitionService: ExhibitionService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  /** 普通观众只看到已批准（Active）的展览；策展/管理员看到全量。 */
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const staff = user.role === 'Admin' || user.role === 'Curator' || user.role === 'Artist';
    const items = staff ? await this.exhibitionService.listAll() : await this.exhibitionService.listPublic();
    return ok(items);
  }

  @Get(':id')
  async find(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.exhibitionService.getVisible(id, user));
  }

  /** 展览的撤出记录（含每件作品被撤出的原因）。 */
  @Get(':id/withdrawals')
  async withdrawals(@Param('id') id: string) {
    return ok(await this.withdrawalService.listForExhibition(id));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Curator', 'Admin')
  async create(@Body() body: Partial<Exhibition>, @CurrentUser() user: RequestUser) {
    return ok(await this.exhibitionService.create(body, user));
  }

  /** 策展人从已通过审核的作品中挑选一件加入展览。 */
  @Patch(':id/artworks')
  @UseGuards(RolesGuard)
  @Roles('Curator', 'Admin')
  async addArtwork(
    @Param('id') id: string,
    @Body('artworkId') artworkId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.exhibitionService.addArtwork(id, artworkId, user));
  }

  /** 策展人在策划阶段移除候选作品。 */
  @Delete(':id/artworks/:artworkId')
  @UseGuards(RolesGuard)
  @Roles('Curator', 'Admin')
  async removeArtwork(
    @Param('id') id: string,
    @Param('artworkId') artworkId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.exhibitionService.removeArtwork(id, artworkId, user));
  }

  /** 策展人送审展览。 */
  @Patch(':id/submit')
  @UseGuards(RolesGuard)
  @Roles('Curator', 'Admin')
  async submit(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.exhibitionService.submitForReview(id, user));
  }

  /** 管理员批准展览（并发发布只生效一次，作品随即公开）。 */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  async approve(@Param('id') id: string, @Body('comment') comment: string | undefined, @CurrentUser() user: RequestUser) {
    return ok(await this.exhibitionService.approve(id, user.id, comment ?? ''));
  }

  /** 管理员退回展览。 */
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  async reject(@Param('id') id: string, @Body('comment') comment: string | undefined, @CurrentUser() user: RequestUser) {
    return ok(await this.exhibitionService.reject(id, user.id, comment ?? ''));
  }

  /** 策展人/管理员结束进行中展览。 */
  @Patch(':id/end')
  @UseGuards(RolesGuard)
  @Roles('Curator', 'Admin')
  async end(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.exhibitionService.end(id, user));
  }
}
