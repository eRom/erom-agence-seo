// Le verbe console : trois lectures, aucune écriture (D30). Toutes les dépendances entrent en paramètre,
// jamais depuis process.env directement : c'est ce qui rend « aucune requête ne part » testable.
import { resolveProperty, resolveBingSite, type Property } from "./lib/resolve";
import { getAccessToken, defaultGcloud, serviceAccountToken, type GoogleAuth } from "./lib/auth-google";
import { listProperties, listSitemaps, inspectUrl, type Fetcher } from "./lib/gsc";
import { bingUserSites, bingFeeds, bingUrlInfo, bingCrawlStats, bingCrawlIssues, redact } from "./lib/bing";
import { renderSites, renderInspect, renderCrawl, type SitesView, type InspectView, type CrawlView } from "./lib/render";
import { parseStrategy } from "../../../lib/strategy";
import { assertNoSecret } from "../../strategy/scripts/lib/keywords";

export type Deps = {
  fetcher: Fetcher;
  env: { GSC_QUOTA_PROJECT?: string; GSC_SA_KEY_FILE?: string; BING_WMT_API_KEY?: string };
  gcloud: () => Promise<string | null>;
  serviceAccount: (path: string) => Promise<string>;
  /** Le contenu de seo/strategy.md du répertoire courant, ou null. */
  readStrategy: () => Promise<string | null>;
};

const NOKEY = "non interrogé (clé absente)";
/** Deux états distincts, deux phrases : le compte n'a aucun site, ou il en a mais pas celui-là. */
const COMPTE_VIDE = "aucun site dans ce compte Bing";
const HOTE_ABSENT = "ce site n'est pas dans le compte Bing";
const USAGE = "usage : console sites | console inspect <url> | console crawl [--site <url>]   [--json]";

/** Un refus devient une raison lisible : le message, puis la consigne indentée. Jamais une trace. */
function reason(e: unknown): string {
  const hint = (e as { hint?: string })?.hint;
  if (e instanceof Error) return hint ? `${e.message}\n  ${hint.split("\n").join("\n  ")}` : e.message;
  return String(e);
}

