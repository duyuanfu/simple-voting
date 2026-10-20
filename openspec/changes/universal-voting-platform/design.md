# Design: Universal Voting Platform (通用多活动多模板投票平台)

## Context
随着各类业务机构、社群、企业组织对评选活动的多样化需求，需要一个通用的投票管理系统，支持多租户独立运作，能够敏捷创建文字评选、摄影图文评选、短视频展播评选三类典型活动。系统须在面向全网完全开放（前期免验证码）的场景下，兼顾极简的大众移动端交互、严格的多重反刷票风控、本地大视频流式分发、以及管理端实时数据看板。

## Goals / Non-Goals

**Goals:**
- **多租户数据与资源逻辑隔离**：支持租户前端自主注册与登录，所有活动、候选人、投票流水及本地存储均按租户隔离。
- **三类活动模板自适应**：
  - 文字模板：文字长文卡片展示，支持多选批量勾选提交；
  - 图文模板：响应式瀑布流/图片卡片展示，支持多选批量勾选提交；
  - 视频模板：作品卡片集成模态播放器（HTTP 206 断点续传），支持观影后即时单投。
- **4.A 票制规则引擎**：一人固定 $N$ 票且不可重复投给同一作品。支持完全匿名或动态自定义实名扩展字段（如部门、姓名等）。
- **多级防刷风控**：无验证码下，综合 FingerprintJS 浏览器指纹、签名 Session Token、单 IP 频率限制桶、IP 每日上限与数据库联合唯一索引。
- **动静结合的实时体验**：大众端采用乐观更新与局部刷新以承载高并发；管理大屏通过 SSE 实现票数实时跳动动画。
- **本地高效媒体存储**：媒体资源存储在本地目录，限制单视频 $\le$ 100MB，支持 MP4 首帧流式播放。

**Non-Goals:**
- 不支持云对象存储（如 AWS S3、阿里云 OSS），第一阶段完全聚焦于单机本地磁盘目录管理。
- 暂时不引入图形/短信验证码（作为后续风控扩展演进）。
- 不支持微信网页强制 OAuth 授权绑定，保持纯 Web 链接/二维码无门槛打开。

## Decisions

### 1. 后端架构：FastAPI + SQLAlchemy + SQLite 3 (WAL 模式)
- **选择理由**：Python 3.13 原生异步并发性能优异，FastAPI 自带 Pydantic 数据契约与自动 Swagger 调试；SQLite 启用 WAL (Write-Ahead Logging) 模式可实现读写并发不阻塞，单机轻量化零依赖部署，且利用 openpyxl 导出复杂多 Sheet 透视报表极其方便。
- **替代方案考虑**：Node.js/Express 或 NestJS。虽然前后端统一语言，但在流式分段切片读取和 Excel 交叉透视报表处理上，Python 生态开发效率和维护成本明显占优。

### 2. 前端架构：React 19 + Vite + TailwindCSS + Lucide Icons
- **选择理由**：模块化组件设计极强。通过抽象 `VotingProvider` 统一管理投票配额状态，内部自适应加载 `TextRenderer`、`ImageRenderer` 或 `VideoRenderer`。管理端采用现代 Clean SaaS 设计语言。
- **替代方案考虑**：Vue 3。虽然之前有 Vue 3 原型，但用户明确指定前端技术栈为 React。

### 3. 本地存储结构与视频流分发
- **设计结构**：
  `backend/uploads/tenants/{tenant_id}/{campaign_id}/covers/`
  `backend/uploads/tenants/{tenant_id}/{campaign_id}/videos/`
- **分发机制**：通过 FastAPI 自定义 `StreamingResponse` 解析 `Range` 请求头，返回 `206 Partial Content`，确保移动端拖动进度条时秒播，避免加载整个 30MB+ 文件。单文件上限设为 100MB。

### 4. 投票幂等与一人多票原子性保障
- **身份键生成**：
  - 匿名模式：`identity_key = hash(campaign_id + visitor_id)`
  - 实名扩展模式：`identity_key = hash(campaign_id + dynamic_fields_hash)`
- **唯一约束**：
  `vote_logs` 建立联合唯一索引：`UNIQUE(campaign_id, identity_key, candidate_id) WHERE is_valid = 1`。
- **额度校验**：每次投票在同一个 SQLite 事务中查询该 `identity_key` 的有效票数，若已满 $N$ 票则直接拒绝。

### 5. 实时刷新方案：移动端低频轮询 + 管理端 SSE
- **大众移动端**：投票成功后客户端乐观更新票数，平时每隔 30 秒静默轮询，防止洪峰流量拖垮后端；
- **管理大屏**：通过 `/api/v1/campaigns/{id}/stream` 建立 SSE (Server-Sent Events) 单向长连接，后端有新票入库时由 `asyncio.Queue` 广播，前端配合动画库平滑跳动。

## Risks / Trade-offs

- **[Risk 1: 完全开放下无感刷票]** → **Mitigation**: 客户端指纹 + HttpOnly 加密会话 + IP 滑动窗口限流 + 数据库强唯一性约束。并在后台提供“一键作废作弊票”与票数实时自动重算机制。
- **[Risk 2: SQLite 并发写入冲突]** → **Mitigation**: 开启 `PRAGMA journal_mode=WAL;` 及 `PRAGMA busy_timeout=5000;`，将投票写操作保持极简事务，并发读由只读连接承接。
- **[Risk 3: 手机端大视频导致服务器带宽耗尽]** → **Mitigation**: 严格限制视频大小 $\le$ 100MB，支持断点分片流式请求，前端压缩封面图。
