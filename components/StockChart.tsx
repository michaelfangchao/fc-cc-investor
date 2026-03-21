'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { COLORS_BY_CIK, DEFAULT_COLOR, formatShares, quarterLabel } from '@/lib/ui-constants'

type ChartPoint = {
  quarter: string
  [investorName: string]: string | number | null
}

type RawRow = {
  investorId: number
  investorName: string
  cik: string
  quarters: { quarter: string; shares: number }[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-mono font-semibold text-gray-900">{formatShares(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function StockChart({ ticker }: { ticker: string }) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [investors, setInvestors] = useState<{ name: string; cik: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stock-history?ticker=${encodeURIComponent(ticker)}`)
      .then(r => r.json())
      .then((rows: RawRow[]) => {
        if (!Array.isArray(rows) || rows.length === 0) { setLoading(false); return }

        // Collect all unique quarters across all investors
        const quarterSet = new Set<string>()
        for (const row of rows) {
          for (const h of row.quarters) quarterSet.add(h.quarter)
        }
        const quarters = [...quarterSet].sort()

        // Build chart data: one point per quarter, columns = investor names
        const points: ChartPoint[] = quarters.map(q => {
          const point: ChartPoint = { quarter: quarterLabel(q) }
          for (const row of rows) {
            const h = row.quarters.find(h => h.quarter === q)
            point[row.investorName] = h ? h.shares : null
          }
          return point
        })

        setData(points)
        setInvestors(rows.map(r => ({ name: r.investorName, cik: r.cik })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [ticker])

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">加载图表中...</div>
  }

  if (data.length === 0) {
    return <div className="h-32 flex items-center justify-center text-gray-400 text-sm">暂无历史持仓数据</div>
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 480 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="quarter"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatShares}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: '#6b7280' }}>{value}</span>}
            />
            {investors.map(inv => {
              const color = COLORS_BY_CIK[inv.cik] ?? DEFAULT_COLOR
              return (
                <Line
                  key={inv.name}
                  type="monotone"
                  dataKey={inv.name}
                  stroke={color.bg}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color.bg }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
