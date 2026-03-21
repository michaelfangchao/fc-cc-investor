// POST /api/recompute-changes
// Recomputes position_changes for a given quarter (or all quarters with missing changes)
// Used to fix cases where computeChanges failed but the filing was already inserted
import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, positions, position_changes } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  return !!secret && auth === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { quarter } = await req.json().catch(() => ({}))

  const allInvestors = await db.select().from(investors)
  const results = []

  for (const investor of allInvestors) {
    // Get filings for this investor
    const allFilings = await db.select().from(filings).where(eq(filings.investor_id, investor.id))
    if (allFilings.length === 0) continue

    // Determine which quarters to recompute
    const targetQuarters = quarter
      ? allFilings.filter(f => f.period === quarter)
      : allFilings

    for (const filing of targetQuarters) {
      // Check if changes already exist for this investor+quarter
      const [existingCount] = await db.select({ count: sql<number>`count(*)` })
        .from(position_changes)
        .where(and(
          eq(position_changes.investor_id, investor.id),
          eq(position_changes.quarter, filing.period)
        ))

      if (Number(existingCount.count) > 0) {
        results.push({ investor: investor.name_cn, quarter: filing.period, status: 'already_has_changes', count: existingCount.count })
        continue
      }

      // Get current positions for this filing
      const currentPositions = await db.select().from(positions).where(eq(positions.filing_id, filing.id))
      if (currentPositions.length === 0) {
        results.push({ investor: investor.name_cn, quarter: filing.period, status: 'no_positions' })
        continue
      }

      // Get previous filing
      const prevFiling = allFilings
        .filter(f => f.period < filing.period)
        .sort((a, b) => b.period.localeCompare(a.period))[0]

      const prevPositions = prevFiling
        ? await db.select().from(positions).where(eq(positions.filing_id, prevFiling.id))
        : []

      const prevMap = new Map(prevPositions.map(p => [p.stock_id, p.shares]))
      const currentStockIds = new Set<number>()
      let inserted = 0

      for (const pos of currentPositions) {
        currentStockIds.add(pos.stock_id)
        const prevShares = prevMap.get(pos.stock_id) ?? null
        let changeType: string
        let pctChange: number | null = null

        if (prevShares === null) {
          changeType = 'NEW'
        } else if (pos.shares > prevShares) {
          changeType = 'INCREASED'
          pctChange = prevShares > 0 ? ((pos.shares - prevShares) / prevShares) * 100 : null
        } else if (pos.shares < prevShares) {
          changeType = 'DECREASED'
          pctChange = prevShares > 0 ? ((pos.shares - prevShares) / prevShares) * 100 : null
        } else {
          continue // unchanged
        }

        await db.insert(position_changes).values({
          investor_id: investor.id,
          stock_id: pos.stock_id,
          quarter: filing.period,
          change_type: changeType,
          prev_shares: prevShares,
          curr_shares: pos.shares,
          pct_change: pctChange ? parseFloat(pctChange.toFixed(2)) : null,
        }).onConflictDoNothing()
        inserted++
      }

      // EXITED: in prev but not in current
      for (const [stockId, prevShares] of prevMap.entries()) {
        if (!currentStockIds.has(stockId)) {
          await db.insert(position_changes).values({
            investor_id: investor.id,
            stock_id: stockId,
            quarter: filing.period,
            change_type: 'EXITED',
            prev_shares: prevShares,
            curr_shares: 0,
            pct_change: -100,
          }).onConflictDoNothing()
          inserted++
        }
      }

      results.push({ investor: investor.name_cn, quarter: filing.period, status: 'computed', inserted })
    }
  }

  return NextResponse.json({ results })
}
