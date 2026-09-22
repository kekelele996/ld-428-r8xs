import { useEffect, useMemo, useState } from 'react';

import { ErrorBanner } from '../common/ErrorBanner';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { useArtworkStore } from '../../stores/artworkStore';
import { useExhibitionStore } from '../../stores/exhibitionStore';
import { ArtworkReviewStatus, ExhibitionStatus } from '../../types/enums';
import { exhibitionStatusLabels } from '../../constants/statusLabels';

const editableStatuses = [ExhibitionStatus.Planning, ExhibitionStatus.Rejected];

/** 策展人工作台：只能从已通过作品审核的作品中挑选，送审后等待管理员批准。 */
export function CuratorStudioPanel() {
  const { artworks, loadArtworks } = useArtworkStore();
  const { exhibitions, error, clearError, loadExhibitions, createExhibition, addArtwork, removeArtwork, submitExhibition, endExhibition } =
    useExhibitionStore();
  const [selectedExhibition, setSelectedExhibition] = useState<string>('');

  useEffect(() => {
    void Promise.all([loadArtworks(), loadExhibitions()]);
  }, [loadArtworks, loadExhibitions]);

  const myExhibitions = useMemo(() => exhibitions.filter((exhibition) => exhibition.curatorId === 'user-curator'), [exhibitions]);
  const current = myExhibitions.find((exhibition) => exhibition.id === selectedExhibition) ?? myExhibitions[0];
  const approvedArtworks = artworks.filter((artwork) => artwork.reviewStatus === ArtworkReviewStatus.Approved);
  const selectableArtworks = approvedArtworks.filter(
    (artwork) => !artwork.activeExhibitionId || artwork.activeExhibitionId === current?.id,
  );

  const handleCreate = async () => {
    await createExhibition({
      title: `新展览 ${new Date().toLocaleDateString('zh-CN')}`,
      description: '策划中的新展览。',
      curatorId: 'user-curator',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      type: 'Group' as never,
      coverUrl: 'https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=1400&q=80',
    });
    await loadExhibitions();
  };

  const editable = current ? editableStatuses.includes(current.status) : false;

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-3xl">策展工作台 · 选品与送审</h2>
        <button onClick={() => void handleCreate()} className="bg-ink px-4 py-2 text-sm font-semibold text-rice hover:bg-lapis">
          创建展览
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={clearError} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          {myExhibitions.length ? (
            myExhibitions.map((exhibition) => (
              <button
                key={exhibition.id}
                onClick={() => setSelectedExhibition(exhibition.id)}
                className={`block w-full border p-4 text-left ${current?.id === exhibition.id ? 'border-clay' : 'border-ink/15'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{exhibition.title}</span>
                  <StatusBadge status={exhibition.status} />
                </div>
                <p className="mt-1 text-xs text-ink/50">{exhibitionStatusLabels[exhibition.status]}</p>
                {exhibition.status === ExhibitionStatus.Rejected && exhibition.reviewComment && (
                  <p className="mt-2 text-xs text-red-700">退回：{exhibition.reviewComment}</p>
                )}
              </button>
            ))
          ) : (
            <EmptyState title="暂无展览" description="创建第一个展览后开始选品。" />
          )}
        </aside>

        {current ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 pb-4">
              <h3 className="font-display text-2xl">{current.title}</h3>
              <div className="flex gap-2 text-sm">
                {editable && (
                  <button
                    onClick={() => void submitExhibition(current.id).then(() => Promise.all([loadExhibitions(), loadArtworks()]))}
                    disabled={!current.artworkIds.length}
                    className="border border-clay px-4 py-2 font-semibold text-clay enabled:hover:bg-clay enabled:hover:text-rice disabled:opacity-40"
                  >
                    送审展览
                  </button>
                )}
                {current.status === ExhibitionStatus.PendingReview && <span className="px-4 py-2 text-ink/50">等待管理员批准…</span>}
                {current.status === ExhibitionStatus.Active && (
                  <button
                    onClick={() => void endExhibition(current.id).then(() => loadExhibitions())}
                    className="border border-ink/30 px-4 py-2 hover:border-red-700 hover:text-red-700"
                  >
                    结束展览
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/55">已选作品（{current.artworkIds.length}）</h4>
              <ul className="mt-3 space-y-2">
                {current.artworkIds.map((artworkId) => {
                  const artwork = artworks.find((item) => item.id === artworkId);
                  return (
                    <li key={artworkId} className="flex items-center justify-between border border-ink/15 px-4 py-2 text-sm">
                      <span>{artwork?.title ?? artworkId}</span>
                      {editable && (
                        <button
                          onClick={() => void removeArtwork(current.id, artworkId).then(() => loadExhibitions())}
                          className="text-red-700 hover:underline"
                        >
                          移除
                        </button>
                      )}
                    </li>
                  );
                })}
                {!current.artworkIds.length && <li className="text-sm text-ink/50">尚未选择作品，送审至少需要一件。</li>}
              </ul>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-ink/55">
                可挑选作品（仅已通过审核 · {selectableArtworks.length}）
              </h4>
              <ul className="mt-3 space-y-2">
                {selectableArtworks.map((artwork) => {
                  const already = current.artworkIds.includes(artwork.id);
                  return (
                    <li key={artwork.id} className="flex items-center justify-between border border-ink/15 px-4 py-2 text-sm">
                      <span>
                        {artwork.title}
                        {artwork.activeExhibitionId === current.id && <span className="ml-2 text-xs text-lapis">本展在展</span>}
                      </span>
                      {editable && !already && (
                        <button
                          onClick={() => void addArtwork(current.id, artwork.id).then(() => loadExhibitions())}
                          className="font-semibold text-clay hover:underline"
                        >
                          加入展览
                        </button>
                      )}
                    </li>
                  );
                })}
                {!selectableArtworks.length && <li className="text-sm text-ink/50">暂无可挑选的已通过审核作品。</li>}
              </ul>
            </div>
          </div>
        ) : (
          <EmptyState title="请选择或创建一个展览" description="策划中/被退回的展览可以调整作品阵容。" />
        )}
      </div>
    </section>
  );
}
