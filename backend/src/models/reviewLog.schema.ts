import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { ReviewResult } from '../types/enums';

export type ReviewLogDocument = HydratedDocument<ReviewLog>;

export type ReviewTargetType = 'Artwork' | 'Exhibition';

/** 审核动作：送审、作出裁决、推翻既有裁决。最新一条日志决定当前审核结果。 */
export type ReviewAction = 'Submit' | 'Decision' | 'Overturn';

@Schema({ timestamps: true })
export class ReviewLog {
  @Prop({ enum: ['Artwork', 'Exhibition'], required: true, index: true })
  targetType!: ReviewTargetType;

  @Prop({ required: true, index: true })
  targetId!: string;

  @Prop({ required: true })
  reviewerId!: string;

  @Prop({ enum: ReviewResult, required: true })
  result!: ReviewResult;

  @Prop({ enum: ['Submit', 'Decision', 'Overturn'], default: 'Decision' })
  action!: ReviewAction;

  @Prop({ default: '' })
  comment!: string;
}

export const ReviewLogSchema = SchemaFactory.createForClass(ReviewLog);
ReviewLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
