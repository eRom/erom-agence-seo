// plugin/skills/audit/scripts/lib/level1.ts
// Collecte du niveau 1 : Search Console et Bing Webmaster Tools. Pure au sens de D4 (collecte par script,
// octets exacts) : le Fetcher, le jeton et la clé entrent en paramètre, ce module n'écrit jamais lui-même
// sur le disque ; collect.ts écrira les fichiers listés dans `raw`.
// Aucune écriture vers Google ou Bing (D30) : ni sitemaps.submit, ni SubmitFeed, ni SubmitUrlBatch, ni ping
// IndexNow. Le niveau 1 lit, jamais n'agit.
import {
  listProperties, listSitemaps, inspectUrl, searchAnalytics,
  type Fetcher, type SitemapInfo, type SearchRow,
} from "../../../../lib/gsc";
import { type GoogleAuth } from "../../../../lib/auth-google";
import { resolveProperty, resolveBingSite, type Property, type BingSite } from "../../../../lib/resolve";
import { bingUserSites, bingUrlInfo, parseDotNetDate, DATE_JAMAIS } from "../../../../lib/bing";
import { keywordMatches } from "../../../../lib/strategy";
import { pageKey } from "../../../../lib/url";

export type Level1Deps = {
  fetcher: Fetcher;
  auth: GoogleAuth | null; // null = pas de jeton, la moitié Google est non vue
  authError: string | null; // la raison, déjà mise en forme par collect.ts
  bingKey: string | null;
};
export type Level1Options = {
  origin: string;
  pages: { url: string; slug: string }[]; // les pages déjà retenues par collect.ts, dans l'ordre
  today: string; // AAAA-MM-JJ, injecté pour que les tests soient stables
  days?: number; // fenêtre searchAnalytics, défaut 90
  delayMs?: number; // défaut 250, comme la collecte de pages
};
export type Level1Raw = { path: string; body: string }; // à écrire sous raw/, chemin relatif à raw/

export type InspectedPage = {
  url: string; slug: string;
  verdict: string; coverageState: string;
  googleCanonical: string | null; userCanonical: string | null;
  lastCrawlTime: string | null; error: string | null;
};
export type GoogleBlock = {
  property: { siteUrl: string; permissionLevel: string } | null;
  error: string | null;
  pages: InspectedPage[];
  sitemaps: SitemapInfo[];
  /** Un refus de lecture des sitemaps a son propre emplacement : sans lui, « je n'ai pas le droit de
   *  les lire » deviendrait « aucun sitemap déclaré », ce que le rapport n'a pas le droit de confondre.
   *  Cas réel disponible : sc-domain:healthincloud.app, rôle siteUnverifiedUser (spec 11.5). */
  sitemapsError: string | null;
  search: { lastDataDate: string | null; rows: SearchRow[]; truncated: boolean; error: string | null } | null;
};
export type BingPage = { url: string; slug: string; known: boolean; lastCrawled: string | null; error: string | null };
export type BingBlock = { site: string | null; error: string | null; pages: BingPage[] };

/** Les deux blocs sont toujours présents : une panne se dit par leur champ `error`, jamais par leur
 *  absence. Deux façons d'exprimer « pas de données » en est une de trop, et `deriveConsole` n'a
 *  alors aucune décharge de nullité à faire. */
export type Level1Result = { google: GoogleBlock; bing: BingBlock; raw: Level1Raw[] };

const AUCUNE_PROPRIETE = "aucune propriété Search Console ne couvre cette URL";
const CLE_BING_ABSENTE = "clé Bing absente";
const SITE_HORS_COMPTE = "ce site n'est pas dans le compte Bing";

/**
 * Un refus devient une phrase. Jamais une trace, jamais un corps de réponse brut.
 * Le `hint` est joint quand il existe : GscError, BingError et AuthError portent toutes deux champs, et
 * c'est le hint qui dit quoi faire (« active l'API sur ce projet », « la clé n'est plus acceptée »).
 * Le jeter laisserait dans le rapport un « droits insuffisants » sans la moindre issue.
 */
function why(e: unknown): string {
  const hint = (e as { hint?: string })?.hint;
  const msg = e instanceof Error ? e.message : String(e);
  return hint ? `${msg} : ${hint}` : msg;
}

