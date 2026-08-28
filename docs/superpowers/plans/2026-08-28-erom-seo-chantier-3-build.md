# Plan d'implémentation : erom-seo, chantier 3, `build`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer `/erom-seo:build` : à partir de `seo/strategy.md` et du dernier audit, un plan machine des trouvailles ouvertes, une table de textes validée par Romain, un commit par trouvaille dans le code du site (Next.js App Router d'abord), puis un audit niveau 2 relancé en boucle jusqu'à zéro Critique et zéro Important.

**Architecture:** Un parseur partagé lit le rapport d'audit (`plugin/lib/report.ts`, D22). `plan.ts` joint stratégie, rapport et JSON dérivés en `derived/build-plan.json` (trouvailles classées code, texte ou hors build par une table fixe, D19 ; valeurs réelles par page ; bloc Organization prêt ; base canonique = l'hôte observé, D21). La skill `build` fait le reste : table validée puis autonome (D16), serveur local et audit niveau 2 en boucle (D17), recettes Next.js par id de trouvaille avec citations vérifiées par `check-sources.ts`.

**Tech Stack:** Bun 1.4.0, TypeScript, `bun:test`. Aucune dépendance nouvelle. Cobaye : Next.js 16.1.1 (chico-happiness).

**Spec:** `docs/superpowers/specs/2026-08-28-erom-seo-build-design.md` (lue en entier avant de commencer). Spec mère : `docs/superpowers/specs/2026-08-27-erom-seo-design.md` (D1 à D8, section 6.2). API Next.js 16 vérifiée : `docs/recherches/2026-08-28-nextjs-16-seo-api.md`.

## Contraintes globales

- Runtime `bun` uniquement. Jamais `npm`, `npx`, `node` : un garde-fou local les bloque. `bun x tsc` est permis.
- Aucun service payant, aucune clé nouvelle. Rien n'est jamais poussé.
- Références, gabarits, SKILL.md, README en français, sans tiret cadratin (em dash) : ces textes partent chez des tiers. Citations de documentation en anglais, mot pour mot, entre « ». `recipes.test.ts` refuse un em dash dans `nextjs.md`.
- D5 de la spec mère, étendu : une recette sans `Source` retrouvée par `check-sources.ts` ne se livre pas. Domaines admis pour les recettes : `BUILD_DOMAINS` (nextjs.org, vercel.com, react.dev, plus `OFFICIAL_DOMAINS`). Un rapport d'audit, lui, ne cite jamais nextjs.org.
- Genres (spec 5.3) : `code` (build corrige), `texte` (h1 et première phrase, valeurs validées seulement), `hors-build` (hébergeur, DNS, performance, contenu, niveau 1 : listé avec `ou`). AI-01 (Info) n'entre jamais dans le plan.
- **Git : travailler dans un worktree, jamais `git switch` ni `git checkout` dans `/Users/recarnot/dev/erom-agence-seo`** (checkout partagé avec la session mère ; incident du 28/08). Tâche 1 : `git -C /Users/recarnot/dev/erom-agence-seo worktree add /Users/recarnot/dev/erom-agence-seo-chantier-3 -b chantier-3-build main`, puis tout se passe dans `/Users/recarnot/dev/erom-agence-seo-chantier-3`. Un commit par tâche, message en français, préfixes `feat(build):`, `feat(lib):`, `test(…):`, `docs(…):`. Pas de fusion : la session mère relit et fusionne.
- Toute commande de ce plan se lance depuis `/Users/recarnot/dev/erom-agence-seo-chantier-3/plugin` sauf mention contraire. Tests : `bun test`.
- Interdits dans les tests : lire le code source depuis un test, figer un compte de catalogue, asserter sur un mock plutôt que sur un comportement. Les fixtures sont les vrais fichiers de chico du 28/08, copiés une fois (tâche 1), jamais modifiés.
- Le code TypeScript des tâches 1, 2, 3, 4 a été exécuté avec ses tests avant l'écriture du plan (27 tests verts, scratchpad du 28/08), et les 23 citations de `nextjs.md` retrouvées par le même mécanisme que `check-sources.ts` (80 retrouvées avec celles de l'audit, 0 en échec). Les imports y étaient absolus ; les chemins relatifs ci-dessous sont recalculés pour l'arborescence du plugin : si un import casse, le test de la tâche fait foi, corriger le chemin, pas le code.
- Ne rien modifier dans `/Users/recarnot/dev/chico-happiness` avant la tâche 6, et seulement ce que la tâche dit.

## Structure des fichiers

```
plugin/
  README.md                                       modifier : section « Construire » (tâche 5)
  lib/
    report.ts                                     créer : parseReport, latestAuditDir (tâche 1)
    tests/report.test.ts                          créer
    tests/fixtures/report-chico-n0.md             copié depuis chico (tâche 1)
  skills/
    audit/scripts/check-sources.ts                modifier : vérifie aussi les recettes (tâche 4)
    build/
      SKILL.md                                    créer (tâche 5)
      references/nextjs.md                        créer (tâche 4)
      references/autre-stack.md                   créer (tâche 4)
      scripts/
        plan.ts                                   créer : CLI (tâche 3)
        lib/plan.ts                               créer : buildPlan, KINDS, planSummary (tâche 2)
        lib/recipes.ts                            créer : parseRecipes, BUILD_DOMAINS (tâche 4)
        tests/plan.test.ts                        créer (tâche 2)
        tests/plan-cli.test.ts                    créer (tâche 3)
        tests/recipes.test.ts                     créer (tâche 4)
        tests/fixtures/chico/strategy.md          copiés depuis chico (tâche 1)
        tests/fixtures/chico/report.md
        tests/fixtures/chico/manifest.json
        tests/fixtures/chico/pages.json
        tests/fixtures/chico/strategy-eval.json
docs/superpowers/plans/2026-08-28-erom-seo-chantier-3-recette.md   créer (tâche 6)
```

Rien ne change dans `collect.ts`, `strategy-eval.ts`, `lint-report.ts`, `lib/strategy.ts`, `references/checks/`.

---

### Tâche 1 : worktree, fixtures réelles, parseur de rapport

**Files:**
- Create: `plugin/lib/report.ts`
- Create: `plugin/lib/tests/report.test.ts`
- Create: `plugin/lib/tests/fixtures/report-chico-n0.md`
- Create: `plugin/skills/build/scripts/tests/fixtures/chico/{strategy.md, report.md, manifest.json, pages.json, strategy-eval.json}`

**Interfaces:**
- Consumes : rien du plugin (node:fs, Bun.file).
- Produces : `parseReport(md: string): Report`, `latestAuditDir(seoDir = "seo", opts?: { level?: number; file?: string }): Promise<string | null>`, types `Severity`, `Finding`, `Report`, classe `ReportError { errors: string[] }`, constante `SEVERITIES`.

- [ ] **Étape 1 : le worktree**

