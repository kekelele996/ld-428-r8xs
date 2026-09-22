import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { ArtworkReviewStatus, ArtworkStatus, Medium } from '../types/enums';

export type ArtworkDocument = HydratedDocument<Artwork>;

@Schema({ timestamps: true })
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

  /** 历史/当前关联的全部展览（含策划中） */
  @Prop({ type: [String], default: [] })
  exhibitionIds!: string[];

  @Prop({ enum: ArtworkStatus, default: ArtworkStatus.Draft, index: true })
  status!: ArtworkStatus;

  /** 上展审核状态。只有 Approved 的作品才能被策展人选入并送审展览。 */
  @Prop({ enum: ArtworkReviewStatus, default: ArtworkReviewStatus.Unsubmitted, index: true })
  reviewStatus!: ArtworkReviewStatus;

  /** 最近一次审核意见（退回原因 / 推翻说明）。 */
  @Prop({ default: '' })
  reviewComment!: string;

  /**
   * 作品当前正在展出（Active 展览）的唯一展览 ID。
   * 稀疏唯一索引：null/不存在不参与唯一约束，保证同一作品不能同时进入两个进行中展览（并发安全兜底）。
   */
  @Prop({ type: String, default: null, sparse: true, unique: true })
  activeExhibitionId!: string | null;

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
