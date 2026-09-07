# Pindou — Bead Pattern Creator

将照片转换为拼豆（Perler/Hama/Artkal）图案的 Web 应用。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| UI 库 | React 19 |
| 样式 | Tailwind CSS v4 (`@theme inline`) |
| 状态管理 | React Query (`@tanstack/react-query` v5) |
| 认证 | NextAuth v4 (Google OAuth) |
| 数据库 | MongoDB (Mongoose) |
| 打包 | JSZip |
| 校验 | Zod v4 |

## 目录结构

```
messages/                         # next-intl 中英文字典（en.json / zh.json）
src/
├── proxy.ts                      # next-intl 中间件（locale 路由重定向，排除 /api）
├── i18n/                         # routing.ts / navigation.ts / request.ts
├── app/                          # Next.js App Router
│   ├── [locale]/                 # 本地化路由段（en/zh 前缀）
│   │   ├── layout.tsx            # 根布局（html lang + i18n Provider + 认证）
│   │   ├── page.tsx              # 首页着陆页
│   │   ├── not-found.tsx         # 本地化 404
│   │   ├── (auth)/login/         # 登录页
│   │   ├── admin/tags/           # 管理员标签管理
│   │   ├── create/               # 创建图案（模式选择 → 上传/裁剪/配置 → 涂色编辑器）
│   │   ├── gallery/              # 公共画廊
│   │   ├── my-patterns/          # 我的图案
│   │   └── patterns/[id]/        # 图案详情
│   ├── globals.css               # Tailwind v4 主题 + 全局样式
│   └── api/                      # API 路由（不参与本地化）
│       ├── auth/[...nextauth]/   # NextAuth 认证
│       ├── diagrams/             # 图案 CRUD
│       ├── tags/                 # 标签 CRUD
│       └── upload/               # 上传占位（未完整实现）
├── components/
│   ├── layout/                   # Header, AuthGuard, LanguageSwitcher
│   ├── gallery/                  # GalleryCard
│   ├── create/                   # ModeSelector（创建模式选择卡片）
│   ├── editor/                   # PatternEditor（涂色编辑器）, EditorToolbar, ColorPalette, UnderlayControls, icons
│   ├── pattern/                  # PatternCanvas, ColorLegend
│   ├── upload/                   # ImageUploader, CropPreview, GridConfig, PublishForm
│   └── ui/                       # Button, Card, Modal, Spinner
├── hooks/                        # useCanvas
├── lib/                          # auth.ts, validations.ts, db/
├── providers/                    # AuthProvider, QueryProvider
├── services/                     # diagramService.ts (React Query hooks)
├── types/                        # bead.ts, diagram.ts, api.ts
└── utils/                        # 核心算法
    ├── beadColors.ts             # MARD 珠子调色板（实际 221 色，A01-M15）+ 颜色匹配
    ├── canvasTheme.ts            # 屏幕内 canvas 绘制色板（与主题令牌手动同步）+ getLuminance
    ├── canvasView.ts             # canvas 视口变换（View/缩放/平移，裁剪器与编辑器共用）
    ├── colorQuantization.ts      # 颜色简化/合并
    ├── colorSystemMapping.json   # 多品牌颜色系统映射
    ├── imageProcessor.ts         # 图像处理管线（双线性缩放）
    ├── imageToGrid.ts            # 图片 → 拼豆网格（LUT + 双线性 + CIE94，纯函数）
    ├── patternRenderer.ts        # 图案渲染（含图例绘制）
    ├── patternZip.ts             # 图案 ZIP 打包/解包
    └── pixelGrid.ts              # 网格代数：EMPTY_CELL(-1) 哨兵、洪泛填充、统计
```

## 响应式设计规范

**必须同时兼容桌面端和移动端**，这是项目的硬性要求。

### 设计策略
- **移动端优先**：默认样式为移动端设计，使用 `sm:`、`md:`、`lg:` 断点逐步增强
- 所有页面和组件必须在 375px（iPhone SE）宽度下可用
- 交互元素（按钮、链接）的最小触摸区域为 44x44px

### 断点
- `sm:` — 640px（平板竖屏）
- `md:` — 768px（平板横屏）
- `lg:` — 1024px（桌面端）

### 移动端导航
- 桌面端：水平导航栏显示在 Header 中
- 移动端：导航栏隐藏，通过汉堡菜单按钮打开 Modal 弹窗显示所有链接
- 路由变化时自动关闭移动端菜单

### 移动端组件适配要点
- 图片裁剪：必须同时支持鼠标和触摸事件
- 画廊网格：`grid-cols-2` → `sm:grid-cols-3` → `md:grid-cols-4` → `lg:grid-cols-5`
- 按钮组：窄屏堆叠，宽屏并排（`flex-col sm:flex-row`）
- 文字标签：窄屏可隐藏，只保留图标或编号（`hidden sm:inline`）

## 组件模式

- 所有页面组件使用 `"use client"` 指令（除 `layout.tsx` 和 `page.tsx` 着陆页外）
- 使用 Tailwind 的 `@theme inline` 定义设计令牌（颜色、字体、阴影、圆角）
- 全局 CSS 变量定义在 `src/app/globals.css` 中
- 组件使用 `interface` 定义 Props 类型
- 导出使用具名导出（`export function ComponentName`）

## 国际化（next-intl）

全站支持中英文（`/en` `/zh` 前缀路由），**新增任何面向用户的字符串必须走字典**：

