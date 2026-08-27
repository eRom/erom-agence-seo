import { describe, test, expect } from "bun:test";
import { parsePsi } from "../lib/psi";

const load = (n: string) => Bun.file(`${import.meta.dir}/fixtures/psi/${n}`).json();

describe("parsePsi", () => {
  test("réponse complète : terrain et labo", async () => {
    const p = parsePsi(await load("psi-ok-sample.json"), "MOBILE");
    expect(p.ok).toBe(true);
    expect(p.strategy).toBe("MOBILE");
    expect(p.field?.overall).toBe("AVERAGE");
    expect(p.field?.originFallback).toBe(true);
    expect(p.field?.metrics["LARGEST_CONTENTFUL_PAINT_MS"]).toEqual({ percentile: 1714, category: "FAST" });
    expect(p.field?.metrics["INTERACTION_TO_NEXT_PAINT"].category).toBe("AVERAGE");
    expect(p.lab?.performance).toBe(0.86);
    expect(p.lab?.seo).toBe(0.92);
  });
  test("429 réel sans clé : ok false, message conservé", async () => {
    const p = parsePsi(await load("psi-sans-cle-429.json"), "MOBILE");
    expect(p.ok).toBe(false);
    expect(p.error).toContain("Quota exceeded");
    expect(p.field).toBeUndefined();
  });
  test("labo seul (pas de données CrUX) : field absent, lab présent", () => {
    const p = parsePsi({ lighthouseResult: { categories: { performance: { score: 0.5 } } } }, "DESKTOP");
    expect(p.ok).toBe(true);
    expect(p.field).toBeUndefined();
    expect(p.lab?.performance).toBe(0.5);
    expect(p.lab?.seo).toBeNull();
  });
  test("metrics vide : traité comme absence de données terrain", () => {
    const p = parsePsi({ loadingExperience: { metrics: {} }, lighthouseResult: { categories: {} } }, "MOBILE");
    expect(p.field).toBeUndefined();
  });
});
