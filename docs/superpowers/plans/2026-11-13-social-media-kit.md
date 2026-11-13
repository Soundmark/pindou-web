# 社交媒体素材包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理员在图纸详情页可预览并下载封面图、带水印与图例的图纸图，以及由大模型生成的小红书文案（标题/内容分开复制）。

**Architecture:** 图片全部在浏览器端用 Canvas 生成（不新增服务端图像依赖）；后端仅新增一个管理员专用的 OpenAI 兼容文案接口，挂在现有 `POST /api/ai` 的 `socialCopy` action 下；前端用现有 `Modal` + React Query 完成预览、重试与下载/复制。后端是独立仓库 `/Volumes/mystorage/github/pindou/server`。

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4 / React Query v5 / Canvas 2D / Express + Node `https` / node:test。

**Spec:** `docs/superpowers/specs/2026-11-13-social-media-kit-design.md`

## Global Constraints

- 前端不新增运行时依赖；后端不新增依赖。
- 图片只在浏览器生成；不得引入 node-canvas 或把出图搬到服务端。
- 组件内禁止裸写十六进制色值/box-shadow；Canvas 颜色统一从 `src/utils/canvasTheme.ts` 取，且该文件需注明与 `globals.css` 的同步关系。
- Canvas 内绘制文字不翻译（固定中文/品牌字样）；弹窗 UI 文案必须走 `messages/{zh,en}.json` 的 `socialKit` 命名空间。
- 导航/路由只用 `@/i18n/navigation`；触控目标 ≥44px（`h-11` / `min-h-11`）。
- 后端响应恒为 HTTP 200 + `{ success, error? }`；管理员判定用 `isAdmin(cfg.adminUids, uid)`。
- 后端测试只运行新文件 `node --test test/social-copy.test.js` 与 `node --test test/config.test.js`；完整 `npm test` 需要本地 MySQL，本机不可用。
- **不执行 git commit / push**，除非用户明确要求。
- 前端验证命令：`npx tsc --noEmit`、`npx eslint <改动文件>`、`npm run build`。

## Review Focus

1. **文案上游未配置/超时/返回非法 JSON** → 弹窗应显示可重试的错误态，而不是空白或永久 loading；后端必须把上游异常转成 `upstream_failed`，不冒泡成 500。
2. **大网格（>125×125）出图** → 色号自动省略、画布任一边不超过 4096px、生成不崩溃。
3. **图纸名含 `/ \ : * ? " < > |` 或超长** → 下载文件名合法、保留 `.png` 扩展名、不过长。
4. **非管理员/未配置管理员** → 文案接口返回 `forbidden` / `owner_not_configured`；前端只显示映射后的字典文案，不泄露上游细节。
5. **弹窗反复打开/关闭** → 每次打开只生成一次；关闭时 revoke 所有 object URL，不泄漏。
6. **标签为空或超过 6 个** → 封面不溢出、不报错。

---

## Task 1: 后端新增文案大模型配置

**Files:**
- Modify: `/Volumes/mystorage/github/pindou/server/src/config.js:229-232`
- Modify: `/Volumes/mystorage/github/pindou/server/.env.example:105-107`
- Test: `/Volumes/mystorage/github/pindou/server/test/config.test.js`

**Interfaces:**
- Produces: `cfg.copyLlm = { apiUrl: string; apiKey: string; model: string }`，三项任一为空字符串即视为未配置。

- [ ] **Step 1: 在 `test/config.test.js` 末尾追加失败测试**

```js
test('文案大模型配置可装载，缺省为空字符串', () => {
  const cfg = loadConfig(baseEnv({
    COPY_LLM_API_URL: 'https://api.deepseek.com',
    COPY_LLM_API_KEY: 'sk-test',
    COPY_LLM_MODEL: 'deepseek-chat',
  }));
  assert.deepStrictEqual(cfg.copyLlm, {
    apiUrl: 'https://api.deepseek.com',
    apiKey: 'sk-test',
    model: 'deepseek-chat',
  });

  const empty = loadConfig(baseEnv());
  assert.deepStrictEqual(empty.copyLlm, { apiUrl: '', apiKey: '', model: '' });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Volumes/mystorage/github/pindou/server && node --test test/config.test.js`
