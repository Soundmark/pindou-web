# 手机端微信登录直开小程序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手机浏览器点“微信登录”直接打开小程序登录确认页，不再弹二维码；桌面端保持扫码弹窗。

**Architecture:** 后端为每次登录生成带一次性 ticket 的微信 URL Link（`https://wxaurl.cn/...`）；前端手机端打开该链接，并用 sessionStorage 记录的 ticket 在原页面轮询；小程序确认页同时识别扫码 `scene` 和链接 `query.ticket`，确认后仍走现有 `/wechat/qr/confirm` → `status` 轮询取 JWT。

**Tech Stack:** Next.js 16 + React 19 + next-intl（web）；Express + node:test + global fetch mock（server）；Taro 4 + React（mini program）。

**Spec:** `docs/superpowers/specs/2026-11-13-mobile-wechat-direct-launch-design.md`

## Global Constraints

- 三个仓库：`D:/github/pindou-web`（pnpm）、`D:/github/pindou/server`（npm）、`D:/github/pindou`（npm/Taro）。
- **不要执行 git commit / push，除非用户明确要求。**
- 手机端失败时不自动回退二维码；桌面端行为不变。
- 所有新增面向用户的 Web 文案必须同时写入 `messages/zh.json` 和 `messages/en.json`。
- Web 样式只用现有黏土配方与 `Button` / `AuthAlert`，不裸写颜色或阴影；触控目标 ≥44px。
- 后端接口沿用「HTTP 恒 200 + `{ success, error }`」约定。
- ticket 生命周期不变：创建后 5 分钟有效，确认后 60 秒内可被网页取走一次。
- URL Link 的生命周期设为 1 天（`expire_type: 1`、`expire_interval: 1`）；真正的登录安全边界仍是 5 分钟 ticket。
- 生成失败（`not_configured` / `wx_link_failed` / `rate_limited`）必须删除已创建的 ticket。
- URL Link 指向 `pages/login-confirm/index`，该页面必须存在于小程序**已发布的 release 版**中（扫码登录已在用同一页面，预期已满足）。

## Review Focus

- **App 内浏览器忽略 `window.open`**：必须同标签跳转，且登录页能靠 sessionStorage 恢复轮询（Task 3 手动验证）。
- **ticket 在拉起/确认期间过期**：小程序提示“登录已过期”，网页清理 pending 并可重新点击（既有 ticket store 单测 + Task 4 手动验证）。
- **小程序页面已在后台且收到新 ticket**：`useDidShow` 必须替换旧 ticket 并重置 `done`，否则会确认旧票（Task 4 手动验证）。
- **微信 `generate_urllink` 报错或 token 40001**：返回 `wx_link_failed`、回滚 ticket，重试一次（Task 1 自动化测试）。
- **二维码与链接共用限流桶**：`link/create` 不能绕过 30 次/IP/10min 的限制（Task 1 限流测试）。

---

### Task 1: 后端 URL Link 生成与路由

**Files:**
- Modify: `D:/github/pindou/server/src/auth/qrLogin.js`
- Modify: `D:/github/pindou/server/src/routes/auth.js`（`/wechat/qr/create` 之后插入新路由）
- Modify: `D:/github/pindou/server/test/qr-login.test.js`

**Interfaces:**
- Consumes: `getWechatToken(cfg)`、`resetTokenCache()`、`QrLoginError`、`resolveEnvVersion(cfg, requested)`、`createTicket()`、`deleteTicket(ticket)`、`CREATE_TTL_MS`、`QR_PAGE`（均为现有导出/内部符号）。
- Produces:
  - `qrLogin.fetchLoginUrlLink(cfg, ticket: string, requestedEnvVersion?: unknown): Promise<string>`
  - `POST /auth/wechat/link/create`，body 可选 `{ envVersion?: "release"|"trial"|"develop" }`；成功 `{ success: true, ticket: string, urlLink: string, expiresIn: 300 }`；失败 `{ success: false, error: "not_configured"|"wx_link_failed"|"rate_limited" }`。

- [ ] **Step 1: 给测试的 fetch mock 增加 `generate_urllink` 默认响应**

在 `test/qr-login.test.js` 的 `defaultHandlers` 返回数组中，`getwxacodeunlimit` 之后加入：

```js
[/generate_urllink/, overrides.urllink || (() =>
  jsonResponse({ errcode: 0, errmsg: 'ok', url_link: 'https://wxaurl.cn/TEST' }))],
```

