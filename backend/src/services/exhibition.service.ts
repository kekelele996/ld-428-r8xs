import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MongoServerError } from 'mongodb';
import { Model } from 'mongoose';

import { Exhibition, ExhibitionDocument } from '../models/exhibition.schema';
import { Artwork, ArtworkDocument } from '../models/artwork.schema';
import { ArtworkStatus, EXCLUSIVE_EXHIBITION_STATUSES, ExhibitionStatus } from '../types/enums';
import { withId, withIds } from '../utils/normalize';

@Injectable()
export class ExhibitionService {
  constructor(
    @InjectModel(Exhibition.name) private readonly exhibitionModel: Model<ExhibitionDocument>,
    @InjectModel(Artwork.name) private readonly artworkModel: Model<ArtworkDocument>,
  ) {}

  async list() {
    const docs = await this.exhibitionModel.find().sort({ startDate: -1 }).lean();
    return withIds(docs);
  }

  async find(id: string) {
    const doc = await this.exhibitionModel.findById(id).lean();
    return withId(doc);
  }

  async create(input: Partial<Exhibition>, curatorId: string) {
    const saved = await this.exhibitionModel.create({
      status: ExhibitionStatus.Planning,
      activeArtworkIds: [],
      removedArtworks: [],
      reviewReason: '',
      ...input,
      curatorId,
    });
    return withId(saved.toObject());
  }

  async getOrFail(id: string) {
    const exhibition = await this.exhibitionModel.findById(id);
    if (!exhibition) throw new NotFoundException('展览不存在。');
    return exhibition;
  }

  /** 策展人只能从已通过审核的作品中挑选；同一作品不能同时进入两个进行中的展览。 */
  async addArtwork(id: string, artworkId: string, userId: string, userRole: string) {
    const exhibition = await this.getOrFail(id);
    if (userRole !== 'Admin' && exhibition.curatorId !== userId) {
      throw new ForbiddenException('只能向自己策划的展览添加作品。');
    }
    if (![ExhibitionStatus.Planning, ExhibitionStatus.Rejected].includes(exhibition.status)) {
      throw new ConflictException('只有筹备中或被退回的展览才能挑选作品。');
    }
    if (exhibition.activeArtworkIds.includes(artworkId)) {
      throw new ConflictException('作品已在该展览中。');
    }

    const artwork = await this.artworkModel.findById(artworkId);
    if (!artwork) throw new NotFoundException('作品不存在。');
    if (![ArtworkStatus.Approved, ArtworkStatus.Published, ArtworkStatus.Sold].includes(artwork.status)) {
      throw new ConflictException('只能挑选已通过审核的作品。');
    }

    const occupied = await this.exhibitionModel.findOne({
      _id: { $ne: exhibition._id },
      status: { $in: [...EXCLUSIVE_EXHIBITION_STATUSES] },
      activeArtworkIds: artworkId,
    });
    if (occupied) {
      throw new ConflictException('同一作品不能同时出现在两个进行中的展览。');
    }

    try {
      await this.exhibitionModel.updateOne(
        {
          _id: exhibition._id,
          status: { $in: [ExhibitionStatus.Planning, ExhibitionStatus.Rejected] },
          activeArtworkIds: { $ne: artworkId },
        },
        {
          $addToSet: { activeArtworkIds: artworkId },
          ...(exhibition.status === ExhibitionStatus.Rejected
            ? { $set: { status: ExhibitionStatus.Planning, reviewReason: '' } }
            : {}),
        },
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('同一作品不能同时出现在两个进行中的展览。');
      }
      throw error;
    }

    const updated = await this.exhibitionModel.findById(exhibition._id);
    if (!updated || !updated.activeArtworkIds.includes(artworkId)) {
      throw new ConflictException('作品加入失败，可能与其他展览冲突。');
    }
    await this.artworkModel.updateOne(
      { _id: artworkId },
      { $addToSet: { exhibitionIds: exhibition.id } },
    );
    return withId(updated.toObject());
  }

  /** 筹备阶段移除作品（策展人主动调整），同步作品上的展览引用。 */
  async removeArtwork(id: string, artworkId: string, reason: string, userId: string, userRole: string) {
    const exhibition = await this.getOrFail(id);
    if (userRole !== 'Admin' && exhibition.curatorId !== userId) {
      throw new ForbiddenException('只能调整自己策划的展览。');
    }
    if (!exhibition.activeArtworkIds.includes(artworkId)) {
      throw new NotFoundException('该作品不在展览中。');
    }
    exhibition.activeArtworkIds = exhibition.activeArtworkIds.filter((item) => item !== artworkId);
    exhibition.removedArtworks.unshift({
      artworkId,
      reason: reason || '策展人主动移除。',
      removedAt: new Date(),
    });
    await exhibition.save();
    await this.artworkModel.updateOne({ _id: artworkId }, { $pull: { exhibitionIds: exhibition.id } });
    return withId(exhibition.toObject());
  }
}
