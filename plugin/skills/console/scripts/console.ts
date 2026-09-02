// Le verbe console : trois lectures et une écriture, update (D50, chantier 7 ; D30 est remplacée).
import { resolveProperty, resolveBingSite, type Property } from "../../../lib/resolve";
import { getAccessToken, defaultGcloud, serviceAccountToken, type GoogleAuth } from "../../../lib/auth-google";
import { listProperties, listSitemaps, inspectUrl, type Fetcher } from "../../../lib/gsc";
import { bingUserSites, bingFeeds, bingUrlInfo, bingCrawlStats, bingCrawlIssues, redact } from "../../../lib/bing";
import { renderSites, renderInspect, renderCrawl, renderUpdate, type SitesView, type InspectView, type CrawlView, type UpdateView } from "./lib/render";
import { parseStrategy } from "../../../lib/strategy";
import { assertNoSecret } from "../../strategy/scripts/lib/keywords";
// bingUserSites ne se réimporte pas d'ici : lib/bing en porte déjà une implémentation (ligne ci-dessus),
// et un second import du même nom relierait silencieusement tout le fichier à celle-ci sans qu'aucune
// erreur ne le signale sous bun (voir la table de T3).
import { trouverSitemap, sitemapsFromRobots, urlsOnOrigin, verifierCleServie, submitSitemapGoogle, pingIndexNow, bingSubmitFeed, type ActionResult } from "../../../lib/soumission";

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
const USAGE = "usage : console sites | console inspect <url> | console crawl [--site <url>] | console update [--site <url>] [--url <u>]... [--dry-run]   [--json]";

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

  if (cmd === "update") {
    const i = rest.indexOf("--site");
    if (i >= 0 && !rest[i + 1]) return { out: "--site attend une URL en argument", code: 1 };
    let site = i >= 0 ? rest[i + 1] : undefined;

    const simule = rest.includes("--dry-run");
    const urlsDemandees: string[] = [];
    for (let k = 0; k < rest.length; k++) {
      if (rest[k] !== "--url") continue;
      if (!rest[k + 1]) return { out: "--url attend une URL en argument", code: 1 };
      urlsDemandees.push(rest[k + 1]);
      k++;
    }

    // La stratégie se lit une fois : elle donne le site et la clé IndexNow. Une stratégie présente mais
    // invalide n'est pas une stratégie absente, et le dire évite de chercher un fichier qui existe déjà :
    // c'est le motif de `crawl` (console.ts:134), on ne le contredit pas d'une commande à l'autre.
    const md = await d.readStrategy();
    let strategie: ReturnType<typeof parseStrategy> | null = null;
    let raisonStrategie: string | null = null;
    if (md) {
      try { strategie = parseStrategy(md); }
      catch (e) { raisonStrategie = `seo/strategy.md est présent mais ne s'analyse pas :\n  ${reason(e)}`; }
    }
    if (!site) site = strategie?.site;
    if (!site) return { out: raisonStrategie ?? "aucun site : lance depuis un dossier qui a seo/strategy.md, ou passe --site <url>", code: 1 };

    let demandee: string;
    try { demandee = new URL(site.startsWith("http") ? site : `https://${site}`).origin; }
    catch { return { out: `« ${site} » n'est pas une URL valide. Exemple : console update --site https://exemple.fr`, code: 1 }; }

    // L'origine réellement servie vient de la chaîne de redirections du robots.txt (D53) : un site peut
    // déclarer l'apex partout et servir le www, et c'est l'origine finale qui vaut pour IndexNow.
    // Le même GET donne les directives Sitemap: ; elles sont passées à trouverSitemap, qui ne relit rien.
    const sonde = await d.fetcher(`${demandee}/robots.txt`);
    let origine = demandee;
    if (sonde.final) { try { origine = new URL(sonde.final).origin; } catch { /* on garde l'origine demandée */ } }
    const declares = sonde.status === 200 ? sitemapsFromRobots(sonde.text) : [];

    // D55 : avec --url, aucune soumission de sitemap. Une URL hors origine est refusée ici plutôt
    // que d'aller chercher un 422 chez IndexNow.
    let sitemapUrl: string | null = null, urlsAPoster: string[] = [], deplacees = 0, raisonSitemap: string | null = null;
    if (urlsDemandees.length > 0) {
      const hors = urlsDemandees.filter((u) => { try { return new URL(u).origin !== origine; } catch { return true; } });
      if (hors.length > 0) return { out: `hors du site : ${hors.join(", ")}\n  IndexNow n'accepte que des URL sur ${origine}`, code: 1 };
      urlsAPoster = urlsDemandees;
    } else {
      const trouve = await trouverSitemap(d.fetcher, origine, declares);
      if (trouve.url === null) {
        raisonSitemap = trouve.raison;
        const view: UpdateView = { site, origine, sitemap: null, nbUrls: 0, deplacees: 0, raisonSitemap,
          google: null, googleRaison: null, bing: null, bingRaison: null, indexnow: null, indexnowRaison: null, simule };
        return done(view, renderUpdate(view), 1);
      }
      sitemapUrl = trouve.url;
      const r = urlsOnOrigin(trouve.urls, origine);
      urlsAPoster = r.urls;
      deplacees = r.moved;
    }

    // D57 distingue deux sortes de silence, et le code de sortie ne compte que la seconde.
    // « Non applicable » est une liste fermée de trois cas, reprise mot pour mot de la spec : clé Bing
    // absente, site hors du compte Bing, pas de clé IndexNow dans la stratégie. Tout le reste est un
    // échec, y compris une clé IndexNow servie mais différente (D54 existe pour attraper ce cas précis)
    // et l'absence de propriété Search Console. `console sites` et `console crawl` rendent déjà 1
    // quand le moteur visé n'a rien pu dire : cette commande ne se comporte pas autrement.
    let google: ActionResult | null = null, googleRaison: string | null = null;
    let bing: ActionResult | null = null, bingRaison: string | null = null, bingNonApplicable: string | null = null;
    if (sitemapUrl) {
      const [a, authErr] = await auth();
      if (!a) googleRaison = authErr;
      else {
        try {
          const props = await listProperties(d.fetcher, a);
          const p = resolveProperty(origine, props);
          if (!p) googleRaison = "aucune propriété Search Console ne couvre ce site. Lance `console sites`.";
          else {
            google = simule
              ? { ok: true, status: 0, message: `le sitemap ${sitemapUrl} partira vers ${p.siteUrl}` }
              : await submitSitemapGoogle(d.fetcher, a, p.siteUrl, sitemapUrl);
          }
        } catch (e) { googleRaison = reason(e); }
      }

      bingNonApplicable = key ? null : NOKEY;
      if (key) {
        try {
          const sites = await bingUserSites(d.fetcher, key);
          const s = resolveBingSite(new URL(origine).hostname, sites);
          if (!s) bingNonApplicable = sites.length === 0 ? COMPTE_VIDE : HOTE_ABSENT;
          else {
            bing = simule
              ? { ok: true, status: 0, message: `le sitemap ${sitemapUrl} partira pour ${s.Url}` }
              : await bingSubmitFeed(d.fetcher, key, s.Url, sitemapUrl);
          }
        } catch (e) { bingRaison = reason(e); }
      }
    }

    let indexnow: ActionResult | null = null, indexnowRaison: string | null = null, indexnowNonApplicable: string | null = null;
    const cle = strategie?.indexnow ?? null;
    // Une stratégie illisible n'est pas une stratégie sans clé : la confondre avec « IndexNow : non »
    // afficherait une affirmation fausse sur le fichier de l'utilisateur, en code 0 (non applicable).
    // Même distinction pour un fichier absent : affirmer ce que dit sa section Cadence de fraîcheur
    // quand ce fichier n'existe pas serait une seconde affirmation fausse, symétrique de la première.
    if (raisonStrategie) indexnowRaison = raisonStrategie;
    else if (md === null) indexnowNonApplicable = "pas de clé IndexNow : seo/strategy.md est absent";
    else if (!cle) indexnowNonApplicable = "pas de clé IndexNow dans seo/strategy.md (Cadence de fraîcheur, IndexNow : non)";
    else {
      try {
        const servie = await verifierCleServie(d.fetcher, origine, cle);
        if (!servie.ok) indexnowRaison = servie.message;
        else {
          indexnow = simule
            ? { ok: true, status: 0, message: `${urlsAPoster.length} URL partiront vers IndexNow`, urls: urlsAPoster.length }
            : await pingIndexNow(d.fetcher, { host: new URL(origine).host, key: cle, urls: urlsAPoster });
        }
      } catch (e) { indexnowRaison = reason(e); }
    }

    const view: UpdateView = {
      site, origine, sitemap: sitemapUrl, nbUrls: urlsAPoster.length, deplacees, raisonSitemap,
      google, googleRaison,
      bing, bingRaison: bingRaison ?? bingNonApplicable,
      indexnow, indexnowRaison: indexnowRaison ?? indexnowNonApplicable,
      simule,
    };
    const echecs =
      [google, bing, indexnow].filter((res) => res !== null && !res.ok).length +
      [googleRaison, bingRaison, indexnowRaison].filter((rai) => rai !== null).length;
    return done(view, renderUpdate(view), echecs > 0 ? 1 : 0);
  }

  return { out: USAGE, code: 1 };
}

if (import.meta.main) {
  const defaultFetcher: Fetcher = async (url, init = {}) => {
    try {
      const res = await fetch(url, { method: init.method ?? "GET", headers: init.headers, body: init.body, signal: AbortSignal.timeout(30000) });
      return { status: res.status, text: await res.text(), final: res.url };
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