```bash
git -C /Users/recarnot/dev/erom-agence-seo worktree add /Users/recarnot/dev/erom-agence-seo-chantier-3 -b chantier-3-build main
cd /Users/recarnot/dev/erom-agence-seo-chantier-3/plugin && bun install --frozen-lockfile && bun test
```
Attendu : 178 tests verts (l'état de `main` à `eabf8d0` ou après). `git -C /Users/recarnot/dev/erom-agence-seo branch --show-current` rend toujours `main`.

- [ ] **Étape 2 : copier les fixtures réelles**

```bash
W=/Users/recarnot/dev/erom-agence-seo-chantier-3/plugin
C=/Users/recarnot/dev/chico-happiness/seo
mkdir -p $W/lib/tests/fixtures $W/skills/build/scripts/tests/fixtures/chico
cp $C/audits/2026-08-28-n0/report.md $W/lib/tests/fixtures/report-chico-n0.md
cp $C/strategy.md $W/skills/build/scripts/tests/fixtures/chico/strategy.md
cp $C/audits/2026-08-28-n0/report.md $W/skills/build/scripts/tests/fixtures/chico/report.md
cp $C/audits/2026-08-28-n0/raw/manifest.json $W/skills/build/scripts/tests/fixtures/chico/manifest.json
cp $C/audits/2026-08-28-n0/derived/pages.json $W/skills/build/scripts/tests/fixtures/chico/pages.json
cp $C/audits/2026-08-28-n0/derived/strategy-eval.json $W/skills/build/scripts/tests/fixtures/chico/strategy-eval.json
grep -c "^### \[" $W/lib/tests/fixtures/report-chico-n0.md
```
Attendu : `13`. Ces fichiers ne se modifient jamais : ce sont des échantillons.

- [ ] **Étape 3 : le test qui échoue**

`plugin/lib/tests/report.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { mkdtemp, mkdir } from "node:fs/promises";
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
    expect(await latestAuditDir(seo)).toBe(join(seo, "audits", "2026-08-28-n2-2"));
    expect(await latestAuditDir(seo, { level: 0 })).toBe(join(seo, "audits", "2026-08-28-n0"));
    expect(await latestAuditDir(seo, { level: 2, file: "raw/manifest.json" })).toBe(join(seo, "audits", "2026-08-28-n2-2"));
    expect(await latestAuditDir(seo, { level: 1 })).toBeNull();
    expect(await latestAuditDir(join(seo, "absent"))).toBeNull();
  });
});
```

- [ ] **Étape 4 : le voir échouer**

Run : `bun test lib/tests/report.test.ts`
Attendu : échec, `Cannot find module "../report"`.

- [ ] **Étape 5 : `plugin/lib/report.ts`**

```ts
// Lecture du rapport d'audit (report.md). Le format est tenu par skills/audit/scripts/lint-report.ts ; ce parseur suit
// les mêmes règles. Partagé par build (chantier 3) et launch (chantier 4).
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export type Severity = "Critique" | "Important" | "Mineur" | "Info";
export const SEVERITIES: readonly Severity[] = ["Critique", "Important", "Mineur", "Info"];
export type Finding = { severity: Severity; id: string; title: string; preuve: string; pourquoi: string; source: string; correctif: string; effort: string };
export type Report = {
  site: string; date: string; niveau: number; couche: boolean; nbPages: number; nbChecks: number;
  findings: Finding[]; passed: string[]; notSeen: string; counts: Record<Severity, number>;
};

export class ReportError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "ReportError"; }
}

const FIELDS = ["Preuve", "Pourquoi", "Source", "Correctif", "Effort"] as const;
const FIELD_LINE = /^(Preuve|Pourquoi|Source|Correctif|Effort)\s*:\s?(.*)$/;

/** Contenu d'une section `## titre` jusqu'au prochain `## ` (ou la fin), chaîne vide si absente. */
function section(md: string, heading: string): string {
  const i = md.indexOf(heading);
  if (i < 0) return "";
  const rest = md.slice(i + heading.length);
  const next = rest.search(/\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

function parseFindings(sec: string, errors: string[]): Finding[] {
  const out: Finding[] = [];
  for (const block of sec.split(/^### \[/m).slice(1)) {
    const [head, ...rest] = block.split("\n");
    const m = head.match(/^(Critique|Important|Mineur|Info)\]\s+([A-Z]+-\d{2})\s*:\s*(.+)$/);
    if (!m) { errors.push(`en-tête de trouvaille mal formé : ${head}`); continue; }
    const fields: Record<string, string> = {};
    let cur: string | null = null;
    for (const line of rest) {
      const f = line.match(FIELD_LINE);
      if (f) { cur = f[1]; fields[cur] = f[2]; continue; }
      // ligne de continuation (un Correctif sur plusieurs lignes, un JSON indenté) : rattachée au champ courant
      if (cur !== null && line.trim() !== "") fields[cur] += `\n${line.trimEnd()}`;
    }
    for (const name of FIELDS) if (fields[name] === undefined) errors.push(`${m[2]} : champ ${name} manquant`);
    out.push({
      severity: m[1] as Severity, id: m[2], title: m[3].trim(),
      preuve: (fields.Preuve ?? "").trim(), pourquoi: (fields.Pourquoi ?? "").trim(), source: (fields.Source ?? "").trim(),
      correctif: (fields.Correctif ?? "").trim(), effort: (fields.Effort ?? "").trim(),
    });
  }
  return out;
}

/** Lit un rapport conforme au gabarit. Lève ReportError si l'en-tête ou un bloc de trouvaille est illisible. */
export function parseReport(md: string): Report {
  const errors: string[] = [];
  const lines = md.split("\n");
  const site = lines[0]?.match(/^# Audit SEO\/GEO : (.+)$/)?.[1]?.trim();
  if (!site) errors.push("première ligne : « # Audit SEO/GEO : <site> » attendu");
  const head = lines.slice(0, 3).join("\n");
  const date = head.match(/(\d{4}-\d{2}-\d{2}) · Niveau/)?.[1];
  const niveau = head.match(/Niveau (\d)/)?.[1];
  const couche = head.match(/Couche stratégique : (oui|non)/)?.[1];
  const nbPages = head.match(/(\d+) pages? collectées?/)?.[1];
  const nbChecks = head.match(/(\d+) vérifications/)?.[1];
  if (!date || !niveau || !couche || !nbPages || !nbChecks) errors.push("en-tête : date, Niveau, Couche stratégique, pages collectées ou vérifications manquant dans les trois premières lignes");
  const findings = parseFindings(section(md, "## Trouvailles"), errors);
  const passed = [...section(md, "## Vérifications passées").matchAll(/^([A-Z]+-\d{2})\b/gm)].map((m) => m[1]);
  const notSeen = section(md, "## Ce que je n'ai pas pu voir").trim();
  if (errors.length) throw new ReportError(errors);
  const counts: Record<Severity, number> = { Critique: 0, Important: 0, Mineur: 0, Info: 0 };
  for (const f of findings) counts[f.severity]++;
  return { site: site!, date: date!, niveau: Number(niveau), couche: couche === "oui", nbPages: Number(nbPages), nbChecks: Number(nbChecks), findings, passed, notSeen, counts };
}

/**
 * Dernier dossier d'audit sous `<seoDir>/audits/` qui contient `file` (report.md par défaut) : par date du nom, puis par
 * date de modification du fichier (deux audits le même jour, niveaux 0 et 2 : le dernier écrit gagne). `level` restreint
 * au niveau demandé. Rend null s'il n'y en a aucun.
 */
export async function latestAuditDir(seoDir = "seo", opts: { level?: number; file?: string } = {}): Promise<string | null> {
  const file = opts.file ?? "report.md";
  const dir = join(seoDir, "audits");
  let names: string[];
  try { names = await readdir(dir); } catch { return null; }
  const found: { dir: string; date: string; mtime: number }[] = [];
  for (const n of names) {
    const m = n.match(/^(\d{4}-\d{2}-\d{2})-n(\d)(?:-\d+)?$/);
    if (!m || (opts.level !== undefined && Number(m[2]) !== opts.level)) continue;
    const f = Bun.file(join(dir, n, file));
    if (!(await f.exists())) continue;
    found.push({ dir: join(dir, n), date: m[1], mtime: f.lastModified });
  }
  found.sort((a, b) => a.date.localeCompare(b.date) || a.mtime - b.mtime);
  return found.at(-1)?.dir ?? null;
}
```

- [ ] **Étape 6 : le voir passer**

Run : `bun test lib/tests/report.test.ts`
Attendu : 8 tests verts. Puis `bun test` : tout vert.

- [ ] **Étape 7 : commit**

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3
git add plugin/lib/report.ts plugin/lib/tests/report.test.ts plugin/lib/tests/fixtures/report-chico-n0.md plugin/skills/build/scripts/tests/fixtures/chico
git commit -m "feat(lib): parseur du rapport d'audit et dernier dossier d'audit, fixtures réelles de chico"
```

---

### Tâche 2 : le plan pur (`buildPlan`, `KINDS`)

**Files:**
- Create: `plugin/skills/build/scripts/lib/plan.ts`
- Create: `plugin/skills/build/scripts/tests/plan.test.ts`

**Interfaces:**
- Consumes : `Strategy` (`plugin/lib/strategy.ts`), `Report`, `Severity` (tâche 1), `Manifest`, `PageFacts` (`skills/audit/scripts/lib/types.ts`), `pathOf`, `StrategyEval` (`skills/audit/scripts/lib/strategy-eval.ts`).
- Produces : `buildPlan(input: BuildPlanInput): BuildPlan`, `planSummary(plan: BuildPlan): string`, `KINDS: Record<string, KindEntry>`, `DEFAULT_KIND`, `kindOf(id): KindEntry`, types `Kind`, `KindEntry`, `PlanFinding`, `PlanPage`, `TexteField`, `Organization`, `BuildPlan`, `BuildPlanInput`.

- [ ] **Étape 1 : le test qui échoue**

`plugin/skills/build/scripts/tests/plan.test.ts` :

```ts
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
```

- [ ] **Étape 2 : le voir échouer**

Run : `bun test skills/build/scripts/tests/plan.test.ts`
Attendu : échec, `Cannot find module "../lib/plan"`.

- [ ] **Étape 3 : `plugin/skills/build/scripts/lib/plan.ts`**

```ts
// Logique pure de plan.ts : joint la stratégie, le rapport et les faits collectés en un plan de build. Aucun réseau, aucun disque.
import type { Strategy } from "../../../../lib/strategy";
import type { Report, Severity } from "../../../../lib/report";
import type { Manifest, PageFacts } from "../../../audit/scripts/lib/types";
import { pathOf, type StrategyEval } from "../../../audit/scripts/lib/strategy-eval";

export type Kind = "code" | "texte" | "hors-build";
export type KindEntry = { kind: Kind; ou?: string };

/** Genre de chaque vérification du catalogue (spec chantier 3, D19 et 5.3). `ou` : où agir quand build ne peut pas. */
export const KINDS: Record<string, KindEntry> = {
  "ROBOTS-01": { kind: "code" }, "ROBOTS-02": { kind: "code" }, "ROBOTS-03": { kind: "code" }, "ROBOTS-04": { kind: "code" }, "ROBOTS-05": { kind: "code" }, "ROBOTS-06": { kind: "code" },
  "SNIP-01": { kind: "code" }, "SNIP-02": { kind: "code" }, "SNIP-03": { kind: "code" },
  "IDX-01": { kind: "code" }, "IDX-02": { kind: "code" }, "IDX-05": { kind: "code" },
  "IDX-03": { kind: "hors-build", ou: "certificat et redirection HTTP vers HTTPS chez l'hébergeur (Vercel : automatique)" },
  "IDX-04": { kind: "hors-build", ou: "Vercel : Project Settings, Domains, « Redirect to » sur le domaine secondaire ; ailleurs : le DNS ou la configuration de l'hébergeur. next.config n'est pas le bon endroit" },
  "SD-01": { kind: "code" }, "SD-02": { kind: "code" }, "SD-03": { kind: "code" },
  "TAG-01": { kind: "code" }, "TAG-02": { kind: "code" }, "TAG-04": { kind: "code" },
  "TAG-03": { kind: "texte" },
  "FRESH-01": { kind: "code" }, "FRESH-02": { kind: "code" },
  "REND-01": { kind: "code" },
  "PERF-01": { kind: "hors-build", ou: "PageSpeed Insights (pagespeed.web.dev) pour lire les données de terrain, puis un chantier de performance à part" },
  "AI-01": { kind: "hors-build", ou: "sans effet sur Google ; un llms.txt ne se justifie que pour un site de documentation" },
  "AI-02": { kind: "code" },
  "STRAT-01": { kind: "texte" }, "STRAT-02": { kind: "texte" }, "STRAT-03": { kind: "code" },
  "STRAT-04": { kind: "hors-build", ou: "calendrier éditorial : mettre à jour le contenu à la cadence promise, puis propager la date (visible et dateModified)" },
};
export const DEFAULT_KIND: KindEntry = { kind: "hors-build", ou: "hors du périmètre de build : vérification de niveau 1 ou inconnue" };
export function kindOf(id: string): KindEntry { return KINDS[id] ?? DEFAULT_KIND; }

export type PlanFinding = { id: string; severity: Severity; title: string; kind: Kind; correctif: string; effort: string; ou?: string };
export type TexteField = "title" | "description" | "h1" | "opening";
export type PlanPage = {
  page: string; intention: string; motCle: string; secondaires: string[]; cadence: string;
  current: {
    url: string; status: number; title: string | null; description: string | null; h1: string[]; opening: string; canonical: string | null;
    jsonldTypes: string[]; datePublished: string | null; dateModified: string | null; challenge: boolean;
  } | null;
  missing: { title: boolean; h1: boolean; opening: boolean } | null;
  textes: TexteField[];
};
export type Organization = {
  "@context": "https://schema.org"; "@type": "Organization"; name: string; url: string; description: string; sameAs: string[]; telephone?: string; address?: string;
};
export type BuildPlan = {
  generatedAt: string;
  audit: { dir: string; date: string; niveau: number; counts: Record<Severity, number> };
  strategy: { path: string; statut: string; date: string; site: string };
  stack: "nextjs" | "autre";
  canonicalBase: { origin: string; source: "audit niveau 0" | "stratégie" };
  findings: PlanFinding[];
  pages: PlanPage[];
  organization: Organization;
  indexnow: { key: string; file: string } | null;
  warnings: string[];
};

const SEV_RANK: Record<Severity, number> = { Critique: 0, Important: 1, Mineur: 2, Info: 3 };
const KIND_RANK: Record<Kind, number> = { code: 0, texte: 1, "hors-build": 2 };

export type BuildPlanInput = {
  strategy: Strategy; strategyPath: string; report: Report; manifest: Manifest; pages: PageFacts[]; strategyEval: StrategyEval | null;
  homeFinalUrl: string | null; deps: string[]; auditDir: string; now?: string;
};

export function buildPlan(input: BuildPlanInput): BuildPlan {
  const { strategy, report, pages, strategyEval } = input;
  const warnings: string[] = [];

  const findings: PlanFinding[] = report.findings
    .filter((f) => f.severity !== "Info")
    .map((f) => { const k = kindOf(f.id); return { id: f.id, severity: f.severity, title: f.title, kind: k.kind, correctif: f.correctif, effort: f.effort, ...(k.ou ? { ou: k.ou } : {}) }; })
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.id.localeCompare(b.id));
  const open = new Set(findings.map((f) => f.id));

  let canonicalBase: BuildPlan["canonicalBase"] | null = null;
  if (input.homeFinalUrl) { try { canonicalBase = { origin: new URL(input.homeFinalUrl).origin, source: "audit niveau 0" }; } catch { /* URL illisible : repli ci-dessous */ } }
  if (!canonicalBase) {
    canonicalBase = { origin: `https://${strategy.site}`, source: "stratégie" };
    warnings.push("base canonique prise dans la stratégie : aucun audit niveau 0, l'hôte réellement servi (www ou apex) n'est pas observé");
  }

  if (!strategyEval) warnings.push("audit sans couche stratégique : relancer l'audit avec seo/strategy.md pour connaître les mots-clés manquants par page");
  const byPath = new Map(pages.map((p) => [pathOf(p.url), p]));
  const evalByPage = new Map((strategyEval?.pages ?? []).map((e) => [e.page, e]));
  const planPages: PlanPage[] = strategy.pages.map((plan) => {
    const p = byPath.get(pathOf(plan.page)) ?? null;
    const ev = evalByPage.get(plan.page) ?? null;
    const base = { page: plan.page, intention: plan.intention, motCle: plan.motCle, secondaires: plan.secondaires, cadence: plan.cadence };
    if (!p) { warnings.push(`page ${plan.page} prévue par la stratégie mais absente de la collecte : à créer, contenu à écrire (hors build)`); return { ...base, current: null, missing: null, textes: [] }; }
    const current: NonNullable<PlanPage["current"]> = {
      url: p.url, status: p.status, title: p.title, description: p.description, h1: p.h1, opening: p.opening, canonical: p.canonical,
      jsonldTypes: p.jsonld.flatMap((b) => b.types), datePublished: p.datePublished, dateModified: p.dateModified, challenge: p.challenge,
    };
    if (p.challenge) { warnings.push(`page ${plan.page} servie derrière une protection anti-bot : non évaluée`); return { ...base, current, missing: null, textes: [] }; }
    if (p.status !== 200) { warnings.push(`page ${plan.page} répond ${p.status} : à créer ou à rétablir, hors build`); return { ...base, current, missing: null, textes: [] }; }
    const missing = ev && ev.found ? { title: ev.inTitle === false, h1: ev.inH1 === false, opening: ev.inOpening === false } : null;
    const textes: TexteField[] = [];
    if (missing?.title || p.title === null || open.has("TAG-01")) textes.push("title");
    if (p.description === null || open.has("TAG-02")) textes.push("description");
    if (missing?.h1 || p.h1.length === 0) textes.push("h1");
    if (missing?.opening) textes.push("opening");
    return { ...base, current, missing, textes };
  });

  const nap = strategy.entite.nap;
  const organization: Organization = {
    "@context": "https://schema.org", "@type": "Organization",
    name: strategy.entite.nom, url: `${canonicalBase.origin}/`, description: strategy.identite, sameAs: strategy.entite.sameAs,
    ...(nap ? { telephone: nap.telephone, address: nap.adresse } : {}),
  };

  return {
    generatedAt: input.now ?? new Date().toISOString(),
    audit: { dir: input.auditDir, date: report.date, niveau: report.niveau, counts: report.counts },
    strategy: { path: input.strategyPath, statut: strategy.statut, date: strategy.date, site: strategy.site },
    stack: input.deps.includes("next") ? "nextjs" : "autre",
    canonicalBase,
    findings,
    pages: planPages,
    organization,
    indexnow: strategy.indexnow ? { key: strategy.indexnow, file: `public/${strategy.indexnow}.txt` } : null,
    warnings,
  };
}

/** La ligne de bilan imprimée par plan.ts. */
export function planSummary(plan: BuildPlan): string {
  const c = (k: Kind) => plan.findings.filter((f) => f.kind === k).length;
  const sev = (s: Severity) => plan.findings.filter((f) => f.severity === s).length;
  const pagesTextes = plan.pages.filter((p) => p.textes.length > 0).length;
  return `plan : ${plan.findings.length} trouvailles ouvertes (${sev("Critique")} Critique, ${sev("Important")} Important, ${sev("Mineur")} Mineur) : ${c("code")} code, ${c("texte")} texte, ${c("hors-build")} hors build ; ${pagesTextes} pages avec des textes à valider ; base canonique ${plan.canonicalBase.origin} (${plan.canonicalBase.source})`;
}
```

- [ ] **Étape 4 : le voir passer**

Run : `bun test skills/build/scripts/tests/plan.test.ts`
Attendu : 12 tests verts.

- [ ] **Étape 5 : commit**

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3
git add plugin/skills/build/scripts/lib/plan.ts plugin/skills/build/scripts/tests/plan.test.ts
git commit -m "feat(build): plan pur, genres par id, bloc Organization, base canonique observée"
```

---

### Tâche 3 : `plan.ts`, la ligne de commande

**Files:**
- Create: `plugin/skills/build/scripts/plan.ts`
- Create: `plugin/skills/build/scripts/tests/plan-cli.test.ts`

**Interfaces:**
- Consumes : `parseStrategy`, `StrategyError` (`lib/strategy.ts`), `latestAuditDir`, `parseReport`, `ReportError` (tâche 1), `buildPlan`, `planSummary` (tâche 2).
- Produces : `bun plan.ts [--audit <dossier>] [--strategy seo/strategy.md] [--seo seo]` ; écrit `<audit>/derived/build-plan.json` ; stdout `dossier : <audit>` puis la ligne `plan : …` ; stderr `attention : …` par warning ; exit 0, 1 (erreur lisible), 2 (usage).

- [ ] **Étape 1 : le test qui échoue**

`plugin/skills/build/scripts/tests/plan-cli.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { cp, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const F = `${import.meta.dir}/fixtures/chico`;
const CLI = `${import.meta.dir}/../plan.ts`;

/** Un dépôt de site factice : seo/strategy.md, un audit n0 complet, un package.json avec next. */
async function fakeSite(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "erom-seo-build-"));
  const audit = join(cwd, "seo/audits/2026-08-28-n0");
  await mkdir(join(audit, "raw"), { recursive: true });
  await mkdir(join(audit, "derived"), { recursive: true });
  await cp(`${F}/strategy.md`, join(cwd, "seo/strategy.md"));
  await cp(`${F}/report.md`, join(audit, "report.md"));
  await cp(`${F}/manifest.json`, join(audit, "raw/manifest.json"));
  await cp(`${F}/pages.json`, join(audit, "derived/pages.json"));
  await cp(`${F}/strategy-eval.json`, join(audit, "derived/strategy-eval.json"));
  await Bun.write(join(cwd, "package.json"), JSON.stringify({ dependencies: { next: "16.1.1" } }));
  return cwd;
}

describe("plan.ts en ligne de commande", () => {
  test("écrit derived/build-plan.json dans le dernier audit et imprime le bilan", async () => {
    const cwd = await fakeSite();
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const out = r.stdout.toString();
    expect(out).toContain("dossier : seo/audits/2026-08-28-n0");
    expect(out).toContain("plan : 12 trouvailles ouvertes");
    const plan = JSON.parse(await Bun.file(join(cwd, "seo/audits/2026-08-28-n0/derived/build-plan.json")).text());
    expect(plan.stack).toBe("nextjs");
    expect(plan.canonicalBase.origin).toBe("https://www.commentchercherbonheur.org");
    expect(plan.findings).toHaveLength(12);
  });
  test("sans audit : exit 1 et message lisible", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "erom-seo-build-"));
    await mkdir(join(cwd, "seo"), { recursive: true });
    await cp(`${F}/strategy.md`, join(cwd, "seo/strategy.md"));
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("aucun audit avec rapport");
  });
  test("sans stratégie : exit 1, propose le verbe strategy", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "erom-seo-build-"));
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("/erom-seo:strategy");
  });
});
```

- [ ] **Étape 2 : le voir échouer**

Run : `bun test skills/build/scripts/tests/plan-cli.test.ts`
Attendu : échec (le CLI n'existe pas, `exitCode` différent de 0).

- [ ] **Étape 3 : `plugin/skills/build/scripts/plan.ts`**

```ts
#!/usr/bin/env bun
// plan.ts : stratégie + dernier audit → derived/build-plan.json. Toute la lecture disque est ici ; lib/plan.ts est pur.
import { join } from "node:path";
import { parseStrategy, StrategyError } from "../../../lib/strategy";
import { latestAuditDir, parseReport, ReportError } from "../../../lib/report";
import type { Manifest, PageFacts } from "../../audit/scripts/lib/types";
import type { StrategyEval } from "../../audit/scripts/lib/strategy-eval";
import { buildPlan, planSummary } from "./lib/plan";

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes("--help")) { console.error("usage : bun plan.ts [--audit <dossier>] [--strategy seo/strategy.md] [--seo seo]"); process.exit(2); }
  const seoDir = opt("--seo") ?? "seo";
  const strategyPath = opt("--strategy") ?? join(seoDir, "strategy.md");
  try {
    const strategyFile = Bun.file(strategyPath);
    if (!(await strategyFile.exists())) { console.error(`erreur : ${strategyPath} absent ; lancer /erom-seo:strategy d'abord`); process.exit(1); }
    const strategy = parseStrategy(await strategyFile.text());
    const auditDir = opt("--audit") ?? (await latestAuditDir(seoDir));
    if (!auditDir) { console.error(`erreur : aucun audit avec rapport dans ${join(seoDir, "audits")} ; lancer /erom-seo:audit d'abord`); process.exit(1); }
    const read = async (rel: string) => { const f = Bun.file(join(auditDir, rel)); if (!(await f.exists())) throw new Error(`${join(auditDir, rel)} absent`); return f.text(); };
    const report = parseReport(await read("report.md"));
    const manifest = JSON.parse(await read("raw/manifest.json")) as Manifest;
    const pages = JSON.parse(await read("derived/pages.json")) as PageFacts[];
    const evalFile = Bun.file(join(auditDir, "derived/strategy-eval.json"));
    const strategyEval = (await evalFile.exists()) ? (JSON.parse(await evalFile.text()) as StrategyEval) : null;
    const n0 = await latestAuditDir(seoDir, { level: 0, file: "raw/manifest.json" });
    const homeFinalUrl = n0 ? ((JSON.parse(await Bun.file(join(n0, "raw/manifest.json")).text()) as Manifest).pages[0]?.final ?? null) : null;
    const pkg = Bun.file("package.json");
    const deps = (await pkg.exists()) ? Object.keys({ ...(JSON.parse(await pkg.text()).dependencies ?? {}), ...(JSON.parse(await pkg.text()).devDependencies ?? {}) }) : [];
    const plan = buildPlan({ strategy, strategyPath, report, manifest, pages, strategyEval, homeFinalUrl, deps, auditDir });
    await Bun.write(join(auditDir, "derived/build-plan.json"), JSON.stringify(plan, null, 2));
    console.log(`dossier : ${auditDir}`);
    console.log(planSummary(plan));
    for (const w of plan.warnings) console.error(`attention : ${w}`);
  } catch (e) {
    const msg = e instanceof StrategyError ? `${strategyPath} inanalysable : ${e.errors.join(" ; ")}` : e instanceof ReportError ? `rapport inanalysable : ${e.errors.join(" ; ")}` : (e as Error).message;
    console.error(`erreur : ${msg}`);
    process.exit(1);
  }
}
```

- [ ] **Étape 4 : le voir passer**

Run : `bun test skills/build/scripts/tests/plan-cli.test.ts`
Attendu : 3 tests verts. Puis `bun test` : tout vert.

- [ ] **Étape 5 : commit**

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3
git add plugin/skills/build/scripts/plan.ts plugin/skills/build/scripts/tests/plan-cli.test.ts
git commit -m "feat(build): plan.ts, le plan de build en ligne de commande"
```

---

### Tâche 4 : la référence Next.js, l'autre stack, `parseRecipes`, `check-sources.ts` étendu

**Files:**
- Create: `plugin/skills/build/references/nextjs.md`
- Create: `plugin/skills/build/references/autre-stack.md`
- Create: `plugin/skills/build/scripts/lib/recipes.ts`
- Create: `plugin/skills/build/scripts/tests/recipes.test.ts`
- Modify: `plugin/skills/audit/scripts/check-sources.ts` (fichier entier remplacé, 34 lignes aujourd'hui)

**Interfaces:**
- Consumes : `OFFICIAL_DOMAINS`, `parseChecks` (`skills/audit/scripts/lib/checks.ts`), `fetchChain`, `text`, `normalizePage`, `normalizeQuote` (libs de l'audit), `KINDS` (tâche 2).
- Produces : `parseRecipes(md: string): Recipe[]` avec `Recipe = { title: string; ids: string[]; fichiers: string; pieges: string[]; sources: RecipeSource[] }`, `BUILD_DOMAINS: string[]`, `allowedBuildDomain(url: string): boolean`.

- [ ] **Étape 1 : le test qui échoue**

`plugin/skills/build/scripts/tests/recipes.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { allowedBuildDomain, BUILD_DOMAINS, parseRecipes } from "../lib/recipes";
import { KINDS } from "../lib/plan";

const NEXTJS = await Bun.file(`${import.meta.dir}/../../references/nextjs.md`).text();

const SAMPLE = `# Recettes

## Pièges transverses
- rien

### Canonical (IDX-02)
Fichiers : app/layout.tsx
Recette  :
\`\`\`tsx
// Source : pas une source, on est dans un bloc de code
export const metadata = { alternates: { canonical: "/" } };
\`\`\`
Piège    : premier piège
Piège    : second piège
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « metadataBase is a convenience option »
Source   : https://example.com/x « à la main » [manuel]

### Deux ids (TAG-01, TAG-02)
Fichiers : page.tsx
Source   : https://nextjs.org/docs « x »
`;

describe("parseRecipes", () => {
  test("blocs, ids, champs ; un bloc de code n'est jamais lu", () => {
    const r = parseRecipes(SAMPLE);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      title: "Canonical", ids: ["IDX-02"], fichiers: "app/layout.tsx", pieges: ["premier piège", "second piège"],
      sources: [
        { url: "https://nextjs.org/docs/app/api-reference/functions/generate-metadata", quote: "metadataBase is a convenience option", manual: false },
        { url: "https://example.com/x", quote: "à la main", manual: true },
      ],
    });
    expect(r[1].ids).toEqual(["TAG-01", "TAG-02"]);
  });
  test("domaines admis : la doc du framework et de l'hébergeur, plus ceux des moteurs", () => {
    expect(BUILD_DOMAINS).toContain("nextjs.org");
    expect(BUILD_DOMAINS).toContain("developers.google.com");
    expect(allowedBuildDomain("https://nextjs.org/docs/app")).toBe(true);
    expect(allowedBuildDomain("https://vercel.com/docs/domains")).toBe(true);
    expect(allowedBuildDomain("https://example.com/")).toBe(false);
    expect(allowedBuildDomain("pas une url")).toBe(false);
  });
});

describe("references/nextjs.md", () => {
  const recipes = parseRecipes(NEXTJS);
  test("tout id de genre code ou texte a sa recette", () => {
    const covered = new Set(recipes.flatMap((r) => r.ids));
    for (const [id, k] of Object.entries(KINDS)) if (k.kind !== "hors-build") expect(covered.has(id), `${id} sans recette`).toBe(true);
  });
  test("chaque recette a des fichiers et au moins une source sur un domaine admis, sans em dash", () => {
    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      expect(r.fichiers, `${r.title} sans Fichiers`).not.toBe("");
      expect(r.sources.length, `${r.title} sans Source`).toBeGreaterThan(0);
      for (const s of r.sources) { expect(allowedBuildDomain(s.url), `${r.title} : ${s.url}`).toBe(true); expect(s.quote, `${r.title} : citation vide`).not.toBe(""); }
    }
    expect(NEXTJS.includes("—")).toBe(false);
  });
});
```

- [ ] **Étape 2 : le voir échouer**

Run : `bun test skills/build/scripts/tests/recipes.test.ts`
Attendu : échec, `Cannot find module "../lib/recipes"`.

- [ ] **Étape 3 : `plugin/skills/build/scripts/lib/recipes.ts`**

```ts
// Lecture d'un fichier de recettes (skills/build/references/*.md) : un bloc `### Titre (ID, ID)` par recette, champs
// `Fichiers`, `Recette` (suivi d'un bloc de code, ignoré ici), `Piège` (répétable), `Source` (URL « citation »).
import { OFFICIAL_DOMAINS } from "../../../audit/scripts/lib/checks";

