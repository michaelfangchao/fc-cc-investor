'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Investor, INVESTOR_COLORS, CHANGE_META, investorPositions,
  availableQuarters, investorAISummaries, formatValue, formatShares, quarterLabel
} from '@/lib/mockData'

function QuarterSelector({ investorId, selected, onChange }: {
  investorId: string
  selected: string
  onChange: (q: string) => void
}) {
  const quarters = availableQuarters[investorId] || [selected]
  const c = INVESTOR_COLORS[investorId]
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 mr-1">查看季度：</span>
      {quarters.map(q => (
        <button
          key={q}
          onClick={() => onChange(q)}
          className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
          style={selected === q
            ? { backgroundColor: c.bg, color: 'white', borderColor: c.bg }
            : { backgroundColor: 'white', color: '#374151', borderColor: '#e5e7eb' }
          }
        >
          {quarterLabel(q)}
        </button>
      ))}
    </div>
  )
}

function PositionTable({ investorId, quarter }: { investorId: string; quarter: string }) {
  const positions = investorPositions[investorId]?.[quarter] || []
  if (positions.length === 0) {
    return <div className="text-center text-gray-400 py-10">暂无该季度数据</div>
  }
  const total = positions.reduce((s, p) => s + p.valueUsd, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4 w-4">#</th>
            <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4">代码</th>
            <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4 hidden md:table-cell">公司</th>
            <th className="text-left text-xs text-gray-500 font-medium py-2 pr-4 hidden sm:table-cell">行业</th>
            <th className="text-right text-xs text-gray-500 font-medium py-2 pr-4">市值</th>
            <th className="text-right text-xs text-gray-500 font-medium py-2 pr-4 hidden sm:table-cell">股数</th>
            <th className="text-right text-xs text-gray-500 font-medium py-2 pr-4">占比</th>
            <th className="text-left text-xs text-gray-500 font-medium py-2">变动</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, i) => {
            const meta = pos.changeType ? CHANGE_META[pos.changeType] : null
            return (
              <tr key={pos.ticker} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                <td className="py-2.5 pr-4 text-xs text-gray-400 font-mono">{i + 1}</td>
                <td className="py-2.5 pr-4">
                  <Link href={`/stock/${pos.ticker}`} className="font-mono font-bold text-gray-900 hover:text-purple-700 transition-colors">
                    {pos.ticker}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-gray-500 text-xs hidden md:table-cell">{pos.companyName}</td>
                <td className="py-2.5 pr-4 hidden sm:table-cell">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{pos.sector}</span>
                </td>
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
                        style={{ width: `${Math.min(pos.pctOfPortfolio, 100)}%`, backgroundColor: '#7c3aed' }}
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
                      {meta.emoji} {pos.pctChange !== undefined ? `${pos.pctChange > 0 ? '+' : ''}${pos.pctChange.toFixed(1)}%` : meta.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200">
            <td colSpan={4} className="pt-2.5 text-xs text-gray-500 font-medium">共 {positions.length} 只持仓</td>
            <td className="pt-2.5 text-right font-mono font-bold text-gray-900 text-xs pr-4">{formatValue(total)}</td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function AIAnalysis({ investorId }: { investorId: string }) {
  const summary = investorAISummaries[investorId]
  if (!summary) return null

  return (
    <div className="mt-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">🤖 AI 分析</h3>

      {/* One-liner */}
      <div
        className="rounded-xl p-4 mb-4 text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
      >
        <p className="text-sm leading-relaxed">{summary.summaryOneLine}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Bull */}
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <h4 className="text-sm font-semibold text-emerald-800 mb-2.5 flex items-center gap-1.5">
            <span>📈</span> 多头逻辑
          </h4>
          <ul className="space-y-1.5">
            {summary.bullPoints.map((p, i) => (
              <li key={i} className="text-xs text-emerald-900 flex gap-2">
                <span className="text-emerald-500 flex-shrink-0 mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bear */}
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <h4 className="text-sm font-semibold text-red-800 mb-2.5 flex items-center gap-1.5">
            <span>📉</span> 空头风险
          </h4>
          <ul className="space-y-1.5">
            {summary.bearPoints.map((p, i) => (
              <li key={i} className="text-xs text-red-900 flex gap-2">
                <span className="text-red-400 flex-shrink-0 mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-1.5 flex items-center gap-1.5">
          <span>💡</span> 综合建议
        </h4>
        <p className="text-xs text-blue-900 leading-relaxed">{summary.recommendation}</p>
      </div>

      {/* Key moves */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">关键操作解读</h4>
        <div className="flex flex-col gap-2">
          {summary.keyMoves.map((move, i) => {
            const isNew = move.action.includes('新建')
            const isUp = move.action.includes('加仓')
            const isExit = move.action.includes('清仓')
            const color = isNew ? '#10b981' : isUp ? '#3b82f6' : isExit ? '#ef4444' : '#f59e0b'
            return (
              <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                <div>
                  <span className="font-mono font-bold text-sm text-gray-900">{move.ticker}</span>
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {move.action}
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex-1">{move.reasoning}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function InvestorDetailClient({ investor }: { investor: Investor }) {
  const defaultQuarter = availableQuarters[investor.id]?.[0] || '2024Q4'
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarter)
  const c = INVESTOR_COLORS[investor.id]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-gray-700 transition-colors">仪表盘</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{investor.nameCn}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: c.bg }}
            >
              {investor.nameCn[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{investor.nameCn}</h1>
              <p className="text-sm text-gray-500">{investor.nameEn} · {investor.institution}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">最近更新</p>
            <p className="text-sm font-semibold" style={{ color: c.text }}>{investor.lastQuarter}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">持仓总市值</p>
            <p className="text-base font-bold text-gray-900 font-mono">{formatValue(investor.totalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">持仓只数</p>
            <p className="text-base font-bold text-gray-900">{investor.holdingsCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CIK</p>
            <p className="text-base font-bold text-gray-900 font-mono text-sm">{investor.cik}</p>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900">持仓明细</h2>
          <QuarterSelector
            investorId={investor.id}
            selected={selectedQuarter}
            onChange={setSelectedQuarter}
          />
        </div>
        <PositionTable investorId={investor.id} quarter={selectedQuarter} />
        <AIAnalysis investorId={investor.id} />
      </div>
    </div>
  )
}
