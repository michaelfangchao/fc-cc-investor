// Backfill historical 13F data for all investors (up to 8 quarters)
// Processes quarters chronologically (oldest first) so position_changes are correct
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, inArray } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { getFilings, getPositions } from '../lib/edgar'
import { cusipsToTickers } from '../lib/openFigi'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const QUARTERS_BACK = 8

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function computeChanges(
  investorId: number,
  currentFilingId: number,
  currentQuarter: string,
  currentRaw: { cusip: string; shares: number }[],
  stockMap: Map<string, { id: number }>
) {
  const allFilings = await db.select().from(schema.filings).where(eq(schema.filings.investor_id, investorId))

  // Only compare against quarters strictly before current
  const prevFiling = allFilings
    .filter(f => f.period < currentQuarter)
    .sort((a, b) => b.period.localeCompare(a.period))[0]

  const prevPositions = prevFiling
    ? await db.select().from(schema.positions).where(eq(schema.positions.filing_id, prevFiling.id))
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

    await db.insert(schema.position_changes)
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

  // EXITED: in prev but not in current
  for (const [stockId, prevShares] of prevMap.entries()) {
    if (!currentStockIds.has(stockId)) {
      await db.insert(schema.position_changes)
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

async function backfillInvestor(investor: typeof schema.investors.$inferSelect) {
  console.log(`\n📡 ${investor.name_cn} (CIK: ${investor.cik})`)

  const edgarFilings = await getFilings(investor.cik)
  if (edgarFilings.length === 0) {
    console.log('  ⚠️  No 13F filings found')
    return
  }

  // Take up to QUARTERS_BACK most recent, then reverse to process oldest first
  const toProcess = edgarFilings.slice(0, QUARTERS_BACK).reverse()
  console.log(`  Found ${edgarFilings.length} filings, will process ${toProcess.length} (oldest first)`)

  for (const filing of toProcess) {
    // Check if already have this quarter
    const [existing] = await db.select()
      .from(schema.filings)
      .where(and(eq(schema.filings.investor_id, investor.id), eq(schema.filings.period, filing.period)))

    if (existing) {
      console.log(`  ✓ ${filing.period} already in DB`)
      continue
    }

    console.log(`  ⬇️  Fetching ${filing.period} (filed ${filing.filedDate})...`)
    await sleep(300) // be gentle with EDGAR

    const rawRaw = await getPositions(investor.cik, filing.accessionNumber)
    if (rawRaw.length === 0) {
      console.log(`  ⚠️  Empty filing`)
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
    console.log(`  📊 ${rawPositions.length} unique positions`)

    // Resolve CUSIPs → tickers (cache first)
    const allCusips = rawPositions.map(p => p.cusip)
    const cached = await db.select().from(schema.stocks).where(inArray(schema.stocks.cusip, allCusips))
    const cachedMap = new Map(cached.map(s => [s.cusip, s]))
    const newCusips = allCusips.filter(c => !cachedMap.has(c))

    if (newCusips.length > 0) {
      console.log(`  🔍 Resolving ${newCusips.length} new CUSIPs via OpenFIGI...`)
      const figiMap = await cusipsToTickers(newCusips)
      for (const pos of rawPositions) {
        if (!cachedMap.has(pos.cusip)) {
          const ticker = figiMap.get(pos.cusip) || null
          try {
            const [s] = await db.insert(schema.stocks)
              .values({ cusip: pos.cusip, name_en: pos.nameOfIssuer, ticker })
              .onConflictDoUpdate({ target: schema.stocks.cusip, set: { name_en: pos.nameOfIssuer, ticker } })
              .returning()
            cachedMap.set(pos.cusip, s)
          } catch {
            const [s] = await db.select().from(schema.stocks).where(eq(schema.stocks.cusip, pos.cusip))
            if (s) cachedMap.set(pos.cusip, s)
          }
        }
      }
    }

    const totalValue = rawPositions.reduce((s, p) => s + p.valueThousands, 0)

    const [newFiling] = await db.insert(schema.filings).values({
      investor_id: investor.id,
      period: filing.period,
      filed_date: filing.filedDate,
      accession_number: filing.accessionNumber,
    }).returning()

    let stored = 0
    for (const pos of rawPositions) {
      const stock = cachedMap.get(pos.cusip)
      if (!stock) continue
      const pct = totalValue > 0 ? (pos.valueThousands / totalValue) * 100 : 0
      await db.insert(schema.positions)
        .values({ filing_id: newFiling.id, stock_id: stock.id, shares: pos.shares, value_usd: pos.valueThousands, pct_of_portfolio: parseFloat(pct.toFixed(4)) })
        .onConflictDoNothing()
      stored++
    }

    // Compute position changes
    await computeChanges(investor.id, newFiling.id, filing.period, rawPositions, cachedMap)

    console.log(`  ✅ ${filing.period}: stored ${stored} positions`)
  }
}

async function main() {
  console.log(`🚀 Backfilling ${QUARTERS_BACK} quarters of 13F data for all investors...`)
  console.log('   (Processing oldest→newest so position changes are accurate)\n')

  const allInvestors = await db.select().from(schema.investors)

  for (const inv of allInvestors) {
    await backfillInvestor(inv)
    await sleep(1000) // pause between investors
  }

  console.log('\n✅ Done!')
  process.exit(0)
}

main().catch(e => { console.error('Error:', e); process.exit(1) })
