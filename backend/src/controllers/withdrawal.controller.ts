import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { RolesGuard } from '../middlewares/roles.guard';
import { WithdrawalService } from '../services/withdrawal.service';
import { Roles } from '../utils/decorators';
import { ok } from '../utils/response';

@Controller('api/withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /** 撤出留痕（带原因），用于展览页与工作台展示。仅限内部角色。 */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Curator', 'Artist')
  async list(@Query('exhibitionId') exhibitionId?: string, @Query('artworkId') artworkId?: string) {
    return ok(await this.withdrawalService.list({ exhibitionId, artworkId }));
  }

  @Get('exhibition/:exhibitionId')
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Curator', 'Artist')
  async listForExhibition(@Param('exhibitionId') exhibitionId: string) {
    return ok(await this.withdrawalService.listForExhibition(exhibitionId));
  }
}
