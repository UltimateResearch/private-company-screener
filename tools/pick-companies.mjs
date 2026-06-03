// Print a JSON array of {company,sector,country} for companies ranked START..END
// by consensus (1-based, inclusive). Feed the output to the curated-refresh
// workflow's `args`.  Usage: node tools/pick-companies.mjs 1 50
import { readFileSync } from "fs";
const [start = 1, end = 50] = process.argv.slice(2).map(Number);
const d = JSON.parse(readFileSync("data/companies.json", "utf8"));
const top = [...d.companies].sort((a, b) => (b.consensus ?? -1) - (a.consensus ?? -1)).slice(start - 1, end);
process.stdout.write(JSON.stringify(top.map(c => ({ company: c.company, sector: c.sector, country: c.country }))));
