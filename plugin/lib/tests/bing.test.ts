// plugin/lib/tests/bing.test.ts
import { describe, test, expect } from "bun:test";
import {
  bingUserSites, bingUrlInfo, bingFeeds, bingCrawlStats, bingCrawlIssues,
  parseDotNetDate, DATE_JAMAIS, redact, BingError, BING_API_BASE, type Fetcher,
} from "../bing";

// Clé de test volontairement non hexadécimale : sur cette machine, l'outil de lecture masque toute
// chaîne de 32 caractères hexadécimaux (la forme d'une vraie clé Bing), et le masque finissait recopié
// dans le source. `redact` n'exige qu'une longueur d'au moins 8 caractères.
const KEY = "cle-de-test-bing-jamais-reelle";
const fx = (n: string) => Bun.file(new URL(`./fixtures/bing/${n}.json`, import.meta.url).pathname).text();
type Call = { url: string; method: string };
function fake(reply: (c: Call) => { status: number; text: string }): { f: Fetcher; calls: Call[] } {
  const calls: Call[] = [];
  const f: Fetcher = async (url, init = {}) => { const c = { url, method: init.method ?? "GET" }; calls.push(c); return reply(c); };
  return { f, calls };
}

describe("bingUserSites", () => {
  test("un compte vide rend une liste vide, ce n'est pas une erreur (capture du 29/08)", async () => {
    const { f } = fake(() => ({ status: 200, text: '{"d":[]}' }));
    expect(await bingUserSites(f, KEY)).toEqual([]);
  });
  test("un site du compte rend Url et IsVerified, et la clé part en paramètre", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"d":[{"__type":"Site:#Microsoft.Bing.Webmaster.Api","AuthenticationCode":"X","DnsVerificationCode":"y.example.com","IsVerified":false,"Url":"http://example.com"}]}' }));
    expect(await bingUserSites(f, KEY)).toEqual([{ Url: "http://example.com", IsVerified: false }]);
    expect(calls[0].url.startsWith(`${BING_API_BASE}/GetUserSites?`)).toBe(true);
  });
  test("clé refusée : le message nomme la cause et ne contient jamais la clé", async () => {
    const { f } = fake(() => ({ status: 400, text: '{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}' }));
    const p = bingUserSites(f, KEY);
    await expect(p).rejects.toBeInstanceOf(BingError);
    await p.catch((e: BingError) => {
      expect(e.code).toBe(3);
      expect(`${e.message}${e.hint}`).toContain("InvalidApiKey");
      expect(`${e.message}${e.hint}`).not.toContain(KEY);
    });
  });
  test("ErrorCode 0 vaut None dans l'enum officielle : c'est un succès, pas un refus", async () => {
    const { f } = fake(() => ({ status: 200, text: '{"ErrorCode":0,"d":[{"Url":"https://x.com","IsVerified":true}]}' }));
    expect(await bingUserSites(f, KEY)).toEqual([{ Url: "https://x.com", IsVerified: true }]);
  });
  test("throttle : consigne de réessayer plus tard", async () => {
    const { f } = fake(() => ({ status: 400, text: '{"ErrorCode":4,"Message":"ERROR!!! ThrottleUser"}' }));
    const p = bingUserSites(f, KEY);
    await expect(p).rejects.toBeInstanceOf(BingError);
    await p.catch((e: BingError) => expect(e.hint).toContain("plus tard"));
  });
  test("droits ou site inconnu : 11, 13 et 14 mènent à la même consigne", async () => {
    for (const code of [11, 13, 14]) {
      const { f } = fake(() => ({ status: 400, text: `{"ErrorCode":${code},"Message":"x"}` }));
      const p = bingUserSites(f, KEY);
      await expect(p).rejects.toBeInstanceOf(BingError);
      await p.catch((e: BingError) => expect(e.hint).toContain("acces.md"));
    }
  });
});

describe("bingUrlInfo et bingCrawlStats", () => {
  test("rendent la charge de l'enveloppe d telle quelle, sans inventer de champ", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"d":{"Url":"https://x/","HttpStatus":200,"IsPage":true}}' }));
    expect(await bingUrlInfo(f, KEY, "https://x", "https://x/")).toEqual({ Url: "https://x/", HttpStatus: 200, IsPage: true });
    expect(calls[0].url).toContain("GetUrlInfo?");
    const { f: f2 } = fake(() => ({ status: 200, text: '{"d":[]}' }));
    expect(await bingCrawlStats(f2, KEY, "https://x")).toEqual([]);
  });
  test("une URL inconnue de Bing rend null sans planter (incertitude 1)", async () => {
    const { f } = fake(() => ({ status: 200, text: '{"d":null}' }));
    expect(await bingUrlInfo(f, KEY, "https://x", "https://x/absente")).toBeNull();
  });
});

