'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CHANGE_META, ChangeType, formatValue, COLORS_BY_CIK, DEFAULT_COLOR } from '@/lib/ui-constants'

type Change = {
  id: number
  ticker: string
  companyName: string | null
  changeType: ChangeType
  pctChange: number | null
  valueUsd: number
  pctOfPortfolio: number
  investorId: number
  investorName: string
  investorCik: string
}

type InvestorChip = {
  id: number
  name_cn: string
  cik: string
}

const LIMIT = 5

function InvestorBadge({ investorName, cik }: { investorName: string; cik: string }) {
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
            <Link href={`/stock/${encodeURIComponent(change.ticker)}`} className="font-mono font-bold text-gray-900 text-sm hover:text-purple-700 transition-colors">
              {change.ticker}
            </Link>
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
        <InvestorBadge investorName={change.investorName} cik={change.investorCik} />
        <div className="flex items-center gap-2">
          {change.pctOfPortfolio > 0 && (
            <span className="text-xs font-semibold text-gray-600 font-mono">{change.pctOfPortfolio.toFixed(1)}%</span>
          )}
          {change.valueUsd > 0 && (
            <span className="text-xs text-gray-400 font-mono">{formatValue(change.valueUsd)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ChangeColumn({ type, title, changes, defaultExpanded }: {
  type: ChangeType
  title: string
  changes: Change[]
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const meta = CHANGE_META[type]

  const filtered = [...changes.filter(c => c.changeType === type)]
    .sort((a, b) => b.valueUsd - a.valueUsd)

  const visible = expanded ? filtered : filtered.slice(0, LIMIT)
  const hiddenCount = filtered.length - LIMIT

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
          <>
            {visible.map(c => <ChangeCard key={c.id} change={c} />)}
            {hiddenCount > 0 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-gray-400 hover:text-purple-600 py-2 text-center transition-colors"
              >
                展开查看全部 {filtered.length} 项 ↓
              </button>
            )}
            {expanded && filtered.length > LIMIT && (
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-gray-400 hover:text-purple-600 py-2 text-center transition-colors"
              >
                收起 ↑
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function PositionChangesSection({
  changes,
  investors,
  quarter,
}: {
  changes: Change[]
  investors: InvestorChip[]
  quarter: string
}) {
  const [selectedCik, setSelectedCik] = useState<string | null>(null)

  const filtered = selectedCik
    ? changes.filter(c => c.investorCik === selectedCik)
    : changes

  // When switching investor, collapse all columns
  const [filterKey, setFilterKey] = useState(0)

  function selectCik(cik: string | null) {
    setSelectedCik(cik)
    setFilterKey(k => k + 1)
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">本季度持仓变动</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedCik
              ? `${investors.find(i => i.cik === selectedCik)?.name_cn ?? ''} 的操作`
              : `所有追踪投资人的 ${quarter} 操作汇总`}
          </p>
        </div>
      </div>

      {/* Investor filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => selectCik(null)}
          className="text-xs px-3 py-1 rounded-full font-medium transition-all"
          style={
            selectedCik === null
              ? { backgroundColor: '#7c3aed', color: '#fff' }
              : { backgroundColor: '#f3f4f6', color: '#6b7280' }
          }
        >
          全部
        </button>
        {investors.map(inv => {
          const c = COLORS_BY_CIK[inv.cik] ?? DEFAULT_COLOR
          const active = selectedCik === inv.cik
          return (
            <button
              key={inv.cik}
              onClick={() => selectCik(inv.cik)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium transition-all"
              style={
                active
                  ? { backgroundColor: c.bg, color: '#fff' }
                  : { backgroundColor: c.light, color: c.text, border: `1px solid ${c.border}` }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? '#fff' : c.bg }} />
              {inv.name_cn}
            </button>
          )
        })}
      </div>

      <div key={filterKey} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ChangeColumn type="NEW"       title="新建仓" changes={filtered} defaultExpanded={false} />
        <ChangeColumn type="INCREASED" title="加仓"   changes={filtered} defaultExpanded={false} />
        <ChangeColumn type="DECREASED" title="减仓"   changes={filtered} defaultExpanded={false} />
        <ChangeColumn type="EXITED"    title="清仓"   changes={filtered} defaultExpanded={false} />
      </div>
    </div>
  )
}
