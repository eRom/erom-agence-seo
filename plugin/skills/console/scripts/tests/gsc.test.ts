import { describe, test, expect } from "bun:test";
import { listProperties, listSitemaps, inspectUrl, canonicalMismatch, GscError, type Fetcher } from "../lib/gsc";
import type { GoogleAuth } from "../lib/auth-google";

const AUTH: GoogleAuth = { token: "ya29.FAUX", quotaProject: "p-123", provider: "gcloud" };
const SA: GoogleAuth = { token: "sa.FAUX", quotaProject: null, provider: "service-account" };
const fx = (n: string) => Bun.file(new URL(`./fixtures/gsc/${n}.json`, import.meta.url).pathname).text();

type Call = { url: string; method: string; headers?: Record<string, string>; body?: string };
function fake(reply: (c: Call) => { status: number; text: string }): { f: Fetcher; calls: Call[] } {
  const calls: Call[] = [];
  const f: Fetcher = async (url, init = {}) => {
    const c = { url, method: init.method ?? "GET", headers: init.headers, body: init.body };
    calls.push(c); return reply(c);
  };
  return { f, calls };
}

describe("listProperties", () => {
  test("rend les propriétés de la réponse réelle, sans supposer d'ordre, avec le jeton et le projet de quota en en-tête", async () => {
    const body = await fx("sites");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    const props = await listProperties(f, AUTH);
    expect(props.map((p) => p.siteUrl).sort()).toEqual([
      "https://lebonpote.romain-ecarnot.com/", "sc-domain:healthincloud.app", "sc-domain:romain-ecarnot.com",
    ]);
    expect(props.find((p) => p.siteUrl === "sc-domain:romain-ecarnot.com")?.permissionLevel).toBe("siteOwner");
    expect(calls[0].headers?.["authorization"]).toBe("Bearer ya29.FAUX");
    expect(calls[0].headers?.["x-goog-user-project"]).toBe("p-123");
  });
  test("un compte de service n'envoie pas d'en-tête de projet de quota", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"siteEntry":[]}' }));
    await listProperties(f, SA);
    expect(calls[0].headers?.["x-goog-user-project"]).toBeUndefined();
  });
  test("une réponse sans siteEntry rend une liste vide et ne plante pas", async () => {
    const { f } = fake(() => ({ status: 200, text: "{}" }));
    expect(await listProperties(f, AUTH)).toEqual([]);
  });
  test("un 403 SERVICE_DISABLED donne une consigne qui nomme GSC_QUOTA_PROJECT", async () => {
    const { f } = fake(() => ({ status: 403, text: '{"error":{"code":403,"details":[{"reason":"SERVICE_DISABLED"}],"message":"requires a quota project"}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.hint).toContain("GSC_QUOTA_PROJECT"));
  });
  test("un 403 de scope donne la commande de connexion", async () => {
    const { f } = fake(() => ({ status: 403, text: '{"error":{"code":403,"details":[{"reason":"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}],"message":"Request had insufficient authentication scopes."}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.hint).toContain("gcloud auth application-default login"));
  });
});

describe("listSitemaps", () => {
  test("encode le siteUrl dans le chemin et décode soumis et indexé", async () => {
    const body = await fx("sitemaps");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    const s = await listSitemaps(f, AUTH, "sc-domain:romain-ecarnot.com");
    expect(calls[0].url).toContain("/sites/sc-domain%3Aromain-ecarnot.com/sitemaps");
    expect(s[0].path).toBe("https://lebonpote.romain-ecarnot.com/sitemap.xml");
    expect(s[0].contents[0]).toEqual({ type: "web", submitted: "1", indexed: "0" });
    expect(s[0].errors).toBe("0");
  });
  test("une propriété sans sitemap rend une liste vide", async () => {
    const { f } = fake(() => ({ status: 200, text: "{}" }));
    expect(await listSitemaps(f, AUTH, "sc-domain:x.com")).toEqual([]);
  });
});

describe("inspectUrl", () => {
  test("page connue : les champs d'état et les deux canonicals sortent de la réponse réelle", async () => {
    const body = await fx("inspect-known");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    const r = await inspectUrl(f, AUTH, "sc-domain:romain-ecarnot.com", "https://romain-ecarnot.com/");
    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(calls[0].body!)).toEqual({ inspectionUrl: "https://romain-ecarnot.com/", siteUrl: "sc-domain:romain-ecarnot.com" });
    expect(r.status?.coverageState).toBe("Page with redirect");
    expect(r.status?.lastCrawlTime).toBe("2026-08-21T08:31:23Z");
    expect(r.status?.googleCanonical).toBe("https://www.romain-ecarnot.com/");
    expect(r.link).toContain("search.google.com");
    expect(canonicalMismatch(r.status)).toBe(false);
  });
  test("URL inconnue : les champs absents sont null, pas des chaînes vides", async () => {
    const body = await fx("inspect-unknown");
    const { f } = fake(() => ({ status: 200, text: body }));
    const r = await inspectUrl(f, AUTH, "sc-domain:romain-ecarnot.com", "https://romain-ecarnot.com/page-qui-nexiste-pas");
    expect(r.status?.coverageState).toBe("URL is unknown to Google");
    expect(r.status?.lastCrawlTime).toBeNull();
    expect(r.status?.googleCanonical).toBeNull();
    expect(canonicalMismatch(r.status)).toBe(false);
  });
  test("une réponse sans indexStatusResult rend status null et ne plante pas (spec section 9)", async () => {
    const { f } = fake(() => ({ status: 200, text: '{"inspectionResult":{"inspectionResultLink":"https://search.google.com/z"}}' }));
    const r = await inspectUrl(f, AUTH, "sc-domain:x.com", "https://x.com/");
    expect(r.status).toBeNull();
    expect(r.link).toBe("https://search.google.com/z");
    expect(canonicalMismatch(r.status)).toBe(false);
  });
  test("canonicalMismatch ne dit oui que si les deux sont là et diffèrent", () => {
    const base = { verdict: "PASS", coverageState: "x", robotsTxtState: null, indexingState: null, lastCrawlTime: null, pageFetchState: null, crawledAs: null };
    expect(canonicalMismatch({ ...base, googleCanonical: "https://a/", userCanonical: "https://b/" })).toBe(true);
    expect(canonicalMismatch({ ...base, googleCanonical: "https://a/", userCanonical: null })).toBe(false);
    expect(canonicalMismatch(null)).toBe(false);
  });
});

describe("aucune écriture", () => {
  test("aucune URL appelée ne vise une soumission, quelle que soit la méthode", async () => {
    const body = await fx("sites");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    await listProperties(f, AUTH);
    await listSitemaps(f, AUTH, "sc-domain:romain-ecarnot.com").catch(() => {});
    await inspectUrl(f, AUTH, "sc-domain:romain-ecarnot.com", "https://romain-ecarnot.com/").catch(() => {});
    expect(calls.length).toBeGreaterThan(0);
    // Le contrôle porte sur les URL, pas sur le verbe : un sitemaps.submit envoyé en POST passerait
    // une assertion qui ne regarde que la méthode.
    for (const c of calls) expect(/\/sitemaps\/|SubmitFeed|SubmitUrlBatch|indexnow/.test(c.url)).toBe(false);
  });
});
