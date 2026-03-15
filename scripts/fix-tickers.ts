import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { isNull, eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import { cusipsToTickers } from '../lib/openFigi'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  const noTicker = await db.select().from(schema.stocks).where(isNull(schema.stocks.ticker))
  console.log(`Found ${noTicker.length} stocks without tickers`)
  if (noTicker.length === 0) { console.log('All good!'); process.exit(0) }

  const cusips = noTicker.map(s => s.cusip)
  console.log(`Resolving ${cusips.length} CUSIPs via OpenFIGI...`)
  const figiMap = await cusipsToTickers(cusips)
  console.log(`Resolved ${figiMap.size} tickers`)

  let updated = 0, skipped = 0
  for (const stock of noTicker) {
    const ticker = figiMap.get(stock.cusip)
    if (!ticker) continue
    try {
      await db.update(schema.stocks).set({ ticker }).where(eq(schema.stocks.id, stock.id))
      updated++
    } catch (e: any) {
      if (e?.cause?.code === '23505') {
        skipped++ // another stock already has this ticker
      } else {
        throw e
      }
    }
  }
  console.log(`Updated ${updated} tickers, skipped ${skipped} duplicates`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