Expected: FAIL —— `cfg.copyLlm` 为 `undefined`。

- [ ] **Step 3: 在 `src/config.js` 的 `img2img` 冻结对象之后新增**

```js
    /** 社交媒体文案大模型（OpenAI 兼容 /chat/completions）。三项任一为空即未配置。 */
    copyLlm: Object.freeze({
      apiUrl: String(cfg.COPY_LLM_API_URL || '').trim().replace(/\/+$/, ''),
      apiKey: String(cfg.COPY_LLM_API_KEY || '').trim(),
      model: String(cfg.COPY_LLM_MODEL || '').trim(),
    }),
```

- [ ] **Step 4: 在 `.env.example` 的 AI 生图段之后追加**

```bash
# ---- 社交媒体文案大模型（OpenAI 兼容 /chat/completions）----
COPY_LLM_API_URL=
COPY_LLM_API_KEY=
COPY_LLM_MODEL=
```

- [ ] **Step 5: 重新运行测试确认通过**

Run: `cd /Volumes/mystorage/github/pindou/server && node --test test/config.test.js`
Expected: PASS。

---

## Task 2: 后端文案服务（校验 / 提示词 / 解析 / 上游调用）

**Files:**
- Create: `/Volumes/mystorage/github/pindou/server/src/services/socialCopy.js`
- Test: `/Volumes/mystorage/github/pindou/server/test/social-copy.test.js`

**Interfaces:**
- Consumes: `cfg.copyLlm`（Task 1）、`cfg.adminUids`、`isAdmin(cfg.adminUids, uid)`、`httpsPost(url, body, headers, timeoutMs)`。
- Produces:
  - `validateInput(event) => { data } | { error: 'invalid_input' }`，`data = { name, width, height, colorCount, beadCount, tags }`。
  - `buildMessages(data) => Array<{ role: 'system' | 'user'; content: string }>`。
  - `parseContent(raw) => { title, content } | null`。
  - `handleSocialCopy(cfg, uid, event, deps?) => Promise<{ success: true; title; content } | { success: false; error }>`；`deps.post` 可注入，默认 `httpsPost`。
  - `_resetRateLimit() => void`（仅供测试）。
  - 错误码：`owner_not_configured` / `forbidden` / `invalid_input` / `ai_not_configured` / `rate_limited` / `upstream_failed`。

- [ ] **Step 1: 写失败测试 `test/social-copy.test.js`**

