// POST /api/investors/[id]/retry — reset an errored backfill and re-trigger the init chain
import { NextRequest, NextResponse, after } from 'next/server'
import { db, investors } from '@/lib/db'
import { and, eq, inArray } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const investorId = parseInt(id)
  if (isNaN(investorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [investor] = await db.select().from(investors).where(eq(investors.id, investorId))
  if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Allow retry from 'error' OR stuck 'running' state (running with 0 quarters = chain never progressed)
  const updated = await db.update(investors)
    .set({ backfill_status: 'running', backfill_quarters_done: 0 })
    .where(and(
      eq(investors.id, investorId),
      inArray(investors.backfill_status, ['error', 'running']),
    ))
    .returning({ id: investors.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Investor is not in a retryable state' }, { status: 409 })
  }

  // Re-fire the backfill init chain — after() ensures Vercel keeps the function alive
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) {
    after(() =>
      fetch(`${baseUrl}/api/investors/init/${investor.cik}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('retry chain error:', err))
    )
  }

  return NextResponse.json({ ok: true })
}
