# Private Company Screener — daily refresh

A static, Finviz-styled screener of the most valuable private companies, with a
**consensus median** reconciled across five public sources, an independent
**Claude** anchor column, and a verified **Latest Filing / Announcement** column.

Refreshes itself once a day, free, via GitHub Actions — no API key, no server.

## How it works
1. `daily.yml` runs `node src/run.js` on a cron.
2. Each source scraper renders its page in headless Chromium and returns
   `{ CanonicalCompany: valuationInBillions }`.
3. `reconcile.js` writes those into each company's `y/p/m/c/cbi` fields,
   recomputes `consensus` (median of the **five live sources only**), and
   timestamps each cell. **Claude is never folded into the median.**
4. The updated `data/companies.json` is copied to `web/companies.json`,
   committed, and `web/` is deployed to GitHub Pages.
5. `web/index.html` fetches `companies.json` at load (with an inline fallback,
   so it still renders if opened directly).

## Run it locally
```bash
npm install
npx playwright install --with-deps chromium
npm run scrape      # scrape + reconcile -> data/ + web/
npm run serve       # preview the site at the printed localhost URL
```

## Deploy (free)
1. Push this repo to GitHub (public repo = free Actions minutes).
2. Settings -> Pages -> Source: **GitHub Actions**.
3. Done. The cron in `.github/workflows/daily.yml` (11:00 UTC) refreshes daily;
   the **Run workflow** button triggers it on demand.

## What does NOT auto-update
- The **Claude** column and **Latest Filing / Announcement** column are curated,
  not scraped. They change only when you refresh them by hand (see CLAUDE.md).