/** Un dépôt dans `raw`, requête et réponse ensemble : sans la requête, une réponse n'est pas rejouable. */
function pushRaw(raw: Level1Raw[], path: string, request: unknown, response: unknown): void {
  raw.push({ path, body: JSON.stringify({ request, response }, null, 2) });
}

/** Décale une date AAAA-MM-JJ de `days` jours (négatif pour reculer), en UTC pour ignorer le fuseau local. */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Le dernier jour avec des impressions, jamais « la dernière ligne rendue » (AC-9) : Google documente que
 * les jours sans donnée sont omis et ne garantit aucun ordre de restitution. Une propriété sans trafic
 * doit rendre un null honnête plutôt qu'une date inventée à partir d'une ligne à zéro impression.
 */
function lastDateWithImpressions(rows: SearchRow[]): string | null {
  const dates = rows.filter((r) => r.impressions > 0).map((r) => r.keys[0]).filter((d): d is string => Boolean(d));
  return dates.length > 0 ? dates.sort().at(-1)! : null;
}

/**
 * AI-03. Bing rend une sentinelle DateTime.MinValue pour « jamais crawlée » (capture du 29/08), pas null.
 * Vit ici et non en tâche 6 : c'est `collectBing` qui remplit `known`, et une règle définie ailleurs
 * laisserait passer un `known: info !== null` qui satisfait tous les tests en mentant.
 */
export function bingKnows(info: Record<string, unknown> | null): boolean {
  if (!info) return false;
  const ms = parseDotNetDate(info.LastCrawledDate);
  return ms !== null && ms !== DATE_JAMAIS;
}

/** La date lisible qui va avec `bingKnows` : les deux ne doivent jamais diverger, l'une dérive de l'autre. */
function bingLastCrawled(info: Record<string, unknown> | null): string | null {
  if (!info || !bingKnows(info)) return null;
  const ms = parseDotNetDate(info.LastCrawledDate);
  return ms !== null ? new Date(ms).toISOString() : null;
}

/**
 * Deux requêtes distinctes : la première, par jour, ne sert qu'à dater la fraîcheur (AC-9) ; la seconde,
 * par page et requête, porte les lignes que le rapport affiche. Les fusionner en une seule donnerait soit
 * une requête à toutes les dimensions à la fois, soit une date de fraîcheur faussée par le regroupement
 * page/query (deux pages sur le même dernier jour font deux lignes, jamais une agrégée par jour).
 */
async function collectSearchAnalytics(
  f: Fetcher, auth: GoogleAuth, siteUrl: string, o: Level1Options, raw: Level1Raw[],
): Promise<GoogleBlock["search"]> {
  const days = o.days ?? 90;
  const endDate = o.today;
  try {
    // shiftDate() dans le try : un `today` malformé (donc une ISOString invalide) ne doit pas faire
    // sortir d'exception du module, la promesse « le niveau 1 ne casse jamais l'audit » vaut aussi
    // pour une entrée mal formée, pas seulement pour un refus réseau.
    const startDate = shiftDate(o.today, -(days - 1));
    const byDate = await searchAnalytics(f, auth, siteUrl, { startDate, endDate, dimensions: ["date"], rowLimit: 1000, type: "web" });
    pushRaw(raw, "gsc/searchanalytics-date.json", byDate.query, byDate.rows);
    const byPageQuery = await searchAnalytics(f, auth, siteUrl, { startDate, endDate, dimensions: ["page", "query"], rowLimit: 1000, type: "web" });
    pushRaw(raw, "gsc/searchanalytics-page-query.json", byPageQuery.query, byPageQuery.rows);
    return { lastDataDate: lastDateWithImpressions(byDate.rows), rows: byPageQuery.rows, truncated: byPageQuery.truncated, error: null };
  } catch (e) {
    return { lastDataDate: null, rows: [], truncated: false, error: why(e) };
  }
}

const googleVide = (error: string | null): GoogleBlock => ({ property: null, error, pages: [], sitemaps: [], sitemapsError: null, search: null });

/**
 * Six étapes, chacune protégée par son `try` : un jeton absent coupe tout avant le premier appel : une
 * propriété introuvable coupe avant l'inspection (inspecter sans siteUrl valide n'a pas de sens) ; les
 * sitemaps, les pages et searchAnalytics échouent chacun indépendamment sans entraîner les autres.
 */
