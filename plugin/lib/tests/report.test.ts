import { describe, test, expect } from "bun:test";
import { mkdtemp, mkdir, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestAuditDir, parseReport, ReportError } from "../report";

const CHICO = await Bun.file(`${import.meta.dir}/fixtures/report-chico-n0.md`).text();

const MINIMAL = `# Audit SEO/GEO : https://exemple.test
2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : non · 1 pages collectées · 26 vérifications
Stack détecté : inconnu (Info)

## En bref
1 Critique · 0 Important · 0 Mineur · 0 Info

## Trouvailles

### [Critique] ROBOTS-02 : bloque un bot de récupération
Preuve    : raw/robots.txt, ligne 2
Pourquoi  : les réponses IA ne peuvent plus citer le site.
Source    : https://developers.openai.com/api/docs/bots « OAI-SearchBot »
Correctif : retirer le groupe
            sur deux lignes
Effort    : rapide

## Ce que je n'ai pas pu voir
Niveau 1 : LVL1-01, LVL1-02.

## Vérifications passées
ROBOTS-01 robots.txt présent et lisible

## Annexe : collecte
`;

describe("parseReport sur le vrai rapport de chico (niveau 0, 28/08)", () => {
  const r = parseReport(CHICO);
  test("en-tête", () => {
    expect(r.site).toBe("https://www.commentchercherbonheur.org");
    expect(r.date).toBe("2026-08-28");
    expect(r.niveau).toBe(0);
    expect(r.couche).toBe(true);
    expect(r.nbPages).toBe(10);
    expect(r.nbChecks).toBe(31);
  });
  test("trouvailles et comptes", () => {
    expect(r.findings).toHaveLength(13);
    expect(r.counts).toEqual({ Critique: 0, Important: 6, Mineur: 6, Info: 1 });
    expect(r.findings.map((f) => f.id)).toEqual(["SD-01", "SD-02", "IDX-02", "TAG-01", "STRAT-01", "STRAT-02", "SD-03", "IDX-04", "TAG-02", "TAG-03", "STRAT-03", "AI-02", "AI-01"]);
    expect(r.findings[0]).toMatchObject({ severity: "Important", id: "SD-01", effort: "moyen" });
    expect(r.findings[0].title).toBe("Aucune donnée structurée (JSON-LD) sur les 10 pages collectées");
  });
  test("un Correctif sur plusieurs lignes revient entier (SD-02, un JSON indenté)", () => {
    const sd02 = r.findings.find((f) => f.id === "SD-02")!;
    expect(sd02.correctif.startsWith("ajouter sur la home")).toBe(true);
    expect(sd02.correctif).toContain('"@type": "Organization"');
    expect(sd02.correctif).toContain("https://www.romain-ecarnot.com/");
    expect(sd02.effort).toBe("rapide");
  });
  test("passées et non vues", () => {
    expect(r.passed).toHaveLength(14);
    expect(r.passed).toContain("ROBOTS-01");
    expect(r.passed).toContain("REND-01");
    expect(r.notSeen).toContain("PERF-01");
  });
});

describe("parseReport, cas limites", () => {
  test("rapport minimal conforme au gabarit", () => {
    const r = parseReport(MINIMAL);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].correctif).toBe("retirer le groupe\n            sur deux lignes");
    expect(r.counts.Critique).toBe(1);
    expect(r.passed).toEqual(["ROBOTS-01"]);
  });
  test("première ligne absente : ReportError qui la nomme", () => {
    expect(() => parseReport(MINIMAL.replace("# Audit SEO/GEO : https://exemple.test", "# Rapport"))).toThrow(ReportError);
    try { parseReport(MINIMAL.replace("# Audit SEO/GEO : https://exemple.test", "# Rapport")); } catch (e) { expect((e as ReportError).errors[0]).toContain("première ligne"); }
  });
  test("champ manquant dans une trouvaille : ReportError avec l'id", () => {
    try { parseReport(MINIMAL.replace("Effort    : rapide\n", "")); expect.unreachable(); } catch (e) { expect((e as ReportError).errors).toContain("ROBOTS-02 : champ Effort manquant"); }
  });
});

describe("latestAuditDir", () => {
  test("le dernier dossier qui a un report.md, par date puis par modification ; niveau et fichier filtrables", async () => {
    const seo = await mkdtemp(join(tmpdir(), "erom-seo-audits-"));
    const mk = async (name: string, files: string[]) => { for (const f of files) { await mkdir(join(seo, "audits", name, f.split("/").slice(0, -1).join("/")), { recursive: true }); await Bun.write(join(seo, "audits", name, f), "x"); } };
    await mk("2026-08-27-n0", ["report.md", "raw/manifest.json"]);
    await mk("2026-08-28-n2", ["raw/manifest.json"]);          // collecté sans rapport : ignoré
    await mk("2026-08-28-n0", ["report.md", "raw/manifest.json"]);
    await mk("2026-08-28-n2-2", ["report.md", "raw/manifest.json"]);   // écrit après le n0 du même jour
    await mk("notes", ["report.md"]);                          // nom hors format : ignoré

    // Set equal mtimes for 2026-08-28-n0 and 2026-08-28-n2-2 to test name-based tie-breaking
    const n0Path = join(seo, "audits", "2026-08-28-n0", "report.md");
    const n22Path = join(seo, "audits", "2026-08-28-n2-2", "report.md");
    const now = Date.now();
    const timeInS = Math.floor(now / 1000); // Time in seconds
    await utimes(n0Path, timeInS, timeInS);
    await utimes(n22Path, timeInS, timeInS);

    expect(await latestAuditDir(seo)).toBe(join(seo, "audits", "2026-08-28-n2-2"));
    expect(await latestAuditDir(seo, { level: 0 })).toBe(join(seo, "audits", "2026-08-28-n0"));
    expect(await latestAuditDir(seo, { level: 2, file: "raw/manifest.json" })).toBe(join(seo, "audits", "2026-08-28-n2-2"));
    expect(await latestAuditDir(seo, { level: 1 })).toBeNull();
    expect(await latestAuditDir(join(seo, "absent"))).toBeNull();
  });
});
