import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { ArtworkCard } from '../components/common/ArtworkCard';
import { EmptyState } from '../components/common/EmptyState';
import { ExhibitionBanner } from '../components/common/ExhibitionBanner';
import { RoleSwitcher } from '../components/common/RoleSwitcher';
import { usePagination } from '../hooks/usePagination';
import { useArtistStore } from '../stores/artistStore';
import { useArtworkStore } from '../stores/artworkStore';
import { useAuthStore } from '../stores/authStore';
import { useExhibitionStore } from '../stores/exhibitionStore';
import { ArtworkReviewStatus, ArtworkStatus, ExhibitionStatus } from '../types/enums';

export function Gallery() {
  const { artworks, loadArtworks } = useArtworkStore();
  const { artists, loadArtists } = useArtistStore();
  const { exhibitions, loadExhibitions } = useExhibitionStore();
  const role = useAuthStore((state) => state.user.role);
  const { visibleItems, hasMore, loadMore } = usePagination(artworks, 6);

  useEffect(() => {
    void Promise.all([loadArtworks(), loadArtists(), loadExhibitions()]);
  }, [loadArtworks, loadArtists, loadExhibitions, role]);

  const isViewer = role === 'Viewer';
  const publicArtworks = isViewer
    ? artworks.filter((artwork) => artwork.status === ArtworkStatus.Published && artwork.reviewStatus === ArtworkReviewStatus.Approved)
    : artworks;
  const publicExhibitions = isViewer ? exhibitions.filter((exhibition) => exhibition.status === ExhibitionStatus.Active) : exhibitions;
  const featured = publicExhibitions[0];
  const findArtist = (id: string) => artists.find((artist) => artist.id === id);

  return (
    <main className="page-shell">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/gallery" className="font-display text-2xl">Atelier Index</Link>
        <nav className="flex items-center gap-5 text-sm text-ink/70">
          <Link to="/gallery">画廊</Link>
          <Link to="/studio">工作台</Link>
          <RoleSwitcher compact />
        </nav>
      </header>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="pt-8">
            <p className="text-sm uppercase tracking-[0.25em] text-clay">Independent gallery system</p>
            <h1 className="mt-4 font-display text-6xl leading-[0.95] text-ink md:text-7xl">作品、展览与观众互动在同一个现场。</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink/70">作品提交后进入待审，管理员批准、策展人送展、展览通过审核后才公开；退回、下架或审核被推翻的作品会自动从进行中展览撤出。</p>
          </div>
          {featured ? <ExhibitionBanner exhibition={featured} large /> : <EmptyState title="暂无公开展览" description="管理员批准后的展览才会公开出现在这里。" />}
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_280px]">
          <section>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-4xl">最新作品</h2>
              <span className="text-sm text-ink/55">{publicArtworks.length} 件作品</span>
            </div>
            {visibleItems.length ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} artist={findArtist(artwork.artistId)} />)}
              </div>
            ) : (
              <EmptyState title="暂无可公开展示的作品" description="作品通过审核并随已批准展览展出后，会出现在这里。" />
            )}
            {hasMore && <button onClick={loadMore} className="mt-8 border border-ink px-5 py-3 text-sm hover:bg-ink hover:text-rice">加载更多</button>}
          </section>
          <aside className="border-l border-ink/15 pl-6">
            <h2 className="font-display text-3xl">热门排行</h2>
            <div className="mt-5 space-y-4">
              {[...publicArtworks].sort((a, b) => b.likes - a.likes).map((artwork, index) => (
                <Link key={artwork.id} to={`/artwork/${artwork.id}`} className="grid grid-cols-[32px_1fr] gap-3 border-b border-ink/10 pb-4">
                  <span className="font-display text-3xl text-clay">{index + 1}</span>
                  <span>
                    <span className="block font-semibold">{artwork.title}</span>
                    <span className="text-sm text-ink/55">{artwork.views.toLocaleString()} views</span>
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
