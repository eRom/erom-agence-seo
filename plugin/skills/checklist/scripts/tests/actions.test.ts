import { describe, test, expect } from "bun:test";
import { bingError, bingSubmitFeed, bingUserSites, INDEXNOW_ENDPOINT, pingIndexNow, redact, type Fetcher } from "../lib/actions";

const KEY = "abcdef0123456789abcdef0123456789";
type Call = { url: string; method: string; body?: string; headers?: Record<string, string> };
/** Un faux fetch qui journalise les appels et répond ce qu'on lui dit. */
function fake(reply: (c: Call) => { status: number; text: string }): { f: Fetcher; calls: Call[] } {
  const calls: Call[] = [];
  const f: Fetcher = async (url, init = {}) => { const c = { url, method: init.method ?? "GET", body: init.body, headers: init.headers }; calls.push(c); return reply(c); };
  return { f, calls };
}

describe("ping IndexNow", () => {
  test("POST groupé conforme à la doc : host, key, keyLocation, urlList, content-type JSON UTF-8 ; 202 coche", async () => {
    const { f, calls } = fake(() => ({ status: 202, text: "" }));
    const r = await pingIndexNow(f, { host: "www.chico.org", key: KEY, urls: ["https://www.chico.org/", "https://www.chico.org/a"] });
    expect(r).toEqual({ ok: true, status: 202, message: "Accepted, URL reçues, validation de la clé en attente", urls: 2 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(INDEXNOW_ENDPOINT);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers).toEqual({ "content-type": "application/json; charset=utf-8" });
    expect(JSON.parse(calls[0].body!)).toEqual({ host: "www.chico.org", key: KEY, keyLocation: `https://www.chico.org/${KEY}.txt`, urlList: ["https://www.chico.org/", "https://www.chico.org/a"] });
  });
  test("403 et 422 laissent vide avec la raison du tableau officiel ; sans URL, aucun appel", async () => {
    const { f } = fake(() => ({ status: 403, text: "" }));
    expect(await pingIndexNow(f, { host: "h", key: KEY, urls: ["https://h/"] })).toMatchObject({ ok: false, status: 403, message: expect.stringContaining("clé non servie") });
    const { f: f2 } = fake(() => ({ status: 422, text: "" }));
    expect(await pingIndexNow(f2, { host: "h", key: KEY, urls: ["https://h/"] })).toMatchObject({ ok: false, status: 422 });
    const { f: f3, calls } = fake(() => ({ status: 200, text: "" }));
    expect((await pingIndexNow(f3, { host: "h", key: KEY, urls: [] })).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("Bing Webmaster Tools", () => {
  test("GetUserSites : GET avec apikey, réponse {d:[…]} lue ; {d:[]} = aucun site", async () => {
    const sample = { d: [{ __type: "Site:#Microsoft.Bing.Webmaster.Api", AuthenticationCode: "X", DnsVerificationCode: "x.example.com", IsVerified: false, Url: "http://example.com" }] };
    const { f, calls } = fake(() => ({ status: 200, text: JSON.stringify(sample) }));
    expect(await bingUserSites(f, KEY)).toEqual([{ Url: "http://example.com", IsVerified: false }]);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toBe(`https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=${KEY}`);
    const { f: f2 } = fake(() => ({ status: 200, text: '{"d":[]}' }));
    expect(await bingUserSites(f2, KEY)).toEqual([]);
  });
  test("clé refusée : erreur nommée, la clé n'apparaît nulle part", async () => {
    const { f } = fake(() => ({ status: 400, text: `{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey ${KEY}"}` }));
    let msg = "";
    try { await bingUserSites(f, KEY); } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain("InvalidApiKey");
    expect(msg).toContain("~/.zshenv");
    expect(msg).not.toContain(KEY);
  });
  test("SubmitFeed : POST JSON {siteUrl, feedUrl}, 200 = ok ; 13, 14 et 11 = consigne au propriétaire", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"d":null}' }));
    const r = await bingSubmitFeed(f, KEY, "https://www.chico.org/", "https://www.chico.org/sitemap.xml");
    expect(r.ok).toBe(true);
    expect(calls[0]).toMatchObject({ method: "POST", url: `https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=${KEY}`, headers: { "content-type": "application/json; charset=utf-8" } });
    expect(JSON.parse(calls[0].body!)).toEqual({ siteUrl: "https://www.chico.org/", feedUrl: "https://www.chico.org/sitemap.xml" });
    for (const code of [11, 13, 14]) {
      const { f: fe } = fake(() => ({ status: 400, text: JSON.stringify({ ErrorCode: code, Message: "ERROR!!! x" }) }));
      const e = await bingSubmitFeed(fe, KEY, "s", "u");
      expect(e.ok).toBe(false);
      expect(e.message).toContain("bing.com/webmasters, Sitemaps");
    }
  });
  test("bingError et redact : throttle dit de réessayer, texte illisible tronqué, clé masquée", () => {
    expect(bingError(400, '{"ErrorCode":4,"Message":"slow"}', KEY)).toContain("réessayer plus tard");
    expect(bingError(500, "<html>boom</html>", KEY)).toContain("HTTP 500");
    expect(redact(`x ${KEY} y`, KEY)).toBe("x [clé] y");
    expect(redact("x", null)).toBe("x");
  });
});