- [ ] **Step 2: 写失败测试（路由成功 + 参数）**

在 `test/qr-login.test.js` 的 QR 路由测试之后加入：

```js
test('/wechat/link/create：返回 urlLink，query 带 ticket', async () => {
  await withServer(makeConfig(), async (base) => {
    let linkBody = null;
    const handlers = defaultHandlers({
      urllink: (opts) => {
        linkBody = JSON.parse(opts.body);
        return jsonResponse({ errcode: 0, errmsg: 'ok', url_link: 'https://wxaurl.cn/ABC123' });
      },
    });
    await withFetch(handlers, async () => {
      const r = await postJson(base, '/auth/wechat/link/create', {});
      assert.strictEqual(r.body.success, true);
      assert.match(r.body.ticket, /^[0-9a-f]{32}$/);
      assert.strictEqual(r.body.urlLink, 'https://wxaurl.cn/ABC123');
      assert.strictEqual(r.body.expiresIn, 300);
      assert.strictEqual(linkBody.path, 'pages/login-confirm/index');
      assert.strictEqual(linkBody.query, `ticket=${r.body.ticket}`);
      assert.strictEqual(linkBody.expire_type, 1);
      assert.strictEqual(linkBody.expire_interval, 1);
      assert.strictEqual(linkBody.env_version, 'release');

      const s = await getJson(base, `/auth/wechat/qr/status?ticket=${r.body.ticket}`);
      assert.strictEqual(s.body.status, 'pending');
    });
  });
});
```

- [ ] **Step 3: 写失败测试（微信报错回滚 + 40001 重试 + 未配置）**

```js
test('/wechat/link/create：微信报错 → wx_link_failed，且不留下孤儿票', async () => {
  await withServer(makeConfig(), async (base) => {
    const originalCreate = qrLogin.createTicket;
    let captured = '';
    qrLogin.createTicket = (...args) => {
      const r = originalCreate(...args);
      captured = r.ticket;
      return r;
    };
    try {
      const handlers = defaultHandlers({
        urllink: () => jsonResponse({ errcode: 40066, errmsg: 'invalid url' }),
      });
      await withFetch(handlers, async () => {
        const r = await postJson(base, '/auth/wechat/link/create', {});
        assert.strictEqual(r.body.success, false);
        assert.strictEqual(r.body.error, 'wx_link_failed');
        const s = await getJson(base, `/auth/wechat/qr/status?ticket=${captured}`);
        assert.strictEqual(s.body.status, 'expired', '生成失败必须回滚 ticket');
      });
    } finally {
      qrLogin.createTicket = originalCreate;
    }
  });
});

test('/wechat/link/create：40001 清 token 缓存重试一次后成功', async () => {
  await withServer(makeConfig(), async (base) => {
    let tokenCalls = 0;
    let linkCalls = 0;
    const handlers = defaultHandlers({
      token: () => {
        tokenCalls++;
        return jsonResponse({ access_token: `T${tokenCalls}`, expires_in: 7200 });
      },
      urllink: (opts) => {
        linkCalls++;
        if (linkCalls === 1) return jsonResponse({ errcode: 40001, errmsg: 'invalid credential' });
        assert.match(String(opts.url || ''), /access_token=T2/, '重试必须换用新 token');
        return jsonResponse({ errcode: 0, url_link: 'https://wxaurl.cn/RETRY' });
      },
    });
    await withFetch(handlers, async () => {
      const r = await postJson(base, '/auth/wechat/link/create', {});
      assert.strictEqual(r.body.success, true);
      assert.strictEqual(tokenCalls, 2);
      assert.strictEqual(linkCalls, 2);
    });
  });
});

test('/wechat/link/create：未配置小程序凭据 → not_configured，且不发起微信请求', async () => {
  await withServer(makeConfig({ WX_APPID: '', WX_SECRET: '' }), async (base) => {
    await withFetch(
      [[/api\.weixin\.qq\.com/, () => { throw new Error('不应发起微信请求'); }]],
      async () => {
        const r = await postJson(base, '/auth/wechat/link/create', {});
        assert.strictEqual(r.body.success, false);
        assert.strictEqual(r.body.error, 'not_configured');
      }
    );
  });
});
```

- [ ] **Step 4: 扩张现有“限流”测试，验证共用桶**

在 `test('限流：create 30 次/IP/10min，超出 rate_limited')` 的最后一个断言后追加：

