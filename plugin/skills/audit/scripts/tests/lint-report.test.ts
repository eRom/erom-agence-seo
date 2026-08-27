import { describe, test, expect } from "bun:test";
import { readdir } from "node:fs/promises";
import { parseChecks, type Check } from "../lib/checks";
import { lintReport } from "../lint-report";

const checksDir = `${import.meta.dir}/../../references/checks`;
const files = (await readdir(checksDir)).filter((f) => f.endsWith(".md"));
const all: Check[] = [];
for (const f of files) all.push(...parseChecks(await Bun.file(`${checksDir}/${f}`).text()));
const level0 = all.filter((c) => c.niveau === 0);

/** Rapport synthétique minimal, conforme à toutes les règles existantes du lint (sections présentes, aucune
 * trouvaille), avec les ids donnés listés dans « Vérifications passées ». */
function report(ids: Check[]): string {
  const passed = ids.map((c) => `${c.id} ${c.title}`).join("\n");
  return [
    "# Audit SEO/GEO : exemple.test",
    "2026-08-27 · Niveau 0 (URL seule) · 1 pages collectées · 26 vérifications",
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
    "Niveau 2, avec le code et la stratégie : aucun",
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
    const errors = await lintReport(report(level0), checksDir);
    expect(errors).toEqual([]);
  });

  test("un rapport auquel il manque un id est rejeté, avec un message qui le nomme", async () => {
    const missing = level0[0];
    const errors = await lintReport(report(level0.slice(1)), checksDir);
    expect(errors.some((e) => e.includes(missing.id) && e.includes("absent"))).toBe(true);
  });

  test("un id présent à la fois en passée et en trouvaille est rejeté", async () => {
    const dup = level0[0];
    const md = report(level0).replace(
      "## Trouvailles\n",
      `## Trouvailles\n\n### [Info] ${dup.id} : ${dup.title}\nPreuve    : raw/manifest.json\nPourquoi  : exemple de test\nSource    : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « All formats limit a single sitemap to 50MB (uncompressed) or 50,000 URLs. »\nCorrectif : exemple de test\nEffort    : rapide\n`,
    );
    const errors = await lintReport(md, checksDir);
    expect(errors.some((e) => e.includes(dup.id) && e.includes("plus d'une section"))).toBe(true);
  });
});
