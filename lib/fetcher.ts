// Shared EDGAR fetch-and-store logic used by:
//   app/api/fetch-13f/[cik]/route.ts
//   app/api/cron/update-all/route.ts
//   app/api/investors/init/[cik]/route.ts

import { db, investors, filings, stocks, positions, position_changes } from '@/lib/db'
import { getFilings, getPositions, type FilingRecord } from '@/lib/edgar'
import { cusipsToTickers } from '@/lib/openFigi'
import { eq, and, inArray } from 'drizzle-orm'

export interface FetchResult {
  quarter: string
  status: 'ok' | 'already_exists' | 'empty_filing'
  positions?: number
  filingId?: number
}

/** Fetch and store a single 13F filing quarter for a given investor.
 *  Returns the filing record id on success (needed to trigger AI analysis). */
export async function fetchAndStore13F(
  investorId: number,
  cik: string,
  filing: FilingRecord,
): Promise<FetchResult> {
  // Check if we already have this quarter
  const [existing] = await db.select()
    .from(filings)
    .where(and(eq(filings.investor_id, investorId), eq(filings.period, filing.period)))

  if (existing) return { quarter: filing.period, status: 'already_exists', filingId: existing.id }

  // Download positions from EDGAR
  const rawRaw = await getPositions(cik, filing.accessionNumber)
  if (rawRaw.length === 0) return { quarter: filing.period, status: 'empty_filing' }

  // Deduplicate by CUSIP (some filers report same security across multiple subsidiaries)
  const cusipMap = new Map<string, typeof rawRaw[0]>()
  for (const p of rawRaw) {
    const ex = cusipMap.get(p.cusip)
    if (ex) { ex.shares += p.shares; ex.valueThousands += p.valueThousands }
    else cusipMap.set(p.cusip, { ...p })
  }
  const rawPositions = [...cusipMap.values()]

  // Resolve CUSIPs → tickers (use stocks table cache first)
  const allCusips = rawPositions.map(p => p.cusip)
  const cachedStocks = await db.select().from(stocks).where(inArray(stocks.cusip, allCusips))
  const cachedMap = new Map(cachedStocks.map(s => [s.cusip, s]))
  const newCusips = allCusips.filter(c => !cachedMap.has(c))

  if (newCusips.length > 0) {
    const figiMap = await cusipsToTickers(newCusips)
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
  }

  const totalValue = rawPositions.reduce((s, p) => s + p.valueThousands, 0)

  const [newFiling] = await db.insert(filings).values({
    investor_id: investorId,
    period: filing.period,
    filed_date: filing.filedDate,
    accession_number: filing.accessionNumber,
  }).returning()

  for (const pos of rawPositions) {
    const stock = cachedMap.get(pos.cusip)
    if (!stock) continue
    const pct = totalValue > 0 ? (pos.valueThousands / totalValue) * 100 : 0
    await db.insert(positions)
      .values({
        filing_id: newFiling.id,
        stock_id: stock.id,
        shares: pos.shares,
        value_usd: pos.valueThousands,
        pct_of_portfolio: parseFloat(pct.toFixed(4)),
      })
      .onConflictDoNothing()
  }

  await computeChanges(investorId, newFiling.id, filing.period, rawPositions, cachedMap)

  return { quarter: filing.period, status: 'ok', positions: rawPositions.length, filingId: newFiling.id }
}

/** Get the list of 13F filings from EDGAR for a CIK. */
export { getFilings }

async function computeChanges(
  investorId: number,
  currentFilingId: number,
  currentQuarter: string,
  currentRaw: { cusip: string; shares: number }[],
  stockMap: Map<string, { id: number; cusip: string; ticker: string | null; name_en: string }>,
) {
  // Find the most recent previous quarter's filing (use ORDER BY to avoid loading all filings)
  const allFilings = await db.select().from(filings).where(eq(filings.investor_id, investorId))
  const prevFiling = allFilings
    .filter(f => f.period < currentQuarter && f.id !== currentFilingId)
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
        pct_change: pctChange !== null ? parseFloat(pctChange.toFixed(2)) : null,
      })
      .onConflictDoNothing()
  }

  // EXITED: positions in prev quarter but not in current
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