```js
// link/create 与二维码共用同一个限流桶，不能另开额度
const linkBlocked = await postJson(base, '/auth/wechat/link/create', {});
assert.strictEqual(linkBlocked.body.error, 'rate_limited');
```

- [ ] **Step 5: 运行测试确认失败**

Run: `cd D:/github/pindou/server && node --test --test-timeout=30000 --test-concurrency=1 test/qr-login.test.js`
Expected: 新用例失败（`/wechat/link/create` 404，或响应无 `urlLink`）。

- [ ] **Step 6: 在 `qrLogin.js` 实现 `postUrlLink` 与 `fetchLoginUrlLink`**

在 `fetchLoginQrcode` 之后新增两个函数，并加入 `module.exports`：

- `postUrlLink(accessToken, ticket, envVersion)`：
  - `POST https://api.weixin.qq.com/wxa/generate_urllink?access_token=${encodeURIComponent(accessToken)}`
  - JSON body 固定为 `{ path: QR_PAGE, query: `ticket=${ticket}`, expire_type: 1, expire_interval: 1, env_version: envVersion || 'release' }`
  - `signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)`
  - 响应解析 JSON；`!res.ok`、`data.errcode` 非 0、或 `typeof data.url_link !== 'string'` 时抛 `new QrLoginError('wx_link_failed', data?.errcode || res.status)`；成功返回 `data.url_link`
- `fetchLoginUrlLink(cfg, ticket, requestedEnvVersion)`：
  - 先 `getWechatToken(cfg)`，为空抛 `new QrLoginError('not_configured')`
  - `resolveEnvVersion(cfg, requestedEnvVersion)` 得到版本
  - 调 `postUrlLink`；捕获 `QrLoginError` 且 `errcode` 为 `40001`/`42001` 时 `resetTokenCache()`、重新取 token（仍为空则 `not_configured`），再调一次
  - 返回 `Promise<string>`
- 更新 `QrLoginError` 的 JSDoc：错误码加 `wx_link_failed`；`message` 从「获取小程序码失败」改为中性的「微信接口调用失败」（现在两种链路共用该类）。

- [ ] **Step 7: 在 `routes/auth.js` 增加路由**

在 `/wechat/qr/create` 的 `});` 之后、`/wechat/qr/status` 之前插入：

- 限流：`hit('qrcreate:ip:' + ipOf(req), RATE_LIMITS.qrCreatePerIp.limit, RATE_LIMITS.qrCreatePerIp.windowMs)`，超限 `rateLimited(res, rl.retryAfterSeconds)`
- `!qrReady()` → `{ success: false, error: 'not_configured' }`
- `const { ticket } = qrLogin.createTicket();`
- `requestedEnvVersion` 与 QR 路由同规则（`typeof (req.body || {}).envVersion === 'string'`）
- 成功后 `{ success: true, ticket, urlLink, expiresIn: Math.round(qrLogin.CREATE_TTL_MS / 1000) }`
- 失败：`qrLogin.deleteTicket(ticket)`，`console.warn('[auth] 小程序 URL Link 生成失败:', e.message)`，返回 `{ success: false, error: e instanceof qrLogin.QrLoginError ? e.code : 'wx_link_failed' }`
- 外层 `try/catch` 用 `next(e)`，与现有路由一致
- 更新文件头三条链路注释，把“小程序码扫码”扩为“小程序码 / URL Link”。

- [ ] **Step 8: 运行单文件测试确认通过**

Run: `cd D:/github/pindou/server && node --test --test-timeout=30000 --test-concurrency=1 test/qr-login.test.js`
Expected: 全部 PASS。

- [ ] **Step 9: 运行后端全量测试**

Run: `cd D:/github/pindou/server && npm test`
Expected: 全部 PASS（无 MySQL 的 DB 用例按现有规则跳过）。

---

### Task 2: Web 类型、客户端、设备判断与移动端启动器

**Files:**
- Modify: `D:/github/pindou-web/src/types/auth.ts`
- Modify: `D:/github/pindou-web/src/lib/auth-client.ts`
- Create: `D:/github/pindou-web/src/utils/device.ts`
- Create: `D:/github/pindou-web/src/lib/wechat-mobile-login.ts`
- Modify: `D:/github/pindou-web/messages/zh.json`
- Modify: `D:/github/pindou-web/messages/en.json`

