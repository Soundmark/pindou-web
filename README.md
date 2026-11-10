# Pindou Web —— 拼豆图纸创作器

Next.js 16（App Router）+ React 19 + Tailwind CSS v4 + React Query。
把照片转换成拼豆（Perler / Hama / Artkal）图案，支持底图涂色与空白画布。

**后端不在本仓库**：所有数据与登录都走 `D:\github\pindou\server`
（Express + MySQL 8 + 阿里云 OSS）。本仓库只剩前端页面与算法。

## 本地开发

### 1. 起后端

```bash
cd D:/github/pindou/server
docker compose up -d
npm run init-db
npm run dev          # 默认 3000；建议 PORT=3100 避开前端
```

### 2. 起前端

在项目根目录新建 `.env.local`（**不入库**）：

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3100
```

> ⚠️ `NEXT_PUBLIC_*` 是**构建期内联**的：CI / 生产构建必须把它作为环境变量注入，
> 改完要重新构建。没配置时请求会抛 `missing_api_base`，不会静默打到同源 `/api`。

```bash
pnpm install
pnpm dev             # http://localhost:3000
```

如果本机没有 MySQL / 不想起本地后端，可以用启动脚本直接选后端：

```bash
pnpm dev             # 交互选择：云端 / 本地 / 自定义地址
pnpm dev:cloud       # 直连云端 https://fittingprogress.top/pindou
pnpm dev:local       # 直连本地 http://127.0.0.1:3100
```

> 切换后端必须重启 dev（`NEXT_PUBLIC_*` 在启动时内联）。脚本启动前会探测
> `/auth/providers`，直接告诉你微信扫码登录是否可用。
> ⚠️ 云端是生产环境：创建 / 发布图纸会写入线上数据。

### 3. 没有微信 / Google 凭据时怎么登录

用服务端现成的 H5 设备登录拿 token：

```bash
curl -X POST http://127.0.0.1:3100/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"platform":"h5","code":"e2e-user-device-0001"}'
```

把返回的 `token` 写进浏览器 `localStorage['pindou.auth.token']`，刷新即可。
管理员：服务端 `ADMIN_UIDS=h5_e2e-admin-device-0001`。

## 登录流程

- 微信（开放平台「网站应用」扫码）与 Google 都由后端完成 OAuth；
  前端只跳转 `${API}/auth/<provider>/start`，回调落 `/<locale>/auth/callback#ticket=...`，
  再用 `POST /auth/exchange` 换正式 JWT。
- 登录态存 `localStorage`，所有请求带 `Authorization: Bearer <JWT>`；
  401 时全局清 token 并切回未登录。
- 微信身份按 `unionid` 与小程序账号同步；Google 是独立账号。

## 数据形态

- 后端**不存像素**：图纸内容是 OSS 上的 ZIP（`pattern.json`），
  详情页/编辑器按 `fileURL` 下载后还原成 `pixels: number[][]`。
- `pixels` 里的 `-1` 表示空格子（不贴珠）。
- 上传走 OSS PostObject 直传（`POST /storage/policy` 拿表单凭证），见 `src/lib/oss-upload.ts`。

## 规范

开发约定见 [CLAUDE.md](CLAUDE.md)：响应式（375px 起）、next-intl 字典、
黏土风设计令牌、Canvas 配色同步等。

## 校验

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

E2E（Playwright）必须通过 `e2e-test-workflow` 插件生成/修改，跑测试用 `pnpm test:e2e`。
