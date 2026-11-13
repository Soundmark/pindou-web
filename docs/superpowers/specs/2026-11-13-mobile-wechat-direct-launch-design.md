# 手机端微信登录直开小程序设计

日期：2026-11-13
状态：已批准（对话中确认）

## 意图

手机浏览器访问站点时，不再展示小程序码弹窗。点“微信登录”直接拉起微信并打开小程序登录确认页；桌面端保持现有扫码弹窗。

## 目标

- 手机浏览器（含微信内打开的网页）点击微信登录 → 直接打开小程序，无二维码弹窗。
- 复用现有 ticket + 轮询机制，小程序确认后网页拿 JWT。
- 桌面端行为不变。
- 拉起失败时在按钮下方显示错误并可重试，不自动回退二维码。

## 非目标

- 不改密码登录、Google OAuth、开放平台网页 OAuth。
- 不做小程序内免确认登录（仍保留用户手动点“确认登录”）。
- 不对桌面端做 URL Link 拉起。

## 约束

- URL Link 仅对**非个人主体**小程序开放；本项目主体为个体工商户，符合。
- 只能为**已发布**的小程序生成链接；小程序已上线。
- 链接最长 30 天有效；登录 ticket 仍为 5 分钟，安全边界不变。
- 生成端每天 50 万条、打开端每天 600 万次上限，登录量级足够。
- 微信外打开 URL Link 走官方 H5 中间页；微信内会自动转为开放标签打开。

## 方案对比

1. **URL Link（选用）**：`https://wxaurl.cn/...`，微信内外均可打开，https 链接不受浏览器 scheme 拦截影响；支持 `path` + `query` 带 ticket。
2. URL Scheme：`weixin://dl/business/?t=...`，仅微信外；iOS 可能弹系统确认，部分浏览器限制直接跳转，兼容性差。
3. 继续二维码：手机端体验差（同机扫码/长按识别），不符合本次需求。

## 设计

### 后端（`D:/github/pindou/server`）

- `src/auth/qrLogin.js` 新增 `fetchLoginUrlLink(cfg, ticket, requestedEnvVersion)`：
  - 复用 `getWechatToken` 与 40001/42001 清缓存重试逻辑。
  - 调 `POST https://api.weixin.qq.com/wxa/generate_urllink`，body：
    `{ path: 'pages/login-confirm/index', query: 'ticket=<ticket>', expire_type: 1, expire_interval: 1, env_version }`。
  - 失败抛 `QrLoginError('wx_link_failed', errcode)`。
- `src/routes/auth.js` 新增 `POST /auth/wechat/link/create`：
  - 与 `/wechat/qr/create` 共用 `qrcreate:ip:<ip>` 限流桶。
  - `qrReady()` 未配置 → `not_configured`。
  - 返回 `{ success, ticket, urlLink, expiresIn: 300 }`；生成失败删除 ticket。
- 测试：`test/qr-login.test.js` 增加 URL Link 路由用例（成功、微信错误码、token 失效重试、not_configured）。

### Web（`D:/github/pindou-web`）

- `src/lib/auth-client.ts` 新增 `createWechatLink()`；`src/types/auth.ts` 增加返回类型。
- 新增 `src/utils/device.ts`：`isMobileBrowser()`（UA 判断；iPad/iPadOS 也按移动端处理）。
- 登录页点击逻辑：
  - `wechatMode === 'oauth'` → 维持现有跳转。
  - 桌面 → 现有二维码弹窗。
  - 手机 → 调 `createWechatLink()`；把 `{ticket, returnTo, expiresAt}` 写入 `sessionStorage['pindou.wechat.pending']`；优先 `window.open` 打开链接（同步开空白页，异步取链接后赋值），被拦截则同标签跳转。
- 登录页挂载时读取 pending ticket 并恢复轮询；`visibilitychange` 回到前台立即补查；confirmed → `setToken` + `refresh` + 跳 `returnTo`；过期则清理。
- 新增中英文文案：`wechatOpening`、`wechatPendingHint`、`errors.wx_link_failed`。
- 二维码弹窗仅在桌面端触发；手机端失败时只显示错误 + 重试。

### 小程序（`D:/github/pindou`）

- `src/pages/login-confirm/index.tsx`：
  - 新增统一取票函数：依次读 `query.ticket`、`query.cq`、`query.scene`，`decodeURIComponent` 安全解码。
  - `useLoad` 与 `useDidShow` 都使用该函数；热启动时若拿到不同 ticket，重置 `done`/错误状态，支持再次点击链接登录。
  - 过期/无效文案从“二维码”改为通用“登录已过期/无效，请回到网页重新发起”。
- 保留手动确认按钮与现有 `confirm` 接口。

## 风险

- 个别 App 内浏览器可能忽略 `window.open` 或拦截 URL Link；sessionStorage 恢复轮询作为兜底。
- 微信内打开 URL Link 会先经过官方 H5 中间页，多一次跳转，属预期行为。
- 若微信侧对个体工商户主体实际拦截，错误会以 `wx_link_failed` 暴露；届时回退方案为保留手机端二维码入口（本次不做）。
