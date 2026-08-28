import { describe, test, expect } from "bun:test";
import { readdir } from "node:fs/promises";
import { parseStrategy } from "../../../../lib/strategy";
import { parseReport } from "../../../../lib/report";
import { parseChecks } from "../../../audit/scripts/lib/checks";
import type { Manifest, PageFacts } from "../../../audit/scripts/lib/types";
import type { StrategyEval } from "../../../audit/scripts/lib/strategy-eval";
import { buildPlan, DEFAULT_KIND, KINDS, kindOf, planSummary, type BuildPlanInput } from "../lib/plan";

const F = `${import.meta.dir}/fixtures/chico`;
const strategy = parseStrategy(await Bun.file(`${F}/strategy.md`).text());
const report = parseReport(await Bun.file(`${F}/report.md`).text());
const manifest = JSON.parse(await Bun.file(`${F}/manifest.json`).text()) as Manifest;
const pages = JSON.parse(await Bun.file(`${F}/pages.json`).text()) as PageFacts[];
const strategyEval = JSON.parse(await Bun.file(`${F}/strategy-eval.json`).text()) as StrategyEval;
const input: BuildPlanInput = {
  strategy, strategyPath: "seo/strategy.md", report, manifest, pages, strategyEval,
  homeFinalUrl: manifest.pages[0].final, deps: ["next", "react"], auditDir: "seo/audits/2026-08-28-n0", now: "2026-08-28T13:00:00.000Z",
};

describe("buildPlan sur les vrais fichiers de chico (audit n0 du 28/08, stratégie validée)", () => {
  const plan = buildPlan(input);
  test("trouvailles : Info exclue, tri sévérité puis genre puis id", () => {
    expect(plan.findings.map((f) => f.id)).toEqual(["IDX-02", "SD-01", "SD-02", "TAG-01", "STRAT-01", "STRAT-02", "AI-02", "SD-03", "STRAT-03", "TAG-02", "TAG-03", "IDX-04"]);
    expect(plan.findings.map((f) => f.kind)).toEqual(["code", "code", "code", "code", "texte", "texte", "code", "code", "code", "code", "texte", "hors-build"]);
    expect(plan.findings.find((f) => f.id === "IDX-04")?.ou).toContain("Vercel");
    expect(plan.findings.find((f) => f.id === "SD-02")?.correctif).toContain('"@type": "Organization"');
  });
  test("base canonique = l'hôte observé sur la home du niveau 0 (www), pas l'apex du code", () => {
    expect(plan.canonicalBase).toEqual({ origin: "https://www.commentchercherbonheur.org", source: "audit niveau 0" });
    expect(plan.organization).toEqual({
      "@context": "https://schema.org", "@type": "Organization",
      name: "L'Institut C.H.I.C.O.", url: "https://www.commentchercherbonheur.org/",
      description: strategy.identite,
      sameAs: ["https://fr.tipeee.com/rebondir-apres-lavc-ma-carriere-dans-la-tech", "https://x.com/CloudinNantes", "https://www.romain-ecarnot.com/"],
    });
    expect(plan.indexnow).toEqual({ key: "bf498d4959b94b88aa7bb3902433735f", file: "public/bf498d4959b94b88aa7bb3902433735f.txt" });
    expect(plan.stack).toBe("nextjs");
    expect(plan.audit).toEqual({ dir: "seo/audits/2026-08-28-n0", date: "2026-08-28", niveau: 0, counts: { Critique: 0, Important: 6, Mineur: 6, Info: 1 } });
    expect(plan.strategy).toEqual({ path: "seo/strategy.md", statut: "validée", date: "2026-08-28", site: "commentchercherbonheur.org" });
    expect(plan.warnings).toEqual([]);
  });
  test("pages : valeurs actuelles, manques, textes requis", () => {
    expect(plan.pages).toHaveLength(10);
    expect(plan.pages.map((p) => p.page)).toEqual(strategy.pages.map((p) => p.page));
    const home = plan.pages[0];
    expect(home.current).toMatchObject({ url: "https://www.commentchercherbonheur.org/", status: 200, title: "L'Institut C.H.I.C.O. | Optimisation Quantique de l'Ego", canonical: null, jsonldTypes: [], challenge: false });
    expect(home.missing).toEqual({ title: false, h1: true, opening: true });
    // TAG-01 et TAG-02 ouvertes : title et description requis partout ; le h1 de la home ne porte pas le mot-clé
    expect(home.textes).toEqual(["title", "description", "h1", "opening"]);
    expect(plan.pages.find((p) => p.page === "/institut")?.textes).toEqual(["title", "description", "h1"]);
    expect(plan.pages.find((p) => p.page === "/tkt-tomorrow")?.textes).toEqual(["title", "description"]);
    expect(plan.pages.find((p) => p.page === "/audit")?.current?.h1).toEqual([]);
    expect(plan.pages.find((p) => p.page === "/audit")?.textes).toEqual(["title", "description", "h1", "opening"]);
    expect(plan.pages.every((p) => p.textes.length > 0)).toBe(true);
  });
  test("ligne de bilan", () => {
    expect(planSummary(plan)).toBe("plan : 12 trouvailles ouvertes (0 Critique, 6 Important, 6 Mineur) : 8 code, 3 texte, 1 hors build ; 10 pages avec des textes à valider ; base canonique https://www.commentchercherbonheur.org (audit niveau 0)");
  });
});