async function collectGoogle(deps: Level1Deps, o: Level1Options, raw: Level1Raw[]): Promise<GoogleBlock> {
  const auth = deps.auth;
  if (!auth) return googleVide(deps.authError);

  let props: Property[];
  try {
    props = await listProperties(deps.fetcher, auth);
  } catch (e) {
    return googleVide(why(e));
  }
  pushRaw(raw, "gsc/sites.json", { call: "sites.list" }, props);

  const property = resolveProperty(`${o.origin}/`, props);
  if (!property) return googleVide(AUCUNE_PROPRIETE);

  let sitemaps: SitemapInfo[] = [];
  let sitemapsError: string | null = null;
  try {
    sitemaps = await listSitemaps(deps.fetcher, auth, property.siteUrl);
    pushRaw(raw, "gsc/sitemaps.json", { siteUrl: property.siteUrl }, sitemaps);
  } catch (e) {
    sitemapsError = why(e);
  }

  const pages: InspectedPage[] = [];
  for (let i = 0; i < o.pages.length; i++) {
    const p = o.pages[i];
    if (i > 0) await Bun.sleep(o.delayMs ?? 250);
    try {
      const insp = await inspectUrl(deps.fetcher, auth, property.siteUrl, p.url);
      pushRaw(raw, `gsc/inspect/${p.slug}.json`, { siteUrl: property.siteUrl, inspectionUrl: p.url }, insp);
      const s = insp.status;
      pages.push({
        url: p.url, slug: p.slug,
        verdict: s?.verdict ?? "VERDICT_UNSPECIFIED", coverageState: s?.coverageState ?? "inconnu",
        googleCanonical: s?.googleCanonical ?? null, userCanonical: s?.userCanonical ?? null,
        lastCrawlTime: s?.lastCrawlTime ?? null, error: null,
      });
    } catch (e) {
      pages.push({
        url: p.url, slug: p.slug, verdict: "VERDICT_UNSPECIFIED", coverageState: "inconnu",
        googleCanonical: null, userCanonical: null, lastCrawlTime: null, error: why(e),
      });
    }
  }

  const search = await collectSearchAnalytics(deps.fetcher, auth, property.siteUrl, o, raw);

  return { property, error: null, pages, sitemaps, sitemapsError, search };
}

/** Même forme que `collectGoogle` : sans clé, rien ne part ; un site hors compte est dit, jamais tu. */
async function collectBing(deps: Level1Deps, o: Level1Options, raw: Level1Raw[]): Promise<BingBlock> {
  const key = deps.bingKey;
  if (!key) return { site: null, error: CLE_BING_ABSENTE, pages: [] };

  let sites: BingSite[];
  try {
    sites = await bingUserSites(deps.fetcher, key);
  } catch (e) {
    return { site: null, error: why(e), pages: [] };
  }
  pushRaw(raw, "bing/usersites.json", { method: "GetUserSites" }, sites);

  // new URL() dans son propre try : une origine malformée jette avant tout appel utile à resolveBingSite,
  // et ne doit pas non plus faire sortir d'exception du module (même garantie que shiftDate ci-dessus).
  let site: BingSite | null;
  try {
    site = resolveBingSite(new URL(o.origin).hostname, sites);
  } catch (e) {
    return { site: null, error: why(e), pages: [] };
  }
  if (!site) return { site: null, error: SITE_HORS_COMPTE, pages: [] };

  const pages: BingPage[] = [];
  for (let i = 0; i < o.pages.length; i++) {
    const p = o.pages[i];
    if (i > 0) await Bun.sleep(o.delayMs ?? 250);
    try {
      const info = await bingUrlInfo(deps.fetcher, key, site.Url, p.url);
      pushRaw(raw, `bing/urlinfo/${p.slug}.json`, { method: "GetUrlInfo", siteUrl: site.Url, url: p.url }, info);
      pages.push({ url: p.url, slug: p.slug, known: bingKnows(info), lastCrawled: bingLastCrawled(info), error: null });
    } catch (e) {
      pages.push({ url: p.url, slug: p.slug, known: false, lastCrawled: null, error: why(e) });
    }
  }
  return { site: site.Url, error: null, pages };
}

