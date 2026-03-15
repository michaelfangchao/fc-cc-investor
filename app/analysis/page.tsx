'use client'

import { useState } from 'react'
import Link from 'next/link'
import { investors, investorPositions, INVESTOR_COLORS, CHANGE_META, investorAISummaries, formatValue } from '@/lib/mockData'

export default function AnalysisPage() {
  const [ticker, setTicker] = useState('')
  const [searched, setSearched] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (ticker.trim()) setSearched(ticker.trim().toUpperCase())
  }

  const upperTicker = searched.toUpperCase()

  // Find holdings
  const holdings = searched ? investors.flatMap(inv => {
    const quarters = Object.keys(investorPositions[inv.id] || {})
    if (!quarters.length) return []
    const pos = (investorPositions[inv.id][quarters[0]] || []).find(p => p.ticker === upperTicker)
    if (!pos) return []
    return [{ inv, pos }]
  }) : []

  // Sample tickers for quick access
  const sampleTickers = ['AAPL', 'GOOG', 'TSLA', 'OXY', 'BYD', 'META', 'BRK.B']

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">AI 分析</h1>
        <p className="text-sm text-gray-500 mt-0.5">查看任意投资人的持仓分析，或搜索个股的多投资人持仓对比</p>
      </div>

      {/* Per-investor AI analysis */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-gray-900 mb-3">投资人持仓策略分析</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investors.map(inv => {
            const summary = investorAISummaries[inv.id]
            const c = INVESTOR_COLORS[inv.id]
            return (
              <Link key={inv.id} href={`/investor/${inv.id}`}>
                <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      {inv.nameCn[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{inv.nameCn}</p>
                      <p className="text-xs text-gray-400">{inv.institution}</p>
                    </div>
                  </div>
                  {summary && (
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{summary.summaryOneLine}</p>
                  )}
                  <p className="text-xs mt-2" style={{ color: c.text }}>查看完整分析 →</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Stock search */}
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

        {/* Quick tickers */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {sampleTickers.map(t => (
            <button
              key={t}
              onClick={() => { setTicker(t); setSearched(t) }}
              className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold border border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-colors bg-gray-50"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Results */}
        {searched && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              <span className="font-mono">{upperTicker}</span> 的持仓情况
            </h3>
            {holdings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>暂无追踪的投资人持有 <span className="font-mono">{upperTicker}</span></p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {holdings.map(({ inv, pos }) => {
                  const c = INVESTOR_COLORS[inv.id]
                  const meta = pos.changeType ? CHANGE_META[pos.changeType] : null
                  return (
                    <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: c.bg }}
                      >
                        {inv.nameCn[0]}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{inv.nameCn}</span>
                      <span className="text-xs text-gray-400">{inv.institution}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-gray-900">{pos.pctOfPortfolio.toFixed(1)}%</span>
                        <span className="text-xs text-gray-400 font-mono">{formatValue(pos.valueUsd)}</span>
                        {meta && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: meta.bg, color: meta.text }}
                          >
                            {meta.emoji} {pos.pctChange !== undefined ? `${pos.pctChange > 0 ? '+' : ''}${pos.pctChange.toFixed(1)}%` : meta.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {holdings.length > 0 && (
              <div
                className="rounded-xl p-4 text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">🤖</span>
                  <div>
                    <p className="text-xs font-semibold text-white/60 mb-1">AI 综合分析（模拟数据）</p>
                    <p className="text-sm leading-relaxed">
                      {upperTicker} 目前被 {holdings.length} 位追踪投资人持有，
                      {holdings.map(h => `${h.inv.nameCn}占仓位 ${h.pos.pctOfPortfolio.toFixed(1)}%`).join('，')}。
                      持仓集中度和变动方向显示机构对该股票持有{holdings.some(h => h.pos.changeType === 'INCREASED' || h.pos.changeType === 'NEW') ? '较为积极' : '谨慎'}的态度。
                      连接后端后，这里将展示基于最新13F数据的完整 AI 辩证分析。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
