import { ArtworkReviewStatus, ArtworkStatus, Medium } from './enums';

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
  exhibitionIds: string[];
  status: ArtworkStatus;
  reviewStatus: ArtworkReviewStatus;
  reviewComment?: string;
  /** 当前正在展出（Active 展览）的唯一展览 ID，null 表示未在任何进行中展览。 */
  activeExhibitionId: string | null;
  price?: number;
  views: number;
  likes: number;
  bookmarks: number;
}
