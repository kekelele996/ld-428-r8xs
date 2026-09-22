import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { ArtworkStatus, Medium } from '../types/enums';

export type ArtworkDocument = HydratedDocument<Artwork>;

@Schema({ timestamps: true, toJSON: { virtuals: true, versionKey: false } })
export class Artwork {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  year!: number;

  @Prop({ enum: Medium, required: true })
  medium!: Medium;

  @Prop({ required: true })
  materials!: string;

  @Prop({ type: Object, required: true })
  size!: { length: number; width: number; height?: number };

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];

  @Prop()
  videoUrl?: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ required: true, index: true })
  artistId!: string;

  /** 当前仍在占用该作品的展览（Planning/PendingReview/Active），随撤出操作同步清理 */
  @Prop({ type: [String], default: [] })
  exhibitionIds!: string[];

  @Prop({ enum: ArtworkStatus, default: ArtworkStatus.Draft, index: true })
  status!: ArtworkStatus;

  /** 最近一次审核/下架决定的原因，页面刷新后仍可展示 */
  @Prop({ default: '' })
  reviewReason!: string;

  @Prop()
  price?: number;

  @Prop({ default: 0 })
  views!: number;

  @Prop({ default: 0 })
  likes!: number;

  @Prop({ default: 0 })
  bookmarks!: number;
}

export const ArtworkSchema = SchemaFactory.createForClass(Artwork);