```js
const test = require('node:test');
const assert = require('node:assert');

const {
  validateInput,
  parseContent,
  handleSocialCopy,
  _resetRateLimit,
} = require('../src/services/socialCopy');

function makeCfg(overrides = {}) {
  return {
    adminUids: new Set(['admin-1']),
    copyLlm: { apiUrl: 'https://llm.test/v1', apiKey: 'sk-test', model: 'test-model' },
    ...overrides,
  };
}

const VALID_EVENT = {
  name: '小熊拼豆',
  width: 32,
  height: 32,
  colorCount: 12,
  beadCount: 640,
  tags: ['动物', '可爱'],
};

function fakePost(response) {
  const calls = [];
  const fn = async (url, body, headers, timeout) => {
    calls.push({ url, body: JSON.parse(body), headers, timeout });
    if (response instanceof Error) throw response;
    return response;
  };
  fn.calls = calls;
  return fn;
}

const OK_RESPONSE = {
  choices: [{ message: { content: '{"title":"超可爱小熊拼豆","content":"正文内容 #拼豆 #手工"}' } }],
};

test.beforeEach(() => _resetRateLimit());

test('管理员请求成功：URL、鉴权头、JSON 解析都正确', async () => {
  const post = fakePost(OK_RESPONSE);
  const res = await handleSocialCopy(makeCfg(), 'admin-1', VALID_EVENT, { post });
  assert.deepStrictEqual(res, {
    success: true,
    title: '超可爱小熊拼豆',
    content: '正文内容 #拼豆 #手工',
  });
  assert.strictEqual(post.calls[0].url, 'https://llm.test/v1/chat/completions');
  assert.strictEqual(post.calls[0].headers.Authorization, 'Bearer sk-test');
  assert.strictEqual(post.calls[0].body.model, 'test-model');
  assert.strictEqual(post.calls[0].timeout, 30000);
});

test('非管理员返回 forbidden', async () => {
  const res = await handleSocialCopy(makeCfg(), 'user-2', VALID_EVENT, { post: fakePost(OK_RESPONSE) });
  assert.deepStrictEqual(res, { success: false, error: 'forbidden' });
});

test('未配置管理员返回 owner_not_configured', async () => {
  const res = await handleSocialCopy(makeCfg({ adminUids: new Set() }), 'admin-1', VALID_EVENT);
  assert.deepStrictEqual(res, { success: false, error: 'owner_not_configured' });
});

test('大模型未配置返回 ai_not_configured', async () => {
  const res = await handleSocialCopy(
    makeCfg({ copyLlm: { apiUrl: '', apiKey: '', model: '' } }),
    'admin-1',
    VALID_EVENT
  );
  assert.deepStrictEqual(res, { success: false, error: 'ai_not_configured' });
});

test('非法入参返回 invalid_input', async () => {
  for (const bad of [
    { ...VALID_EVENT, name: '' },
    { ...VALID_EVENT, width: 0 },
    { ...VALID_EVENT, height: 501 },
    { ...VALID_EVENT, beadCount: -1 },
    { ...VALID_EVENT, colorCount: 2000 },
  ]) {
    const res = await handleSocialCopy(makeCfg(), 'admin-1', bad, { post: fakePost(OK_RESPONSE) });
    assert.deepStrictEqual(res, { success: false, error: 'invalid_input' });
  }
});

test('入参会截断超长名称与标签', () => {
  const { data } = validateInput({
    ...VALID_EVENT,
    name: 'x'.repeat(80),
    tags: Array.from({ length: 15 }, (_, i) => `tag-${i}`.repeat(5)),
  });
  assert.strictEqual(data.name.length, 50);
  assert.strictEqual(data.tags.length, 10);
  assert.ok(data.tags.every((t) => t.length <= 20));
});

test('围栏 JSON 也能解析', () => {
  assert.deepStrictEqual(
    parseContent('```json\n{"title":"标题","content":"内容"}\n```'),
    { title: '标题', content: '内容' }
  );
});

test('非法 JSON 返回 null', () => {
  assert.strictEqual(parseContent('不是 JSON'), null);
  assert.strictEqual(parseContent('{"title":"","content":""}'), null);
  assert.strictEqual(parseContent(null), null);
});

test('上游异常返回 upstream_failed，并清除限流以便重试', async () => {
  const res = await handleSocialCopy(makeCfg(), 'admin-1', VALID_EVENT, {
    post: fakePost(new Error('timeout')),
  });
  assert.deepStrictEqual(res, { success: false, error: 'upstream_failed' });

  const retry = await handleSocialCopy(makeCfg(), 'admin-1', VALID_EVENT, { post: fakePost(OK_RESPONSE) });
  assert.strictEqual(retry.success, true);
});

test('5 秒内重复请求返回 rate_limited', async () => {
  const post = fakePost(OK_RESPONSE);
  await handleSocialCopy(makeCfg(), 'admin-1', VALID_EVENT, { post });
  const res = await handleSocialCopy(makeCfg(), 'admin-1', VALID_EVENT, { post });
  assert.deepStrictEqual(res, { success: false, error: 'rate_limited' });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Volumes/mystorage/github/pindou/server && node --test test/social-copy.test.js`
Expected: FAIL —— `Cannot find module '../src/services/socialCopy'`。

- [ ] **Step 3: 创建 `src/services/socialCopy.js`**

实现下列函数，签名见 Interfaces：

