import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';

import { ArtworkCard } from '../components/common/ArtworkCard';
import { CuratorPanel } from '../components/common/CuratorPanel';
import { ExhibitionBanner } from '../components/common/ExhibitionBanner';
import { RemovedArtworkList } from '../components/common/RemovedArtworkList';
import { ReviewReasonBanner } from '../components/common/ReviewReasonBanner';
import { UserAvatar } from '../components/common/UserAvatar';
import { useArtistStore } from '../stores/artistStore';
import { useArtworkStore } from '../stores/artworkStore';
import { useExhibitionStore } from '../stores/exhibitionStore';
import { useSessionStore } from '../stores/sessionStore';
import { useEffect } from 'react';
import { ExhibitionStatus } from '../types/enums';

export function ExhibitionDetail() {
  const { id = '' } = useParams();
  const [busy, setBusy] = useState(false);
  const { exhibitions, loadExhibitions, addArtwork, removeArtwork, submit } = useExhibitionStore();
  const { artworks, loadArtworks } = useArtworkStore();
  const { artists, loadArtists } = useArtistStore();
  const role = useSessionStore((state) => state.user.role);

  useEffect(() => {
    void Promise.all([loadExhibitions(true), loadArtworks(true), loadArtists()]);
  }, [loadExhibitions, loadArtworks, loadArtists]);

  const exhibition = exhibitions.find((item) => item.id === id);
  const curator = exhibition ? artists.find((artist) => artist.id === exhibition.curatorId) : undefined;
  const exhibitionArtworks = exhibition
    ? artworks.filter((artwork) => exhibition.activeArtworkIds.includes(artwork.id))
    : [];
  const artworkTitle = (artworkId: string) => artworks.find((item) => item.id === artworkId)?.title ?? artworkId;

  // 访客只能看到已开展览
  if (!exhibition || (role === 'Viewer' && ![ExhibitionStatus.Active, ExhibitionStatus.Ended].includes(exhibition.status))) {
    return <main className="page-shell p-10">展览不存在或尚未公开</main>;
  }

  const isCurator = role === 'Admin' || role === 'Curator';

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Link to="/gallery" className="text-sm text-ink/60 hover:text-clay">返回画廊</Link>
        <div className="mt-6"><ExhibitionBanner exhibition={exhibition} large /></div>
        {exhibition.reviewReason && (
          <div className="mt-6">
            <ReviewReasonBanner kind="exhibition" status={exhibition.status} reason={exhibition.reviewReason} />
          </div>
        )}
        <section className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside>
            <p className="text-sm uppercase tracking-[0.2em] text-ink/45">Curator</p>
            {curator && <div className="mt-4"><UserAvatar artist={curator} /></div>}
            <p className="mt-6 text-sm leading-7 text-ink/65">{exhibition.visitors.toLocaleString()} 位线上观众访问了本展。</p>
          </aside>
          <div>
            <h2 className="font-display text-4xl">展出作品（{exhibitionArtworks.length}）</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {exhibitionArtworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} artist={artists.find((artist) => artist.id === artwork.artistId)} />
              ))}
            </div>

            {isCurator && (
              <CuratorPanel
                exhibition={exhibition}
                artworks={artworks}
                busy={busy}
                onAdd={async (artworkId) => {
                  setBusy(true);
                  try {
                    await addArtwork(id, artworkId);
                    await loadArtworks(true);
                  } finally {
                    setBusy(false);
                  }
                }}
                onRemove={async (artworkId) => {
                  setBusy(true);
                  try {
                    await removeArtwork(id, artworkId, '策展人筹备阶段移除。');
                    await loadArtworks(true);
                  } finally {
                    setBusy(false);
                  }
                }}
                onSubmit={async () => {
                  setBusy(true);
                  try {
                    await submit(id);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}

            <RemovedArtworkList removed={exhibition.removedArtworks ?? []} artworkTitle={artworkTitle} />
          </div>
        </section>
      </div>
    </main>
  );
}
