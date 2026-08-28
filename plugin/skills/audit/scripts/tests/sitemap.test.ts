import { describe, test, expect } from "bun:test";
import { parseSitemap, decodeSitemapBody, sitemapCandidates, collectSitemapUrls, sameSite, formatSkippedWarning, rewriteToOrigin, type Fetcher } from "../lib/sitemap";
import type { FetchResult } from "../lib/types";

const INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <sitemap><loc>https://a.fr/s1.xml</loc><lastmod>2004-10-01T18:23:17+00:00</lastmod></sitemap>
   <sitemap><loc>https://a.fr/s2.xml</loc></sitemap>
   <sitemap><loc>https://a.fr/s3.xml</loc></sitemap>
   <sitemap><loc>https://a.fr/s4.xml</loc></sitemap>
</sitemapindex>`;
const urlset = (...locs: string[]) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`;

function fakeFetcher(map: Record<string, { status: number; body: string | Uint8Array; contentType?: string }>): Fetcher {
  return async (url) => {
    const e = map[url];
    const body = e ? (typeof e.body === "string" ? new TextEncoder().encode(e.body) : e.body) : new Uint8Array();
    return { requested: url, final: url, status: e?.status ?? 404, chain: [{ url, status: e?.status ?? 404 }], headers: e?.contentType ? { "content-type": e.contentType } : {}, body, ms: 1 };
  };
}

describe("parseSitemap", () => {
  test("reconnaît un index et ses loc", () => {
    const p = parseSitemap(INDEX);
    expect(p.kind).toBe("index");
    expect(p.locs).toEqual(["https://a.fr/s1.xml", "https://a.fr/s2.xml", "https://a.fr/s3.xml", "https://a.fr/s4.xml"]);
  });
  test("reconnaît un urlset", () => {
    const p = parseSitemap(urlset("https://a.fr/", "https://a.fr/b"));
    expect(p.kind).toBe("urlset");
    expect(p.locs).toEqual(["https://a.fr/", "https://a.fr/b"]);
  });
  test("HTML ou vide : unknown, zéro loc", () => {
    expect(parseSitemap("<!DOCTYPE html><html><body>404</body></html>")).toEqual({ kind: "unknown", locs: [] });
    expect(parseSitemap("")).toEqual({ kind: "unknown", locs: [] });
  });
});

describe("decodeSitemapBody", () => {
  test("décompresse un .gz (aller-retour Bun.gzipSync)", () => {
    const xml = urlset("https://a.fr/z");
    const gz = Bun.gzipSync(new TextEncoder().encode(xml));
    expect(decodeSitemapBody(gz, "https://a.fr/s.xml.gz", "application/gzip")).toBe(xml);
    expect(decodeSitemapBody(gz, "https://a.fr/s.xml", "text/xml")).toBe(xml); // détection par octets magiques
  });
  test("laisse le texte clair tel quel", () => {
    expect(decodeSitemapBody(new TextEncoder().encode("<urlset/>"), "https://a.fr/s.xml", "text/xml")).toBe("<urlset/>");
  });
});

describe("sitemapCandidates", () => {
  test("robots.txt d'abord, puis les emplacements classiques, sans doublon", () => {
    expect(sitemapCandidates(["https://sm.a.fr/x.xml", "https://a.fr/sitemap.xml"], "https://a.fr")).toEqual(["https://sm.a.fr/x.xml", "https://a.fr/sitemap.xml", "https://a.fr/sitemap_index.xml"]);
  });
});

describe("sameSite", () => {
  test("apex et www sont le même site, dans les deux sens", () => {
    expect(sameSite("https://acme.fr/a", "https://www.acme.fr")).toBe(true);
    expect(sameSite("https://www.acme.fr/a", "https://acme.fr")).toBe(true);
  });
  test("le schéma est indifférent", () => {
    expect(sameSite("http://acme.fr/a", "https://www.acme.fr")).toBe(true);
    expect(sameSite("https://www.acme.fr/a", "http://acme.fr")).toBe(true);
  });
  test("la casse de l'hôte est indifférente", () => {
    expect(sameSite("https://WWW.Acme.FR/a", "https://acme.fr")).toBe(true);
  });
  test("un autre domaine est refusé, y compris s'il commence par l'hôte visé", () => {
    expect(sameSite("https://autre.fr/a", "https://www.acme.fr")).toBe(false);
    expect(sameSite("https://acme.fr.evil.com/a", "https://acme.fr")).toBe(false);
  });
  test("un sous-domaine autre que www reste un autre site", () => {
    expect(sameSite("https://blog.acme.fr/a", "https://acme.fr")).toBe(false);
  });
  test("un seul www est retiré : www.www.acme.fr n'est pas acme.fr", () => {
    expect(sameSite("https://www.www.acme.fr/a", "https://acme.fr")).toBe(false);
  });
  test("le port fait partie de l'identité du site", () => {
    expect(sameSite("http://acme.fr:8080/a", "http://acme.fr:9090")).toBe(false);
    expect(sameSite("http://www.acme.fr:8080/a", "http://acme.fr:8080")).toBe(true);
  });
  test("une URL non analysable est refusée", () => {
    expect(sameSite("/relatif", "https://acme.fr")).toBe(false);
  });
});

