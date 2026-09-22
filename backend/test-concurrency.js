/* eslint-disable */
// 并发发布测试：两个不同的待审展览同时尝试批准、抢占同一批作品，只能有一个成功。
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
const { ArtworkReviewStatus, ArtworkStatus, ExhibitionStatus } = require('./dist/types/enums');

async function main() {
  process.env.MONGOMS_DISTRO = 'ubuntu-22.04';
  const mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongod.getUri('art_gallery_concurrency'));

  const artworkModel = mongoose.model(Artwork.name + '_c', ArtworkSchema);
  const exhibitionModel = mongoose.model(Exhibition.name + '_c', ExhibitionSchema);
  const reviewModel = mongoose.model(ReviewLog.name + '_c', ReviewLogSchema);
  const withdrawalModel = mongoose.model(WithdrawalLog.name + '_c', WithdrawalLogSchema);

  const reviewService = new ReviewService(reviewModel);
  const withdrawalService = new WithdrawalService(withdrawalModel);
  const artworkService = new ArtworkService(artworkModel, reviewService, withdrawalService, null);
  const exhibitionService = new ExhibitionService(exhibitionModel, reviewService, artworkService);
  artworkService.exhibitionService = exhibitionService;

  const admin = { id: 'user-admin', role: 'Admin' };
  const curator = { id: 'user-curator', role: 'Curator' };
  const artist = { id: 'user-lin', role: 'Artist', artistId: 'artist-lin' };

  // 两件已通过审核的作品
  const artworkIds = [];
  for (const title of ['A', 'B']) {
    const art = await artworkService.create(
      { title, description: 'd', year: 2026, medium: 'Ink', materials: 'm', size: { length: 1, width: 1 }, imageUrls: ['x'], tags: [] },
      artist,
    );
    await artworkService.submitForReview(art._id.toString(), artist);
    const approved = await artworkService.decideReview(art._id.toString(), 'Approved', admin.id);
    artworkIds.push(approved._id.toString());
  }

  // 三个待审展览都包含同样两件作品
  const exhibitionIds = [];
  for (const title of ['E1', 'E2', 'E3']) {
    const exh = await exhibitionService.create(
      { title, description: 'd', startDate: '2026-01-01', endDate: '2026-12-31', type: 'Group', coverUrl: 'c' },
      curator,
    );
    await exhibitionModel.findByIdAndUpdate(exh._id, { $set: { artworkIds } });
    await exhibitionService.submitForReview(exh._id.toString(), curator);
    exhibitionIds.push(exh._id.toString());
  }

  // 并发批准三个展览
  const results = await Promise.allSettled(
    exhibitionIds.map((id) => exhibitionService.approve(id, admin.id)),
  );

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert.strictEqual(fulfilled.length, 1, `并发发布只应有一个成功，实际成功 ${fulfilled.length} 个`);
  assert.strictEqual(rejected.length, 2, `其余两个必须失败回滚，实际失败 ${rejected.length} 个`);

  const activeExhibitions = await exhibitionModel.find({ status: ExhibitionStatus.Active });
  assert.strictEqual(activeExhibitions.length, 1, '只有一个 Active 展览');

  // 每件作品只被一个进行中展览占用，且为 Public 状态
  for (const id of artworkIds) {
    const art = await artworkModel.findById(id);
    assert.strictEqual(art.activeExhibitionId, activeExhibitions[0]._id.toString(), '作品归属唯一在展展览');
    assert.strictEqual(art.status, ArtworkStatus.Published);
  }

  // 失败的展览仍为 PendingReview，且没有抢占到任何作品
  const failed = await exhibitionModel.find({ status: ExhibitionStatus.PendingReview });
  assert.strictEqual(failed.length, 2, '失败展览保持待审');

  console.log('✅ 并发发布幂等/互斥断言通过');
  await mongoose.disconnect();
  await mongod.stop();
}

main().catch((error) => {
  console.error('❌ 并发测试失败：', error);
  process.exit(1);
});
