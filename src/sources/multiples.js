import { withPage, parseValuation, sane } from "./_browser.js";
import { canonicalize } from "../aliases.js";

const URL = "https://multiples.vc/insights/50-most-valuable-private-companies-in-the-world";

// Table columns: # | Company | HQ | Valuation | Revenue | Revenue multiple
// Note: the list paginates (50 of 57). Click "next" if present to capture all.
export async function scrapeMultiples() {
  return withPage(async (page) => {
    // domcontentloaded (not networkidle): trackers/widgets keep the network busy,
    // so networkidle intermittently times out. The waitForSelector below already
    // gates on the table being present.
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("table tbody tr", { timeout: 30000 }).catch(() => {});

    const out = {};
    const readPage = async () => {
      const rows = await page.$$eval("table tbody tr", (trs) =>
        trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((c) => c.innerText.trim()))
      );
      for (const cells of rows) {
        const name = cells[1];
        const v = parseValuation(cells[3]);
        const canon = canonicalize(name);
        if (canon && sane(v) && out[canon] == null) out[canon] = v;
      }
    };

    await readPage();
    // Try to advance pagination (selector may need adjusting — see README).
    for (let i = 0; i < 3; i++) {
      const next = await page.$('text=Next, [aria-label="Next"], button:has-text("Next")');
      if (!next) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(1200);
      await readPage();
    }
    return out;
  });
}
