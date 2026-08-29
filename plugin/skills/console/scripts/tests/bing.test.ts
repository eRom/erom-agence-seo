// plugin/skills/console/scripts/tests/bing.test.ts
import { describe, test, expect } from "bun:test";
import { bingUserSites, bingUrlInfo, bingCrawlStats, redact, BingError, BING_API_BASE, type Fetcher } from "../lib/bing";

const KEY = "[REDACTED:env_secret]";
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
