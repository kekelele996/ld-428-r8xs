import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { RolesGuard } from '../middlewares/roles.guard';
import { ReviewService } from '../services/review.service';
import { ReviewTargetType } from '../models/reviewLog.schema';
import { Roles } from '../utils/decorators';
import { ok } from '../utils/response';

@Controller('api/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /** 审核日志查询，供管理员工作台和作品/展览详情展示审核轨迹；普通观众不可见。 */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('Admin', 'Curator', 'Artist')
  async list(@Query('targetType') targetType?: ReviewTargetType, @Query('targetId') targetId?: string) {
    return ok(await this.reviewService.listLogs(targetType, targetId));
  }
}
