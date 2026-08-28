import { describe, test, expect } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertNoSecret, bingSummary, entryFor, keywordSlug, parseBingStats, parseWikimediaMonthly, wikiSummary, wikimediaRange } from "../lib/keywords";
import { runKeywords, type Fetcher } from "../keywords";

const fx = (name: string) => Bun.file(`${import.meta.dir}/fixtures/${name}`).text();
const BING_SEO = JSON.parse(await fx("bing-keywordstats-seo-fr.json"));
const BING_VIDE = await fx("bing-keywordstats-plombier_nantes-fr.json");
const WIKI = await fx("wikimedia-pageviews-seo-fr-30j.json");
const KEY = "test-bing-api-key-1234";

describe("parseBingStats", () => {
  test("lit l'échantillon réel : points datés, triés, entiers", () => {
    const p = parseBingStats(BING_SEO);
    expect(p.length).toBeGreaterThan(20);
    expect(p[0]).toEqual({ date: "2026-02-28", impressions: 242, broadImpressions: 651 });
    for (let i = 1; i < p.length; i++) expect(p[i].date > p[i - 1].date).toBe(true);
  });
  test("réponse vide", () => expect(parseBingStats(JSON.parse(BING_VIDE))).toEqual([]));
  test("réponse sans d", () => expect(() => parseBingStats({})).toThrow(/tableau d/));
});

describe("bingSummary et entryFor", () => {
  const points = parseBingStats(BING_SEO);
  test("résumé : dernier point, total, semaines", () => {
    const s = bingSummary(points, "2026-08-28T06:00:00Z")!;
    expect(s.weeks).toBe(points.length);
    expect(s.last).toBe(points[points.length - 1].impressions);
    expect(s.total).toBe(points.reduce((n, p) => n + p.impressions, 0));
  });
  test("vide = null", () => expect(bingSummary([], "x")).toBeNull());
  test("statuts", () => {
    expect(entryFor("seo", bingSummary(points, "t"), true, null, null).statut).toBe("mesuré");
    expect(entryFor("plombier nantes", null, true, null, null).statut).toBe("non mesurable gratuitement");
    expect(entryFor("seo", null, false, null, null).statut).toBe("non interrogé (clé absente)");
    expect(entryFor("seo", null, true, "HTTP 500", null).statut).toBe("erreur : HTTP 500");
  });
});

describe("parseWikimediaMonthly", () => {
  test("mois et vues sur l'échantillon (quotidien, même forme)", () => {
    const m = parseWikimediaMonthly(JSON.parse(WIKI));
    expect(m[0]).toEqual({ month: "2026-07", views: 62 });
    expect(wikiSummary("X", m, "t").average).toBeGreaterThan(0);
  });
  test("sans items", () => expect(() => parseWikimediaMonthly({})).toThrow(/items/));
});

describe("assertNoSecret, keywordSlug, wikimediaRange", () => {
  test("refuse un contenu qui contient la clé", () => expect(() => assertNoSecret(`{"apikey":"${KEY}"}`, KEY)).toThrow(/contient la clé/));
  test("laisse passer sans clé ou sans occurrence", () => {
    expect(() => assertNoSecret("rien", KEY)).not.toThrow();
    expect(() => assertNoSecret(KEY, null)).not.toThrow();
  });
  test("keywordSlug", () => {
    expect(keywordSlug("plombier nantes")).toBe("plombier_nantes");
    expect(keywordSlug("Méthode  bonheur !")).toBe("methode_bonheur");
  });
  test("wikimediaRange : 12 mois pleins avant le mois courant", () => {
    expect(wikimediaRange(new Date("2026-08-28T10:00:00Z"))).toEqual({ start: "20250801", end: "20260801" });
  });
});

