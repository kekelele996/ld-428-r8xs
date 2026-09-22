import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Interaction, InteractionDocument } from '../models/interaction.schema';
import { ArtworkService } from './artwork.service';
import { InteractionType } from '../types/enums';
import { withId, withIds } from '../utils/normalize';

@Injectable()
export class InteractionService {
  constructor(
    @InjectModel(Interaction.name) private readonly interactionModel: Model<InteractionDocument>,
    private readonly artworkService: ArtworkService,
  ) {}

  async list(query: { targetType?: string; targetId?: string }) {
    const docs = await this.interactionModel.find(query).sort({ createdAt: -1 }).lean();
    return withIds(docs);
  }

  async create(input: Partial<Interaction>) {
    const saved = await this.interactionModel.create({ userId: 'viewer-api', ...input });
    if (input.targetType === 'Artwork' && input.targetId) {
      if (input.type === InteractionType.Like) await this.artworkService.incrementMetric(input.targetId, 'likes');
      if (input.type === InteractionType.Bookmark) await this.artworkService.incrementMetric(input.targetId, 'bookmarks');
    }
    return withId(saved.toObject());
  }
}
