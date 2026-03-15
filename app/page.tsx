import Link from 'next/link'
import {
  investors, recentChanges, topBuys, topSells, consensusHoldings,
  overallAISummary, INVESTOR_COLORS, CHANGE_META, ChangeType,
  formatValue
} from '@/lib/mockData'

function InvestorBadge({ investorId }: { investorId: string }) {
  const inv = investors.find(i => i.id === investorId)
  if (!inv) return null
  const c = INVESTOR_COLORS[investorId]
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: c.light, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.bg }} />
      {inv.nameCn}
    </span>
  )
}

function ChangeCard({ change }: { change: typeof recentChanges[0] }) {
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
            {change.pctChange !== undefined && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: meta.bg, color: meta.text }}
              >
                {change.pctChange > 0 ? '+' : ''}{change.pctChange.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{change.companyName}</p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium flex-shrink-0"
          style={{ backgroundColor: meta.bg, color: meta.text }}
        >
          {change.sector}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <InvestorBadge investorId={change.investorId} />
        {change.valueUsd > 0 && (
          <span className="text-xs text-gray-400 font-mono">{formatValue(change.valueUsd)}</span>
        )}
      </div>
    </div>
  )
}

function ChangeColumn({ type, title }: { type: ChangeType; title: string }) {
  const meta = CHANGE_META[type]
  const changes = recentChanges.filter(c => c.changeType === type)
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
          {changes.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {changes.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-6">暂无变动</div>
        ) : (
          changes.map(c => <ChangeCard key={c.id} change={c} />)
        )}
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">本季度更新状态 — 2024 Q4</h2>
        <span className="text-xs text-gray-400">13F 申报截止 2025-02-14</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {investors.map(inv => (
          <Link key={inv.id} href={`/investor/${inv.id}`}>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:shadow-sm transition-shadow cursor-pointer"
              style={{
                borderColor: inv.updated ? inv.color : '#e5e7eb',
                backgroundColor: inv.updated ? `${inv.color}12` : '#f9fafb',
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: inv.updated ? inv.color : '#9ca3af' }} />
              <span className="text-sm font-medium text-gray-800">{inv.nameCn}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${inv.updated ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {inv.updated ? '✓ 已更新' : '待更新'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function OverallInsights() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
      <h2 className="text-base font-bold text-gray-900 mb-4">📊 总体洞察 — 2024 Q4</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Buys */}
        <div>
          <h3 className="text-sm font-semibold text-emerald-700 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            买入最多
          </h3>
          <div className="flex flex-col gap-2">
            {topBuys.map((item, i) => (
              <Link key={item.ticker} href={`/stock/${item.ticker}`} className="flex items-center gap-2 group">
                <span className="text-xs text-gray-400 w-4 font-mono">{i + 1}</span>
                <span className="font-mono font-bold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors w-14">{item.ticker}</span>
                <span className="text-xs text-gray-500 truncate flex-1">{item.companyName}</span>
                <span className="text-xs font-semibold text-emerald-600 font-mono whitespace-nowrap">+{formatValue(item.totalValueAdded)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Sells */}
        <div>
          <h3 className="text-sm font-semibold text-red-600 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            卖出最多
          </h3>
          <div className="flex flex-col gap-2">
            {topSells.map((item, i) => (
              <Link key={item.ticker} href={`/stock/${item.ticker}`} className="flex items-center gap-2 group">
                <span className="text-xs text-gray-400 w-4 font-mono">{i + 1}</span>
                <span className="font-mono font-bold text-sm text-gray-900 group-hover:text-red-600 transition-colors w-14">{item.ticker}</span>
                <span className="text-xs text-gray-500 truncate flex-1">{item.companyName}</span>
                <span className="text-xs font-semibold text-red-600 font-mono whitespace-nowrap">-{formatValue(item.totalValueRemoved)}</span>
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
            {consensusHoldings.map(item => (
              <Link key={item.ticker} href={`/stock/${item.ticker}`} className="flex items-center gap-2 group">
                <span className="font-mono font-bold text-sm text-gray-900 group-hover:text-purple-700 transition-colors w-16">{item.ticker}</span>
                <div className="flex items-center gap-0.5 flex-1">
                  {item.investors.map(name => {
                    const inv = investors.find(i => i.nameCn === name)
                    return inv ? (
                      <span
                        key={name}
                        className="w-5 h-5 rounded-full border-2 border-white flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: inv.color }}
                        title={name}
                      >
                        {name[0]}
                      </span>
                    ) : null
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
          <p className="text-sm text-white leading-relaxed">{overallAISummary}</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-500 mt-0.5">追踪 5 位顶级投资人最新持仓变动 · 2024 Q4</p>
      </div>

      <StatusBar />
      <AIOverview />
      <OverallInsights />

      <div className="mb-3">
        <h2 className="text-base font-bold text-gray-900">本季度持仓变动</h2>
        <p className="text-xs text-gray-500 mt-0.5">所有追踪投资人的 2024 Q4 操作汇总</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ChangeColumn type="NEW"       title="新建仓" />
        <ChangeColumn type="INCREASED" title="加仓" />
        <ChangeColumn type="DECREASED" title="减仓" />
        <ChangeColumn type="EXITED"    title="清仓" />
      </div>
    </div>
  )
}
