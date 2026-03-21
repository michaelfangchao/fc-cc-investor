'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CHANGE_META, formatValue, formatShares, quarterLabel, ChangeType } from '@/lib/ui-constants'

type Color = { bg: string; light: string; text: string; border: string }

type InvestorProp = {
  id: number
  name_cn: string
  name_en: string
  institution: string
  cik: string
  color: Color
}

type FilingProp = {
  id: number
  period: string
  filed_date: string | null
  accession_number: string
}

type PositionProp = {
  id: number
  stockId: number
  ticker: string
  companyName: string
  shares: number
  valueUsd: number
  pctOfPortfolio: number
  changeType: ChangeType | null
  pctChange: number | null
}

type HistoryRow = {
  quarter: string
  shares: number
  valueUsd: number
  pctOfPortfolio: number
  changeType: string | null
  pctChange: number | null
}

interface Props {
  investor: InvestorProp
  filings: FilingProp[]
  defaultPositions: PositionProp[]
  defaultQuarter: string
  totalValue: number
}

function QuarterSelector({ filings, selected, onChange, color }: {
  filings: FilingProp[]
  selected: string
  onChange: (q: string) => void
  color: Color
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 mr-1">查看季度：</span>
      {filings.slice(0, 8).map(f => (
        <button
          key={f.period}
          onClick={() => onChange(f.period)}
          className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
          style={selected === f.period
            ? { backgroundColor: color.bg, color: 'white', borderColor: color.bg }
            : { backgroundColor: 'white', color: '#374151', borderColor: '#e5e7eb' }
          }
        >
          {quarterLabel(f.period)}
        </button>
      ))}
    </div>
  )
}