**Interfaces:**
- Produces:
  - `interface WechatLinkCreateResult { success: true; ticket: string; urlLink: string; expiresIn: number }`
  - `createWechatLink(envVersion?: WechatQrEnvVersion): Promise<WechatLinkCreateResult>`
  - `isMobileBrowser(): boolean`
  - `interface PendingWechatLogin { ticket: string; returnTo: string; expiresAt: number }`
  - `startWechatMiniProgramLogin(returnTo: string): Promise<PendingWechatLogin>`（返回值供调用方立刻开始轮询）
  - `readPendingWechatLogin(): PendingWechatLogin | null`
  - `clearPendingWechatLogin(): void`

- [ ] **Step 1: 增加返回类型**

在 `src/types/auth.ts` 的 `WechatQrCreateResult` 之后加入：

```ts
/** 手机端直开小程序：urlLink 是微信官方 https 短链 */
export interface WechatLinkCreateResult {
  success: true;
  ticket: string;
  urlLink: string;
  /** 链接对应的登录 ticket 有效期（秒） */
  expiresIn: number;
}
```

- [ ] **Step 2: 增加客户端动作**

在 `src/lib/auth-client.ts` 的 `createWechatQr` 之后加入（import 类型时一并加入 `WechatLinkCreateResult`）：

```ts
/** 手机端直开小程序：要一条带 ticket 的微信 URL Link */
export function createWechatLink(envVersion?: WechatQrEnvVersion) {
  return apiFetch<WechatLinkCreateResult>("/auth/wechat/link/create", {
    method: "POST",
    body: envVersion ? { envVersion } : {},
    auth: false,
  });
}
```

- [ ] **Step 3: 新增移动端判断**

Create `src/utils/device.ts`：

```ts
/** iPadOS 13+ 的 Safari 默认伪装成 Macintosh，用触点数补判。 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Mobile/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}
```

- [ ] **Step 4: 新增启动器与 pending 存取**

Create `src/lib/wechat-mobile-login.ts`，行为固定如下：

- `const PENDING_KEY = "pindou.wechat.pending";`
- `startWechatMiniProgramLogin(returnTo)`：
  1. 先同步 `const popup = window.open("", "_blank");`，若存在则 `popup.opener = null;`（保留用户手势，避免异步后被弹窗拦截）
  2. `const r = await createWechatLink();`
  3. `const pending = { ticket: r.ticket, returnTo, expiresAt: Date.now() + r.expiresIn * 1000 }`；`sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))`
  4. `popup && !popup.closed` → `popup.location.replace(r.urlLink)`；否则 `window.location.href = r.urlLink`
  5. 返回 `pending`。**新标签页打开时当前页不会卸载**，调用方靠这个返回值立即开始轮询（见 Task 3）
  6. 任一步失败：`popup?.close()` 后 `throw e`
- `readPendingWechatLogin()`：读 `sessionStorage`，JSON 解析失败、缺字段、`expiresAt <= Date.now()` 时 `removeItem` 并返回 `null`
- `clearPendingWechatLogin()`：`sessionStorage.removeItem(PENDING_KEY)`

- [ ] **Step 5: 增加中英文文案**

`messages/zh.json` 的 `auth` 命名空间：
- `wechatSignIn` 改为 `"使用微信登录"`
- 增加 `"wechatOpening": "正在打开微信…"`
- 增加 `"wechatPendingHint": "已打开小程序，请在小程序中确认登录"`
- `errors` 增加 `"wx_link_failed": "无法打开微信小程序，请重试"`

`messages/en.json`：
- 增加 `"wechatOpening": "Opening WeChat…"`
- 增加 `"wechatPendingHint": "Confirm sign-in in the mini program, then return here."`
- `errors` 增加 `"wx_link_failed": "Couldn't open the WeChat mini program. Please try again."`

- [ ] **Step 6: 类型检查**

Run: `cd D:/github/pindou-web && pnpm exec tsc --noEmit`
Expected: 通过（此时登录页尚未使用新模块，允许无引用）。

---

### Task 3: 登录页手机端直开 + 返回后恢复轮询

