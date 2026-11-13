# 社交媒体素材包（管理员）设计

日期：2026-11-13
状态：待评审

## 意图

图纸详情页面向管理员新增「社交媒体素材」功能。管理员打开一个弹窗，即可拿到一套可直接发布到社交平台的素材：

1. **封面图**：图纸缩略图 + 图纸名 + 颜色数 + 豆子数 + 尺寸 + 标签。
2. **图纸图**：带水印、带颜色图例的完整图纸 PNG。
3. **文案**：由后端接大模型生成的小红书风格文案，拆成「标题」与「内容」，各配一个复制按钮。

用户已确认的交付方式：**弹窗预览**，封面与图纸各一个下载按钮，文案分标题/内容两个复制按钮（不做 ZIP）。

## 目标

- 仅管理员可见、可用。前端按 `user.isAdmin` 显示入口，后端文案接口强制校验管理员。
- 两张图完全在浏览器端 Canvas 生成，不新增服务端图像依赖。
- 文案由后端新增的 OpenAI 兼容 Chat Completions 接口生成；换模型只改环境变量。
- 移动端 375px 宽可用，弹窗内容可滚动，触控目标 ≥44px。
- 所有面向用户的文案走 next-intl 字典（`socialKit` 命名空间）。

## 非目标

- 不做素材历史、缓存、OSS 落库或下载统计。
- 不做除小红书外的文案风格。
- 不改变普通「下载 PNG」的现有行为。
- 不把素材生成搬到后端（不引入 node-canvas 等原生依赖）。

## 约束

- 前端：Next.js 16 + React 19 + Tailwind v4，黏土风设计令牌集中在 `globals.css`。Canvas 无法读 CSS 变量，因此新增的封面/水印配色必须在 `src/utils/canvasTheme.ts` 里手动同步，沿用现有约定。
- 后端：独立仓库 `/Volumes/mystorage/github/pindou/server`（Express，HTTP 恒 200 + `{ success, error? }`）。管理员判定用 `isAdmin(cfg.adminUids, uid)`，现有范例见 `src/routes/tags.js`。
- 后端没有文本大模型配置，需要新增环境变量。
- 图纸像素只在前端存在（从 `zipUrl` 解析），所以封面/图纸只能在浏览器生成。

## 方案

### 备选方案

1. **前端 Canvas 出图 + 后端只生成文案**（选定）：无需服务端图像依赖；封面直接复用现有主题；两张图生成后即可预览。代价是 Canvas 排版代码需要自己写（项目里已有同类实现）。
2. 服务端统一出图并打包：输出最一致，但要引入 node-canvas 及字体文件，部署体积和故障面都变大。
3. 复用旧 `drawPattern`：它带图例，但没有水印、封面与黏土风样式，改造量不比新写少。

### 前端

**入口**
- 详情页操作区在 `user?.isAdmin` 时渲染「社交媒体素材」按钮（`Button variant="secondary"`），打开 `SocialKitDialog`。
- 非管理员不渲染该按钮；不依赖后端返回的 isAdmin 兜底。

**组件**
- 新增 `src/components/pattern/SocialKitDialog.tsx`：
  - 使用现有 `Modal`（传入 `className="max-w-3xl"`），内部三个分区/标签页：封面、图纸、文案。
  - 打开时（`open` 变 true）同步生成两张图的 canvas 与预览 URL；用 `useEffect` + 异步 `toBlob` 生成 `object URL`，关闭时 revoke。
  - 文案请求用 React Query mutation，打开时自动请求一次；失败显示错误与「重新生成」按钮。
  - 标题用只读文本 + 复制按钮；内容用可编辑 `textarea` + 复制按钮（管理员可微调后再复制）。复制走 `navigator.clipboard.writeText`，失败时回退 `document.execCommand("copy")`。
  - 下载按钮：`cover-<图纸名>.png`、`<图纸名>-图纸.png`。
  - 移动端：预览图 `max-h-[60vh] object-contain`，按钮 `h-11` 以上。

