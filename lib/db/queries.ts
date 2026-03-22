// Server-side DB query functions
import { db, investors, filings, stocks, positions, position_changes, ai_summaries } from './index'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { COLORS_BY_CIK, DEFAULT_COLOR, ChangeType, formatValue, formatShares, quarterLabel } from '@/lib/ui-constants'

export { COLORS_BY_CIK, DEFAULT_COLOR, formatValue, formatShares, quarterLabel }
export type { ChangeType }
export { CHANGE_META } from '@/lib/ui-constants'

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

  // Build per-investor latest period map (only investors that have filings)
  const investorFilingMap = new Map(
    investorsWithFilings
      .filter(i => i.latestFilingId != null && i.latestPeriod != null)
      .map(i => [i.id, { filingId: i.latestFilingId as number, period: i.latestPeriod as string }])
  )

  if (investorFilingMap.size === 0) return []

  const filingIds = [...investorFilingMap.values()].map(v => v.filingId)

  // Fetch all changes, then filter in-process to only include each investor's OWN latest period.
  // Using inArray on all periods would cross-contaminate: if investor A's latest is 2025Q4 and
  // investor B's latest is 2024Q1, the query would return investor A's 2024Q1 changes too.
  const allPeriods = [...new Set([...investorFilingMap.values()].map(v => v.period))]

  const allChanges = await db.select({
    change: position_changes,
    stock: stocks,
  })
    .from(position_changes)
    .leftJoin(stocks, eq(position_changes.stock_id, stocks.id))
    .where(inArray(position_changes.quarter, allPeriods))

  // Value of each position from the latest filings
  const allPositions = await db.select().from(positions).where(inArray(positions.filing_id, filingIds))

  const positionMap = new Map<string, { value_usd: number; pct: number }>()
  for (const pos of allPositions) {
    positionMap.set(`${pos.filing_id}:${pos.stock_id}`, {
      value_usd: pos.value_usd,
      pct: pos.pct_of_portfolio ?? 0,
    })
  }

  return allChanges.flatMap(({ change, stock }) => {
    const inv = investorsWithFilings.find(i => i.id === change.investor_id)
    if (!inv) return []
    const filing = investorFilingMap.get(change.investor_id)
    if (!filing) return []
    // Only include this change if it matches THIS investor's own latest period
    if (change.quarter !== filing.period) return []
    const pos = positionMap.get(`${filing.filingId}:${change.stock_id}`)
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
      pctOfPortfolio: pos?.pct ?? 0,
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

  // Shared stock lookup (used by both buys and sells)
  const stockById = new Map(
    allPositions.flatMap(({ stock }) => stock ? [[stock.id, stock]] : [])
  )

  // Shared position lookup: investor_id:stock_id → pct_of_portfolio (for buys)
  const positionByInvStock = new Map<string, number>()
  for (const { position } of allPositions) {
    const inv = filingInvestorMap.get(position.filing_id)
    if (!inv) continue
    positionByInvStock.set(`${inv.id}:${position.stock_id}`, position.pct_of_portfolio ?? 0)
  }

  // Investor lookup: investor_id → investor (for buys)
  const investorById = new Map(investorsWithFilings.map(i => [i.id, i]))

  // ── Top Buys (NEW + INCREASED, by max pct_of_portfolio of the BUYING investor) ──
  // Bug fix: previously took max across ALL holders of the stock, which could
  // pick up a seller's large position (e.g. 段永平 reducing AAPL at 50.3%).
  // Now only considers investors who actually made the buy action.
  const buyChanges = allChanges.filter(c => c.change_type === 'NEW' || c.change_type === 'INCREASED')

  const buyMap = new Map<number, { ticker: string; name: string; maxPct: number; investorName: string; investorCik: string }>()
  for (const change of buyChanges) {
    const inv = investorById.get(change.investor_id)
    if (!inv) continue
    // Only include changes from THIS investor's OWN latest period.
    // allChanges is queried by inArray(latestPeriods) which cross-contaminates:
    // if investor A's latest is 2025Q4 and 段永平's latest is 2024Q4, the query returns
    // 段永平's 2024Q4 buys even though the dashboard is showing 2025Q4.
    if (change.quarter !== inv.latestPeriod) continue
    const pct = positionByInvStock.get(`${change.investor_id}:${change.stock_id}`) ?? 0
    const stock = stockById.get(change.stock_id)
    if (!stock) continue
    const existing = buyMap.get(change.stock_id)
    if (existing) {
      if (pct > existing.maxPct) {
        existing.maxPct = pct
        existing.investorName = inv.name_cn
        existing.investorCik = inv.cik
      }
    } else {
      buyMap.set(change.stock_id, {
        ticker: stock.ticker ?? stock.cusip,
        name: stock.name_en,
        maxPct: pct,
        investorName: inv.name_cn,
        investorCik: inv.cik,
      })
    }
  }
  const topBuys = [...buyMap.values()]
    .sort((a, b) => b.maxPct - a.maxPct)
    .slice(0, 8)

  // ── Top Sells (DECREASED + EXITED, by max |pct_change|) ──────────────────
  // Normalized: shows reduction magnitude regardless of portfolio size.
  // pct_change is the % change in shares (negative for decreases; EXITED ≈ -100).
  const sellChanges = allChanges.filter(c => c.change_type === 'EXITED' || c.change_type === 'DECREASED')

  // EXITED stocks are no longer in allPositions — fetch any missing stock IDs.
  const missingStockIds = [...new Set(sellChanges.map(c => c.stock_id))]
    .filter(id => !stockById.has(id))
  if (missingStockIds.length > 0) {
    const exitedStocks = await db.select().from(stocks).where(inArray(stocks.id, missingStockIds))
    for (const s of exitedStocks) stockById.set(s.id, s)
  }

  const sellMap = new Map<number, { ticker: string; name: string; maxPctChange: number; investorName: string; investorCik: string }>()
  for (const change of sellChanges) {
    const stockInfo = stockById.get(change.stock_id)
    if (!stockInfo) continue
    const inv = investorById.get(change.investor_id)
    if (!inv) continue
    if (change.quarter !== inv.latestPeriod) continue
    const magnitude = Math.abs(change.pct_change ?? 0)
    const existing = sellMap.get(change.stock_id)
    if (existing) {
      if (magnitude > existing.maxPctChange) {
        existing.maxPctChange = magnitude
        existing.investorName = inv.name_cn
        existing.investorCik = inv.cik
      }
    } else {
      sellMap.set(change.stock_id, {
        ticker: stockInfo.ticker ?? stockInfo.cusip,
        name: stockInfo.name_en,
        maxPctChange: magnitude,
        investorName: inv.name_cn,
        investorCik: inv.cik,
      })
    }
  }
  const topSells = [...sellMap.values()]
    .sort((a, b) => b.maxPctChange - a.maxPctChange)
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

export async function getDashboard2QtrTopBuys() {
  // Find the 2 most recent distinct quarters across all filings
  const recentFilings = await db.select({ period: filings.period })
    .from(filings)
    .orderBy(desc(filings.period))

  const recentQuarters = [...new Set(recentFilings.map(f => f.period))].slice(0, 2)
  if (recentQuarters.length === 0) return []

  // Parallelize independent queries after quarters are known
  const [changes, quarterFilings, allInvestors] = await Promise.all([
    db.select().from(position_changes).where(inArray(position_changes.quarter, recentQuarters)),
    db.select().from(filings).where(inArray(filings.period, recentQuarters)),
    db.select().from(investors),
  ])

  const buyChanges = changes.filter(c => c.change_type === 'NEW' || c.change_type === 'INCREASED')
  if (buyChanges.length === 0) return []

  const filingIds = quarterFilings.map(f => f.id)

  // All positions for those filings (to get pct_of_portfolio)
  const allPositions = await db.select({
    position: positions,
    stock: stocks,
    filing: filings,
  })
    .from(positions)
    .leftJoin(stocks, eq(positions.stock_id, stocks.id))
    .leftJoin(filings, eq(positions.filing_id, filings.id))
    .where(inArray(positions.filing_id, filingIds))

  // Build a position lookup: investor_id:stock_id:quarter → pct_of_portfolio
  const filingInvestorMap = new Map(quarterFilings.map(f => [f.id, f.investor_id]))

  const posMap = new Map<string, number>()
  for (const { position, filing } of allPositions) {
    if (!filing) continue
    const invId = filingInvestorMap.get(position.filing_id)
    if (invId == null) continue
    posMap.set(`${invId}:${position.stock_id}:${filing.period}`, position.pct_of_portfolio ?? 0)
  }

  const investorMap = new Map(allInvestors.map(i => [i.id, i]))

  // O(1) stock lookup map (avoid O(n²) find inside loop)
  const stockMap = new Map(
    allPositions.flatMap(({ stock }) => stock ? [[stock.id, stock]] : [])
  )

  // Build top buys — deduplicated per (investor, stock): keep the entry with the highest
  // pct_of_portfolio. This prevents the same investor+stock from appearing twice when
  // they bought in both of the 2 recent quarters.
  type BuyEntry = {
    ticker: string
    companyName: string
    investorName: string
    investorCik: string
    changeType: string
    pctOfPortfolio: number
    pctChange: number
  }

  const resultMap = new Map<string, BuyEntry>()
  for (const change of buyChanges) {
    const inv = investorMap.get(change.investor_id)
    if (!inv) continue
    const pctOfPortfolio = posMap.get(`${change.investor_id}:${change.stock_id}:${change.quarter}`) ?? 0
    const stockInfo = stockMap.get(change.stock_id)
    if (!stockInfo) continue
    const key = `${change.investor_id}:${change.stock_id}`
    const existing = resultMap.get(key)
    if (!existing || pctOfPortfolio > existing.pctOfPortfolio) {
      resultMap.set(key, {
        ticker: stockInfo.ticker ?? stockInfo.cusip,
        companyName: stockInfo.name_en,
        investorName: inv.name_cn,
        investorCik: inv.cik,
        changeType: change.change_type,
        pctOfPortfolio,
        pctChange: change.pct_change ?? 0,
      })
    }
  }

  return [...resultMap.values()]
    .sort((a, b) => b.pctOfPortfolio - a.pctOfPortfolio)
    .slice(0, 10)
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

export type AiAnalysis = {
  summary_cn?: string
  bull_points?: string[]
  bear_points?: string[]
  recommendation?: string
  key_moves?: { ticker: string; action: string; reasoning: string }[]
  error?: string
}

export async function getAiSummary(investorId: number, filingId: number): Promise<AiAnalysis | null> {
  const [row] = await db.select({ analysis: ai_summaries.analysis })
    .from(ai_summaries)
    .where(and(
      eq(ai_summaries.investor_id, investorId),
      eq(ai_summaries.filing_id, filingId),
    ))
  if (!row) return null
  return row.analysis as AiAnalysis | null
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
