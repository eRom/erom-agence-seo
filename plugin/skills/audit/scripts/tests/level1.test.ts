// plugin/skills/audit/scripts/tests/level1.test.ts
import { test, expect } from "bun:test";
import { collectLevel1, bingKnows, type Level1Deps } from "../lib/level1";
import type { SearchRow, Fetcher } from "../../../../lib/gsc";

const NOFETCH: any = async () => { throw new Error("aucune requête ne doit partir"); };
const PAGES = [{ url: "https://x.test/", slug: "index" }];
const OPT = { origin: "https://x.test", pages: PAGES, today: "2026-08-30" };

test("sans jeton Google, la moitié Google est non vue et Bing continue", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://x.test/", IsVerified: true }] }) };
    if (url.includes("GetUrlInfo")) return { status: 200, text: JSON.stringify({ d: { LastCrawledDate: "/Date(1785610378000)/" } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: null, authError: "aucun jeton Google", bingKey: "k" }, OPT);
  expect(r.google.error).toBe("aucun jeton Google");
  expect(r.google.pages).toEqual([]);
  expect(r.bing.pages[0].known).toBe(true);
});

test("sans clé Bing, aucune requête Bing ne part", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("bing.com")) throw new Error("la clé est absente, rien ne doit partir vers Bing");
    // searchAnalytics AVANT /sites/ : son URL est .../sites/<propriété>/searchAnalytics/query et
    // matcherait la branche sitemaps, qui rendrait un corps sans `rows`. Le test passerait quand même,
    // en n'exerçant pas ce qu'il prétend exercer.
    if (url.includes("searchAnalytics")) return { status: 200, text: JSON.stringify({ rows: [] }) };
    if (url.includes("/sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null }, OPT);
  expect(r.bing.error).toBe("clé Bing absente");
  expect(r.bing.pages).toEqual([]);
  expect(r.google.pages).toHaveLength(1);
});

test("aucune propriété ne couvre l'URL : Google non vu, sans requête d'inspection", async () => {
  const fetcher: any = async (url: string) => {
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:autre.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("inspect")) throw new Error("aucune inspection ne doit partir sans propriété");
    return { status: 200, text: JSON.stringify({}) };
  };
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null }, OPT);
  expect(r.google.property).toBeNull();
  expect(r.google.error).toContain("aucune propriété");
});

test("une page en échec n'empêche pas les autres", async () => {
  let n = 0;
  const fetcher: any = async (url: string) => {
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.includes("inspect")) {
      n++;
      if (n === 1) return { status: 500, text: "{}" };
      return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    }
    return { status: 200, text: JSON.stringify({ rows: [] }) };
  };
  const deux = [{ url: "https://x.test/", slug: "index" }, { url: "https://x.test/b", slug: "b" }];
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null },
    { ...OPT, pages: deux, delayMs: 0 });
  expect(r.google.pages).toHaveLength(2);
  expect(r.google.pages[0].error).not.toBeNull();
  expect(r.google.pages[1].verdict).toBe("PASS");
});

test("sans jeton ni clé, aucune requête ne part du tout", async () => {
  const r = await collectLevel1({ fetcher: NOFETCH, auth: null, authError: "aucun jeton Google", bingKey: null }, OPT);
  expect(r.google.error).toBe("aucun jeton Google");
  expect(r.bing.error).toBe("clé Bing absente");
  expect(r.raw).toEqual([]);
});

// Ces deux-là ferment les deux trous que la revue du plan a démontrés le 30/08.

test("une page que Bing n'a jamais crawlée est rapportée inconnue, à travers collectBing", async () => {
  // Sans ce test, un `known: info !== null` satisfait tous les autres tout en mentant : la sentinelle
  // DateTime.MinValue est un objet non nul. Reproduit par la revue du plan, 10 tests verts et AC-6 faux.
  const fetcher: any = async (url: string) => {
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://x.test/", IsVerified: true }] }) };
    if (url.includes("GetUrlInfo")) return { status: 200, text: JSON.stringify({ d: { Url: "https://x.test/", LastCrawledDate: "/Date(-62135568000000)/" } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: null, authError: "aucun jeton Google", bingKey: "k" }, OPT);
  expect(r.bing.pages[0].known).toBe(false);
});

test("un refus de lecture des sitemaps est dit, jamais confondu avec « aucun sitemap »", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("searchAnalytics")) return { status: 200, text: JSON.stringify({ rows: [] }) };
    if (url.includes("/sitemaps")) return { status: 403, text: JSON.stringify({ error: { message: "insufficient permission" } }) };
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteUnverifiedUser" }] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null }, OPT);
  expect(r.google.sitemaps).toEqual([]);
  expect(r.google.sitemapsError).not.toBeNull();
  expect(r.google.pages).toHaveLength(1); // le refus sur les sitemaps n'empêche pas l'inspection
});

