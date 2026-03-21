// POST /api/ai-analysis — generate and store Claude analysis for a filing
// Called fire-and-forget from fetch-13f and update-all after a new filing is stored.
import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, stocks, positions, position_changes, ai_summaries } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { generateAnalysis } from '@/lib/claude'
import { investorSummaryPrompt } from '@/lib/prompts'
import { isAuthorized } from '@/lib/auth'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { investorId, filingId } = await req.json()
  if (!investorId || !filingId) {
    return NextResponse.json({ error: 'investorId and filingId required' }, { status: 400 })
  }

  try {
    const [investor] = await db.select().from(investors).where(eq(investors.id, investorId))
    const [filing] = await db.select().from(filings).where(eq(filings.id, filingId))
    if (!investor || !filing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Load positions with stock data
    const posRows = await db.select({
      shares: positions.shares,
      value_usd: positions.value_usd,
      pct_of_portfolio: positions.pct_of_portfolio,
      ticker: stocks.ticker,
      name_en: stocks.name_en,
    })
      .from(positions)
      .leftJoin(stocks, eq(positions.stock_id, stocks.id))
      .where(eq(positions.filing_id, filingId))

    // Load changes for this quarter
    const changeRows = await db.select({
      change_type: position_changes.change_type,
      prev_shares: position_changes.prev_shares,
      curr_shares: position_changes.curr_shares,
      pct_change: position_changes.pct_change,
      ticker: stocks.ticker,
      name_en: stocks.name_en,
    })
      .from(position_changes)
      .leftJoin(stocks, eq(position_changes.stock_id, stocks.id))
      .where(eq(position_changes.investor_id, investorId))

    const prompt = investorSummaryPrompt({
      investorName: investor.name_cn,
      institution: investor.institution,
      quarter: filing.period,
      positions: posRows.map(p => ({
        ticker: p.ticker ?? null,
        nameOfIssuer: p.name_en ?? '',
        shares: p.shares,
        valueUsd: p.value_usd,
        pctOfPortfolio: p.pct_of_portfolio ?? 0,
      })),
      changes: changeRows.map(c => ({
        ticker: c.ticker ?? null,
        nameOfIssuer: c.name_en ?? '',
        changeType: c.change_type,
        prevShares: c.prev_shares ?? null,
        currShares: c.curr_shares ?? null,
        pctChange: c.pct_change ?? null,
      })),
    })

    const analysis = await generateAnalysis(prompt)

    await db.insert(ai_summaries)
      .values({ investor_id: investorId, filing_id: filingId, analysis })
      .onConflictDoUpdate({
        target: [ai_summaries.investor_id, ai_summaries.filing_id],
        set: { analysis, created_at: new Date() },
      })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('ai-analysis error:', err)
    // Store error sentinel so UI shows "generating" state rather than blank
    await db.insert(ai_summaries)
      .values({ investor_id: investorId, filing_id: filingId, analysis: { error: 'AI分析生成中' } })
      .onConflictDoNothing()
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
