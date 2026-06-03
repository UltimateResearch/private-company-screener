import { withPage, parseValuation, sane } from "./_browser.js";
import { canonicalize } from "../aliases.js";

const URL = "https://news.crunchbase.com/unicorn-company-list/";

// Table columns: Company | Post Money Value | Total Equity Funding | Lead Investors | Country | Continent
// The board is a LIVE data widget even though the visible "Last updated" label
// can lag — render it and read the rows, don't trust the label.
// The top 1-2 rows sometimes render with a blank name (logo-only); those are
// caught by the other sources, so blanks are simply skipped.
export async function scrapeCrunchbase() {
  return withPage(async (page) => {
    // domcontentloaded (not networkidle): the page's live widgets keep the
    // network busy, so networkidle times out before the table is read.
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("table tbody tr", { timeout: 30000 }).catch(() => {});
    const rows = await page.$$eval("table tbody tr", (trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((c) => c.innerText.trim()))
    );
    const out = {};
    for (const cells of rows) {
      const name = cells[0];
      const v = parseValuation(cells[1]);
      const canon = canonicalize(name);
      if (canon && sane(v) && out[canon] == null) out[canon] = v;
    }
    return out;
  });
}
