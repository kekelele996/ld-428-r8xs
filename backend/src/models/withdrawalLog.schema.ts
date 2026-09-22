import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { WithdrawalReason } from '../types/enums';

export type WithdrawalLogDocument = HydratedDocument<WithdrawalLog>;

/**
 * 作品撤出进行中（Active）展览的留痕。
 * 触发场景：作品被退回、被艺术家下架、管理员推翻既有审核结果。
 */
@Schema({ timestamps: true })
export class WithdrawalLog {
  @Prop({ required: true, index: true })
  artworkId!: string;

  @Prop({ required: true, index: true })
  exhibitionId!: string;

  @Prop({ enum: WithdrawalReason, required: true })
  reason!: WithdrawalReason;

  @Prop({ default: '' })
  comment!: string;

  /** 触发撤出的操作人（自动流程下为审核人/下架发起人）。 */
  @Prop({ required: true })
  operatorId!: string;
}

export const WithdrawalLogSchema = SchemaFactory.createForClass(WithdrawalLog);
WithdrawalLogSchema.index({ exhibitionId: 1, artworkId: 1, createdAt: -1 });
