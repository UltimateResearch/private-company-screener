import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { reconcile } from "./reconcile.js";
import { scrapeYahoo } from "./sources/yahoo.js";
import { scrapePremierAlts } from "./sources/premieralts.js";
import { scrapeMultiples } from "./sources/multiples.js";
import { scrapeCrunchbase } from "./sources/crunchbase.js";
import { scrapeCBInsights } from "./sources/cbinsights.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const DATA = join(ROOT, "data", "companies.json");
const HISTORY = join(ROOT, "data", "history.json");
const WEBDATA = join(ROOT, "web", "companies.json");

const SCRAPERS = {
  yahoo: scrapeYahoo, premieralts: scrapePremierAlts, multiples: scrapeMultiples,
  crunchbase: scrapeCrunchbase, cbinsights: scrapeCBInsights
};

async function runOne(name, fn) {
  try {
    const map = await fn();
    console.log(`  ${name.padEnd(12)} ${Object.keys(map).length} matched`);
    return map;
  } catch (e) {
    console.error(`  ${name.padEnd(12)} FAILED: ${e.message} (keeping prior values)`);
    return {}; // failed/blocked source -> empty map -> reconcile keeps prior values
  }
}

(async () => {
  const dataset = JSON.parse(readFileSync(DATA, "utf8"));
  console.log("Scraping 5 live sources (Claude column untouched)…");
  const scraped = {};
  for (const [name, fn] of Object.entries(SCRAPERS)) scraped[name] = await runOne(name, fn);

  const { changes, flags, noLive } = reconcile(dataset, scraped);

  mkdirSync(join(ROOT, "web"), { recursive: true });
  writeFileSync(DATA, JSON.stringify(dataset, null, 2));
  copyFileSync(DATA, WEBDATA);

  const history = existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, "utf8")) : [];
  history.push({ date: dataset.updated, changes, flags, noLive });
  writeFileSync(HISTORY, JSON.stringify(history, null, 2));

  console.log(`\nDone. ${changes.length} cell change(s), ${flags.length} high-dispersion flag(s).`);
  for (const c of changes) console.log(`  ${c.company} · ${c.source}: ${c.from} -> ${c.to}`);
  if (flags.length) console.log("Eyeball (>=40% spread):", flags.map(f => `${f.company} ${f.dispersion}%`).join(", "));
  if (noLive.length) console.log("No live sources this run (kept prior):", noLive.join(", "));
})();
