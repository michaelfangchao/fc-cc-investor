// Server-side DB query functions + shared constants/utils
import { db, investors, filings, stocks, positions, position_changes } from './index'
import { eq, desc, and, inArray } from 'drizzle-orm'

// ── Color palette by CIK ─────────────────────────────────────────────────────
export const COLORS_BY_CIK: Record<string, { bg: string; light: string; text: string; border: string }> = {
  '0001067983': { bg: '#3b82f6', light: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' }, // Buffett  – blue
  '0001697748': { bg: '#f97316', light: '#fff7ed', text: '#c2410c', border: '#fed7aa' }, // ARK      – orange
  '0001709323': { bg: '#a855f7', light: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' }, // Li Lu    – purple
  '0001759760': { bg: '#22c55e', light: '#f0fdf4', text: '#15803d', border: '#86efac' }, // Duan     – green
  '0001419050': { bg: '#ef4444', light: '#fef2f2', text: '#b91c1c', border: '#fca5a5' }, // Norbert  – red
}
export const DEFAULT_COLOR = { bg: '#6b7280', light: '#f9fafb', text: '#374151', border: '#d1d5db' }

export type ChangeType = 'NEW' | 'INCREASED' | 'DECREASED' | 'EXITED'

export const CHANGE_META: Record<ChangeType, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  NEW:       { emoji: '✨', label: '新建仓', bg: '#f0fdf4', text: '#15803d', border: '#22c55e' },
  INCREASED: { emoji: '📈', label: '加仓',   bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6' },
  DECREASED: { emoji: '📉', label: '减仓',   bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  EXITED:    { emoji: '🚪', label: '清仓',   bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' },
}

// ── Formatting ────────────────────────────────────────────────────────────────
export function formatValue(dollars: number): string {
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`
  if (dollars >= 1_000_000)     return `$${(dollars / 1_000_000).toFixed(0)}M`
  if (dollars >= 1_000)         return `$${(dollars / 1_000).toFixed(0)}K`
  return `$${dollars}`
}

export function formatShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function quarterLabel(q: string): string {
  const m = q.match(/(\d{4})Q(\d)/)
  return m ? `${m[1]} Q${m[2]}` : q
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getInvestorsWithLatestFiling() {
  const allInvestors = await db.select().from(investors)
  const allFilings = await db.select().from(filings)

  return allInvestors.map(inv => {
    const invFilings = allFilings
      .filter(f => f.investor_id === inv.id)
      .sort((a, b) => b.period.localeCompare(a.period))
    const latest = invFilings[0]
    const color = COLORS_BY_CIK[inv.cik] ?? DEFAULT_COLOR
    return {
      ...inv,
      color,
      latestPeriod: latest?.period ?? null,
      filedDate: latest?.filed_date ?? null,
      latestFilingId: latest?.id ?? null,
    }
  })
}

export type InvestorWithFiling = Awaited<ReturnType<typeof getInvestorsWithLatestFiling>>[number]

export async function getDashboardChanges() {
  const investorsWithFilings = await getInvestorsWithLatestFiling()

  const filingIds = investorsWithFilings
    .filter(i => i.latestFilingId != null)
    .map(i => i.latestFilingId as number)

  const latestPeriods = [...new Set(
    investorsWithFilings.filter(i => i.latestPeriod).map(i => i.latestPeriod as string)
  )]

  if (latestPeriods.length === 0) return []

  // All changes for the latest quarter(s)
  const allChanges = await db.select({
    change: position_changes,
    stock: stocks,
  })
    .from(position_changes)
    .leftJoin(stocks, eq(position_changes.stock_id, stocks.id))
    .where(inArray(position_changes.quarter, latestPeriods))

  // Value of each position from the latest filings
  const allPositions = filingIds.length > 0
    ? await db.select().from(positions).where(inArray(positions.filing_id, filingIds))
    : []

  const positionMap = new Map<string, { value_usd: number; pct: number }>()
  for (const pos of allPositions) {
    positionMap.set(`${pos.filing_id}:${pos.stock_id}`, {
      value_usd: pos.value_usd,
      pct: pos.pct_of_portfolio ?? 0,
    })
  }

  const investorFilingMap = new Map(
    investorsWithFilings
      .filter(i => i.latestFilingId != null)
      .map(i => [i.id, { filingId: i.latestFilingId as number, period: i.latestPeriod as string }])
  )

  return allChanges.flatMap(({ change, stock }) => {
    const inv = investorsWithFilings.find(i => i.id === change.investor_id)
    if (!inv) return []
    const filing = investorFilingMap.get(change.investor_id)
    const pos = filing ? positionMap.get(`${filing.filingId}:${change.stock_id}`) : null
    return [{
      id: change.id,
      investorId: change.investor_id,
      investorName: inv.name_cn,
      investorCik: inv.cik,
      ticker: stock?.ticker ?? stock?.cusip ?? '?',
      companyName: stock?.name_en ?? '',
      changeType: change.change_type as ChangeType,
      pctChange: change.pct_change,
      valueUsd: pos?.value_usd ?? 0,
      quarter: change.quarter,
    }]
  })
}

export async function getDashboardInsights(investorsWithFilings: InvestorWithFiling[]) {
  const filingIds = investorsWithFilings
    .filter(i => i.latestFilingId != null)
    .map(i => i.latestFilingId as number)

  if (filingIds.length === 0) return { topBuys: [], topSells: [], consensus: [] }

  const latestPeriods = [...new Set(
    investorsWithFilings.filter(i => i.latestPeriod).map(i => i.latestPeriod as string)
  )]

  // All positions for latest filings (with stock info)
  const allPositions = await db.select({
    position: positions,
    stock: stocks,
  })
    .from(positions)
    .leftJoin(stocks, eq(positions.stock_id, stocks.id))
    .where(inArray(positions.filing_id, filingIds))

  // Map filingId → investorId
  const filingInvestorMap = new Map(
    investorsWithFilings
      .filter(i => i.latestFilingId != null)
      .map(i => [i.latestFilingId as number, i])
  )

  // Changes for latest quarters
  const allChanges = latestPeriods.length > 0
    ? await db.select().from(position_changes)
        .where(inArray(position_changes.quarter, latestPeriods))
    : []

  // ── Top Buys (NEW + INCREASED, by value) ──────────────────────────────────
  const newOrIncreased = new Set(
    allChanges
      .filter(c => c.change_type === 'NEW' || c.change_type === 'INCREASED')
      .map(c => c.stock_id)
  )

  const buyMap = new Map<number, { ticker: string; name: string; totalValue: number }>()
  for (const { position, stock } of allPositions) {
    if (!newOrIncreased.has(position.stock_id) || !stock) continue
    const existing = buyMap.get(position.stock_id)
    if (existing) {
      existing.totalValue += position.value_usd
    } else {
      buyMap.set(position.stock_id, {
        ticker: stock.ticker ?? stock.cusip,
        name: stock.name_en,
        totalValue: position.value_usd,
      })
    }
  }
  const topBuys = [...buyMap.values()]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 8)

  // ── Top Sells (DECREASED + EXITED, by value removed) ─────────────────────
  const exitedOrDecreased = new Set(
    allChanges
      .filter(c => c.change_type === 'EXITED' || c.change_type === 'DECREASED')
      .map(c => c.stock_id)
  )

  const sellMap = new Map<number, { ticker: string; name: string; totalValue: number; stockId: number }>()
  for (const change of allChanges) {
    if (change.change_type !== 'EXITED' && change.change_type !== 'DECREASED') continue
    const pos = allPositions.find(p => p.position.stock_id === change.stock_id)
    const stock = pos?.stock
    if (!stock) continue
    const prevValue = change.prev_shares ?? 0
    const existing = sellMap.get(change.stock_id)
    if (existing) {
      existing.totalValue += prevValue
    } else {
      sellMap.set(change.stock_id, {
        ticker: stock.ticker ?? stock.cusip,
        name: stock.name_en,
        totalValue: prevValue,
        stockId: change.stock_id,
      })
    }
  }
  const topSells = [...sellMap.values()]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 8)

  // ── Consensus (held by 2+ investors) ─────────────────────────────────────
  const stockInvestors = new Map<number, Set<number>>()
  for (const { position } of allPositions) {
    const inv = filingInvestorMap.get(position.filing_id)
    if (!inv) continue
    const set = stockInvestors.get(position.stock_id) ?? new Set()
    set.add(inv.id)
    stockInvestors.set(position.stock_id, set)
  }

  const consensus: { ticker: string; name: string; investorIds: number[]; investorCount: number }[] = []
  for (const [stockId, invSet] of stockInvestors.entries()) {
    if (invSet.size < 2) continue
    const pos = allPositions.find(p => p.position.stock_id === stockId)
    const stock = pos?.stock
    if (!stock) continue
    consensus.push({
      ticker: stock.ticker ?? stock.cusip,
      name: stock.name_en,
      investorIds: [...invSet],
      investorCount: invSet.size,
    })
  }
  consensus.sort((a, b) => b.investorCount - a.investorCount)

  return { topBuys, topSells, consensus: consensus.slice(0, 10) }
}

export async function getInvestorDetail(investorId: number) {
  const [investor] = await db.select().from(investors).where(eq(investors.id, investorId))
  if (!investor) return null

  const allFilings = await db.select()
    .from(filings)
    .where(eq(filings.investor_id, investorId))
    .orderBy(desc(filings.period))

  const color = COLORS_BY_CIK[investor.cik] ?? DEFAULT_COLOR
  return { investor: { ...investor, color }, filings: allFilings }
}

export async function getFilingPositions(filingId: number, investorId: number, quarter: string) {
  const posWithStocks = await db.select({
    position: positions,
    stock: stocks,
  })
    .from(positions)
    .leftJoin(stocks, eq(positions.stock_id, stocks.id))
    .where(eq(positions.filing_id, filingId))
    .orderBy(desc(positions.value_usd))

  const changes = await db.select()
    .from(position_changes)
    .where(and(
      eq(position_changes.investor_id, investorId),
      eq(position_changes.quarter, quarter)
    ))

  const changeMap = new Map(changes.map(c => [c.stock_id, c]))

  const mapped = posWithStocks.map(({ position, stock }) => {
    const change = changeMap.get(position.stock_id)
    return {
      id: position.id,
      stockId: position.stock_id,
      ticker: stock?.ticker ?? stock?.cusip ?? '?',
      companyName: stock?.name_en ?? '',
      shares: position.shares,
      valueUsd: position.value_usd,
      pctOfPortfolio: position.pct_of_portfolio ?? 0,
      changeType: (change?.change_type as ChangeType | null) ?? null,
      pctChange: change?.pct_change ?? null,
    }
  })

  const totalValue = mapped.reduce((s, p) => s + p.valueUsd, 0)
  return { positions: mapped, totalValue }
}
