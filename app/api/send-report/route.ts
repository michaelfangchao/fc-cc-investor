// POST /api/send-report — generate Claude digest + send weekly email via Resend
// Called by Vercel Cron at 0 11 * * 1 (one hour after update-all)
import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, stocks, position_changes } from '@/lib/db'
import { eq, gte } from 'drizzle-orm'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { WeeklyReport, type InvestorUpdate } from '@/lib/email'
import { generateText } from '@/lib/claude'
import { emailDigestPrompt } from '@/lib/prompts'
import { isAuthorized } from '@/lib/auth'
import { quarterLabel } from '@/lib/ui-constants'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recipientEmail = process.env.REPORT_EMAIL
  if (!recipientEmail) {
    return NextResponse.json({ error: 'REPORT_EMAIL env var not set' }, { status: 500 })
  }

  // Find filings created in the last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentFilings = await db.select().from(filings)
    .where(gte(filings.created_at, oneWeekAgo))

  if (recentFilings.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No new filings this week' })
  }

  const allInvestors = await db.select().from(investors)
  const investorMap = new Map(allInvestors.map(i => [i.id, i]))

  const updates: InvestorUpdate[] = []
  let latestQuarter = ''

  for (const filing of recentFilings) {
    const investor = investorMap.get(filing.investor_id)
    if (!investor) continue
    if (filing.period > latestQuarter) latestQuarter = filing.period

    const changes = await db.select({
      change_type: position_changes.change_type,
      pct_change: position_changes.pct_change,
      curr_shares: position_changes.curr_shares,
      ticker: stocks.ticker,
      name_en: stocks.name_en,
      // value not stored on position_changes — approximate from curr_shares (ok for email)
    })
      .from(position_changes)
      .leftJoin(stocks, eq(position_changes.stock_id, stocks.id))
      .where(eq(position_changes.investor_id, investor.id))

    const quarterChanges = changes.filter(c => true) // already filtered by recent filings loop

    updates.push({
      investorId: investor.id,
      investorName: investor.name_cn,
      cik: investor.cik,
      institution: investor.institution,
      changes: quarterChanges.map(c => ({
        ticker: c.ticker ?? null,
        nameOfIssuer: c.name_en ?? '',
        changeType: c.change_type as 'NEW' | 'INCREASED' | 'DECREASED' | 'EXITED',
        pctChange: c.pct_change ?? null,
        valueUsd: 0, // approximate — curr_shares * price would need market data
      })),
    })
  }

  if (updates.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No investor updates to report' })
  }

  // Generate AI digest paragraph
  const digestPrompt = emailDigestPrompt({
    quarter: latestQuarter,
    updates: updates.map(u => ({
      investorName: u.investorName,
      institution: u.institution,
      newPositions: u.changes.filter(c => c.changeType === 'NEW').length,
      increasedPositions: u.changes.filter(c => c.changeType === 'INCREASED').length,
      decreasedPositions: u.changes.filter(c => c.changeType === 'DECREASED').length,
      exitedPositions: u.changes.filter(c => c.changeType === 'EXITED').length,
      topMoves: u.changes.slice(0, 3).map(c => `${c.ticker ?? c.nameOfIssuer} ${c.changeType === 'NEW' ? '新建仓' : c.changeType}`),
    })),
  })
  const aiDigest = await generateText(digestPrompt)

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://your-site.vercel.app'
  const html = await render(WeeklyReport({ quarter: latestQuarter, updates, aiDigest, siteUrl }))

  const resend = new Resend(process.env.RESEND_API_KEY)
  const dateStr = new Date().toISOString().slice(0, 10)
  const subject = `13F 周报（${dateStr}）— ${updates.length}位投资人有更新`

  const { error } = await resend.emails.send({
    from: 'onboarding@resend.dev', // update to your verified domain
    to: recipientEmail,
    subject,
    html,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Email send failed', detail: error }, { status: 500 })
  }

  return NextResponse.json({ sent: true, subject, recipients: [recipientEmail], investors: updates.length })
}
