#!/usr/bin/env bun
// Vérifie que chaque citation des références est retrouvée mot pour mot sur sa page : les vérifications de l'audit
// (references/checks/) et les recettes de build (skills/build/references/).
import { readdir } from "node:fs/promises";
import { fetchChain, text } from "./lib/fetch";
import { parseChecks } from "./lib/checks";
import { normalizePage, normalizeQuote } from "./lib/normalize";
import { parseRecipes } from "../../build/scripts/lib/recipes";

const checksDir = new URL("../references/checks/", import.meta.url).pathname;
const recipesDir = new URL("../../build/references/", import.meta.url).pathname;
const only = Bun.argv.includes("--only") ? Bun.argv[Bun.argv.indexOf("--only") + 1] : null;

type Entry = { label: string; ids: string[]; sources: { url: string; quote: string; manual: boolean }[] };
const entries: Entry[] = [];
for (const f of (await readdir(checksDir)).filter((f) => f.endsWith(".md"))) for (const c of parseChecks(await Bun.file(checksDir + f).text())) entries.push({ label: c.id, ids: [c.id], sources: c.sources });
for (const f of (await readdir(recipesDir)).filter((f) => f.endsWith(".md"))) for (const r of parseRecipes(await Bun.file(recipesDir + f).text())) entries.push({ label: `build:${r.ids[0]}`, ids: r.ids, sources: r.sources });

const pages = new Map<string, { status: number; norm: string }>();
async function page(url: string) {
  if (!pages.has(url)) {
    const r = await fetchChain(url, { timeoutMs: 30000, userAgent: "Mozilla/5.0 (compatible; erom-seo-audit/0.1)" });
    pages.set(url, { status: r.status, norm: r.status === 200 ? normalizePage(text(r)) : "" });
  }
  return pages.get(url)!;
}

let fails = 0, manual = 0, ok = 0;
for (const e of entries) {
  if (only && !e.ids.includes(only)) continue;
  for (const s of e.sources) {
    if (s.manual) { manual++; console.log(`MANUEL   ${e.label}  ${s.url}`); continue; }
    const p = await page(s.url);
    if (p.status !== 200) { fails++; console.log(`HTTP ${p.status}  ${e.label}  ${s.url}`); continue; }
    if (p.norm.includes(normalizeQuote(s.quote))) { ok++; console.log(`OK       ${e.label}  ${s.quote.slice(0, 70)}`); }
    else { fails++; console.log(`ABSENTE  ${e.label}  ${s.url}\n         « ${s.quote} »`); }
  }
}
console.log(`\n${ok} citations retrouvées, ${fails} en échec, ${manual} à vérifier à la main`);
process.exit(fails ? 1 : 0);
