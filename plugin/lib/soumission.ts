// Les trois soumissions du plugin vers les moteurs, et elles seules (D52). Deux appelants et deux seulement :
// console update (le geste répétable) et checklist --agir (le rituel de lancement).
// Conventions figées sur les exemples officiels : docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md,
// sections 3.1 et 3.2, plus l'échantillon Google du 31/08 (spec du chantier 7, section 3.2).
import { rewriteToOrigin } from "./url";
import { BING_API_BASE, BING_ERROR_CODES, redact } from "./bing";
import { parseSitemap, sitemapCandidates } from "./sitemap";
import { submitSitemap, type Fetcher, type FetchInit } from "./gsc";
import type { GoogleAuth } from "./auth-google";

export type { Fetcher, FetchInit };
export { redact };

/** Le résultat d'une soumission, lisible sur une ligne. `urls` n'a de sens que pour IndexNow. */
export type ActionResult = { ok: boolean; status: number; message: string; urls?: number };
export type BingSite = { Url: string; IsVerified: boolean };

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const JSON_UTF8 = "application/json; charset=utf-8";

/** Tableau officiel des codes IndexNow (indexnow.org/documentation), en français pour la ligne du fichier. */
export const INDEXNOW_MESSAGES: Record<number, string> = {
  200: "OK, URL reçues", 202: "Accepted, URL reçues, validation de la clé en attente",
  400: "Bad request, format invalide", 403: "Forbidden, clé non servie en /<clé>.txt sur la prod ou différente de celle du fichier",
  422: "Unprocessable Entity, une URL n'est pas sur host, ou la clé n'a pas la forme attendue", 429: "Too Many Requests, trop de soumissions, réessayer plus tard",
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

/**
 * Ramène chaque URL sur l'origine réellement servie (www ou apex) : IndexNow exige que toutes les URL soient sur `host`,
 * et un sitemap peut lister l'apex alors que le site sert www (chico, R-3). `moved` compte les URL dont l'origine
 * a réellement changé, et jamais la normalisation du slash de la racine que `new URL().toString()` opère au passage.
 */
export function urlsOnOrigin(urls: string[], origin: string): { urls: string[]; moved: number } {
  const out: string[] = [];
  let moved = 0;
  for (const u of urls) {
    const r = rewriteToOrigin(u, origin);
    if (r === null) continue;
    // Sur l'origine et non sur la chaîne : `new URL("https://x.org").toString()` rend
    // "https://x.org/", donc comparer les chaînes faisait compter un déplacement là où
    // l'hôte n'avait pas bougé, et annoncer une URL ramenée sur un sitemap sain (02/09).
    // `u` et `r` sont parsables ici, sans quoi `rewriteToOrigin` aurait rendu null.
    if (new URL(u).origin !== new URL(r).origin) moved++;
    if (!out.includes(r)) out.push(r);
  }
  return { urls: out, moved };
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
  return { ok: false, status: r.status, message: bingError(r.status, r.text, key).replace("https://<site>/sitemap.xml", feedUrl) };
}

/** Les URL déclarées par `Sitemap:` dans un robots.txt, dans l'ordre du fichier, sans doublon. */
export function sitemapsFromRobots(txt: string): string[] {
  const out: string[] = [];
  for (const raw of txt.split("\n")) {
    const m = raw.match(/^\s*sitemap\s*:\s*(\S+)\s*(?:#.*)?$/i);
    if (!m) continue;
    let u: string;
    // Une directive relative est hors protocole : le sitemap doit être une URL absolue.
    try { u = new URL(m[1]).toString(); } catch { continue; }
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

/**
 * Trouve le sitemap servi et ses URL. Ordre : ce que robots.txt déclare, puis /sitemap.xml,
 * puis /sitemap_index.xml (D53). Un index est suivi d'un niveau, pas plus.
 * Un 200 que parseSitemap ne reconnaît pas est signalé, jamais traité comme un sitemap vide :
 * soumettre un sitemap absent est une erreur qu'on découvre trois jours plus tard dans une console.
 */
export async function trouverSitemap(
  f: Fetcher,
  origine: string,
  declares?: string[],
): Promise<{ url: string; urls: string[] } | { url: null; raison: string }> {
  // `declares` évite un second GET quand l'appelant a déjà lu le robots.txt pour connaître
  // l'origine servie : c'est le cas de console update, qui le sonde pour suivre ses redirections.
  let liste = declares;
  if (liste === undefined) {
    const robots = await f(`${origine}/robots.txt`);
    liste = robots.status === 200 ? sitemapsFromRobots(robots.text) : [];
  }

  let illisible: string | null = null;
  for (const cand of sitemapCandidates(liste, origine)) {
    const r = await f(cand);
    if (r.status !== 200) continue;
    const p = parseSitemap(r.text);
    if (p.kind === "urlset") return { url: cand, urls: p.locs };
    if (p.kind === "index") {
      const urls: string[] = [];
      for (const enfant of p.locs.slice(0, 3)) {
        const c = await f(enfant);
        if (c.status === 200) urls.push(...parseSitemap(c.text).locs);
      }
      if (urls.length > 0) return { url: cand, urls };
    }
    illisible ??= cand;
  }
  return {
    url: null,
    raison: illisible
      ? `sitemap illisible : ${illisible} répond 200 mais n'est ni un urlset ni un index (compressé en .gz ?)`
      : `aucun sitemap trouvé : ni déclaré dans ${origine}/robots.txt, ni servi en /sitemap.xml ou /sitemap_index.xml`,
  };
}

/**
 * La clé IndexNow doit être servie à la racine avant tout envoi (D54), sinon le POST rend 403
 * (« key not found, file found but key not in the file ») après un aller-retour inutile.
 * La clé IndexNow est publique par construction : elle s'affiche, c'est même tout son mécanisme.
 */
export async function verifierCleServie(f: Fetcher, origine: string, key: string): Promise<ActionResult> {
  const url = `${origine}/${key}.txt`;
  const r = await f(url);
  if (r.status !== 200) return { ok: false, status: r.status, message: `clé IndexNow non servie : ${url} répond ${r.status}` };
  const servie = r.text.trim();
  if (servie !== key) {
    return { ok: false, status: 200, message: `clé IndexNow différente : ${url} sert « ${servie} », seo/strategy.md déclare « ${key} »` };
  }
  return { ok: true, status: 200, message: `clé IndexNow servie en ${url}` };
}

/** L'écriture Google, traduite en ActionResult comme ses deux voisines : un refus se lit, il n'interrompt pas. */
export async function submitSitemapGoogle(f: Fetcher, auth: GoogleAuth, siteUrl: string, feedUrl: string): Promise<ActionResult> {
  try {
    await submitSitemap(f, auth, siteUrl, feedUrl);
    return { ok: true, status: 204, message: `sitemap ${feedUrl} soumis à ${siteUrl}` };
  } catch (e) {
    const hint = (e as { hint?: string }).hint;
    const status = (e as { status?: number }).status ?? 0;
    return { ok: false, status, message: `${e instanceof Error ? e.message : String(e)}${hint ? `\n  ${hint.split("\n").join("\n  ")}` : ""}` };
  }
}
