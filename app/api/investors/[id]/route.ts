import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, positions, position_changes, ai_summaries } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'

export const maxDuration = 60
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

// PATCH /api/investors/[id] — update investor display info (name_cn, name_en, institution)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const investorId = parseInt(id)
  if (isNaN(investorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { name_cn, name_en, institution } = body
  if (!name_cn?.trim()) return NextResponse.json({ error: '中文名不能为空' }, { status: 400 })

  const [updated] = await db.update(investors)
    .set({
      name_cn: name_cn.trim(),
      ...(name_en != null ? { name_en: name_en.trim() } : {}),
      ...(institution != null ? { institution: institution.trim() } : {}),
    })
    .where(eq(investors.id, investorId))
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

// DELETE /api/investors/[id] — remove investor and all their data
// Manual deletion order to avoid FK violations: ai_summaries → position_changes → positions → filings → investors
// NOTE: stocks table is NOT deleted — CUSIPs are shared across all investors and permanently cached.
export async function DELETE(_req: NextRequest, { params }: Params) {
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

    // 3. positions — batch delete by filing IDs (faster than per-filing loop)
    const investorFilings = await tx.select({ id: filings.id }).from(filings).where(eq(filings.investor_id, investorId))
    const filingIds = investorFilings.map(f => f.id)
    if (filingIds.length > 0) {
      await tx.delete(positions).where(inArray(positions.filing_id, filingIds))
    }

    // 4. filings (references investor_id)
    await tx.delete(filings).where(eq(filings.investor_id, investorId))

    // 5. investor
    await tx.delete(investors).where(eq(investors.id, investorId))
  })

  return NextResponse.json({ ok: true })
}
