import { NextRequest, NextResponse } from 'next/server'
import { getFilingPositions } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const investorId = parseInt(searchParams.get('investorId') ?? '')
  const filingId = parseInt(searchParams.get('filingId') ?? '')
  const quarter = searchParams.get('quarter') ?? ''

  if (isNaN(investorId) || isNaN(filingId) || !quarter) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const data = await getFilingPositions(filingId, investorId, quarter)
  return NextResponse.json(data)
}
