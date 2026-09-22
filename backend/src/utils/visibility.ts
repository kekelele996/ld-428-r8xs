import { ArtworkReviewStatus, ArtworkStatus, ExhibitionStatus } from '../types/enums';

interface PublicArtworkLike {
  status: ArtworkStatus;
  reviewStatus?: ArtworkReviewStatus;
}

interface PublicExhibitionLike {
  status: ExhibitionStatus;
}

/**
 * 作品公开判定（内容审核单一事实来源）：
 * 只有随已批准展览展出（Published 且审核通过）的作品才对普通观众公开。
 * 草稿、待审、退回、已下架均不公开。
 */
export function isArtworkPublic(artwork: PublicArtworkLike): boolean {
  return artwork.status === ArtworkStatus.Published && artwork.reviewStatus === ArtworkReviewStatus.Approved;
}

/** 只有管理员批准后进入 Active 的展览才对普通观众公开。 */
export function isExhibitionPublic(exhibition: PublicExhibitionLike): boolean {
  return exhibition.status === ExhibitionStatus.Active;
}