// Les quatre cas unitaires de bingKnows, exécutés le 30/08 et verts. Ils vivent ici, avec leur appelant.

test("AI-03 reconnaît une page connue de Bing, capture du 30/08", () => {
  expect(bingKnows({ LastCrawledDate: "/Date(1785610378000)/" })).toBe(true);
});

test("AI-03 lit la sentinelle DateTime.MinValue comme jamais crawlée", () => {
  expect(bingKnows({ LastCrawledDate: "/Date(-62135568000000)/" })).toBe(false);
});

test("AI-03 accepte un décalage horaire dans la date .NET", () => {
  expect(bingKnows({ LastCrawledDate: "/Date(1760511600000-0700)/" })).toBe(true);
});

test("AI-03 sur une réponse nulle ou sans date", () => {
  expect(bingKnows(null)).toBe(false);
  expect(bingKnows({ Url: "https://x/" })).toBe(false);
});

// AC-9 : la fraîcheur des données ne doit jamais se lire sur « la dernière ligne rendue ». Les deux
// searchAnalytics.query (dimensions ["date"] puis ["page","query"]) DOIVENT rendre des corps de nature
// différente : servir les mêmes `rows` aux deux ferait passer une implémentation qui lirait lastDataDate
// sur la mauvaise requête (celle par page et requête) sans que rien ne le voie (fix round 1, MUTATION A).
function depsAvec(rows: SearchRow[]): Level1Deps {
  const fetcher: any = async (url: string, init?: { body?: string }) => {
    if (url.includes("searchAnalytics")) {
      const q = init?.body ? JSON.parse(init.body) : {};
      const parJour = Array.isArray(q.dimensions) && q.dimensions.length === 1 && q.dimensions[0] === "date";
      // la requête par page et requête rend une ligne hors sujet pour lastDataDate (pas de date en keys[0]) :
      // si l'implémentation lit dessus par erreur, lastDateWithImpressions ne trouve rien d'exploitable.
      return { status: 200, text: JSON.stringify({ rows: parJour ? rows : [{ keys: ["https://x.test/", "mot-clé"], clicks: 0, impressions: 9, ctr: 0, position: 1 }] }) };
    }
    if (url.includes("/sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  return { fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null };
}

test("lastDataDate est le dernier jour AVEC des impressions, quel que soit l'ordre des lignes", async () => {
  const rows: SearchRow[] = [
    { keys: ["2026-08-27"], clicks: 0, impressions: 1, ctr: 0, position: 7 },
    { keys: ["2026-08-29"], clicks: 0, impressions: 0, ctr: 0, position: 0 },
    { keys: ["2026-08-20"], clicks: 0, impressions: 3, ctr: 0, position: 9 },
  ];
  // rendu volontairement dans le désordre, avec un jour à zéro impression après le dernier jour utile
  const r = await collectLevel1(depsAvec(rows), OPT);
  expect(r.google.search!.lastDataDate).toBe("2026-08-27");
});

test("aucune impression sur la période rend null, pas une date inventée", async () => {
  const r = await collectLevel1(depsAvec([{ keys: ["2026-08-29"], clicks: 0, impressions: 0, ctr: 0, position: 0 }]), OPT);
  expect(r.google.search!.lastDataDate).toBeNull();
});

// Fix round 1, MUTATION B : `dates.sort().at(-1)` prend un maximum ; une implémentation qui lirait
// `dates[0]` (la première ligne survivante) passerait les deux tests ci-dessus, où le maximum est
// justement en tête par accident de rédaction. Ici les lignes sont rendues en ordre chronologique
// croissant : `dates[0]` donnerait le plus VIEUX jour utile, pas le plus récent.
test("lastDataDate est un maximum, pas la première ligne du tableau (ordre croissant)", async () => {
  const rows: SearchRow[] = [
    { keys: ["2026-08-20"], clicks: 0, impressions: 3, ctr: 0, position: 9 },
    { keys: ["2026-08-27"], clicks: 0, impressions: 1, ctr: 0, position: 7 },
    { keys: ["2026-08-29"], clicks: 0, impressions: 0, ctr: 0, position: 0 },
  ];
  const r = await collectLevel1(depsAvec(rows), OPT);
  expect(r.google.search!.lastDataDate).toBe("2026-08-27");
});

// Fix round 1, MUTATION E : rien ne vérifiait le contenu des deux requêtes searchAnalytics elles-mêmes.
// Une fenêtre, un rowLimit ou un type faux (ou les deux appels sur la même dimension) passaient les 13
// tests d'origine sans être vus. La spec 4.3 exige `type: "web"` nommément, pour que raw/ soit rejouable.
test("les deux requêtes searchAnalytics portent la bonne fenêtre, dimensions, rowLimit et type", async () => {
  const calls: { dimensions: string[]; rowLimit: number; type: string; startDate: string; endDate: string }[] = [];
  const fetcher: any = async (url: string, init?: { body?: string }) => {
    if (url.includes("searchAnalytics")) {
      calls.push(JSON.parse(init?.body ?? "{}"));
      return { status: 200, text: JSON.stringify({ rows: [] }) };
    }
    if (url.includes("/sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null }, { ...OPT, days: 3 });
  expect(calls).toHaveLength(2);
  expect(calls[0]).toMatchObject({ dimensions: ["date"], rowLimit: 1000, type: "web", startDate: "2026-08-28", endDate: "2026-08-30" });
  expect(calls[1]).toMatchObject({ dimensions: ["page", "query"], rowLimit: 1000, type: "web", startDate: "2026-08-28", endDate: "2026-08-30" });
});

// Fix round 1, finding « ce site n'est pas dans le compte Bing » : six des sept pannes de la spec section 6
// avaient leur test, pas celle-ci. Une garde supprimée passait les 13 tests d'origine sans être vue.
test("un site hors du compte Bing est dit, sans aucun appel GetUrlInfo", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://autre.test/", IsVerified: true }] }) };
    if (url.includes("GetUrlInfo")) throw new Error("aucun GetUrlInfo ne doit partir sur un site hors compte");
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: null, authError: "aucun jeton Google", bingKey: "k" }, OPT);
  expect(r.bing.error).toBe("ce site n'est pas dans le compte Bing");
  expect(r.bing.pages).toEqual([]);
});

// Fix round 1, MUTATION I : les deux `Bun.sleep(delayMs)` (Google et Bing) n'avaient aucun témoin ; le
// seul test à deux pages passait delayMs: 0 et ne mesurait rien. Le quota Google est de 600/minute
// (spec 4.2), le délai entre deux inspections est la seule protection.
test("le délai entre deux appels est respecté (rythme des requêtes)", async () => {
  const fetcher: any = async (url: string) => {
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    return { status: 200, text: JSON.stringify({ rows: [] }) };
  };
  const deux = [{ url: "https://x.test/", slug: "index" }, { url: "https://x.test/b", slug: "b" }];
  const debut = Date.now();
  await collectLevel1(
    { fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null },
    { ...OPT, pages: deux, delayMs: 40 },
  );
  expect(Date.now() - debut).toBeGreaterThan(35);
});

// Fix round 1, finding critique : `raw` n'avait aucun test, il pouvait être vidé (MUTATION J) ou porter le
// jeton et l'URL Bing complète, apikey comprise (MUTATION F), sans qu'un seul des 13 tests d'origine ne
// bronche. Un même faux serveur pour les deux tests qui suivent : réponses distinctes selon la dimension
// searchAnalytics demandée, pour que MUTATION H (permuter les deux fichiers raw) soit aussi visible.
function fullFetcher(): Fetcher {
  return async (url, init) => {
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://x.test/", IsVerified: true }] }) };
    if (url.includes("GetUrlInfo")) return { status: 200, text: JSON.stringify({ d: { LastCrawledDate: "/Date(1785610378000)/" } }) };
    if (url.includes("searchAnalytics")) {
      const q = init?.body ? JSON.parse(init.body) : {};
      const parJour = Array.isArray(q.dimensions) && q.dimensions.length === 1 && q.dimensions[0] === "date";
      return {
        status: 200,
        text: JSON.stringify({
          rows: parJour
            ? [{ keys: ["2026-08-27"], clicks: 1, impressions: 1, ctr: 1, position: 1 }]
            : [{ keys: ["https://x.test/", "marque-page-query"], clicks: 2, impressions: 2, ctr: 1, position: 2 }],
        }),
      };
    }
    if (url.includes("/sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [{ path: "https://x.test/sitemap.xml" }] }) };
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
}
const DEPS_SECRETS: Level1Deps = {
  fetcher: fullFetcher(),
  auth: { token: "SECRET-TOKEN-JAMAIS-VU", quotaProject: "p", provider: "gcloud" },
  authError: null,
  bingKey: "SECRET-KEY-JAMAIS-VU",
};

test("raw porte les sept chemins attendus, chacun avec le contenu qui lui correspond", async () => {
  const r = await collectLevel1(DEPS_SECRETS, OPT);
  const chemins = r.raw.map((x) => x.path).sort();
  expect(chemins).toEqual([
    "bing/urlinfo/index.json", "bing/usersites.json",
    "gsc/inspect/index.json", "gsc/searchanalytics-date.json", "gsc/searchanalytics-page-query.json",
    "gsc/sitemaps.json", "gsc/sites.json",
  ].sort());
  // le contenu de chaque fichier doit correspondre à SON chemin, pas à celui du voisin (MUTATION H) :
  // body est du JSON pretty-printé, on le reparse plutôt que de chercher une sous-chaîne fragile au format.
  const corpsPar = Object.fromEntries(r.raw.map((x) => [x.path, JSON.parse(x.body)]));
  expect(corpsPar["gsc/searchanalytics-date.json"].request.dimensions).toEqual(["date"]);
  expect(corpsPar["gsc/searchanalytics-date.json"].response).toEqual([{ keys: ["2026-08-27"], clicks: 1, impressions: 1, ctr: 1, position: 1 }]);
  expect(corpsPar["gsc/searchanalytics-page-query.json"].request.dimensions).toEqual(["page", "query"]);
  expect(JSON.stringify(corpsPar["gsc/searchanalytics-page-query.json"].response)).toContain("marque-page-query");
  expect(JSON.stringify(corpsPar["bing/urlinfo/index.json"])).toContain("1785610378000");
});

test("aucun secret (jeton Google, clé Bing) ne se retrouve dans le résultat, raw compris", async () => {
  const r = await collectLevel1(DEPS_SECRETS, OPT);
  const dump = JSON.stringify(r);
  expect(dump).not.toContain("SECRET-TOKEN-JAMAIS-VU");
  expect(dump).not.toContain("SECRET-KEY-JAMAIS-VU");
});

// Fix round 1, point mineur : shiftDate() et new URL(o.origin) sortaient de tout `try`. Une entrée
// malformée devait rester à l'intérieur de la garantie « le niveau 1 ne casse jamais l'audit », pas
// dépendre de la prudence de l'appelant (tâche 7).
test("un `today` malformé ne fait jamais remonter d'exception hors du module", async () => {
  const fetcher: any = async (url: string) => {
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    return { status: 200, text: JSON.stringify({ rows: [] }) };
  };
  const r = await collectLevel1(
    { fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null },
    { ...OPT, today: "pas-une-date" },
  );
  expect(r.google.search!.error).not.toBeNull();
});

test("une origine malformée ne fait jamais remonter d'exception hors de collectBing", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://x.test/", IsVerified: true }] }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1(
    { fetcher, auth: null, authError: "aucun jeton Google", bingKey: "k" },
    { ...OPT, origin: "pas-une-url", pages: [] },
  );
  expect(r.bing.error).not.toBeNull();
});
