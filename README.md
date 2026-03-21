# 🧠 持仓追踪 — 大师投资人 13F 追踪平台

个人专属投资追踪平台。实时追踪 Warren Buffett、Cathie Wood、李录、段永平、Norbert Lou 等顶级投资人的 SEC 13F 持仓变动，配合 Claude AI 中文分析，每周自动发送邮件报告。

**Live:** [fc-cc-investor.vercel.app](https://fc-cc-investor.vercel.app)

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **仪表盘** | 所有追踪投资人的最新季度变动（新建仓 / 加仓 / 减仓 / 清仓），Top 10 共识持仓 |
| **投资人详情** | 按季度查看完整持仓，8个季度历史切换，AI 深度中文分析（多空辩证） |
| **个股视角** | 查询某只股票被哪些大师持有，各自持仓比例与操作历史折线图 |
| **AI 分析** | 输入任意股票代码，获取追踪投资人的持仓情况与 AI 综合点评 |
| **设置** | 通过 CIK 添加任意机构投资人，自动回溯 8 个季度历史数据 |
| **周报邮件** | 每周一自动发送 13F 变动摘要 + AI 一句话总结到指定邮箱 |

---

## 技术栈

| 层级 | 选择 |
|------|------|
| 前端 + 后端 | Next.js 14 (App Router，RSC + Client Components) |
| 数据库 | Neon PostgreSQL + Drizzle ORM |
| AI 分析 | Claude API (`claude-sonnet-4-6`)，中文输出 |
| 图表 | Recharts (折线图，多投资人持仓趋势) |
| 13F 数据 | SEC EDGAR API（免费，官方数据源） |
| CUSIP 解析 | OpenFIGI API（CUSIP → Ticker，结果永久缓存） |
| 邮件发送 | Resend + React Email |
| 部署 | Vercel（自动从 GitHub 部署） |

---

## 本地开发

**前置要求：** Node.js 18+ 或 Bun

```bash
# 安装依赖
bun install   # 或 npm install

# 配置环境变量
cp .env.example .env.local
# 填入 DATABASE_URL、ANTHROPIC_API_KEY 等

# 推送数据库 Schema
bun run db:push

# 启动开发服务器
bun run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL 连接字符串 |
| `ANTHROPIC_API_KEY` | ✅ | Claude AI 分析（[console.anthropic.com](https://console.anthropic.com)） |
| `EDGAR_EMAIL` | ✅ | SEC EDGAR User-Agent 邮箱（任意真实邮箱即可） |
| `CRON_SECRET` | ✅ | Vercel Cron 任务鉴权密钥 |
| `REPORT_EMAIL` | ✅ | 周报收件人邮箱 |
| `RESEND_API_KEY` | ✅ | Resend 邮件服务 API Key |
| `NEXT_PUBLIC_BASE_URL` | ✅ | 生产域名，如 `https://fc-cc-investor.vercel.app` |

---

## 部署到 Vercel

1. Fork 本仓库到你的 GitHub
2. 在 [vercel.com](https://vercel.com) 导入项目，连接 GitHub
3. 在 Vercel Dashboard → Settings → Environment Variables 填入上表所有变量
4. 推送代码，Vercel 自动构建并部署

**Vercel Cron 任务（vercel.json 已配置）：**
- 每周一 10:00 UTC：自动抓取最新 13F 数据
- 每周一 11:00 UTC：发送周报邮件

---

## 追踪的投资人

| 投资人 | 机构 | CIK |
|--------|------|-----|
| Warren Buffett | Berkshire Hathaway | 0001067983 |
| Cathie Wood | ARK Investment Management | 0001697748 |
| 李录 (Li Lu) | Himalaya Capital Management | 0001709323 |
| 段永平 (Duan Yongpin) | H&H International Investment | 0001759760 |
| Norbert Lou | Punch Card Management | 0001631664 |

可在设置页面通过 CIK 添加任意机构投资人。

---

## 项目结构

```
/app
  page.tsx                        仪表盘（Overall Insights + 变动卡片）
  /investor/[id]/page.tsx         投资人详情（季度选择器 + AI 分析）
  /stock/[ticker]/page.tsx        个股视角（Recharts 多投资人折线图）
  /stock/page.tsx                 个股列表
  /analysis/page.tsx              AI 分析（手动搜索）
  /settings/page.tsx              设置 + 投资人管理
  /api
    /fetch-13f/[cik]/route.ts     EDGAR 数据抓取（每投资人独立路由）
    /ai-analysis/route.ts         Claude AI 分析生成
    /send-report/route.ts         邮件周报发送
    /investors/add/route.ts       添加新投资人
    /investors/init/[cik]/route.ts  历史回溯（自链式，逐季度）
    /cron/update-all/route.ts     Vercel Cron 定时更新
/lib
  /db/schema.ts                   Drizzle Schema
  edgar.ts                        SEC EDGAR 抓取（含限流 + 重试）
  fetcher.ts                      13F 解析 + position_changes 计算
  openFigi.ts                     CUSIP → Ticker 转换（带缓存）
  claude.ts                       Claude API 封装
  prompts.ts                      所有 AI Prompt 模板
  email.tsx                       React Email 周报模板
  ui-constants.ts                 投资人颜色、数字格式化工具
/components
  Navbar.tsx                      响应式导航（桌面侧边栏 + 移动汉堡菜单）
  StockChart.tsx                  Recharts 多投资人持仓折线图
```

---

## Changelog

### v1.1 (2026-03-21)
- **移动端响应式导航**：汉堡菜单 + 抽屉式侧边栏，全面支持手机访问
- **设置页面**：完整的投资人管理 UI，CIK 查询预览、添加、删除、回溯进度展示
- **AI 分析卡片**：投资人详情页展示 Claude 生成的多空辩证分析（JSONB 结构化存储）
- **个股历史折线图**：Recharts 多投资人持仓趋势对比，支持移动端横向滚动
- **个股列表页**：展示所有追踪股票及各自持有人，按持有人数排序
- **邮件周报**：React Email 模板 + Resend 发送，每周一自动触发
- **周报逻辑修复**：只展示最新季度 vs 上季度的 diff，正确显示金额和变动类型
- **构建修复**：EDGAR_EMAIL 改为懒验证，解决 Vercel 构建时 crash 问题

### v1.0 (2026-03-15)
- 项目初始化：仪表盘、投资人详情、个股视角、AI 分析页面
- SEC EDGAR 13F 数据自动抓取，支持 8 季度历史回溯
- CUSIP → Ticker 解析（OpenFIGI，结果永久缓存）
- position_changes 自动计算（NEW / INCREASED / DECREASED / EXITED）
- Vercel Cron 自动更新任务
- 5 位预置投资人初始化