export type RecipeSource = { url: string; quote: string; manual: boolean };
export type Recipe = { title: string; ids: string[]; fichiers: string; pieges: string[]; sources: RecipeSource[] };

/** Domaines admis pour les sources d'une recette : la doc du framework et de l'hébergeur, plus ceux des moteurs. */
export const BUILD_DOMAINS: string[] = ["nextjs.org", "vercel.com", "react.dev", ...OFFICIAL_DOMAINS];

export function allowedBuildDomain(url: string): boolean {
  try { const h = new URL(url).hostname; return BUILD_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; }
}

export function parseRecipes(md: string): Recipe[] {
  const out: Recipe[] = [];
  let cur: Recipe | null = null;
  let inFence = false;
  for (const raw of md.split("\n")) {
    if (/^\s*```/.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = raw.match(/^###\s+(.+?)\s*\(([A-Z]+-\d{2}(?:\s*,\s*[A-Z]+-\d{2})*)\)\s*$/);
    if (h) { cur = { title: h[1].trim(), ids: h[2].split(",").map((s) => s.trim()), fichiers: "", pieges: [], sources: [] }; out.push(cur); continue; }
    if (!cur) continue;
    const m = raw.match(/^(Fichiers|Piège|Source)\s*:\s*(.*)$/);
    if (!m) continue;
    const val = m[2].trim();
    if (m[1] === "Fichiers") cur.fichiers = val;
    else if (m[1] === "Piège") cur.pieges.push(val);
    else {
      const s = val.match(/^(\S+)\s+«\s*(.*?)\s*»\s*(\[manuel\])?\s*$/);
      cur.sources.push(s ? { url: s[1], quote: s[2], manual: Boolean(s[3]) } : { url: val, quote: "", manual: false });
    }
  }
  return out;
}
```

- [ ] **Étape 4 : `plugin/skills/build/references/nextjs.md`**

Copier tel quel (les treize recettes ; les 23 citations ont été retrouvées mot pour mot sur leurs pages le 28/08 par le mécanisme de `check-sources.ts` ; ne pas les reformuler) :

````markdown
# Recettes Next.js 16, App Router

Contexte pour Claude : une recette par famille de trouvailles, les ids entre parenthèses dans le titre. Lire le bloc de l'id à corriger, puis le fichier visé, avant de modifier ; déjà conforme = on passe. Les valeurs (title, description, h1, ouverture) viennent de la table validée par Romain ; le bloc Organization vient de `derived/build-plan.json`, collé tel quel. Vérifié contre la doc Next.js 16.1.1 le 2026-08-28 (`docs/recherches/2026-08-28-nextjs-16-seo-api.md`). Le dossier `app/` est `src/app/` quand le projet a un dossier `src`.

## Pièges transverses

- `metadata` et `generateMetadata` ne s'exportent que d'un composant serveur. Une page « use client » : créer `layout.tsx` dans son segment (qui rend `children`) et y exporter `metadata`, ou faire de la page un composant serveur qui rend le composant client.
- `metadataBase` doit être l'hôte réellement servi (`canonicalBase.origin` du plan), pas celui qu'on croit : sinon canonical, sitemap et Open Graph pointent vers une variante qui redirige.
- Un champ objet (`openGraph`, `robots`, `alternates`) redéfini dans une page remplace tout l'objet du layout, il ne fusionne pas.
- `title.template` du layout racine ne s'applique pas au `title` de la page du même segment : la home garde `title.default`, ou un `title.absolute` dans `app/page.tsx`.
- `lastModified: new Date()` dans le sitemap est un signal faux : Google ignore un lastmod qu'il ne peut pas vérifier. Une vraie date, ou rien.
- `Last-Modified` n'est pas émis par Next.js sur Vercel (vérifié sur chico le 28/08 : etag et cache-control seulement) : le double signal de fraîcheur est la date visible plus `dateModified` en JSON-LD.
- `robots.other` (directives non standard) exige Next.js 16.3 ; en 16.1, s'en passer.
- Après chaque modification : `bun x tsc --noEmit` ; avant l'audit : `bun run build`.

### robots.ts (ROBOTS-01, ROBOTS-02, ROBOTS-03, ROBOTS-04, ROBOTS-05, ROBOTS-06)
Fichiers : app/robots.ts ; jamais un public/robots.txt en parallèle
Recette  : un seul fichier, l'hôte observé dans la ligne Sitemap.
```ts
import type { MetadataRoute } from "next";

const BASE = "https://www.acme.fr"; // canonicalBase.origin du plan

export default function robots(): MetadataRoute.Robots {
  // RFC 9309 : un bot n'obéit qu'au groupe le plus spécifique qui le nomme ; un groupe nommé n'hérite pas de « * ».
  const disallow = ["/dashboard/", "/checkout/"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
```
Piège    : ROBOTS-02 et ROBOTS-03 : ne jamais nommer un bot de récupération (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User) ni Googlebot ou bingbot dans un groupe qui les bloque ; retirer le groupe, ne pas ajouter un allow à côté. Bloquer l'entraînement (GPTBot, ClaudeBot, CCBot) reste un choix du client, sans effet sur la visibilité.
Piège    : ROBOTS-04 : Google-Extended est un jeton d'entraînement sans effet sur les AI Overviews ; le laisser ou le retirer selon le client, mais ne jamais présenter son retrait comme un gain de visibilité.
Piège    : ROBOTS-05 : la ligne Sitemap porte l'hôte observé (www si le site répond en www), pas l'apex du code de départ.
Piège    : ROBOTS-06 : un robots.txt en 5xx vient de l'hébergeur ou d'une route qui plante, pas de ce fichier : vérifier `bun run build`, puis l'hébergeur.
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots « Add or generate a robots.txt file that matches the Robots Exclusion Standard in the root of app directory to tell search engine crawlers which URLs they can access on your site. »

### Directives robots par page (SNIP-01, SNIP-02, SNIP-03)
Fichiers : layout.tsx du segment à exclure (app/checkout/layout.tsx), ou page.tsx si elle est un composant serveur
Recette  : un noindex voulu vit dans le layout de son segment ; une page prévue par la stratégie n'en porte jamais.
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```
Piège    : SNIP-01 et SNIP-02 : retirer tout nosnippet et tout max-snippet bas sur une page prévue ; l'absence suffit, pas besoin de `max-snippet: -1`.
Piège    : SNIP-03 : un noindex posé dans le layout racine s'applique à tout le site ; le layout racine ne porte jamais `index: false`.
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « This means metadata with nested fields such as openGraph and robots that are defined in an earlier segment are overwritten by the last segment to define them. »

### sitemap.ts (IDX-01)
Fichiers : app/sitemap.ts
Recette  : une entrée par page indexable, l'hôte observé, une vraie date ; les pages en noindex n'y figurent pas.
```ts
import type { MetadataRoute } from "next";

const BASE = "https://www.acme.fr"; // canonicalBase.origin du plan

// Dernière modification réelle de chaque page : date git du fichier de la page, relevée au build
// (git log -1 --format=%cI -- src/app/methode/page.tsx), écrite ici et mise à jour à chaque build.
const PAGES: { path: string; lastModified: string }[] = [
  { path: "/", lastModified: "2026-08-28" },
  { path: "/methode", lastModified: "2026-08-28" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: p.path === "/" ? BASE : `${BASE}${p.path}`, lastModified: p.lastModified }));
}
```
Piège    : `changeFrequency` et `priority` n'apportent rien à Google ; les garder ne gêne pas, les inventer ne sert à rien.
Piège    : une URL du sitemap qui répond autre chose que 200 (redirection, 404) reste une trouvaille IDX-01 : retirer l'entrée ou corriger la page, jamais lister une URL qui redirige.
Source   : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « The <lastmod> value should reflect the date and time of the last significant update to the page. »
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap « is a special file that matches the Sitemaps XML format to help search engine crawlers index your site more efficiently. »

### Canonical (IDX-02)
Fichiers : app/layout.tsx (metadataBase), puis chaque page.tsx prévue ou son layout.tsx de segment (alternates.canonical)
Recette  : metadataBase à la racine, un canonical relatif par page, résolu par Next.js.
```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://www.acme.fr"), // canonicalBase.origin du plan
};

