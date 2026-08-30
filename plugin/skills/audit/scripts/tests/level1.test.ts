// plugin/skills/audit/scripts/tests/level1.test.ts
import { test, expect } from "bun:test";
import { collectLevel1, bingKnows, type Level1Deps } from "../lib/level1";
import type { SearchRow } from "../../../../lib/gsc";

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

// AC-9 : la fraîcheur des données ne doit jamais se lire sur « la dernière ligne rendue ». Deux
// searchAnalytics.query composent chaque appel (dimensions ["date"] puis ["page","query"]) ; ce faux
// serveur les rend identiques (mêmes lignes pour les deux), seul compte ici le calcul de lastDataDate
// à partir de la requête par jour.
function depsAvec(rows: SearchRow[]): Level1Deps {
  const fetcher: any = async (url: string) => {
    if (url.includes("searchAnalytics")) return { status: 200, text: JSON.stringify({ rows }) };
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
