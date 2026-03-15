import Link from 'next/link'
import { investors, investorPositions, INVESTOR_COLORS, CHANGE_META, formatValue, formatShares } from '@/lib/mockData'

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const upperTicker = ticker.toUpperCase()

  // Find all investors who hold this stock in latest quarter
  const holdings: { investor: typeof investors[0]; pct: number; value: number; shares: number; changeType?: string; pctChange?: number }[] = []

  for (const inv of investors) {
    const quarters = Object.keys(investorPositions[inv.id] || {})
    if (quarters.length === 0) continue
    const latestQ = quarters[0]
    const positions = investorPositions[inv.id][latestQ] || []
    const pos = positions.find(p => p.ticker === upperTicker)
    if (pos) {
      holdings.push({
        investor: inv,
        pct: pos.pctOfPortfolio,
        value: pos.valueUsd,
        shares: pos.shares,
        changeType: pos.changeType,
        pctChange: pos.pctChange,
      })
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-700 transition-colors">仪表盘</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium font-mono">{upperTicker}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-mono font-bold text-gray-700">
            {upperTicker.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono text-gray-900">{upperTicker}</h1>
            <p className="text-sm text-gray-500">个股持仓视角</p>
          </div>
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="bg-white rounded-xl p-10 shadow-sm text-center text-gray-400">
          <p className="text-lg mb-2">暂无追踪的投资人持有此股票</p>
          <p className="text-sm">在仪表盘或投资人详情页浏览更多持仓</p>
          <Link href="/" className="mt-4 inline-block text-purple-600 text-sm hover:underline">← 返回仪表盘</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            持有该股的投资人 — 2024 Q4
            <span className="ml-2 text-sm font-normal text-gray-500">({holdings.length}人)</span>
          </h2>
          <div className="flex flex-col gap-3">
            {holdings.map(h => {
              const c = INVESTOR_COLORS[h.investor.id]
              const meta = h.changeType ? CHANGE_META[h.changeType as keyof typeof CHANGE_META] : null
              return (
                <Link key={h.investor.id} href={`/investor/${h.investor.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      {h.investor.nameCn[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{h.investor.nameCn}</p>
                      <p className="text-xs text-gray-500">{h.investor.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-gray-900">{h.pct.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400 font-mono">{formatValue(h.value)}</p>
                    </div>
                    {meta && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        {meta.emoji} {h.pctChange !== undefined ? `${h.pctChange > 0 ? '+' : ''}${h.pctChange.toFixed(1)}%` : meta.label}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
