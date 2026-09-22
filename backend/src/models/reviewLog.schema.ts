import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { ReviewAction, ReviewResult } from '../types/enums';

export type ReviewLogDocument = HydratedDocument<ReviewLog>;

@Schema({ timestamps: true })
export class ReviewLog {
  @Prop({ enum: ['Artwork', 'Exhibition'], required: true, index: true })
  targetType!: 'Artwork' | 'Exhibition';

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ required: true })
  reviewerId!: string;

  /** 工作流动作（提交/批准/退回/推翻/下架/撤出），是真正的流水依据 */
  @Prop({ enum: ReviewAction, required: true, index: true })
  action!: ReviewAction;

  /** 兼容需求文档：审批结论；纯流转动作（提交/撤出）可为空 */
  @Prop({ enum: ReviewResult })
  result?: ReviewResult;

  @Prop({ default: '' })
  comment!: string;

  /** 撤出作品时关联的展览 ID 等关联目标 */
  @Prop()
  relatedId?: string;
}

export const ReviewLogSchema = SchemaFactory.createForClass(ReviewLog);
