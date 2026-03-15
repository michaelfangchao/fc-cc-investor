// Quick test: fetch Buffett's latest 13F from EDGAR
import 'dotenv/config'
import { getFilings, getPositions } from '../lib/edgar'

async function test() {
  const cik = '0001067983' // Buffett
  console.log('Fetching filings for Berkshire Hathaway...')

  const filings = await getFilings(cik)
  console.log(`Found ${filings.length} 13F filings`)

  if (filings.length === 0) { console.error('No filings found!'); process.exit(1) }

  const latest = filings[0]
  console.log(`Latest: ${latest.period} (filed ${latest.filedDate})`)
  console.log(`Accession: ${latest.accessionNumber}`)

  console.log('\nFetching positions...')
  const positions = await getPositions(cik, latest.accessionNumber)
  console.log(`Found ${positions.length} positions`)

  if (positions.length > 0) {
    console.log('\nTop 5 positions:')
    positions.slice(0, 5).forEach(p => {
      console.log(`  ${p.cusip}  ${p.nameOfIssuer.padEnd(30)} shares: ${p.shares.toLocaleString()}  value: $${(p.valueThousands/1000).toFixed(0)}M`)
    })
  }

  process.exit(0)
}

test().catch(e => { console.error('Error:', e.message); process.exit(1) })
