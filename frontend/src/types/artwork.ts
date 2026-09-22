import { ArtworkStatus, Medium } from './enums';

export interface Artwork {
  id: string;
  title: string;
  description: string;
  year: number;
  medium: Medium;
  materials: string;
  size: { length: number; width: number; height?: number };
  imageUrls: string[];
  videoUrl?: string;
  tags: string[];
  artistId: string;
  /** 当前仍占用该作品的进行中展览（Planning/PendingReview/Active） */
  exhibitionIds: string[];
  status: ArtworkStatus;
  /** 最近一次审核 / 下架决定的原因 */
  reviewReason?: string;
  price?: number;
  views: number;
  likes: number;
  bookmarks: number;
}
