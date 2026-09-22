import { ArtworkReviewStatus, ArtworkStatus, ExhibitionStatus } from '../../types/enums';
import { artworkReviewLabels, artworkStatusLabels, exhibitionStatusLabels } from '../../constants/statusLabels';

type Tone = 'moss' | 'outline' | 'clay' | 'muted' | 'amber' | 'red' | 'lapis' | 'ink';

const toneClass: Record<Tone, string> = {
  moss: 'bg-moss text-rice',
  outline: 'bg-rice text-ink border border-ink/20',
  clay: 'bg-clay text-rice',
  muted: 'bg-ink/10 text-ink',
  amber: 'bg-amber-500 text-rice',
  red: 'bg-red-700 text-rice',
  lapis: 'bg-lapis text-rice',
  ink: 'bg-ink text-rice',
};

/** 不同枚举存在相同字面量（如 Draft/Rejected），按枚举分别映射避免键冲突。 */
const artworkTone: Record<ArtworkStatus, Tone> = {
  [ArtworkStatus.Published]: 'moss',
  [ArtworkStatus.Draft]: 'outline',
  [ArtworkStatus.Sold]: 'clay',
  [ArtworkStatus.Archived]: 'muted',
};

const reviewTone: Record<ArtworkReviewStatus, Tone> = {
  [ArtworkReviewStatus.Unsubmitted]: 'muted',
  [ArtworkReviewStatus.PendingReview]: 'amber',
  [ArtworkReviewStatus.Approved]: 'moss',
  [ArtworkReviewStatus.Rejected]: 'red',
};

const exhibitionTone: Record<ExhibitionStatus, Tone> = {
  [ExhibitionStatus.Active]: 'lapis',
  [ExhibitionStatus.Planning]: 'outline',
  [ExhibitionStatus.PendingReview]: 'amber',
  [ExhibitionStatus.Rejected]: 'red',
  [ExhibitionStatus.Ended]: 'ink',
  [ExhibitionStatus.Archived]: 'muted',
};

function resolveTone(status: string): Tone {
  if (Object.values(ArtworkStatus).includes(status as ArtworkStatus)) return artworkTone[status as ArtworkStatus];
  if (Object.values(ArtworkReviewStatus).includes(status as ArtworkReviewStatus)) return reviewTone[status as ArtworkReviewStatus];
  if (Object.values(ExhibitionStatus).includes(status as ExhibitionStatus)) return exhibitionTone[status as ExhibitionStatus];
  return 'muted';
}

const labels: Record<string, string> = {
  ...artworkStatusLabels,
  ...artworkReviewLabels,
  ...exhibitionStatusLabels,
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass[resolveTone(status)]}`}>
      {labels[status] ?? status}
    </span>
  );
}

/** 作品审核状态徽章（与发布状态并列展示）。 */
export function ReviewStatusBadge({ status }: { status: ArtworkReviewStatus }) {
  return <StatusBadge status={status} />;
}
