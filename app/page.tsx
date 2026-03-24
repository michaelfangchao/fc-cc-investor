import Link from 'next/link'
import {
  getInvestorsWithLatestFiling, getDashboardChanges, getDashboardInsights,
  getDashboard2QtrTopBuys,
  quarterLabel,
  COLORS_BY_CIK, DEFAULT_COLOR, InvestorWithFiling,
} from '@/lib/db/queries'
import PositionChangesSection from '@/components/PositionChangesSection'

export const dynamic = 'force-dynamic'

function StatusBar({ investors, currentQuarter }: { investors: InvestorWithFiling[]; currentQuarter: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">本季度更新状态 — {quarterLabel(currentQuarter)}</h2>
        <span className="text-xs text-gray-400">数据来源：SEC EDGAR 13F</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {investors.map(inv => {
          const updated = inv.latestPeriod === currentQuarter
          return (
            <Link key={inv.id} href={`/investor/${inv.id}`}>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:shadow-sm transition-shadow cursor-pointer"
                style={{
                  borderColor: updated ? inv.color.bg : '#e5e7eb',
                  backgroundColor: updated ? `${inv.color.bg}12` : '#f9fafb',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: updated ? inv.color.bg : '#9ca3af' }} />
                <span className="text-sm font-medium text-gray-800">{inv.name_cn}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${updated ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {updated ? `✓ ${inv.latestPeriod}` : inv.latestPeriod ?? '待更新'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

type Insights = Awaited<ReturnType<typeof getDashboardInsights>>

function OverallInsights({ insights, investors, currentQuarter, topBuys2Qtr }: {
  insights: Insights
  investors: InvestorWithFiling[]
  currentQuarter: string
  topBuys2Qtr: TopBuys2Qtr
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
      <h2 className="text-base font-bold text-gray-900 mb-4">📊 总体洞察 — {quarterLabel(currentQuarter)}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Top Buys */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            新建/加仓最多
          </h3>
          <p className="text-xs text-gray-400 mb-2">按仓位占比排序</p>
          <div className="flex flex-col gap-2">
            {insights.topBuys.length === 0 && <p className="text-xs text-gray-400">暂无数据</p>}
            {insights.topBuys.map((item, i) => {
              const color = COLORS_BY_CIK[item.investorCik] ?? DEFAULT_COLOR
              return (
                <Link key={item.ticker} href={`/stock/${encodeURIComponent(item.ticker)}`} className="flex items-center gap-1.5 group">
                  <span className="text-xs text-gray-400 w-4 font-mono flex-shrink-0">{i + 1}</span>
                  <span className="font-mono font-bold text-xs text-gray-900 group-hover:text-emerald-700 transition-colors w-16 flex-shrink-0 truncate overflow-hidden">{item.ticker}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.bg }} />
                  <span className="text-xs text-gray-500 truncate flex-1">{item.investorName}</span>
                  <span className="text-xs font-semibold text-emerald-600 font-mono whitespace-nowrap flex-shrink-0">{item.maxPct.toFixed(1)}%</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Top Sells */}
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            减仓/清仓最多
          </h3>
          <p className="text-xs text-gray-400 mb-2">按减仓幅度排序</p>
          <div className="flex flex-col gap-2">
            {insights.topSells.length === 0 && <p className="text-xs text-gray-400">暂无数据</p>}
            {insights.topSells.map((item, i) => {
              const color = COLORS_BY_CIK[item.investorCik] ?? DEFAULT_COLOR
              return (
                <Link key={item.ticker} href={`/stock/${encodeURIComponent(item.ticker)}`} className="flex items-center gap-1.5 group">
                  <span className="text-xs text-gray-400 w-4 font-mono flex-shrink-0">{i + 1}</span>
                  <span className="font-mono font-bold text-xs text-gray-900 group-hover:text-red-600 transition-colors w-16 flex-shrink-0 truncate overflow-hidden">{item.ticker}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.bg }} />
                  <span className="text-xs text-gray-500 truncate flex-1">{item.investorName}</span>
                  <span className="text-xs font-semibold text-red-500 font-mono whitespace-nowrap flex-shrink-0">-{item.maxPctChange.toFixed(0)}%</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Consensus */}
        <div>
          <h3 className="text-sm font-semibold text-purple-700 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            共识持仓
          </h3>
          <div className="flex flex-col gap-2.5">
            {insights.consensus.length === 0 && <p className="text-xs text-gray-400">暂无共识持仓</p>}
            {insights.consensus.map(item => (
              <Link key={item.ticker} href={`/stock/${encodeURIComponent(item.ticker)}`} className="flex items-center gap-2 group">
                <span className="font-mono font-bold text-sm text-gray-900 group-hover:text-purple-700 transition-colors w-16 flex-shrink-0 truncate overflow-hidden">{item.ticker}</span>
                <div className="flex items-center gap-0.5 flex-1">
                  {item.investorIds.map(invId => {
                    const inv = investors.find(i => i.id === invId)
                    if (!inv) return null
                    return (
                      <span
                        key={invId}
                        className="w-5 h-5 rounded-full border-2 border-white flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: inv.color.bg }}
                        title={inv.name_cn}
                      >
                        {inv.name_cn[0]}
                      </span>
                    )
                  })}
                </div>
                <span className="text-xs text-gray-500">{item.investorCount}人</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top 2Qtr Buys */}
        <div>
          <h3 className="text-sm font-semibold text-blue-700 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            过去2季度高仓位加仓
          </h3>
          <p className="text-xs text-gray-400 mb-2">按仓位占比排序</p>
          <div className="flex flex-col gap-2">
            {topBuys2Qtr.length === 0 && <p className="text-xs text-gray-400">暂无数据</p>}
            {topBuys2Qtr.map((item, i) => {
              const color = COLORS_BY_CIK[item.investorCik] ?? DEFAULT_COLOR
              return (
                <Link key={`${item.investorCik}-${item.ticker}`} href={`/stock/${encodeURIComponent(item.ticker)}`} className="flex items-center gap-1.5 group">
                  <span className="text-xs text-gray-400 w-4 font-mono flex-shrink-0">{i + 1}</span>
                  <span className="font-mono font-bold text-xs text-gray-900 group-hover:text-blue-700 transition-colors w-16 flex-shrink-0 truncate overflow-hidden">{item.ticker}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.bg }} />
                  <span className="text-xs text-gray-500 truncate flex-1">{item.investorName}</span>
                  <span className="text-xs font-semibold text-blue-600 font-mono whitespace-nowrap flex-shrink-0">{item.pctOfPortfolio.toFixed(1)}%</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

type Changes = Awaited<ReturnType<typeof getDashboardChanges>>
type TopBuys2Qtr = Awaited<ReturnType<typeof getDashboard2QtrTopBuys>>

function KpiBar({ changes, consensusCount }: { changes: Changes; consensusCount: number }) {
  const total = changes.length
  const newCount = changes.filter(c => c.changeType === 'NEW').length
  const exitCount = changes.filter(c => c.changeType === 'EXITED').length
  const stats = [
    { label: '本季度变动', value: total, color: 'text-purple-700', bg: 'bg-purple-50' },
    { label: '新建仓', value: newCount, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: '清仓', value: exitCount, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '共识持仓', value: consensusCount, color: 'text-blue-700', bg: 'bg-blue-50' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {stats.map(s => (
        <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}


function AIOverview() {
  return (
    <div
      className="rounded-xl p-5 shadow-sm mb-5 text-white"
      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🤖</span>
        <div>
          <p className="text-xs font-semibold text-white/60 mb-1">AI 季度总结</p>
          <p className="text-sm text-white leading-relaxed">AI 分析功能即将上线 — 将自动为每季度持仓变动生成中文深度分析报告。</p>
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const [investorsWithFilings, changes, topBuys2Qtr] = await Promise.all([
    getInvestorsWithLatestFiling(),
    getDashboardChanges(),
    getDashboard2QtrTopBuys(),
  ])

  const insights = await getDashboardInsights(investorsWithFilings)

  const currentQuarter = investorsWithFilings
    .filter(i => i.latestPeriod)
    .map(i => i.latestPeriod as string)
    .sort()
    .reverse()[0] ?? '2025Q4'

  const investorChips = investorsWithFilings.map(inv => ({
    id: inv.id,
    name_cn: inv.name_cn,
    cik: inv.cik,
  }))

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-500 mt-0.5">追踪 {investorsWithFilings.length} 位顶级投资人最新持仓变动</p>
      </div>

      <StatusBar investors={investorsWithFilings} currentQuarter={currentQuarter} />
      <KpiBar changes={changes} consensusCount={insights.consensus.length} />
      <AIOverview />
      <OverallInsights insights={insights} investors={investorsWithFilings} currentQuarter={currentQuarter} topBuys2Qtr={topBuys2Qtr} />

      <PositionChangesSection
        changes={changes}
        investors={investorChips}
        quarter={quarterLabel(currentQuarter)}
      />
    </div>
  )
}
