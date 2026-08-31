import type { FetchResult, SitemapUrlStats } from "./types";
import { sameSite, pageKey, rewriteToOrigin } from "../../../../lib/url";
import { parseSitemap, decodeSitemapBody, type SitemapKind } from "../../../../lib/sitemap";

// Réexport : les appelants de l'audit gardent leur import inchangé, la définition a déménagé dans le commun.
export { parseSitemap, decodeSitemapBody, sitemapCandidates } from "../../../../lib/sitemap";
export type { SitemapKind } from "../../../../lib/sitemap";

export type Fetcher = (url: string) => Promise<FetchResult>;

/** Avertissement lisible quand des <loc> ont été écartées, null s'il n'y a rien à signaler. */
export function formatSkippedWarning(stats: SitemapUrlStats): string | null {
  if (stats.skipped.length === 0) return null;
  const total = stats.skipped.reduce((n, s) => n + s.count, 0);
  const detail = stats.skipped.map((s) => `${s.host} (${s.count})`).join(", ");
  return `attention : ${total} URL(s) du sitemap ignorées, hors site : ${detail}`;
}

export async function collectSitemapUrls(
  candidates: string[],
  fetcher: Fetcher,
  opts: { maxUrls: number; origin: string; maxChildren?: number; rewriteTo?: string },
): Promise<{ fetched: { url: string; result: FetchResult; kind: SitemapKind; text: string }[]; urls: string[]; stats: SitemapUrlStats }> {
  const maxChildren = opts.maxChildren ?? 3;
  const fetched: { url: string; result: FetchResult; kind: SitemapKind; text: string }[] = [];
  const urls: string[] = [];
  const stats: SitemapUrlStats = { listed: 0, kept: 0, skipped: [] };
  const seen = new Set<string>();
  const skip = (u: string) => {
    let host: string;
    try { host = new URL(u).host.toLowerCase(); } catch { host = "(url invalide)"; }
    const e = stats.skipped.find((s) => s.host === host);
    if (e) e.count++; else stats.skipped.push({ host, count: 1 });
  };
  const rewrite = (u: string): string => {
    if (!opts.rewriteTo) return u;
    const r = rewriteToOrigin(u, opts.rewriteTo);
    if (r === null || r === u) return u;
    let host: string;
    try { host = new URL(u).host.toLowerCase(); } catch { return u; }
    if (host !== new URL(opts.rewriteTo).host.toLowerCase()) { stats.rewrittenFrom ??= []; if (!stats.rewrittenFrom.includes(host)) stats.rewrittenFrom.push(host); }
    return r;
  };
  const take = (locs: string[]) => {
    for (const u of locs) {
      stats.listed++;
      const loc = rewrite(u);
      if (!sameSite(loc, opts.origin)) { skip(u); continue; }
      const key = pageKey(loc);
      if (seen.has(key) || urls.length >= opts.maxUrls) continue;
      seen.add(key);
      urls.push(loc);
      stats.kept++;
    }
  };
  const read = async (url: string) => {
    const result = await fetcher(url);
    const text = result.status === 200 ? decodeSitemapBody(result.body, result.final, result.headers["content-type"] ?? null) : "";
    const parsed = result.status === 200 ? parseSitemap(text) : { kind: "unknown" as SitemapKind, locs: [] };
    fetched.push({ url, result, kind: parsed.kind, text });
    return parsed;
  };
  for (const cand of candidates) {
    const parsed = await read(cand);
    if (parsed.kind === "urlset") { take(parsed.locs); return { fetched, urls, stats }; }
    if (parsed.kind === "index") {
      for (const child of parsed.locs.slice(0, maxChildren)) {
        if (urls.length >= opts.maxUrls) break;
        take((await read(rewrite(child))).locs);
      }
      return { fetched, urls, stats };
    }
  }
  return { fetched, urls, stats };
}