// app/page.tsx (la home, composant serveur)
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// app/methode/page.tsx (composant serveur) ou app/methode/layout.tsx
export const metadata: Metadata = {
  alternates: { canonical: "/methode" },
};
```
Piège    : ne pas poser `alternates.canonical: "/"` dans le layout racine : toute page qui ne le redéfinit pas hériterait du canonical de la home, ce qui est pire que rien. Chaque page prévue reçoit le sien.
Piège    : `metadataBase` en apex quand le site répond en www (ou l'inverse) rend un canonical qui redirige : c'est la trouvaille IDX-02, pas une correction.
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « metadataBase is a convenience option to set a base URL prefix for metadata fields that require a fully qualified URL. »

### Vraie 404 (IDX-05)
Fichiers : app/not-found.tsx ; les routes dynamiques qui rendent une page « introuvable » en 200
Recette  : une page 404 dédiée, et `notFound()` dès qu'une donnée manque.
```tsx
// app/not-found.tsx
export default function NotFound() {
  return (
    <main>
      <h1>Page introuvable</h1>
      <p>Cette page n'existe pas ou n'existe plus.</p>
    </main>
  );
}

// app/articles/[slug]/page.tsx : une donnée absente déclenche la vraie 404
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return <Article article={article} />;
}
```
Piège    : un segment fourre-tout (`[...slug]`) qui rend un gabarit pour n'importe quel chemin est la cause classique du soft 404 ; il doit appeler `notFound()` quand rien ne correspond.
Piège    : une réponse en flux (streaming, `loading.tsx` ou Suspense au-dessus) rend 200 même pour not-found ; une page 404 rendue d'un bloc rend le vrai code. La sonde de l'audit (`/erom-seo-probe-…`) lit ce code.
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/not-found « The not-found file is used to render UI when the notFound function is thrown within a route segment. »
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/not-found « Along with serving a custom UI, Next.js will return a 200 HTTP status code for streamed responses, and 404 for non-streamed responses »

### JSON-LD Organization sur la home (SD-02, STRAT-02, STRAT-03)
Fichiers : src/components/seo/JsonLd.tsx (nouveau, composant serveur), app/page.tsx (la home)
Recette  : le bloc est `organization` de derived/build-plan.json, collé tel quel (nom, url, description = la phrase d'identité, sameAs de la stratégie).
```tsx
// src/components/seo/JsonLd.tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

