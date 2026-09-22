/* eslint-disable */
// HTTP 层验证：JWT 鉴权、RBAC 越权防护、观众内容过滤。
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const assert = require('assert');

// 仅测试退出阶段：审计日志中间件在响应 finish 时的异步写与 Mongo 关闭竞争，
// 产生的 MongoClientClosedError 与业务无关，显式忽略以免误判为失败。
process.on('unhandledRejection', (error) => {
  if (error && error.name === 'MongoClientClosedError') return;
  throw error;
});

async function main() {
  process.env.MONGOMS_DISTRO = 'ubuntu-22.04';
  const mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  process.env.MONGO_URI = mongod.getUri('art_gallery_http');

  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('./dist/app.module.js');
  const { AuthService } = await import('./dist/services/auth.service.js');
  const { default: jwt } = await import('jsonwebtoken');
  const { jwtConfig } = await import('./dist/config/jwt.config.js');

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(3099, '127.0.0.1');

  const sign = (user) => jwt.sign(user, jwtConfig.secret);
  const artistToken = sign({ id: 'user-lin', role: 'Artist', artistId: 'artist-lin' });
  const curatorToken = sign({ id: 'user-curator', role: 'Curator' });
  const adminToken = sign({ id: 'user-admin', role: 'Admin' });

  const call = async (method, path, token, body) => {
    const res = await fetch(`http://127.0.0.1:3099${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* no body */ }
    return { status: res.status, json };
  };

  // 观众看不到任何（尚无公开）作品
  let res = await call('GET', '/api/artworks');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json.data.length, 0, '观众列表为空（未审核内容不公开）');

  // Viewer 写操作被 RBAC 拒绝
  res = await call('POST', '/api/artworks', null, { title: 'x' });
  assert.strictEqual(res.status, 403, 'Viewer 不能上传作品');

  // 艺术家上传
  res = await call('POST', '/api/artworks', artistToken, {
    title: '审核流作品', description: 'd', year: 2026, medium: 'Ink', materials: 'm',
    size: { length: 1, width: 1 }, imageUrls: ['x'], tags: [],
  });
  assert.strictEqual(res.status, 201, `艺术家上传应成功: ${JSON.stringify(res.json)}`);
  const artworkId = res.json.data._id;

  // 观众仍看不到该草稿，直接访问详情 404
  res = await call('GET', `/api/artworks/${artworkId}`);
  assert.strictEqual(res.status, 404, '观众不能访问未公开作品详情');

  // 策展人不能改作品（RBAC）
  res = await call('PATCH', `/api/artworks/${artworkId}/submit`, curatorToken);
  assert.strictEqual(res.status, 403, 'Curator 不能提交作品审核');

  // 艺术家提交
  res = await call('PATCH', `/api/artworks/${artworkId}/submit`, artistToken);
  assert.strictEqual(res.status, 200);
  // 重复提交
  res = await call('PATCH', `/api/artworks/${artworkId}/submit`, artistToken);
  assert.strictEqual(res.status, 409, '重复提交 409');

  // 非 Admin 不能审核
  res = await call('PATCH', `/api/artworks/${artworkId}/approve`, curatorToken, {});
  assert.strictEqual(res.status, 403, '策展人不能裁决作品审核');
  res = await call('PATCH', `/api/artworks/${artworkId}/approve`, artistToken, {});
  assert.strictEqual(res.status, 403, '艺术家不能裁决作品审核');

  // Admin 审核通过（作品此时仍不公开，未在 Active 展览）
  res = await call('PATCH', `/api/artworks/${artworkId}/approve`, adminToken, { comment: '通过' });
  assert.strictEqual(res.status, 200);
  res = await call('GET', '/api/artworks');
  assert.strictEqual(res.json.data.length, 0, '作品虽审核通过但未随展览公开，观众仍不可见');
  res = await call('GET', '/api/artworks', artistToken);
  assert.ok(res.json.data.length >= 1, '内部角色可看全量');

  // 策展人建展、挑作品、送审；Artist 建展被拒
  res = await call('POST', '/api/exhibitions', artistToken, { title: 'x', description: 'd' });
  assert.strictEqual(res.status, 403, 'Artist 不能建展');
  res = await call('POST', '/api/exhibitions', curatorToken, {
    title: '首展', description: 'd', startDate: '2026-01-01', endDate: '2026-12-31', type: 'Group', coverUrl: 'c',
  });
  assert.strictEqual(res.status, 201);
  const exhibitionId = res.json.data._id;

  res = await call('PATCH', `/api/exhibitions/${exhibitionId}/artworks`, curatorToken, { artworkId });
  assert.strictEqual(res.status, 200);
  res = await call('PATCH', `/api/exhibitions/${exhibitionId}/submit`, curatorToken);
  assert.strictEqual(res.status, 200);

  // 观众看不到待审展览
  res = await call('GET', '/api/exhibitions');
  assert.strictEqual(res.json.data.length, 0, '待审展览对观众不可见');

  // 只有 Admin 能批准
  res = await call('PATCH', `/api/exhibitions/${exhibitionId}/approve`, curatorToken, {});
  assert.strictEqual(res.status, 403);
  res = await call('PATCH', `/api/exhibitions/${exhibitionId}/approve`, adminToken, { comment: '开展' });
  assert.strictEqual(res.status, 200);
  // 重复批准
  res = await call('PATCH', `/api/exhibitions/${exhibitionId}/approve`, adminToken, {});
  assert.strictEqual(res.status, 409, '重复批准 409');

  // 批准后观众可见展览与作品
  res = await call('GET', '/api/exhibitions');
  assert.strictEqual(res.json.data.length, 1, '观众可见已开展览');
  res = await call('GET', '/api/artworks');
  assert.strictEqual(res.json.data.length, 1, '作品随展览公开');

  // 管理员推翻审核 -> 自动撤出，观众再次不可见，并生成留痕
  res = await call('PATCH', `/api/artworks/${artworkId}/overturn`, adminToken, { comment: '存疑' });
  assert.strictEqual(res.status, 200);
  const exhCheck = await call('GET', `/api/exhibitions/${exhibitionId}`, curatorToken);
  assert.deepStrictEqual(exhCheck.json.data.artworkIds, [], '作品已从进行中展览撤出');
  res = await call('GET', `/api/withdrawals?exhibitionId=${exhibitionId}`, curatorToken);
  assert.strictEqual(res.json.data.length, 1, '撤出留痕存在');
  assert.strictEqual(res.json.data[0].reason, 'ApprovalOverturned');
  res = await call('GET', '/api/artworks');
  assert.strictEqual(res.json.data.length, 0, '撤出后观众不可见');
  res = await call('GET', `/api/exhibitions/${exhibitionId}`, null);
  assert.strictEqual(res.status, 200, '展览仍在（Active），但作品已撤出');
  assert.deepStrictEqual(res.json.data.artworkIds, []);

  // Viewer 不能查撤出留痕
  res = await call('GET', '/api/withdrawals');
  assert.strictEqual(res.status, 403);

  // 鉴权 token 端点
  res = await call('POST', '/api/auth/token', null, { role: 'Admin' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.json.data.token);

  console.log('✅ HTTP/RBAC/内容审核 断言全部通过');
  // 先停 HTTP 服务（不等待 Mongoose 关闭钩子），再关闭内存库并退出。
  await app.getHttpServer().close?.();
  await mongoose.connection.close().catch(() => {});
  await mongod.stop({ doCleanup: true }).catch(() => {});
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ HTTP 测试失败：', error);
  process.exit(1);
});
