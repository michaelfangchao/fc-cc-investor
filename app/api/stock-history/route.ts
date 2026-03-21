// GET /api/stock-history?ticker=AAPL
//   Returns history for ALL investors who hold this stock, grouped by investor.
// GET /api/stock-history?investorId=X&stockId=Y  (legacy, still supported)
import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, stocks, positions, position_changes } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')

  if (ticker) return getByTicker(ticker.toUpperCase())

  const investorId = parseInt(searchParams.get('investorId') ?? '')
  const stockId = parseInt(searchParams.get('stockId') ?? '')
  if (isNaN(investorId) || isNaN(stockId)) {
    return NextResponse.json({ error: 'Provide ticker or investorId+stockId' }, { status: 400 })
  }
  return getLegacy(investorId, stockId)
}

async function getByTicker(ticker: string) {
  const [stock] = await db.select().from(stocks).where(eq(stocks.ticker, ticker))
  if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 })

  const allInvestors = await db.select().from(investors)
  const allFilings = await db.select().from(filings)
  const allPositions = await db.select().from(positions).where(eq(positions.stock_id, stock.id))
  const allChanges = await db.select().from(position_changes).where(eq(position_changes.stock_id, stock.id))

  const positionByFiling = new Map(allPositions.map(p => [p.filing_id, p]))
  const changeByInvestorQuarter = new Map(allChanges.map(c => [`${c.investor_id}:${c.quarter}`, c]))

  type Quarter = { quarter: string; shares: number; valueUsd: number; pctOfPortfolio: number; changeType: string | null; pctChange: number | null }
  const result: { investorId: number; investorName: string; cik: string; quarters: Quarter[] }[] = []

  for (const investor of allInvestors) {
    const investorFilings = allFilings
      .filter(f => f.investor_id === investor.id)
      .sort((a, b) => a.period.localeCompare(b.period))

    const quarters = investorFilings
      .map(f => {
        const pos = positionByFiling.get(f.id)
        if (!pos) return null
        const change = changeByInvestorQuarter.get(`${investor.id}:${f.period}`)
        return { quarter: f.period, shares: pos.shares, valueUsd: pos.value_usd, pctOfPortfolio: pos.pct_of_portfolio ?? 0, changeType: change?.change_type ?? null, pctChange: change?.pct_change ?? null }
      })
      .filter(Boolean) as Quarter[]

    if (quarters.length > 0) {
      result.push({ investorId: investor.id, investorName: investor.name_cn, cik: investor.cik, quarters })
    }
  }

  return NextResponse.json(result)
}

async function getLegacy(investorId: number, stockId: number) {
  const allFilings = await db.select().from(filings).where(eq(filings.investor_id, investorId))
  const allPositions = await db.select().from(positions).where(eq(positions.stock_id, stockId))
  const filingPositionMap = new Map(allPositions.map(p => [p.filing_id, p]))
  const allChanges = await db.select().from(position_changes).where(
    and(eq(position_changes.investor_id, investorId), eq(position_changes.stock_id, stockId))
  )
  const changeByQuarter = new Map(allChanges.map(c => [c.quarter, c]))

  const timeline = allFilings
    .map(f => {
      const pos = filingPositionMap.get(f.id)
      if (!pos) return null
      const change = changeByQuarter.get(f.period)
      return { quarter: f.period, shares: pos.shares, valueUsd: pos.value_usd, pctOfPortfolio: pos.pct_of_portfolio ?? 0, changeType: change?.change_type ?? null, pctChange: change?.pct_change ?? null }
    })
    .filter(Boolean)
    .sort((a, b) => b!.quarter.localeCompare(a!.quarter))

  return NextResponse.json(timeline)
}
