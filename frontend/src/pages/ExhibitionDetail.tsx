import { Link, useParams } from 'react-router-dom';

import { ArtworkCard } from '../components/common/ArtworkCard';
import { EmptyState } from '../components/common/EmptyState';
import { ExhibitionBanner } from '../components/common/ExhibitionBanner';
import { UserAvatar } from '../components/common/UserAvatar';
import { WithdrawalNotice } from '../components/common/WithdrawalNotice';
import { useArtistStore } from '../stores/artistStore';
import { useArtworkStore } from '../stores/artworkStore';
import { useExhibitionStore } from '../stores/exhibitionStore';
import { useWithdrawalStore } from '../stores/withdrawalStore';
import { useEffect } from 'react';

export function ExhibitionDetail() {
  const { id = '' } = useParams();
  const { exhibitions, loadExhibitions } = useExhibitionStore();
  const { artworks, loadArtworks } = useArtworkStore();
  const { artists, loadArtists } = useArtistStore();
  const { logs: withdrawals, loadWithdrawals } = useWithdrawalStore();

  useEffect(() => {
    void Promise.all([loadExhibitions(), loadArtworks(), loadArtists()]);
  }, [loadExhibitions, loadArtworks, loadArtists]);

  useEffect(() => {
    if (id) void loadWithdrawals({ exhibitionId: id });
  }, [id, loadWithdrawals]);

  const exhibition = exhibitions.find((item) => item.id === id);
  const curator = exhibition ? artists.find((artist) => artist.userId === exhibition.curatorId) : undefined;
  // 以展览当前阵容为准：被自动撤出的作品不再出现在网格中。
  const exhibitionArtworks = exhibition ? artworks.filter((artwork) => exhibition.artworkIds.includes(artwork.id)) : [];
  const artworkTitle = (artworkId: string) => artworks.find((artwork) => artwork.id === artworkId)?.title ?? artworkId;

  if (!exhibition) return <main className="page-shell p-10">展览不存在或尚未公开</main>;

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Link to="/gallery" className="text-sm text-ink/60 hover:text-clay">返回画廊</Link>
        <div className="mt-6"><ExhibitionBanner exhibition={exhibition} large /></div>
        {exhibition.reviewComment && (
          <p className="mt-4 rounded border border-ink/15 bg-rice px-4 py-3 text-sm text-ink/70">最近审核意见：{exhibition.reviewComment}</p>
        )}
        <WithdrawalNotice logs={withdrawals} artworkTitle={artworkTitle} />
        <section className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside>
            <p className="text-sm uppercase tracking-[0.2em] text-ink/45">Curator</p>
            {curator && <div className="mt-4"><UserAvatar artist={curator} /></div>}
            {!curator && <p className="mt-4 text-sm text-ink/55">{exhibition.curatorId}</p>}
            <p className="mt-6 text-sm leading-7 text-ink/65">{exhibition.visitors.toLocaleString()} 位线上观众访问了本展。</p>
          </aside>
          <div>
            <h2 className="font-display text-4xl">展出作品（{exhibitionArtworks.length}）</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {exhibitionArtworks.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} artist={artists.find((artist) => artist.id === artwork.artistId)} />
              ))}
            </div>
            {!exhibitionArtworks.length && <EmptyState title="当前没有展出作品" description="作品可能因退回、下架或审核被推翻而被自动撤出。" />}
          </div>
        </section>
      </div>
    </main>
  );
}
