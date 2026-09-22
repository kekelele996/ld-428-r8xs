/* eslint-disable no-console */
/**
 * 端到端冒烟测试：内存 MongoDB + 真实 HTTP 接口。
 * 运行：npx ts-node --compiler-options '{"module":"commonjs"}' src/smoke.e2e.ts
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NestFactory } from '@nestjs/core';

process.env.JWT_SECRET = 'smoke-secret';
process.env.MONGOMS_VERSION = '7.0.14';
process.env.MONGOMS_OS = 'ubuntu';
process.env.MONGOMS_DISTRO = 'ubuntu-22.04';

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('art_gallery_smoke');

  // 延迟导入以确保 env 生效
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  await app.listen(3199, '127.0.0.1');

  const base = 'http://127.0.0.1:3199/api';
  const results: Array<[string, boolean, string?]> = [];

  function check(name: string, cond: boolean, detail = '') {
    results.push([name, cond, detail]);
    if (!cond) console.error(`✗ ${name} ${detail}`);
  }

  async function token(role: string, userId = `u-${role}`) {
    const res = await fetch(`${base}/auth/dev-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`dev-token failed: ${res.status} ${JSON.stringify(json)}`);
    return (json.data as { token: string }).token;
  }

  const adminToken = await token('Admin', 'admin-1');
  const curatorToken = await token('Curator', 'curator-1');
  const artistToken = await token('Artist', 'artist-1');
  const viewerToken = await token('Viewer', 'viewer-1');
  const otherArtistToken = await token('Artist', 'artist-2');

  const auth = (t: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${t}` });

  async function call(method: string, path: string, t: string, body?: unknown) {
    const res = await fetch(`${base}${path}`, { method, headers: auth(t), body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  // 1. 艺术家创建并提交作品
  const created = await call('POST', '/artworks', artistToken, {
    title: '烟测作品', description: 'd', year: 2026, medium: 'Ink',
    materials: '纸', size: { length: 10, width: 10 }, imageUrls: [], tags: [],
  });
  const artworkId = created.json.data.id;
  check('艺术家创建作品', created.status === 201);

  const submitted = await call('POST', `/artworks/${artworkId}/submit`, artistToken, {});
  check('提交后进入待审', submitted.json.data.status === 'PendingReview');

  // 2. 越权：Viewer 不能提交；别的艺术家不能提交
  const viewerSubmit = await call('POST', `/artworks/${artworkId}/submit`, viewerToken, {});
  check('Viewer 提交被拒 (403)', viewerSubmit.status === 403);
  const otherSubmit = await call('POST', `/artworks/${artworkId}/submit`, otherArtistToken, {});
  check('他人提交被拒 (403)', otherSubmit.status === 403);

  // 2b. 重复提交（已在待审）幂等，不产生重复结果
  const repeatSubmit = await call('POST', `/artworks/${artworkId}/submit`, artistToken, {});
  check('待审中重复提交幂等', repeatSubmit.status === 201 && repeatSubmit.json.data.status === 'PendingReview');
  const submitLogsBeforeReview = (await call('GET', `/reviews/logs?targetType=Artwork&targetId=${artworkId}`, adminToken)).json.data
    .filter((l: { action: string }) => l.action === 'ArtworkSubmitted');
  check('重复提交不产生重复日志', submitLogsBeforeReview.length === 1, String(submitLogsBeforeReview.length));

  // 3. 待审作品未公开
  const viewerView = await fetch(`${base}/artworks/${artworkId}`, { headers: { Authorization: `Bearer ${viewerToken}` } });
  check('Viewer 看不到待审作品 (404)', viewerView.status === 404);

  // 4. 策展人不能把未通过的作品加入展览
  const exh = await call('POST', '/exhibitions', curatorToken, {
    title: '烟测展', description: 'd', startDate: '2026-09-01', endDate: '2026-10-01',
    type: 'Group', coverUrl: 'x',
  });
  const exhibitionId = exh.json.data.id;
  const addUnapproved = await call('POST', `/exhibitions/${exhibitionId}/artworks`, curatorToken, { artworkId });
  check('未审核作品不能入选 (409)', addUnapproved.status === 409);

  // 5. 策展人不能审核作品（越权）
  const curatorDecide = await call('POST', `/reviews/artworks/${artworkId}/decision`, curatorToken, { result: 'Approved' });
  check('策展人审核作品被拒 (403)', curatorDecide.status === 403);

  // 6. 管理员退回，作品 Rejected
  const rejected = await call('POST', `/reviews/artworks/${artworkId}/decision`, adminToken, { result: 'Rejected', comment: '材料信息不全' });
  check('管理员退回', rejected.json.data.status === 'Rejected' && rejected.json.data.reviewReason === '材料信息不全');

  // 7. 重复审核（已不在待审队列）只生效一次
  const duplicateReview = await call('POST', `/reviews/artworks/${artworkId}/decision`, adminToken, { result: 'Approved' });
  check('重复审核被拒绝 (409)', duplicateReview.status === 409);

  // 8. 重新提交 -> 通过
  await call('POST', `/artworks/${artworkId}/submit`, artistToken, {});
  const approved = await call('POST', `/reviews/artworks/${artworkId}/decision`, adminToken, { result: 'Approved', comment: '通过' });
  check('复审通过', approved.json.data.status === 'Approved');

  // 9. 通过后可加入展览；第二件作品用于冲突测试
  await call('POST', `/exhibitions/${exhibitionId}/artworks`, curatorToken, { artworkId });
  const artwork2 = (await call('POST', '/artworks', artistToken, {
    title: '作品二', description: 'd', year: 2026, medium: 'Ink', materials: '墨', size: { length: 1, width: 1 }, imageUrls: [], tags: [],
  })).json.data.id;
  await call('POST', `/artworks/${artwork2}/submit`, artistToken, {});
  await call('POST', `/reviews/artworks/${artwork2}/decision`, adminToken, { result: 'Approved' });

  const exh2 = (await call('POST', '/exhibitions', curatorToken, {
    title: '烟测展2', description: 'd', startDate: '2026-09-01', endDate: '2026-10-01', type: 'Solo', coverUrl: 'x',
  })).json.data.id;
  await call('POST', `/exhibitions/${exh2}/artworks`, curatorToken, { artworkId: artwork2 });

  // 10. 同一作品不能进入两个进行中展览
  const conflict = await call('POST', `/exhibitions/${exh2}/artworks`, curatorToken, { artworkId });
  check('同作品重复在展被拒 (409)', conflict.status === 409, conflict.json.message);

  // 11. 空展览不能送审；策展人送审
  const emptyExh = (await call('POST', '/exhibitions', curatorToken, {
    title: '空展', description: 'd', startDate: '2026-09-01', endDate: '2026-10-01', type: 'Solo', coverUrl: 'x',
  })).json.data.id;
  const submitEmpty = await call('POST', `/exhibitions/${emptyExh}/submit`, curatorToken, {});
  check('空展览不能送审 (409)', submitEmpty.status === 409);

  const submitExh = await call('POST', `/exhibitions/${exhibitionId}/submit`, curatorToken, {});
  check('展览送审进入 PendingReview', submitExh.json.data.status === 'PendingReview');

  // 12. 管理员批准展览 -> 作品公开
  const approveExh = await call('POST', `/reviews/exhibitions/${exhibitionId}/decision`, adminToken, { result: 'Approved' });
  check('展览批准后 Active', approveExh.json.data.status === 'Active');
  const artworkAfter = (await call('GET', `/artworks/${artworkId}`, artistToken)).json.data;
  check('展内作品随展览公开 Published', artworkAfter.status === 'Published');
  const viewerSees = await fetch(`${base}/artworks/${artworkId}`, { headers: { Authorization: `Bearer ${viewerToken}` } });
  check('公开作品对 Viewer 可见', viewerSees.status === 200);

  // 13. 并发发布：两个待审展览含同一作品，不可能同时加入——用审批并发覆盖
  // exh2 含 artwork2；把 artwork2 从另一个角度占用：先让 exh2 进入待审，再构造冲突
  await call('POST', `/exhibitions/${exh2}/submit`, curatorToken, {});
  // 确保送审落库后再并发审批
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 并发重复审批同一展览：只有一次生效
  const raceResults = await Promise.all([
    call('POST', `/reviews/exhibitions/${exh2}/decision`, adminToken, { result: 'Approved' }),
    call('POST', `/reviews/exhibitions/${exh2}/decision`, adminToken, { result: 'Approved' }),
  ]);
  const okCount = raceResults.filter((r) => r.status === 201).length;
  const conflictCount = raceResults.filter((r) => r.status === 409).length;
  check('并发发布只生效一次', okCount === 1 && conflictCount === 1, JSON.stringify(raceResults.map((r) => r.status)));

  // 14. 下架作品 -> 自动撤出 Active 展览，留原因，作品不可见
  const takedown = await call('POST', `/artworks/${artworkId}/takedown`, adminToken, { comment: '版权争议' });
  check('下架成功 Archived', takedown.json.data.status === 'Archived');
  const exhAfterTakedown = (await call('GET', `/exhibitions/${exhibitionId}`, curatorToken)).json.data;
  check('撤出后展览不再含作品', !exhAfterTakedown.activeArtworkIds.includes(artworkId));
  const removedRecord = exhAfterTakedown.removedArtworks.find((r: { artworkId: string }) => r.artworkId === artworkId);
  check('撤出留下原因', Boolean(removedRecord) && removedRecord.reason.includes('版权争议'));
  const viewerAfterTakedown = await fetch(`${base}/artworks/${artworkId}`, { headers: { Authorization: `Bearer ${viewerToken}` } });
  check('下架后作品不公开 (404)', viewerAfterTakedown.status === 404);
  const artworkDoc = (await call('GET', `/artworks/${artworkId}`, artistToken)).json.data;
  check('作品侧展览引用同步移除', !artworkDoc.exhibitionIds.includes(exhibitionId));

  // 15. 推翻已通过作品 -> 自动撤出进行中（待审/筹备中）的展览并留原因
  await call('POST', `/artworks/${artwork2}/takedown`, adminToken, { comment: '先下架验证' });
  await call('POST', `/reviews/artworks/${artwork2}/overturn`, adminToken, { result: 'Approved', comment: '恢复通过' }); // -> Approved
  const planningExh = (await call('POST', '/exhibitions', curatorToken, {
    title: '筹备展', description: 'd', startDate: '2027-01-01', endDate: '2027-03-01', type: 'Solo', coverUrl: 'x',
  })).json.data.id;
  const reAdd = await call('POST', `/exhibitions/${planningExh}/artworks`, curatorToken, { artworkId: artwork2 });
  check('恢复通过的作品可重新入选', reAdd.status === 201, String(reAdd.status));
  await call('POST', `/exhibitions/${planningExh}/submit`, curatorToken, {});
  const overturn = await call('POST', `/reviews/artworks/${artwork2}/overturn`, adminToken, { result: 'Rejected', comment: '发现新问题' });
  check('推翻为退回', overturn.json.data.status === 'Rejected');
  const exhAfterOverturn = (await call('GET', `/exhibitions/${planningExh}`, curatorToken)).json.data;
  const removedByOverturn = exhAfterOverturn.removedArtworks.find((r: { artworkId: string }) => r.artworkId === artwork2);
  check('推翻时自动撤出并留原因', Boolean(removedByOverturn) && removedByOverturn.reason.includes('发现新问题'));
  check('撤出后释放唯一占用', !exhAfterOverturn.activeArtworkIds.includes(artwork2));

  // 16. 展览被退回（新建一个含作品的展览并审批退回）-> 释放占用
  const artwork3 = (await call('POST', '/artworks', artistToken, {
    title: '作品三', description: 'd', year: 2026, medium: 'Ink', materials: '墨', size: { length: 1, width: 1 }, imageUrls: [], tags: [],
  })).json.data.id;
  await call('POST', `/artworks/${artwork3}/submit`, artistToken, {});
  await call('POST', `/reviews/artworks/${artwork3}/decision`, adminToken, { result: 'Approved' });
  const exh3 = (await call('POST', '/exhibitions', curatorToken, {
    title: '烟测展3', description: 'd', startDate: '2026-09-01', endDate: '2026-10-01', type: 'Group', coverUrl: 'x',
  })).json.data.id;
  await call('POST', `/exhibitions/${exh3}/artworks`, curatorToken, { artworkId: artwork3 });
  await call('POST', `/exhibitions/${exh3}/submit`, curatorToken, {});
  const rejectExh = await call('POST', `/reviews/exhibitions/${exh3}/decision`, adminToken, { result: 'Rejected', comment: '主题不符' });
  check('展览退回', rejectExh.json.data.status === 'Rejected');
  const rejectedExhDoc = (await call('GET', `/exhibitions/${exh3}`, curatorToken)).json.data;
  check('退回展览释放作品占用', rejectedExhDoc.activeArtworkIds.length === 0);
  // 作品可被加入其他展览
  const reuseExh = (await call('POST', '/exhibitions', curatorToken, {
    title: '复用展', description: 'd', startDate: '2026-11-01', endDate: '2026-12-01', type: 'Group', coverUrl: 'x',
  })).json.data.id;
  const reuse = await call('POST', `/exhibitions/${reuseExh}/artworks`, curatorToken, { artworkId: artwork3 });
  check('释放后作品可被新展览挑选', reuse.status === 201, String(reuse.status));

  // 17. 并发挑作品：同一作品同时加入两个筹备展，只有一次成功
  const artwork4 = (await call('POST', '/artworks', artistToken, {
    title: '作品四', description: 'd', year: 2026, medium: 'Ink', materials: '墨', size: { length: 1, width: 1 }, imageUrls: [], tags: [],
  })).json.data.id;
  await call('POST', `/artworks/${artwork4}/submit`, artistToken, {});
  await call('POST', `/reviews/artworks/${artwork4}/decision`, adminToken, { result: 'Approved' });
  const raceExhA = (await call('POST', '/exhibitions', curatorToken, {
    title: '并发展A', description: 'd', startDate: '2027-04-01', endDate: '2027-05-01', type: 'Group', coverUrl: 'x',
  })).json.data.id;
  const raceExhB = (await call('POST', '/exhibitions', curatorToken, {
    title: '并发展B', description: 'd', startDate: '2027-05-01', endDate: '2027-06-01', type: 'Group', coverUrl: 'x',
  })).json.data.id;
  const addRace = await Promise.all([
    call('POST', `/exhibitions/${raceExhA}/artworks`, curatorToken, { artworkId: artwork4 }),
    call('POST', `/exhibitions/${raceExhB}/artworks`, curatorToken, { artworkId: artwork4 }),
  ]);
  check('并发挑选只生效一次', addRace.filter((r) => r.status === 201).length === 1 && addRace.some((r) => r.status === 409),
    JSON.stringify(addRace.map((r) => r.status)));

  // 17b. 并发下架同一作品：只有一次成功
  const takedownRace = await Promise.all([
    call('POST', `/artworks/${artwork4}/takedown`, adminToken, { comment: '并发下架一' }),
    call('POST', `/artworks/${artwork4}/takedown`, adminToken, { comment: '并发下架二' }),
  ]);
  check('并发下架只生效一次', takedownRace.filter((r) => r.status === 201).length === 1 && takedownRace.some((r) => r.status === 409),
    JSON.stringify(takedownRace.map((r) => r.status)));

  // 17c. 并发审核同一待审作品：只有一次成功
  const artwork6 = (await call('POST', '/artworks', artistToken, {
    title: '作品六', description: 'd', year: 2026, medium: 'Ink', materials: '墨', size: { length: 1, width: 1 }, imageUrls: [], tags: [],
  })).json.data.id;
  await call('POST', `/artworks/${artwork6}/submit`, artistToken, {});
  const decideRace = await Promise.all([
    call('POST', `/reviews/artworks/${artwork6}/decision`, adminToken, { result: 'Approved' }),
    call('POST', `/reviews/artworks/${artwork6}/decision`, adminToken, { result: 'Rejected', comment: '并发冲突' }),
  ]);
  check('并发审核只生效一次', decideRace.filter((r) => r.status === 201).length === 1 && decideRace.some((r) => r.status === 409),
    JSON.stringify(decideRace.map((r) => r.status)));

  // 17d. 已下架/退回的作品混入展览送审：必须被拒绝
  const artwork7 = (await call('POST', '/artworks', artistToken, {
    title: '作品七', description: 'd', year: 2026, medium: 'Ink', materials: '墨', size: { length: 1, width: 1 }, imageUrls: [], tags: [],
  })).json.data.id;
  await call('POST', `/artworks/${artwork7}/submit`, artistToken, {});
  await call('POST', `/reviews/artworks/${artwork7}/decision`, adminToken, { result: 'Approved' });
  const staleExh = (await call('POST', '/exhibitions', curatorToken, {
    title: '陈旧作品展', description: 'd', startDate: '2027-09-01', endDate: '2027-10-01', type: 'Group', coverUrl: 'x',
  })).json.data.id;
  await call('POST', `/exhibitions/${staleExh}/artworks`, curatorToken, { artworkId: artwork7 });
  await call('POST', `/artworks/${artwork7}/takedown`, adminToken, { comment: '送审前被下架' });
  const staleSubmit = await call('POST', `/exhibitions/${staleExh}/submit`, curatorToken, {});
  check('含已下架作品的展览不能送审 (409)', staleSubmit.status === 409);
  // 撤出记录同步留在展览上
  const staleExhDoc = (await call('GET', `/exhibitions/${staleExh}`, curatorToken)).json.data;
  check('下架时自动留下撤出原因', staleExhDoc.removedArtworks.some((r: { artworkId: string; reason: string }) =>
    r.artworkId === artwork7 && r.reason.includes('送审前被下架')));

  // 18. 审核轨迹可查
  const artistCreateExh = await call('POST', '/exhibitions', artistToken, {
    title: '艺术家越权建展', description: 'd', startDate: '2027-06-01', endDate: '2027-07-01', type: 'Solo', coverUrl: 'x',
  });
  check('艺术家不能创建展览 (403)', artistCreateExh.status === 403);
  const logs = (await call('GET', `/reviews/logs?targetType=Artwork&targetId=${artworkId}`, adminToken)).json.data;
  check('审核日志留痕', Array.isArray(logs) && logs.some((l: { action: string }) => l.action === 'ArtworkTakenDown'));

  // 19. 展览开展后被推翻为退回：作品随之不再公开，恢复需重新挑选送审
  const artwork5 = (await call('POST', '/artworks', artistToken, {
    title: '作品五', description: 'd', year: 2026, medium: 'Ink', materials: '墨', size: { length: 1, width: 1 }, imageUrls: [], tags: [],
  })).json.data.id;
  await call('POST', `/artworks/${artwork5}/submit`, artistToken, {});
  await call('POST', `/reviews/artworks/${artwork5}/decision`, adminToken, { result: 'Approved' });
  const exh5 = (await call('POST', '/exhibitions', curatorToken, {
    title: '推翻测试展', description: 'd', startDate: '2027-07-01', endDate: '2027-08-01', type: 'Group', coverUrl: 'x',
  })).json.data.id;
  await call('POST', `/exhibitions/${exh5}/artworks`, curatorToken, { artworkId: artwork5 });
  await call('POST', `/exhibitions/${exh5}/submit`, curatorToken, {});
  await call('POST', `/reviews/exhibitions/${exh5}/decision`, adminToken, { result: 'Approved' });
  const publicBefore = await call('GET', `/artworks/${artwork5}`, viewerToken);
  check('开展时作品公开', publicBefore.status === 200);
  await call('POST', `/reviews/exhibitions/${exh5}/overturn`, adminToken, { result: 'Rejected', comment: '开展材料失实' });
  const afterOverturn = (await call('GET', `/artworks/${artwork5}`, artistToken)).json.data;
  check('展览退回后作品回落为未公开 Approved', afterOverturn.status === 'Approved');
  const viewerAfter = await fetch(`${base}/artworks/${artwork5}`, { headers: { Authorization: `Bearer ${viewerToken}` } });
  check('展览退回后观众看不到作品 (404)', viewerAfter.status === 404);
  const emptyRestore = await call('POST', `/reviews/exhibitions/${exh5}/overturn`, adminToken, { result: 'Approved', comment: '误判恢复' });
  check('空的退回展览不能直接恢复批准 (409)', emptyRestore.status === 409);
  await call('POST', `/exhibitions/${exh5}/artworks`, curatorToken, { artworkId: artwork5 });
  await call('POST', `/exhibitions/${exh5}/submit`, curatorToken, {});
  const reapproved = await call('POST', `/reviews/exhibitions/${exh5}/decision`, adminToken, { result: 'Approved' });
  check('重新送审批准后再次 Active', reapproved.json.data.status === 'Active');

  const failed = results.filter(([, ok]) => !ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await app.close();
  await mongod.stop();
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
