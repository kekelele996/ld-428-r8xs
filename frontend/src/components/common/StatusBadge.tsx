const toneMap: Record<string, string> = {
  // 作品
  Draft: 'bg-rice text-ink border border-ink/20',
  PendingReview: 'bg-amber-100 text-amber-800 border border-amber-300',
  Approved: 'bg-moss/15 text-moss border border-moss/40',
  Rejected: 'bg-clay/15 text-clay border border-clay/40',
  Published: 'bg-moss text-rice',
  Sold: 'bg-clay text-rice',
  Archived: 'bg-ink/10 text-ink',
  // 展览（与作品同名的状态用前缀补充覆盖）
  Planning: 'bg-rice text-ink border border-ink/20',
  Active: 'bg-lapis text-rice',
  Ended: 'bg-ink text-rice',
};

const labelMap: Record<string, string> = {
  Draft: '草稿',
  PendingReview: '待审核',
  Approved: '已通过',
  Rejected: '已退回',
  Published: '已发布',
  Sold: '已售',
  Archived: '已下架',
  Planning: '筹备中',
  Active: '展出中',
  Ended: '已结束',
};

export function statusLabel(status: string) {
  return labelMap[status] ?? status;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneMap[status] ?? 'bg-ink/10 text-ink'}`}>
      {statusLabel(status)}
    </span>
  );
}
