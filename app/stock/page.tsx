'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { investors, investorPositions, INVESTOR_COLORS, CHANGE_META, formatValue } from '@/lib/mockData'

// Collect all unique tickers across all investors & quarters
function getAllTickers() {
  const map = new Map<string, { companyName: string; holders: string[] }>()
  for (const inv of investors) {
    const quarters = Object.keys(investorPositions[inv.id] || {})
    if (!quarters.length) continue
    const positions = investorPositions[inv.id][quarters[0]] || []
    for (const pos of positions) {
      const entry = map.get(pos.ticker) || { companyName: pos.companyName, holders: [] }
      if (!entry.holders.includes(inv.nameCn)) entry.holders.push(inv.nameCn)
      map.set(pos.ticker, entry)
    }
  }
  return Array.from(map.entries())
    .map(([ticker, v]) => ({ ticker, ...v }))
    .sort((a, b) => b.holders.length - a.holders.length || a.ticker.localeCompare(b.ticker))
}

export default function StockIndexPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const allTickers = getAllTickers()
  const filtered = query.trim()
    ? allTickers.filter(t =>
        t.ticker.toLowerCase().includes(query.toLowerCase()) ||
        t.companyName.toLowerCase().includes(query.toLowerCase())
      )
    : allTickers

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const match = allTickers.find(t => t.ticker.toLowerCase() === query.toLowerCase())
    if (match) router.push(`/stock/${match.ticker}`)
    else if (query.trim()) router.push(`/stock/${query.trim().toUpperCase()}`)
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">个股视角</h1>
        <p className="text-sm text-gray-500 mt-0.5">查看哪些大师投资人持有某只股票及其操作变动</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索股票代码或公司名称，如 AAPL 或 Apple"
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white shadow-sm"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
        >
          查看
        </button>
      </form>

      {/* Ticker grid */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          追踪投资人持仓的所有股票
          <span className="ml-2 text-gray-400 font-normal">({filtered.length} 只)</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-400 font-medium py-2 pr-6">代码</th>
                <th className="text-left text-xs text-gray-400 font-medium py-2 pr-6">公司</th>
                <th className="text-left text-xs text-gray-400 font-medium py-2">持有人</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.ticker} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                  <td className="py-2.5 pr-6">
                    <Link
                      href={`/stock/${t.ticker}`}
                      className="font-mono font-bold text-gray-900 group-hover:text-purple-700 transition-colors"
                    >
                      {t.ticker}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-6 text-sm text-gray-500">{t.companyName}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1">
                      {t.holders.map(name => {
                        const inv = investors.find(i => i.nameCn === name)
                        return inv ? (
                          <span
                            key={name}
                            className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
                            style={{ backgroundColor: inv.color }}
                            title={name}
                          >
                            {name[0]}
                          </span>
                        ) : null
                      })}
                      <span className="text-xs text-gray-400 ml-1">{t.holders.length}人</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
