// GET /api/stock-search?ticker=AAPL
// Returns all investors who hold this stock in their latest quarter
import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, positions, stocks, position_changes } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')?.toUpperCase()
  if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 })

  const [stock] = await db.select().from(stocks).where(eq(stocks.ticker, ticker))
  if (!stock) return NextResponse.json({ ticker, holdings: [] })

  const allInvestors = await db.select().from(investors)
  const allFilings = await db.select().from(filings)

  // Latest filing per investor
  const investorFilingMap = new Map<number, { filingId: number; period: string }>()
  for (const inv of allInvestors) {
    const invFilings = allFilings
      .filter(f => f.investor_id === inv.id)
      .sort((a, b) => b.period.localeCompare(a.period))
    if (invFilings[0]) {
      investorFilingMap.set(inv.id, { filingId: invFilings[0].id, period: invFilings[0].period })
    }
  }

  const stockPositions = await db.select().from(positions).where(eq(positions.stock_id, stock.id))
  const positionsByFiling = new Map(stockPositions.map(p => [p.filing_id, p]))

  const stockChanges = await db.select().from(position_changes).where(eq(position_changes.stock_id, stock.id))
  const changesByInvestorQuarter = new Map(stockChanges.map(c => [`${c.investor_id}:${c.quarter}`, c]))

  const holdings = []
  for (const inv of allInvestors) {
    const filing = investorFilingMap.get(inv.id)
    if (!filing) continue
    const pos = positionsByFiling.get(filing.filingId)
    if (!pos) continue
    const change = changesByInvestorQuarter.get(`${inv.id}:${filing.period}`)
    holdings.push({
      investorId: inv.id,
      investorName: inv.name_cn,
      investorCik: inv.cik,
      institution: inv.institution,
      pct: pos.pct_of_portfolio ?? 0,
      value: pos.value_usd,
      changeType: change?.change_type ?? null,
      pctChange: change?.pct_change ?? null,
    })
  }

  return NextResponse.json({ ticker, holdings })
}
