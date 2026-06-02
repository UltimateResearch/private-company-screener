// Reconciliation for the FLAT schema the screener renders (y/p/m/c/cbi/claude).
// Rules:
//   - consensus / low / high / dispersion come from the FIVE LIVE sources only:
//     y(ahoo), p(remierAlts), m(ultiples), c(runchbase), cbi(=CB Insights).
//   - Claude is shown ALONGSIDE as an independent anchor and is NEVER folded in.
//   - FAIL-SAFE: a source that returns nothing this run keeps its prior value
//     (never blank good data); a row with 0 live sources keeps its prior consensus.
//   - We never touch claude, claudeSrc, filing, valLabel, tradeLabel, notes, round, no.

const LIVE = ["y", "p", "m", "c", "cbi"];
// Map scraper names -> the flat field letters the screener uses.
const FIELD = { yahoo: "y", premieralts: "p", multiples: "m", crunchbase: "c", cbinsights: "cbi" };

export function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  if (!n) return null;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

export function reconcile(dataset, scraped, now = new Date().toISOString()) {
  const changes = [], flags = [], noLive = [];

  for (const co of dataset.companies) {
    co.fetched_at = co.fetched_at || {};
    for (const [src, field] of Object.entries(FIELD)) {
      const map = scraped[src] || {};
      if (Object.prototype.hasOwnProperty.call(map, co.company)) {
        const next = map[co.company], prev = co[field] ?? null;
        if (prev !== next) changes.push({ company: co.company, source: src, from: prev, to: next });
        co[field] = next;
        co.fetched_at[field] = now;
      }
      // else: keep prior co[field] (transient miss / blocked source) — fail-safe.
    }

    const vals = LIVE.map((k) => co[k]).filter((v) => v != null);
    if (vals.length) {
      co.consensus = median(vals);
      co.low = Math.min(...vals);
      co.high = Math.max(...vals);
      co.dispersion = co.consensus ? +(((co.high - co.low) / co.consensus) * 100).toFixed(1) : 0;
      co.cnt = vals.length;
      if (co.dispersion >= 40 && vals.length >= 2) flags.push({ company: co.company, dispersion: co.dispersion, vals });
    } else {
      co.cnt = 0;            // no live sources this run
      noLive.push(co.company); // consensus/low/high left as-is (fail-safe)
    }
  }

  dataset.updated = now.slice(0, 10);
  return { dataset, changes, flags, noLive };
}
