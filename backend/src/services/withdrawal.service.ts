import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Artwork, ArtworkDocument } from '../models/artwork.schema';
import { Exhibition, ExhibitionDocument } from '../models/exhibition.schema';
import { ArtworkStatus, EXCLUSIVE_EXHIBITION_STATUSES, ExhibitionStatus } from '../types/enums';

export interface WithdrawalResult {
  exhibitionId: string;
  wasActive: boolean;
}

/**
 * 作品被退回、下架或审核结果被推翻时，自动从所有进行中的展览撤出，
 * 并在展览的 removedArtworks 与作品的 exhibitionIds 上留下一致的痕迹。
 */
@Injectable()
export class WithdrawalService {
  constructor(
    @InjectModel(Artwork.name) private readonly artworkModel: Model<ArtworkDocument>,
    @InjectModel(Exhibition.name) private readonly exhibitionModel: Model<ExhibitionDocument>,
  ) {}

  async withdrawArtwork(artworkId: string, reason: string): Promise<WithdrawalResult[]> {
    const exhibitions = await this.exhibitionModel.find({
      status: { $in: [...EXCLUSIVE_EXHIBITION_STATUSES] },
      activeArtworkIds: artworkId,
    });

    const results: WithdrawalResult[] = [];
    const removedAt = new Date();

    for (const exhibition of exhibitions) {
      const wasActive = exhibition.status === ExhibitionStatus.Active;
      // 条件原子更新：重复/并发撤出只生效一次
      const update = await this.exhibitionModel.updateOne(
        { _id: exhibition._id, activeArtworkIds: artworkId },
        {
          $pull: { activeArtworkIds: artworkId },
          $push: { removedArtworks: { $each: [{ artworkId, reason, removedAt }], $position: 0 } },
        },
      );
      if (update.modifiedCount > 0) {
        results.push({ exhibitionId: exhibition.id, wasActive });
      }
    }

    if (results.length) {
      await this.artworkModel.updateOne({ _id: artworkId }, { $pullAll: { exhibitionIds: results.map((item) => item.exhibitionId) } });
    }
    return results;
  }

  /** 作品已被撤出后，如果没有其他已开展览承载它，则 Published 回落到 Approved（未公开）。 */
  async demoteIfNoLongerPublic(artworkId: string) {
    const stillPublic = await this.exhibitionModel.exists({
      status: ExhibitionStatus.Active,
      activeArtworkIds: artworkId,
    });
    if (!stillPublic) {
      await this.artworkModel.updateOne(
        { _id: artworkId, status: ArtworkStatus.Published },
        { $set: { status: ArtworkStatus.Approved } },
      );
    }
  }
}
