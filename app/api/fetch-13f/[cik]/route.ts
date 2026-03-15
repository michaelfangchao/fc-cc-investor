import { NextRequest, NextResponse } from 'next/server'
import { db, investors, filings, stocks, positions, position_changes } from '@/lib/db'
import { getFilings, getPositions } from '@/lib/edgar'
import { cusipsToTickers } from '@/lib/openFigi'
import { eq, and, inArray } from 'drizzle-orm'

export const maxDuration = 60 // Vercel max for hobby plan

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params
  const { quartersBack = 1 } = await req.json().catch(() => ({}))

  try {
    // 1. Find investor in DB
    const [investor] = await db.select().from(investors).where(eq(investors.cik, cik))
    if (!investor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    // 2. Get filings list from EDGAR
    const edgarFilings = await getFilings(cik)
    if (edgarFilings.length === 0) {
      return NextResponse.json({ error: 'No 13F filings found' }, { status: 404 })
    }

    // Take only the requested number of recent quarters
    const toProcess = edgarFilings.slice(0, quartersBack)
    const results = []

    for (const filing of toProcess) {
      // 3. Check if we already have this quarter
      const [existing] = await db.select()
        .from(filings)
        .where(and(eq(filings.investor_id, investor.id), eq(filings.period, filing.period)))

      if (existing) {
        results.push({ quarter: filing.period, status: 'already_exists' })
        continue
      }

      // 4. Download positions from EDGAR
      const rawRaw = await getPositions(cik, filing.accessionNumber)
      if (rawRaw.length === 0) {
        results.push({ quarter: filing.period, status: 'empty_filing' })
        continue
      }
      // Deduplicate by CUSIP (some filers report same security across multiple subsidiaries)
      const cusipMap = new Map<string, typeof rawRaw[0]>()
      for (const p of rawRaw) {
        const existing = cusipMap.get(p.cusip)
        if (existing) {
          existing.shares += p.shares
          existing.valueThousands += p.valueThousands
        } else {
          cusipMap.set(p.cusip, { ...p })
        }
      }
      const rawPositions = [...cusipMap.values()]

      // 5. Resolve CUSIPs → tickers (use cache from stocks table first)
      const allCusips = rawPositions.map(p => p.cusip)
      const cachedStocks = await db.select()
        .from(stocks)
        .where(inArray(stocks.cusip, allCusips))

      const cachedMap = new Map(cachedStocks.map(s => [s.cusip, s]))
      const newCusips = allCusips.filter(c => !cachedMap.has(c))

      // Only call OpenFIGI for CUSIPs not in cache
      const figiMap = newCusips.length > 0 ? await cusipsToTickers(newCusips) : new Map<string, string>()

      // 6. Upsert stocks table
      for (const pos of rawPositions) {
        if (!cachedMap.has(pos.cusip)) {
          const ticker = figiMap.get(pos.cusip) || null
          const [newStock] = await db.insert(stocks)
            .values({ cusip: pos.cusip, name_en: pos.nameOfIssuer, ticker })
            .onConflictDoUpdate({ target: stocks.cusip, set: { name_en: pos.nameOfIssuer, ticker } })
            .returning()
          cachedMap.set(pos.cusip, newStock)
        }
      }

      // 7. Calculate total portfolio value for percentages
      const totalValue = rawPositions.reduce((s, p) => s + p.valueThousands, 0)

      // 8. Insert filing record
      const [newFiling] = await db.insert(filings).values({
        investor_id: investor.id,
        period: filing.period,
        filed_date: filing.filedDate,
        accession_number: filing.accessionNumber,
      }).returning()

      // 9. Insert positions
      for (const pos of rawPositions) {
        const stock = cachedMap.get(pos.cusip)
        if (!stock) continue
        const pct = totalValue > 0 ? (pos.valueThousands / totalValue) * 100 : 0
        await db.insert(positions)
          .values({
            filing_id: newFiling.id,
            stock_id: stock.id,
            shares: pos.shares,
            value_usd: pos.valueThousands, // already normalized to dollars by edgar.ts
            pct_of_portfolio: parseFloat(pct.toFixed(4)),
          })
          .onConflictDoNothing()
      }

      // 10. Compute position_changes vs previous quarter
      await computeChanges(investor.id, newFiling.id, filing.period, rawPositions, cachedMap)

      results.push({ quarter: filing.period, status: 'ok', positions: rawPositions.length })
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

async function computeChanges(
  investorId: number,
  currentFilingId: number,
  currentQuarter: string,
  currentRaw: { cusip: string; shares: number }[],
  stockMap: Map<string, { id: number; cusip: string; ticker: string | null; name_en: string }>
) {
  // Get previous quarter's filing
  const allFilings = await db.select()
    .from(filings)
    .where(eq(filings.investor_id, investorId))

  const prevFiling = allFilings
    .filter(f => f.period < currentQuarter)
    .sort((a, b) => b.period.localeCompare(a.period))[0]

  const prevPositions = prevFiling
    ? await db.select().from(positions).where(eq(positions.filing_id, prevFiling.id))
    : []

  const prevMap = new Map(prevPositions.map(p => [p.stock_id, p.shares]))
  const currentStockIds = new Set<number>()

  for (const raw of currentRaw) {
    const stock = stockMap.get(raw.cusip)
    if (!stock) continue
    currentStockIds.add(stock.id)

    const prevShares = prevMap.get(stock.id) ?? null
    let changeType: string
    let pctChange: number | null = null

    if (prevShares === null) {
      changeType = 'NEW'
    } else if (raw.shares > prevShares) {
      changeType = 'INCREASED'
      pctChange = prevShares > 0 ? ((raw.shares - prevShares) / prevShares) * 100 : null
    } else if (raw.shares < prevShares) {
      changeType = 'DECREASED'
      pctChange = prevShares > 0 ? ((raw.shares - prevShares) / prevShares) * 100 : null
    } else {
      continue // unchanged
    }

    await db.insert(position_changes)
      .values({
        investor_id: investorId,
        stock_id: stock.id,
        quarter: currentQuarter,
        change_type: changeType,
        prev_shares: prevShares,
        curr_shares: raw.shares,
        pct_change: pctChange ? parseFloat(pctChange.toFixed(2)) : null,
      })
      .onConflictDoNothing()
  }

  // EXITED: positions in prev but not in current
  for (const [stockId, prevShares] of prevMap.entries()) {
    if (!currentStockIds.has(stockId)) {
      await db.insert(position_changes)
        .values({
          investor_id: investorId,
          stock_id: stockId,
          quarter: currentQuarter,
          change_type: 'EXITED',
          prev_shares: prevShares,
          curr_shares: 0,
          pct_change: -100,
        })
        .onConflictDoNothing()
    }
  }
}
