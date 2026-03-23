// POST /api/send-report — generate Claude digest + send weekly email via Resend
// Called by Vercel Cron at 0 11 * * 1 (one hour after update-all)
import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, stocks, positions, position_changes } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { WeeklyReport, type InvestorUpdate } from '@/lib/email'
import { generateText } from '@/lib/claude'
import { emailDigestPrompt } from '@/lib/prompts'
import { isAuthorized } from '@/lib/auth'

export const maxDuration = 60

// Vercel Cron sends GET; keep POST for manual testing
export async function GET(req: NextRequest) { return handleReport(req) }
export async function POST(req: NextRequest) { return handleReport(req) }

async function handleReport(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recipientEmail = process.env.REPORT_EMAIL
  if (!recipientEmail) {
    return NextResponse.json({ error: 'REPORT_EMAIL env var not set' }, { status: 500 })
  }

  const allInvestors = await db.select().from(investors)
  if (allInvestors.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No investors tracked' })
  }

  // Find the latest quarter across all investors' filings
  const latestFiling = await db.select({ period: filings.period })
    .from(filings)
    .orderBy(desc(filings.period))
    .limit(1)

  if (latestFiling.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No filings found' })
  }

  const latestQuarter = latestFiling[0].period  // e.g. "2025Q4"

  // For each investor, get position_changes for the latest quarter only
  const updates: InvestorUpdate[] = []

  for (const investor of allInvestors) {
    // Get the filing for this investor for the latest quarter
    const [filing] = await db.select()
      .from(filings)
      .where(and(eq(filings.investor_id, investor.id), eq(filings.period, latestQuarter)))

    if (!filing) continue  // investor has no data for this quarter

    // Get position_changes for this investor in the latest quarter only
    const changes = await db.select({
      change_type: position_changes.change_type,
      pct_change: position_changes.pct_change,
      curr_shares: position_changes.curr_shares,
      ticker: stocks.ticker,
      name_en: stocks.name_en,
      value_usd: positions.value_usd,
    })
      .from(position_changes)
      .leftJoin(stocks, eq(position_changes.stock_id, stocks.id))
      .leftJoin(
        positions,
        and(eq(positions.filing_id, filing.id), eq(positions.stock_id, position_changes.stock_id))
      )
      .where(and(
        eq(position_changes.investor_id, investor.id),
        eq(position_changes.quarter, latestQuarter),
      ))

    if (changes.length === 0) continue  // no changes this quarter for this investor

    updates.push({
      investorId: investor.id,
      investorName: investor.name_cn,
      cik: investor.cik,
      institution: investor.institution,
      changes: changes.map(c => ({
        ticker: c.ticker ?? null,
        nameOfIssuer: c.name_en ?? '',
        changeType: c.change_type as 'NEW' | 'INCREASED' | 'DECREASED' | 'EXITED',
        pctChange: c.pct_change ?? null,
        valueUsd: c.value_usd ?? 0,
      })),
    })
  }

  if (updates.length === 0) {
    return NextResponse.json({ sent: false, reason: `No changes found for ${latestQuarter}` })
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

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://fc-cc-investor.vercel.app'
  const html = await render(WeeklyReport({ quarter: latestQuarter, updates, aiDigest, siteUrl }))

  const resend = new Resend(process.env.RESEND_API_KEY)
  const dateStr = new Date().toISOString().slice(0, 10)
  const subject = `13F 周报（${dateStr}）— ${latestQuarter} 持仓变动`

  const { error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: recipientEmail,
    subject,
    html,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Email send failed', detail: error }, { status: 500 })
  }

  return NextResponse.json({
    sent: true,
    subject,
    quarter: latestQuarter,
    recipients: [recipientEmail],
    investors: updates.length,
    totalChanges: updates.reduce((sum, u) => sum + u.changes.length, 0),
  })
}
