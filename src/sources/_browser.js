import { chromium } from "playwright";

const HEADLESS = process.env.HEADLESS !== "false";

// Launch a fresh, cache-disabled browser context that RENDERS JS (beats the
// stale-snapshot problem you get from plain HTTP fetches).
export async function withPage(fn) {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    bypassCSP: true,
    extraHTTPHeaders: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
  });
  // Hard-disable HTTP cache for every request in this context.
  await context.route("**/*", (route) => {
    const headers = { ...route.request().headers(), "cache-control": "no-cache" };
    route.continue({ headers });
  });
  const page = await context.newPage();
  try {
    return await fn(page, context);
  } finally {
    await browser.close();
  }
}

// "$1.6T" -> 1600 ; "$480B" -> 480 ; "$1,750B" -> 1750 ; "380.005B" -> 380.005
export function parseValuation(text) {
  if (!text) return null;
  const t = String(text).replace(/[$,\s]/g, "");
  const m = t.match(/([\d.]+)\s*(T|B|M)?/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  const unit = (m[2] || "B").toUpperCase();
  if (unit === "T") v *= 1000;
  if (unit === "M") v /= 1000;
  return Number.isFinite(v) ? v : null;
}

// Optional sanity bound: reject obviously broken values (e.g. a $0 or $99,999B).
export function sane(v) {
  return v != null && v > 0.5 && v < 5000;
}
