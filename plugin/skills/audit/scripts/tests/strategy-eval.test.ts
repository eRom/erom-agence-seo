import { describe, test, expect } from "bun:test";
import { parseStrategy } from "../../../../lib/strategy";
import { VALID } from "../../../../lib/tests/fixtures/strategy-valide";
import { evaluateStrategy, lastKnownDate, normalizeUrl, parseDateLoose, pathOf, type PageFactsLike } from "../lib/strategy-eval";

const page = (over: Partial<PageFactsLike> & { url: string }): PageFactsLike => ({
  slug: pathOf(over.url) === "/" ? "index" : pathOf(over.url).slice(1), status: 200, title: null, h1: [], opening: "", organization: null,
  dateModified: null, lastModified: null, visibleDates: [], challenge: false, ...over,
});

const strategy = parseStrategy(VALID.replace("IndexNow : non", "IndexNow : a1b2c3d4e5f6"));
const org = { name: "L'Institut C.H.I.C.O.", description: "L'Institut C.H.I.C.O. est un centre de coaching qui vend le bonheur comme une science exacte.", sameAs: ["https://x.com/chico/", "https://www.tipeee.com/chico"] };
const HOME_TEXT = "Accueil. L'Institut C.H.I.C.O. est un centre de coaching qui vend le bonheur comme une science exacte. Suite.";

test("pathOf, normalizeUrl, parseDateLoose", () => {
  expect(pathOf("https://www.x.org/methode/")).toBe("/methode");
  expect(pathOf("https://www.x.org")).toBe("/");
  expect(normalizeUrl("https://X.com/chico/")).toBe("x.com/chico");
  expect(normalizeUrl("http://x.com/chico")).toBe("x.com/chico");
  expect(parseDateLoose("2026-06-12T09:00:00+02:00")).toBe("2026-06-12");
  expect(parseDateLoose("12/06/2026")).toBe("2026-06-12");
  expect(parseDateLoose("12 juin 2026")).toBe("2026-06-12");
  expect(parseDateLoose("1er août 2026")).toBe("2026-08-01");
  expect(parseDateLoose("Fri, 12 Jun 2026 07:00:00 GMT")).toBe("2026-06-12");
  expect(parseDateLoose("hier")).toBeNull();
  expect(parseDateLoose(null)).toBeNull();
});

test("lastKnownDate prend la plus récente", () => {
  expect(lastKnownDate(page({ url: "https://x.org/a", dateModified: "2026-06-12", lastModified: "Fri, 19 Jun 2026 07:00:00 GMT", visibleDates: ["12/06/2026"] }))).toBe("2026-06-19");
  expect(lastKnownDate(page({ url: "https://x.org/a" }))).toBeNull();
});

describe("evaluateStrategy", () => {
  const good = evaluateStrategy({
    strategy, strategyPath: "seo/strategy.md", today: "2026-08-28", homeText: HOME_TEXT,
    pages: [
      page({ url: "https://www.commentchercherbonheur.org/", title: "Institut C.H.I.C.O. : le bonheur", h1: ["L'Institut CHICO"], opening: "Bienvenue à l'Institut Chico", organization: org, dateModified: "2026-08-01" }),
      page({ url: "https://www.commentchercherbonheur.org/methode", title: "La méthode du bonheur", h1: ["Notre méthode bonheur"], opening: "La méthode C.H.I.C.O. rend le bonheur mesurable.", dateModified: "2026-03-01" }),
    ],
    indexnow: { status: 200, content: "a1b2c3d4e5f6\n" },
  });
  test("pages trouvées, mots-clés placés, cadence lue", () => {
    expect(good.pages[0]).toMatchObject({ page: "/", found: true, inTitle: true, inH1: true, inOpening: true, lastKnownDate: "2026-08-01", cadenceRespected: true });
    expect(good.pages[1]).toMatchObject({ page: "/methode", found: true, inTitle: true, inH1: true, inOpening: true, lastKnownDate: "2026-03-01", cadenceRespected: false });
  });
  test("identité, nom, sameAs, indexnow", () => {
    expect(good.identity).toMatchObject({ onHome: true, organizationPresent: true, inOrganization: true, nameMatches: true, organizationName: "L'Institut C.H.I.C.O." });
    expect(good.sameAs).toEqual([{ url: "https://x.com/chico", present: true }, { url: "https://www.tipeee.com/chico", present: true }]);
    expect(good.indexnow).toEqual({ declared: "a1b2c3d4e5f6", fetched: true, status: 200, contentMatches: true });
  });

  const bad = evaluateStrategy({
    strategy, strategyPath: "seo/strategy.md", today: "2026-08-28", homeText: "Accueil sans la phrase.",
    pages: [page({ url: "https://www.commentchercherbonheur.org/", title: "Bonheur asynchrone", h1: ["Bienvenue"], opening: "Rien ici", organization: { name: "Autre", description: "Autre chose", sameAs: [] } })],
    indexnow: { status: 404, content: null },
  });
  test("page absente, mots-clés manquants, identité absente, sameAs manquants, clé non servie", () => {
    expect(bad.pages[0]).toMatchObject({ page: "/", found: true, inTitle: false, inH1: false, inOpening: false, lastKnownDate: null, cadenceRespected: null });
    expect(bad.pages[1]).toMatchObject({ page: "/methode", found: false, status: null, inTitle: null, inH1: null, inOpening: null, cadenceRespected: null });
    expect(bad.identity).toMatchObject({ onHome: false, organizationPresent: true, inOrganization: false, nameMatches: false, organizationName: "Autre" });
    expect(bad.sameAs.every((s) => !s.present)).toBe(true);
    expect(bad.indexnow).toEqual({ declared: "a1b2c3d4e5f6", fetched: true, status: 404, contentMatches: false });
  });
  test("page en challenge ou en 404 = non trouvée ; sans Organization = rien de placé ; IndexNow non prévu = null", () => {
    const s2 = parseStrategy(VALID);
    const r = evaluateStrategy({
      strategy: s2, strategyPath: "seo/strategy.md", today: "2026-08-28", homeText: "",
      pages: [page({ url: "https://www.commentchercherbonheur.org/", challenge: true }), page({ url: "https://www.commentchercherbonheur.org/methode", status: 404 })],
      indexnow: { status: null, content: null },
    });
    expect(r.pages.map((p) => p.found)).toEqual([false, false]);
    // /  : trouvée sur disque mais protégée par un challenge -> challenge true, jamais une trouvaille STRAT-01.
    // /methode : vraiment absente de la collecte (404, pas un challenge) -> challenge false, distincte du cas ci-dessus
    // bien que les deux rendent found false.
    expect(r.pages.map((p) => p.challenge)).toEqual([true, false]);
    expect(r.identity).toMatchObject({ onHome: false, organizationPresent: false, inOrganization: false, nameMatches: false, organizationName: null });
    expect(r.indexnow).toEqual({ declared: null, fetched: false, status: null, contentMatches: null });
  });
  test("challenge distingue une page prévue jamais collectée (absente du disque) d'une page trouvée mais protégée", () => {
    const s2 = parseStrategy(VALID);
    const r = evaluateStrategy({
      strategy: s2, strategyPath: "seo/strategy.md", today: "2026-08-28", homeText: "",
      // seule la home a été collectée (en challenge) ; /methode n'a jamais été ajoutée à `pages`, comme une page
      // jamais fetchée (r.status === 0 côté collect.ts, absente de derived/pages.json).
      pages: [page({ url: "https://www.commentchercherbonheur.org/", challenge: true })],
      indexnow: { status: null, content: null },
    });
    expect(r.pages.map((p) => ({ page: p.page, found: p.found, challenge: p.challenge }))).toEqual([
      { page: "/", found: false, challenge: true },
      { page: "/methode", found: false, challenge: false },
    ]);
  });
});

