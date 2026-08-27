import type { FetchResult } from "./types";

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

export async function collectSitemapUrls(
  candidates: string[],
  fetcher: Fetcher,
  opts: { maxUrls: number; origin: string; maxChildren?: number },
): Promise<{ fetched: { url: string; result: FetchResult; kind: SitemapKind; text: string }[]; urls: string[] }> {
  const maxChildren = opts.maxChildren ?? 3;
  const fetched: { url: string; result: FetchResult; kind: SitemapKind; text: string }[] = [];
  const urls: string[] = [];
  const sameOrigin = (u: string) => { try { return new URL(u).origin === opts.origin; } catch { return false; } };
  const take = (locs: string[]) => { for (const u of locs) if (sameOrigin(u) && !urls.includes(u) && urls.length < opts.maxUrls) urls.push(u); };
  const read = async (url: string) => {
    const result = await fetcher(url);
    const text = result.status === 200 ? decodeSitemapBody(result.body, result.final, result.headers["content-type"] ?? null) : "";
    const parsed = result.status === 200 ? parseSitemap(text) : { kind: "unknown" as SitemapKind, locs: [] };
    fetched.push({ url, result, kind: parsed.kind, text });
    return parsed;
  };
  for (const cand of candidates) {
    const parsed = await read(cand);
    if (parsed.kind === "urlset") { take(parsed.locs); return { fetched, urls }; }
    if (parsed.kind === "index") {
      for (const child of parsed.locs.slice(0, maxChildren)) {
        if (urls.length >= opts.maxUrls) break;
        take((await read(child)).locs);
      }
      return { fetched, urls };
    }
  }
  return { fetched, urls };
}