// Expanded row showing historical timeline for one stock
function HistoryExpandedRow({
  investorId, stockId, ticker, color, colSpan
}: {
  investorId: number
  stockId: number
  ticker: string
  color: Color
  colSpan: number
}) {
  const [rows, setRows] = useState<HistoryRow[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stock-history?investorId=${investorId}&stockId=${stockId}`)
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false) })
      .catch(() => { setRows([]); setLoading(false) })
  }, [investorId, stockId])

  const maxShares = rows ? Math.max(...rows.map(r => r.shares), 1) : 1

  return (
    <tr>
      <td colSpan={colSpan} className="px-0 pb-2">
        <div
          className="mx-4 mb-2 rounded-xl border overflow-hidden"
          style={{ borderColor: `${color.bg}30`, backgroundColor: `${color.bg}06` }}
        >
          <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: `${color.bg}20` }}>
            <span className="text-xs font-semibold" style={{ color: color.text }}>
              📋 {ticker} 历史持仓记录
            </span>
            <span className="text-xs text-gray-400">（按季度，最新在前）</span>
          </div>

          {loading && (
            <div className="text-center text-gray-400 text-xs py-4">加载中...</div>
          )}

          {rows && rows.length === 0 && (
            <div className="text-center text-gray-400 text-xs py-4">暂无历史数据</div>
          )}

          {rows && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: `${color.bg}20` }}>
                    <th className="text-left text-gray-400 font-medium px-4 py-2">季度</th>
                    <th className="text-right text-gray-400 font-medium px-3 py-2">市值</th>
                    <th className="text-right text-gray-400 font-medium px-3 py-2">股数</th>
                    <th className="text-right text-gray-400 font-medium px-3 py-2">占比</th>
                    <th className="px-4 py-2 w-40">持仓变化</th>
                    <th className="text-left text-gray-400 font-medium px-3 py-2">变动</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const meta = row.changeType ? CHANGE_META[row.changeType as ChangeType] : null
                    const barWidth = Math.round((row.shares / maxShares) * 100)
                    const isLatest = i === 0
                    return (
                      <tr
                        key={row.quarter}
                        className="border-b last:border-0 transition-colors"
                        style={{
                          borderColor: `${color.bg}15`,
                          backgroundColor: isLatest ? `${color.bg}08` : 'transparent'
                        }}
                      >
                        <td className="px-4 py-2 font-semibold text-gray-700">
                          {quarterLabel(row.quarter)}
                          {isLatest && (
                            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: `${color.bg}20`, color: color.text }}>
                              最新
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">
                          {formatValue(row.valueUsd)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600">
                          {formatShares(row.shares)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600">
                          {row.pctOfPortfolio.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 w-40">
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${barWidth}%`, backgroundColor: color.bg }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {meta ? (
                            <span
                              className="px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                              style={{ backgroundColor: meta.bg, color: meta.text }}
                            >
                              {meta.emoji} {row.pctChange != null && Math.abs(row.pctChange) > 0
                                ? `${row.pctChange > 0 ? '+' : ''}${row.pctChange.toFixed(1)}%`
                                : meta.label}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function PositionTable({ positions, totalValue, color, investorId }: {
  positions: PositionProp[]
  totalValue: number
  color: Color
  investorId: number
}) {
  const [expandedStockId, setExpandedStockId] = useState<number | null>(null)

  if (positions.length === 0) {
    return <div className="text-center text-gray-400 py-10">暂无该季度数据</div>
  }

  const COL_SPAN = 7

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4 w-4">#</th>
            <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4">代码</th>
            <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4 hidden md:table-cell">公司</th>
            <th className="text-right text-xs text-gray-500 font-medium py-2 pr-4">市值</th>
            <th className="text-right text-xs text-gray-500 font-medium py-2 pr-4 hidden sm:table-cell">股数</th>
            <th className="text-right text-xs text-gray-500 font-medium py-2 pr-4">占比</th>
            <th className="text-left text-xs text-gray-500 font-medium py-2">变动</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, i) => {
            const meta = pos.changeType ? CHANGE_META[pos.changeType] : null
            const isExpanded = expandedStockId === pos.stockId
            return (
              <React.Fragment key={pos.id}>
                <tr
                  key={pos.id}
                  onClick={() => setExpandedStockId(isExpanded ? null : pos.stockId)}
                  className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer select-none"
                  style={isExpanded ? { backgroundColor: `${color.bg}06` } : {}}
                >
                  <td className="py-2.5 pr-4 text-xs text-gray-400 font-mono">{i + 1}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-gray-300 transition-transform text-xs"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}
                      >▶</span>
                      <Link
                        href={`/stock/${encodeURIComponent(pos.ticker)}`}
                        onClick={e => e.stopPropagation()}
                        className="font-mono font-bold text-gray-900 hover:text-purple-700 transition-colors"
                      >
                        {pos.ticker}
                      </Link>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs hidden md:table-cell">{pos.companyName}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-semibold text-gray-900 text-xs">
                    {formatValue(pos.valueUsd)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-gray-500 hidden sm:table-cell">
                    {formatShares(pos.shares)}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(pos.pctOfPortfolio, 100)}%`, backgroundColor: color.bg }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-700 w-8 text-right">{pos.pctOfPortfolio.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    {meta ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        {meta.emoji} {pos.pctChange != null && Math.abs(pos.pctChange) > 0
                          ? `${pos.pctChange > 0 ? '+' : ''}${pos.pctChange.toFixed(1)}%`
                          : meta.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <HistoryExpandedRow
                    key={`history-${pos.stockId}`}
                    investorId={investorId}
                    stockId={pos.stockId}
                    ticker={pos.ticker}
                    color={color}
                    colSpan={COL_SPAN}
                  />
                )}
              </React.Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200">
            <td colSpan={3} className="pt-2.5 text-xs text-gray-500 font-medium">共 {positions.length} 只持仓</td>
            <td className="pt-2.5 text-right font-mono font-bold text-gray-900 text-xs pr-4">{formatValue(totalValue)}</td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function InvestorDetailClient({ investor, filings, defaultPositions, defaultQuarter, totalValue }: Props) {
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarter)
  const [positions, setPositions] = useState<PositionProp[]>(defaultPositions)
  const [currentTotalValue, setCurrentTotalValue] = useState(totalValue)
  const [loading, setLoading] = useState(false)
  const { color } = investor

  async function handleQuarterChange(quarter: string) {
    if (quarter === selectedQuarter) return
    setSelectedQuarter(quarter)
    setLoading(true)
    try {
      const filing = filings.find(f => f.period === quarter)
      if (!filing) return
      const res = await fetch(`/api/investor-positions?investorId=${investor.id}&filingId=${filing.id}&quarter=${quarter}`)
      const data = await res.json()
      setPositions(data.positions)
      setCurrentTotalValue(data.totalValue)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-700 transition-colors">仪表盘</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{investor.name_cn}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: color.bg }}
            >
              {investor.name_cn[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{investor.name_cn}</h1>
              <p className="text-sm text-gray-500">{investor.name_en} · {investor.institution}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">最新季度</p>
            <p className="text-sm font-semibold" style={{ color: color.text }}>
              {filings[0]?.period ? quarterLabel(filings[0].period) : '—'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">持仓总市值</p>
            <p className="text-base font-bold text-gray-900 font-mono">{formatValue(currentTotalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">持仓只数</p>
            <p className="text-base font-bold text-gray-900">{positions.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CIK</p>
            <p className="text-sm font-bold text-gray-900 font-mono">{investor.cik}</p>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900">持仓明细</h2>
          {filings.length > 1 && (
            <QuarterSelector
              filings={filings}
              selected={selectedQuarter}
              onChange={handleQuarterChange}
              color={color}
            />
          )}
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-10">加载中...</div>
        ) : (
          <PositionTable positions={positions} totalValue={currentTotalValue} color={color} investorId={investor.id} />
        )}

        {/* AI placeholder */}
        <div className="mt-6 rounded-xl p-4 border border-dashed border-purple-200 bg-purple-50/50">
          <p className="text-xs text-purple-600 text-center">🤖 AI 分析即将上线 — 将自动分析本季度关键仓位变动</p>
        </div>
      </div>
    </div>
  )
}
