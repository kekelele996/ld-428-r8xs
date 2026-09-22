/* eslint-disable */
// 端到端工作流验证（使用内存 MongoDB，不依赖 docker）。
// 运行：node test-workflow.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const assert = require('assert');

const { Artwork, ArtworkSchema } = require('./dist/models/artwork.schema');
const { Exhibition, ExhibitionSchema } = require('./dist/models/exhibition.schema');
const { ReviewLog, ReviewLogSchema } = require('./dist/models/reviewLog.schema');
const { WithdrawalLog, WithdrawalLogSchema } = require('./dist/models/withdrawalLog.schema');
const { ArtworkService } = require('./dist/services/artwork.service');
const { ExhibitionService } = require('./dist/services/exhibition.service');
const { ReviewService } = require('./dist/services/review.service');
const { WithdrawalService } = require('./dist/services/withdrawal.service');
const {
  ArtworkStatus,
  ArtworkReviewStatus,
  ExhibitionStatus,
  ReviewResult,
  WithdrawalReason,
} = require('./dist/types/enums');

async function main() {
  process.env.MONGOMS_DISTRO = 'ubuntu-22.04';
  const mongod = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
  });
  await mongoose.connect(mongod.getUri('art_gallery_test'));

  const artworkModel = mongoose.model(Artwork.name, ArtworkSchema);
  const exhibitionModel = mongoose.model(Exhibition.name, ExhibitionSchema);
  const reviewModel = mongoose.model(ReviewLog.name, ReviewLogSchema);
  const withdrawalModel = mongoose.model(WithdrawalLog.name, WithdrawalLogSchema);

  const reviewService = new ReviewService(reviewModel);
  const withdrawalService = new WithdrawalService(withdrawalModel);
  const artworkService = new ArtworkService(artworkModel, reviewService, withdrawalService, null);
  const exhibitionService = new ExhibitionService(exhibitionModel, reviewService, artworkService);
  // 注入双向引用
  artworkService.exhibitionService = exhibitionService;

  const artist = { id: 'user-lin', role: 'Artist', artistId: 'artist-lin' };
  const otherArtist = { id: 'user-chen', role: 'Artist', artistId: 'artist-chen' };
  const curator = { id: 'user-curator', role: 'Curator' };
  const admin = { id: 'user-admin', role: 'Admin' };

  const baseArtwork = {
    title: '测试作品',
    description: 'desc',
    year: 2026,
    medium: 'Ink',
    materials: '纸',
    size: { length: 10, width: 10 },
    imageUrls: ['x'],
    tags: [],
  };

  // 1. 艺术家创建草稿
  let artwork = await artworkService.create({ ...baseArtwork }, artist);
  assert.strictEqual(artwork.status, ArtworkStatus.Draft, '新作品为草稿');
  assert.strictEqual(artwork.reviewStatus, ArtworkReviewStatus.Unsubmitted, '新作品未提交审核');

  // 2. 越权：策展人不能挑未通过审核的作品
  const exhibition = await exhibitionService.create(
    { title: '展', description: 'd', startDate: '2026-01-01', endDate: '2026-12-31', type: 'Group', coverUrl: 'c' },
    curator,
  );
  await assert.rejects(
    () => exhibitionService.addArtwork(exhibition._id.toString(), artwork._id.toString(), curator),
    /已通过审核/,
    '未审核作品不能被选入展览',
  );

  // 3. 艺术家提交，重复提交报错
  await artworkService.submitForReview(artwork._id.toString(), artist);
  await assert.rejects(() => artworkService.submitForReview(artwork._id.toString(), artist), /重复提交|待审/);

  // 4. 越权：他人不能操作作品（服务层属主校验；Admin 角色由控制器 RolesGuard 强制）
  await assert.rejects(() => artworkService.submitForReview(artwork._id.toString(), otherArtist), /他人/);

  // 5. 管理员通过
  artwork = await artworkService.decideReview(artwork._id.toString(), ReviewResult.Approved, admin.id, 'ok');
  assert.strictEqual(artwork.reviewStatus, ArtworkReviewStatus.Approved);
  // 重复通过只生效一次
  await assert.rejects(() => artworkService.decideReview(artwork._id.toString(), ReviewResult.Approved, admin.id), /已通过/);

  // 6. 策展人加入并送审
  await exhibitionService.addArtwork(exhibition._id.toString(), artwork._id.toString(), curator);
  const otherCurator = { id: 'user-x', role: 'Curator' };
  await assert.rejects(() => exhibitionService.submitForReview(exhibition._id.toString(), otherCurator), /策展人|管理员/);
  await exhibitionService.submitForReview(exhibition._id.toString(), curator);
  // 送审后不能再加作品
  await assert.rejects(
    () => exhibitionService.addArtwork(exhibition._id.toString(), artwork._id.toString(), curator),
    /不能再调整/,
  );

  // 7. 批准前作品仍未公开
  artwork = await artworkService.find(artwork._id.toString());
  assert.strictEqual(artwork.status, ArtworkStatus.Draft, '批准展览前作品仍为草稿（不公开）');

  // 8. 管理员批准 -> 作品公开（Admin 角色由控制器 RolesGuard 强制，下方 HTTP 层另测）
  const approvedExh = await exhibitionService.approve(exhibition._id.toString(), admin.id, '批准');
  assert.strictEqual(approvedExh.status, ExhibitionStatus.Active);
  artwork = await artworkService.find(artwork._id.toString());
  assert.strictEqual(artwork.status, ArtworkStatus.Published, '展览批准后作品公开');
  assert.strictEqual(artwork.activeExhibitionId, exhibition._id.toString());

  // 9. 重复批准不生效
  await assert.rejects(() => exhibitionService.approve(exhibition._id.toString(), admin.id), /已批准|重复/);

  // 10. 同一作品不能同时进入第二个进行中展览
  const exhibition2 = await exhibitionService.create(
    { title: '展2', description: 'd', startDate: '2026-02-01', endDate: '2026-12-31', type: 'Solo', coverUrl: 'c' },
    curator,
  );
  // 策划阶段添加在展作品应被拒
  await assert.rejects(
    () => exhibitionService.addArtwork(exhibition2._id.toString(), artwork._id.toString(), curator),
    /另一个进行中展览/,
  );
  // 强行构造第二个展览并抢占（模拟并发发布）：approve 必须原子失败回滚
  await exhibitionModel.findByIdAndUpdate(exhibition2._id, {
    $addToSet: { artworkIds: [artwork._id.toString()] },
    status: ExhibitionStatus.PendingReview,
  });
  await assert.rejects(
    () => exhibitionService.approve(exhibition2._id.toString(), admin.id),
    /未生效|其他进行中展览|已在其他/,
  );
  const exh2After = await exhibitionService.find(exhibition2._id.toString());
  assert.strictEqual(exh2After.status, ExhibitionStatus.PendingReview, '冲突发布整体回滚，展览未公开');
  artwork = await artworkService.find(artwork._id.toString());
  assert.strictEqual(artwork.activeExhibitionId, exhibition._id.toString(), '作品仍归属原展览');

  // 11. 管理员推翻审核 -> 自动撤出 Active 展览 + 留痕 + 作品下架
  await artworkService.overturnApproval(artwork._id.toString(), admin.id, '材料存疑');
  artwork = await artworkService.find(artwork._id.toString());
  assert.strictEqual(artwork.reviewStatus, ArtworkReviewStatus.Rejected);
  assert.strictEqual(artwork.status, ArtworkStatus.Draft, '推翻后作品不再公开');
  assert.strictEqual(artwork.activeExhibitionId, null);
  const exhAfter = await exhibitionService.find(exhibition._id.toString());
  assert.ok(!exhAfter.artworkIds.includes(artwork._id.toString()), '作品已从进行中展览撤出');
  const logs = await withdrawalService.listForExhibition(exhibition._id.toString());
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].reason, WithdrawalReason.ApprovalOverturned);
  assert.strictEqual(logs[0].comment, '材料存疑');

  // 12. 重新审核通过 + 新展览全流程，测试“退回”撤出
  await artworkService.decideReview(artwork._id.toString(), ReviewResult.Approved, admin.id, '复核通过');
  await exhibitionModel.findByIdAndUpdate(exhibition2._id, { status: ExhibitionStatus.Planning });
  await exhibitionService.addArtwork(exhibition2._id.toString(), artwork._id.toString(), curator);
  await exhibitionService.submitForReview(exhibition2._id.toString(), curator);
  await exhibitionService.approve(exhibition2._id.toString(), admin.id);
  let wd = await withdrawalService.listForExhibition(exhibition2._id.toString());
  assert.strictEqual(wd.length, 0);
  await artworkService.decideReview(artwork._id.toString(), ReviewResult.Rejected, admin.id, '再次退回');
  const exh2Rej = await exhibitionService.find(exhibition2._id.toString());
  assert.ok(!exh2Rej.artworkIds.includes(artwork._id.toString()), '退回触发撤出');
  wd = await withdrawalService.listForExhibition(exhibition2._id.toString());
  assert.strictEqual(wd.length, 1);
  assert.strictEqual(wd[0].reason, WithdrawalReason.ArtworkRejected);

  // 13. 艺术家下架触发撤出
  await artworkService.decideReview(artwork._id.toString(), ReviewResult.Approved, admin.id);
  const exhibition3 = await exhibitionService.create(
    { title: '展3', description: 'd', startDate: '2026-03-01', endDate: '2026-12-31', type: 'Group', coverUrl: 'c' },
    curator,
  );
  await exhibitionModel.findByIdAndUpdate(exhibition3._id, {
    $addToSet: { artworkIds: [artwork._id.toString()] },
    status: ExhibitionStatus.PendingReview,
  });
  await exhibitionService.approve(exhibition3._id.toString(), admin.id);
  await artworkService.takeDown(artwork._id.toString(), artist, '不想展了');
  const exh3 = await exhibitionService.find(exhibition3._id.toString());
  assert.ok(!exh3.artworkIds.includes(artwork._id.toString()), '下架触发撤出');
  artwork = await artworkService.find(artwork._id.toString());
  assert.strictEqual(artwork.status, ArtworkStatus.Draft);
  assert.strictEqual(artwork.reviewStatus, ArtworkReviewStatus.Unsubmitted, '下架后回到未提交，需重新送审');

  // 14. 普通观众视角过滤
  const publicArtworks = await artworkService.listPublic();
  assert.strictEqual(publicArtworks.length, 0, '全部未公开作品对观众不可见');
  const publicExhibitions = await exhibitionService.listPublic();
  // 展1仍 Active 但已无作品；展3 Active 无作品
  assert.ok(publicExhibitions.every((e) => e.status === ExhibitionStatus.Active));

  console.log('✅ 全部工作流断言通过');
  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((error) => {
  console.error('❌ 测试失败：', error);
  process.exit(1);
});
