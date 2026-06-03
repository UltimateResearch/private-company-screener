import { withPage, parseValuation, sane } from "./_browser.js";
import { canonicalize } from "../aliases.js";

const URL = "https://finance.yahoo.com/markets/private-companies/highest-valuation/";

// Yahoo's screener is JS-rendered and the table is populated from an internal
// JSON/XHR call (Forge-powered). A plain fetch returns an error page or a
// cached shell — that's the bug that showed Anthropic at $380B. We render the
// page in a real browser AND capture the JSON response the page itself loads.
export async function scrapeYahoo() {
  return withPage(async (page) => {
    const out = {};

    // 1) Capture the underlying data response(s).
    page.on("response", async (resp) => {
      const u = resp.url();
      if (!/visualization|screener|quote|private/i.test(u)) return;
      const ct = resp.headers()["content-type"] || "";
      if (!ct.includes("json")) return;
      try {
        const json = await resp.json();
        harvest(json, out);
      } catch { /* not the payload we want */ }
    });

    // domcontentloaded (not networkidle): Yahoo's ads/trackers keep the network
    // busy indefinitely, so networkidle times out before our harvest ever runs.
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    // Wait for the screener table to render (it's XHR-populated), then give it a beat.
    await page.waitForSelector("table tbody tr", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2500);

    // 2) DOM fallback: read the rendered table rows.
    try {
      const rows = await page.$$eval("table tbody tr", (trs) =>
        trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim()))
      );
      for (const cells of rows) {
        // Columns: Symbol | Company | Price | 52wk | Estimated Valuation | ...
        const name = cells[1];
        const valCell = cells[4];
        const canon = canonicalize(name);
        const v = parseValuation(valCell);
        if (canon && sane(v) && out[canon] == null) out[canon] = v;
      }
    } catch { /* table shape changed — rely on XHR harvest */ }

    return out;
  });
}

// Walk an arbitrary JSON blob looking for {name/shortName, estimatedValuation/marketCap}.
function harvest(node, out) {
  if (!node || typeof node !== "object") return;
  const name = node.shortName || node.longName || node.companyName || node.name;
  const valRaw =
    node.estimatedValuation?.raw ?? node.estimatedValuation ??
    node.valuation?.raw ?? node.valuation ?? node.marketCap?.raw;
  if (name && valRaw != null) {
    const canon = canonicalize(name);
    // Yahoo gives raw dollars; convert to $B.
    let v = typeof valRaw === "number" ? valRaw / 1e9 : parseValuation(valRaw);
    if (canon && sane(v)) out[canon] = +v.toFixed(3);
  }
  for (const k in node) harvest(node[k], out);
}
