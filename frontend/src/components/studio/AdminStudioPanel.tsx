import { useEffect, useState } from 'react';

import { ErrorBanner } from '../common/ErrorBanner';
import { StatusBadge } from '../common/StatusBadge';
import { useArtworkStore } from '../../stores/artworkStore';
import { useExhibitionStore } from '../../stores/exhibitionStore';
import { ArtworkReviewStatus, ExhibitionStatus } from '../../types/enums';

function PromptReason(): string {
  const reason = window.prompt('请填写审核意见（可留空）：', '');
  return reason ?? '';
}

/** 管理员审核台：裁决作品、批准/退回展览。重复与并发操作由后端保证只生效一次。 */
export function AdminStudioPanel() {
  const { artworks, loadArtworks, approveArtwork, rejectArtwork, overturnArtwork } = useArtworkStore();
  const { exhibitions, error, clearError, loadExhibitions, approveExhibition, rejectExhibition } = useExhibitionStore();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    void Promise.all([loadArtworks(), loadExhibitions()]);
  }, [loadArtworks, loadExhibitions]);

  const pendingArtworks = artworks.filter((artwork) => artwork.reviewStatus === ArtworkReviewStatus.PendingReview);
  const decidedArtworks = artworks.filter(
    (artwork) => artwork.reviewStatus === ArtworkReviewStatus.Approved || artwork.reviewStatus === ArtworkReviewStatus.Rejected,
  );
  const pendingExhibitions = exhibitions.filter((exhibition) => exhibition.status === ExhibitionStatus.PendingReview);

  const refresh = async () => {
    await Promise.all([loadArtworks(), loadExhibitions()]);
    forceUpdate((value) => value + 1);
  };

  const guarded = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch {
      // 错误信息由 store.error 展示（如重复审核、并发冲突、越权）
    }
    await refresh();
  };

  return (
    <section className="mt-10 space-y-10">
      <ErrorBanner message={error} onDismiss={clearError} />

      <div>
        <h2 className="font-display text-3xl">待审作品（{pendingArtworks.length}）</h2>
        <div className="mt-4 space-y-3">
          {pendingArtworks.map((artwork) => (
            <article key={artwork.id} className="flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 p-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{artwork.title}</h3>
                  <StatusBadge status={artwork.reviewStatus} />
                </div>
                <p className="mt-1 text-sm text-ink/60">{artwork.artistId}</p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => void guarded(() => approveArtwork(artwork.id, PromptReason()))}
                  className="bg-moss px-4 py-2 font-semibold text-rice hover:opacity-90"
                >
                  通过
                </button>
                <button
                  onClick={() => void guarded(() => rejectArtwork(artwork.id, PromptReason() || '不符合上展要求'))}
                  className="bg-red-700 px-4 py-2 font-semibold text-rice hover:opacity-90"
                >
                  退回
                </button>
              </div>
            </article>
          ))}
          {!pendingArtworks.length && <p className="text-sm text-ink/50">暂无待审作品。</p>}
        </div>
      </div>

      <div>
        <h2 className="font-display text-3xl">待审展览（{pendingExhibitions.length}）</h2>
        <p className="mt-1 text-sm text-ink/55">批准后展览公开，其中作品随即公开；若作品已在其他进行中展览，发布将被原子拦截。</p>
        <div className="mt-4 space-y-3">
          {pendingExhibitions.map((exhibition) => (
            <article key={exhibition.id} className="flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 p-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{exhibition.title}</h3>
                  <StatusBadge status={exhibition.status} />
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {exhibition.artworkIds.length} 件作品 · {exhibition.curatorId}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  onClick={() => void guarded(() => approveExhibition(exhibition.id, PromptReason()))}
                  className="bg-moss px-4 py-2 font-semibold text-rice hover:opacity-90"
                >
                  批准开展
                </button>
                <button
                  onClick={() => void guarded(() => rejectExhibition(exhibition.id, PromptReason() || '请调整后重新送审'))}
                  className="bg-red-700 px-4 py-2 font-semibold text-rice hover:opacity-90"
                >
                  退回
                </button>
              </div>
            </article>
          ))}
          {!pendingExhibitions.length && <p className="text-sm text-ink/50">暂无待审展览。</p>}
        </div>
      </div>

      <div>
        <h2 className="font-display text-3xl">已裁决作品（{decidedArtworks.length}）</h2>
        <div className="mt-4 space-y-3">
          {decidedArtworks.map((artwork) => (
            <article key={artwork.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/15 p-4 text-sm">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{artwork.title}</h3>
                  <StatusBadge status={artwork.reviewStatus} />
                  {artwork.activeExhibitionId && <span className="text-xs text-lapis">在展：{artwork.activeExhibitionId}</span>}
                </div>
                {artwork.reviewComment && <p className="mt-1 text-ink/60">意见：{artwork.reviewComment}</p>}
              </div>
              {artwork.reviewStatus === ArtworkReviewStatus.Approved && (
                <button
                  onClick={() => void guarded(() => overturnArtwork(artwork.id, PromptReason() || '管理员推翻既有审核结果'))}
                  className="border border-red-700 px-4 py-2 text-red-700 hover:bg-red-700 hover:text-rice"
                >
                  推翻审核
                </button>
              )}
            </article>
          ))}
          {!decidedArtworks.length && <p className="text-sm text-ink/50">暂无已裁决作品。</p>}
        </div>
      </div>
    </section>
  );
}