- `validateInput(event)`：`name` 去空白后截断 50；`width/height` 必须为 1–500 的整数；`colorCount/beadCount` 必须为 0–`width*height` 的整数；`tags` 只保留字符串，去空白，截断 20 字符，最多 10 个。
- `buildMessages(data)`：`system` 角色为「你是小红书手工/拼豆类内容编辑」；`user` 内容包含 `data` 各字段，要求：标题 ≤20 字且带 1 个 emoji；正文 100–200 字、口语化、突出 DIY 与成品效果；末尾 3–6 个话题标签；不编造品牌/价格/活动；**只输出 JSON** `{"title":"...","content":"..."}`。
- `parseContent(raw)`：仅接受字符串；去掉首尾空白与 ```json 围栏；`JSON.parse` 失败时截取第一个 `{` 到最后一个 `}` 再试；`title`/`content` 必须是非空字符串，`title` 截断 100、`content` 截断 2000；否则返回 `null`。
- `handleSocialCopy(cfg, uid, event, deps = {})`：按 Interfaces 顺序做管理员 → 入参 → 配置 → 限流（模块级 `Map<uid, timestamp>`，5 秒）检查；请求体 `{ model, temperature: 0.9, max_tokens: 600, response_format: { type: 'json_object' }, messages }`；成功返回 `{ success: true, ...parsed }`；上游抛错或解析失败先 `lastRequestAt.delete(uid)` 再返回 `upstream_failed`。
- 仅导出 `validateInput / buildMessages / parseContent / handleSocialCopy / _resetRateLimit`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Volumes/mystorage/github/pindou/server && node --test test/social-copy.test.js`
Expected: PASS（全部用例）。

---

## Task 3: 后端路由挂载 `socialCopy`

**Files:**
- Modify: `/Volumes/mystorage/github/pindou/server/src/routes/ai.js:12-25`
- Test: `/Volumes/mystorage/github/pindou/server/test/social-copy.test.js`

**Interfaces:**
- Consumes: `handleSocialCopy(cfg, uid, event)`（Task 2）。
- Produces: `POST /api/ai` 的 `{ action: 'socialCopy' }` 分支；未配置时返回 `{ success: false, error: 'ai_not_configured' }`。

- [ ] **Step 1: 在测试文件末尾追加路由分发测试**

```js
const express = require('express');
const http = require('node:http');
const { createAiRouter } = require('../src/routes/ai');

test('POST /api/ai socialCopy 能分发到文案服务', async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { uid: 'admin-1' };
    next();
  });
  // ai_not_configured 证明请求确实进了 socialCopy，而不是 unknown_action
  app.use(createAiRouter(makeCfg({ copyLlm: { apiUrl: '', apiKey: '', model: '' } })));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'socialCopy', ...VALID_EVENT }),
  });
  const json = await res.json();
  await new Promise((resolve) => server.close(resolve));
  assert.deepStrictEqual(json, { success: false, error: 'ai_not_configured' });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Volumes/mystorage/github/pindou/server && node --test test/social-copy.test.js`
Expected: 新用例 FAIL —— 返回 `unknown_action`。

- [ ] **Step 3: 修改 `src/routes/ai.js`**

文件顶部新增 `const socialCopy = require('../services/socialCopy');`；在 `switch` 中 `case 'history'` 之后新增：

```js
        case 'socialCopy':
          return res.json(await socialCopy.handleSocialCopy(cfg, uid, event));
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `cd /Volumes/mystorage/github/pindou/server && node --test test/social-copy.test.js && node --test test/config.test.js`
Expected: 两个文件全部 PASS。

---

## Task 4: 前端主题令牌与 Canvas 字体

**Files:**
- Modify: `src/utils/canvasTheme.ts`

**Interfaces:**
- Produces:
  - `SOCIAL_THEME`：`background / card / border / borderStrong / ink / textPrimary / textSecondary / textMuted / primary / primaryLight / primaryStrong / pillBg / watermarkColor / watermarkText`（全部为字符串常量）。
  - `getCanvasFontFamily() => string`：读取 `--font-nunito` / `--font-fredoka` 的实际 family，取不到时回退 `'"PingFang SC", "Microsoft YaHei", sans-serif'`。

- [ ] **Step 1: 在 `canvasTheme.ts` 末尾新增令牌**

颜色值必须与 `globals.css` `@theme inline` 一一对应并在注释里标明来源：

```ts
export const SOCIAL_THEME = {
  background: "#fdf8f3",   // --color-background
  card: "#ffffff",         // --color-card-bg
  border: "#f2d6d9",       // --color-clay-border
  borderStrong: "#ecc3c9", // --color-clay-border-strong
  ink: "#4a2430",          // --color-primary-ink
  textPrimary: "#4a3436",  // --color-text-primary
  textSecondary: "#7a5f5c",// --color-text-secondary
  textMuted: "#a08a86",    // --color-text-muted
  primary: "#ff8fa3",      // --color-primary
  primaryLight: "#ffc9d4", // --color-primary-light
  primaryStrong: "#c73a58",// --color-primary-strong
  pillBg: "#fff0f4",       // 主粉的浅色底（封面数据胶囊）
  watermarkColor: "rgba(74, 36, 48, 0.10)",
  watermarkText: "拼豆屋",
} as const;

