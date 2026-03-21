import Link from 'next/link'
import {
  getInvestorsWithLatestFiling, getDashboardChanges, getDashboardInsights,
  CHANGE_META, ChangeType, formatValue, quarterLabel,
  COLORS_BY_CIK, DEFAULT_COLOR, InvestorWithFiling,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

function InvestorBadge({ investorId, investorName, cik }: { investorId: number; investorName: string; cik: string }) {
  const c = COLORS_BY_CIK[cik] ?? DEFAULT_COLOR
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: c.light, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.bg }} />
      {investorName}
    </span>
  )
}

type Change = Awaited<ReturnType<typeof getDashboardChanges>>[number]

function ChangeCard({ change }: { change: Change }) {
  const meta = CHANGE_META[change.changeType]
  return (
    <div
      className="bg-white rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow border-t-2"
      style={{ borderTopColor: meta.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-mono font-bold text-gray-900 text-sm">{change.ticker}</span>
            {change.pctChange != null && Math.abs(change.pctChange) > 0 && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: meta.bg, color: meta.text }}
              >
                {change.pctChange > 0 ? '+' : ''}{change.pctChange.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{change.companyName || '—'}</p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium flex-shrink-0"
          style={{ backgroundColor: meta.bg, color: meta.text }}
        >
          {meta.emoji} {meta.label}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <InvestorBadge investorId={change.investorId} investorName={change.investorName} cik={change.investorCik} />
        {change.valueUsd > 0 && (
          <span className="text-xs text-gray-400 font-mono">{formatValue(change.valueUsd)}</span>
        )}
      </div>
    </div>
  )
}

function ChangeColumn({ type, title, changes }: { type: ChangeType; title: string; changes: Change[] }) {
  const meta = CHANGE_META[type]
  const filtered = changes.filter(c => c.changeType === type)
  return (
    <div className="flex-1 min-w-0">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
        style={{ backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
      >
        <span className="text-base">{meta.emoji}</span>
        <span className="font-semibold text-sm" style={{ color: meta.text }}>{title}</span>
        <span
          className="ml-auto text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full text-white"
          style={{ backgroundColor: meta.border }}
        >
          {filtered.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-6">暂无变动</div>
        ) : (
          filtered.map(c => <ChangeCard key={c.id} change={c} />)
        )}
      </div>
    </div>
  )
}

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

function OverallInsights({ insights, investors, currentQuarter }: {
  insights: Insights
  investors: InvestorWithFiling[]
  currentQuarter: string
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
      <h2 className="text-base font-bold text-gray-900 mb-4">📊 总体洞察 — {quarterLabel(currentQuarter)}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Buys */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            新建/加仓最多
          </h3>
          <div className="flex flex-col gap-2">
            {insights.topBuys.length === 0 && <p className="text-xs text-gray-400">暂无数据</p>}
            {insights.topBuys.map((item, i) => (
              <Link key={item.ticker} href={`/stock/${encodeURIComponent(item.ticker)}`} className="flex items-center gap-2 group">
                <span className="text-xs text-gray-400 w-4 font-mono">{i + 1}</span>
                <span className="font-mono font-bold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors w-14">{item.ticker}</span>
                <span className="text-xs text-gray-500 truncate flex-1">{item.name}</span>
                <span className="text-xs font-semibold text-emerald-600 font-mono whitespace-nowrap">{formatValue(item.totalValue)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Sells */}
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            减仓/清仓最多
          </h3>
          <div className="flex flex-col gap-2">
            {insights.topSells.length === 0 && <p className="text-xs text-gray-400">暂无数据</p>}
            {insights.topSells.map((item, i) => (
              <Link key={item.ticker} href={`/stock/${encodeURIComponent(item.ticker)}`} className="flex items-center gap-2 group">
                <span className="text-xs text-gray-400 w-4 font-mono">{i + 1}</span>
                <span className="font-mono font-bold text-sm text-gray-900 group-hover:text-red-600 transition-colors w-14">{item.ticker}</span>
                <span className="text-xs text-gray-500 truncate flex-1">{item.name}</span>
              </Link>
            ))}
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
                <span className="font-mono font-bold text-sm text-gray-900 group-hover:text-purple-700 transition-colors w-16">{item.ticker}</span>
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
      </div>
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
  const [investorsWithFilings, changes] = await Promise.all([
    getInvestorsWithLatestFiling(),
    getDashboardChanges(),
  ])

  const insights = await getDashboardInsights(investorsWithFilings)

  // Determine the most recent quarter across all investors
  const currentQuarter = investorsWithFilings
    .filter(i => i.latestPeriod)
    .map(i => i.latestPeriod as string)
    .sort()
    .reverse()[0] ?? '2025Q4'

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-500 mt-0.5">追踪 {investorsWithFilings.length} 位顶级投资人最新持仓变动</p>
      </div>

      <StatusBar investors={investorsWithFilings} currentQuarter={currentQuarter} />
      <AIOverview />
      <OverallInsights insights={insights} investors={investorsWithFilings} currentQuarter={currentQuarter} />

      <div className="mb-3">
        <h2 className="text-base font-bold text-gray-900">本季度持仓变动</h2>
        <p className="text-xs text-gray-500 mt-0.5">所有追踪投资人的 {quarterLabel(currentQuarter)} 操作汇总</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ChangeColumn type="NEW"       title="新建仓" changes={changes} />
        <ChangeColumn type="INCREASED" title="加仓"   changes={changes} />
        <ChangeColumn type="DECREASED" title="减仓"   changes={changes} />
        <ChangeColumn type="EXITED"    title="清仓"   changes={changes} />
      </div>
    </div>
  )
}
