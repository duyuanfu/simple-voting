# Universal Voting Platform (通用多活动多模板投票平台)

基于 **React 18 + Vite + TailwindCSS** 与 **Python 3.13 + FastAPI + SQLite (WAL)** 构建的多租户通用投票系统。

---

## 🌟 核心特性与架构

1. **多租户 SaaS 账户体系**：
   - 租户在前端自主注册与登录，JWT Bearer 鉴权，全量数据与本地磁盘资源逻辑隔离。
2. **三大场景模板引擎**：
   - 🎬 **短视频竞赛模板**：自适应移动端网格，模态播放器秒播（支持 HTTP 206 断点续传），观影后即时单投。
   - 🖼️ **图文展示模板**：摄影作品/海报大图预览瀑布流，支持多选与底部常驻批量投票条。
   - 📝 **文字评选模板**：先进人物标兵、优秀事迹长文折叠排版，支持多选与批量投票。
3. **4.A 票制规则与动态表单**：
   - 每人全周期至多投 $N$ 票，且不可重复支持同一项目。
   - 动态自定义身份收集字段（姓名、所属支行/机构下拉菜单、工号等）。
4. **全方位防刷风控网**：
   - 客户端 FingerprintJS 无感设备指纹。
   - 滑动窗口单 IP 突发限流 + 每日出口 IP 总量上限保护。
   - 数据库原子级事务约束，防止并发重复投票与超额刷票。
5. **管理与实时数据中心**：
   - 基于 **Server-Sent Events (SSE)** 的实时监控大屏，票数与排名无感动态翻牌跳动。
   - 完整投票审计流水日志，支持“一键作废作弊票”并自动扣减票数。
   - 一键生成多 Sheet 的标准 Excel 报表（排名榜单、机构交叉透视矩阵、投票流水明细）。

---

## 🚀 本地启动指南

### 1. 启动后端 API 服务
```bash
cd backend
# 如未安装依赖可运行: pip install -r requirements.txt
python main.py
```
> 后端服务运行在: `http://localhost:8001`
> Swagger 交互式接口文档: `http://localhost:8001/api/v1/docs`

### 2. 启动前端 Web 界面
打开另一个终端窗口：
```bash
cd frontend
npm run dev
```
> 前端界面访问地址: `http://localhost:5173`

---

## 🔑 预置体验账号与样例活动

运行 `python backend/seed.py` 已预置以下开箱即用数据：

- **租户管理员账号**：`admin`
- **租户登录密码**：`dyf5970@`
- **管理后台入口**：[http://localhost:5173/admin/campaigns](http://localhost:5173/admin/campaigns)

### 预置活动专属访问通道（直接在浏览器或手机打开体验）：
1. 🎬 **法治合规短视频竞赛活动**：[http://localhost:5173/v/video001](http://localhost:5173/v/video001)
   - 包含 5 个真实合规短视频，实名选送支行模式，一人一票即时单投。
2. 🖼️ **职工摄影风采摄影大赛**：[http://localhost:5173/v/photo002](http://localhost:5173/v/photo002)
   - 包含 5 个摄影卡片，一人 3 票，多选批量提交。
3. 📝 **合规服务标兵先进个人评选**：[http://localhost:5173/v/hero003](http://localhost:5173/v/hero003)
   - 包含 3 位候选人详细事迹，一人 2 票。