// app/page.tsx
import { JsonLd } from "@/components/seo/JsonLd"; // adapter l'import au projet

const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "L'Institut C.H.I.C.O.",
  url: "https://www.commentchercherbonheur.org/",
  description: "L'Institut C.H.I.C.O. est un site satirique qui …",
  sameAs: ["https://fr.tipeee.com/…", "https://x.com/…"],
};

export default function Home() {
  return (
    <>
      <JsonLd data={ORGANIZATION} />
      {/* le reste de la page */}
    </>
  );
}
```
Piège    : `<script>` natif, pas `next/script` (fait pour du JavaScript exécutable). `JSON.stringify` seul ne protège pas d'une injection : garder le `replace`.
Piège    : STRAT-02 se joue aussi dans le texte visible : la phrase d'identité doit être dans le premier bloc de texte de la home (valeur de la table validée) ; le bloc Organization seul ne la fait pas passer.
Piège    : STRAT-03 : `sameAs` contient exactement les URLs de la stratégie, ni plus (pas de profil vide) ni moins.
Source   : https://nextjs.org/docs/app/guides/json-ld « Our current recommendation for JSON-LD is to render structured data as a <script> tag in your layout.js or page.js components »
Source   : https://nextjs.org/docs/app/guides/json-ld « The following snippet uses JSON.stringify, which does not sanitize malicious strings used in XSS injection. »
Source   : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »

### JSON-LD par page (SD-01, SD-03, FRESH-01, FRESH-02)
Fichiers : chaque page.tsx prévue (composant serveur), ou le layout.tsx de son segment
Recette  : WebPage par défaut, Article pour une page éditoriale ; dates depuis git ; une date visible qui dit la même chose.
```tsx
// app/methode/page.tsx (composant serveur)
import { JsonLd } from "@/components/seo/JsonLd";

// dates git du fichier, relevées au build :
//   datePublished : git log --diff-filter=A --follow --format=%cI -- src/app/methode/page.tsx | tail -1
//   dateModified  : git log -1 --format=%cI -- src/app/methode/page.tsx
const ARTICLE = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "La Méthode Quantique Chico", // le h1 validé
  description: "…", // la description validée
  datePublished: "2026-05-02",
  dateModified: "2026-08-28",
  author: { "@type": "Organization", name: "L'Institut C.H.I.C.O." },
  publisher: { "@type": "Organization", name: "L'Institut C.H.I.C.O." },
  mainEntityOfPage: "https://www.commentchercherbonheur.org/methode",
};

export default function MethodePage() {
  return (
    <>
      <JsonLd data={ARTICLE} />
      <main>
        {/* h1, ouverture, contenu */}
        <p>Mis à jour le <time dateTime="2026-08-28">28 août 2026</time></p>
      </main>
    </>
  );
}
```
Piège    : FRESH-02 : la date visible et `dateModified` disent le même jour ; Next.js sur Vercel n'émet pas Last-Modified, il reste deux signaux à aligner, pas trois.
Piège    : SD-03 : pas d'Article sur une page de service ou de tunnel (audit, newsletter, mentions légales) : `WebPage` suffit ; un type qui promet un contenu que la page n'a pas est pire que rien.
Piège    : une page « use client » peut rendre `<JsonLd>` mais pas exporter `metadata` ; le mieux reste de la découper (pièges transverses).
Source   : https://developers.google.com/search/docs/appearance/publication-dates « We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Source   : https://nextjs.org/docs/app/guides/json-ld « Our current recommendation for JSON-LD is to render structured data as a <script> tag in your layout.js or page.js components »

### Title et description (TAG-01, TAG-02)
Fichiers : app/layout.tsx (title.template, title.default, description de la home), puis chaque page.tsx prévue ou son layout.tsx de segment
Recette  : les valeurs viennent de la table validée ; le template du layout racine ajoute la marque, la page ne donne que sa partie.
```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://www.acme.fr"),
  title: { template: "%s | Institut C.H.I.C.O.", default: "L'Institut C.H.I.C.O. : optimisation quantique de l'ego" },
  description: "…", // la description validée de la home
};

