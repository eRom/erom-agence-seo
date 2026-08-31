// Les lectures Search Console, plus une écriture et une seule : sitemaps.submit (D51, chantier 7).
// Refusées explicitement, bien que le scope les autorise : sitemaps.delete, sites.add, sites.delete.
// Conventions capturées en vrai le 29/08 et le 31/08 sur les propriétés de Romain.
import type { Property } from "./resolve";
import type { GoogleAuth } from "./auth-google";
import { LOGIN_HINT, QUOTA_HINT, SUBMIT_HINT } from "./auth-google";

export type FetchInit = { method?: "GET" | "POST" | "PUT"; headers?: Record<string, string>; body?: string };
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string; final?: string }>;

export const WMX_BASE = "https://www.googleapis.com/webmasters/v3";
export const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

export type SitemapContents = { type: string; submitted: string | null; indexed: string | null };
export type SitemapInfo = {
  path: string; lastSubmitted: string | null; lastDownloaded: string | null;
  warnings: string | null; errors: string | null; isPending: boolean; contents: SitemapContents[];
};
export type IndexStatus = {
  verdict: string; coverageState: string;
  robotsTxtState: string | null; indexingState: string | null; lastCrawlTime: string | null;
  pageFetchState: string | null; googleCanonical: string | null; userCanonical: string | null; crawledAs: string | null;
};
export type Inspection = { link: string | null; status: IndexStatus | null };

export class GscError extends Error {
  constructor(message: string, readonly status: number, readonly hint: string) { super(message); this.name = "GscError"; }
}

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

function headers(auth: GoogleAuth, json = false): Record<string, string> {
  const h: Record<string, string> = { authorization: `Bearer ${auth.token}` };
  if (auth.quotaProject) h["x-goog-user-project"] = auth.quotaProject;
  if (json) h["content-type"] = "application/json; charset=utf-8";
  return h;
}

/**
 * Un refus se lit sur `reason` quand il est là, sur le message sinon. Le corps n'est jamais renvoyé tel quel.
 * `quotaProject` vient de `auth.quotaProject` : c'est ce qui distingue un projet réel sans l'API activée
 * (Google le nomme dans son propre message, capture du 29/08, `dockertest-1268`) d'une variable qui manque
 * vraiment (auth-google.ts s'arrête avant tout appel réseau dans ce cas, cette fonction n'est jamais atteinte).
 */
function fail(status: number, text: string, quotaProject: string | null, ecriture = false): never {
  let reason = "", message = "";
  try {
    const e = (JSON.parse(text) as { error?: { message?: string; details?: { reason?: string }[] } }).error ?? {};
    message = e.message ?? "";
    reason = e.details?.map((d) => d.reason ?? "").find(Boolean) ?? "";
  } catch { /* corps non JSON : on garde le code seul */ }
  if (reason === "SERVICE_DISABLED" || /quota project/i.test(message)) {
    if (quotaProject) {
      throw new GscError(
        `le projet de quota « ${quotaProject} » n'a pas l'API Search Console activée`,
        status,
        `active-la sur ce projet :\n  gcloud services enable searchconsole.googleapis.com --project=${quotaProject}`,
      );
    }
    throw new GscError("Search Console a refusé, projet de quota", status, QUOTA_HINT);
  }
  if (reason === "USER_PROJECT_DENIED") {
    throw new GscError(
      `le projet de quota « ${quotaProject ?? "?"} » n'existe pas ou n'est pas accessible à ce compte`,
      status,
      "vérifie la valeur de GSC_QUOTA_PROJECT : c'est l'identifiant d'un projet Google Cloud (pas son nom d'affichage), et le compte utilisé doit y avoir accès.",
    );
  }
  if (reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" || /insufficient authentication scopes/i.test(message)) {
    throw new GscError("Search Console a refusé, scope insuffisant", status, ecriture ? SUBMIT_HINT : LOGIN_HINT);
  }
  if (status === 401) throw new GscError("jeton refusé ou expiré", status, ecriture ? SUBMIT_HINT : LOGIN_HINT);
  if (status === 403) {
    throw new GscError(
      "droits insuffisants sur cette propriété",
      status,
      ecriture
        ? "le rôle de ce compte ne permet probablement pas de soumettre un sitemap. Google ne documente pas le rôle exigé par l'API, seulement qu'il faut « appropriate access (owner, full, read) » ; le rapport Sitemaps de l'interface web, lui, demande Owner. Repli sûr : le faire faire par le propriétaire du site, ou déclarer le sitemap dans robots.txt."
        : "le rôle de ce compte ne permet pas cette lecture. Voir references/acces.md, rôles Search Console.",
    );
  }
  if (status === 404) throw new GscError("propriété inconnue", status, "cette propriété n'existe pas ou n'est pas partagée avec ce compte. Lance `console sites`.");
  throw new GscError(`Search Console a répondu ${status}`, status, "réessayer ; si ça persiste, lance `console sites` pour vérifier l'accès.");
}

async function call(f: Fetcher, url: string, auth: GoogleAuth, init?: FetchInit): Promise<unknown> {
  const r = await f(url, { ...init, headers: headers(auth, Boolean(init?.body)) });
  if (r.status !== 200) fail(r.status, r.text, auth.quotaProject);
  try { return JSON.parse(r.text); } catch { throw new GscError("réponse illisible de Search Console", r.status, "réessayer."); }
}

