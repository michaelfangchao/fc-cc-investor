// POST /api/investors/[id]/backfill-step
// Processes ONE quarter for a given investor and returns the next quarter to process.
// Called by the settings page in a loop — no server-to-server chaining required.
// No auth needed (browser-callable, like the retry endpoint).
import { NextRequest, NextResponse, after } from 'next/server'
import { db, investors } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { fetchAndStore13F, getFilings } from '@/lib/fetcher'

export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const investorId = parseInt(id)
  if (isNaN(investorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const targetQuarter: string | undefined = body.quarter

  const [investor] = await db.select().from(investors).where(eq(investors.id, investorId))
  if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark running so the UI shows the in-progress state
  await db.update(investors)
    .set({ backfill_status: 'running' })
    .where(eq(investors.id, investorId))

  try {
    const edgarFilings = await getFilings(investor.cik)
    const backfillList = edgarFilings.slice(0, 8).reverse() // oldest first

    const currentIndex = targetQuarter
      ? backfillList.findIndex(f => f.period === targetQuarter)
      : 0

    if (currentIndex === -1) {
      await db.update(investors)
        .set({ backfill_status: 'done' })
        .where(eq(investors.id, investorId))
      return NextResponse.json({ done: true })
    }

    const filing = backfillList[currentIndex]
    const result = await fetchAndStore13F(investor.id, investor.cik, filing)

    const quartersDone = investor.backfill_quarters_done + (result.status === 'ok' ? 1 : 0)
    const isLast = currentIndex >= backfillList.length - 1

    if (isLast) {
      await db.update(investors)
        .set({ backfill_status: 'done', backfill_quarters_done: quartersDone })
        .where(eq(investors.id, investorId))

      if (result.filingId) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
        if (baseUrl) {
          after(() =>
            fetch(`${baseUrl}/api/ai-analysis`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ investorId: investor.id, filingId: result.filingId }),
            }).catch(err => console.error('fire AI analysis error:', err))
          )
        }
      }

      return NextResponse.json({ done: true, quarter: filing.period, quartersDone })
    }

    await db.update(investors)
      .set({ backfill_quarters_done: quartersDone })
      .where(eq(investors.id, investorId))

    const nextQuarter = backfillList[currentIndex + 1].period
    return NextResponse.json({
      done: false,
      quarter: filing.period,
      status: result.status,
      quartersDone,
      nextQuarter,
    })
  } catch (err) {
    console.error('backfill-step error:', err)
    await db.update(investors)
      .set({ backfill_status: 'error' })
      .where(eq(investors.id, investorId))
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
