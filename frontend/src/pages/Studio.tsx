import { Tab } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ArtworkCard } from '../components/common/ArtworkCard';
import { EmptyState } from '../components/common/EmptyState';
import { RoleSwitcher } from '../components/common/RoleSwitcher';
import { StatCard } from '../components/common/StatCard';
import { TrendChart } from '../components/common/TrendChart';
import { useArtistStore } from '../stores/artistStore';
import { useArtworkStore } from '../stores/artworkStore';
import { useExhibitionStore } from '../stores/exhibitionStore';
import { useSessionStore } from '../stores/sessionStore';
import { ArtworkStatus, ExhibitionStatus, Medium } from '../types/enums';

const artistTabs = [
  ArtworkStatus.Draft,
  ArtworkStatus.PendingReview,
  ArtworkStatus.Approved,
  ArtworkStatus.Rejected,
  ArtworkStatus.Published,
  ArtworkStatus.Archived,
];

export function Studio() {
  const role = useSessionStore((state) => state.user.role);
  const [draftTitle, setDraftTitle] = useState('');
  const [notice, setNotice] = useState('');
  const { artworks, loadArtworks, create, submit } = useArtworkStore();
  const { artists, loadArtists } = useArtistStore();
  const { exhibitions, loadExhibitions } = useExhibitionStore();

  useEffect(() => {
    void Promise.all([loadArtworks(true), loadArtists(), loadExhibitions(true)]);
  }, [loadArtworks, loadArtists, loadExhibitions]);

  const totals = useMemo(() => ({
    views: artworks.reduce((sum, item) => sum + item.views, 0),
    likes: artworks.reduce((sum, item) => sum + item.likes, 0),
    bookmarks: artworks.reduce((sum, item) => sum + item.bookmarks, 0),
  }), [artworks]);

  const artist = artists[0];
  const myArtworks = role === 'Admin' || role === 'Curator' ? artworks : artworks;

  const pendingArtworks = artworks.filter((item) => item.status === ArtworkStatus.PendingReview);
  const pendingExhibitions = exhibitions.filter((item) => item.status === ExhibitionStatus.PendingReview);
  const myExhibitions = exhibitions;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftTitle.trim()) return;
    setNotice('');
    try {
      await create({
        title: draftTitle.trim(),
        description: '工作台快速创建的草稿，可在详情页补充完整信息。',
        year: new Date().getFullYear(),
        medium: Medium.Other,
        materials: '待补充',
        size: { length: 30, width: 30 },
        imageUrls: ['https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80'],
        tags: [],
      });
      setDraftTitle('');
      setNotice('草稿已创建，可在「草稿」页签提交审核。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '创建失败');
    }
  };

  const handleSubmit = async (id: string) => {
    setNotice('');
    try {
      await submit(id);
      setNotice('作品已提交，等待管理员审核。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '提交失败');
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-clay">Artist studio · {role}</p>
            <h1 className="mt-2 font-display text-6xl">创作工作台</h1>
          </div>
          <div className="flex items-center gap-3">
            {role === 'Admin' && <Link to="/review" className="bg-clay px-5 py-3 text-sm font-semibold text-rice hover:opacity-90">进入审核中心</Link>}
            <RoleSwitcher />
          </div>
        </div>

        {(pendingArtworks.length > 0 || pendingExhibitions.length > 0) && (
          <section className="mt-6 border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            当前有 {pendingArtworks.length} 件作品、{pendingExhibitions.length} 个展览处于待审核状态。
          </section>
        )}

        {notice && <p className="mt-4 text-sm text-ink/70">{notice}</p>}

        {role === 'Artist' && (
          <form className="mt-6 flex gap-2" onSubmit={handleCreate}>
            <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} className="border border-ink/20 bg-rice px-4 py-3 outline-none focus:border-clay" placeholder="新作品标题（创建为草稿）" />
            <button className="bg-ink px-5 py-3 text-sm font-semibold text-rice hover:bg-clay">上传草稿</button>
          </form>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard label="总浏览" value={totals.views.toLocaleString()} />
          <StatCard label="点赞" value={totals.likes.toLocaleString()} />
          <StatCard label="收藏" value={totals.bookmarks.toLocaleString()} />
        </section>
        <section className="mt-6">
          <TrendChart likes={totals.likes} bookmarks={totals.bookmarks} views={totals.views} />
        </section>

        {role !== 'Viewer' && (
          <section className="mt-10">
            <h2 className="font-display text-3xl">相关展览</h2>
            <div className="mt-4 space-y-2">
              {myExhibitions.map((exhibition) => (
                <Link key={exhibition.id} to={`/exhibition/${exhibition.id}`} className="flex items-center justify-between border border-ink/15 px-4 py-3 text-sm hover:border-clay">
                  <span className="font-semibold">{exhibition.title}</span>
                  <span className="text-ink/55">
                    {exhibition.activeArtworkIds.length} 件作品 · {exhibition.status}
                  </span>
                </Link>
              ))}
              {myExhibitions.length === 0 && <EmptyState title="暂无展览" description="策展人可在展览详情页策划并送审。" />}
            </div>
          </section>
        )}

        <Tab.Group>
          <Tab.List className="mt-10 flex flex-wrap gap-2 border-b border-ink/15">
            {artistTabs.map((tab) => (
              <Tab key={tab} className={({ selected }) => `px-5 py-3 text-sm outline-none ${selected ? 'bg-ink text-rice' : 'text-ink/65 hover:text-ink'}`}>{tab}</Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-6">
            {artistTabs.map((tab) => {
              const list = myArtworks.filter((artwork) => artwork.status === tab);
              return (
                <Tab.Panel key={tab}>
                  {list.length ? (
                    <div className="grid gap-5 md:grid-cols-3">
                      {list.map((artwork) => (
                        <div key={artwork.id}>
                          <ArtworkCard artwork={artwork} artist={artist} compact />
                          <div className="border-x border-b border-ink/15 p-3">
                            {artwork.reviewReason && (
                              <p className="mb-2 text-xs leading-5 text-clay">原因：{artwork.reviewReason}</p>
                            )}
                            {(artwork.status === ArtworkStatus.Draft || artwork.status === ArtworkStatus.Rejected) && role === 'Artist' && (
                              <button
                                onClick={() => void handleSubmit(artwork.id)}
                                className="w-full bg-moss px-3 py-2 text-xs font-semibold text-rice hover:opacity-90"
                              >
                                {artwork.status === ArtworkStatus.Rejected ? '修改后重新提交' : '提交审核'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title={`${tab} 列表为空`} description="状态变化后作品会自动进入对应队列。" />
                  )}
                </Tab.Panel>
              );
            })}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </main>
  );
}
