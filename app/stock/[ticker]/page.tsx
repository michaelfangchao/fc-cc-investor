import Link from 'next/link'
import { db, investors, filings, positions, stocks, position_changes } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { COLORS_BY_CIK, DEFAULT_COLOR, CHANGE_META, ChangeType, formatValue, formatShares, quarterLabel } from '@/lib/ui-constants'
import StockChart from '@/components/StockChart'

export const dynamic = 'force-dynamic'

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  const upperTicker = decodeURIComponent(ticker).toUpperCase()

  // Find the stock by ticker
  const [stock] = await db.select().from(stocks).where(eq(stocks.ticker, upperTicker))

  if (!stock) {
    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700 transition-colors">仪表盘</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium font-mono">{upperTicker}</span>
        </div>
        <div className="bg-white rounded-xl p-10 shadow-sm text-center text-gray-400">
          <p className="text-lg mb-2">未找到股票 <span className="font-mono">{upperTicker}</span></p>
          <p className="text-sm">该股票可能未被任何追踪投资人持有，或股票代码有误</p>
          <Link href="/" className="mt-4 inline-block text-purple-600 text-sm hover:underline">← 返回仪表盘</Link>
        </div>
      </div>
    )
  }

  // Get all investors
  const allInvestors = await db.select().from(investors)

  // Get latest filing for each investor
  const allFilings = await db.select().from(filings)
  const investorFilingMap = new Map<number, { filingId: number; period: string }>()
  for (const inv of allInvestors) {
    const invFilings = allFilings
      .filter(f => f.investor_id === inv.id)
      .sort((a, b) => b.period.localeCompare(a.period))
    if (invFilings[0]) {
      investorFilingMap.set(inv.id, { filingId: invFilings[0].id, period: invFilings[0].period })
    }
  }

  // Get all positions for this stock
  const stockPositions = await db.select().from(positions).where(eq(positions.stock_id, stock.id))
  const positionsByFiling = new Map(stockPositions.map(p => [p.filing_id, p]))

  // Get all changes for this stock
  const stockChanges = await db.select().from(position_changes).where(eq(position_changes.stock_id, stock.id))
  const changesByInvestorQuarter = new Map(stockChanges.map(c => [`${c.investor_id}:${c.quarter}`, c]))

  // Build holdings list (latest quarter per investor)
  const holdings: {
    investor: typeof allInvestors[0]
    period: string
    pct: number
    value: number
    shares: number
    changeType: ChangeType | null
    pctChange: number | null
  }[] = []

  for (const inv of allInvestors) {
    const filing = investorFilingMap.get(inv.id)
    if (!filing) continue
    const pos = positionsByFiling.get(filing.filingId)
    if (!pos) continue
    const change = changesByInvestorQuarter.get(`${inv.id}:${filing.period}`)
    holdings.push({
      investor: inv,
      period: filing.period,
      pct: pos.pct_of_portfolio ?? 0,
      value: pos.value_usd,
      shares: pos.shares,
      changeType: (change?.change_type as ChangeType | null) ?? null,
      pctChange: change?.pct_change ?? null,
    })
  }

  const currentQuarter = holdings.length > 0
    ? holdings.map(h => h.period).sort().reverse()[0]
    : null

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
            <p className="text-sm text-gray-500">{stock.name_en}</p>
          </div>
        </div>
      </div>

      {/* Historical chart — client component */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">持仓历史趋势</h2>
        <StockChart ticker={upperTicker} />
      </div>

      {holdings.length === 0 ? (
        <div className="bg-white rounded-xl p-10 shadow-sm text-center text-gray-400">
          <p className="text-lg mb-2">暂无追踪的投资人当前持有此股票</p>
          <p className="text-sm">在仪表盘或投资人详情页浏览更多持仓</p>
          <Link href="/" className="mt-4 inline-block text-purple-600 text-sm hover:underline">← 返回仪表盘</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            持有该股的投资人
            {currentQuarter && <span className="ml-2 text-sm font-normal text-gray-500">— {quarterLabel(currentQuarter)}</span>}
            <span className="ml-2 text-sm font-normal text-gray-500">({holdings.length}人)</span>
          </h2>
          <div className="flex flex-col gap-3">
            {holdings.map(h => {
              const c = COLORS_BY_CIK[h.investor.cik] ?? DEFAULT_COLOR
              const meta = h.changeType ? CHANGE_META[h.changeType] : null
              return (
                <Link key={h.investor.id} href={`/investor/${h.investor.id}`}>
                  <div className="flex items-center gap-3 md:gap-4 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      {h.investor.name_cn[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{h.investor.name_cn}</p>
                      <p className="text-xs text-gray-500 hidden sm:block">{h.investor.institution}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-gray-900">{h.pct.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400 font-mono hidden sm:block">{formatValue(h.value)}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400 font-mono hidden md:block">
                      {formatShares(h.shares)}
                    </div>
                    {meta && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        {meta.emoji} {h.pctChange !== null ? `${h.pctChange > 0 ? '+' : ''}${h.pctChange.toFixed(1)}%` : meta.label}
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
