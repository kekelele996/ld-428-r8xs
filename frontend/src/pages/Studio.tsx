import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { RoleSwitcher } from '../components/common/RoleSwitcher';
import { StatCard } from '../components/common/StatCard';
import { TrendChart } from '../components/common/TrendChart';
import { AdminStudioPanel } from '../components/studio/AdminStudioPanel';
import { ArtistStudioPanel } from '../components/studio/ArtistStudioPanel';
import { CuratorStudioPanel } from '../components/studio/CuratorStudioPanel';
import { useArtworkStore } from '../stores/artworkStore';
import { useAuthStore } from '../stores/authStore';

export function Studio() {
  const role = useAuthStore((state) => state.user.role);
  const { artworks, loadArtworks } = useArtworkStore();

  useEffect(() => {
    void loadArtworks();
  }, [loadArtworks]);

  const totals = useMemo(
    () => ({
      views: artworks.reduce((sum, item) => sum + item.views, 0),
      likes: artworks.reduce((sum, item) => sum + item.likes, 0),
      bookmarks: artworks.reduce((sum, item) => sum + item.bookmarks, 0),
    }),
    [artworks],
  );

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-clay">Gallery backstage</p>
            <h1 className="mt-2 font-display text-6xl">工作台</h1>
          </div>
          <div className="flex items-center gap-5">
            <RoleSwitcher />
            <Link to="/gallery" className="text-sm text-ink/60 hover:text-clay">
              返回画廊
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard label="总浏览" value={totals.views.toLocaleString()} />
          <StatCard label="点赞" value={totals.likes.toLocaleString()} />
          <StatCard label="收藏" value={totals.bookmarks.toLocaleString()} />
        </section>
        <section className="mt-6">
          <TrendChart likes={totals.likes} bookmarks={totals.bookmarks} views={totals.views} />
        </section>

        {role === 'Artist' && <ArtistStudioPanel />}
        {role === 'Curator' && <CuratorStudioPanel />}
        {role === 'Admin' && <AdminStudioPanel />}
        {role === 'Viewer' && (
          <p className="mt-10 text-ink/60">观众角色仅有浏览与互动权限，请切换为艺术家 / 策展人 / 管理员使用工作台。</p>
        )}
      </div>
    </main>
  );
}
