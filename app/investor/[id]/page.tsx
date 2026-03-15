import { notFound } from 'next/navigation'
import { investors } from '@/lib/mockData'
import InvestorDetailClient from './InvestorDetailClient'

export function generateStaticParams() {
  return investors.map(inv => ({ id: inv.id }))
}

export default async function InvestorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const investor = investors.find(i => i.id === id)
  if (!investor) notFound()
  return <InvestorDetailClient investor={investor} />
}
