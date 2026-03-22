// POST /api/investors/init/[cik]?quarter=2024Q4
// Processes ONE quarter of backfill, then chains to the next quarter via a server-to-server HTTP fetch.
// Called from settings page after investor is added. Each hop stays within Vercel's 60s timeout.
import { NextRequest, NextResponse, after } from 'next/server'
import { db, investors } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { isAuthorized } from '@/lib/auth'
import { fetchAndStore13F, getFilings } from '@/lib/fetcher'

export const maxDuration = 60

type Params = { params: Promise<{ cik: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cik } = await params
  const { searchParams } = new URL(req.url)
  const targetQuarter = searchParams.get('quarter') // e.g. "2024Q4"

  const [investor] = await db.select().from(investors).where(eq(investors.cik, cik))
  if (!investor) return NextResponse.json({ error: 'Investor not found' }, { status: 404 })

  // Mark running immediately — everything below is wrapped in try/catch so errors
  // will properly transition to 'error' state rather than leaving status as 'running'.
  await db.update(investors)
    .set({ backfill_status: 'running' })
    .where(eq(investors.id, investor.id))

  try {
    // Get all available filings from EDGAR (ascending: oldest first for backfill)
    // NOTE: previously outside try/catch — a getFilings() failure would leave status
    // permanently as 'running'. Now it's inside so failures transition to 'error'.
    const edgarFilings = await getFilings(cik)
    // Take the 8 most recent quarters, process oldest → newest
    const backfillList = edgarFilings.slice(0, 8).reverse() // now oldest first

    // Determine which filing to process this hop
    const currentIndex = targetQuarter
      ? backfillList.findIndex(f => f.period === targetQuarter)
      : 0

    if (currentIndex === -1) {
      // Quarter not found — mark done
      await db.update(investors)
        .set({ backfill_status: 'done', backfill_quarters_done: investor.backfill_quarters_done })
        .where(eq(investors.id, investor.id))
      return NextResponse.json({ done: true })
    }

    const filing = backfillList[currentIndex]

    const result = await fetchAndStore13F(investor.id, cik, filing)

    const quartersDone = investor.backfill_quarters_done + (result.status === 'ok' ? 1 : 0)
    const isLast = currentIndex >= backfillList.length - 1

    if (isLast) {
      await db.update(investors)
        .set({ backfill_status: 'done', backfill_quarters_done: quartersDone })
        .where(eq(investors.id, investor.id))

      // Fire AI analysis for the last (most recent) filing
      if (result.filingId) {
        fireAiAnalysis(investor.id, result.filingId)
      }

      return NextResponse.json({ done: true, quarter: filing.period, quartersDone })
    }

    // Update progress counter
    await db.update(investors)
      .set({ backfill_quarters_done: quartersDone })
      .where(eq(investors.id, investor.id))

    // Chain to next quarter (server-to-server self-call)
    // Uses after() so Vercel keeps the function alive until the fetch completes —
    // plain non-awaited fetch() is silently killed when the response is sent.
    const nextQuarter = backfillList[currentIndex + 1].period
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) throw new Error('NEXT_PUBLIC_BASE_URL env var is required for backfill chaining')

    after(() =>
      fetch(`${baseUrl}/api/investors/init/${cik}?quarter=${nextQuarter}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('init chain error:', err))
    )

    return NextResponse.json({ quarter: filing.period, status: result.status, quartersDone, nextQuarter })
  } catch (err) {
    console.error('init/[cik] error:', err)
    await db.update(investors)
      .set({ backfill_status: 'error' })
      .where(eq(investors.id, investor.id))
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

function fireAiAnalysis(investorId: number, filingId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) return
  after(() =>
    fetch(`${baseUrl}/api/ai-analysis`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ investorId, filingId }),
    }).catch(err => console.error('fire AI analysis error:', err))
  )
}
