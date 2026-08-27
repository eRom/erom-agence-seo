import { describe, test, expect } from "bun:test";
import { parseSitemap, decodeSitemapBody, sitemapCandidates, collectSitemapUrls, type Fetcher } from "../lib/sitemap";
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

describe("collectSitemapUrls", () => {
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
