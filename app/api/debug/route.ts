import { NextRequest, NextResponse } from 'next/server'
import { db, filings, position_changes, positions } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [changesCount] = await db.select({ count: sql<number>`count(*)` }).from(position_changes)
  const [positionsCount] = await db.select({ count: sql<number>`count(*)` }).from(positions)
  const [filingsCount] = await db.select({ count: sql<number>`count(*)` }).from(filings)

  const changesByQuarter = await db.select({
    quarter: position_changes.quarter,
    count: sql<number>`count(*)`,
  }).from(position_changes).groupBy(position_changes.quarter)

  const filingPeriods = await db.select({
    period: filings.period,
    investor_id: filings.investor_id,
  }).from(filings).orderBy(filings.period)

  return NextResponse.json({
    counts: { filings: filingsCount.count, positions: positionsCount.count, changes: changesCount.count },
    changesByQuarter,
    filingPeriods,
  })
}
