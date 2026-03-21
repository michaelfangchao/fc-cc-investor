import { NextRequest, NextResponse } from 'next/server'
import { db, investors } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { fetchAndStore13F, getFilings } from '@/lib/fetcher'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params
  const { quartersBack = 1 } = await req.json().catch(() => ({}))

  try {
    const [investor] = await db.select().from(investors).where(eq(investors.cik, cik))
    if (!investor) return NextResponse.json({ error: 'Investor not found' }, { status: 404 })

    const edgarFilings = await getFilings(cik)
    if (edgarFilings.length === 0) return NextResponse.json({ error: 'No 13F filings found' }, { status: 404 })

    const toProcess = edgarFilings.slice(0, quartersBack)
    const results = []

    for (const filing of toProcess) {
      const result = await fetchAndStore13F(investor.id, cik, filing)
      results.push(result)

      // Fire AI analysis async after a new filing is stored (non-awaited)
      if (result.status === 'ok' && result.filingId) {
        fireAiAnalysis(investor.id, result.filingId)
      }
    }

    return NextResponse.json({ investor: investor.name_cn, results })
  } catch (err: unknown) {
    console.error('fetch-13f error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function fireAiAnalysis(investorId: number, filingId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) return
  fetch(`${baseUrl}/api/ai-analysis`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ investorId, filingId }),
  }).catch(err => console.error('fire AI analysis error:', err))
}
