# 艺术作品集与画廊管理平台

## Docker 启动

```bash
docker compose up --build
```

- 前端访问地址：http://localhost:18808/gallery
- 后端 API 地址：http://localhost:19308/api
- 健康检查：http://localhost:19308/health

## 上展审核流程

作品和展览遵循「提交 → 审核 → 公开」的强制工作流：

```text
艺术家上传作品 (Draft)
   └─ 提交审核 → PendingReview
         ├─ 管理员通过 → Approved（仅代表可被策展人挑选，尚未公开）
         └─ 管理员退回 → Rejected（可修改后重新提交）

策展人创建展览 (Planning)
   └─ 只能从 Approved/Published 作品中挑选并送审 → PendingReview
         ├─ 管理员批准 → Active，展内作品同时 Published 公开
         └─ 管理员退回 → Rejected，释放作品占用，作品若无其他开展览承载则回落为未公开
```

关键规则：

- **未公开不可见**：待审/退回/草稿内容不会出现在画廊、作品详情、艺术家主页；Viewer 直接访问返回 404。
- **自动撤出**：作品被退回、下架，或审核结果被管理员推翻时，自动从所有进行中（Planning/PendingReview/Active）展览撤出，展览页保留撤出原因与时间（`removedArtworks`）。
- **唯一在展**：同一作品同一时刻只能出现在一个进行中的展览（MongoDB 部分唯一索引 + 应用层前置校验，并发挑选/并发发布只生效一次）。
- **幂等审核**：重复审批、重复下架、越权操作（RBAC + 资源 owner 校验）一律拒绝；展览批准/退回使用条件原子更新。
- **状态一致**：所有决定写入 ReviewLog（提交/批准/退回/推翻/下架/撤出），作品与展览双向同步引用；工作台、展览页、作品详情刷新后状态一致。

### 主要审核接口

| 接口 | 角色 | 说明 |
| --- | --- | --- |
| `POST /api/artworks/:id/submit` | Artist | 提交作品进入待审（幂等） |
| `POST /api/artworks/:id/takedown` | Admin/Curator | 下架并自动撤出所有进行中展览 |
| `POST /api/exhibitions/:id/artworks` | Curator/Admin | 挑选**已通过审核**作品加入展览 |
| `DELETE /api/exhibitions/:id/artworks/:artworkId` | Curator/Admin | 筹备阶段移除（留痕） |
| `POST /api/exhibitions/:id/submit` | Curator/Admin | 送审展览 |
| `POST /api/reviews/artworks/:id/decision` | Admin | 作品审核结论 Approved/Rejected |
| `POST /api/reviews/exhibitions/:id/decision` | Admin | 批准开展或退回展览 |
| `POST /api/reviews/artworks/:id/overturn` | Admin | 推翻作品结论（必填原因，自动撤出） |
| `POST /api/reviews/exhibitions/:id/overturn` | Admin | 推翻展览结论（必填原因） |
| `GET /api/reviews/logs` | 登录用户 | 审核轨迹查询 |
| `POST /api/auth/dev-token` | - | 开发环境角色切换 JWT |

后端端到端校验（37 项，含并发/越权/撤出场景）：

```bash
cd backend && npm run test:e2e
```

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + Headless UI |
| 图表 | ECharts |
| 懒加载 | react-lazyload |
| 状态 | Zustand |
| 后端 | NestJS + TypeScript |
| 数据库 | MongoDB 7 + Mongoose |
| 部署 | Docker Compose |

## 目录结构

```text
frontend/src/
├── api/              # artwork.ts, exhibition.ts, artist.ts, interaction.ts, review.ts, auth.ts
├── stores/           # artworkStore.ts, exhibitionStore.ts, artistStore.ts, interactionStore.ts, sessionStore.ts
├── types/            # index.ts, enums.ts, artwork.ts, exhibition.ts, artist.ts, interaction.ts, review.ts
├── components/common/  # ArtworkCard, ExhibitionBanner, CommentSection, InteractionBar, UserAvatar,
│                       # EmptyState, StatusBadge, ReviewReasonBanner, RemovedArtworkList, CuratorPanel, RoleSwitcher
├── hooks/            # useInteraction.ts, usePagination.ts
├── pages/            # Gallery, ArtworkDetail, ExhibitionDetail, ArtistProfile, Studio, ReviewCenter
├── router/           # index.tsx, guards.tsx
├── utils/            # formatArtworkSize.ts, request.ts, apiError.ts
└── constants/        # apiPaths.ts, mediumOptions.ts

backend/src/
├── routes/           # artwork.routes.ts, exhibition.routes.ts, artist.routes.ts, interaction.routes.ts, review.routes.ts, auth.routes.ts
├── controllers/      # artwork.controller.ts, exhibition.controller.ts, artist.controller.ts, interaction.controller.ts, review.controller.ts, auth.controller.ts
├── services/         # artwork.service.ts, exhibition.service.ts, artist.service.ts, interaction.service.ts, review.service.ts, withdrawal.service.ts
├── models/           # artwork.schema.ts, exhibition.schema.ts, artist.schema.ts, interaction.schema.ts, reviewLog.schema.ts
├── middlewares/      # auth.middleware.ts, rbac.middleware.ts, auditLog.middleware.ts, contentReview.middleware.ts, errorHandler.middleware.ts, requestLogger.middleware.ts
├── types/            # enums.ts, interfaces.ts
├── utils/            # logger.ts, response.ts, normalize.ts, requestPath.ts
├── config/           # database.config.ts, jwt.config.ts
└── database/         # seeds/
```

## 枚举位置

- 后端：`backend/src/types/enums.ts`
- 前端：`frontend/src/types/enums.ts`

## 主要页面

- `/gallery` 画廊首页（仅已发布作品 / 已开展览）
- `/artwork/:id` 作品详情
- `/exhibition/:id` 展览详情（含策展操作面板与撤出记录）
- `/artist/:id` 艺术家主页
- `/studio` 创作工作台（按角色显示提交/下架等操作）
- `/review` 管理员审核中心（审批、推翻）

## License

MIT
