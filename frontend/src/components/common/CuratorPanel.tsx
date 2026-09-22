import { useState } from 'react';

import type { Artwork } from '../../types/artwork';
import type { Exhibition } from '../../types/exhibition';
import { ArtworkStatus, ExhibitionStatus } from '../../types/enums';

/**
 * 策展工作台（展览详情内嵌）：
 * - 只能从「已通过审核」且未被其他进行中展览占用的作品中挑选
 * - 筹备中/被退回状态可调整并送审
 */
export function CuratorPanel({
  exhibition,
  artworks,
  onAdd,
  onRemove,
  onSubmit,
  busy,
}: {
  exhibition: Exhibition;
  artworks: Artwork[];
  onAdd: (artworkId: string) => Promise<void>;
  onRemove: (artworkId: string) => Promise<void>;
  onSubmit: () => Promise<void>;
  busy: boolean;
}) {
  const [message, setMessage] = useState('');

  const selectable = artworks.filter(
    (artwork) =>
      [ArtworkStatus.Approved, ArtworkStatus.Published, ArtworkStatus.Sold].includes(artwork.status) &&
      !exhibition.activeArtworkIds.includes(artwork.id) &&
      // 已被其他进行中展览占用的作品不可选
      !artwork.exhibitionIds.some((exId) => exId !== exhibition.id),
  );

  const canEdit = exhibition.status === ExhibitionStatus.Planning || exhibition.status === ExhibitionStatus.Rejected;

  const run = async (action: () => Promise<void>, ok: string) => {
    setMessage('');
    try {
      await action();
      setMessage(ok);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  };

  return (
    <section className="mt-10 border border-ink/20 bg-rice p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl">策展操作</h3>
        {canEdit && (
          <button
            disabled={busy || exhibition.activeArtworkIds.length === 0}
            onClick={() => void run(onSubmit, '展览已送审，等待管理员批准。')}
            className="bg-lapis px-5 py-2.5 text-sm font-semibold text-rice hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            送审展览
          </button>
        )}
      </div>

      {exhibition.status === ExhibitionStatus.PendingReview && (
        <p className="mt-3 text-sm text-amber-800">展览正在等待管理员审批，期间不能调整作品。</p>
      )}

      {canEdit && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink/70">从已通过审核的作品中挑选：</p>
          {selectable.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50">暂无可添加的作品（已在其他进行中展览或尚未通过审核）。</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectable.map((artwork) => (
                <li key={artwork.id} className="flex items-center justify-between gap-3 border border-ink/10 px-3 py-2 text-sm">
                  <span>{artwork.title}</span>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => onAdd(artwork.id), `已添加：${artwork.title}`)}
                    className="border border-moss px-3 py-1 text-xs font-semibold text-moss hover:bg-moss hover:text-rice disabled:opacity-40"
                  >
                    加入展览
                  </button>
                </li>
              ))}
            </ul>
          )}

          {exhibition.activeArtworkIds.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-ink/70">当前已选：</p>
              <ul className="mt-2 space-y-2">
                {exhibition.activeArtworkIds.map((artworkId) => {
                  const artwork = artworks.find((item) => item.id === artworkId);
                  return (
                    <li key={artworkId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>{artwork?.title ?? artworkId}</span>
                      <button
                        disabled={busy}
                        onClick={() => void run(() => onRemove(artworkId), '已移除。')}
                        className="text-xs font-semibold text-clay hover:underline disabled:opacity-40"
                      >
                        移除
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-4 text-sm text-ink/70" data-testid="curator-message">{message}</p>}
    </section>
  );
}
