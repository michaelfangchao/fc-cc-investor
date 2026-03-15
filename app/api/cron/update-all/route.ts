// Vercel Cron: runs every Monday to check for new 13F filings
// Secured with CRON_SECRET env var
import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, stocks, positions, position_changes } from '@/lib/db'
import { getFilings, getPositions } from '@/lib/edgar'
import { cusipsToTickers } from '@/lib/openFigi'
import { eq, and, inArray } from 'drizzle-orm'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron or by us with the secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

      const latest = edgarFilings[0]

      // Skip if already have this quarter
      const [existing] = await db.select()
        .from(filings)
        .where(and(eq(filings.investor_id, investor.id), eq(filings.period, latest.period)))

      if (existing) {
        results.push({ investor: investor.name_cn, status: 'up_to_date', quarter: latest.period })
        continue
      }

      // New quarter found — fetch positions
      const rawRaw = await getPositions(investor.cik, latest.accessionNumber)
      if (rawRaw.length === 0) {
        results.push({ investor: investor.name_cn, status: 'empty_filing', quarter: latest.period })
        continue
      }

      // Deduplicate by CUSIP
      const cusipMap = new Map<string, typeof rawRaw[0]>()
      for (const p of rawRaw) {
        const ex = cusipMap.get(p.cusip)
        if (ex) { ex.shares += p.shares; ex.valueThousands += p.valueThousands }
        else cusipMap.set(p.cusip, { ...p })
      }
      const rawPositions = [...cusipMap.values()]

      // Resolve CUSIPs → tickers (cache first)
      const allCusips = rawPositions.map(p => p.cusip)
      const cached = await db.select().from(stocks).where(inArray(stocks.cusip, allCusips))
      const cachedMap = new Map(cached.map(s => [s.cusip, s]))
      const newCusips = allCusips.filter(c => !cachedMap.has(c))

      if (newCusips.length > 0) {
        const figiMap = await cusipsToTickers(newCusips)
        for (const pos of rawPositions) {
          if (!cachedMap.has(pos.cusip)) {
            const ticker = figiMap.get(pos.cusip) || null
            const [s] = await db.insert(stocks)
              .values({ cusip: pos.cusip, name_en: pos.nameOfIssuer, ticker })
              .onConflictDoUpdate({ target: stocks.cusip, set: { name_en: pos.nameOfIssuer, ticker } })
              .returning()
            cachedMap.set(pos.cusip, s)
          }
        }
      }

      const totalValue = rawPositions.reduce((s, p) => s + p.valueThousands, 0)

      const [newFiling] = await db.insert(filings).values({
        investor_id: investor.id,
        period: latest.period,
        filed_date: latest.filedDate,
        accession_number: latest.accessionNumber,
      }).returning()

      for (const pos of rawPositions) {
        const stock = cachedMap.get(pos.cusip)
        if (!stock) continue
        const pct = totalValue > 0 ? (pos.valueThousands / totalValue) * 100 : 0
        await db.insert(positions)
          .values({ filing_id: newFiling.id, stock_id: stock.id, shares: pos.shares, value_usd: pos.valueThousands, pct_of_portfolio: parseFloat(pct.toFixed(4)) })
          .onConflictDoNothing()
      }

      // Compute position changes vs previous quarter
      const allFilings = await db.select().from(filings).where(eq(filings.investor_id, investor.id))
      const prevFiling = allFilings
        .filter(f => f.period !== latest.period)
        .sort((a, b) => b.period.localeCompare(a.period))[0]

      const prevPositions = prevFiling
        ? await db.select().from(positions).where(eq(positions.filing_id, prevFiling.id))
        : []
      const prevMap = new Map(prevPositions.map(p => [p.stock_id, p.shares]))
      const currentStockIds = new Set<number>()

      for (const pos of rawPositions) {
        const stock = cachedMap.get(pos.cusip)
        if (!stock) continue
        currentStockIds.add(stock.id)
        const prevShares = prevMap.get(stock.id) ?? null
        let changeType: string
        let pctChange: number | null = null
        if (prevShares === null) changeType = 'NEW'
        else if (pos.shares > prevShares) { changeType = 'INCREASED'; pctChange = prevShares > 0 ? ((pos.shares - prevShares) / prevShares) * 100 : null }
        else if (pos.shares < prevShares) { changeType = 'DECREASED'; pctChange = prevShares > 0 ? ((pos.shares - prevShares) / prevShares) * 100 : null }
        else continue
        await db.insert(position_changes)
          .values({ investor_id: investor.id, stock_id: stock.id, quarter: latest.period, change_type: changeType, prev_shares: prevShares, curr_shares: pos.shares, pct_change: pctChange ? parseFloat(pctChange.toFixed(2)) : null })
          .onConflictDoNothing()
      }
      for (const [stockId, prevShares] of prevMap.entries()) {
        if (!currentStockIds.has(stockId)) {
          await db.insert(position_changes)
            .values({ investor_id: investor.id, stock_id: stockId, quarter: latest.period, change_type: 'EXITED', prev_shares: prevShares, curr_shares: 0, pct_change: -100 })
            .onConflictDoNothing()
        }
      }

      results.push({ investor: investor.name_cn, status: 'updated', quarter: latest.period })
    } catch (err) {
      results.push({ investor: investor.name_cn, status: `error: ${err instanceof Error ? err.message : 'unknown'}` })
    }
  }

  return NextResponse.json({ updatedAt: new Date().toISOString(), results })
}
