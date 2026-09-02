import { describe, test, expect } from "bun:test";
import { readdir } from "node:fs/promises";
import { parseChecks, type Check } from "../lib/checks";
import { lintReport } from "../lint-report";

const checksDir = `${import.meta.dir}/../../references/checks`;
const files = (await readdir(checksDir)).filter((f) => f.endsWith(".md"));
const all: Check[] = [];
for (const f of files) all.push(...parseChecks(await Bun.file(`${checksDir}/${f}`).text()));
const absolute0 = all.filter((c) => c.niveau === 0 && c.couche === "absolue");
const strategic = all.filter((c) => c.couche === "stratégique");
// STRAT-05 (niveau 1) est stratégique mais hors périmètre d'un rapport niveau 0 : les tests ci-dessous, qui
// fixent le niveau à 0, se limitent à ce sous-ensemble pour rester en phase avec expectedIds().
const strategic0 = strategic.filter((c) => c.niveau === 0);

/** Rapport synthétique minimal, conforme à toutes les règles existantes du lint (sections présentes, aucune
 * trouvaille), avec les ids donnés listés dans « Vérifications passées ». */
function report(ids: Check[], head = `2026-08-27 · Niveau 0 (URL seule) · Couche stratégique : non · 1 pages collectées · ${absolute0.length} vérifications`): string {
  const passed = ids.map((c) => `${c.id} ${c.title}`).join("\n");
  return [
    "# Audit SEO/GEO : exemple.test",
    head,
    "Stack détecté : inconnu (Info)",
    "",
    "## En bref",
    "0 Critique · 0 Important · 0 Mineur · 0 Info",
    "Les trois choses à dire en RDV :",
    "1. rien à signaler",
    "2. rien à signaler",
    "3. rien à signaler",
    "",
    "## Trouvailles",
    "",
    "## Ce que je n'ai pas pu voir",
    "Niveau 1, avec les accès : aucun",
    "Couche stratégique, avec seo/strategy.md : aucune",
    "",
    "## Vérifications passées",
    passed,
    "",
    "## Annexe : collecte",
    "| Ressource | URL | Statut | Octets | Fichier |",
    "|---|---|---|---|---|",
  ].join("\n");
}

describe("lint-report : invariant R-1 (chaque vérification de niveau 0 exactement une fois)", () => {
  test("un rapport où chaque id de niveau 0 apparaît une fois est accepté", async () => {
    const errors = await lintReport(report(absolute0), checksDir);
    expect(errors).toEqual([]);
  });

  test("un rapport auquel il manque un id est rejeté, avec un message qui le nomme", async () => {
    const missing = absolute0[0];
    const errors = await lintReport(report(absolute0.slice(1)), checksDir);
    expect(errors.some((e) => e.includes(missing.id) && e.includes("absent"))).toBe(true);
  });

  test("un id noté « non applicable » dans « Ce que je n'ai pas pu voir » (absent des trouvailles et des passées) est accepté", async () => {
    const skipped = absolute0[0];
    const rest = absolute0.slice(1);
    const md = report(rest).replace(
      "Couche stratégique, avec seo/strategy.md : aucune\n",
      `Couche stratégique, avec seo/strategy.md : aucune\n${skipped.id} non applicable, exemple de test\n`,
    );
    const errors = await lintReport(md, checksDir);
    expect(errors).toEqual([]);
  });

  test("un id présent à la fois en passée et en trouvaille est rejeté", async () => {
    const dup = absolute0[0];
    const md = report(absolute0).replace(
      "## Trouvailles\n",
      `## Trouvailles\n\n### [Info] ${dup.id} : ${dup.title}\nPreuve    : raw/manifest.json\nPourquoi  : exemple de test\nSource    : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « All formats limit a single sitemap to 50MB (uncompressed) or 50,000 URLs. »\nCorrectif : exemple de test\nEffort    : rapide\n`,
    );
    const errors = await lintReport(md, checksDir);
    expect(errors.some((e) => e.includes(dup.id) && e.includes("plus d'une section"))).toBe(true);
  });
});

describe("lint-report : couche stratégique et niveau", () => {
  test("en-tête sans « Couche stratégique » refusé", async () => {
    const errors = await lintReport(report(absolute0, "2026-08-27 · Niveau 0 (URL seule) · 1 pages collectées · 26 vérifications"), checksDir);
    expect(errors.some((e) => e.includes("Couche stratégique"))).toBe(true);
  });
  test("couche active : les vérifications stratégiques sont exigées", async () => {
    const head = `2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : oui (seo/strategy.md, brouillon, 2026-08-28) · 10 pages collectées · ${absolute0.length + strategic0.length} vérifications`;
    const missing = await lintReport(report(absolute0, head), checksDir);
    for (const c of strategic0) expect(missing.some((e) => e.includes(c.id) && e.includes("absent")), c.id).toBe(true);
    expect(await lintReport(report([...absolute0, ...strategic0], head), checksDir)).toEqual([]);
  });
  test("couche inactive : une vérification stratégique en passée est une erreur, en non vue est acceptée", async () => {
    const s = strategic[0];
    const errors = await lintReport(report([...absolute0, s]), checksDir);
    expect(errors.some((e) => e.includes(s.id))).toBe(true);
    const md = report(absolute0).replace("Couche stratégique, avec seo/strategy.md : aucune\n", `Couche stratégique, avec seo/strategy.md : aucune\n${s.id} ${s.title}, pas de seo/strategy.md\n`);
    expect(await lintReport(md, checksDir)).toEqual([]);
  });
  test("couche active : le nombre de vérifications annoncé correspond à l'union", async () => {
    const head = `2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : oui (seo/strategy.md, brouillon, 2026-08-28) · 10 pages collectées · ${absolute0.length + strategic0.length} vérifications`;
    expect(await lintReport(report([...absolute0, ...strategic0], head), checksDir)).toEqual([]);
  });
  test("nombre de vérifications annoncé faux : rejeté", async () => {
    const head = `2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : oui (seo/strategy.md, brouillon, 2026-08-28) · 10 pages collectées · ${absolute0.length} vérifications`;
    const errors = await lintReport(report([...absolute0, ...strategic], head), checksDir);
    expect(errors.some((e) => e.includes("attendues"))).toBe(true);
  });
  test("en-tête sans « vérifications » : rejeté", async () => {
    const head = "2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : non · 10 pages collectées";
    const errors = await lintReport(report(absolute0, head), checksDir);
    expect(errors.some((e) => e.includes("nombre de vérifications manquant"))).toBe(true);
  });
  test("niveau 2 : PERF-01, IDX-03 et IDX-04 acceptés en non vues avec leur raison", async () => {
    const head = `2026-08-28 · Niveau 2 (site en local) · Couche stratégique : non · 10 pages collectées · ${absolute0.length} vérifications`;
    const na = ["PERF-01", "IDX-03", "IDX-04"];
    const rest = absolute0.filter((c) => !na.includes(c.id));
    const md = report(rest, head).replace("Couche stratégique, avec seo/strategy.md : aucune\n", `Couche stratégique, avec seo/strategy.md : aucune\n${na.map((id) => `${id} non applicable en local`).join("\n")}\n`);
    expect(await lintReport(md, checksDir)).toEqual([]);
  });
});
