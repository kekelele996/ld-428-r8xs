import { ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ArtworkCard } from '../components/common/ArtworkCard';
import { CommentSection } from '../components/common/CommentSection';
import { InteractionBar } from '../components/common/InteractionBar';
import { ReviewStatusBadge } from '../components/common/StatusBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { useArtistStore } from '../stores/artistStore';
import { useArtworkStore } from '../stores/artworkStore';
import { useAuthStore } from '../stores/authStore';
import { ArtworkReviewStatus, ArtworkStatus } from '../types/enums';
import { formatArtworkSize } from '../utils/formatArtworkSize';

export function ArtworkDetail() {
  const { id = '' } = useParams();
  const [zoomed, setZoomed] = useState(false);
  const { artworks, loadArtworks } = useArtworkStore();
  const { artists, loadArtists } = useArtistStore();
  const role = useAuthStore((state) => state.user.role);

  useEffect(() => {
    void Promise.all([loadArtworks(), loadArtists()]);
  }, [loadArtworks, loadArtists]);

  const artwork = artworks.find((item) => item.id === id);
  const artist = artwork ? artists.find((item) => item.id === artwork.artistId) : undefined;
  const related = artwork
    ? artworks.filter(
        (item) =>
          item.artistId === artwork.artistId &&
          item.id !== artwork.id &&
          (staff || (item.status === ArtworkStatus.Published && item.reviewStatus === ArtworkReviewStatus.Approved)),
      )
    : [];
  const staff = role === 'Admin' || role === 'Curator' || role === 'Artist';

  if (!artwork) {
    return <main className="page-shell p-10">作品不存在</main>;
  }

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Link to="/gallery" className="text-sm text-ink/60 hover:text-clay">返回画廊</Link>
        <section className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <button onClick={() => setZoomed((value) => !value)} className="relative overflow-hidden bg-ink">
            <img className={`w-full object-cover transition duration-300 ${zoomed ? 'h-[760px] scale-125' : 'h-[620px]'}`} src={artwork.imageUrls[0]} alt={artwork.title} />
            <span className="absolute right-4 top-4 inline-flex items-center gap-2 bg-rice px-3 py-2 text-sm text-ink"><ZoomIn size={16} />缩放</span>
          </button>
          <aside className="space-y-7">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-clay">{artwork.medium}</p>
              <h1 className="mt-3 font-display text-6xl leading-none">{artwork.title}</h1>
              {staff && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ReviewStatusBadge status={artwork.reviewStatus} />
                  {artwork.activeExhibitionId && (
                    <Link to={`/exhibition/${artwork.activeExhibitionId}`} className="text-xs text-lapis hover:underline">
                      正在 {artwork.activeExhibitionId} 展出
                    </Link>
                  )}
                </div>
              )}
              {staff && artwork.reviewStatus === ArtworkReviewStatus.Rejected && artwork.reviewComment && (
                <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  退回原因：{artwork.reviewComment}
                </p>
              )}
              <p className="mt-5 text-lg leading-8 text-ink/70">{artwork.description}</p>
            </div>
            {artist && <UserAvatar artist={artist} />}
            <dl className="grid grid-cols-2 gap-4 border-y border-ink/15 py-5 text-sm">
              <div><dt className="text-ink/50">年份</dt><dd className="mt-1 font-semibold">{artwork.year}</dd></div>
              <div><dt className="text-ink/50">尺寸</dt><dd className="mt-1 font-semibold">{formatArtworkSize(artwork.size)}</dd></div>
              <div><dt className="text-ink/50">材质</dt><dd className="mt-1 font-semibold">{artwork.materials}</dd></div>
              <div><dt className="text-ink/50">价格</dt><dd className="mt-1 font-semibold">{artwork.price ? `¥${artwork.price.toLocaleString()}` : '未定价'}</dd></div>
            </dl>
            <InteractionBar artwork={artwork} />
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
