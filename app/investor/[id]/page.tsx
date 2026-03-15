import { notFound } from 'next/navigation'
import { getInvestorDetail, getFilingPositions } from '@/lib/db/queries'
import InvestorDetailClient from './InvestorDetailClient'

export const dynamic = 'force-dynamic'

export default async function InvestorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const investorId = parseInt(id)
  if (isNaN(investorId)) notFound()

  const data = await getInvestorDetail(investorId)
  if (!data) notFound()

  const { investor, filings } = data
  const latestFiling = filings[0]
  const defaultPositions = latestFiling
    ? await getFilingPositions(latestFiling.id, investorId, latestFiling.period)
    : { positions: [], totalValue: 0 }

  return (
    <InvestorDetailClient
      investor={investor}
      filings={filings}
      defaultPositions={defaultPositions.positions}
      defaultQuarter={latestFiling?.period ?? ''}
      totalValue={defaultPositions.totalValue}
    />
  )
}
