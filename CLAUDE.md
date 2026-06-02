# CLAUDE.md — working notes for Claude Code

You are maintaining a **daily-refreshing private-company valuation screener**.
Read this before changing anything.

## What this project is
A static site (`web/index.html`) that renders a Finviz-style table of the ~100
most valuable private companies. Data lives in `data/companies.json` (the
canonical store + "last good" cache) and is mirrored to `web/companies.json`
for the page to fetch. A daily GitHub Actions job scrapes 5 sources, recomputes
the consensus, commits the JSON, and redeploys.

## The data schema (FLAT — do not restructure)
Each entry in `companies.json -> companies[]` has:
- Identity: `company, sector, country, founded, no` (rank).
- Headline: `valLabel, valN` (display valuation), `tradeLabel, tradeN` (secondary),
  `fund, round, notes`.
- Five live source values (billions, or null): `y` Yahoo, `p` PremierAlts,
  `m` multiples.vc, `c` Crunchbase, `cbi` CB Insights.
- `claude` — independent anchor (billions) + `claudeSrc` — its one-line basis.
- `filing` — `{date, src, val, url}` verified primary funding announcement (or absent).
- Derived: `consensus, low, high, dispersion, cnt` (recomputed by reconcile.js).
- `addLabel, addSrc` — optional reference mark.

## HARD RULES (do not break)
1. **Median = the 5 live sources ONLY.** `consensus/low/high/dispersion/cnt`
   come from `[y,p,m,c,cbi]`. **Never** include `claude` in the median.
   (If the owner ever asks to fold Claude in, add "claude" to `LIVE` in
   `reconcile.js` — that is the single switch.)
2. **Fail safe.** If a scraper returns nothing for a company, KEEP the prior
   value — never overwrite good data with null. A row with 0 live sources keeps
   its prior consensus. This is already implemented; preserve it.
3. **Do not auto-edit curated columns.** `claude`, `claudeSrc`, and `filing`
   are human/Claude-verified. The daily scrape must not touch them.
4. **Keep the columns as they are.** The screener's columns are fixed; don't add
   or remove columns without an explicit request.

## Common tasks
- **Run the refresh:** `npm install && npx playwright install --with-deps chromium && npm run scrape`
- **Preview:** `npm run serve` (a plain file:// open also works via the inline fallback).
- **A scraper stopped matching:** open `src/sources/<name>.js`. Each renders the
  page in headless Chromium (`_browser.js`) and returns canonical->value. Names
  are normalized through `src/aliases.js`; when a real company isn't matching,
  add a variant there (run logs print unmatched rows).
- **Add a verified filing (manual, primary source only):** set the company's
  `filing` to `{date:"Mon DD, YYYY", src:"<outlet/company>", val:"$NNB", url:"<link>"}`.
  Use a company press release or a tier-1 report — never invent a source. If a
  company has no priced round (secondary/stake-sale/PE), leave `filing` absent.
- **Refresh the Claude anchor (manual):** update `claude` + `claudeSrc` per the
  same reasoning used elsewhere (prefer the most recent *priced* round; note
  secondaries separately). Then re-run `npm run scrape` to recompute the median.

## Known gotchas
- Scrapers run from a datacenter IP; **Reuters, and sometimes Yahoo/Crunchbase,
  block this.** That's expected — the fail-safe keeps yesterday's value and the
  run log lists which sources returned nothing. Don't "fix" it by disabling the
  fail-safe.
- `web/index.html` fetches `companies.json` relatively; opening the raw file
  shows the inline fallback data, while the served site shows the live JSON.
- Top-level JSON is `{ updated, companies: [...] }`. `run.js` and the page both
  expect that shape.

## Deploy reminder
Public GitHub repo + Pages source = "GitHub Actions". The workflow already
commits `data/` + `web/` and runs `deploy-pages`. Cron is 11:00 UTC.
