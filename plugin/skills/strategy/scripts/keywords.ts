#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { assertNoSecret, bingSummary, entryFor, keywordSlug, parseBingStats, parseWikimediaMonthly, safeArticleFilename, wikiSummary, wikimediaRange, type KeywordEntry, type WikiSummary } from "./lib/keywords";

export const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const WIKIMEDIA_BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user";
const UA = "erom-seo-strategy/0.1 (+https://github.com/eRom/erom-agence-seo)";

export type Fetcher = (url: string, headers?: Record<string, string>) => Promise<{ status: number; text: string }>;
export type KeywordsOptions = {
  keywords: string[]; wiki?: Record<string, string>; country?: string; language?: string; key: string | null;
  out?: string; fetcher?: Fetcher; now?: () => Date; delayMs?: number; contact?: string | null;
};

const defaultFetcher: Fetcher = async (url, headers = {}) => {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    // Ne jamais laisser passer l'objet Error brut : sur un échec réseau, Bun/undici peut attacher l'URL
    // complète (donc la clé apikey) à des propriétés autres que .message. On ne relaie que .message.
    throw new Error(`Bing ou Wikimedia injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }
};

/** Réserve seo/strategy/<date>/ (ou -2, -3…) sous le répertoire courant, même mécanique atomique que collect.ts. */
async function reserveOutDir(date: string): Promise<string> {
  const parent = "seo/strategy";
  await mkdir(parent, { recursive: true });
  const base = `${parent}/${date}`;
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    try { await mkdir(candidate); return candidate; } catch (e) { if ((e as NodeJS.ErrnoException).code === "EEXIST") continue; throw e; }
  }
}

export async function runKeywords(o: KeywordsOptions): Promise<{ out: string; entries: KeywordEntry[] }> {
  const now = o.now ?? (() => new Date());
  const fetcher = o.fetcher ?? defaultFetcher;
  const country = (o.country ?? "FR").toLowerCase();
  const language = o.language ?? "fr-FR";
  const delay = o.delayMs ?? 500;
  const key = o.key;
  const out = o.out ?? (await reserveOutDir(now().toISOString().slice(0, 10)));
  await mkdir(join(out, "raw"), { recursive: true });
  await mkdir(join(out, "derived"), { recursive: true });
  const files: string[] = [];
  const warnings: string[] = [];
  const write = async (rel: string, content: string) => { assertNoSecret(content, key); await Bun.write(join(out, rel), content); files.push(rel); };

  const entries: KeywordEntry[] = [];
  for (const keyword of o.keywords) {
    const fetchedAt = now().toISOString();
    let bing = null, error: string | null = null;
    if (key) {
      const q = new URLSearchParams({ q: keyword, country, language, apikey: key });
      const r = await fetcher(`${BING_API_BASE}/GetKeywordStats?${q}`);
      if (r.status === 400 && /InvalidApiKey/.test(r.text)) throw new Error("clé refusée par Bing (InvalidApiKey) : régénérer la clé dans Bing Webmaster Tools, Settings, API Access");
      if (r.status !== 200) error = `HTTP ${r.status}`;
      else {
        await write(`raw/bing-keywordstats-${keywordSlug(keyword)}.json`, r.text);
        try { bing = bingSummary(parseBingStats(JSON.parse(r.text)), fetchedAt); } catch (e) { error = e instanceof Error ? e.message : String(e); }
      }
      if (delay > 0) await Bun.sleep(delay);
    }
    let wikipedia: WikiSummary | null = null;
    const article = o.wiki?.[keyword];
    if (article) {
      const { start, end } = wikimediaRange(now());
      const ua = o.contact ? `${UA} (contact: ${o.contact})` : UA;
      const r = await fetcher(`${WIKIMEDIA_BASE}/${encodeURIComponent(article)}/monthly/${start}/${end}`, { "user-agent": ua, accept: "application/json" });
      if (r.status === 200) {
        await write(`raw/wikimedia-${safeArticleFilename(article)}.json`, r.text);
        try { wikipedia = wikiSummary(article, parseWikimediaMonthly(JSON.parse(r.text)), fetchedAt); } catch (e) { warnings.push(`${keyword} : Wikimedia illisible, ${e instanceof Error ? e.message : String(e)}`); }
      } else warnings.push(`${keyword} : Wikimedia HTTP ${r.status} sur ${article}`);
    }
    entries.push(entryFor(keyword, bing, Boolean(key), error, wikipedia));
  }
  await write("derived/keywords.json", JSON.stringify(entries, null, 2));
  await write("manifest.json", JSON.stringify({ date: now().toISOString(), country, language, bingKeyPresent: Boolean(key), endpoint: BING_API_BASE, files, warnings }, null, 2));
  return { out, entries };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const wiki: Record<string, string> = {};
  args.forEach((a, i) => { if (a === "--wiki" && args[i + 1]) { const [k, v] = args[i + 1].split("="); if (k && v) wiki[k] = v; } });
  const skip = new Set(["--out", "--country", "--language", "--wiki"]);
  const keywords = args.filter((a, i) => !a.startsWith("--") && !skip.has(args[i - 1] ?? ""));
  if (keywords.length === 0) { console.error('usage : bun keywords.ts [--out <dossier>] [--country FR] [--language fr-FR] [--wiki "<mot-clé>=<Titre_article>"]... <mot-clé>...'); process.exit(2); }
  const key = process.env.BING_WMT_API_KEY ?? null;
  if (!key) console.error("BING_WMT_API_KEY absente : Bing non interrogé, les mots-clés seront « non interrogé (clé absente) »");
  try {
    const r = await runKeywords({ keywords, wiki, country: opt("--country"), language: opt("--language"), key, out: opt("--out"), contact: process.env.EROM_SEO_CONTACT ?? null });
    console.log(`dossier : ${r.out}`);
    for (const e of r.entries) console.log(`${e.keyword} : ${e.statut}${e.bing ? `, Bing ${e.bing.last} / semaine, ${e.bing.total} sur ${e.bing.weeks} semaines` : ""}${e.wikipedia ? `, Wikipédia ${e.wikipedia.average} vues / mois` : ""}`);
  } catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exit(2); }
}
