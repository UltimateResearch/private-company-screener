// Apply curated-refresh workflow results to data/companies.json (+ web mirror).
// Usage: node tools/apply-curated.mjs <path-to-workflow-result.json>
// Merge policy (conservative):
//   - high/medium confidence: set claude, claudeSrc, tradeLabel, tradeN; set
//     filing only when filingVerified && filing present, else remove it.
//   - low confidence: skip (left unchanged) and report — don't publish shaky data.
// Matches results to companies by name (order-independent; handles "(parenthetical)").
// Liveness-checks every filing URL it sets and flags hard failures (404/410/5xx/network).
import { readFileSync, writeFileSync, copyFileSync } from "fs";

const RESULT_PATH = process.argv[2];
if (!RESULT_PATH) { console.error("usage: node tools/apply-curated.mjs <result.json>"); process.exit(2); }

const DATA = "data/companies.json";
const raw = JSON.parse(readFileSync(RESULT_PATH, "utf8"));
const results = raw.result?.results || raw.results || (Array.isArray(raw) ? raw : []);
if (!results.length) { console.error("no results found in", RESULT_PATH); process.exit(1); }

const dataset = JSON.parse(readFileSync(DATA, "utf8"));
const companies = dataset.companies;
const norm = s => (s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
function findCo(rname) {
  const rn = norm(rname);
  let m = companies.filter(c => norm(c.company) === rn);
  if (m.length === 1) return m[0];
  m = companies.filter(c => rn.startsWith(norm(c.company)));
  if (m.length >= 1) { m.sort((a, b) => norm(b.company).length - norm(a.company).length); return m[0]; }
  return null;
}

const applied = [], lowConf = [], unmatched = [], setUrls = [];
for (const r of results) {
  const co = findCo(r.company);
  if (!co) { unmatched.push(r.company); continue; }
  if (r.confidence === "low") { lowConf.push({ company: co.company, cur: co.claude, found: r.claude, src: r.claudeSrc }); continue; }
  const before = { claude: co.claude, filing: !!co.filing };
  if (typeof r.claude === "number") co.claude = r.claude;
  co.claudeSrc = r.claudeSrc;
  co.tradeLabel = r.tradeLabel;
  co.tradeN = r.tradeN;
  if (r.filingVerified && r.filing) { co.filing = r.filing; setUrls.push([co.company, r.filing.url]); }
  else delete co.filing;
  applied.push({ company: co.company, conf: r.confidence, claude: `${before.claude}->${co.claude}`, filing: before.filing ? (co.filing ? "upd" : "REMOVED") : (co.filing ? "ADD" : "—") });
}

writeFileSync(DATA, JSON.stringify(dataset, null, 2));
copyFileSync(DATA, "web/companies.json");
console.log(`applied ${applied.length} | low-conf skipped ${lowConf.length} | unmatched ${unmatched.length} | filings now ${companies.filter(c => c.filing).length}/100`);
if (unmatched.length) console.log("UNMATCHED:", unmatched.join("; "));
if (lowConf.length) console.log("LOW-CONF (unchanged):", lowConf.map(f => `${f.company}(cur ${f.cur}/found ${f.found})`).join("; "));

// liveness-check the filing URLs set this run
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const dead = [];
await Promise.all(setUrls.map(async ([name, url]) => {
  try { const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15000) });
    if (res.status === 404 || res.status === 410 || res.status >= 500) dead.push(`${name}: HTTP ${res.status} ${url}`);
  } catch (e) { dead.push(`${name}: ${e.name} ${url}`); }
}));
console.log(dead.length ? `\n!! DEAD FILING URLS (fix before publishing):\n  ${dead.join("\n  ")}` : "\nall filing URLs resolve");
