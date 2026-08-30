// Site repris (D28) : chaque URL de l'ancien sitemap doit finir en 200 sur le nouveau site après des 301 ou 308 seulement.
// Google : « The 301 and 308 status codes mean that a page has permanently moved » ; 302, 303, 307 sont temporaires.
import type { FetchResult } from "../../../../skills/audit/scripts/lib/types";
import { sameSite } from "../../../../lib/url";
import type { RedirectCheck } from "./checklist";

export type ChainFetcher = (url: string) => Promise<FetchResult>;
const PERMANENT = new Set([301, 308]);

/** Verdict d'une chaîne de redirections collectée par fetchChain. */
export function judgeChain(r: FetchResult, siteOrigin: string): RedirectCheck {
  const hops = r.chain.map((h) => h.status);
  const detail = hops.join(" → ");
  if (r.status === 0) return { url: r.requested, ok: false, detail: r.error ?? "injoignable" };
  const redirects = r.chain.slice(0, -1);
  if (redirects.length === 0) return { url: r.requested, ok: false, detail: `${r.status} sans redirection` };
  const temp = redirects.find((h) => !PERMANENT.has(h.status));
  if (temp) return { url: r.requested, ok: false, detail: `${detail} (${temp.status} est temporaire, Google ne transfère pas)` };
  if (r.status !== 200) return { url: r.requested, ok: false, detail };
  if (!sameSite(r.final, siteOrigin)) return { url: r.requested, ok: false, detail: `${detail} vers ${r.final}, hors site` };
  return { url: r.requested, ok: true, detail };
}

/** Suit chaque URL de l'ancien sitemap, dans l'ordre, sans parallélisme (on ne bombarde pas l'ancien hôte). */
export async function checkRedirections(locs: string[], siteOrigin: string, f: ChainFetcher): Promise<RedirectCheck[]> {
  const out: RedirectCheck[] = [];
  for (const u of locs) out.push(judgeChain(await f(u), siteOrigin));
  return out;
}
