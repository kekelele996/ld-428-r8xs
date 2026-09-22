import { WithdrawalReason } from './enums';

export interface WithdrawalLog {
  id: string;
  artworkId: string;
  exhibitionId: string;
  reason: WithdrawalReason;
  comment: string;
  operatorId: string;
  createdAt: string;
}
