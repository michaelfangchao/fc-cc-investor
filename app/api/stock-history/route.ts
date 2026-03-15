// GET /api/stock-history?investorId=X&stockId=Y
// Returns all quarters' positions for a stock+investor pair
import { NextRequest, NextResponse } from 'next/server'
import { db, filings, positions, position_changes } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const investorId = parseInt(searchParams.get('investorId') ?? '')
  const stockId = parseInt(searchParams.get('stockId') ?? '')

  if (isNaN(investorId) || isNaN(stockId)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // Get all filings for this investor
  const allFilings = await db.select().from(filings)
    .where(eq(filings.investor_id, investorId))

  // Get all positions for this stock across all filings
  const allPositions = await db.select().from(positions)
    .where(eq(positions.stock_id, stockId))

  const filingPositionMap = new Map(allPositions.map(p => [p.filing_id, p]))

  // Get all changes for this stock+investor
  const allChanges = await db.select().from(position_changes)
    .where(and(
      eq(position_changes.investor_id, investorId),
      eq(position_changes.stock_id, stockId),
    ))
  const changeByQuarter = new Map(allChanges.map(c => [c.quarter, c]))

  // Build timeline sorted newest first
  const timeline = allFilings
    .map(f => {
      const pos = filingPositionMap.get(f.id)
      if (!pos) return null
      const change = changeByQuarter.get(f.period)
      return {
        quarter: f.period,
        shares: pos.shares,
        valueUsd: pos.value_usd,
        pctOfPortfolio: pos.pct_of_portfolio ?? 0,
        changeType: change?.change_type ?? null,
        pctChange: change?.pct_change ?? null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b!.quarter.localeCompare(a!.quarter))

  return NextResponse.json(timeline)
}
