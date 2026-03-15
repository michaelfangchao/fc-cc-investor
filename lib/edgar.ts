// SEC EDGAR 13F data fetching
// Docs: https://www.sec.gov/developer

const EDGAR_BASE = 'https://data.sec.gov'
const EDGAR_ARCHIVE = 'https://www.sec.gov/Archives/edgar/data'
const USER_AGENT = 'fc-cc-investor contact@example.com'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function edgarFetch(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    await sleep(150) // respect EDGAR rate limit
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' }
    })
    if (res.status === 429) {
      await sleep(2000)
      continue
    }
    if (res.ok) return res
    if (res.status >= 500 && i < retries - 1) continue
    throw new Error(`EDGAR ${res.status}: ${url}`)
  }
  throw new Error(`EDGAR failed after ${retries} retries: ${url}`)
}

export interface FilingRecord {
  accessionNumber: string
  filedDate: string
  period: string      // e.g. "2024Q4"
  periodOfReport: string // e.g. "2024-12-31"
}

// Pad CIK to 10 digits as required by EDGAR
function padCik(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0')
}

// Convert period-of-report (2024-12-31) to quarter string (2024Q4)
function toQuarter(periodOfReport: string): string {
  const [year, month] = periodOfReport.split('-').map(Number)
  const q = Math.ceil(month / 3)
  return `${year}Q${q}`
}

// Get all 13F filings for an investor (from EDGAR submissions API)
export async function getFilings(cik: string): Promise<FilingRecord[]> {
  const paddedCik = padCik(cik)
  const res = await edgarFetch(`${EDGAR_BASE}/submissions/CIK${paddedCik}.json`)
  const data = await res.json()

  const filings: FilingRecord[] = []
  const recent = data.filings?.recent
  if (!recent) return filings

  const forms: string[] = recent.form || []
  const accessions: string[] = recent.accessionNumber || []
  const dates: string[] = recent.filingDate || []
  const periods: string[] = recent.reportDate || []

  for (let i = 0; i < forms.length; i++) {
    if (forms[i] === '13F-HR' && periods[i]) {
      filings.push({
        accessionNumber: accessions[i].replace(/-/g, ''),
        filedDate: dates[i],
        period: toQuarter(periods[i]),
        periodOfReport: periods[i],
      })
    }
  }
  return filings
}

export interface RawPosition {
  nameOfIssuer: string
  cusip: string
  shares: number
  valueThousands: number  // SEC reports value in thousands of USD
}

// Download and parse the 13F informationTable XML for a given filing
export async function getPositions(cik: string, accessionNumber: string): Promise<RawPosition[]> {
  const rawCik = padCik(cik).replace(/^0+/, '')
  const baseUrl = `${EDGAR_ARCHIVE}/${rawCik}/${accessionNumber}`

  // Step 1: get directory listing HTML to find the informationTable XML
  const xmlFileName = await findInfoTableXml(baseUrl)

  // Step 2: download the XML
  const xmlRes = await edgarFetch(`${baseUrl}/${xmlFileName}`)
  const xml = await xmlRes.text()

  return parseInformationTable(xml)
}

async function findInfoTableXml(baseUrl: string): Promise<string> {
  try {
    // Fetch the directory listing HTML
    const res = await fetch(baseUrl + '/', {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!res.ok) return 'informationTable.xml'
    const html = await res.text()

    // Find all .xml files listed in the directory
    const xmlFiles = [...html.matchAll(/href="([^"]+\.xml)"/gi)]
      .map(m => m[1].split('/').pop()!)
      .filter(f => f && f !== 'primary_doc.xml' && !f.includes('xsd'))

    if (xmlFiles.length === 1) return xmlFiles[0]

    // Prefer file with "information" in name
    const infoFile = xmlFiles.find(f => f.toLowerCase().includes('information'))
    if (infoFile) return infoFile

    // Return the largest-numbered or first non-primary XML file
    return xmlFiles[0] || 'informationTable.xml'
  } catch {
    return 'informationTable.xml'
  }
}

function parseInformationTable(xml: string): RawPosition[] {
  const positions: RawPosition[] = []

  // Extract all <infoTable> blocks — handle both plain and namespace-prefixed tags (e.g. <ns1:infoTable>)
  const blocks = xml.match(/<(?:\w+:)?infoTable[\s\S]*?<\/(?:\w+:)?infoTable>/gi) || []

  for (const block of blocks) {
    const nameOfIssuer = extractTag(block, 'nameOfIssuer') || extractTag(block, 'NAMEOFISSUER') || ''
    const cusip = extractTag(block, 'cusip') || extractTag(block, 'CUSIP') || ''
    const valueRaw = extractTag(block, 'value') || extractTag(block, 'VALUE') || '0'
    const sharesRaw = extractTag(block, 'sshPrnamt') || extractTag(block, 'SSHPRNAMT') || '0'

    if (!cusip || cusip.length < 8) continue

    positions.push({
      nameOfIssuer: nameOfIssuer.trim(),
      cusip: cusip.trim(),
      shares: parseInt(sharesRaw.replace(/,/g, ''), 10) || 0,
      valueThousands: parseInt(valueRaw.replace(/,/g, ''), 10) || 0,
    })
  }

  // SEC changed 13F format in 2024: value is now in dollars, not thousands.
  // Detect by checking median value-per-share. If < $0.50, it's in thousands (old format).
  if (positions.length > 0) {
    const sample = positions.filter(p => p.shares > 0).slice(0, 20)
    const ratios = sample.map(p => p.valueThousands / p.shares)
    const median = ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)]
    if (median < 0.5) {
      // Old format: value was in thousands — convert to dollars for consistency
      for (const p of positions) p.valueThousands = p.valueThousands * 1000
    }
    // New format: value is already in dollars — stored as-is in valueThousands field
    // (field name is misleading for new format; treated as dollars throughout)
  }

  return positions
}

function extractTag(xml: string, tag: string): string | null {
  // Match both plain <tag> and namespace-prefixed <ns:tag>
  const match = xml.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([^<]*)<\\/(?:\\w+:)?${tag}>`, 'i'))
  return match ? match[1].trim() : null
}
