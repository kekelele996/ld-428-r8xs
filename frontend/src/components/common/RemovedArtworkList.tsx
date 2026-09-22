import { LogOut } from 'lucide-react';

import type { RemovedExhibitionArtwork } from '../../types/exhibition';

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return value;
  }
}

/**
 * 自动撤出记录：作品被退回、下架或审核结果被推翻后，
 * 在这里保留撤出原因与时间，保证可追溯。
 */
export function RemovedArtworkList({
  removed,
  artworkTitle,
}: {
  removed: RemovedExhibitionArtwork[];
  artworkTitle: (id: string) => string;
}) {
  if (!removed.length) return null;

  return (
    <section className="mt-10 border-t border-ink/15 pt-8">
      <h3 className="flex items-center gap-2 font-display text-2xl text-ink/80">
        <LogOut size={20} className="text-clay" /> 撤出记录
      </h3>
      <ul className="mt-4 space-y-3">
        {removed.map((item) => (
          <li key={`${item.artworkId}-${item.removedAt}`} className="border border-ink/15 bg-rice px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">{artworkTitle(item.artworkId)}</span>
              <span className="text-xs text-ink/50">{formatTime(item.removedAt)}</span>
            </div>
            <p className="mt-1 leading-6 text-clay">{item.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