describe("formatSkippedWarning", () => {
  test("rien d'écarté : aucun avertissement", () => {
    expect(formatSkippedWarning({ listed: 3, kept: 3, skipped: [] })).toBeNull();
  });
  test("annonce le total écarté et les hôtes concernés", () => {
    const msg = formatSkippedWarning({ listed: 6, kept: 3, skipped: [{ host: "autre.fr", count: 2 }, { host: "encore.fr", count: 1 }] });
    expect(msg).toContain("3");
    expect(msg).toContain("autre.fr");
    expect(msg).toContain("encore.fr");
  });
});

test("rewriteToOrigin garde chemin et requête, change schéma et hôte", () => {
  expect(rewriteToOrigin("https://commentchercherbonheur.org/methode?x=1", "http://localhost:3000")).toBe("http://localhost:3000/methode?x=1");
  expect(rewriteToOrigin("https://commentchercherbonheur.org", "http://localhost:3000")).toBe("http://localhost:3000/");
  expect(rewriteToOrigin("http://", "http://localhost:3000")).toBeNull();
});

test("rewriteTo : les locs d'un autre hôte sont ramenées sur l'origine et l'hôte d'origine est consigné", async () => {
  const f = fakeFetcher({ "http://localhost:3000/sitemap.xml": { status: 200, body: urlset("https://acme.fr/a", "https://acme.fr/b") } });
  const r = await collectSitemapUrls(["http://localhost:3000/sitemap.xml"], f, { maxUrls: 10, origin: "http://localhost:3000", rewriteTo: "http://localhost:3000" });
  expect(r.urls).toEqual(["http://localhost:3000/a", "http://localhost:3000/b"]);
  expect(r.stats).toEqual({ listed: 2, kept: 2, skipped: [], rewrittenFrom: ["acme.fr"] });
});

