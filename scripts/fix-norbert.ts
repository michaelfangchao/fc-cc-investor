import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../lib/db/schema'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function fix() {
  // Norbert Lou's active fund: Punch Card Management L.P. (CIK 0001631664)
  // Old: 0001419050 = Punch Card Capital L.P. (stopped filing in 2014)
  await db.update(schema.investors)
    .set({ cik: '0001631664', institution: 'Punch Card Management, L.P.' })
    .where(eq(schema.investors.cik, '0001419050'))
  console.log('✓ Norbert Lou CIK fixed → 0001631664 (Punch Card Management)')

  // Delete old 2014 filing data
  const [inv] = await db.select().from(schema.investors).where(eq(schema.investors.cik, '0001631664'))
  if (inv) {
    const oldFilings = await db.select().from(schema.filings).where(eq(schema.filings.investor_id, inv.id))
    console.log(`Found ${oldFilings.length} old filings to clean up`)
    for (const f of oldFilings) {
      await db.delete(schema.positions).where(eq(schema.positions.filing_id, f.id))
      await db.delete(schema.filings).where(eq(schema.filings.id, f.id))
    }
    await db.delete(schema.position_changes).where(eq(schema.position_changes.investor_id, inv.id))
    console.log('✓ Old data cleaned up')
  }

  console.log('Done.')
  process.exit(0)
}
fix().catch(e => { console.error(e); process.exit(1) })
