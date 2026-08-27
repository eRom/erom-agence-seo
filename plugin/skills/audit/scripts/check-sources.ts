#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { fetchChain, text } from "./lib/fetch";
import { parseChecks } from "./lib/checks";
import { normalizePage, normalizeQuote } from "./lib/normalize";

const dir = new URL("../references/checks/", import.meta.url).pathname;
const only = Bun.argv.includes("--only") ? Bun.argv[Bun.argv.indexOf("--only") + 1] : null;

const checks = [];
for (const f of (await readdir(dir)).filter((f) => f.endsWith(".md"))) checks.push(...parseChecks(await Bun.file(dir + f).text()));

const pages = new Map<string, { status: number; norm: string }>();
async function page(url: string) {
  if (!pages.has(url)) {
    const r = await fetchChain(url, { timeoutMs: 30000, userAgent: "Mozilla/5.0 (compatible; erom-seo-audit/0.1)" });
    pages.set(url, { status: r.status, norm: r.status === 200 ? normalizePage(text(r)) : "" });
  }
  return pages.get(url)!;
}

let fails = 0, manual = 0, ok = 0;
for (const c of checks) {
  if (only && c.id !== only) continue;
  for (const s of c.sources) {
    if (s.manual) { manual++; console.log(`MANUEL   ${c.id}  ${s.url}`); continue; }
    const p = await page(s.url);
    if (p.status !== 200) { fails++; console.log(`HTTP ${p.status}  ${c.id}  ${s.url}`); continue; }
    if (p.norm.includes(normalizeQuote(s.quote))) { ok++; console.log(`OK       ${c.id}  ${s.quote.slice(0, 70)}`); }
    else { fails++; console.log(`ABSENTE  ${c.id}  ${s.url}\n         « ${s.quote} »`); }
  }
}
console.log(`\n${ok} citations retrouvées, ${fails} en échec, ${manual} à vérifier à la main`);
process.exit(fails ? 1 : 0);
