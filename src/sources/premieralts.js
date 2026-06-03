import { withPage, parseValuation, sane } from "./_browser.js";
import { canonicalize } from "../aliases.js";

const URL = "https://www.premieralts.com/most-valuable-private-companies";

// Table columns: Rank | Company | Valuation | Total Funding | Industry
export async function scrapePremierAlts() {
  return withPage(async (page) => {
    // domcontentloaded (not networkidle): trackers/widgets keep the network busy,
    // so networkidle intermittently times out. The waitForSelector below already
    // gates on the table being present.
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("table tbody tr", { timeout: 30000 }).catch(() => {});
    const rows = await page.$$eval("table tbody tr", (trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll("td, th")).map((c) => c.innerText.trim()))
    );
    const out = {};
    for (const cells of rows) {
      const name = cells[1];
      const v = parseValuation(cells[2]);
      const canon = canonicalize(name);
      if (canon && sane(v) && out[canon] == null) out[canon] = v;
    }
    return out;
  });
}