export async function runConsole(args: string[], d: Deps): Promise<{ out: string; code: 0 | 1 }> {
  const json = args.includes("--json");
  const rest = args.filter((a) => a !== "--json");
  const cmd = rest[0] ?? "";
  const key = d.env.BING_WMT_API_KEY ?? null;
  let token: string | null = null;

  // redact retire la clé Bing ; assertNoSecret est le garde-fou de dernier recours, sur la clé ET sur le
  // jeton porteur (spec sections 3 et 9). Il lève plutôt que de laisser fuir : c'est le bon échec.
  const done = (view: unknown, text: string, code: 0 | 1) => {
    const out = redact(json ? JSON.stringify(view, null, 2) : text, key);
    assertNoSecret(out, key);
    assertNoSecret(out, token);
    return { out, code };
  };

  const auth = async (): Promise<[GoogleAuth | null, string | null]> => {
    try {
      const a = await getAccessToken(d.env, { gcloud: d.gcloud, serviceAccount: d.serviceAccount });
      token = a.token;
      return [a, null];
    } catch (e) { return [null, reason(e)]; }
  };

  if (cmd === "sites") {
    const [a, authErr] = await auth();
    let google: SitesView["google"] = null;
    let googleError = authErr;
    if (a) {
      try {
        const props = await listProperties(d.fetcher, a);
        google = [];
        // Un sitemap illisible sur une propriété ne doit pas emporter les autres propriétés.
        for (const p of props) google.push({ property: p, sitemaps: await listSitemaps(d.fetcher, a, p.siteUrl).catch(() => []) });
      } catch (e) { googleError = reason(e); }
    }
    let bing: SitesView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const sites = await bingUserSites(d.fetcher, key);
        bing = [];
        for (const s of sites) bing.push({ site: s, feeds: await bingFeeds(d.fetcher, key, s.Url).catch(() => []) });
      } catch (e) { bingError = reason(e); }
    }
    const view: SitesView = { google, googleError, bing, bingError };
    return done(view, renderSites(view), google || bing ? 0 : 1);
  }

  if (cmd === "inspect") {
    const url = rest[1];
    if (!url) return { out: USAGE, code: 1 };
    const [a, authErr] = await auth();
    let property: Property | null = null;
    let google: InspectView["google"] = null;
    let googleError = authErr;
    if (a) {
      try {
        const props = await listProperties(d.fetcher, a);
        property = resolveProperty(url, props);
        if (!property) {
          // D33 : on ne fabrique jamais un siteUrl. Sans propriété, aucune inspection ne part.
          googleError = `aucune propriété Search Console ne couvre cette URL. Vues : ${props.map((p) => p.siteUrl).join(", ") || "aucune"}. Voir references/acces.md.`;
        } else {
          google = await inspectUrl(d.fetcher, a, property.siteUrl, url);
        }
      } catch (e) { googleError = reason(e); }
    }
    let bing: InspectView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const host = new URL(url).hostname;
        const sites = await bingUserSites(d.fetcher, key);
        const site = resolveBingSite(host, sites);
        if (!site) bingError = sites.length === 0 ? COMPTE_VIDE : HOTE_ABSENT;
        else bing = await bingUrlInfo(d.fetcher, key, site.Url, url);
      } catch (e) { bingError = reason(e); }
    }
    const view: InspectView = { url, property, google, googleError, bing, bingError };
    // Sans propriété résolue, la commande n'a pas fait ce qu'on lui demandait, quoi que Bing ait répondu (AC-4).
    return done(view, renderInspect(view), property !== null && (google || bing) ? 0 : 1);
  }

  if (cmd === "crawl") {
    const i = rest.indexOf("--site");
    let site = i >= 0 ? rest[i + 1] : undefined;
    if (!site) {
      const md = await d.readStrategy();
      if (md) { try { site = parseStrategy(md).site; } catch { /* stratégie inanalysable : on demande --site */ } }
    }
    if (!site) return { out: "aucun site : lance depuis un dossier qui a seo/strategy.md, ou passe --site <url>", code: 1 };
    let bing: CrawlView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const host = new URL(site.startsWith("http") ? site : `https://${site}`).hostname;
        const sites = await bingUserSites(d.fetcher, key);
        const s = resolveBingSite(host, sites);
        if (!s) bingError = sites.length === 0 ? COMPTE_VIDE : HOTE_ABSENT;
        else bing = { stats: await bingCrawlStats(d.fetcher, key, s.Url), issues: await bingCrawlIssues(d.fetcher, key, s.Url) };
      } catch (e) { bingError = reason(e); }
    }
    const view: CrawlView = { site, bing, bingError };
    // Google n'expose rien ici : sans lecture Bing, aucune donnée de crawl n'a été obtenue, donc 1.
    return done(view, renderCrawl(view), bing ? 0 : 1);
  }

  return { out: USAGE, code: 1 };
}

if (import.meta.main) {
  const defaultFetcher: Fetcher = async (url, init = {}) => {
    try {
      const res = await fetch(url, { method: init.method ?? "GET", headers: init.headers, body: init.body, signal: AbortSignal.timeout(30000) });
      return { status: res.status, text: await res.text() };
    } catch (e) {
      // Jamais l'objet Error brut : sur un échec réseau il peut porter l'URL complète, donc la clé (leçon de keywords.ts).
      throw new Error(`service injoignable : ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  // assertNoSecret lève si un secret a survécu à redact : on préfère un échec net à une fuite.
  const { out, code } = await runConsole(process.argv.slice(2), {
    fetcher: defaultFetcher,
    env: process.env,
    gcloud: defaultGcloud,
    serviceAccount: (path) => serviceAccountToken(path, defaultFetcher),
    readStrategy: async () => {
      const f = Bun.file("seo/strategy.md");
      return (await f.exists()) ? f.text() : null;
    },
  });
  console.log(out);
  process.exit(code);
}
