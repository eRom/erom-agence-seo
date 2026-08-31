import { test, expect } from "bun:test";
import { parseSitemap, decodeSitemapBody, sitemapCandidates } from "../sitemap";

test("parseSitemap distingue urlset, index et illisible", () => {
  expect(parseSitemap('<urlset><url><loc>https://a.fr/</loc></url></urlset>')).toEqual({ kind: "urlset", locs: ["https://a.fr/"] });
  expect(parseSitemap('<sitemapindex><sitemap><loc>https://a.fr/s1.xml</loc></sitemap></sitemapindex>')).toEqual({ kind: "index", locs: ["https://a.fr/s1.xml"] });
  expect(parseSitemap("<html></html>")).toEqual({ kind: "unknown", locs: [] });
});

test("decodeSitemapBody décompresse un corps gzip reconnu par ses octets magiques", () => {
  const xml = '<urlset><url><loc>https://a.fr/</loc></url></urlset>';
  const gz = Bun.gzipSync(new TextEncoder().encode(xml));
  expect(decodeSitemapBody(gz, "https://a.fr/sitemap.xml", null)).toBe(xml);
  expect(decodeSitemapBody(new TextEncoder().encode(xml), "https://a.fr/sitemap.xml", null)).toBe(xml);
});

test("sitemapCandidates met le robots en tête et ne répète jamais une URL", () => {
  expect(sitemapCandidates(["https://a.fr/s.xml"], "https://a.fr")).toEqual([
    "https://a.fr/s.xml", "https://a.fr/sitemap.xml", "https://a.fr/sitemap_index.xml",
  ]);
  expect(sitemapCandidates(["https://a.fr/sitemap.xml"], "https://a.fr")).toEqual([
    "https://a.fr/sitemap.xml", "https://a.fr/sitemap_index.xml",
  ]);
});
