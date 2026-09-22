import { useMemo, useState } from 'react';

import { ErrorBanner } from '../common/ErrorBanner';
import { EmptyState } from '../common/EmptyState';
import { ReviewStatusBadge } from '../common/StatusBadge';
import { useArtworkStore } from '../../stores/artworkStore';
import { ArtworkReviewStatus, ArtworkStatus } from '../../types/enums';
import { artworkReviewLabels } from '../../constants/statusLabels';

const tabs: { key: ArtworkReviewStatus; label: string }[] = [
  { key: ArtworkReviewStatus.Unsubmitted, label: artworkReviewLabels[ArtworkReviewStatus.Unsubmitted] },
  { key: ArtworkReviewStatus.PendingReview, label: artworkReviewLabels[ArtworkReviewStatus.PendingReview] },
  { key: ArtworkReviewStatus.Approved, label: artworkReviewLabels[ArtworkReviewStatus.Approved] },
  { key: ArtworkReviewStatus.Rejected, label: artworkReviewLabels[ArtworkReviewStatus.Rejected] },
];

/** 艺术家工作台：上传草稿、提交审核、查看退回原因、下架作品。 */
export function ArtistStudioPanel() {
  const [draftTitle, setDraftTitle] = useState('');
  const [activeTab, setActiveTab] = useState<ArtworkReviewStatus>(ArtworkReviewStatus.Unsubmitted);
  const { artworks, error, clearError, uploadArtwork, submitArtwork, takeDownArtwork, loadArtworks } = useArtworkStore();

  const myArtworks = useMemo(() => artworks.filter((artwork) => artwork.artistId === 'artist-lin'), [artworks]);
  const list = myArtworks.filter((artwork) => artwork.reviewStatus === activeTab);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftTitle.trim()) return;
    await uploadArtwork({
      title: draftTitle.trim(),
      description: '新上传的草稿作品，完善信息后提交审核。',
      year: new Date().getFullYear(),
      medium: 'Other' as never,
      materials: '待补充',
      size: { length: 40, width: 30 },
      imageUrls: ['https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=80'],
      tags: [],
    } as never);
    setDraftTitle('');
    await loadArtworks();
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-3xl">我的作品 · 上展审核</h2>
        <form className="flex gap-2" onSubmit={(event) => void handleUpload(event)}>
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="border border-ink/20 bg-rice px-4 py-2 text-sm outline-none focus:border-clay"
            placeholder="新作品标题（创建为草稿）"
          />
          <button className="bg-ink px-4 py-2 text-sm font-semibold text-rice hover:bg-clay">上传草稿</button>
        </form>
      </div>

      <ErrorBanner message={error} onDismiss={clearError} />

      <div className="mt-6 flex gap-2 border-b border-ink/15">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm outline-none ${activeTab === tab.key ? 'bg-ink text-rice' : 'text-ink/65 hover:text-ink'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="mt-6 space-y-4">
          {list.map((artwork) => (
            <article key={artwork.id} className="flex flex-wrap items-center justify-between gap-4 border border-ink/15 p-4">
              <div className="min-w-[220px] flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-xl">{artwork.title}</h3>
                  <ReviewStatusBadge status={artwork.reviewStatus} />
                  {artwork.status === ArtworkStatus.Published && (
                    <span className="rounded-full bg-moss px-3 py-1 text-xs font-semibold text-rice">已公开</span>
                  )}
                </div>
                {artwork.reviewStatus === ArtworkReviewStatus.Rejected && artwork.reviewComment && (
                  <p className="mt-2 text-sm text-red-700">退回原因：{artwork.reviewComment}</p>
                )}
                {artwork.activeExhibitionId && (
                  <p className="mt-1 text-xs text-ink/55">当前在展：{artwork.activeExhibitionId}</p>
                )}
              </div>
              <div className="flex gap-2 text-sm">
                {(artwork.reviewStatus === ArtworkReviewStatus.Unsubmitted ||
                  artwork.reviewStatus === ArtworkReviewStatus.Rejected) && (
                  <button
                    onClick={() => void submitArtwork(artwork.id)}
                    className="border border-clay px-4 py-2 font-semibold text-clay hover:bg-clay hover:text-rice"
                  >
                    {artwork.reviewStatus === ArtworkReviewStatus.Rejected ? '修改后重新送审' : '提交审核'}
                  </button>
                )}
                {artwork.reviewStatus === ArtworkReviewStatus.PendingReview && (
                  <span className="px-4 py-2 text-ink/50">等待管理员审核…</span>
                )}
                {artwork.status === ArtworkStatus.Published && (
                  <button
                    onClick={() => void takeDownArtwork(artwork.id, '艺术家主动下架').then(() => loadArtworks())}
                    className="border border-ink/30 px-4 py-2 hover:border-red-700 hover:text-red-700"
                  >
                    下架
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState title={`${tabs.find((tab) => tab.key === activeTab)?.label}队列为空`} description="作品状态变化后会自动进入对应队列。" />
        </div>
      )}
    </section>
  );
}
