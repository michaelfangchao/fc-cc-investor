import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, positions, position_changes, ai_summaries } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { isAuthorized } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/investors/[id] — return investor status (used for backfill progress polling)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const investorId = parseInt(id)
  if (isNaN(investorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [investor] = await db.select({
    id: investors.id,
    name_cn: investors.name_cn,
    cik: investors.cik,
    backfill_status: investors.backfill_status,
    backfill_quarters_done: investors.backfill_quarters_done,
  }).from(investors).where(eq(investors.id, investorId))

  if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(investor)
}

// DELETE /api/investors/[id] — remove investor and all their data
// Manual deletion order to avoid FK violations: ai_summaries → position_changes → positions → filings → investors
// NOTE: stocks table is NOT deleted — CUSIPs are shared across all investors and permanently cached.
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const investorId = parseInt(id)
  if (isNaN(investorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [investor] = await db.select().from(investors).where(eq(investors.id, investorId))
  if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Cascade deletion wrapped in a transaction to prevent orphan rows on crash
  await db.transaction(async (tx) => {
    // 1. ai_summaries (references investor_id + filing_id)
    await tx.delete(ai_summaries).where(eq(ai_summaries.investor_id, investorId))

    // 2. position_changes (references investor_id + stock_id)
    await tx.delete(position_changes).where(eq(position_changes.investor_id, investorId))

    // 3. positions — need filing ids first (references filing_id)
    const investorFilings = await tx.select({ id: filings.id }).from(filings).where(eq(filings.investor_id, investorId))
    for (const f of investorFilings) {
      await tx.delete(positions).where(eq(positions.filing_id, f.id))
    }

    // 4. filings (references investor_id)
    await tx.delete(filings).where(eq(filings.investor_id, investorId))

    // 5. investor
    await tx.delete(investors).where(eq(investors.id, investorId))
  })

  return NextResponse.json({ ok: true })
}
