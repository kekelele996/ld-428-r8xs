import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { RoleSwitcher } from '../components/common/RoleSwitcher';
import { StatusBadge } from '../components/common/StatusBadge';
import { decideArtwork, decideExhibition, overturnArtwork, overturnExhibition } from '../api/review';
import { useArtworkStore } from '../stores/artworkStore';
import { useExhibitionStore } from '../stores/exhibitionStore';
import { useArtistStore } from '../stores/artistStore';
import { ArtworkStatus, ExhibitionStatus, ReviewResult } from '../types/enums';

type Decision = ReviewResult.Approved | ReviewResult.Rejected;

export function ReviewCenter() {
  const { artworks, loadArtworks, upsertArtwork } = useArtworkStore();
  const { exhibitions, loadExhibitions, upsertExhibition } = useExhibitionStore();
  const { artists, loadArtists } = useArtistStore();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    void Promise.all([loadArtworks(true), loadExhibitions(true), loadArtists()]);
  }, [loadArtworks, loadExhibitions, loadArtists]);

  const pendingArtworks = useMemo(
    () => artworks.filter((item) => item.status === ArtworkStatus.PendingReview),
    [artworks],
  );
  const pendingExhibitions = useMemo(
    () => exhibitions.filter((item) => item.status === ExhibitionStatus.PendingReview),
    [exhibitions],
  );
  const reviewableArtworks = useMemo(
    () => artworks.filter((item) =>
      [ArtworkStatus.Approved, ArtworkStatus.Rejected, ArtworkStatus.Published, ArtworkStatus.Sold, ArtworkStatus.Archived].includes(item.status)),
    [artworks],
  );
  const reviewableExhibitions = useMemo(
    () => exhibitions.filter((item) =>
      [ExhibitionStatus.Active, ExhibitionStatus.Rejected].includes(item.status)),
    [exhibitions],
  );

  const setDraft = (key: string, value: string) => setDrafts((prev) => ({ ...prev, [key]: value }));

  const handleArtworkDecision = async (id: string, result: Decision) => {
    setMessage('');
    try {
      const updated = await decideArtwork(id, result, drafts[`art-${id}`] ?? (result === ReviewResult.Rejected ? '未通过审核' : '审核通过'));
      upsertArtwork(updated);
      // 决定可能触发撤出，刷新展览状态保持一致
      await loadExhibitions(true);
      setMessage(`作品已${result === ReviewResult.Approved ? '通过' : '退回'}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleExhibitionDecision = async (id: string, result: Decision) => {
    setMessage('');
    try {
      const updated = await decideExhibition(id, result, drafts[`exh-${id}`] ?? (result === ReviewResult.Rejected ? '未通过审批' : '批准开展'));
      upsertExhibition(updated);
      await loadArtworks(true);
      setMessage(`展览已${result === ReviewResult.Approved ? '批准开展，展内作品已公开' : '退回，作品占用已释放'}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleArtworkOverturn = async (id: string, result: Decision) => {
    setMessage('');
    const reason = drafts[`overturn-art-${id}`];
    if (!reason) {
      setMessage('推翻审核必须填写原因。');
      return;
    }
    try {
      const updated = await overturnArtwork(id, result, reason);
      upsertArtwork(updated);
      await loadExhibitions(true);
      setMessage('审核结果已推翻，相关展览已同步处理。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleExhibitionOverturn = async (id: string, result: Decision) => {
    setMessage('');
    const reason = drafts[`overturn-exh-${id}`];
    if (!reason) {
      setMessage('推翻结论必须填写原因。');
      return;
    }
    try {
      const updated = await overturnExhibition(id, result, reason);
      upsertExhibition(updated);
      await loadArtworks(true);
      setMessage('展览结论已推翻。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-clay">Admin review center</p>
            <h1 className="mt-2 font-display text-5xl">审核中心</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/studio" className="text-sm text-ink/60 hover:text-clay">返回工作台</Link>
            <RoleSwitcher />
          </div>
        </div>

        {message && <p className="mt-5 border border-ink/15 bg-rice px-4 py-3 text-sm text-ink" data-testid="review-message">{message}</p>}

        <section className="mt-8">
          <h2 className="font-display text-3xl">待审作品（{pendingArtworks.length}）</h2>
          {pendingArtworks.length === 0 ? (
            <p className="mt-3 text-sm text-ink/55">没有等待审核的作品。</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pendingArtworks.map((artwork) => (
                <li key={artwork.id} className="border border-ink/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link to={`/artwork/${artwork.id}`} className="font-semibold hover:text-clay">{artwork.title}</Link>
                      <span className="ml-3 text-sm text-ink/55">
                        {artists.find((artist) => artist.id === artwork.artistId)?.artistName ?? artwork.artistId}
                      </span>
                    </div>
                    <StatusBadge status={artwork.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-ink/65">{artwork.description}</p>
                  <textarea
                    rows={2}
                    placeholder="审核意见（退回时必填）"
                    className="mt-3 w-full border border-ink/20 px-3 py-2 text-sm outline-none focus:border-clay"
                    onChange={(event) => setDraft(`art-${artwork.id}`, event.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => void handleArtworkDecision(artwork.id, ReviewResult.Approved)} className="bg-moss px-4 py-2 text-xs font-semibold text-rice hover:opacity-90">通过</button>
                    <button onClick={() => void handleArtworkDecision(artwork.id, ReviewResult.Rejected)} className="bg-clay px-4 py-2 text-xs font-semibold text-rice hover:opacity-90">退回</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-3xl">待批展览（{pendingExhibitions.length}）</h2>
          {pendingExhibitions.length === 0 ? (
            <p className="mt-3 text-sm text-ink/55">没有等待批准的展览。</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pendingExhibitions.map((exhibition) => (
                <li key={exhibition.id} className="border border-ink/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link to={`/exhibition/${exhibition.id}`} className="font-semibold hover:text-clay">{exhibition.title}</Link>
                    <StatusBadge status={exhibition.status} />
                  </div>
                  <p className="mt-2 text-sm text-ink/65">{exhibition.activeArtworkIds.length} 件已通过审核的作品 · {exhibition.startDate} ~ {exhibition.endDate}</p>
                  <textarea
                    rows={2}
                    placeholder="审批意见（退回时必填）"
                    className="mt-3 w-full border border-ink/20 px-3 py-2 text-sm outline-none focus:border-clay"
                    onChange={(event) => setDraft(`exh-${exhibition.id}`, event.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => void handleExhibitionDecision(exhibition.id, ReviewResult.Approved)} className="bg-lapis px-4 py-2 text-xs font-semibold text-rice hover:opacity-90">批准开展</button>
                    <button onClick={() => void handleExhibitionDecision(exhibition.id, ReviewResult.Rejected)} className="bg-clay px-4 py-2 text-xs font-semibold text-rice hover:opacity-90">退回</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-display text-3xl">审核结论推翻</h2>
          <p className="mt-2 text-sm text-ink/60">推翻会同步撤出/释放进行中展览，并必须填写原因留痕。</p>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-ink/70">作品</h3>
              <ul className="mt-2 space-y-3">
                {reviewableArtworks.map((artwork) => (
                  <li key={artwork.id} className="border border-ink/15 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{artwork.title}</span>
                      <StatusBadge status={artwork.status} />
                    </div>
                    <input
                      placeholder="推翻原因（必填）"
                      className="mt-2 w-full border border-ink/20 px-2 py-1.5 text-xs outline-none focus:border-clay"
                      onChange={(event) => setDraft(`overturn-art-${artwork.id}`, event.target.value)}
                    />
                    <div className="mt-2 flex gap-2">
                      {artwork.status !== ArtworkStatus.Approved && artwork.status !== ArtworkStatus.Published && artwork.status !== ArtworkStatus.Sold && (
                        <button onClick={() => void handleArtworkOverturn(artwork.id, ReviewResult.Approved)} className="border border-moss px-3 py-1 text-xs font-semibold text-moss hover:bg-moss hover:text-rice">恢复为通过</button>
                      )}
                      {(artwork.status === ArtworkStatus.Approved || artwork.status === ArtworkStatus.Published || artwork.status === ArtworkStatus.Sold) && (
                        <button onClick={() => void handleArtworkOverturn(artwork.id, ReviewResult.Rejected)} className="border border-clay px-3 py-1 text-xs font-semibold text-clay hover:bg-clay hover:text-rice">推翻为退回并撤出</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-ink/70">展览</h3>
              <ul className="mt-2 space-y-3">
                {reviewableExhibitions.map((exhibition) => (
                  <li key={exhibition.id} className="border border-ink/15 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/exhibition/${exhibition.id}`} className="font-semibold hover:text-clay">{exhibition.title}</Link>
                      <StatusBadge status={exhibition.status} />
                    </div>
                    <input
                      placeholder="推翻原因（必填）"
                      className="mt-2 w-full border border-ink/20 px-2 py-1.5 text-xs outline-none focus:border-clay"
                      onChange={(event) => setDraft(`overturn-exh-${exhibition.id}`, event.target.value)}
                    />
                    <div className="mt-2 flex gap-2">
                      {exhibition.status === ExhibitionStatus.Rejected && (
                        <button onClick={() => void handleExhibitionOverturn(exhibition.id, ReviewResult.Approved)} className="border border-lapis px-3 py-1 text-xs font-semibold text-lapis hover:bg-lapis hover:text-rice">恢复批准并开展</button>
                      )}
                      {exhibition.status === ExhibitionStatus.Active && (
                        <button onClick={() => void handleExhibitionOverturn(exhibition.id, ReviewResult.Rejected)} className="border border-clay px-3 py-1 text-xs font-semibold text-clay hover:bg-clay hover:text-rice">推翻批准并闭展</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
