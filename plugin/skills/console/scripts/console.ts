// Le verbe console : trois lectures, aucune écriture (D30). Toutes les dépendances entrent en paramètre,
// jamais depuis process.env directement : c'est ce qui rend « aucune requête ne part » testable.
import { resolveProperty, resolveBingSite, type Property } from "../../../lib/resolve";
import { getAccessToken, defaultGcloud, serviceAccountToken, type GoogleAuth } from "../../../lib/auth-google";
import { listProperties, listSitemaps, inspectUrl, type Fetcher } from "../../../lib/gsc";
import { bingUserSites, bingFeeds, bingUrlInfo, bingCrawlStats, bingCrawlIssues, redact } from "../../../lib/bing";
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

  // redact retire la clé Bing de tout ce qui sort. assertNoSecret est le filet de tout dernier recours,
  // sur la clé ET sur le jeton (spec sections 3 et 9) : il ne se déclenche que si redact a laissé passer
  // quelque chose, donc sans chemin d'exercice normal en usage correct ; il lève plutôt que de laisser fuir.
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
        // Un sitemap illisible sur une propriété ne doit pas emporter les autres propriétés, mais ne doit
        // pas non plus se déguiser en « zéro sitemap » : null distingue l'échec de lecture de l'absence.
        for (const p of props) google.push({ property: p, sitemaps: await listSitemaps(d.fetcher, a, p.siteUrl).catch(() => null) });
      } catch (e) { googleError = reason(e); }
    }
    let bing: SitesView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const sites = await bingUserSites(d.fetcher, key);
        bing = [];
        for (const s of sites) bing.push({ site: s, feeds: await bingFeeds(d.fetcher, key, s.Url).catch(() => null) });
      } catch (e) { bingError = reason(e); }
    }
    const view: SitesView = { google, googleError, bing, bingError };
    return done(view, renderSites(view), google || bing ? 0 : 1);
  }

  if (cmd === "inspect") {
    const url = rest[1];
    if (!url) return { out: USAGE, code: 1 };
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      return { out: `« ${url} » n'est pas une URL valide. Exemple : console inspect https://exemple.fr/page`, code: 1 };
    }
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
    if (i >= 0 && !rest[i + 1]) return { out: "--site attend une URL en argument", code: 1 };
    let site = i >= 0 ? rest[i + 1] : undefined;
    let raisonStrategie: string | null = null;
    if (!site) {
      const md = await d.readStrategy();
      if (md) {
        try {
          site = parseStrategy(md).site;
        } catch (e) {
          // Une stratégie présente mais invalide n'est pas une stratégie absente : le dire évite à
          // l'utilisateur de chercher un fichier qui existe déjà.
          raisonStrategie = `seo/strategy.md est présent mais ne s'analyse pas :\n  ${reason(e)}`;
        }
      }
    }
    if (!site) return { out: raisonStrategie ?? "aucun site : lance depuis un dossier qui a seo/strategy.md, ou passe --site <url>", code: 1 };
    let host: string;
    try {
      host = new URL(site.startsWith("http") ? site : `https://${site}`).hostname;
    } catch {
      return { out: `« ${site} » n'est pas une URL valide. Exemple : console crawl --site https://exemple.fr`, code: 1 };
    }
    let bing: CrawlView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
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
  try {
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
  } catch (e) {
    // Un échec ici (par exemple assertNoSecret qui lève parce qu'un secret a survécu à redact) ne sort
    // jamais en trace brute : même traitement que le reste du CLI, jamais une fuite.
    console.log(reason(e));
    process.exit(1);
  }
}
