import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFixtureSite } from "./fixtures/site";
import { runCollect, wantedPages } from "../collect";
import type { Manifest, PageFacts, RobotsEval } from "../lib/types";

let server: ReturnType<typeof startFixtureSite>;
let base = "";
let out = "";
let manifest: Manifest;

beforeAll(async () => {
  server = startFixtureSite(0);
  base = `http://localhost:${server.port}`;
  out = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
  manifest = await runCollect({ url: base, out, maxPages: 5, delayMs: 0, psiKey: null });
});
afterAll(() => server.stop(true));

const exists = (p: string) => Bun.file(join(out, p)).exists();

describe("wantedPages", () => {
  test("la home d'abord, puis les URLs explicites, puis celles du sitemap", () => {
    expect(wantedPages("https://acme.fr", ["https://acme.fr/x"], ["https://acme.fr/y"])).toEqual(["https://acme.fr/", "https://acme.fr/x", "https://acme.fr/y"]);
  });
  test("une URL de sitemap listée en apex est gardée sur un site servi en www", () => {
    expect(wantedPages("https://www.acme.fr", [], ["https://acme.fr/a"])).toEqual(["https://www.acme.fr/", "https://acme.fr/a"]);
  });
  test("la home listée en apex ne fait pas collecter la home deux fois", () => {
    expect(wantedPages("https://www.acme.fr", [], ["https://acme.fr/", "https://acme.fr/a"])).toEqual(["https://www.acme.fr/", "https://acme.fr/a"]);
  });
  test("une URL hors site est écartée", () => {
    expect(wantedPages("https://acme.fr", [], ["https://autre.fr/x"])).toEqual(["https://acme.fr/"]);
  });
  test("une URL explicite relative est résolue sur l'origine", () => {
    expect(wantedPages("https://acme.fr", ["/contact"], [])).toEqual(["https://acme.fr/", "https://acme.fr/contact"]);
  });
  test("une URL invalide est ignorée sans faire tomber le reste", () => {
    expect(wantedPages("https://acme.fr", [], ["http://", "https://acme.fr/a"])).toEqual(["https://acme.fr/", "https://acme.fr/a"]);
  });
});

describe("runCollect", () => {
  test("écrit raw/ et derived/", async () => {
    for (const p of ["raw/manifest.json", "raw/robots.txt", "raw/sitemap-0.xml", "raw/sitemap-1.xml", "raw/llms.txt", "raw/pages/index.html", "raw/pages/index.headers.json", "raw/pages/a.html", "raw/probe-notfound.html", "derived/robots-eval.json", "derived/pages.json", "derived/psi.json"]) {
      expect(await exists(p), p).toBe(true);
    }
  });
  test("manifeste : pages, sondes, stack", () => {
    expect(manifest.site).toBe(base);
    expect(manifest.level).toBe(0);
    expect(manifest.robots.status).toBe(200);
    expect(manifest.sitemaps.map((s) => s.status)).toEqual([200, 200]);
    expect(manifest.pages.map((p) => p.final)).toEqual([`${base}/`, `${base}/a`, `${base}/b`, `${base}/c`]);
    expect(manifest.probes.notFound.status).toBe(200);
    expect(manifest.probes.hostVariant.requested).toMatch(/^http:\/\/www\.localhost:/);
    expect(manifest.stack.generator).toBe("Jouet 1.0");
    expect(manifest.stack.server).toBe("jouet");
    expect(manifest.psi.attempted).toBe(false);
  });
  test("le manifeste consigne l'URL de sitemap hors site au lieu de l'écarter en silence", () => {
    expect(manifest.sitemapUrls.skipped).toEqual([{ host: "autre.fr", count: 1 }]);
    // tout ce que le sitemap a gardé a bien été collecté, la home en plus
    expect(manifest.sitemapUrls.kept).toBe(manifest.pages.length - 1);
    expect(manifest.sitemapUrls.listed).toBeGreaterThan(manifest.sitemapUrls.kept);
  });
  test("verdicts robots sur les pages collectées", async () => {
    const e = (await Bun.file(join(out, "derived/robots-eval.json")).json()) as RobotsEval;
    expect(e.semantics).toBe("rules");
    expect(e.bots["Claude-User"].root).toBe(false);
    expect(e.bots["Claude-User"].pages[`${base}/a`]).toBe(false);
    expect(e.bots["Googlebot"].root).toBe(true);
    expect(e.sitemaps).toEqual([`${base}/sitemap.xml`]);
  });
  test("faits par page", async () => {
    const pages = (await Bun.file(join(out, "derived/pages.json")).json()) as PageFacts[];
    const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
    expect(bySlug["index"].jsonld[0].types).toEqual(["Organization"]);
    expect(bySlug["a"].robotsMeta).toBe("max-snippet:0");
    expect(bySlug["b"].dateModified).toBe("2026-06-12");
    expect(bySlug["b"].lastModified).toBe("Fri, 12 Jun 2026 07:00:00 GMT");
    expect(bySlug["c"].robotsMeta).toBe("noindex");
    expect(bySlug["index"].textChars).toBeGreaterThan(500);
  });
  test("sans clé PSI : psi.json explique l'absence", async () => {
    const psi = await Bun.file(join(out, "derived/psi.json")).json();
    expect(psi.ok).toBe(false);
    expect(psi.error).toContain("PSI_API_KEY");
  });
  test("--page ajoute une URL explicite en tête de liste après la home", async () => {
    const out2 = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const m = await runCollect({ url: base, out: out2, maxPages: 2, pages: [`${base}/c`], delayMs: 0, psiKey: null });
    expect(m.pages.map((p) => p.final)).toEqual([`${base}/`, `${base}/c`]);
  });

  test("sans --out : deux appels successifs réservent deux dossiers distincts, le premier reste inchangé au bit près", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "erom-seo-autodir-"));
    const prevCwd = process.cwd();
    process.chdir(cwd);
    try {
      const m1 = await runCollect({ url: base, maxPages: 1, delayMs: 0, psiKey: null });
      expect(m1.out).toMatch(/^seo\/audits\/\d{4}-\d{2}-\d{2}-n0$/);
      const manifest1Before = await Bun.file(join(cwd, m1.out, "raw/manifest.json")).text();

      const m2 = await runCollect({ url: base, maxPages: 1, delayMs: 0, psiKey: null });
      expect(m2.out).not.toBe(m1.out);
      expect(m2.out).toBe(`${m1.out}-2`);

      const manifest1After = await Bun.file(join(cwd, m1.out, "raw/manifest.json")).text();
      expect(manifest1After).toBe(manifest1Before);
    } finally {
      process.chdir(prevCwd);
    }
  });
});
