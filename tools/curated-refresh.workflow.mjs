// Reusable curated-refresh workflow. Researches Claude anchor + latest filing
// + recent-trading value for each company passed in `args`, with per-source
// fetch-verification. Run via the Workflow tool:
//   Workflow({ scriptPath: "tools/curated-refresh.workflow.mjs", args: [{company,sector,country}, ...] })
// See `/refresh-curated` command for the full runbook.
export const meta = {
  name: 'curated-refresh',
  description: 'Research + verify Claude anchor, latest filing, and recent-trading value for the given companies',
  phases: [{ title: 'Research', detail: 'web-research each company; fetch-confirm every cited source URL' }],
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    company: { type: 'string' },
    claude: { type: ['number', 'null'], description: 'valuation anchor in $B (1550 = $1.55T)' },
    claudeSrc: { type: 'string', description: 'one line, <=120 chars; note if secondary vs priced' },
    filing: {
      type: ['object', 'null'], additionalProperties: false,
      properties: {
        date: { type: 'string', description: 'Mon DD, YYYY' },
        src: { type: 'string', description: 'outlet/company · <event type>, e.g. "Fortune · insider tender"' },
        val: { type: 'string', description: 'e.g. $39B' },
        url: { type: 'string', description: 'exact article URL you fetched' },
      },
      required: ['date', 'src', 'val', 'url'],
    },
    tradeLabel: { type: ['string', 'null'] },
    tradeN: { type: ['number', 'null'] },
    filingVerified: { type: 'boolean', description: 'true only if you fetched the URL and it supports val+date for this company' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    verifyNote: { type: 'string' },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['company', 'claude', 'claudeSrc', 'filing', 'tradeLabel', 'tradeN', 'filingVerified', 'confidence', 'verifyNote', 'sources'],
}

const prompt = (co) => `You are a financial research analyst. Research this PRIVATE company and return current valuation data as of today. Use web search and OPEN candidate sources with web fetch to confirm facts.

Company: ${co.company}  (sector: ${co.sector}; country: ${co.country})

Produce:
- claude: best independent valuation anchor in $B (39 = $39B; 1550 = $1.55T). Prefer the most recent reliable mark; prefer a priced round when one is recent, else a well-sourced secondary/tender/buyback/M&A.
- claudeSrc: ONE line (<=120 chars) stating the basis; distinguish priced rounds from secondaries.
- filing: the most recent RELIABLE valuation EVENT — priced round, tender, secondary, buyback, M&A, or strategic investment — confirmed by a credible source (company newsroom or tier-1 outlet: Bloomberg, Reuters, WSJ, CNBC, FT, TechCrunch, Fortune, Forbes), ideally more than one. Put the EVENT TYPE in src, e.g. "Fortune · insider tender". You MUST fetch the exact URL and confirm it states this company's valuation + date. Set filing to null if the only mark is a target/rumor, undisclosed, founder-stated, or a single weak/aggregator source.
- filingVerified: true ONLY if you fetched filing.url and it supports val+date for THIS company.
- tradeLabel/tradeN: most recent SECONDARY/tender/trading valuation if distinct (e.g. "$50B", 50); null if none.
- confidence: high/medium/low by source quality + recency + corroboration.
- verifyNote: one line on what you confirmed (or why filing is null).
- sources: URLs you actually consulted.

Hard rules: never fabricate a source, URL, figure, or date; a wrong/dead URL is worse than no filing. Only this company (it is private — if it has been acquired or gone public, say so in verifyNote). Return ONLY the structured object.`

const companies = Array.isArray(args) ? args : JSON.parse(args)
const results = await pipeline(
  companies,
  (co) => agent(prompt(co), { label: co.company, phase: 'Research', schema: SCHEMA }),
)
const ok = results.filter(Boolean)
log(`researched ${ok.length}/${companies.length}; verified filings: ${ok.filter(r => r.filingVerified && r.filing).length}`)
return { results: ok }