describe("strategy-eval CLI", () => {
  test("écrit derived/strategy-eval.json depuis un dossier d'audit et une stratégie", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { startFixtureSite } = await import("./fixtures/site");
    const { runCollect } = await import("../collect");
    const s = startFixtureSite(0, { indexnowKey: "a1b2c3d4e5f6" });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-eval-"));
      const sp = join(o, "strategy.md");
      await Bun.write(sp, VALID.replace("IndexNow : non", "IndexNow : a1b2c3d4e5f6").replace("| /methode | informationnelle | méthode bonheur |", "| /b | informationnelle | page b |"));
      await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 5, delayMs: 0, psiKey: null, level: 0, strategyPath: sp });
      const r = Bun.spawnSync(["bun", `${import.meta.dir}/../strategy-eval.ts`, o, "--strategy", sp, "--today", "2026-08-28"]);
      expect(r.exitCode).toBe(0);
      const ev = JSON.parse(await Bun.file(join(o, "derived/strategy-eval.json")).text());
      expect(ev.pages.map((p: { page: string; found: boolean }) => [p.page, p.found])).toEqual([["/", true], ["/b", true]]);
      // /b a dateModified 2026-06-12 ; au 2026-08-28 l'écart réel est de 77 jours, sous le seuil trimestriel de 92 jours
      // (cadenceDays("trimestriel") === 92) : la cadence est respectée.
      expect(ev.pages[1]).toMatchObject({ inTitle: true, inH1: true, lastKnownDate: "2026-06-12", cadenceRespected: true });
      expect(ev.identity.organizationPresent).toBe(true);
      expect(ev.indexnow).toEqual({ declared: "a1b2c3d4e5f6", fetched: true, status: 200, contentMatches: true });
      expect(r.stdout.toString()).toContain("évaluation stratégique");
    } finally { s.stop(true); }
  });

  test("dossier d'audit inexistant : erreur lisible, pas de stack", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const o = await mkdtemp(join(tmpdir(), "erom-seo-eval-"));
    const sp = join(o, "strategy.md");
    await Bun.write(sp, VALID);
    const r = Bun.spawnSync(["bun", `${import.meta.dir}/../strategy-eval.ts`, join(o, "absent"), "--strategy", sp, "--today", "2026-08-28"]);
    const stderr = r.stderr.toString();
    expect(r.exitCode).toBe(1);
    expect(stderr.startsWith("erreur :")).toBe(true);
    expect(stderr).not.toContain("    at ");
  });

  test("stratégie invalide : erreur « inanalysable », sans lire le dossier d'audit", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const o = await mkdtemp(join(tmpdir(), "erom-seo-eval-"));
    const sp = join(o, "strategy.md");
    await Bun.write(sp, VALID.replace("IndexNow : non", "IndexNow : abc"));
    const r = Bun.spawnSync(["bun", `${import.meta.dir}/../strategy-eval.ts`, o, "--strategy", sp, "--today", "2026-08-28"]);
    const stderr = r.stderr.toString();
    expect(r.exitCode).toBe(1);
    expect(stderr).toContain("inanalysable");
  });
});