**Files:**
- Create: `D:/github/pindou-web/src/hooks/useResumeWechatLogin.ts`
- Modify: `D:/github/pindou-web/src/app/[locale]/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: Task 2 的 `isMobileBrowser`、`startWechatMiniProgramLogin`、`readPendingWechatLogin`、`clearPendingWechatLogin`、`PendingWechatLogin`；现有 `fetchWechatQrStatus`（`@/lib/auth-client`）、`setToken`（`@/lib/api-client`）、`useAuth().refresh`、`useRouter`。
- Produces: `useResumeWechatLogin(): { pending: boolean; resume: (p: PendingWechatLogin) => void }`（`pending` 用于显示提示；`resume` 让新标签页场景在拉起成功后立刻开始轮询）。

- [ ] **Step 1: 创建恢复轮询 hook**

Create `src/hooks/useResumeWechatLogin.ts`，`"use client";`，实现：

- `const [active, setActive] = useState<PendingWechatLogin | null>(null);`
- 挂载 effect：`setActive(readPendingWechatLogin())`（从 bfcache 恢复或页面刷新时读出 pending）
- 轮询 effect（依赖 `active`、`refresh`、`router`；`active` 为空直接返回）：
  - `pending` 即 `active !== null`
  - `const stored = active; let cancelled = false; let inFlight = false;`
  - `poll()`：`inFlight` 防并发；`fetchWechatQrStatus(stored.ticket)`：
    - `status === "confirmed" && token` → `cancelled = true`、`clearPendingWechatLogin()`、`setToken(token)`、`await refresh()`、`router.replace(stored.returnTo)`、`setActive(null)`
    - `status === "expired"` → 清理并 `setActive(null)`
    - 网络异常静默忽略
  - 立即 `void poll()`；`setInterval(poll, 2000)`
  - `document.addEventListener("visibilitychange", ...)`：`document.visibilityState === "visible"` 时立即 `poll()`（后台标签页定时器可能被挂起）
  - 兜底 `setTimeout`：`Math.max(0, stored.expiresAt - Date.now()) + 10_000` 后清理并 `setActive(null)`
  - 清理函数：`cancelled = true`、清 interval/timeout、移除监听
- 返回 `{ pending: active !== null, resume: setActive }`

- [ ] **Step 2: 登录页接入点击分支**

在 `login/page.tsx`：
- import `useResumeWechatLogin`、`startWechatMiniProgramLogin`、`isMobileBrowser`
- 增加状态：`const [wechatLaunching, setWechatLaunching] = useState(false);`、`const [wechatError, setWechatError] = useState<string | null>(null);`
- 增加 `const { pending: wechatPending, resume: resumeWechat } = useResumeWechatLogin();`

新增处理函数（放在 `onSubmit` 之后）：

```ts
async function onWechatPress() {
  if (providers?.wechatMode === "oauth") {
    signIn("wechat", { returnTo });
    return;
  }
  if (!isMobileBrowser()) {
    setQrOpen(true);
    return;
  }
  if (wechatLaunching) return;
  setWechatError(null);
  setWechatLaunching(true);
  try {
    const pending = await startWechatMiniProgramLogin(returnTo);
    // 新标签页打开时本页仍在前台：立刻开始轮询，用户在小程序确认后自动登录
    resumeWechat(pending);
  } catch (e) {
    setWechatError(errorMessage(t, e instanceof ApiError ? e.code : "generic"));
  } finally {
    setWechatLaunching(false);
  }
}
```

微信按钮改为：
- `onClick={() => void onWechatPress()}`
- `disabled={checking || !wechatEnabled || wechatLaunching}`
- 文案 `{wechatLaunching ? t("wechatOpening") : t("wechatSignIn")}`

在微信按钮之后、Google 按钮之前加入：

```tsx
{wechatError && <AuthAlert>{wechatError}</AuthAlert>}
{!wechatError && wechatPending && (
  <p className="text-xs text-text-muted">{t("wechatPendingHint")}</p>
)}
```

- [ ] **Step 3: 补错误码映射**

在登录页 `errorMessage` 的 `known` 数组中加入 `"wx_link_failed"`。

- [ ] **Step 4: 类型检查与 lint**

Run: `cd D:/github/pindou-web && pnpm exec tsc --noEmit && pnpm lint`
Expected: 均通过。

- [ ] **Step 5: 生产构建**

Run: `cd D:/github/pindou-web && pnpm build`
Expected: 构建成功，无 hydration / lint 错误。

- [ ] **Step 6: 手动验证桌面与手机分支**

- 桌面 UA 点微信登录 → 仍打开二维码 Modal，不请求 `/auth/wechat/link/create`
- DevTools 切手机 UA 点微信登录 → 请求 `/auth/wechat/link/create`；成功后 `window.open` 打开 `https://wxaurl.cn/...`；失败（可临时断开后端）时按钮下显示错误，且不弹二维码
- 新标签页打开链接、原登录页保持前台 → 小程序确认后原标签页应自动登录（验证 `resume` 链路）
- 手动向 `sessionStorage['pindou.wechat.pending']` 写入一个真实 ticket 后刷新登录页 → 页面恢复轮询；小程序确认后自动登录并跳回 `returnTo`

