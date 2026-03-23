import { db } from './lib/db'
import { investors, filings, positions, position_changes, ai_summaries } from './lib/db/schema'
import { eq } from 'drizzle-orm'

// Find the Howard Marks / Pershing Square entry
const target = await db.select().from(investors).where(eq(investors.cik, '0001336528'))
if (target.length === 0) {
  console.log('Not found')
  process.exit(0)
}
const inv = target[0]
console.log(`Deleting: ${inv.name_cn} (id=${inv.id}, cik=${inv.cik})`)

await db.transaction(async (tx) => {
  await tx.delete(ai_summaries).where(eq(ai_summaries.investor_id, inv.id))
  await tx.delete(position_changes).where(eq(position_changes.investor_id, inv.id))
  const invFilings = await tx.select({ id: filings.id }).from(filings).where(eq(filings.investor_id, inv.id))
  for (const f of invFilings) {
    await tx.delete(positions).where(eq(positions.filing_id, f.id))
  }
  await tx.delete(filings).where(eq(filings.investor_id, inv.id))
  await tx.delete(investors).where(eq(investors.id, inv.id))
})
console.log('Deleted successfully')