describe("buildPlan, cas dégradés", () => {
  test("sans audit niveau 0 : base canonique depuis la stratégie, signalée", () => {
    const plan = buildPlan({ ...input, homeFinalUrl: null });
    expect(plan.canonicalBase).toEqual({ origin: "https://commentchercherbonheur.org", source: "stratégie" });
    expect(plan.organization.url).toBe("https://commentchercherbonheur.org/");
    expect(plan.warnings.some((w) => w.includes("base canonique"))).toBe(true);
  });
  test("audit sans couche stratégique : missing null, textes d'après les faits seuls, warning", () => {
    const plan = buildPlan({ ...input, strategyEval: null });
    expect(plan.pages[0].missing).toBeNull();
    expect(plan.pages[0].textes).toEqual(["title", "description"]);
    expect(plan.pages.find((p) => p.page === "/audit")?.textes).toEqual(["title", "description", "h1"]);
    expect(plan.warnings.some((w) => w.includes("sans couche stratégique"))).toBe(true);
  });
  test("page prévue absente de la collecte : current null, textes vides, warning hors build", () => {
    const plan = buildPlan({ ...input, pages: pages.filter((p) => p.slug !== "legal") });
    const legal = plan.pages.find((p) => p.page === "/legal")!;
    expect(legal.current).toBeNull();
    expect(legal.textes).toEqual([]);
    expect(plan.warnings.some((w) => w.includes("/legal") && w.includes("hors build"))).toBe(true);
  });
  test("page derrière un challenge anti-bot : non évaluée", () => {
    const plan = buildPlan({ ...input, pages: pages.map((p) => (p.slug === "methode" ? { ...p, challenge: true } : p)) });
    expect(plan.pages.find((p) => p.page === "/methode")?.textes).toEqual([]);
    expect(plan.warnings.some((w) => w.includes("/methode") && w.includes("anti-bot"))).toBe(true);
  });
  test("stack autre, sans IndexNow, avec NAP", () => {
    const s = { ...strategy, indexnow: null, entite: { ...strategy.entite, nap: { adresse: "1 rue du Port, 44000 Nantes", telephone: "+33 2 00 00 00 00" } } };
    const plan = buildPlan({ ...input, strategy: s, deps: ["astro"] });
    expect(plan.stack).toBe("autre");
    expect(plan.indexnow).toBeNull();
    expect(plan.organization).toMatchObject({ telephone: "+33 2 00 00 00 00", address: "1 rue du Port, 44000 Nantes" });
  });
});

describe("KINDS", () => {
  test("tout id du catalogue de vérifications a un genre explicite", async () => {
    const dir = `${import.meta.dir}/../../../audit/references/checks`;
    const ids: string[] = [];
    for (const f of (await readdir(dir)).filter((f) => f.endsWith(".md"))) ids.push(...parseChecks(await Bun.file(`${dir}/${f}`).text()).map((c) => c.id));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id in KINDS, `${id} sans genre dans KINDS`).toBe(true);
  });
  test("un id inconnu est hors build par défaut", () => {
    expect(kindOf("LVL1-01")).toEqual(DEFAULT_KIND);
    expect(kindOf("LVL1-01").kind).toBe("hors-build");
  });
  test("tout hors build dit où agir", () => {
    for (const [id, k] of Object.entries(KINDS)) if (k.kind === "hors-build") expect(k.ou, `${id} sans « ou »`).toBeTruthy();
  });
});
