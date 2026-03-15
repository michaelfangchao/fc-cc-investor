// OpenFIGI API: resolve CUSIP → ticker symbol
// Free tier: 500 requests/day, supports batch of 100

const OPENFIGI_URL = 'https://api.openfigi.com/v3/mapping'

export async function cusipsToTickers(cusips: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (cusips.length === 0) return result

  // Batch in groups of 100 (OpenFIGI limit)
  for (let i = 0; i < cusips.length; i += 100) {
    const batch = cusips.slice(i, i + 100)
    const body = batch.map(cusip => ({ idType: 'ID_CUSIP', idValue: cusip, exchCode: 'US' }))

    try {
      const res = await fetch(OPENFIGI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        console.error(`OpenFIGI error ${res.status} for batch starting at ${i}`)
        continue
      }

      const data: { data?: { ticker: string }[]; error?: string }[] = await res.json()

      data.forEach((item, j) => {
        if (item.data && item.data.length > 0 && item.data[0].ticker) {
          result.set(batch[j], item.data[0].ticker)
        }
      })
    } catch (err) {
      console.error('OpenFIGI batch failed:', err)
    }

    // Rate limit between batches
    if (i + 100 < cusips.length) await new Promise(r => setTimeout(r, 500))
  }

  return result
}
