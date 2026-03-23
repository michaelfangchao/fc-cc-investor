# FC_CC_Investor — 投资追踪平台

## 项目概述
个人专属投资追踪平台，追踪顶级投资人的13F持仓变动，配合AI分析。用户为非技术用户。

## 技术栈
- **框架**: Next.js 14 (App Router)
- **数据库**: Neon PostgreSQL + Drizzle ORM
- **AI**: Claude API (`claude-sonnet-4-6`)，中文输出
- **图表**: Recharts
- **邮件**: Resend
- **部署**: Vercel
- **CUSIP→Ticker**: OpenFIGI API（结果永久缓存到 `stocks` 表）

## UI 风格（已确认）
**彩色 Fintech 风格**（参考 `prototype-colorful.html`）：
- 顶部导航：紫色渐变背景
- 每位投资人有专属颜色标识（Buffett=蓝, 段永平=绿, 李录=紫, ARK=橙, Norbert=红）
- 变动卡片顶部边框按类型上色（新建/加仓/减仓/清仓）
- AI分析区域：渐变卡片
- 按钮/标签：Pill 样式
- 字体：系统无衬线字体，数字/代码用等宽字体

## 追踪投资人
| 投资人 | 机构 | CIK |
|--------|------|-----|
| Warren Buffett | Berkshire Hathaway | 0001067983 |
| Cathie Wood | ARK Investment | 0001697748 |
| 李录 (Li Lu) | Himalaya Capital | 待查 |
| Norbert Lou | Punch Card Capital | 待查 |
| 段永平 | H&H International Investment | 待查 |

## 重要技术规范

### EDGAR 数据抓取
- 先查 filing index (`-index.json`) 找 XML 路径，不直接假设 `informationTable.xml`
- 请求头必须包含 User-Agent（含邮箱）
- 速率限制：每次请求间隔 150ms，触发429等待2秒
- 错误重试：3次，指数退避
- 每位投资人独立 API Route（`/api/fetch-13f/[cik]/route.ts`）避免 Vercel 10秒超时

### 数据库规范
- `position_changes` 表：UNIQUE(investor_id, stock_id, quarter) 防重复
- `stocks` 表：CUSIP 永久缓存，只对新 CUSIP 调用 OpenFIGI
- `ai_summaries` 表：JSONB 存储（非纯文本），结构：`{summary_cn, bull_points[], bear_points[], recommendation, key_moves[]}`
- 首次添加投资人：所有持仓标记为 `NEW`，历史回溯 8 个季度

### Claude AI 分析
- 所有 Prompt 模板放在 `/lib/prompts.ts`
- 输出必须是 JSONB 格式，用 try/catch 包裹解析
- 解析失败降级：存储 `{error: "AI分析生成中"}` 到 JSONB，前端提示"分析生成中"

### 错误处理
- EDGAR 超时 → 重试3次 → 失败记日志，下次 Cron 重试
- OpenFIGI 失败 → 降级：用 CUSIP 替代 ticker 展示，不阻断主流程
- Claude 超时 → 降级：存储错误状态，不返回500

## 开发阶段
- [x] 阶段0：UI原型（3个HTML，用户选彩色风格 ✓）
- [ ] 阶段1：注册账号（GitHub/Vercel/Neon/Resend）
- [ ] 阶段2：Next.js 前端静态页面（mock data，彩色风格）
- [ ] 阶段3：后端功能（DB Schema + EDGAR抓取 + Claude AI）
- [ ] 阶段4：邮件报告 + Vercel Cron

## TODOS（已记录，暂不实现）
- P2/S: 点击持仓行弹出就地AI分析面板（右侧抽屉）
- P2/M: 投资人名称搜索（efts.sec.gov）
- P3/S: React Query 客户端缓存（5分钟）

## Design System
Always read `DESIGN.md` (in `/Users/Yiji/Desktop/fc-cc-investor/DESIGN.md`) before making any visual or UI decisions.
All font choices, colors, spacing, border-radius, shadows, and aesthetic direction are defined there.
Do not deviate without explicit user approval. In QA mode, flag any code that doesn't match DESIGN.md.

## 移动端响应式规范（iPhone Safari）

用户会在 **iPhone 16 Pro Max**（Safari，视口宽度 430px）上查看网站，UI 必须在移动端可用。

### 布局规则
- **侧边栏**：移动端隐藏（`hidden md:flex`）。改为顶部固定导航栏，高度 56px，紫色渐变背景，包含：Logo 左对齐 + 汉堡菜单按钮右对齐
- **汉堡菜单**：点击展开全屏抽屉式侧边栏（overlay），与桌面版侧边栏内容相同
- **内容区**：移动端无 `ml-52` 偏移，改为 `px-4 py-4`，`max-w-full`
- **网格**：4列 → 2列（`sm:grid-cols-2`），2列 → 1列（`sm:grid-cols-1`）
- **卡片内边距**：桌面 20px → 移动端 16px

### 断点约定
- 移动端：`< 768px`（`md` 以下）
- 桌面端：`≥ 768px`（`md` 及以上）
- 所有新组件必须先写移动端样式，再用 `md:` 覆盖桌面端（mobile-first）

### 表格处理
- 持仓表格在移动端水平滚动（`overflow-x-auto`），不折行
- 隐藏低优先级列：移动端默认只显示「股票代码 + 市值 + 变动类型」，其余列加 `hidden md:table-cell`

### 图表
- Recharts LineChart：移动端容器设 `overflow-x: auto`，图表内宽固定 480px（横向滚动）
- Y 轴宽度移动端缩小至 44px

### 触控目标
- 所有可点击元素最小 44×44px touch target（使用 `min-h-[44px] min-w-[44px]` 或足够的 padding）
- 表格行点击区域扩大：`py-3.5` 最小

### 字体缩放
- 移动端 Display 标题：36px → 24px
- Stat card 数值：26px → 20px
- 正文保持 14px（不缩小）

## NOT IN SCOPE（已明确排除）
- EDGAR 名称搜索（改为 CIK 直接输入）
- 添加投资人实时进度（改为异步+状态轮询）
- 单元/集成测试
- 多用户/账号系统
- 股价实时数据

## 文件结构
```
/app
  page.tsx                        仪表盘
  /investor/[id]/page.tsx         投资人详情
  /stock/[ticker]/page.tsx        个股视角
  /analysis/page.tsx              AI分析
  /settings/page.tsx              设置+投资人管理
  /api
    /fetch-13f/[cik]/route.ts     每位投资人独立
    /ai-analysis/route.ts
    /send-report/route.ts
    /investors/add/route.ts
    /investors/init/[cik]/route.ts
/lib
  /db/schema.ts
  edgar.ts
  openFigi.ts
  claude.ts
  prompts.ts                      所有AI Prompt模板
  email.tsx
/components
  InvestorCard.tsx
  PositionTable.tsx
  AIAnalysis.tsx
  OverallInsights.tsx
```