// app/telekinesie/page.tsx (composant serveur), sinon app/telekinesie/layout.tsx
export const metadata: Metadata = {
  title: "Télékinésie : la méthode MindBridge 6Ge", // rendu : « Télékinésie : la méthode MindBridge 6Ge | Institut C.H.I.C.O. »
  description: "…",
  alternates: { canonical: "/telekinesie" },
};
```
Piège    : une page « use client » (hooks, animations au niveau de la page) : créer `layout.tsx` dans son dossier, qui exporte `metadata` et rend `children` ; ne pas retirer « use client » de la page sans comprendre pourquoi il est là.
Piège    : la home ne reçoit pas le template : son title vient de `title.default`, ou d'un `title.absolute` dans app/page.tsx.
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « The metadata object and generateMetadata function exports are only supported in Server Components. »
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « title.template can be used to add a prefix or a suffix to titles defined in child route segments. »
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « If you need to use Client Component features, keep your page.tsx as a Server Component and move the Client Component logic to a separate file »

### h1 et ouverture (TAG-03, STRAT-01)
Fichiers : le JSX de la page (page.tsx, ou le composant de section qu'elle rend en premier, par exemple Hero.tsx)
Recette  : remplacer le texte du h1 et la première phrase du premier paragraphe par les valeurs validées, sans toucher aux classes, aux balises, aux liens ni aux images. Une page sans h1 (TAG-03) en reçoit un, placé avant le premier paragraphe, dans le style des autres pages du site.
```tsx
<h1 className="text-5xl font-black uppercase">
  Télékinésie <span className="text-primary">pour débutants</span>
</h1>
<p className="text-gray-400">
  La télékinésie n'a jamais été démontrée, et c'est exactement pour ça que l'Institut la vend. Nos protocoles …
</p>
```
Piège    : le mot-clé doit apparaître avec chacun de ses mots entiers (règle des mots de l'audit : minuscules, sans accents, mots vides ignorés) ; un mot dans un `<span>` à l'intérieur du h1 compte, le texte est lu balises retirées.
Piège    : l'ouverture évaluée par l'audit = les 400 premiers caractères de `<main>` (sinon de `<body>`), en texte visible : un bandeau, une nav ou un ticker placés avant le h1 dans `<main>` mangent ce budget ; le mot-clé doit tenir dedans.
Piège    : un h1 par page ; un second h1 dans une section devient une trouvaille TAG-03 : le passer en h2.
Source   : https://developers.google.com/search/docs/appearance/title-link « Consider ensuring that your main heading is distinctive from other text on a page and stands out as being the most prominent on the page (for example, using a larger font, putting the title text in the first visible <h1> element on the page, etc). »

### Langue (TAG-04)
Fichiers : app/layout.tsx
Recette  : la langue de la stratégie (Cibles, Langue) sur la balise html.
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```
Piège    : `lang="en"` est la valeur du gabarit create-next-app, pas un choix ; la remplacer par celle de la stratégie.
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/layout « A root layout is the top-most layout in the root app directory. It is used to define the <html> and <body> tags and other globally shared UI. »

### Contenu sans JavaScript (REND-01)
Fichiers : la page et les composants qui portent le texte principal
Recette  : le texte principal (h1, ouverture, corps) vit dans le JSX rendu au serveur, pas dans un état chargé après coup. Un composant « use client » est rendu au serveur une première fois : son JSX statique compte ; ce qui n'existe pas au premier rendu n'existe pas pour un bot.
```tsx
// Mauvais : le texte n'arrive qu'après l'effet
"use client";
export function Intro() {
  const [text, setText] = useState("");
  useEffect(() => { fetch("/api/intro").then((r) => r.json()).then((j) => setText(j.text)); }, []);
  return <p>{text}</p>;
}

// Bon : composant serveur, le texte est dans le HTML
export async function Intro() {
  const j = await getIntro();
  return <p>{j.text}</p>;
}
```
Piège    : une animation d'apparition (framer-motion, `initial={{ opacity: 0 }}`) laisse le texte dans le HTML : ce n'est pas un problème REND-01. Un effet machine à écrire qui construit le texte caractère par caractère en est un.
Piège    : l'audit lit le HTML tel que servi, sans exécuter JavaScript ; `textChars` de `derived/pages.json` dit ce qu'un bot voit.
Source   : https://nextjs.org/docs/app/getting-started/server-and-client-components « By default, layouts and pages are Server Components, which lets you fetch data and render parts of your UI on the server, optionally cache the result, and stream it to the client. »

### IndexNow (AI-02)
Fichiers : public/<clé>.txt (le chemin exact est `indexnow.file` du plan)
Recette  : un fichier texte dont le contenu est la clé, sans retour à la ligne final.
```bash
printf '%s' 'bf498d4959b94b88aa7bb3902433735f' > public/bf498d4959b94b88aa7bb3902433735f.txt
```
Piège    : la clé vient de `seo/strategy.md` (Cadence de fraîcheur, IndexNow) ; ne jamais en générer une autre ici, sinon l'audit (AI-02) compare deux clés différentes.
Piège    : soumettre les URLs à IndexNow après la mise en ligne est une étape de `launch`, pas de `build`.
Source   : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/public-folder « For example, the file public/avatars/me.png can be viewed by visiting the /avatars/me.png path. »