describe("collectSitemapUrls", () => {
  test("sitemap listé en apex sur un site servi en www : les URLs sont gardées", async () => {
    const f = fakeFetcher({
      "https://www.acme.fr/sitemap.xml": { status: 200, body: urlset("https://acme.fr/a", "https://acme.fr/b", "https://acme.fr/c") },
    });
    const r = await collectSitemapUrls(["https://www.acme.fr/sitemap.xml"], f, { maxUrls: 10, origin: "https://www.acme.fr" });
    expect(r.urls).toEqual(["https://acme.fr/a", "https://acme.fr/b", "https://acme.fr/c"]);
    expect(r.stats).toEqual({ listed: 3, kept: 3, skipped: [] });
  });
  test("sitemap listé en www sur un site servi en apex : les URLs sont gardées", async () => {
    const f = fakeFetcher({
      "https://acme.fr/sitemap.xml": { status: 200, body: urlset("https://www.acme.fr/a", "https://www.acme.fr/b") },
    });
    const r = await collectSitemapUrls(["https://acme.fr/sitemap.xml"], f, { maxUrls: 10, origin: "https://acme.fr" });
    expect(r.urls).toEqual(["https://www.acme.fr/a", "https://www.acme.fr/b"]);
  });
  test("les URLs sont gardées telles que listées, sans réécriture", async () => {
    const f = fakeFetcher({ "https://www.acme.fr/sitemap.xml": { status: 200, body: urlset("http://acme.fr/a") } });
    const r = await collectSitemapUrls(["https://www.acme.fr/sitemap.xml"], f, { maxUrls: 10, origin: "https://www.acme.fr" });
    expect(r.urls).toEqual(["http://acme.fr/a"]);
  });
  test("la même page en apex et en www n'est gardée qu'une fois", async () => {
    const f = fakeFetcher({
      "https://www.acme.fr/sitemap.xml": { status: 200, body: urlset("https://www.acme.fr/", "https://acme.fr/", "https://acme.fr/x") },
    });
    const r = await collectSitemapUrls(["https://www.acme.fr/sitemap.xml"], f, { maxUrls: 10, origin: "https://www.acme.fr" });
    expect(r.urls).toEqual(["https://www.acme.fr/", "https://acme.fr/x"]);
  });
  test("compte les URLs listées, gardées et écartées par hôte", async () => {
    const f = fakeFetcher({
      "https://a.fr/sitemap.xml": { status: 200, body: urlset("https://a.fr/1", "https://www.a.fr/2", "https://autre.fr/x", "https://autre.fr/y", "https://encore.fr/z") },
    });
    const r = await collectSitemapUrls(["https://a.fr/sitemap.xml"], f, { maxUrls: 10, origin: "https://a.fr" });
    expect(r.urls).toEqual(["https://a.fr/1", "https://www.a.fr/2"]);
    expect(r.stats).toEqual({ listed: 5, kept: 2, skipped: [{ host: "autre.fr", count: 2 }, { host: "encore.fr", count: 1 }] });
  });
  test("une loc relative, invalide selon le protocole sitemap, est écartée et signalée", async () => {
    const f = fakeFetcher({ "https://a.fr/sitemap.xml": { status: 200, body: urlset("https://a.fr/ok", "/relatif") } });
    const r = await collectSitemapUrls(["https://a.fr/sitemap.xml"], f, { maxUrls: 10, origin: "https://a.fr" });
    expect(r.urls).toEqual(["https://a.fr/ok"]);
    expect(r.stats.skipped).toEqual([{ host: "(url invalide)", count: 1 }]);
  });
  test("une URL écartée par le plafond n'est pas comptée comme hors site", async () => {
    const f = fakeFetcher({ "https://a.fr/sitemap.xml": { status: 200, body: urlset("https://a.fr/1", "https://a.fr/2", "https://a.fr/3") } });
    const r = await collectSitemapUrls(["https://a.fr/sitemap.xml"], f, { maxUrls: 2, origin: "https://a.fr" });
    expect(r.urls).toEqual(["https://a.fr/1", "https://a.fr/2"]);
    expect(r.stats).toEqual({ listed: 3, kept: 2, skipped: [] });
  });
  test("lit un index sur 3 enfants maximum et plafonne les URLs", async () => {
    const f = fakeFetcher({
      "https://a.fr/sitemap.xml": { status: 200, body: INDEX, contentType: "text/xml" },
      "https://a.fr/s1.xml": { status: 200, body: urlset("https://a.fr/1", "https://a.fr/2") },
      "https://a.fr/s2.xml": { status: 200, body: urlset("https://a.fr/3", "https://autre.fr/x") },
      "https://a.fr/s3.xml": { status: 200, body: urlset("https://a.fr/4", "https://a.fr/5") },
      "https://a.fr/s4.xml": { status: 200, body: urlset("https://a.fr/6") },
    });
    const r = await collectSitemapUrls(["https://a.fr/sitemap.xml"], f, { maxUrls: 4, origin: "https://a.fr" });
    expect(r.urls).toEqual(["https://a.fr/1", "https://a.fr/2", "https://a.fr/3", "https://a.fr/4"]);
    expect(r.fetched.map((x) => x.url)).not.toContain("https://a.fr/s4.xml");
    expect(r.fetched[0].kind).toBe("index");
    expect(r.fetched[0].text).toContain("<sitemapindex");
  });
  test("saute un candidat en 404 et prend le suivant", async () => {
    const f = fakeFetcher({ "https://a.fr/sitemap_index.xml": { status: 200, body: urlset("https://a.fr/ok") } });
    const r = await collectSitemapUrls(sitemapCandidates([], "https://a.fr"), f, { maxUrls: 10, origin: "https://a.fr" });
    expect(r.urls).toEqual(["https://a.fr/ok"]);
    expect(r.fetched[0].result.status).toBe(404);
    expect(r.fetched[1].kind).toBe("urlset");
  });
  test("aucun sitemap : liste vide, tentatives consignées", async () => {
    const r = await collectSitemapUrls(sitemapCandidates([], "https://a.fr"), fakeFetcher({}), { maxUrls: 10, origin: "https://a.fr" });
    expect(r.urls).toEqual([]);
    expect(r.fetched).toHaveLength(2);
  });
});
