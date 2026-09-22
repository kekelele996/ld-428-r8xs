import { ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ArtworkCard } from '../components/common/ArtworkCard';
import { CommentSection } from '../components/common/CommentSection';
import { InteractionBar } from '../components/common/InteractionBar';
import { ReviewReasonBanner } from '../components/common/ReviewReasonBanner';
import { UserAvatar } from '../components/common/UserAvatar';
import { useArtistStore } from '../stores/artistStore';
import { useArtworkStore } from '../stores/artworkStore';
import { useSessionStore } from '../stores/sessionStore';
import { ArtworkStatus } from '../types/enums';
import { formatArtworkSize } from '../utils/formatArtworkSize';

export function ArtworkDetail() {
  const { id = '' } = useParams();
  const [zoomed, setZoomed] = useState(false);
  const [takedownOpen, setTakedownOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const { artworks, loadArtworks, takeDown } = useArtworkStore();
  const { artists, loadArtists } = useArtistStore();
  const role = useSessionStore((state) => state.user.role);

  useEffect(() => {
    void Promise.all([loadArtworks(true), loadArtists()]);
  }, [loadArtworks, loadArtists]);

  const artwork = artworks.find((item) => item.id === id);
  const artist = artwork ? artists.find((item) => item.id === artwork.artistId) : undefined;
  const related = artwork ? artworks.filter((item) => item.artistId === artwork.artistId && item.id !== artwork.id) : [];

  if (!artwork) {
    return <main className="page-shell p-10">作品不存在或尚未公开</main>;
  }

  const isPublic = artwork.status === ArtworkStatus.Published || artwork.status === ArtworkStatus.Sold;
  if (role === 'Viewer' && !isPublic) {
    return <main className="page-shell p-10">作品不存在或尚未公开</main>;
  }

  const canTakeDown =
    (role === 'Admin' || role === 'Curator') && artwork.status !== ArtworkStatus.Archived;

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Link to="/gallery" className="text-sm text-ink/60 hover:text-clay">返回画廊</Link>
        {artwork.reviewReason && (
          <div className="mt-4">
            <ReviewReasonBanner kind="artwork" status={artwork.status} reason={artwork.reviewReason} />
          </div>
        )}
        <section className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <button onClick={() => setZoomed((value) => !value)} className="relative overflow-hidden bg-ink">
            <img className={`w-full object-cover transition duration-300 ${zoomed ? 'h-[760px] scale-125' : 'h-[620px]'}`} src={artwork.imageUrls[0]} alt={artwork.title} />
            <span className="absolute right-4 top-4 inline-flex items-center gap-2 bg-rice px-3 py-2 text-sm text-ink"><ZoomIn size={16} />缩放</span>
          </button>
          <aside className="space-y-7">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-clay">{artwork.medium}</p>
              <h1 className="mt-3 font-display text-6xl leading-none">{artwork.title}</h1>
              <p className="mt-5 text-lg leading-8 text-ink/70">{artwork.description}</p>
            </div>
            {artist && <UserAvatar artist={artist} />}
            <dl className="grid grid-cols-2 gap-4 border-y border-ink/15 py-5 text-sm">
              <div><dt className="text-ink/50">年份</dt><dd className="mt-1 font-semibold">{artwork.year}</dd></div>
              <div><dt className="text-ink/50">尺寸</dt><dd className="mt-1 font-semibold">{formatArtworkSize(artwork.size)}</dd></div>
              <div><dt className="text-ink/50">材质</dt><dd className="mt-1 font-semibold">{artwork.materials}</dd></div>
              <div><dt className="text-ink/50">价格</dt><dd className="mt-1 font-semibold">{artwork.price ? `¥${artwork.price.toLocaleString()}` : '未定价'}</dd></div>
            </dl>
            {isPublic && <InteractionBar artwork={artwork} />}
            {!isPublic && (
              <p className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                作品尚未公开展出，观众暂时无法互动。
              </p>
            )}
            {canTakeDown && (
              <div className="border border-clay/30 bg-clay/5 p-4">
                {!takedownOpen ? (
                  <button onClick={() => setTakedownOpen(true)} className="text-sm font-semibold text-clay hover:underline">
                    下架作品（将自动撤出所有进行中展览）
                  </button>
                ) : (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setError('');
                      try {
                        await takeDown(id, reason);
                        setTakedownOpen(false);
                        setReason('');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : '下架失败');
                      }
                    }}
                    className="space-y-3"
                  >
                    <label className="block text-sm font-semibold text-ink/70">下架原因（必填）</label>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      required
                      rows={3}
                      className="w-full border border-ink/20 bg-rice px-3 py-2 text-sm outline-none focus:border-clay"
                      placeholder="例如：版权争议 / 内容违规"
                    />
                    {error && <p className="text-sm text-clay">{error}</p>}
                    <div className="flex gap-2">
                      <button type="submit" className="bg-clay px-4 py-2 text-sm font-semibold text-rice hover:opacity-90">确认下架</button>
                      <button type="button" onClick={() => setTakedownOpen(false)} className="border border-ink/20 px-4 py-2 text-sm">取消</button>
                    </div>
                  </form>
                )}
              </div>
            )}
            <CommentSection artworkId={artwork.id} />
          </aside>
        </section>
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-3xl">同艺术家作品</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {related.map((item) => <ArtworkCard key={item.id} artwork={item} artist={artist} compact />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
