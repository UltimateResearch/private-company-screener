import { withPage, parseValuation, sane } from "./_browser.js";
import { canonicalize } from "../aliases.js";

const URL = "https://www.cbinsights.com/research-unicorn-companies/";

// Table columns: Company | Valuation ($B) | Date Joined | Country | City | Industry | Select Investors
// CB Insights lists last-disclosed PRICED rounds, so it lags fast movers — that lag
// shows up (correctly) as a low outlier in the dispersion column rather than being hidden.
export async function scrapeCBInsights() {
  return withPage(async (page) => {
    await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("table tbody tr", { timeout: 30000 }).catch(() => {});
    const rows = await page.$$eval("table tbody tr", (trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((c) => c.innerText.trim()))
    );
    const out = {};
    for (const cells of rows) {
      const canon = canonicalize(cells[0]);
      const v = parseValuation(cells[1]);
      if (canon && sane(v) && out[canon] == null) out[canon] = v;
    }
    return out;
  });
}
