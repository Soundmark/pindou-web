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
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局（Provider 层级）
│   ├── page.tsx                  # 首页着陆页
│   ├── globals.css               # Tailwind v4 主题 + 全局样式
│   ├── (auth)/login/             # 登录页
│   ├── admin/tags/               # 管理员标签管理
│   ├── api/                      # API 路由
│   │   ├── auth/[...nextauth]/   # NextAuth 认证
│   │   ├── diagrams/             # 图案 CRUD
│   │   ├── tags/                 # 标签 CRUD
│   │   └── upload/               # 上传占位（未完整实现）
│   ├── create/                   # 创建图案（4 步向导）
│   ├── gallery/                  # 公共画廊
│   ├── my-patterns/              # 我的图案
│   └── patterns/[id]/            # 图案详情
├── components/
│   ├── layout/                   # Header, AuthGuard
│   ├── gallery/                  # GalleryCard
│   ├── pattern/                  # PatternCanvas, ColorLegend
│   ├── upload/                   # ImageUploader, CropPreview, GridConfig
│   └── ui/                       # Button, Card, Modal, Spinner
├── hooks/                        # useCanvas, useImageProcessor
├── lib/                          # auth.ts, validations.ts, db/
├── providers/                    # AuthProvider, QueryProvider
├── services/                     # diagramService.ts (React Query hooks)
├── types/                        # bead.ts, diagram.ts, api.ts
└── utils/                        # 核心算法
    ├── beadColors.ts             # 291 色 MARD 珠子调色板 + 颜色匹配
    ├── colorQuantization.ts      # 颜色简化/合并
    ├── colorSystemMapping.json   # 多品牌颜色系统映射
    ├── imageProcessor.ts         # 图像处理管线（双线性缩放、颜色匹配）
    ├── patternRenderer.ts        # 图案渲染（含图例绘制）
    └── patternZip.ts             # 图案 ZIP 打包/解包
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

## 颜色系统

- 默认品牌：MARD
- 调色板：291 种颜色（A01-M15），定义在 `src/utils/beadColors.ts`
- 颜色匹配算法：CIEDE2000 Delta-E（最准确）
- 支持 LUT 加速：`/public/beadLut.json`
- 支持多品牌映射：`src/utils/colorSystemMapping.json`

## 关键架构决策

1. **NextAuth v4 + Google OAuth** — 唯一认证方式，无邮箱密码注册
2. **MongoDB + Mongoose** — 4 个模型：Diagram, MyDiagram, Favorite, Tag
3. **React Query** — 所有 API 请求通过 `src/services/diagramService.ts` 的 hooks
4. **图像处理管线**：上传 → 裁剪 → 双线性缩放 → CIEDE2000 颜色匹配 → 渲染
5. **图案导出**：PNG 直接渲染、ZIP 包含 pattern.json