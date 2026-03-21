import Link from 'next/link'
import { db, stocks, positions, filings, investors } from '@/lib/db'
import { COLORS_BY_CIK, DEFAULT_COLOR } from '@/lib/ui-constants'

export const dynamic = 'force-dynamic'

export default async function StockIndexPage() {
  const [allStocks, allFilings, allInvestors, allPositions] = await Promise.all([
    db.select().from(stocks),
    db.select().from(filings),
    db.select().from(investors),
    db.select().from(positions),
  ])

  const filingInvestorMap = new Map(allFilings.map(f => [f.id, f.investor_id]))

  const stockHoldersMap = new Map<number, Set<number>>()
  for (const pos of allPositions) {
    const investorId = filingInvestorMap.get(pos.filing_id)
    if (!investorId) continue
    const set = stockHoldersMap.get(pos.stock_id) ?? new Set()
    set.add(investorId)
    stockHoldersMap.set(pos.stock_id, set)
  }

  const investorMap = new Map(allInvestors.map(i => [i.id, i]))

  const displayStocks = allStocks
    .filter(s => stockHoldersMap.has(s.id))
    .sort((a, b) => {
      const aCount = stockHoldersMap.get(a.id)?.size ?? 0
      const bCount = stockHoldersMap.get(b.id)?.size ?? 0
      return bCount - aCount || (a.ticker ?? '').localeCompare(b.ticker ?? '')
    })

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">个股视角</h1>
        <p className="text-sm text-gray-500 mt-0.5">查看哪些大师投资人持有某只股票及其操作变动</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 md:p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          追踪投资人持仓的所有股票
          <span className="ml-2 text-gray-400 font-normal">({displayStocks.length} 只)</span>
        </h2>

        {displayStocks.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <p className="text-sm mb-1">暂无持仓数据</p>
            <p className="text-xs">在设置页添加投资人并完成回溯后，持仓数据将显示在此处</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4">代码</th>
                  <th className="text-left text-xs text-gray-400 font-medium py-2 pr-4 hidden sm:table-cell">公司</th>
                  <th className="text-left text-xs text-gray-400 font-medium py-2">持有人</th>
                </tr>
              </thead>
              <tbody>
                {displayStocks.map(s => {
                  const holderIds = [...(stockHoldersMap.get(s.id) ?? [])]
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/stock/${encodeURIComponent(s.ticker ?? s.cusip)}`}
                          className="font-mono font-bold text-gray-900 group-hover:text-purple-700 transition-colors"
                        >
                          {s.ticker ?? s.cusip}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-sm text-gray-500 hidden sm:table-cell">{s.name_en}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          {holderIds.map(invId => {
                            const inv = investorMap.get(invId)
                            if (!inv) return null
                            const color = COLORS_BY_CIK[inv.cik] ?? DEFAULT_COLOR
                            return (
                              <span
                                key={invId}
                                className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                                style={{ backgroundColor: color.bg }}
                                title={inv.name_cn}
                              >
                                {inv.name_cn[0]}
                              </span>
                            )
                          })}
                          <span className="text-xs text-gray-400 ml-1">{holderIds.length}人</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
