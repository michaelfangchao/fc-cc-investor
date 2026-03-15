import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function fix() {
  // Fix 段永平: wrong 0001709893 → correct 0001759760
  await db.update(schema.investors)
    .set({ cik: '0001759760', institution: 'H&H International Investment, LLC' })
    .where(eq(schema.investors.cik, '0001709893'))
  console.log('✓ 段永平 CIK fixed → 0001759760')

  // Fix Norbert Lou: wrong 0001599598 → correct 0001419050
  await db.update(schema.investors)
    .set({ cik: '0001419050', institution: 'Punch Card Capital, L.P.' })
    .where(eq(schema.investors.cik, '0001599598'))
  console.log('✓ Norbert Lou CIK fixed → 0001419050')

  console.log('Done.')
  process.exit(0)
}

fix().catch(e => { console.error(e); process.exit(1) })
