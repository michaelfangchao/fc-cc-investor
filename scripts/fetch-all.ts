// Fetch latest 13F for all investors and store in DB
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, inArray } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { getFilings, getPositions } from '../lib/edgar'
import { cusipsToTickers } from '../lib/openFigi'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function fetchInvestor(investor: typeof schema.investors.$inferSelect, quartersBack = 1) {
  console.log(`\n📡 ${investor.name_cn} (CIK: ${investor.cik})`)

  const edgarFilings = await getFilings(investor.cik)
  if (edgarFilings.length === 0) {
    console.log('  ⚠️  No 13F filings found')
    return
  }

  const toProcess = edgarFilings.slice(0, quartersBack)
  console.log(`  Found ${edgarFilings.length} filings, processing ${toProcess.length}`)

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
          const [s] = await db.insert(schema.stocks)
            .values({ cusip: pos.cusip, name_en: pos.nameOfIssuer, ticker })
            .onConflictDoUpdate({ target: schema.stocks.cusip, set: { name_en: pos.nameOfIssuer, ticker } })
            .returning()
          cachedMap.set(pos.cusip, s)
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
    console.log(`  ✅ ${filing.period}: stored ${stored} positions`)
  }
}

async function main() {
  console.log('🚀 Fetching 13F data for all investors...')
  const allInvestors = await db.select().from(schema.investors)

  for (const inv of allInvestors) {
    await fetchInvestor(inv, 1)  // fetch latest quarter only
  }

  console.log('\n✅ Done!')
  process.exit(0)
}

main().catch(e => { console.error('Error:', e); process.exit(1) })