export function getCanvasFontFamily(): string {
  if (typeof document === "undefined") return '"PingFang SC", "Microsoft YaHei", sans-serif';
  const root = getComputedStyle(document.documentElement);
  const families = ["--font-nunito", "--font-fredoka"]
    .map((name) => root.getPropertyValue(name).trim())
    .filter(Boolean);
  return [...families, '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"].join(", ");
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 0 error。

---

## Task 5: 扩展 `renderPatternToCanvas`（图例 / 水印 / 内边距 / 色号开关）

**Files:**
- Modify: `src/utils/patternRenderer.ts:149-205`
- Modify: `src/utils/imageExport.ts:19-37`（仅确认现有调用仍编译，不改行为）

**Interfaces:**
- Produces:
  - `export interface PatternRenderOptions { showLabels?: boolean; legend?: boolean; watermark?: string; padding?: number; }`
  - `renderPatternToCanvas(pixels: number[][], canvas: HTMLCanvasElement, cellSize?: number, options?: PatternRenderOptions): void`
  - 默认行为保持不变：`cellSize = 20`、显示色号、无图例、无水印、`padding = 0`。
  - 图例区：标题 `${colorCount} 种颜色 · ${beadCount} 颗豆子`，条目 `A01 ×123`，按可用宽度分列（列宽 170px，行高 26px）。
  - 水印只覆盖图纸区域，平铺旋转 -30°，颜色 `SOCIAL_THEME.watermarkColor`。

- [ ] **Step 1: 修改签名与实现**

新增 `options` 解构默认值 `{ showLabels = true, legend = false, watermark, padding = 0 }`。实现要点：

- 画布宽 `w * cellSize + padding * 2`；高 `h * cellSize + padding * 2 + legendHeight`。
- 图纸左上角从 `(padding, padding)` 开始。
- 现有“色号居中”逻辑改为 `showLabels && cellSize >= 16`（与查看器阈值一致）。
- `legend` 为 true 时，在图下方绘制分隔线、统计标题与图例条目；条目色块 14×14，文字 `11px`。
- `watermark` 非空时，在图纸矩形内 `ctx.save()` → `translate` 到中心 → `rotate(-30°)` → 平铺文字（字号 `max(18, min(42, cellSize * 1.2))`）→ `restore()`。
- 网格线、每 5 格粗线、空格留白逻辑保持不变，只是坐标系加上 `padding`。

- [ ] **Step 2: 类型检查与 lint**

Run: `npx tsc --noEmit && npx eslint src/utils/patternRenderer.ts src/utils/imageExport.ts`
Expected: 0 error。

---

## Task 6: 封面 / 图纸渲染工具

**Files:**
- Create: `src/utils/socialKitRenderer.ts`

**Interfaces:**
- Consumes: `BEAD_PALETTE`、`SOCIAL_THEME`、`getCanvasFontFamily()`、`renderPatternToCanvas(..., { legend: true, watermark, padding: 24 })`。
- Produces:
  - `export interface PatternColorStat { index: number; id: string; hex: string; count: number }`
  - `export interface PatternStats { beadCount: number; colorCount: number; entries: PatternColorStat[] }`
  - `computePatternStats(pixels: number[][]): PatternStats`（跳过 `-1`，按数量降序）。
  - `export interface SocialCoverMeta { name: string; width: number; height: number; tags: string[] }`
  - `renderSocialCover(pixels: number[][], meta: SocialCoverMeta, canvas: HTMLCanvasElement): void`（1080×1440）。
  - `renderSocialPattern(pixels: number[][], canvas: HTMLCanvasElement): void`。
  - `downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void>`。
  - `sanitizeFilename(name: string): string`。

- [ ] **Step 1: 实现 `computePatternStats` 与 `sanitizeFilename`**

- 统计：遍历 `pixels`，`id < 0` 跳过；`BEAD_PALETTE[id]` 不存在也跳过；按 index 累计次数，输出 `entries` 按 `count` 降序。
- `sanitizeFilename`：替换 `[\\/:*?"<>|\x00-\x1f]` 为 `_`，压缩连续空白为单个空格，去首尾空格与首尾点，空结果用 `"pattern"`，最多 80 字符。

- [ ] **Step 2: 实现封面**

固定 1080×1440。使用 `SOCIAL_THEME` 与 `getCanvasFontFamily()`，按以下顺序绘制：

1. 背景 `SOCIAL_THEME.background`；四角各 1–2 个低透明度糖果色圆点（`primaryLight` / `primary`）。
2. 顶部品牌栏（y=84）：3×3 珠子 Logo + `拼豆屋`，右侧 `拼豆图纸` 胶囊。
3. 标题：`meta.name`，粗体 68px，`SOCIAL_THEME.ink`，最多两行，按 940px 宽换行，超出加 `…`。
4. 图纸卡片：x=90、y=340、w=900、h=640，白底、`SOCIAL_THEME.border` 3px 描边、圆角 36px、柔和投影；内部把 `pixels` 等比缩放居中（空格留白、不画色号、不画网格线），绘制时 `clip()` 到圆角矩形。
5. 数据胶囊：三枚，内容分别为 `颜色 {colorCount}`、`豆子 {beadCount}`、`尺寸 {width}×{height}`；横向居中排列，`pillBg` 底、`primaryStrong` 字。
6. 标签行：`meta.tags` 最多 6 个，渲染为 `#{tag}` 胶囊；放不下时省略多余项并以 `…` 结尾。
7. 右下角水印：`SOCIAL_THEME.watermarkText`，22px，`textMuted`，距离右/下边 60px。

- [ ] **Step 3: 实现图纸图与下载**

- `renderSocialPattern`：`cellSize = clamp(Math.floor(1600 / Math.max(w, h)), 4, 48)`；调用 `renderPatternToCanvas(pixels, canvas, cellSize, { showLabels: true, legend: true, watermark: SOCIAL_THEME.watermarkText, padding: 24 })`。
- `downloadCanvas`：`canvas.toBlob('image/png')` → `URL.createObjectURL` → 触发 `<a download>` → `revokeObjectURL`；失败时 reject `new Error("PNG export failed")`。

- [ ] **Step 4: 类型检查与 lint**

Run: `npx tsc --noEmit && npx eslint src/utils/socialKitRenderer.ts`
Expected: 0 error。

---

## Task 7: 前端文案请求 hook

**Files:**
- Create: `src/services/socialService.ts`

**Interfaces:**
- Consumes: `apiFetch`（`@/lib/api-client`）。
- Produces:
  - `export interface SocialCopyInput { name: string; width: number; height: number; colorCount: number; beadCount: number; tags: string[] }`
  - `export interface SocialCopyResult { success: true; title: string; content: string }`
  - `export function useSocialCopy(input: SocialCopyInput, enabled: boolean)`：返回 React Query `useQuery` 结果；`queryKey = ["social-copy", input.name, input.width, input.height, input.colorCount, input.beadCount, input.tags.join("|")]`；`apiFetch<SocialCopyResult>("/api/ai", { method: "POST", body: { action: "socialCopy", ...input } })`；`enabled`、`staleTime: Infinity`、`refetchOnWindowFocus: false`、`retry: false`。

- [ ] **Step 1: 实现 hook**

按 Interfaces 编写；`refetch` 由调用方用于「重新生成」。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 0 error。

---

## Task 8: 弹窗组件与字典

**Files:**
- Create: `src/components/pattern/SocialKitDialog.tsx`
- Modify: `messages/zh.json`（新增 `socialKit` 命名空间）
- Modify: `messages/en.json`（新增 `socialKit` 命名空间）

**Interfaces:**
- Consumes: `Modal`、`Button`、`Spinner`、`renderSocialCover/renderSocialPattern/downloadCanvas/sanitizeFilename`、`computePatternStats`、`useSocialCopy`、`useTranslations("socialKit")`。
- Produces: `export function SocialKitDialog({ open, onClose, diagram, pixels }: SocialKitDialogProps): React.ReactElement | null`，其中 `SocialKitDialogProps = { open: boolean; onClose: () => void; diagram: DiagramItem; pixels: number[][] }`。

- [ ] **Step 1: 新增字典**

`zh.json` 的 `socialKit`：

```json
{
  "button": "社交媒体素材",
  "title": "社交媒体素材",
  "tabCover": "封面图",
  "tabPattern": "图纸",
  "tabCopy": "文案",
  "downloadCover": "下载封面",
  "downloadPattern": "下载图纸",
  "regenerate": "重新生成",
  "generating": "文案生成中…",
  "titleLabel": "标题",
  "contentLabel": "内容",
  "copyTitle": "复制标题",
  "copyContent": "复制内容",
  "copied": "已复制",
  "copyFailed": "复制失败，请手动选择",
  "errors": {
    "forbidden": "当前账号没有权限生成文案",
    "owner_not_configured": "后端尚未配置管理员",
    "ai_not_configured": "后端尚未配置文案模型",
    "invalid_input": "图纸信息不完整，无法生成文案",
    "rate_limited": "操作太快了，请稍后再试",
    "upstream_failed": "文案生成失败，请重试",
    "default": "文案生成失败，请重试"
  }
}
```

`en.json` 同名键，英文对应（例如 `"Social media kit"`、`"Cover"`、`"Pattern"`、`"Copy"`、`"Generating copy…"`、`"Copy title"`、`"Copy content"`、`"Copied"` 等），错误文案译为英文。

- [ ] **Step 2: 实现弹窗**

- 用 `Modal`，`className="max-w-3xl"`；标题 `t("title")`。
- 状态：`tab: "cover" | "pattern" | "copy"`；`coverUrl/patternUrl: string | null`；`title/content: string`；`copied: "title" | "content" | null`。
- 打开时（`open && pixels.length > 0`）在 `useEffect` 中创建两个 `<canvas>`，分别调用 `renderSocialCover` / `renderSocialPattern`，`toBlob` 后 `URL.createObjectURL`；保存 canvas 到 ref 供下载。依赖仅为 `open`、`pixels`、`diagram._id`，避免重复生成。关闭/卸载时 revoke 并清空 URL。
- 文案：`const copyQuery = useSocialCopy({...}, open)`；`useEffect` 在 `copyQuery.data` 变化时写入 `title/content` 的初始值，之后由用户编辑；「重新生成」调用 `copyQuery.refetch()`。
- 三个标签按钮（`h-11`，激活态用主按钮配方，未激活用次级按钮配方）。
- 封面/图纸页：预览 `img`（`max-h-[60vh] w-auto object-contain rounded-2xl border-[3px] border-clay-border bg-card-bg shadow-card`），下方下载按钮；生成中显示 `Spinner`。
- 文案页：标题输入框（`rounded-full border-[3px] border-clay-border bg-surface shadow-inset`）+ 复制按钮；内容 `textarea`（`min-h-40 rounded-2xl border-[3px] ...`）+ 复制按钮；错误态显示映射文案与「重新生成」按钮。
- 复制：`navigator.clipboard.writeText(value)`；失败回退创建一个临时 `textarea` + `document.execCommand("copy")`；成功后 2 秒内按钮显示 `t("copied")`。
- 下载文件名：`cover-${sanitizeFilename(diagram.name)}.png`、`${sanitizeFilename(diagram.name)}-图纸.png`。
- 错误映射：`ApiError.code` 命中 `t("errors." + code)`，否则 `t("errors.default")`。

- [ ] **Step 3: 类型检查与 lint**

Run: `npx tsc --noEmit && npx eslint src/components/pattern/SocialKitDialog.tsx`
Expected: 0 error。

---

## Task 9: 详情页入口

**Files:**
- Modify: `src/app/[locale]/patterns/[id]/page.tsx:119-240`

**Interfaces:**
- Consumes: `SocialKitDialog`（Task 8）、`user?.isAdmin`、现有 `diagram` 与 `pixels`。
- Produces: 管理员在操作区看到「社交媒体素材」按钮，点击打开弹窗。

- [ ] **Step 1: 修改详情页**

- 顶部 import：`SocialKitDialog`。
- 新增状态 `const [socialOpen, setSocialOpen] = useState(false);`。
- 在 `{/* Actions */}` 的按钮组中、`downloadPng` 之前插入（仅管理员）：

```tsx
{user?.isAdmin && (
  <Button variant="secondary" onClick={() => setSocialOpen(true)} disabled={pixels.length === 0}>
    {t("socialKitButton")}
  </Button>
)}
```

- 在页面根 `div` 末尾、弹窗位置渲染：

```tsx
{user?.isAdmin && diagram && (
  <SocialKitDialog
    open={socialOpen}
    onClose={() => setSocialOpen(false)}
    diagram={diagram}
    pixels={pixels}
  />
)}
```

- 在 `patternDetail` 命名空间新增 `socialKitButton`（zh：`社交媒体素材`；en：`Social media kit`）。其余 UI 文案由组件自己的 `socialKit` 命名空间负责。

- [ ] **Step 2: 类型检查、lint、构建**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 全部通过（0 error）。

---

## Task 10: 端到端验证

**Files:** 无新增。

- [ ] **Step 1: 后端测试**

Run: `cd /Volumes/mystorage/github/pindou/server && node --test test/social-copy.test.js && node --test test/config.test.js`
Expected: 全部 PASS。

- [ ] **Step 2: 前端静态检查与构建**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 0 error。

- [ ] **Step 3: 视觉与交互自查（浏览器）**

- 管理员账号打开任意图纸详情页 → 出现「社交媒体素材」按钮；非管理员不出现。
- 打开弹窗：封面图 1080×1440、标题/统计/标签完整；图纸图带图例与水印；两个下载按钮都能得到 PNG。
- 文案：正常生成时标题/内容分别可复制；后端未配置时显示「后端尚未配置文案模型」；快速点两次「重新生成」出现限流提示。
- 375px 宽下弹窗可滚动、按钮可点、预览不溢出。
- 含 `/`、超长名称的图纸下载文件名合法。
- 用 200×200 的大网格验证出图不崩、色号自动省略。

- [ ] **Step 4: grep 审计**

Run:

```bash
grep -rn "backdrop-blur" src/components/pattern/SocialKitDialog.tsx src/utils/socialKitRenderer.ts
grep -rn "text-white" src/components/pattern/SocialKitDialog.tsx
grep -rnE '#ff8fa3|#e5e7eb|#e9e9e9' src/components/pattern/SocialKitDialog.tsx
```

Expected: 全部 0 命中（Canvas 主题文件 `canvasTheme.ts` 例外）。

---

## Self-Review Notes

- 规格覆盖：封面（Task 6）、图纸+水印+图例（Task 5/6）、文案接口（Task 1–3）、弹窗与复制（Task 8）、管理员入口（Task 9）、错误态与限流（Task 2/8）、大网格阈值（Task 5/6）、文件名清洗（Task 6）。
- 前端无测试框架：纯函数用 `tsc`/`eslint`/`build` + Task 10 手动验证兜底；后端核心逻辑有 node:test 覆盖。
- 规格由后端 `ADMIN_UIDS` 决定管理员；前端入口隐藏不是安全边界，Task 2 的服务端校验才是。
