// Les deux écritures (D26) et la lecture Bing, avec un fetch injecté : les tests passent un faux, le CLI passe le vrai.
// Conventions figées sur les exemples officiels : docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md, sections 3.1 et 3.2.
import type { ActionResult, BingSite } from "./checklist";

export type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string };
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>;

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const JSON_UTF8 = "application/json; charset=utf-8";

/** Tableau officiel des codes IndexNow (indexnow.org/documentation), en français pour la ligne du fichier. */
export const INDEXNOW_MESSAGES: Record<number, string> = {
  200: "OK, URL reçues", 202: "Accepted, URL reçues, validation de la clé en attente",
  400: "Bad request, format invalide", 403: "Forbidden, clé non servie en /<clé>.txt sur la prod ou différente de celle du fichier",
  422: "Unprocessable Entity, une URL n'est pas sur host, ou la clé n'a pas la forme attendue", 429: "Too Many Requests, réessayer plus tard",
};

/** Enum ApiErrorCode de Bing Webmaster Tools (learn.microsoft.com, 2019-04-26). */
export const BING_ERROR_CODES: Record<number, string> = {
  0: "None", 1: "InternalError", 2: "UnknownError", 3: "InvalidApiKey", 4: "ThrottleUser", 5: "ThrottleHost", 6: "UserBlocked", 7: "InvalidUrl",
  8: "InvalidParameter", 9: "TooManySites", 10: "UserNotFound", 11: "NotFound", 12: "AlreadyExists", 13: "NotAllowed", 14: "NotAuthorized", 15: "UnexpectedState", 16: "Deprecated",
};

export const defaultFetcher: Fetcher = async (url, init = {}) => {
  try {
    const res = await fetch(url, { method: init.method ?? "GET", headers: init.headers, body: init.body, signal: AbortSignal.timeout(30000) });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    // Jamais l'objet Error brut : sur un échec réseau il peut porter l'URL complète, donc la clé (leçon de keywords.ts).
    throw new Error(`service injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }
};

/** Retire la clé d'un texte destiné au fichier ou à l'écran. */
export function redact(text: string, key: string | null): string {
  return key && key.length >= 8 ? text.split(key).join("[clé]") : text;
}

/** POST groupé IndexNow. 200 ou 202 = ok. La clé IndexNow est publique par construction (servie à la racine), pas un secret. */
export async function pingIndexNow(f: Fetcher, p: { host: string; key: string; urls: string[] }): Promise<ActionResult> {
  if (p.urls.length === 0) return { ok: false, status: 0, message: "aucune URL à soumettre : sitemap de prod vide" };
  const body = JSON.stringify({ host: p.host, key: p.key, keyLocation: `https://${p.host}/${p.key}.txt`, urlList: p.urls.slice(0, 10000) });
  const r = await f(INDEXNOW_ENDPOINT, { method: "POST", headers: { "content-type": JSON_UTF8 }, body });
  const ok = r.status === 200 || r.status === 202;
  return { ok, status: r.status, message: INDEXNOW_MESSAGES[r.status] ?? `réponse inattendue${r.text ? ` : ${r.text.slice(0, 120)}` : ""}`, urls: p.urls.length };
}

/** Message lisible d'une erreur Bing `{"ErrorCode":n,"Message":"…"}`, sans jamais relayer la clé. */
export function bingError(status: number, text: string, key: string): string {
  let code: number | null = null, msg = "";
  try { const j = JSON.parse(text); code = typeof j.ErrorCode === "number" ? j.ErrorCode : null; msg = typeof j.Message === "string" ? j.Message : ""; } catch { msg = text.slice(0, 120); }
  const name = code !== null ? (BING_ERROR_CODES[code] ?? `code ${code}`) : "";
  const hint = code === 3 ? " : la clé de ~/.zshenv n'est plus la bonne (Bing Webmaster Tools, Settings, API Access)"
    : code === 4 || code === 5 ? " : réessayer plus tard"
    : code === 11 || code === 13 || code === 14 ? " : site hors du compte ou droits insuffisants, à faire par le propriétaire du site : bing.com/webmasters, Sitemaps, Soumettre https://<site>/sitemap.xml" : "";
  return redact(`${name || `HTTP ${status}`}${msg ? ` (${msg})` : ""}${hint}`, key);
}

/** GET GetUserSites : la liste des sites du compte, `{"d":[…]}`. Lève sur une clé refusée ou une réponse illisible. */
export async function bingUserSites(f: Fetcher, key: string): Promise<BingSite[]> {
  const r = await f(`${BING_API_BASE}/GetUserSites?${new URLSearchParams({ apikey: key })}`);
  if (r.status !== 200) throw new Error(`GetUserSites : ${bingError(r.status, r.text, key)}`);
  let d: unknown;
  try { d = (JSON.parse(r.text) as { d?: unknown }).d; } catch { throw new Error("GetUserSites : réponse illisible"); }
  if (!Array.isArray(d)) throw new Error("GetUserSites : réponse sans tableau d");
  return d.filter((s): s is BingSite => typeof s?.Url === "string").map((s) => ({ Url: s.Url, IsVerified: Boolean(s.IsVerified) }));
}

/** POST SubmitFeed : `{"siteUrl","feedUrl"}`, réponse 200 `{"d":null}`. */
export async function bingSubmitFeed(f: Fetcher, key: string, siteUrl: string, feedUrl: string): Promise<ActionResult> {
  const r = await f(`${BING_API_BASE}/SubmitFeed?${new URLSearchParams({ apikey: key })}`, { method: "POST", headers: { "content-type": JSON_UTF8 }, body: JSON.stringify({ siteUrl, feedUrl }) });
  if (r.status === 200) return { ok: true, status: 200, message: `sitemap ${feedUrl} soumis pour ${siteUrl}` };
  return { ok: false, status: r.status, message: bingError(r.status, r.text, key) };
}
