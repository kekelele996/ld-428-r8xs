import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Artist, ArtistDocument } from '../models/artist.schema';
import { withId, withIds } from '../utils/normalize';

@Injectable()
export class ArtistService {
  constructor(@InjectModel(Artist.name) private readonly artistModel: Model<ArtistDocument>) {}

  async list() {
    const docs = await this.artistModel.find().sort({ followerCount: -1 }).lean();
    return withIds(docs);
  }

  async find(id: string) {
    const doc = await this.artistModel.findById(id).lean();
    return withId(doc);
  }

  async create(input: Partial<Artist>) {
    const saved = await this.artistModel.create(input);
    return withId(saved.toObject());
  }
}
