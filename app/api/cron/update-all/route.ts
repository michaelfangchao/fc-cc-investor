// Vercel Cron: runs every Monday at 10:00 UTC to check for new 13F filings
// Secured with CRON_SECRET env var
import { NextRequest, NextResponse } from 'next/server'
import { db, investors } from '@/lib/db'
import { fetchAndStore13F, getFilings } from '@/lib/fetcher'
import { isAuthorized } from '@/lib/auth'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { investor: string; status: string; quarter?: string }[] = []
  const allInvestors = await db.select().from(investors)

  for (const investor of allInvestors) {
    try {
      const edgarFilings = await getFilings(investor.cik)
      if (edgarFilings.length === 0) {
        results.push({ investor: investor.name_cn, status: 'no_filings' })
        continue
      }

      const result = await fetchAndStore13F(investor.id, investor.cik, edgarFilings[0])

      if (result.status === 'ok' && result.filingId) {
        // Fire AI analysis async (non-awaited) so it doesn't block the cron timeout
        fireAiAnalysis(investor.id, result.filingId)
        results.push({ investor: investor.name_cn, status: 'updated', quarter: result.quarter })
      } else {
        results.push({ investor: investor.name_cn, status: result.status, quarter: result.quarter })
      }
    } catch (err) {
      results.push({ investor: investor.name_cn, status: `error: ${err instanceof Error ? err.message : 'unknown'}` })
    }
  }

  return NextResponse.json({ updatedAt: new Date().toISOString(), results })
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
