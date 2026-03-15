// Run: npx tsx scripts/seed.ts
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

const INITIAL_INVESTORS = [
  { cik: '0001067983', name_cn: '巴菲特',      name_en: 'Warren Buffett', institution: 'Berkshire Hathaway' },
  { cik: '0001697748', name_cn: 'Cathie Wood', name_en: 'Cathie Wood',    institution: 'ARK Investment Management' },
  { cik: '0001759760', name_cn: '段永平',      name_en: 'Duan Yongpin',   institution: 'H&H International Investment' },
  { cik: '0001709323', name_cn: '李录',        name_en: 'Li Lu',          institution: 'Himalaya Capital Management' },
  { cik: '0001419050', name_cn: 'Norbert Lou', name_en: 'Norbert Lou',    institution: 'Punch Card Capital' },
]

async function seed() {
  console.log('Seeding investors...')
  for (const inv of INITIAL_INVESTORS) {
    await db.insert(schema.investors)
      .values(inv)
      .onConflictDoNothing()
    console.log(`  ✓ ${inv.name_cn} (CIK: ${inv.cik})`)
  }
  console.log('Done.')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
