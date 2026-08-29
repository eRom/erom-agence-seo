// plugin/skills/console/scripts/lib/bing.ts
// Lectures Bing Webmaster Tools. Aucune écriture (D30) : SubmitFeed et SubmitUrlBatch ne sont pas ici.
// BING_API_BASE et le décodage d'erreur sont recopiés depuis skills/checklist/scripts/lib/actions.ts (D34,
// décision de Romain le 29/08) : la mise en commun se fera après un inventaire de ce qui se répète vraiment.
import type { BingSite } from "./resolve";

export type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string };
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>;

export const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

/** Enum ApiErrorCode de Bing Webmaster Tools (learn.microsoft.com, 2019-04-26). */
export const BING_ERROR_CODES: Record<number, string> = {
  0: "None", 1: "InternalError", 2: "UnknownError", 3: "InvalidApiKey", 4: "ThrottleUser", 5: "ThrottleHost",
  6: "UserBlocked", 7: "InvalidUrl", 8: "InvalidParameter", 9: "TooManySites", 10: "UserNotFound", 11: "NotFound",
  12: "AlreadyExists", 13: "NotAllowed", 14: "NotAuthorized", 15: "UnexpectedState", 16: "Deprecated",
};

export class BingError extends Error {
  constructor(message: string, readonly code: number | null, readonly hint: string) { super(message); this.name = "BingError"; }
}

/** Bing sérialise ses dates au format .NET `/Date(<ms>[±hhmm])/`. Rend les millisecondes, ou null. */
export function parseDotNetDate(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/);
  return m ? Number(m[1]) : null;
}

/** DateTime.MinValue en millisecondes : ce que Bing rend pour « jamais » (capture du 29/08, GetUrlInfo sur une URL inconnue). */
export const DATE_JAMAIS = -62135568000000;

/** Retire la clé d'un texte destiné à l'écran. Reprise de actions.ts. */
export function redact(text: string, key: string | null): string {
  return key && key.length >= 8 ? text.split(key).join("[clé]") : text;
}

function hintFor(code: number | null): string {
  if (code === 3) return "la clé de ~/.zshenv n'est plus acceptée par Bing. Une seule clé existe par compte : la régénérer dans Bing Webmaster Tools, Settings, API Access, puis mettre ~/.zshenv à jour.";
  if (code === 4 || code === 5) return "Bing limite les appels, réessayer plus tard.";
  if (code === 11 || code === 13 || code === 14) return "site hors du compte ou droits insuffisants. Voir references/acces.md, Bing.";
  return "réessayer ; si ça persiste, lance `console sites` pour vérifier l'accès.";
}

/** Un appel JSON Bing. La clé voyage en paramètre : rien de ce qui sort d'ici ne la contient. */
async function call(f: Fetcher, key: string, method: string, params: Record<string, string>): Promise<unknown> {
  const q = new URLSearchParams({ ...params, apikey: key });
  const r = await f(`${BING_API_BASE}/${method}?${q}`);
  let parsed: unknown;
  try { parsed = JSON.parse(r.text); } catch { throw new BingError(`réponse illisible de Bing (${method}, HTTP ${r.status})`, null, hintFor(null)); }
  const e = parsed as { ErrorCode?: number; Message?: string };
  // ErrorCode 0 vaut None dans l'enum officielle : c'est un succès. Ne lever que sur les codes non nuls.
  if (typeof e.ErrorCode === "number" && e.ErrorCode !== 0) {
    const name = BING_ERROR_CODES[e.ErrorCode] ?? String(e.ErrorCode);
    throw new BingError(redact(`Bing a refusé ${method} : ${name}`, key), e.ErrorCode, hintFor(e.ErrorCode));
  }
  if (r.status !== 200) throw new BingError(`Bing a répondu ${r.status} sur ${method}`, null, hintFor(null));
  return (parsed as { d?: unknown }).d ?? null;
}

export async function bingUserSites(f: Fetcher, key: string): Promise<BingSite[]> {
  const d = (await call(f, key, "GetUserSites", {})) as { Url?: string; IsVerified?: boolean }[] | null;
  return (d ?? []).filter((s) => typeof s.Url === "string").map((s) => ({ Url: s.Url as string, IsVerified: s.IsVerified === true }));
}

export async function bingFeeds(f: Fetcher, key: string, siteUrl: string): Promise<unknown[]> {
  return ((await call(f, key, "GetFeeds", { siteUrl })) as unknown[] | null) ?? [];
}

export async function bingUrlInfo(f: Fetcher, key: string, siteUrl: string, url: string): Promise<Record<string, unknown> | null> {
  return ((await call(f, key, "GetUrlInfo", { siteUrl, url })) as Record<string, unknown> | null) ?? null;
}

export async function bingCrawlStats(f: Fetcher, key: string, siteUrl: string): Promise<unknown[]> {
  const d = await call(f, key, "GetCrawlStats", { siteUrl });
  return Array.isArray(d) ? d : d === null ? [] : [d];
}

export async function bingCrawlIssues(f: Fetcher, key: string, siteUrl: string): Promise<unknown[]> {
  const d = await call(f, key, "GetCrawlIssues", { siteUrl });
  return Array.isArray(d) ? d : d === null ? [] : [d];
}