export async function listProperties(f: Fetcher, auth: GoogleAuth): Promise<Property[]> {
  const d = (await call(f, `${WMX_BASE}/sites`, auth)) as { siteEntry?: { siteUrl?: string; permissionLevel?: string }[] };
  return (d.siteEntry ?? [])
    .filter((e) => typeof e.siteUrl === "string")
    .map((e) => ({ siteUrl: e.siteUrl as string, permissionLevel: e.permissionLevel ?? "inconnu" }));
}

export async function listSitemaps(f: Fetcher, auth: GoogleAuth, siteUrl: string): Promise<SitemapInfo[]> {
  const d = (await call(f, `${WMX_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, auth)) as { sitemap?: Record<string, unknown>[] };
  return (d.sitemap ?? []).map((s) => ({
    path: str(s.path) ?? "",
    lastSubmitted: str(s.lastSubmitted), lastDownloaded: str(s.lastDownloaded),
    warnings: str(s.warnings), errors: str(s.errors), isPending: s.isPending === true,
    contents: ((s.contents as Record<string, unknown>[] | undefined) ?? []).map((c) => ({
      type: str(c.type) ?? "", submitted: str(c.submitted), indexed: str(c.indexed),
    })),
  }));
}

export async function inspectUrl(f: Fetcher, auth: GoogleAuth, siteUrl: string, url: string): Promise<Inspection> {
  const d = (await call(f, INSPECT_ENDPOINT, auth, { method: "POST", body: JSON.stringify({ inspectionUrl: url, siteUrl }) })) as {
    inspectionResult?: { inspectionResultLink?: string; indexStatusResult?: Record<string, unknown> };
  };
  const r = d.inspectionResult;
  const i = r?.indexStatusResult;
  return {
    link: str(r?.inspectionResultLink),
    status: i
      ? {
          verdict: str(i.verdict) ?? "VERDICT_UNSPECIFIED",
          coverageState: str(i.coverageState) ?? "inconnu",
          robotsTxtState: str(i.robotsTxtState), indexingState: str(i.indexingState),
          lastCrawlTime: str(i.lastCrawlTime), pageFetchState: str(i.pageFetchState),
          googleCanonical: str(i.googleCanonical), userCanonical: str(i.userCanonical), crawledAs: str(i.crawledAs),
        }
      : null,
  };
}

/** Le seul constat que Search Console donne et qu'aucun audit local ne peut produire. */
export function canonicalMismatch(s: IndexStatus | null): boolean {
  return Boolean(s?.googleCanonical && s.userCanonical && s.googleCanonical !== s.userCanonical);
}

export type SearchRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
/** La requête est conservée telle quelle dans raw/ : sans elle, la réponse n'est pas rejouable. */
export type SearchQuery = { startDate: string; endDate: string; dimensions: string[]; rowLimit: number; type: string };
export type SearchResult = { query: SearchQuery; rows: SearchRow[]; truncated: boolean };

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * searchAnalytics.query. `ctr` est une fraction (0 à 1), pas un pourcentage : capture du 30/08.
 * Pas de pagination : au plafond, `truncated` le dit et le rapport ne conclut pas sur l'exhaustivité.
 */
export async function searchAnalytics(f: Fetcher, auth: GoogleAuth, siteUrl: string, q: SearchQuery): Promise<SearchResult> {
  const d = (await call(f, `${WMX_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, auth, {
    method: "POST",
    body: JSON.stringify(q),
  })) as { rows?: Record<string, unknown>[] };
  const rows = (d.rows ?? []).map((r) => ({
    keys: Array.isArray(r.keys) ? r.keys.map(String) : [],
    clicks: num(r.clicks), impressions: num(r.impressions), ctr: num(r.ctr), position: num(r.position),
  }));
  return { query: q, rows, truncated: rows.length >= q.rowLimit };
}

/**
 * sitemaps.submit, la seule écriture de ce module et la seule du plugin vers Google (D51).
 * Le scope `auth/webmasters` qu'elle réclame autorise aussi sitemaps.delete, sites.add et sites.delete :
 * aucune des trois n'est implémentée, et ce refus est une décision. Un plugin capable de retirer la
 * propriété Search Console d'un client est un plugin qu'on n'ose plus lancer.
 * Chemin et encodage validés contre l'API le 31/08 (la requête atteint SitemapsService.Submit).
 * Le code de succès n'est documenté nulle part : la référence dit seulement « returns an empty response
 * body », le discovery ne déclare aucun schéma de réponse. On accepte donc 200 et 204 sans en attester un.
 * WMX_BASE reste sur www.googleapis.com : le discovery donne searchconsole.googleapis.com en rootUrl
 * préféré, mais les deux hôtes routent ce chemin et le dépôt s'y appuie déjà pour ses quatre lectures.
 */
export async function submitSitemap(f: Fetcher, auth: GoogleAuth, siteUrl: string, feedUrl: string): Promise<void> {
  const url = `${WMX_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedUrl)}`;
  const r = await f(url, { method: "PUT", headers: headers(auth) });
  if (r.status !== 200 && r.status !== 204) fail(r.status, r.text, auth.quotaProject, true);
}
