import { ExhibitionStatus, ExhibitionType } from './enums';

export interface RemovedExhibitionArtwork {
  artworkId: string;
  reason: string;
  removedAt: string;
}

export interface Exhibition {
  id: string;
  title: string;
  description: string;
  curatorId: string;
  startDate: string;
  endDate: string;
  type: ExhibitionType;
  coverUrl: string;
  /** 仍在展的作品 ID */
  activeArtworkIds: string[];
  /** 撤出记录（退回/下架/推翻/退回展览），保留原因与时间 */
  removedArtworks: RemovedExhibitionArtwork[];
  status: ExhibitionStatus;
  reviewReason?: string;
  visitors: number;
}
