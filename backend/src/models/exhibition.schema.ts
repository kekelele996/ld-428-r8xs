import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { EXCLUSIVE_EXHIBITION_STATUSES, ExhibitionStatus } from '../types/enums';

export type ExhibitionDocument = HydratedDocument<Exhibition>;

@Schema({ _id: false })
export class RemovedExhibitionArtwork {
  @Prop({ required: true })
  artworkId!: string;

  @Prop({ default: '' })
  reason!: string;

  @Prop({ type: Date, required: true })
  removedAt!: Date;
}

@Schema({ timestamps: true, toJSON: { virtuals: true, versionKey: false } })
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

  /** 仍在展的作品 ID；唯一索引保证同一作品不会同时进入两个进行中的展览 */
  @Prop({ type: [String], default: [] })
  activeArtworkIds!: string[];

  /** 撤出记录（退回/下架/推翻/退回展览），保留原因与时间 */
  @Prop({ type: [RemovedExhibitionArtwork], default: [] })
  removedArtworks!: RemovedExhibitionArtwork[];

  @Prop({ enum: ExhibitionStatus, default: ExhibitionStatus.Planning, index: true })
  status!: ExhibitionStatus;

  /** 最近一次送审结论/推翻决定的原因 */
  @Prop({ default: '' })
  reviewReason!: string;

  @Prop({ default: 0 })
  visitors!: number;
}

const ExhibitionSchema = SchemaFactory.createForClass(Exhibition);

/**
 * 同一作品在同一时刻只能存在于一个「进行中」（Planning/PendingReview/Active）的展览。
 * 部分唯一索引：空展览不占用索引项；展览被退回/归档后自动释放占用。
 */
ExhibitionSchema.index(
  { activeArtworkIds: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [...EXCLUSIVE_EXHIBITION_STATUSES] },
      'activeArtworkIds.0': { $exists: true },
    },
  },
);

export { ExhibitionSchema };