### Hors build (IDX-03, IDX-04, PERF-01, STRAT-04)
Fichiers : aucun
Recette  : rien à coder ; `build` liste ces trouvailles à la fin avec l'endroit où agir (`ou` du plan).
Piège    : IDX-04 : la redirection apex vers www (ou l'inverse) se règle dans Vercel, Project Settings, Domains, « Redirect to » ; un `redirects()` de next.config avec une condition sur l'hôte n'est pas le mécanisme prévu par l'hébergeur, et un 307 émis par la plateforme reste un 307.
Piège    : IDX-03 : le certificat et la redirection HTTP vers HTTPS sont automatiques sur Vercel ; ailleurs, c'est l'hébergeur.
Piège    : STRAT-04 : la cadence est un engagement éditorial ; `build` ne réécrit pas un contenu pour le rajeunir.
Source   : https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting « This allows the Vercel CDN more control over incoming traffic for improved reliability, speed, and security. »
Source   : https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting « Use the Redirect to dropdown to select the domain you want to redirect to »
Source   : https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects « permanent true or false - if true will use the 308 status code which instructs clients/search engines to cache the redirect forever, if false will use the 307 status code which is temporary and is not cached. »
````

- [ ] **Étape 5 : `plugin/skills/build/references/autre-stack.md`**

```markdown
# Hors Next.js

Contexte pour Claude : pas de recette dédiée en v1. La cible est le même HTML de sortie que celui décrit dans `nextjs.md` ; seul le chemin pour y arriver change.

1. Trouver où vivent : la balise `<head>` (title, description, canonical, robots meta), le robots.txt, le sitemap, les pages (fichiers ou gabarits), le layout racine (`lang`), les fichiers statiques à la racine (pour la clé IndexNow). Lire le README et les scripts de `package.json` avant de chercher.
2. Appliquer chaque trouvaille dans les mêmes termes que `nextjs.md` : canonical absolu et auto-référent sur l'hôte observé ; title et description propres à chaque page (valeurs validées) ; JSON-LD Organization sur la home avec le bloc du plan ; un h1 par page avec le mot-clé ; `lang` de la stratégie ; clé IndexNow servie à la racine ; robots.txt et sitemap sur l'hôte observé, avec de vraies dates.
3. Un stack qui rend les pages côté client (SPA) ne passe pas REND-01 sans rendu serveur ou prérendu : le dire, ne pas bricoler.
4. Le reste de la procédure (table validée, un commit par trouvaille, audit niveau 2) ne change pas. Le serveur de dev est celui du projet (`bun run dev` ou l'équivalent de son README).

Cas connus : Astro (`src/pages/*.astro`, `<head>` dans un layout, `@astrojs/sitemap`), WordPress (thème enfant, `wp_head`, extension SEO ; le niveau 2 exige un WordPress local), site statique (fichiers HTML, tout à la main).
```

- [ ] **Étape 6 : voir passer les tests de recettes**

Run : `bun test skills/build/scripts/tests/recipes.test.ts`
Attendu : 4 tests verts.

- [ ] **Étape 7 : `check-sources.ts` étendu**

Remplacer `plugin/skills/audit/scripts/check-sources.ts` en entier par :

```ts
#!/usr/bin/env bun
// Vérifie que chaque citation des références est retrouvée mot pour mot sur sa page : les vérifications de l'audit
// (references/checks/) et les recettes de build (skills/build/references/).
import { readdir } from "node:fs/promises";
import { fetchChain, text } from "./lib/fetch";
import { parseChecks } from "./lib/checks";
import { normalizePage, normalizeQuote } from "./lib/normalize";
import { parseRecipes } from "../../build/scripts/lib/recipes";

const checksDir = new URL("../references/checks/", import.meta.url).pathname;
const recipesDir = new URL("../../build/references/", import.meta.url).pathname;
const only = Bun.argv.includes("--only") ? Bun.argv[Bun.argv.indexOf("--only") + 1] : null;

type Entry = { label: string; ids: string[]; sources: { url: string; quote: string; manual: boolean }[] };
const entries: Entry[] = [];
for (const f of (await readdir(checksDir)).filter((f) => f.endsWith(".md"))) for (const c of parseChecks(await Bun.file(checksDir + f).text())) entries.push({ label: c.id, ids: [c.id], sources: c.sources });
for (const f of (await readdir(recipesDir)).filter((f) => f.endsWith(".md"))) for (const r of parseRecipes(await Bun.file(recipesDir + f).text())) entries.push({ label: `build:${r.ids[0]}`, ids: r.ids, sources: r.sources });

const pages = new Map<string, { status: number; norm: string }>();
async function page(url: string) {
  if (!pages.has(url)) {
    const r = await fetchChain(url, { timeoutMs: 30000, userAgent: "Mozilla/5.0 (compatible; erom-seo-audit/0.1)" });
    pages.set(url, { status: r.status, norm: r.status === 200 ? normalizePage(text(r)) : "" });
  }
  return pages.get(url)!;
}

let fails = 0, manual = 0, ok = 0;
for (const e of entries) {
  if (only && !e.ids.includes(only)) continue;
  for (const s of e.sources) {
    if (s.manual) { manual++; console.log(`MANUEL   ${e.label}  ${s.url}`); continue; }
    const p = await page(s.url);
    if (p.status !== 200) { fails++; console.log(`HTTP ${p.status}  ${e.label}  ${s.url}`); continue; }
    if (p.norm.includes(normalizeQuote(s.quote))) { ok++; console.log(`OK       ${e.label}  ${s.quote.slice(0, 70)}`); }
    else { fails++; console.log(`ABSENTE  ${e.label}  ${s.url}\n         « ${s.quote} »`); }
  }
}
console.log(`\n${ok} citations retrouvées, ${fails} en échec, ${manual} à vérifier à la main`);
process.exit(fails ? 1 : 0);
```

- [ ] **Étape 8 : le contrôle des sources en vrai (réseau)**

Run : `bun skills/audit/scripts/check-sources.ts | tail -3`
Attendu : `80 citations retrouvées, 0 en échec, 0 à vérifier à la main` (57 de l'audit, 23 des recettes). Une citation ABSENTE se corrige depuis la page (voisinage lu avec `curl -s <url> | sed 's/<[^>]*>/ /g' | tr -s ' ' | grep -o '.\{80\}<début de la citation>.\{160\}'`), jamais en l'assouplissant ; si le HTML colle un code inline à une ponctuation (« ( /) », « non- www »), choisir une autre phrase de la même page. Puis `bun test` : tout vert.

- [ ] **Étape 9 : commit**

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3
git add plugin/skills/build/references plugin/skills/build/scripts/lib/recipes.ts plugin/skills/build/scripts/tests/recipes.test.ts plugin/skills/audit/scripts/check-sources.ts
git commit -m "feat(build): recettes Next.js 16 par id de trouvaille, autre stack, sources vérifiées par check-sources"
```

---

### Tâche 5 : `SKILL.md` du verbe `build`, README

**Files:**
- Create: `plugin/skills/build/SKILL.md`
- Modify: `plugin/README.md` (après la section « Écrire la stratégie », ligne 35 ; et la section « Vérifier que les références n'ont pas dérivé »)

**Interfaces:**
- Consumes : `plan.ts` (tâche 3), `references/nextjs.md`, `references/autre-stack.md` (tâche 4), la skill `audit` (`/erom-seo:audit`), `lint-strategy.ts` (chantier 2).
- Produces : le verbe `/erom-seo:build`.

- [ ] **Étape 1 : `plugin/skills/build/SKILL.md`**

````markdown
---
name: build
description: Corrige le SEO/GEO d'un site dans son code à partir de seo/strategy.md et du dernier audit : plan des trouvailles, textes validés par Romain, un commit par trouvaille, puis audit niveau 2 en boucle jusqu'à zéro Critique et zéro Important. Next.js App Router d'abord. Triggers : '/erom-seo:build', 'corrige le SEO du site', 'applique la stratégie au code', 'fais passer l'audit au vert', 'implémente les trouvailles de l'audit'.
argument-hint: "[--audit <dossier>]"
---

# Build SEO/GEO

Tu corriges le code du site pour qu'un audit niveau 2 frais n'ait plus ni Critique ni Important. Tu ne juges jamais toi-même : l'audit juge. Tu n'écris jamais un texte visible sans qu'il ait été validé (étape 2). Tu ne pousses jamais.

## 0. Préparer

1. Répertoire courant : le repo du site. `seo/strategy.md` absent : proposer `/erom-seo:strategy` et s'arrêter. `bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/lint-strategy.ts seo/strategy.md` non nul : afficher les erreurs et s'arrêter. `Statut : brouillon` : le dire, continuer.
2. `git status --porcelain` non vide : s'arrêter et demander de commiter ou de ranger (build commite par trouvaille, il ne mélange pas). Noter le commit de départ : `git rev-parse --short HEAD`. Branche `main` ou `master` : `git switch -c seo-build-<AAAA-MM-JJ>` ; autre branche : y rester. Jamais de push.
3. Stack : `next` dans `package.json` (dependencies ou devDependencies) : lire `${CLAUDE_PLUGIN_ROOT}/skills/build/references/nextjs.md` en entier ; sinon `references/autre-stack.md`. Le dossier `app/` est `src/app/` si le projet a un dossier `src`.
4. Scripts : `${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/`. Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
5. Aucun `seo/audits/*/report.md` : faire d'abord l'étape 4 (un audit), puis reprendre à l'étape 1. Compteur de passages : 0.

## 1. Planifier

`bun ${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/plan.ts [--audit <dossier>]`. Première ligne : `dossier : <audit>` ; lire `<audit>/derived/build-plan.json` en entier. Chaque ligne `attention :` de la sortie d'erreur est répétée à l'utilisateur telle quelle.

Le plan porte : `findings` (ouvertes, triées Critique puis Important puis Mineur, genre `code`, `texte` ou `hors-build`, `ou` pour les hors build), `pages` (par page prévue : `current`, `missing`, `textes` requis), `organization` (à coller tel quel), `indexnow.file`, `canonicalBase.origin` (l'hôte réellement servi : c'est lui qui va dans metadataBase, robots, sitemap, canonical).

## 2. Valider les textes

Si aucune page n'a de `textes` : passer à l'étape 3. Sinon, pour chaque page dont `textes` n'est pas vide, proposer les quatre champs, les requis marqués, l'actuel en face, une liste par page (jamais un tableau, Romain lit sur mobile) :

```
/telekinesie · mot-clé « télékinésie » · requis : title, h1, ouverture
  title       : Télékinésie : la méthode MindBridge 6Ge
                actuel : L'Institut C.H.I.C.O. | Optimisation Quantique de l'Ego
  description : …
                actuel : …
  h1          : …
                actuel : MINDBRIDGE 6Ge
  ouverture   : …
                actuel : …
```

Règles : mot-clé principal au début du title (la marque vient du `template` du layout racine, ne pas la répéter) ; title et description uniques par page ; description qui reprend le mot-clé et une secondaire ; h1 unique avec le mot-clé, dans le ton du site ; première phrase qui reprend le mot-clé. Guides, pas limites : ~60 caractères pour le title, ~155 pour la description. Aucune modification de fichier avant le OK. Romain répond OK ou amende (par page, par champ) ; boucler jusqu'au OK. Second passage : ne présenter que les pages non encore validées.

## 3. Appliquer

Dans l'ordre de `findings`. Trouvaille `hors-build` : rien, gardée pour l'étape 6. Pour chaque `code` ou `texte` :

1. Lire le bloc de la référence qui porte son id, puis les fichiers visés. Déjà conforme : noter « déjà conforme », passer.
2. Modifier. Règle texte : h1 et première phrase seulement, valeurs validées, jamais un autre paragraphe, un lien, une image ou une classe ; ne rien supprimer. Bloc Organization : `organization` du plan, tel quel. Hôte : `canonicalBase.origin`, partout.
3. `bun x tsc --noEmit` si `tsconfig.json` existe. Échec : corriger avant de commiter.
4. Commit : `git add <fichiers>` puis `git commit -m "seo(IDX-02): canonical absolu et auto-référent sur chaque page"`. Une modification qui règle plusieurs ids porte tous les ids : `seo(SD-02, STRAT-02, STRAT-03): bloc Organization sur la home`. Le commit des textes : `seo(TAG-01, TAG-02, TAG-03, STRAT-01): title, description, h1 et ouverture, textes validés par Romain le <date>`.

Après la dernière : `bun run build`. Échec : montrer l'erreur ; corriger si elle vient d'une modification de build, sinon s'arrêter (commits gardés, rien n'est défait).

## 4. Vérifier

1. Serveur. `curl -s --max-time 5 http://localhost:3000/robots.txt` : s'il répond avec une ligne `Sitemap:` sur l'hôte de la stratégie (apex et www confondus), c'est le serveur de dev de Romain sur ce repo : l'utiliser, port 3000, ne pas l'éteindre. Sinon : premier port libre entre 3456 et 3466 (`lsof -i :<port>` vide), puis en arrière-plan `bun run dev --port <port> > "$TMPDIR/erom-seo-dev.log" 2>&1 &` en notant le pid (`echo $!`). Attendre : `curl --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors -s -o /dev/null -w '%{http_code}' --max-time 120 http://localhost:<port>/robots.txt`, puis la même commande sur `/`. Pas de 200 : éteindre ce qu'on a lancé, dire « je ne peux pas lancer le serveur : lance `bun run dev`, puis `/erom-seo:audit http://localhost:3000` », donner le chemin du journal, passer à l'étape 6.
2. Audit : invoquer la skill `/erom-seo:audit http://localhost:<port>`. Elle écrit `seo/audits/<date>-n2*/report.md` et le passe au lint.
3. Éteindre le serveur lancé par build (`kill <pid>`), jamais celui de Romain.

## 5. Boucler

Passages + 1. `bun ${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/plan.ts` (sans `--audit` : le dernier audit, celui qui vient d'être écrit) ; la ligne `plan :` donne les comptes. Critique + Important > 0 et passages < 2 : retour à l'étape 1 avec ce plan. Sinon : étape 6.

## 6. Restituer

Dans l'ordre : chemin du dernier rapport et sa ligne « En bref » ; les commits (`git log --oneline <commit de départ>..HEAD`) ; les « déjà conforme » ; les hors build, chacun avec son `ou` (ceux du premier plan aussi, même si l'audit local les a marqués non applicables) ; les textes refusés ; ce qui reste en Critique ou Important après deux passages. Proposer la suite : régler les hors build, puis `/erom-seo:launch` quand il existera. Dire la branche, et que rien n'est poussé.

## 7. Règles d'écriture

Français, phrases courtes, aucun tiret cadratin dans ce qui va dans le code (title, description, JSON-LD) ni dans les commits. Aucun texte visible inventé hors de la table validée. Ne jamais modifier `seo/audits/*/raw/`.
````

- [ ] **Étape 2 : README**

Dans `plugin/README.md`, après la ligne 35 (le paragraphe « Dès que `seo/strategy.md` existe… »), insérer :

```markdown

## Construire

Depuis le repo du site, avec `seo/strategy.md` et un audit :

```
/erom-seo:build
```

Build propose les textes (title, description, h1, ouverture) de chaque page en défaut, attend le OK, corrige le code une trouvaille par commit (`seo(ID): …`), lance le site en local, refait un audit de niveau 2, et recommence une fois si besoin. Terminé quand l'audit n'a plus ni Critique ni Important. Ce qui n'est pas dans le code (redirection chez l'hébergeur, performance) est listé à la fin avec l'endroit où agir. Next.js App Router d'abord ; autre stack : Claude lit le repo et vise le même HTML.
```

Et dans « Vérifier que les références n'ont pas dérivé », remplacer la phrase « Chaque citation des références doit être retrouvée sur sa page officielle. » par « Chaque citation des références (vérifications de l'audit et recettes de build) doit être retrouvée sur sa page officielle. ».

- [ ] **Étape 3 : contrôle**

```bash
grep -c "—" skills/build/SKILL.md README.md skills/build/references/nextjs.md skills/build/references/autre-stack.md
bun test
```
Attendu : `0` partout (aucun em dash), suite verte.

- [ ] **Étape 4 : commit**

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3
git add plugin/skills/build/SKILL.md plugin/README.md
git commit -m "feat(build): le verbe build, six temps, et sa section README"
```

---

### Tâche 6 : recette mécanique sur chico (AC-1, tests, sources) et document de recette

**Files:**
- Create: `docs/superpowers/plans/2026-08-28-erom-seo-chantier-3-recette.md`

**Interfaces:**
- Consumes : tout ce qui précède ; le cobaye `/Users/recarnot/dev/chico-happiness` (lecture seule, sauf `seo/audits/2026-08-28-n0/derived/build-plan.json` que `plan.ts` écrit).

- [ ] **Étape 1 : AC-1, le plan sur les vrais fichiers**

```bash
cd /Users/recarnot/dev/chico-happiness
bun /Users/recarnot/dev/erom-agence-seo-chantier-3/plugin/skills/build/scripts/plan.ts --audit seo/audits/2026-08-28-n0
P=seo/audits/2026-08-28-n0/derived/build-plan.json
jq '.findings | length' $P
jq -c '[.findings[] | select(.kind == "hors-build") | .id]' $P
jq -c '[.findings[] | select(.kind == "texte") | .id]' $P
jq '.organization.sameAs | length' $P
jq -r '.canonicalBase.origin + " (" + .canonicalBase.source + ")"' $P
jq -r '.indexnow.file' $P
jq '[.pages[] | select(.textes | length > 0)] | length' $P
```
Attendu : `plan : 12 trouvailles ouvertes (0 Critique, 6 Important, 6 Mineur) : 8 code, 3 texte, 1 hors build ; 10 pages avec des textes à valider ; base canonique https://www.commentchercherbonheur.org (audit niveau 0)` ; puis `12`, `["IDX-04"]`, `["STRAT-01","STRAT-02","TAG-03"]`, `3`, `https://www.commentchercherbonheur.org (audit niveau 0)`, `public/bf498d4959b94b88aa7bb3902433735f.txt`, `10`. Aucun autre fichier de chico n'est touché : `git -C /Users/recarnot/dev/chico-happiness status --short` ne montre que ce qui y était déjà (`seo/` et le diff de `/methode` laissés par le chantier 2).

- [ ] **Étape 2 : suite et sources**

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3/plugin && bun test 2>&1 | tail -4
bun skills/audit/scripts/check-sources.ts | tail -1
grep -rn "—" skills/build/ README.md || echo "aucun em dash"
```
Attendu : 178 + 27 = 205 tests verts (ou plus si des tests ont été ajoutés en revue), `80 citations retrouvées, 0 en échec`, `aucun em dash`.

- [ ] **Étape 3 : le document de recette**

`docs/superpowers/plans/2026-08-28-erom-seo-chantier-3-recette.md` : une section par critère AC-1 à AC-8 de la spec (section 10), avec pour chacun : la commande ou le geste, la sortie réelle collée, OK ou KO. AC-1 et la partie tests de AC-8 sont remplis maintenant ; AC-2 à AC-7 et le chemin d'échec de AC-8 restent « à courir avec Romain » (tâche 7), avec la procédure exacte de la tâche 7 recopiée pour qu'une autre session puisse la dérouler.

- [ ] **Étape 4 : commit**

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3
git add docs/superpowers/plans/2026-08-28-erom-seo-chantier-3-recette.md
git commit -m "docs: recette du chantier 3, AC-1 et tests courus, AC-2 à AC-8 à courir avec Romain"
```

---

### Tâche 7 : recette vivante avec Romain (AC-2 à AC-8), dans chico

Cette tâche se déroule dans une session Claude Code lancée dans `/Users/recarnot/dev/chico-happiness` avec le plugin du worktree, Romain présent pour valider les textes. Elle ne s'exécute pas en sous-agent : la table de l'étape 2 est une conversation avec Romain. Si la session mère préfère la lancer elle-même ou via une session GLM (comme AC-1 du chantier 2), le déroulé est le même.

- [ ] **Étape 1 : préparer chico**

Le diff laissé par le chantier 2 (`src/app/methode/page.tsx`, `src/app/methode/layout.tsx`, `seo/`) doit être commité ou rangé avant, sinon build s'arrête à l'étape 0.2. Proposition à Romain : `git -C /Users/recarnot/dev/chico-happiness add -A && git -C /Users/recarnot/dev/chico-happiness commit -m "seo: stratégie, audits et title de /methode (recette erom-seo chantier 2)"`. Décision de Romain, pas de la session.

- [ ] **Étape 2 : lancer**

```bash
cd /Users/recarnot/dev/chico-happiness && source ~/.zshenv && claude --plugin-dir /Users/recarnot/dev/erom-agence-seo-chantier-3/plugin
```
Puis `/erom-seo:build`. Vérifier dans l'ordre :
- AC-2 : la liste des textes des 10 pages s'affiche avant toute modification ; `git status --porcelain` vide jusqu'au OK de Romain.
- AC-3 : après le OK, `git log --oneline <départ>..HEAD` : chaque ligne commence par `seo(` et porte au moins un id ; `bun run build` passe.
- AC-4 : build lance le serveur lui-même (port 3456 ou suivant), `seo/audits/<date>-n2*/report.md` apparaît, `lsof -i :<port>` vide à la fin.
- AC-5 : la ligne « En bref » du nouveau rapport dit `0 Critique · 0 Important` ; dans « Vérifications passées », STRAT-01, STRAT-02, STRAT-03, SD-02, IDX-02, TAG-01, TAG-02, AI-02 (`grep -c "^STRAT-0[1-3]\|^SD-02\|^IDX-02\|^TAG-0[12]\|^AI-02" <rapport>` égale 8, la section « Vérifications passées » étant la seule où ces ids ouvrent une ligne).
- AC-6 : le message final liste IDX-04 en hors build avec « Vercel », « Domains », « Redirect to ».
- AC-7 : `git diff main..seo-build-<date> --stat`, puis Romain lit le diff : dans `src/app/**/page.tsx`, seuls le h1, la première phrase, un export `metadata` ou un `<JsonLd>` changent ; le reste tient dans `layout.tsx`, `sitemap.ts`, `robots.ts`, `not-found.tsx`, `public/<clé>.txt`, `src/components/seo/JsonLd.tsx`.
- AC-8 (chemin d'échec) : sur une branche jetable, renommer le script `dev` de `package.json` en `dev-off`, relancer `/erom-seo:build` : build fait ses commits (ou « déjà conforme » partout), dit qu'il ne peut pas lancer le serveur, donne la commande, s'arrête proprement. Remettre `dev`, jeter la branche.

- [ ] **Étape 3 : consigner**

Coller les sorties réelles dans `docs/superpowers/plans/2026-08-28-erom-seo-chantier-3-recette.md` (worktree du chantier 3), commit `docs: recette du chantier 3, AC-2 à AC-8 courus avec Romain`. Tout écart entre le comportement et la spec est une trouvaille de recette : la noter, ne pas corriger en silence.

---

## Auto-revue du plan (faite le 2026-08-28)

1. **Couverture de la spec.** D16 (table validée puis autonome) : SKILL.md étapes 2 et 3 (tâche 5). D17 (serveur, audit, boucle, repli) : SKILL.md étapes 4 et 5. D18 (script de plan) : tâches 2 et 3. D19 (KINDS testée) : tâche 2, test « tout id du catalogue a un genre ». D20 (pas de journal) : seul `derived/build-plan.json` est écrit. D21 (base canonique observée) : `buildPlan`, test « www, pas l'apex du code ». D22 (parseur partagé) : tâche 1. Section 6 (référence, treize blocs, `check-sources`) : tâche 4. Section 7 (six temps) : tâche 5. Section 8 (erreurs) : SKILL.md 0.1, 0.2, 3 (build cassé), 4.1 (serveur muet), `plan.ts` (stratégie absente, audit absent), `buildPlan` (page absente, challenge, sans couche). Section 9 (tests) : tâches 1 à 4. Section 10 (AC-1 à AC-8) : tâches 6 et 7. Section 12 (points à instruire) : `check-sources` sur nextjs.org vérifié (80 OK) ; skill qui invoque la skill audit : tâche 7 AC-4 ; deux `next dev` : règle de réutilisation 4.1 ; dates git : recettes 3 et 7 ; `latestAuditDir` à mtime égal : tri par date du nom d'abord, testé.
2. **Placeholders.** Aucun « TBD », aucun « similaire à la tâche N » ; chaque fichier est donné en entier. Les « … » dans les exemples de `nextjs.md` et de SKILL.md sont des valeurs que la table validée remplit, pas des trous du plan.
3. **Cohérence des types.** `Severity` vient de `lib/report.ts` et est réutilisée par `lib/plan.ts` ; `BuildPlanInput.homeFinalUrl` est ce que `plan.ts` lit dans `pages[0].final` du dernier manifeste n0 ; `planSummary` est la ligne que `plan-cli.test.ts` et AC-1 attendent ; `parseRecipes` est consommée par `recipes.test.ts` et `check-sources.ts` avec la même signature.
4. **Code testé, conventions capturées.** Tâches 1 à 4 : exécutées dans le scratchpad (27 tests, `check-sources` à 80). Conventions externes : API Next.js 16 (recherche du 28/08, Context7 et docs en direct), `bun run dev --port` (échantillon chico, `$ next dev --port "3999"`), `bun x tsc --noEmit` (2 s sur chico), en-têtes de la prod Vercel (pas de Last-Modified), citations des docs (retrouvées par le script). Non exécuté, et écrit comme tel : SKILL.md (prose, couverte par la tâche 7) ; les commandes de la tâche 7 sont celles de la spec, à courir avec Romain.