describe("runKeywords", () => {
  const calls: string[] = [];
  const fetcher: Fetcher = async (url) => {
    calls.push(url);
    if (url.includes("GetKeywordStats")) {
      const q = new URL(url).searchParams.get("q");
      if (q === "seo") return { status: 200, text: JSON.stringify(BING_SEO) };
      if (q === "casse") return { status: 500, text: "boom" };
      return { status: 200, text: BING_VIDE };
    }
    if (url.includes("wikimedia.org")) return { status: 200, text: WIKI };
    return { status: 404, text: "" };
  };
  const out = async () => mkdtemp(join(tmpdir(), "erom-seo-kw-"));

  test("mesure, non mesurable, erreur, wikipédia ; fichiers bruts et dérivés ; aucune clé sur disque", async () => {
    const o = await out();
    const r = await runKeywords({ keywords: ["seo", "plombier nantes", "casse"], wiki: { seo: "Optimisation_pour_les_moteurs_de_recherche" }, key: KEY, out: o, fetcher, delayMs: 0, now: () => new Date("2026-08-28T06:00:00Z") });
    expect(r.entries.map((e) => [e.keyword, e.statut])).toEqual([["seo", "mesuré"], ["plombier nantes", "non mesurable gratuitement"], ["casse", "erreur : HTTP 500"]]);
    expect(r.entries[0].bing!.last).toBeGreaterThan(0);
    expect(r.entries[0].wikipedia!.article).toBe("Optimisation_pour_les_moteurs_de_recherche");
    expect(r.entries[1].wikipedia).toBeNull();
    const raw = await readdir(join(o, "raw"));
    expect(raw).toContain("bing-keywordstats-seo.json");
    expect(raw).toContain("bing-keywordstats-plombier_nantes.json");
    expect(raw).toContain("wikimedia-Optimisation_pour_les_moteurs_de_recherche.json");
    const derived = JSON.parse(await Bun.file(join(o, "derived/keywords.json")).text());
    expect(derived).toHaveLength(3);
    const manifest = JSON.parse(await Bun.file(join(o, "manifest.json")).text());
    expect(manifest.bingKeyPresent).toBe(true);
    expect(manifest.country).toBe("fr");
    // invariant : rien sur disque ne contient la clé, ni les URL de requête
    for (const f of [...raw.map((n) => `raw/${n}`), "derived/keywords.json", "manifest.json"]) {
      const t = await Bun.file(join(o, f)).text();
      expect(t, f).not.toContain(KEY);
      expect(t, f).not.toContain("apikey=");
    }
    // la clé est bien partie dans la requête, pas ailleurs
    expect(calls.some((u) => u.includes(`apikey=${KEY}`))).toBe(true);
  });

  test("sans clé : non interrogé, aucun appel Bing, sort quand même", async () => {
    const before = calls.length;
    const r = await runKeywords({ keywords: ["seo"], key: null, out: await out(), fetcher, delayMs: 0 });
    expect(r.entries[0].statut).toBe("non interrogé (clé absente)");
    expect(calls.slice(before).some((u) => u.includes("GetKeywordStats"))).toBe(false);
  });

  test("clé refusée (400 InvalidApiKey) : arrêt, rien d'écrit dans derived/", async () => {
    const o = await out();
    const refuse: Fetcher = async () => ({ status: 400, text: '{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}' });
    await expect(runKeywords({ keywords: ["seo"], key: KEY, out: o, fetcher: refuse, delayMs: 0 })).rejects.toThrow(/clé refusée par Bing/);
    expect(await Bun.file(join(o, "derived/keywords.json")).exists()).toBe(false);
  });

  test("une réponse piégée qui contient la clé n'est jamais écrite", async () => {
    const o = await out();
    const piege: Fetcher = async () => ({ status: 200, text: `{"d":[],"echo":"${KEY}"}` });
    await expect(runKeywords({ keywords: ["seo"], key: KEY, out: o, fetcher: piege, delayMs: 0 })).rejects.toThrow(/contient la clé/);
    expect(await Bun.file(join(o, "raw/bing-keywordstats-seo.json")).exists()).toBe(false);
  });
});
