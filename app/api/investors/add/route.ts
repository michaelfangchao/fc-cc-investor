// POST /api/investors/add — create a new investor and kick off backfill
import { NextRequest, NextResponse } from 'next/server'
import { db, investors } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cik, name_cn, name_en, institution } = body

  if (!cik || !name_cn || !institution) {
    return NextResponse.json({ error: 'cik, name_cn, institution are required' }, { status: 400 })
  }

  // Check for existing investor with this CIK
  const [existing] = await db.select({ id: investors.id }).from(investors).where(eq(investors.cik, cik))
  if (existing) {
    return NextResponse.json({ error: '该CIK已存在', id: existing.id }, { status: 409 })
  }

  const [investor] = await db.insert(investors).values({
    cik,
    name_cn,
    name_en: name_en || name_cn,
    institution,
    backfill_status: 'running',
    backfill_quarters_done: 0,
  }).returning()

  // Backfill is now driven client-side via /api/investors/[id]/backfill-step.
  // The settings page starts the loop after this response is received.

  return NextResponse.json({ ok: true, investor })
}
