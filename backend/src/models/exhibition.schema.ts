import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { ExhibitionStatus } from '../types/enums';

export type ExhibitionDocument = HydratedDocument<Exhibition>;

@Schema({ timestamps: true })
export class Exhibition {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, index: true })
  curatorId!: string;

  @Prop({ required: true })
  startDate!: string;

  @Prop({ required: true })
  endDate!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  coverUrl!: string;

  /**
   * 当前仍在展览中的作品。作品被退回/下架/审核推翻时会自动从中移除，
   * 因此该列表始终反映真实在展阵容。
   */
  @Prop({ type: [String], default: [] })
  artworkIds!: string[];

  /**
   * Planning（策划中）-> PendingReview（送审中）-> Active（已批准、公开）
   * 送审被退回 -> Rejected（可调整后重新送审）；结束 -> Ended。
   */
  @Prop({ enum: ExhibitionStatus, default: ExhibitionStatus.Planning, index: true })
  status!: ExhibitionStatus;

  /** 最近一次展览审核意见。 */
  @Prop({ default: '' })
  reviewComment!: string;

  @Prop({ default: 0 })
  visitors!: number;
}

export const ExhibitionSchema = SchemaFactory.createForClass(Exhibition);
