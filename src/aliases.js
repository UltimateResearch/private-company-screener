// Maps the many name variants each source uses to ONE canonical company name.
// When a scraper finds a row, we normalize the name and look it up here.
// Add variants as you discover them (the reconcile step logs unmatched names).

export const ALIASES = {
  // canonical            : [variants, lowercased, punctuation-stripped]
  "SpaceX":               ["spacex", "space exploration technologies"],
  "OpenAI":               ["openai"],
  "Anthropic":            ["anthropic", "anthropic pbc"],
  "ByteDance":            ["bytedance"],
  "Stripe":               ["stripe"],
  "Databricks":           ["databricks"],
  "Waymo":                ["waymo"],
  "Reliance Retail":      ["reliance retail"],
  "Ant Group":            ["ant group", "ant financial"],
  "Anduril":              ["anduril", "anduril industries"],
  "Revolut":              ["revolut"],
  "Shein":                ["shein"],
  "Scale AI":             ["scale ai", "scale"],
  "Canva":                ["canva"],
  "Checkout.com":         ["checkout.com", "checkoutcom", "checkout com"],
  "Figure":               ["figure", "figure ai"],
  "Ramp":                 ["ramp", "ramp financial"],
  "Safe Superintelligence":["safe superintelligence", "ssi"],
  "Thinking Machines Lab":["thinking machines lab", "thinking machines"],
  "Alibaba Local Services":["alibaba local services", "alibaba bendi shenghuo fuwu gongsi", "alibaba bendi"],
  "VAST Data":            ["vast data", "vast"],
  "Anysphere (Cursor)":   ["anysphere", "cursor", "cursor software development applications"],
  "Fanatics":             ["fanatics"],
  "Yangtze Memory":       ["yangtze memory", "yangtze memory technologies", "ymtc"],
  "Epic Games":           ["epic games"],
  "Genesys":              ["genesys"],
  "Perplexity":           ["perplexity", "perplexity ai"],
  "FNZ":                  ["fnz", "fnz group"],
  "Ripple":               ["ripple", "ripple labs"],
  "ChangXin Memory":      ["changxin memory", "changxin memory technologies", "cxmt"],
  "Miro":                 ["miro", "realtimeboard"],
  "Kalshi":               ["kalshi"],
  "Deel":                 ["deel"],
  "Zelis Healthcare":     ["zelis healthcare", "zelis"],
  "Xiaohongshu (RedNote)":["xiaohongshu", "rednote", "rednote (xiaohongshu)"],
  "Rippling":             ["rippling"],
  "IFS":                  ["ifs", "ifs world operations"],
  "Trendyol":             ["trendyol", "trendyol group"],
  "Yuanfudao":            ["yuanfudao"],
  "Crusoe Energy":        ["crusoe energy", "crusoe energy systems", "crusoe"],
  "Kraken":               ["kraken"],
  "Discord":              ["discord"],
  "DJI":                  ["dji"],
  "Neuralink":            ["neuralink"],
  "Skild AI":             ["skild ai", "skild"],
  "Polymarket":           ["polymarket"],
  "Shield AI":            ["shield ai"],
  "Moonshot AI":          ["moonshot ai", "moonshot"]
};

const LOOKUP = (() => {
  const m = new Map();
  for (const [canonical, variants] of Object.entries(ALIASES)) {
    m.set(norm(canonical), canonical);
    for (const v of variants) m.set(norm(v), canonical);
  }
  return m;
})();

export function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")     // drop parentheticals
    .replace(/[^a-z0-9]+/g, " ")  // strip punctuation
    .trim();
}

// Returns canonical name or null if this row isn't one of our tracked companies.
export function canonicalize(rawName) {
  return LOOKUP.get(norm(rawName)) || null;
}
