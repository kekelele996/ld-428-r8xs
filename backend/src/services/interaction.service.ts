import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Interaction, InteractionDocument } from '../models/interaction.schema';
import { ArtworkService } from './artwork.service';
import { InteractionType } from '../types/enums';
import { isArtworkPublic } from '../utils/visibility';

@Injectable()
export class InteractionService {
  constructor(
    @InjectModel(Interaction.name) private readonly interactionModel: Model<InteractionDocument>,
    private readonly artworkService: ArtworkService,
  ) {}

  async list(query: { targetType?: string; targetId?: string }) {
    return this.interactionModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async create(input: Partial<Interaction>) {
    // 未通过审核/未公开的作品不允许互动（内容审核拦截）。
    if (input.targetType === 'Artwork' && input.targetId) {
      const artwork = await this.artworkService.find(input.targetId);
      if (!artwork || !isArtworkPublic(artwork)) {
        throw new BadRequestException('作品尚未公开，暂不可互动。');
      }
    }
    const saved = await this.interactionModel.create({ userId: 'viewer-api', ...input });
    if (input.targetType === 'Artwork' && input.targetId) {
      if (input.type === InteractionType.Like) await this.artworkService.incrementMetric(input.targetId, 'likes');
      if (input.type === InteractionType.Bookmark) await this.artworkService.incrementMetric(input.targetId, 'bookmarks');
    }
    return saved;
  }
}