---

### Task 4: 小程序确认页同时支持链接 ticket

**Files:**
- Modify: `D:/github/pindou/src/pages/login-confirm/index.tsx`

**Interfaces:**
- Consumes: `useLoad(options)`、`Taro.getEnterOptionsSync().query`、现有 `/auth/wechat/qr/confirm`。
- Produces: 页面识别 `query.ticket`（URL Link）、`query.cq`（预留自定义参数）、`query.scene`（小程序码）三种入口。

- [ ] **Step 1: 增加取票辅助函数**

在文件顶部、组件之外加入：

```ts
/** scene 是 percent-encoded；链接 query 一般是明文。解码失败时原样返回。 */
function decodeTicket(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** 优先级：URL Link 的 ticket → 自定义参数 cq → 小程序码的 scene */
function pickTicket(query?: Record<string, any>): string {
  return (
    decodeTicket(query?.ticket) ||
    decodeTicket(query?.cq) ||
    decodeTicket(query?.scene)
  );
}
```

- [ ] **Step 2: 把 scene 状态改名为 ticket**

- `const [scene, setScene] = useState("")` → `const [ticket, setTicket] = useState("")`
- `const sceneRef = useRef("")` → `const ticketRef = useRef("")`
- `handleConfirm` 中 `scene` → `ticket`、`sceneRef` → `ticketRef`
- 空态文案与按钮 disabled 使用 `ticket`

- [ ] **Step 3: useLoad 走统一取票**

```ts
useLoad((options) => {
  trackPageView("pages/login-confirm/index");
  const t = pickTicket(options);
  if (t) {
    ticketRef.current = t;
    setTicket(t);
  }
});
```

- [ ] **Step 4: useDidShow 支持热启动换票**

替换现有 `useDidShow` 为：

```ts
useDidShow(() => {
  const t = pickTicket(Taro.getEnterOptionsSync()?.query);
  if (t && t !== ticketRef.current) {
    ticketRef.current = t;
    setTicket(t);
    doneRef.current = false;
    setDone(false);
    setErrMsg("");
  }
});
```

- [ ] **Step 5: 把“二维码”文案改为通用“登录”文案**

- 过期错误：`"登录已过期，请回到网页重新发起登录"`
- 过期 toast：`"登录已过期"`
- 空态：`"登录信息无效，请回到网页重新发起登录"`
- 顶部注释改为“网页登录确认页（小程序码 / URL Link 进入）”

- [ ] **Step 6: 构建验证**

Run: `cd D:/github/pindou && npm run build:weapp:server`
Expected: 构建成功，无 TypeScript 错误。

- [ ] **Step 7: 微信开发者工具手动验证**

- 页面参数分别传 `ticket=<32hex>`、`cq=<32hex>`、`scene=<32hex>`，三种都能进入确认态
- 页面已在后台时换一个新 ticket 重新进入 → 页面显示新票、`done` 复位
- 确认后回到网页 → Web 轮询拿到 JWT 并跳转

---

### Task 5: 三端联调验收

**Files:** 无代码改动。

- [ ] **Step 1: 后端全量测试** — `cd D:/github/pindou/server && npm test` 全 PASS
- [ ] **Step 2: Web 构建** — `cd D:/github/pindou-web && pnpm build` 成功
- [ ] **Step 3: 小程序构建** — `cd D:/github/pindou && npm run build:weapp:server` 成功
- [ ] **Step 4: 真机验收**：
  - 手机 Safari/Chrome 打开站点 → 点微信登录 → 直接拉起小程序（无二维码弹窗）→ 小程序点确认 → 返回浏览器自动登录
  - 微信内打开站点 → 点微信登录 → 经微信官方 H5 中间页拉起小程序 → 确认后返回网页自动登录
  - 桌面浏览器 → 仍弹二维码，扫码登录不回归
  - 手机端点登录后不确认、返回网页 → 页面提示仍可重新点击；ticket 过期后提示消失
- [ ] **Step 5: 记录结果**：把实际验收结果（成功/失败与失败现象）汇报给用户；不要自行 commit。
