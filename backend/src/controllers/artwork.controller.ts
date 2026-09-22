import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { RolesGuard } from '../middlewares/roles.guard';
import { ArtworkService } from '../services/artwork.service';
import { ReviewResult } from '../types/enums';
import { Artwork, ArtworkDocument } from '../models/artwork.schema';
import { CurrentUser, Roles } from '../utils/decorators';
import { RequestUser } from '../types/interfaces';
import { ok } from '../utils/response';

@Controller('api/artworks')
export class ArtworkController {
  constructor(private readonly artworkService: ArtworkService) {}

  /** 普通观众只看到已公开作品；工作台/策展人/管理员可查看全量。 */
  @Get()
  async list(@CurrentUser() user: RequestUser) {
    const staff = user.role === 'Admin' || user.role === 'Curator' || user.role === 'Artist';
    const items = staff ? await this.artworkService.listAll() : await this.artworkService.listPublic();
    return ok(items);
  }

  @Get(':id')
  async find(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.artworkService.getVisible(id, user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('Artist', 'Admin')
  async create(@Body() body: Partial<Artwork>, @CurrentUser() user: RequestUser) {
    return ok(await this.artworkService.create(body, user));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('Artist', 'Admin')
  async update(@Param('id') id: string, @Body() body: Partial<ArtworkDocument>, @CurrentUser() user: RequestUser) {
    return ok(await this.artworkService.updateDraft(id, body, user));
  }

  /** 艺术家提交作品进入待审。 */
  @Patch(':id/submit')
  @UseGuards(RolesGuard)
  @Roles('Artist', 'Admin')
  async submit(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return ok(await this.artworkService.submitForReview(id, user));
  }

  /** 艺术家下架已发布作品（自动撤出进行中展览并留原因）。 */
  @Patch(':id/takedown')
  @UseGuards(RolesGuard)
  @Roles('Artist', 'Admin')
  async takeDown(
    @Param('id') id: string,
    @Body('comment') comment: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return ok(await this.artworkService.takeDown(id, user, comment ?? ''));
  }

  /** 管理员通过作品审核。 */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  async approve(@Param('id') id: string, @Body('comment') comment: string | undefined, @CurrentUser() user: RequestUser) {
    return ok(await this.artworkService.decideReview(id, ReviewResult.Approved, user.id, comment ?? ''));
  }

  /** 管理员退回作品（自动撤出进行中展览并留原因）。 */
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  async reject(@Param('id') id: string, @Body('comment') comment: string | undefined, @CurrentUser() user: RequestUser) {
    return ok(await this.artworkService.decideReview(id, ReviewResult.Rejected, user.id, comment ?? ''));
  }

  /** 管理员推翻已通过的作品审核（自动撤出进行中展览并留原因）。 */
  @Patch(':id/overturn')
  @UseGuards(RolesGuard)
  @Roles('Admin')
  async overturn(@Param('id') id: string, @Body('comment') comment: string | undefined, @CurrentUser() user: RequestUser) {
    return ok(await this.artworkService.overturnApproval(id, user.id, comment ?? ''));
  }
}