- 字典文件：`messages/en.json` + `messages/zh.json`，命名空间按页面/组件划分（`common`、`header`、`crop`…）
- 页面组件：client 用 `useTranslations('ns')`；server 组件（如 `[locale]/page.tsx`、layout）用 `await getTranslations('ns')`，且须先 `setRequestLocale(locale)`
- 带插值的键用 `{param}`；英文复数用 ICU plural，中文只用 `other`；需要给数字加样式的用 `t.rich(..., { b: (chunks) => <span>…</span> })`
- **导航必须用 `@/i18n/navigation` 的 `Link` / `useRouter` / `usePathname`**（自动加 locale 前缀；i18n 的 usePathname 返回无前缀路径）；不要 import `next/link` / `next/navigation`
- 不要翻译：珠子色号（A01…）、品牌名、canvas 绘制文字、sort 选项 value（`newest/popular/colors`）、API 错误文案（API 路由不参与本地化）
- 语言切换器 `src/components/layout/LanguageSwitcher.tsx` 已内置在 Header，无需重复实现
- 新增语言：更新 `src/i18n/routing.ts` 的 locales、`messages/<lang>.json`、`[locale]/layout.tsx` 的 generateStaticParams

## 视觉设计系统（Playful + Claymorphism + Soft UI + 3D Toy）

全站视觉是黏土/玩具风：粗边框（3px）、大圆角、内外双阴影、粉彩色、弹性动效。**新增任何 UI 必须遵循本节规范。**

### 单一事实来源

- 所有颜色/阴影/圆角/动画只从 `src/app/globals.css` 的 `@theme inline` 令牌取值，**禁止在组件里裸写十六进制色值或 box-shadow**
- 优先复用 `src/components/ui/` 原语（Button/Card/Modal/Spinner），它们已携带完整黏土语言

### 既定配方（手写样式时照抄）

- 主按钮/激活胶囊：`border-[3px] border-primary-light bg-primary text-primary-ink shadow-button hover:bg-primary-dark active:translate-y-1 active:shadow-button-pressed`
- 次级按钮/未激活胶囊：`border-[3px] border-clay-border bg-surface text-text-secondary shadow-button-secondary active:translate-y-1 active:shadow-button-secondary-pressed`
- 卡片：`rounded-2xl border-[3px] border-clay-border bg-card-bg shadow-card`
- 输入框（凹陷感）：`rounded-full border-[3px] border-clay-border bg-surface shadow-inset focus:border-primary`
- 圆形图标钮：`flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface shadow-button-secondary active:translate-y-[3px]`
- 轻量按压件：挂 `.clay-press` 类

### 对比度硬规则（违反 = 返工）

1. 粉底（`bg-primary`）上**禁止白字**，文字一律用 `text-primary-ink`
2. 浅底上的粉色文字用 `text-primary-strong`，禁止裸 `text-primary`（它是填充色，作文字对比度仅 ~2:1）
3. `text-primary-dark` 只作 hover 填充色，禁止作文字色

### 动效

- 只用 `@theme` 中已定义的动画令牌：`animate-pop-in / fade-in / pop / rise-in / float / wobble`，缓动用 `ease-bounce`；需要新动画时先在 `@theme` 定义再使用
- 全局 `prefers-reduced-motion` 规则自动覆盖所有动画，新增动画无需单独处理
- 触控目标 ≥44px（`h-11` / `min-h-11`）

### Canvas 与导出

- 屏幕 canvas 绘制颜色一律从 `src/utils/canvasTheme.ts` 的 `CANVAS_THEME` 取；**修改 `globals.css` 主题色时必须手动同步该文件**（全项目唯一的同步负担点）
- `src/utils/patternRenderer.ts` 是下载产物（PNG 导出），刻意保持中性打印风格，**不要**改成黏土风

### 新增 UI 后的 grep 审计

```bash
# 全部应为 0 命中（唯一例外：patternRenderer.ts 的中性打印配色）
grep -rn "backdrop-blur" src/
grep -rn "text-white" src/components src/app
grep -rnE '#ff8fa3|#e5e7eb|#e9e9e9' src/ --include="*.tsx"
```

## 颜色系统

- 默认品牌：MARD
- 调色板：221 种颜色（A01-M15），定义在 `src/utils/beadColors.ts`
- 颜色匹配算法：CIEDE2000 Delta-E（最准确）；向导实际走 CIE94 + LUT 加速
- 支持 LUT 加速：`/public/beadLut.json`
- 支持多品牌映射：`src/utils/colorSystemMapping.json`
- **空格子**：`pixels` 中的 `-1` 表示不贴珠（`pixelGrid.EMPTY_CELL`）；图例/统计/导出自动跳过，画布渲染为棋盘格。旧图纸没有 -1，天然兼容

## 关键架构决策

1. **NextAuth v4 + Google OAuth** — 唯一认证方式，无邮箱密码注册
2. **MongoDB + Mongoose** — 4 个模型：Diagram, MyDiagram, Favorite, Tag
3. **React Query** — 所有 API 请求通过 `src/services/diagramService.ts` 的 hooks
4. **图像处理管线**：上传 → 裁剪 → 双线性缩放 → CIEDE2000 颜色匹配 → 渲染
5. **图案导出**：PNG 直接渲染、ZIP 包含 pattern.json
6. **三种创建模式统一进 PatternEditor**：上传转换 / 底图涂色（空网格描图或自动转换打底）/ 空白画布，均以 `pixels: number[][]` 为唯一数据形态，编辑器经 `onPixelsChange` 在笔画/填充/撤销等操作后上抛