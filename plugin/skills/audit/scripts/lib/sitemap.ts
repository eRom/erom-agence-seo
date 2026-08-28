import type { FetchResult, SitemapUrlStats } from "./types";

export type Fetcher = (url: string) => Promise<FetchResult>;
export type SitemapKind = "index" | "urlset" | "unknown";

export function parseSitemap(xml: string): { kind: SitemapKind; locs: string[] } {
  const kind: SitemapKind = /<sitemapindex[\s>]/i.test(xml) ? "index" : /<urlset[\s>]/i.test(xml) ? "urlset" : "unknown";
  const locs = kind === "unknown" ? [] : [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  return { kind, locs };
}

/** Un sitemap peut être servi compressé (.gz, content-type gzip, ou octets magiques 1f 8b). Le protocole impose UTF-8. */
export function decodeSitemapBody(body: Uint8Array, url: string, contentType: string | null): string {
  const magic = body.length > 2 && body[0] === 0x1f && body[1] === 0x8b;
  const gz = magic || url.endsWith(".gz") || /gzip/i.test(contentType ?? "");
  return new TextDecoder().decode(gz ? Bun.gunzipSync(body) : body);
}

/** Ordre de recherche : ce que robots.txt déclare (peut être sur un autre hôte), puis /sitemap.xml, puis /sitemap_index.xml. */
export function sitemapCandidates(fromRobots: string[], origin: string): string[] {
  const out: string[] = [];
  for (const u of [...fromRobots, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]) if (!out.includes(u)) out.push(u);
  return out;
}

/** Retire un seul « www. » de tête, casse ignorée. */
function bareHost(host: string): string {
  const h = host.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

/** Hôte comparable d'une URL, null si elle n'est pas analysable. Le port fait partie de l'identité du site. */
function comparableHost(u: string): string | null {
  try { return bareHost(new URL(u).host); } catch { return null; }
}

/**
 * Même site : même hôte à un « www. » près, schéma indifférent. Un sitemap qui liste ses URLs sur l'apex alors que le
 * site est servi en www (ou l'inverse) reste chez lui ; c'est un montage courant, l'exclure vide l'audit en silence.
 * Les URLs ne sont jamais réécrites : la chaîne de redirection collectée reste la preuve du montage réel.
 */
export function sameSite(u: string, origin: string): boolean {
  const a = comparableHost(u);
  const b = comparableHost(origin);
  return a !== null && b !== null && a === b;
}

/** Clé d'unicité d'une page, sans schéma ni « www. » : la home listée en apex et servie en www est la même page. */
export function pageKey(u: string): string {
  try { const p = new URL(u); return `${bareHost(p.host)}${p.pathname}${p.search}`; } catch { return u; }
}

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
  opts: { maxUrls: number; origin: string; maxChildren?: number },
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
  const take = (locs: string[]) => {
    for (const u of locs) {
      stats.listed++;
      if (!sameSite(u, opts.origin)) { skip(u); continue; }
      const key = pageKey(u);
      if (seen.has(key) || urls.length >= opts.maxUrls) continue;
      seen.add(key);
      urls.push(u);
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
        take((await read(child)).locs);
      }
      return { fetched, urls, stats };
    }
  }
  return { fetched, urls, stats };
}
