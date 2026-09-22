import { AlertTriangle, Ban, Clock, RotateCcw } from 'lucide-react';

import { ArtworkStatus, ExhibitionStatus } from '../../types/enums';

type BannerConfig = { tone: string; icon: JSX.Element; text: string };

const artworkConfig: Partial<Record<ArtworkStatus, BannerConfig>> = {
  [ArtworkStatus.PendingReview]: {
    tone: 'border-amber-300 bg-amber-50 text-amber-900',
    icon: <Clock size={16} />,
    text: '作品已提交，等待管理员审核。',
  },
  [ArtworkStatus.Rejected]: {
    tone: 'border-clay/40 bg-clay/10 text-clay',
    icon: <RotateCcw size={16} />,
    text: '作品被退回',
  },
  [ArtworkStatus.Archived]: {
    tone: 'border-ink/25 bg-ink/5 text-ink',
    icon: <Ban size={16} />,
    text: '作品已下架',
  },
};

const exhibitionConfig: Partial<Record<ExhibitionStatus, BannerConfig>> = {
  [ExhibitionStatus.PendingReview]: {
    tone: 'border-amber-300 bg-amber-50 text-amber-900',
    icon: <Clock size={16} />,
    text: '展览已送审，等待管理员批准。',
  },
  [ExhibitionStatus.Rejected]: {
    tone: 'border-clay/40 bg-clay/10 text-clay',
    icon: <AlertTriangle size={16} />,
    text: '展览被退回',
  },
};

/**
 * 审核/下架原因横幅：作品详情与展览页刷新后仍能看到最近一次决定的原因。
 */
export function ReviewReasonBanner({
  kind,
  status,
  reason,
}: {
  kind: 'artwork' | 'exhibition';
  status: ArtworkStatus | ExhibitionStatus;
  reason?: string;
}) {
  if (!reason) return null;
  const current = kind === 'artwork' ? artworkConfig[status as ArtworkStatus] : exhibitionConfig[status as ExhibitionStatus];
  if (!current) return null;

  return (
    <div className={`flex items-start gap-3 border px-4 py-3 text-sm ${current.tone}`} data-testid="review-reason">
      <span className="mt-0.5">{current.icon}</span>
      <div>
        <p className="font-semibold">{current.text}</p>
        <p className="mt-1 leading-6 opacity-90">{reason}</p>
      </div>
    </div>
  );
}