**渲染工具**
- 新增 `src/utils/socialKitRenderer.ts`：
  - `computePatternStats(pixels)` → `{ beadCount, colorCount, entries: [{ index, id, hex, count }] }`（跳过 `-1`）。
  - `renderSocialCover(pixels, { name, stats, width, height, tags }, canvas)` → 1080×1440。缩略图直接由 `pixels` 渲染（不加载 OSS 缩略图），生成过程同步、无网络依赖。
  - `renderSocialPattern(pixels, meta, canvas)` → 自适应 cellSize 的图纸 + 图例 + 水印。
  - `downloadCanvas(canvas, filename)`、`sanitizeFilename(name)`。
- 修改 `src/utils/patternRenderer.ts`：`renderPatternToCanvas` 增加可选参数 `{ showLabels?, legend?, watermark? }`，默认值保持现有行为（显示色号、无图例、无水印）。图例与水印逻辑放在该文件，供社交素材复用；普通下载路径不变。
- 修改 `src/utils/canvasTheme.ts`：新增 `SOCIAL_THEME`（封面背景、卡面、边框、主色、文字、水印透明度等），颜色值与 `globals.css` 令牌逐一对应并注明来源。

**封面排版（1080×1440，3:4）**
- 背景 `#fdf8f3`，边缘少量糖果色圆点与带孔珠子装饰（低对比，压在内容下方）。
- 顶部品牌栏：3×3 珠子 Logo + `拼豆屋`，右侧 `拼豆图纸` 胶囊。
- 标题：图纸名，粗体，最多两行，居中，下方一条粉色短标记。
- 图纸展示卡：白色大圆角卡片 + 错位粉色底板 + 两角胶带；卡面铺淡孔位底纹，图案等比居中并尽量放大（封面主角），空格留白、不显示色号。
- 数据卡行：三张白卡，大数字 + `颜色 / 豆子 / 尺寸` 标签。
- 标签行：左对齐，前置 `标签` 小字；糖果色胶囊轮换（粉 / 薄荷 / 黄 / 蓝），最多 6 个，放不下以 `…` 结尾。单个标签也不会孤零零地居中。
- 页脚：粉色圆角条，左侧珠子 Logo + `拼豆屋`（水印），右侧 `把照片变成拼豆图纸`。

**图纸图（PNG）**
- 沿用白底、细网格线、每 5 格粗线、色号居中（深底浅字/浅底深字）。格子屏幕尺寸 ≥16px 时才画色号（与现有导出/viewer 阈值一致）；大网格（约 >125×125）会因自适应缩小而自动省略色号，避免糊成噪点。
- 出图尺寸上限：cellSize 在 4–24px 间自适应，目标图纸短边约 1600px；画布任一边不超过 4096px。
- 底部图例：色块 + `A01 ×123`，按可用宽度分列；顶部一行统计 `共 N 种颜色 · 共 M 颗豆子`。
- 水印：在图纸区域平铺旋转 -30° 的半透明文字 `拼豆屋`，颜色 `rgba(74,36,48,0.10)`；不覆盖图例区。
- 水印文字集中在 `SOCIAL_THEME.watermarkText`，以后换品牌只改一处。

**国际化**
- `messages/{zh,en}.json` 新增 `socialKit`：按钮、弹窗标题、三个分区名、下载/复制/已复制、重新生成、加载中、失败提示、统计标签等。
- 后端错误码（`forbidden`、`owner_not_configured`、`ai_not_configured`、`upstream_failed`、`invalid_input`、`rate_limited`）由弹窗映射为字典文案，不直接展示。
- **PNG 内绘制的文字不翻译**，固定中文/品牌字样（项目规则：canvas 绘制文字不翻译）。封面上的 `颜色/豆子/尺寸`、图例统计、水印均为固定文案，渲染函数不接受 i18n 标签参数，保持自包含。
- 文案接口**固定生成中文**（小红书是中文内容平台），不随界面 locale 变化，请求体不带 locale。

