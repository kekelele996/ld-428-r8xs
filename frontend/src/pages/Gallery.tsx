import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { ArtworkCard } from '../components/common/ArtworkCard';
import { EmptyState } from '../components/common/EmptyState';
import { ExhibitionBanner } from '../components/common/ExhibitionBanner';
import { RoleSwitcher } from '../components/common/RoleSwitcher';
import { usePagination } from '../hooks/usePagination';
import { useSessionStore } from '../stores/sessionStore';
import { useArtistStore } from '../stores/artistStore';
import { useArtworkStore } from '../stores/artworkStore';
import { useExhibitionStore } from '../stores/exhibitionStore';
import { ArtworkStatus, ExhibitionStatus } from '../types/enums';

const PUBLIC_ARTWORK = [ArtworkStatus.Published, ArtworkStatus.Sold];
const PUBLIC_EXHIBITION = [ExhibitionStatus.Active, ExhibitionStatus.Ended];

export function Gallery() {
  const { artworks, loadArtworks } = useArtworkStore();
  const { artists, loadArtists } = useArtistStore();
  const { exhibitions, loadExhibitions } = useExhibitionStore();
  const role = useSessionStore((state) => state.user.role);

  useEffect(() => {
    void Promise.all([loadArtworks(true), loadArtists(), loadExhibitions(true)]);
  }, [loadArtworks, loadArtists, loadExhibitions]);

  // 画廊是公开页：只呈现已发布作品与已开展览，审核中的内容不会出现在这里
  const publicArtworks = artworks.filter((artwork) => PUBLIC_ARTWORK.includes(artwork.status));
  const publicExhibitions = exhibitions.filter((exhibition) => PUBLIC_EXHIBITION.includes(exhibition.status));
  const { visibleItems, hasMore, loadMore } = usePagination(publicArtworks, 6);

  const featured = publicExhibitions[0];
  const findArtist = (id: string) => artists.find((artist) => artist.id === id);

  return (
    <main className="page-shell">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6">
        <Link to="/gallery" className="font-display text-2xl">Atelier Index</Link>
        <nav className="flex items-center gap-5 text-sm text-ink/70">
          <Link to="/gallery">画廊</Link>
          <Link to="/studio">工作台</Link>
          {role === 'Admin' && <Link to="/review" className="font-semibold text-clay">审核中心</Link>}
          <RoleSwitcher />
        </nav>
      </header>
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="pt-8">
            <p className="text-sm uppercase tracking-[0.25em] text-clay">Independent gallery system</p>
            <h1 className="mt-4 font-display text-6xl leading-[0.95] text-ink md:text-7xl">作品、展览与观众互动在同一个现场。</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink/70">艺术家提交后进入审核，策展人只能挑选已通过作品，展览获批后作品才公开展出。</p>
          </div>
          {featured ? <ExhibitionBanner exhibition={featured} large /> : <EmptyState title="暂无公开展览" description="展览经管理员批准后会出现在这里。" />}
        </div>
        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_280px]">
          <section>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-4xl">最新作品</h2>
              <span className="text-sm text-ink/55">{publicArtworks.length} 件公开发布</span>
            </div>
            {visibleItems.length ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {visibleItems.map((artwork) => <ArtworkCard key={artwork.id} artwork={artwork} artist={findArtist(artwork.artistId)} />)}
              </div>
            ) : (
              <EmptyState title="暂无可展示作品" description="作品随批准的展览公开后会出现在这里。" />
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
