import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Artwork, ArtworkDocument } from '../models/artwork.schema';
import { ArtworkStatus } from '../types/enums';
import { withId, withIds } from '../utils/normalize';

@Injectable()
export class ArtworkService {
  constructor(@InjectModel(Artwork.name) private readonly artworkModel: Model<ArtworkDocument>) {}

  async list() {
    const docs = await this.artworkModel.find().sort({ updatedAt: -1 }).lean();
    return withIds(docs);
  }

  async find(id: string) {
    const doc = await this.artworkModel.findById(id).lean();
    return withId(doc);
  }

  async create(input: Partial<Artwork>) {
    const saved = await this.artworkModel.create({ status: ArtworkStatus.Draft, reviewReason: '', ...input });
    return withId(saved.toObject());
  }

  async getOrFail(id: string) {
    const artwork = await this.artworkModel.findById(id);
    if (!artwork) throw new NotFoundException('作品不存在。');
    return artwork;
  }

  async incrementMetric(id: string, field: 'likes' | 'bookmarks' | 'views', amount = 1) {
    return this.artworkModel.findByIdAndUpdate(id, { $inc: { [field]: amount } }, { new: true });
  }
}
