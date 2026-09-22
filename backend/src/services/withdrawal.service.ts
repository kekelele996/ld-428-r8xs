import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { WithdrawalLog, WithdrawalLogDocument } from '../models/withdrawalLog.schema';
import { WithdrawalReason } from '../types/enums';

export interface WithdrawalInput {
  artworkId: string;
  exhibitionId: string;
  reason: WithdrawalReason;
  comment?: string;
  operatorId: string;
}

@Injectable()
export class WithdrawalService {
  constructor(@InjectModel(WithdrawalLog.name) private readonly withdrawalModel: Model<WithdrawalLogDocument>) {}

  async record(input: WithdrawalInput) {
    return this.withdrawalModel.create({ comment: '', ...input });
  }

  async list(filter: { exhibitionId?: string; artworkId?: string } = {}) {
    // 显式剔除 undefined，避免 Mongoose 将其解释为 { $exists: false } 导致漏查。
    const query: { exhibitionId?: string; artworkId?: string } = {};
    if (filter.exhibitionId) query.exhibitionId = filter.exhibitionId;
    if (filter.artworkId) query.artworkId = filter.artworkId;
    return this.withdrawalModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async listForExhibition(exhibitionId: string) {
    return this.withdrawalModel.find({ exhibitionId }).sort({ createdAt: -1 }).lean();
  }
}