export async function collectLevel1(deps: Level1Deps, o: Level1Options): Promise<Level1Result> {
  const raw: Level1Raw[] = [];
  const google = await collectGoogle(deps, o, raw);
  const bing = await collectBing(deps, o, raw);
  return { google, bing, raw };
}

// --- Dérivés du niveau 1 (tâche 6) ----------------------------------------------------------
// Les quatre vérifications transforment Level1Result en un seul fichier, derived/console.json,
// que le rapport d'audit lit sans jamais retoucher les blocs Google et Bing bruts.

export type IndexSummary = {
  total: number; indexed: number;
  notIndexed: { url: string; coverageState: string }[];
  /** C-2. Une page dont l'inspection a échoué (InspectedPage.error non nul) n'a reçu aucun verdict :
   *  elle ne va ni dans indexed ni dans notIndexed, sous peine d'écrire un « non indexée » que l'API
   *  n'a jamais rendu. Invariant à tenir partout : total === indexed + notIndexed.length + notInspected.length. */
  notInspected: { url: string; error: string }[];
};
export type BingSummary = {
  total: number; known: number; unknown: string[];
  /** Même garde côté Bing : GetUrlInfo en échec n'est ni known ni unknown, il n'a pas répondu.
   *  Même invariant : total === known + unknown.length + notChecked.length. */
  notChecked: { url: string; error: string }[];
};
export type CanonicalFinding = { url: string; googleCanonical: string; userCanonical: string };
export type KeywordCheck = { page: string; keyword: string; hasImpressions: boolean; keywordFound: boolean | null; topQueries: string[] };
export type ConsoleDerived = {
  level: 1;
  google: {
    property: string | null;
    /** Le rôle est conservé : c'est lui qui explique un refus (AC-7), le perdre rendrait le rapport muet sur la cause. */
    permissionLevel: string | null;
    error: string | null;
    sitemapsError: string | null;
    /** Fix round 2 (tâche 8) : `searchAnalytics.query` peut échouer seul, propriété par ailleurs accessible
     *  (quota propre à cette API, 5xx transitoire). Sans cet emplacement, la panne se confondrait avec
     *  `error` (panne globale, non), ou disparaîtrait derrière un `lastDataDate` null que le rapport lirait
     *  comme « site sans trafic » au lieu de « données non récupérées ». */
    searchError: string | null;
    index: IndexSummary;
    canonical: CanonicalFinding[];
    lastDataDate: string | null;
    truncated: boolean;
  };
  bing: { site: string | null; error: string | null; known: number; total: number; unknown: string[]; notChecked: { url: string; error: string }[] };
  strategy: KeywordCheck[] | null;
};

/**
 * IDX-06. Le verdict fait foi, pas coverageState : PASS est la seule valeur qui dise « indexée ».
 * C-2 : une page en échec (error non nul) est mise à part avant tout, elle n'entre dans aucun des deux
 * autres compteurs. `total` reste le nombre de pages SOUMISES à l'inspection, pas seulement celles qui
 * ont répondu : un total qui baisserait avec les échecs fabriquerait un second mensonge plus discret.
 */
export function indexSummary(pages: InspectedPage[]): IndexSummary {
  const failed = pages.filter((p) => p.error !== null);
  const seen = pages.filter((p) => p.error === null);
  return {
    total: pages.length,
    indexed: seen.filter((p) => p.verdict === "PASS").length,
    notIndexed: seen.filter((p) => p.verdict !== "PASS").map((p) => ({ url: p.url, coverageState: p.coverageState })),
    notInspected: failed.map((p) => ({ url: p.url, error: p.error! })),
  };
}

/** AI-03. Le pendant de `indexSummary` côté Bing, même invariant, même raison d'être : une page dont
 *  GetUrlInfo a échoué n'a reçu aucune réponse, elle n'est ni known ni unknown. */
export function bingKnownSummary(pages: BingPage[]): BingSummary {
  const failed = pages.filter((p) => p.error !== null);
  const seen = pages.filter((p) => p.error === null);
  return {
    total: pages.length,
    known: seen.filter((p) => p.known).length,
    unknown: seen.filter((p) => !p.known).map((p) => p.url),
    notChecked: failed.map((p) => ({ url: p.url, error: p.error! })),
  };
}

