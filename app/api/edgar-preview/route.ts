// GET /api/edgar-preview?cik=... — look up entity info in EDGAR (used by settings add-investor flow)
import { NextRequest, NextResponse } from 'next/server'

const EDGAR_BASE = 'https://data.sec.gov'

export async function GET(req: NextRequest) {
  const cik = req.nextUrl.searchParams.get('cik')?.trim()
  if (!cik) return NextResponse.json({ error: 'cik required' }, { status: 400 })

  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0')

  let data: Record<string, unknown>
  try {
    const res = await fetch(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`, {
      headers: {
        'User-Agent': `fc-cc-investor ${process.env.EDGAR_EMAIL}`,
        'Accept': 'application/json',
      },
    })
    if (res.status === 404) return NextResponse.json({ error: 'CIK not found' }, { status: 404 })
    if (!res.ok) return NextResponse.json({ error: `EDGAR returned ${res.status}` }, { status: 502 })
    data = await res.json()
  } catch {
    return NextResponse.json({ error: 'Failed to reach EDGAR' }, { status: 502 })
  }

  const name = (data.name as string) || ''
  const forms: string[] = (data as { filings?: { recent?: { form?: string[] } } }).filings?.recent?.form || []
  const has13F = forms.includes('13F-HR')
  const filingCount = forms.filter((f: string) => f === '13F-HR').length

  return NextResponse.json({ cik: paddedCik, name, has13F, filingCount })
}