**服务层**
- 新增 `src/services/socialService.ts`：`useSocialCopy()`，请求体 `{ action: "socialCopy", name, width, height, colorCount, beadCount, tags }`，响应用 `{ success, title, content }`。

### 后端

**配置**（`src/config.js` + `.env.example`）
- 新增 `COPY_LLM_API_URL`（OpenAI 兼容 base，如 `https://api.deepseek.com`）、`COPY_LLM_API_KEY`、`COPY_LLM_MODEL`。
- 暴露为 `cfg.copyLlm = { apiUrl, apiKey, model }`。任一为空即视为未配置。

**接口**
- 复用 `POST /api/ai`（已挂 `requireAuth`），新增 action `socialCopy`，转发到新服务 `src/services/socialCopy.js`。
- 服务内第一步校验管理员：`cfg.adminUids` 为空 → `owner_not_configured`；非管理员 → `forbidden`。与 `tags.js` 一致。
- 入参校验：`name` 非空字符串（截断 50），`width/height` 正整数（上限 500），`colorCount/beadCount` 非负整数，`tags` 最多 10 个、每个截断 20；非法返回 `invalid_input`。
- 未配置模型 → `ai_not_configured`。
- 调上游：`POST {apiUrl}/chat/completions`，`Authorization: Bearer {apiKey}`，`model`，`temperature: 0.9`，`max_tokens: 600`，`response_format: { type: "json_object" }`（若上游不支持该字段，由解析兜底），超时 30s。
- 提示词：系统角色为「小红书手工/拼豆内容编辑」；要求标题 ≤20 字、带 1 个 emoji；正文 100–200 字、口语化、突出 DIY 与成品效果；末尾 3–6 个话题标签；**只返回 JSON** `{"title":"...","content":"..."}`。不编造品牌、价格、活动。
- 解析：去掉 ```json 围栏后 `JSON.parse`，失败时截取第一个 `{...}`；仍失败或字段为空 → `upstream_failed`。
- 简单防抖：同一管理员 5 秒内重复请求返回 `rate_limited`（不返回上一次结果，避免「重新生成」按钮看起来失效），前端提示稍后再试。
- 上游错误只记录状态码与错误摘要，不记录 API Key。

**前端展示**
- 文案加载中显示骨架/Spinner；失败显示重试。
- 生成成功后标题与内容分别填入可编辑控件。

### 测试与验证

- 后端新增 `test/social-copy.test.js`：起本地假 Chat Completions 上游，覆盖
  - 非管理员 → `forbidden`；
  - 未配置 → `ai_not_configured`；
  - 正常返回 → `{ success, title, content }`；
  - 上游返回围栏 JSON / 非法 JSON → 正确解析或 `upstream_failed`；
  - 入参非法 → `invalid_input`。
- 前端无测试框架，验证方式：`npx tsc --noEmit`、`npm run lint`、`npm run build`，并在浏览器中检查 375px 与桌面端弹窗、下载、复制。
- 视觉自查：新增 UI 无 `backdrop-blur` / `text-white` / 裸十六进制色值（Canvas 主题文件除外）。

## 构建者自行决定的部分

- 封面装饰图形、间距的最终像素值，以实际预览效果为准。
- 弹窗内用标签页还是纵向分区：优先标签页（移动端更省高度），若实现更简单可用纵向分区。
- 图例的列宽与换行算法，以不溢出为准。
- 后端入参上限的具体数值（需保证极端输入不会撑爆提示词）。
- 是否需要「重新生成」以外的温度/风格开关：不做。

## 风险

- 上游不支持 `response_format` 时，依赖解析兜底；提示词必须明确「只输出 JSON」。
- Canvas 字体：优先读取 `--font-nunito` 的实际 family（`getComputedStyle`），取不到时回退 `"PingFang SC", "Microsoft YaHei", sans-serif`。
- 大网格（如 200×200）出图时 Canvas 可能较大；cellSize 需自适应上限（约 4–24px），避免内存与模糊。
- 管理员入口是前端隐藏，不是安全边界；文案接口的服务端校验才是。