/** IDX-07. Un userCanonical absent n'est pas une divergence : c'est le domaine de TAG-03 au niveau 0. */
export function canonicalFindings(pages: InspectedPage[]): CanonicalFinding[] {
  return pages
    .filter((p) => p.googleCanonical && p.userCanonical && p.googleCanonical !== p.userCanonical)
    .map((p) => ({ url: p.url, googleCanonical: p.googleCanonical!, userCanonical: p.userCanonical! }));
}

/**
 * C-1. Clé d'appariement propre à `keywordChecks`, à ne pas confondre avec `pageKey` : une page de
 * stratégie est toujours un chemin nu (« /methode », `/^\/\S*$/` imposé par `parseStrategy`), alors que
 * Google rend `keys[0]` en URL absolue. Il faut donc résoudre l'un sur l'origine du site avant de
 * comparer, ET gommer la barre finale des deux côtés : Google la restitue souvent (WordPress, Next en
 * `trailingSlash: true`), la stratégie ne l'écrit jamais.
 * Ne touche pas à `pageKey` lui-même : `wantedPages` (collect.ts) s'en sert pour dédoublonner des pages
 * à COLLECTER, où `/a` et `/a/` peuvent légitimement être deux requêtes distinctes.
 */
function stratPageKey(u: string, origin: string): string {
  let abs = u;
  try { abs = new URL(u, origin).toString(); } catch { /* laisse pageKey gérer, il rend u tel quel */ }
  const k = pageKey(abs);
  return k.endsWith("/") ? k.slice(0, -1) : k;
}

/**
 * STRAT-05. Trois états et non deux : le mot visé est trouvé, il est raté, ou la page n'a aucune
 * impression sur la période (keywordFound null), ce qui n'est pas un échec de stratégie.
 * Les lignes viennent de dimensions ["page","query"] : keys[0] est la page, keys[1] la requête.
 * `origin` vient de collect.ts (celle du site audité) : c'est elle qui résout les chemins nus de
 * `planned.page` en URL comparables aux lignes absolues de Google (C-1).
 */
export function keywordChecks(rows: SearchRow[], planned: { page: string; motCle: string }[], origin: string): KeywordCheck[] {
  const byPage = new Map<string, SearchRow[]>();
  for (const r of rows) {
    if (r.keys.length < 2) continue;
    const k = stratPageKey(r.keys[0], origin);
    byPage.set(k, [...(byPage.get(k) ?? []), r]);
  }
  return planned.map((p) => {
    const found = (byPage.get(stratPageKey(p.page, origin)) ?? []).slice().sort((a, b) => b.impressions - a.impressions);
    const queries = found.map((r) => r.keys[1]);
    return {
      page: p.page, keyword: p.motCle,
      hasImpressions: queries.length > 0,
      keywordFound: queries.length > 0 ? queries.some((q) => keywordMatches(p.motCle, q)) : null,
      topQueries: queries.slice(0, 3),
    };
  });
}

/**
 * Assemble le dérivé que le rapport lit. Ne juge rien et n'invente rien : les raisons de panne sont
 * recopiées telles quelles, et une absence de donnée reste une absence.
 * `permissionLevel` est conservé parce que c'est lui qui explique un refus (AC-7) ; le perdre rendrait
 * le rapport muet sur la cause.
 * `origin` (C-1) vient de collect.ts : seul `keywordChecks` en a besoin, pour résoudre les chemins nus
 * de la stratégie sur le site réellement audité.
 */
export function deriveConsole(r: Level1Result, planned: { page: string; motCle: string }[] | null, origin: string): ConsoleDerived {
  const g = r.google;
  const b = r.bing;
  return {
    level: 1,
    google: {
      property: g.property?.siteUrl ?? null,
      permissionLevel: g.property?.permissionLevel ?? null,
      error: g.error,
      sitemapsError: g.sitemapsError,
      searchError: g.search?.error ?? null,
      index: indexSummary(g.pages),
      canonical: canonicalFindings(g.pages),
      lastDataDate: g.search?.lastDataDate ?? null,
      truncated: g.search?.truncated ?? false,
    },
    bing: { site: b.site, error: b.error, ...bingKnownSummary(b.pages) },
    strategy: planned === null ? null : keywordChecks(g.search?.rows ?? [], planned, origin),
  };
}
