'use client'

import { useState } from 'react'
import Link from 'next/link'
import { COLORS_BY_CIK, DEFAULT_COLOR, CHANGE_META, formatValue } from '@/lib/ui-constants'

type Holding = {
  investorId: number
  investorName: string
  investorCik: string
  institution: string
  pct: number
  value: number
  changeType: string | null
  pctChange: number | null
}

export default function AnalysisPage() {
  const [ticker, setTicker] = useState('')
  const [results, setResults] = useState<{ ticker: string; holdings: Holding[] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function doSearch(t: string) {
    const upper = t.trim().toUpperCase()
    if (!upper) return
    setLoading(true)
    try {
      const res = await fetch(`/api/stock-search?ticker=${encodeURIComponent(upper)}`)
      const data = await res.json()
      setResults(data)
    } catch {
      setResults({ ticker: upper, holdings: [] })
    }
    setLoading(false)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    doSearch(ticker)
  }

  const sampleTickers = ['AAPL', 'GOOG', 'OXY', 'TSM', 'NVDA', 'META', 'BABA']

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">AI 分析</h1>
        <p className="text-sm text-gray-500 mt-0.5">搜索个股查看追踪投资人的持仓情况，或前往投资人详情页查看完整 AI 分析</p>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-4">个股持仓搜索</h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="输入股票代码，如 AAPL"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
          >
            搜索
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {sampleTickers.map(t => (
            <button
              key={t}
              onClick={() => { setTicker(t); doSearch(t) }}
              className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-colors bg-gray-50"
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-8 text-gray-400 text-sm">搜索中...</div>}

        {!loading && results && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              <span className="font-mono">{results.ticker}</span> 的持仓情况
            </h3>
            {results.holdings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>暂无追踪的投资人持有 <span className="font-mono">{results.ticker}</span></p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {results.holdings.map(h => {
                  const c = COLORS_BY_CIK[h.investorCik] ?? DEFAULT_COLOR
                  const meta = h.changeType ? CHANGE_META[h.changeType as keyof typeof CHANGE_META] : null
                  return (
                    <Link key={h.investorId} href={`/investor/${h.investorId}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:shadow-sm transition-all">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                          style={{ backgroundColor: c.bg }}
                        >
                          {h.investorName[0]}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{h.investorName}</span>
                        <span className="text-xs text-gray-400">{h.institution}</span>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-gray-900">{h.pct.toFixed(1)}%</span>
                          <span className="text-xs text-gray-400 font-mono">{formatValue(h.value)}</span>
                          {meta && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: meta.bg, color: meta.text }}
                            >
                              {meta.emoji} {h.pctChange !== null ? `${h.pctChange > 0 ? '+' : ''}${h.pctChange.toFixed(1)}%` : meta.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