describe("redact", () => {
  test("retire la clé d'un texte destiné à l'écran", () => {
    expect(redact(`erreur sur ${BING_API_BASE}/GetUserSites?apikey=${KEY}`, KEY)).not.toContain(KEY);
    expect(redact("rien à cacher", null)).toBe("rien à cacher");
  });
});

describe("parseDotNetDate", () => {
  test("avec décalage horaire (capture du 29/08, GetUrlInfo sur romain-ecarnot.com/)", () => {
    expect(parseDotNetDate("/Date(1760511600000-0700)/")).toBe(1760511600000);
  });
  test("sans décalage horaire (capture du 29/08, GetFeeds)", () => {
    expect(parseDotNetDate("/Date(1788021382000)/")).toBe(1788021382000);
  });
  test("la sentinelle négative (capture du 29/08, URL inconnue de Bing)", () => {
    expect(parseDotNetDate("/Date(-62135568000000-0800)/")).toBe(DATE_JAMAIS);
  });
  test("une chaîne qui n'est pas une date .NET rend null", () => {
    expect(parseDotNetDate("2026-08-29T18:36:00Z")).toBeNull();
    expect(parseDotNetDate("n'importe quoi")).toBeNull();
  });
  test("une valeur non textuelle rend null sans planter", () => {
    expect(parseDotNetDate(null)).toBeNull();
    expect(parseDotNetDate(undefined)).toBeNull();
    expect(parseDotNetDate(1760511600000)).toBeNull();
  });
});

describe("captures réelles du 29/08", () => {
  test("GetUserSites : les deux sites de Romain, tous deux vérifiés", async () => {
    const body = await fx("user-sites");
    const { f } = fake(() => ({ status: 200, text: body }));
    expect(await bingUserSites(f, KEY)).toEqual([
      { Url: "https://lebonpote.romain-ecarnot.com/", IsVerified: true },
      { Url: "https://romain-ecarnot.com/", IsVerified: true },
    ]);
  });
  test("GetUrlInfo sur une URL connue : la charge d rendue telle quelle", async () => {
    const body = await fx("url-info-connue");
    const { f } = fake(() => ({ status: 200, text: body }));
    const info = await bingUrlInfo(f, KEY, "https://romain-ecarnot.com/", "https://romain-ecarnot.com/");
    expect(info?.AnchorCount).toBe(10);
    expect(info?.DiscoveryDate).toBe("/Date(1760511600000-0700)/");
    expect(info?.HttpStatus).toBe(0);
  });
  test("GetUrlInfo sur une URL inconnue : un objet complet, pas null, avec la sentinelle", async () => {
    const body = await fx("url-info-inconnue");
    const { f } = fake(() => ({ status: 200, text: body }));
    const info = await bingUrlInfo(f, KEY, "https://romain-ecarnot.com/", "https://romain-ecarnot.com/page-qui-nexiste-pas");
    expect(info).not.toBeNull();
    expect(parseDotNetDate(info?.DiscoveryDate)).toBe(DATE_JAMAIS);
  });
  test("GetFeeds : le sitemap de lebonpote, avec son statut et son compte d'URL", async () => {
    const body = await fx("feeds");
    const { f } = fake(() => ({ status: 200, text: body }));
    const feeds = await bingFeeds(f, KEY, "https://lebonpote.romain-ecarnot.com");
    expect(feeds).toHaveLength(1);
    const feed = feeds[0] as Record<string, unknown>;
    expect(feed.Url).toBe("https://lebonpote.romain-ecarnot.com/sitemap.xml");
    expect(feed.Status).toBe("Success");
    expect(feed.UrlCount).toBe(1);
  });
  test("GetCrawlStats et GetCrawlIssues : les deux sites de Romain rendent un tableau vide", async () => {
    const body = await fx("crawl-vide");
    const { f: f1 } = fake(() => ({ status: 200, text: body }));
    expect(await bingCrawlStats(f1, KEY, "https://romain-ecarnot.com")).toEqual([]);
    const { f: f2 } = fake(() => ({ status: 200, text: body }));
    expect(await bingCrawlIssues(f2, KEY, "https://romain-ecarnot.com")).toEqual([]);
  });
});
