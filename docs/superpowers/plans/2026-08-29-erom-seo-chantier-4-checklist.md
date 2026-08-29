# Plan d'implémentation : erom-seo, chantier 4, `checklist`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer `/erom-seo:checklist` : un fichier `seo/checklist.md` à quinze lignes, avant et après le déploiement, que le plugin tient à jour à chaque passage (cases `auto` d'après les audits et git, cases `main` cochées par Romain et jamais décochées, cases `action` : ping IndexNow et sitemap chez Bing, derrière `--agir`).

**Architecture:** L'audit juge, le script écrit (D24). `lib/checklist.ts` est pur : la table `LINES`, la lecture et l'écriture du fichier (format strict, ligne reconnue par son libellé, D27), le calcul des cases depuis un `ChecklistInput`. `lib/actions.ts` et `lib/ancien-sitemap.ts` reçoivent leur `fetch` en paramètre. `checklist.ts` (CLI) fait toute la lecture disque, git et réseau, et n'écrit rien dehors sans `--agir` (D26). La skill enchaîne : situer, auditer la prod, écrire, agir avec accord, restituer.

**Tech Stack:** Bun 1.4.0, TypeScript, `bun:test`. Aucune dépendance nouvelle. Cobaye : chico-happiness (Next.js 16, déployé sur Vercel, clé IndexNow servie).

**Spec:** `docs/superpowers/specs/2026-08-29-erom-seo-checklist-design.md` (lue en entier avant de commencer : D23 à D28, sections 4 et 5). Conventions externes figées sur les exemples officiels : `docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md` (sections 3.1, 3.2, 3.3, 4). Note niveau 1 (modèle d'accès agence) : `docs/recherches/2026-08-29-niveau-1-apis.md`, section 5.

## Contraintes globales

- Runtime `bun` uniquement. Jamais `npm`, `npx`, `node` : un garde-fou local les bloque.
- Aucun service payant, aucune clé nouvelle. `BING_WMT_API_KEY` vient de `~/.zshenv` (`source ~/.zshenv` avant toute commande à clé) et **ne s'affiche jamais** : ni dans un test, ni dans un message, ni dans un fichier (incident du 28/08). Les tests passent `BING_WMT_API_KEY=""` à tout sous-processus.
- **Rien ne part vers l'extérieur sans `--agir`**, et `--agir` n'est jamais passé par un test ni par une tâche de ce plan avant la tâche 7 (recette, avec l'accord de Romain). Les lectures permises sans `--agir` : `GetUserSites` (clé présente), l'ancien sitemap (D28).
- Références, SKILL.md, README, `seo/checklist.md` en français, sans tiret cadratin (em dash) : ces textes partent chez des tiers. Citations de documentation en anglais, mot pour mot, entre « ». `consoles.test.ts` refuse un em dash dans `consoles.md`.
- D5 de la spec mère : une entrée de `consoles.md` sans `Source` retrouvée par `check-sources.ts` ne se livre pas. Domaines admis : `OFFICIAL_DOMAINS` plus `learn.microsoft.com` et `search.google.com`. Les pages d'aide `bing.com/webmasters/help/*` sont des applications JavaScript : citées `[manuel]` seulement.
- **Git : travailler dans un worktree, jamais `git switch` ni `git checkout` dans `/Users/recarnot/dev/erom-agence-seo`** (checkout partagé avec la session mère ; incident du 28/08). Tâche 1 : `git -C /Users/recarnot/dev/erom-agence-seo worktree add /Users/recarnot/dev/erom-agence-seo-chantier-4 -b chantier-4-checklist main`, puis tout se passe dans `/Users/recarnot/dev/erom-agence-seo-chantier-4`. Un commit par tâche, message en français, préfixes `feat(checklist):`, `test(checklist):`, `docs(checklist):`. Pas de fusion : la session mère relit et fusionne.
- Toute commande de ce plan se lance depuis `/Users/recarnot/dev/erom-agence-seo-chantier-4/plugin` sauf mention contraire. Tests : `bun test`. Suite de départ : 216 tests verts.
- Interdits dans les tests : lire le code source depuis un test, figer un compte de catalogue, asserter sur un mock plutôt que sur un comportement. Les fixtures sont les vrais fichiers de chico du 28/08 déjà dans `skills/build/scripts/tests/fixtures/chico/`, copiés une fois (tâche 1), jamais modifiés.
- **Le code TypeScript des tâches 1 à 4 a été exécuté avec ses tests avant l'écriture du plan** (34 tests verts, 128 assertions, scratchpad du 29/08, 14 h 55). Les imports y étaient absolus ; ils sont recalculés ci-dessous pour l'arborescence du plugin par script, pas à la main. Si un import casse malgré tout, le test de la tâche fait foi : corriger le chemin, pas le code.
- Ne rien modifier dans `/Users/recarnot/dev/chico-happiness` avant la tâche 7, et seulement ce que la tâche dit.

## Structure des fichiers

```
plugin/
  README.md                                         modifier : section « Vérifier avant et après le déploiement » (tâche 6)
  .claude-plugin/plugin.json                        modifier : « lancement » devient « checklist » dans description (tâche 6)
  skills/
    audit/scripts/check-sources.ts                  modifier : vérifie aussi consoles.md (tâche 5)
    checklist/
      SKILL.md                                      créer (tâche 6)
      references/consoles.md                        créer (tâche 5)
      scripts/
        checklist.ts                                créer : CLI (tâche 4)
        lib/checklist.ts                            créer : LINES, parseChecklist, renderChecklist, computeChecklist (tâche 1)
        lib/actions.ts                              créer : pingIndexNow, bingUserSites, bingSubmitFeed, redact (tâche 2)
        lib/ancien-sitemap.ts                       créer : judgeChain, checkRedirections (tâche 3)
        tests/checklist.test.ts                     créer (tâche 1)
        tests/actions.test.ts                       créer (tâche 2)
        tests/ancien-sitemap.test.ts                créer (tâche 3)
        tests/checklist-cli.test.ts                 créer (tâche 4)
        tests/consoles.test.ts                      créer (tâche 5)
        tests/fixtures/chico/                       copié depuis build/scripts/tests/fixtures/chico (tâche 1) :
          report.md, report-n2.md, manifest.json, strategy.md
docs/superpowers/plans/2026-08-29-erom-seo-chantier-4-recette.md   créer (tâche 6), dérouler (tâche 7)
```

Réutilisé tel quel, sans modification : `lib/report.ts` (`parseReport`, `latestAuditDir`), `lib/strategy.ts` (`parseStrategy`), `skills/audit/scripts/lib/fetch.ts` (`fetchChain`), `skills/audit/scripts/lib/sitemap.ts` (`parseSitemap`, `decodeSitemapBody`, `sameSite`), `skills/audit/scripts/lib/types.ts` (`Manifest`, `FetchResult`, `Hop`), `skills/build/scripts/lib/plan.ts` (`kindOf`, la table des hors build), `skills/build/scripts/lib/recipes.ts` (`parseRecipes`, pour lire `consoles.md`), `skills/strategy/scripts/lib/keywords.ts` (`assertNoSecret`).

---

### Tâche 1 : le fichier et le calcul des cases, `lib/checklist.ts`

**Files:**
- Create: `skills/checklist/scripts/lib/checklist.ts`
- Create: `skills/checklist/scripts/tests/checklist.test.ts`
- Create: `skills/checklist/scripts/tests/fixtures/chico/{report.md,report-n2.md,manifest.json,strategy.md}` (copies)

**Interfaces:**
- Consumes: `Report` de `lib/report.ts` ; `kindOf` de `skills/build/scripts/lib/plan.ts` (dans le test seulement).
- Produces: `LINES: readonly LineDef[]` (15 lignes, ids `CL-01` à `CL-15`) ; `parseChecklist(md: string): ParsedChecklist` (lève `ChecklistError`) ; `renderChecklist(cl: Checklist): string` ; `computeChecklist(i: ChecklistInput): Checklist` ; `checklistSummary(cl, today): string` ; `dueToday(cl, today): Line[]` ; `addDays(date, n): string` ; types `Line`, `LineKind`, `Checklist`, `ParsedChecklist`, `ChecklistInput`, `RedirectCheck`, `BingSite`, `ActionResult`. Le CLI (tâche 4) et les tâches 2 et 3 s'appuient sur ces noms exacts.

- [ ] **Étape 1 : le worktree et les fixtures**

```bash
git -C /Users/recarnot/dev/erom-agence-seo worktree add /Users/recarnot/dev/erom-agence-seo-chantier-4 -b chantier-4-checklist main
cd /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin
bun install --frozen-lockfile
bun test 2>&1 | tail -3        # attendu : 216 pass, 0 fail
mkdir -p skills/checklist/scripts/lib skills/checklist/scripts/tests/fixtures/chico skills/checklist/references
for f in report.md report-n2.md manifest.json strategy.md; do cp skills/build/scripts/tests/fixtures/chico/$f skills/checklist/scripts/tests/fixtures/chico/$f; done
```

- [ ] **Étape 2 : le test qui échoue**

Écrire `skills/checklist/scripts/tests/checklist.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { parseReport } from "../../../../lib/report";
import { kindOf } from "../../../../skills/build/scripts/lib/plan";
import { addDays, checklistSummary, ChecklistError, computeChecklist, dueToday, LINES, parseChecklist, renderChecklist, renderedLabel, type ChecklistInput } from "../lib/checklist";

const F = `${import.meta.dir}/fixtures/chico`;
const n0 = parseReport(await Bun.file(`${F}/report.md`).text());
const n2 = parseReport(await Bun.file(`${F}/report-n2.md`).text());
const horsBuildOu = (id: string) => { const k = kindOf(id); return k.kind === "hors-build" ? k.ou : undefined; };
const matches = (u: string) => /commentchercherbonheur\.org/.test(u);

/** Un site avant déploiement : n2 vert, sur main, un commit seo, pas de clé Bing. */
const base: ChecklistInput = {
  site: "commentchercherbonheur.org", origin: "https://www.commentchercherbonheur.org", today: "2026-08-29", miseEnLigne: null, previous: null,
  n2: { dir: "seo/audits/2026-08-29-n2-3", report: n2 }, n0: { dir: "seo/audits/2026-08-28-n0", report: n0 }, n0Prod: null,
  git: { branch: "main", seoCommit: "1a2b3c4 seo(IDX-02): canonical absolu" }, horsBuildOu,
  ancienSitemap: null, redirections: null, bing: null, bingSiteMatches: matches, pages: ["/", "/methode"], actions: {},
};

describe("addDays et libellés des jalons", () => {
  test("J+30 d'un 29 août est le 28 septembre, J+90 le 27 novembre", () => {
    expect(addDays("2026-08-29", 30)).toBe("2026-09-28");
    expect(addDays("2026-08-29", 90)).toBe("2026-11-27");
    expect(addDays("2026-08-29", 1)).toBe("2026-08-30");
  });
  test("date invalide refusée", () => expect(() => addDays("hier", 1)).toThrow(/date invalide/));
  test("un jalon porte sa date quand la mise en ligne est connue, sinon rien", () => {
    const j1 = LINES.find((d) => d.id === "CL-11")!;
    expect(renderedLabel(j1, "2026-08-29")).toBe("J+1 2026-08-30 : sitemap soumis dans Search Console");
    expect(renderedLabel(j1, null)).toBe("J+1 : sitemap soumis dans Search Console");
  });
});

describe("avant le déploiement", () => {
  const cl = computeChecklist(base);
  const by = (id: string) => cl.lines.find((l) => l.id === id)!;
  test("audit n2 vert et commit seo sur main cochent les deux premières lignes, avec leur preuve", () => {
    expect(by("CL-01").checked).toBe(true);
    expect(by("CL-01").note).toContain("seo/audits/2026-08-29-n2-3/report.md");
    expect(by("CL-02").checked).toBe(true);
    expect(by("CL-02").note).toContain("1a2b3c4");
  });
  test("les hors build du dernier n0 sont listés sous la ligne 3 avec leur « ou »", () => {
    expect(by("CL-03").checked).toBe(false);
    expect(by("CL-03").sub.some((s) => s.startsWith("IDX-04") && s.includes("Vercel"))).toBe(true);
  });
  test("sans clé Bing la ligne 5 est à la main ; la moitié après est vide", () => {
    expect(by("CL-05").kind).toBe("main");
    for (const l of cl.lines.filter((l) => l.phase === "apres")) expect(l.checked).toBe(false);
    expect(by("CL-09").note).toBe("pas encore déployé");
  });
  test("sur une branche seo-build la ligne 2 dit de fusionner", () => {
    const l = computeChecklist({ ...base, git: { branch: "seo-build-2026-08-29", seoCommit: "1a2b3c4 seo(x)" } }).lines.find((l) => l.id === "CL-02")!;
    expect(l.checked).toBe(false);
    expect(l.note).toContain("seo-build-2026-08-29");
  });
  test("un audit n2 avec une trouvaille Critique laisse la ligne 1 vide", () => {
    const l = computeChecklist({ ...base, n2: { dir: "seo/audits/x-n2", report: n0 } }).lines.find((l) => l.id === "CL-01")!;
    expect(l.checked).toBe(false);
  });
});

describe("le fichier : rendu puis relecture", () => {
  test("rendu, relu, identique ; les cases main cochées survivent à trois passages", () => {
    const md1 = renderChecklist(computeChecklist(base));
    const p1 = parseChecklist(md1);
    expect(p1.header.miseEnLigne).toBeNull();
    expect(p1.lines.size).toBe(LINES.length);
    const ticked = md1.replace("- [ ] Search Console : propriété créée", "- [x] Search Console : propriété créée");
    let prev = parseChecklist(ticked);
    for (let n = 0; n < 3; n++) prev = parseChecklist(renderChecklist(computeChecklist({ ...base, previous: prev })));
    expect(prev.lines.get("CL-04")!.checked).toBe(true);
    expect(prev.lines.get("CL-05")!.checked).toBe(false);
  });
  test("une ligne inconnue est une erreur, jamais un silence", () => {
    const md = renderChecklist(computeChecklist(base)).replace("Ancien sitemap sauvegardé", "Ancien sitemap archivé");
    expect(() => parseChecklist(md)).toThrow(ChecklistError);
    expect(() => parseChecklist(md)).toThrow(/libellé inconnu : Ancien sitemap archivé/);
  });
  test("un en-tête mal formé est une erreur", () => expect(() => parseChecklist("# Truc\n")).toThrow(/Checklist SEO\/GEO/));
});

describe("après le déploiement", () => {
  const apres: ChecklistInput = { ...base, miseEnLigne: "2026-08-29", today: "2026-08-30", n0Prod: { dir: "seo/audits/2026-08-30-n0", report: n2 }, bing: [] };
  test("prod verte cochée d'après le n0 postérieur, jalons datés, pages de la stratégie sous J+3", () => {
    const cl = computeChecklist(apres);
    const by = (id: string) => cl.lines.find((l) => l.id === id)!;
    expect(by("CL-07").checked).toBe(true);
    expect(by("CL-11").label).toBe("J+1 2026-08-30 : sitemap soumis dans Search Console");
    expect(by("CL-15").label).toBe("J+90 2026-11-27 : audit de contrôle");
    expect(by("CL-12").sub).toEqual(["https://www.commentchercherbonheur.org/", "https://www.commentchercherbonheur.org/methode"]);
    expect(cl.header.auditProd).toBe("seo/audits/2026-08-30-n0");
  });
  test("la prod qui régresse vide la case avec la raison", () => {
    const l = computeChecklist({ ...apres, n0Prod: { dir: "seo/audits/2026-09-01-n0", report: n0 } }).lines.find((l) => l.id === "CL-07")!;
    expect(l.checked).toBe(false);
    expect(l.note).toContain("Critique");
  });
  test("aucun n0 depuis la mise en ligne : prod verte vide, actions en attente", () => {
    const cl = computeChecklist({ ...apres, n0Prod: null });
    expect(cl.lines.find((l) => l.id === "CL-07")!.note).toContain("aucun audit prod");
    expect(cl.lines.find((l) => l.id === "CL-09")!.note).toContain("en attente");
  });
  test("compte Bing sans le site : ligne 5 auto vide, Bing en attente ; avec le site vérifié : cochée", () => {
    const cl = computeChecklist(apres);
    expect(cl.lines.find((l) => l.id === "CL-05")!).toMatchObject({ kind: "auto", checked: false });
    expect(cl.lines.find((l) => l.id === "CL-10")!.note).toContain("en attente");
    const ok = computeChecklist({ ...apres, bing: [{ Url: "https://www.commentchercherbonheur.org/", IsVerified: true }] });
    expect(ok.lines.find((l) => l.id === "CL-05")!.checked).toBe(true);
    const nv = computeChecklist({ ...apres, bing: [{ Url: "https://www.commentchercherbonheur.org/", IsVerified: false }] });
    expect(nv.lines.find((l) => l.id === "CL-05")!.checked).toBe(false);
    expect(nv.lines.find((l) => l.id === "CL-05")!.note).toContain("IsVerified false");
  });
  test("une action réussie est cochée avec la date et le nombre d'URL, et reste cochée au passage suivant", () => {
    const done = computeChecklist({ ...apres, actions: { indexnow: { ok: true, status: 202, urls: 10, message: "Accepted" } } });
    const l = done.lines.find((l) => l.id === "CL-09")!;
    expect(l).toMatchObject({ checked: true, note: "2026-08-30 · 202, 10 URL" });
    const next = computeChecklist({ ...apres, today: "2026-09-02", previous: parseChecklist(renderChecklist(done)) });
    expect(next.lines.find((l) => l.id === "CL-09")!).toMatchObject({ checked: true, note: "2026-08-30 · 202, 10 URL" });
  });
  test("une action refusée reste vide avec le code", () => {
    const l = computeChecklist({ ...apres, actions: { indexnow: { ok: false, status: 403, message: "clé non servie" } } }).lines.find((l) => l.id === "CL-09")!;
    expect(l).toMatchObject({ checked: false, note: "403 : clé non servie" });
  });
  test("ancien sitemap : une URL en 404 laisse la case vide et la liste", () => {
    const cl = computeChecklist({ ...apres, ancienSitemap: { path: "seo/checklist/ancien-sitemap.xml", count: 2 }, redirections: [{ url: "https://old.fr/a", ok: true, detail: "301 → 200" }, { url: "https://old.fr/b", ok: false, detail: "404" }] });
    const l = cl.lines.find((l) => l.id === "CL-08")!;
    expect(l.checked).toBe(false);
    expect(l.sub).toEqual(["https://old.fr/b → 404"]);
    expect(cl.lines.find((l) => l.id === "CL-06")!.note).toContain("2 URL");
  });
  test("dû aujourd'hui : les jalons échus non cochés", () => {
    const cl = computeChecklist({ ...apres, today: "2026-09-02" });
    expect(dueToday(cl, "2026-09-02").map((l) => l.id)).toEqual(["CL-11", "CL-12"]);
    expect(checklistSummary(cl, "2026-09-02")).toContain("dû aujourd'hui : J+1 2026-08-30 : sitemap soumis dans Search Console ; J+3 2026-09-01 : pages clés indexées");
  });
});
```

- [ ] **Étape 3 : vérifier qu'il échoue**

Run : `bun test skills/checklist/scripts/tests/checklist.test.ts`
Attendu : échec, `Cannot find module "../lib/checklist"`.

- [ ] **Étape 4 : l'implémentation**

Écrire `skills/checklist/scripts/lib/checklist.ts` :

```ts
// Logique pure de checklist.ts : la table des lignes, la lecture et l'écriture de seo/checklist.md, le calcul des cases.
// Aucun réseau, aucun disque, aucun git : tout arrive par ChecklistInput (spec chantier 4, D24, D25, D27).
import type { Report } from "../../../../lib/report";

export type LineKind = "auto" | "main" | "action";
export type Phase = "avant" | "apres";
export type LineDef = { id: string; label: string; kind: LineKind; phase: Phase; jour?: number; consigne?: string };

/** Les quinze lignes, dans l'ordre du fichier (spec 4.3). Le libellé est la clé de reconnaissance (D27), jamais la position. */
export const LINES: readonly LineDef[] = [
  { id: "CL-01", label: "Audit niveau 2 vert", kind: "auto", phase: "avant" },
  { id: "CL-02", label: "Branche seo-build fusionnée", kind: "auto", phase: "avant" },
  { id: "CL-03", label: "Hors build réglés", kind: "main", phase: "avant", consigne: "chaque hors build à l'endroit dit par son « ou »" },
  { id: "CL-04", label: "Search Console : propriété créée", kind: "main", phase: "avant", consigne: "search.google.com/search-console, Ajouter une propriété, type Domaine, enregistrement TXT chez le registrar" },
  { id: "CL-05", label: "Bing Webmaster Tools : site ajouté", kind: "main", phase: "avant", consigne: "bing.com/webmasters, Ajouter un site, Importer depuis Google Search Console" },
  { id: "CL-06", label: "Ancien sitemap sauvegardé", kind: "auto", phase: "avant" },
  { id: "CL-07", label: "Prod verte", kind: "auto", phase: "apres" },
  { id: "CL-08", label: "Redirections de l'ancien site", kind: "auto", phase: "apres" },
  { id: "CL-09", label: "Ping IndexNow", kind: "action", phase: "apres" },
  { id: "CL-10", label: "Sitemap soumis à Bing", kind: "action", phase: "apres" },
  { id: "CL-11", label: "sitemap soumis dans Search Console", kind: "main", phase: "apres", jour: 1, consigne: "Search Console, Sitemaps, coller https://<site>/sitemap.xml (rôle Owner)" },
  { id: "CL-12", label: "pages clés indexées", kind: "main", phase: "apres", jour: 3, consigne: "Search Console, Inspection d'URL, une page par sous-ligne" },
  { id: "CL-13", label: "premières impressions", kind: "main", phase: "apres", jour: 7, consigne: "Search Console, Performances, 7 derniers jours" },
  { id: "CL-14", label: "rapports IA lus", kind: "main", phase: "apres", jour: 30, consigne: "Search Console, Performances, filtre Generative AI (pas sur toutes les propriétés) ; Bing Webmaster Tools, AI Performance" },
  { id: "CL-15", label: "audit de contrôle", kind: "main", phase: "apres", jour: 90, consigne: "relance /erom-seo:checklist, l'audit niveau 0 est refait ; le niveau 1 arrive au chantier 5" },
];
export const SUB_CL04 = "site client : ajouter le compte de l'agence comme utilisateur de la propriété (rôle minimal)";
export const SUB_CL05 = "site client : le client délègue le site en lecture seule au compte de l'agence (écran Users) ; ne jamais demander sa clé";

export type Line = { id: string; label: string; kind: LineKind; phase: Phase; checked: boolean; note: string; sub: string[] };
export type Header = { site: string; miseEnLigne: string | null; dernierPassage: string; auditLocal: string | null; auditProd: string | null };
export type Checklist = { header: Header; lines: Line[] };
export type ParsedLine = { id: string; checked: boolean; kind: LineKind; note: string; sub: string[] };
export type ParsedChecklist = { header: Header; lines: Map<string, ParsedLine> };

export class ChecklistError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "ChecklistError"; }
}

/** Date AAAA-MM-JJ décalée de n jours, en UTC (J+30 d'un 29 août est le 28 septembre). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`date invalide : ${date}`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Libellé rendu : les jalons portent « J+n <date> : » devant, calculé depuis la mise en ligne ; sans date, « J+n : ». */
export function renderedLabel(def: LineDef, miseEnLigne: string | null): string {
  if (def.jour === undefined) return def.label;
  return miseEnLigne ? `J+${def.jour} ${addDays(miseEnLigne, def.jour)} : ${def.label}` : `J+${def.jour} : ${def.label}`;
}

const JALON = /^J\+\d+(?: \d{4}-\d{2}-\d{2})? : (.+)$/;
/** Retrouve la définition d'une ligne à partir de son libellé rendu ; null si inconnu (D27). */
export function defByLabel(label: string): LineDef | null {
  const bare = label.match(JALON)?.[1] ?? label;
  return LINES.find((d) => d.label === bare) ?? null;
}

const HEADER_1 = /^# Checklist SEO\/GEO : (.+)$/;
const HEADER_2 = /^Mise en ligne : (\d{4}-\d{2}-\d{2}|non) · Dernier passage : (\d{4}-\d{2}-\d{2}) · Audit local : (.+?) · Audit prod : (.+)$/;
const LINE = /^- \[( |x)\] (.+?) · (auto|main|action) · (.*)$/;
const SUB = /^  - (.+)$/;

/** Lit un seo/checklist.md écrit par renderChecklist. Lève ChecklistError sur un en-tête ou une ligne inconnue ; ne devine jamais. */
export function parseChecklist(md: string): ParsedChecklist {
  const errors: string[] = [];
  const rows = md.split("\n");
  const site = rows[0]?.match(HEADER_1)?.[1]?.trim();
  if (!site) errors.push("première ligne : « # Checklist SEO/GEO : <site> » attendu");
  const h = rows[1]?.match(HEADER_2);
  if (!h) errors.push("deuxième ligne : « Mise en ligne : … · Dernier passage : … · Audit local : … · Audit prod : … » attendu");
  const lines = new Map<string, ParsedLine>();
  let cur: ParsedLine | null = null;
  for (const [i, row] of rows.slice(2).entries()) {
    if (row.trim() === "" || row.startsWith("## ")) { cur = null; continue; }
    const s = row.match(SUB);
    if (s) { if (cur) cur.sub.push(s[1]); else errors.push(`ligne ${i + 3} : sous-ligne sans case au-dessus`); continue; }
    const m = row.match(LINE);
    if (!m) { errors.push(`ligne ${i + 3} : forme inconnue : ${row}`); cur = null; continue; }
    const def = defByLabel(m[2]);
    if (!def) { errors.push(`ligne ${i + 3} : libellé inconnu : ${m[2]}`); cur = null; continue; }
    if (lines.has(def.id)) errors.push(`ligne ${i + 3} : « ${def.label} » en double`);
    cur = { id: def.id, checked: m[1] === "x", kind: m[3] as LineKind, note: m[4].trim(), sub: [] };
    lines.set(def.id, cur);
  }
  if (errors.length) throw new ChecklistError(errors);
  return {
    header: { site: site!, miseEnLigne: h![1] === "non" ? null : h![1], dernierPassage: h![2], auditLocal: h![3] === "aucun" ? null : h![3], auditProd: h![4] === "aucun" ? null : h![4] },
    lines,
  };
}

export function renderChecklist(cl: Checklist): string {
  const { header: hd } = cl;
  const out = [
    `# Checklist SEO/GEO : ${hd.site}`,
    `Mise en ligne : ${hd.miseEnLigne ?? "non"} · Dernier passage : ${hd.dernierPassage} · Audit local : ${hd.auditLocal ?? "aucun"} · Audit prod : ${hd.auditProd ?? "aucun"}`,
  ];
  for (const phase of ["avant", "apres"] as const) {
    out.push("", phase === "avant" ? "## Avant le déploiement" : "## Après le déploiement");
    for (const l of cl.lines.filter((l) => l.phase === phase)) {
      out.push(`- [${l.checked ? "x" : " "}] ${l.label} · ${l.kind} · ${l.note}`);
      for (const s of l.sub) out.push(`  - ${s}`);
    }
  }
  return out.join("\n") + "\n";
}

export type RedirectCheck = { url: string; ok: boolean; detail: string };
export type BingSite = { Url: string; IsVerified: boolean };
export type ActionResult = { ok: boolean; status: number; message: string; urls?: number };

export type ChecklistInput = {
  site: string;
  /** Origine réellement servie (hôte observé par le dernier audit n0, www ou apex), pour les URL absolues. */
  origin: string;
  today: string;
  miseEnLigne: string | null;
  previous: ParsedChecklist | null;
  n2: { dir: string; report: Report } | null;
  /** Dernier audit niveau 0, quel qu'il soit : sert aux hors build. */
  n0: { dir: string; report: Report } | null;
  /** Le même n0 s'il est daté du jour de la mise en ligne ou après ; sinon null : la prod n'a pas encore été vue. */
  n0Prod: { dir: string; report: Report } | null;
  git: { branch: string; seoCommit: string | null };
  horsBuildOu: (id: string) => string | undefined;
  ancienSitemap: { path: string; count: number } | null;
  redirections: RedirectCheck[] | null;
  /** null = pas de clé Bing (ligne 5 reste « main ») ; sinon les sites du compte, même vides. */
  bing: BingSite[] | null;
  bingSiteMatches: (siteUrl: string) => boolean;
  pages: string[];
  actions: { indexnow?: ActionResult; bing?: ActionResult };
};

const vert = (r: Report) => r.counts.Critique === 0 && r.counts.Important === 0;
const comptes = (r: Report) => `${r.counts.Critique} Critique, ${r.counts.Important} Important`;

/** Calcule les quinze lignes. Une case « main » cochée dans l'ancien fichier reste cochée ; une case « auto » suit sa source ; une « action » cochée reste faite. */
export function computeChecklist(i: ChecklistInput): Checklist {
  const prev = (id: string) => i.previous?.lines.get(id) ?? null;
  const keepMain = (id: string) => prev(id)?.checked ?? false;
  const line = (def: LineDef, kind: LineKind, checked: boolean, note: string, sub: string[] = []): Line =>
    ({ id: def.id, label: renderedLabel(def, i.miseEnLigne), kind, phase: def.phase, checked, note, sub });
  const lines: Line[] = [];

  for (const def of LINES) {
    switch (def.id) {
      case "CL-01": lines.push(i.n2 ? line(def, "auto", vert(i.n2.report), `${i.n2.dir}/report.md · ${comptes(i.n2.report)}`) : line(def, "auto", false, "aucun audit niveau 2 : lance /erom-seo:build")); break;
      case "CL-02": {
        const onMain = i.git.branch === "main" || i.git.branch === "master";
        if (!onMain) lines.push(line(def, "auto", false, `tu es sur ${i.git.branch}, fusionne d'abord`));
        else if (i.git.seoCommit) lines.push(line(def, "auto", true, `git : ${i.git.seoCommit}`));
        else lines.push(line(def, "auto", false, "aucun commit seo(…) sur la branche courante"));
        break;
      }
      case "CL-03": {
        const hb = i.n0 ? i.n0.report.findings.filter((f) => f.severity !== "Info" && i.horsBuildOu(f.id) !== undefined) : [];
        const sub = hb.map((f) => `${f.id} : ${f.title} · ou : ${i.horsBuildOu(f.id)} · vu dans ${i.n0!.dir}`);
        lines.push(line(def, "main", keepMain(def.id), hb.length ? def.consigne! : "aucune trouvaille hors build connue", sub));
        break;
      }
      case "CL-04": lines.push(line(def, "main", keepMain(def.id), def.consigne!, [SUB_CL04])); break;
      case "CL-05": {
        if (i.bing === null) { lines.push(line(def, "main", keepMain(def.id), def.consigne!, [SUB_CL05])); break; }
        const s = i.bing.find((b) => i.bingSiteMatches(b.Url));
        if (!s) lines.push(line(def, "auto", false, `absent du compte Bing de l'agence le ${i.today} · ${def.consigne}`, [SUB_CL05]));
        else lines.push(line(def, "auto", s.IsVerified, `présent dans le compte Bing de l'agence le ${i.today}, ${s.IsVerified ? "vérifié" : "non vérifié (IsVerified false)"} · ${s.Url}`, s.IsVerified ? [] : [SUB_CL05]));
        break;
      }
      case "CL-06": lines.push(i.ancienSitemap ? line(def, "auto", true, `${i.ancienSitemap.path} · ${i.ancienSitemap.count} URL`) : line(def, "auto", true, "sans objet (pas d'ancien site)")); break;
      case "CL-07": {
        if (!i.miseEnLigne) { lines.push(line(def, "auto", false, "pas encore déployé")); break; }
        if (!i.n0Prod) { lines.push(line(def, "auto", false, "aucun audit prod depuis la mise en ligne")); break; }
        const r = i.n0Prod.report;
        lines.push(line(def, "auto", vert(r), `${i.n0Prod.dir}/report.md · ${comptes(r)}${vert(r) ? "" : ` · ${enBref(r)}`}`));
        break;
      }
      case "CL-08": {
        if (!i.miseEnLigne) { lines.push(line(def, "auto", false, "pas encore déployé")); break; }
        if (!i.ancienSitemap) { lines.push(line(def, "auto", true, "sans objet (pas d'ancien site)")); break; }
        if (!i.redirections) { lines.push(line(def, "auto", false, "ancien sitemap pas encore suivi")); break; }
        const ko = i.redirections.filter((r) => !r.ok);
        lines.push(line(def, "auto", ko.length === 0, ko.length ? `${ko.length} URL sur ${i.redirections.length} ne redirigent pas vers une page en 200` : `${i.redirections.length} URL en 301 ou 308 vers une page en 200 (${i.today})`, ko.map((r) => `${r.url} → ${r.detail}`)));
        break;
      }
      case "CL-09": lines.push(actionLine(def, "indexnow")); break;
      case "CL-10": lines.push(actionLine(def, "bing")); break;
      default: {
        // jalons J+n : à la main, la case survit, les sous-lignes de CL-12 sont les pages de la stratégie
        const sub = def.id === "CL-12" ? i.pages.map((p) => `${i.origin}${p}`) : [];
        lines.push(line(def, "main", keepMain(def.id), def.consigne!, sub));
      }
    }
  }
  return {
    header: { site: i.site, miseEnLigne: i.miseEnLigne, dernierPassage: i.today, auditLocal: i.n2?.dir ?? null, auditProd: i.n0Prod?.dir ?? null },
    lines,
  };

  function actionLine(def: LineDef, which: "indexnow" | "bing"): Line {
    const p = prev(def.id);
    if (!i.miseEnLigne) return line(def, "action", false, "pas encore déployé");
    const res = i.actions[which];
    if (res) return line(def, "action", res.ok, res.ok ? `${i.today} · ${res.status}${res.urls !== undefined ? `, ${res.urls} URL` : ""}` : `${res.status} : ${res.message}`);
    if (p?.checked) return line(def, "action", true, p.note);
    if (which === "bing") {
      const cl05 = lines.find((l) => l.id === "CL-05");
      if (!cl05?.checked) return line(def, "action", false, "en attente : Bing Webmaster Tools pas encore configuré (ligne « Bing Webmaster Tools : site ajouté »)");
    }
    if (!i.n0Prod) return line(def, "action", false, "en attente : aucun audit prod depuis la mise en ligne");
    return line(def, "action", false, p?.note && /^refusé/.test(p.note) ? p.note : "à faire : relance avec --agir");
  }
}

/** La ligne « En bref » d'un rapport, ou ses comptes si elle manque. */
export function enBref(r: Report): string { return `${r.counts.Critique} Critique · ${r.counts.Important} Important · ${r.counts.Mineur} Mineur · ${r.counts.Info} Info`; }

/** Jalons dus : date passée ou du jour, case vide. */
export function dueToday(cl: Checklist, today: string): Line[] {
  return cl.lines.filter((l) => !l.checked && /^J\+\d+ (\d{4}-\d{2}-\d{2}) :/.test(l.label) && l.label.match(/^J\+\d+ (\d{4}-\d{2}-\d{2}) :/)![1] <= today);
}

export function checklistSummary(cl: Checklist, today: string): string {
  const n = cl.lines.filter((l) => l.checked).length;
  const due = dueToday(cl, today).map((l) => l.label);
  return `checklist : ${n}/${cl.lines.length} cochées · mise en ligne : ${cl.header.miseEnLigne ?? "non"} · dû aujourd'hui : ${due.length ? due.join(" ; ") : "rien"}`;
}
```

- [ ] **Étape 5 : vérifier que tout passe**

Run : `bun test skills/checklist/scripts/tests/checklist.test.ts`
Attendu : 19 pass, 0 fail. Puis `bun test` : 235 pass, 0 fail.

- [ ] **Étape 6 : commit**

```bash
git add skills/checklist/scripts/lib/checklist.ts skills/checklist/scripts/tests/checklist.test.ts skills/checklist/scripts/tests/fixtures/chico
git commit -m "feat(checklist): table des quinze lignes, lecture et écriture de seo/checklist.md, calcul des cases (D25, D27)"
```

---

### Tâche 2 : les deux écritures et la lecture Bing, `lib/actions.ts`

**Files:**
- Create: `skills/checklist/scripts/lib/actions.ts`
- Create: `skills/checklist/scripts/tests/actions.test.ts`

**Interfaces:**
- Consumes: `ActionResult`, `BingSite` de `./checklist`.
- Produces: `type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>` ; `defaultFetcher` ; `pingIndexNow(f, { host, key, urls }): Promise<ActionResult>` ; `bingUserSites(f, key): Promise<BingSite[]>` (lève sur clé refusée) ; `bingSubmitFeed(f, key, siteUrl, feedUrl): Promise<ActionResult>` ; `redact(text, key): string` ; `bingError(status, text, key): string` ; constantes `INDEXNOW_ENDPOINT`, `BING_API_BASE`, `INDEXNOW_MESSAGES`, `BING_ERROR_CODES`.

Conventions externes, avec leur échantillon (recherche du 29/08) : corps du POST IndexNow et tableau des codes, section 3.1 (extrait brut de `indexnow.org/documentation`) ; `SubmitFeed` en POST JSON `{"siteUrl","feedUrl"}` réponse `{"d":null}`, et `GetUserSites` en GET réponse `{"d":[{Url, IsVerified, …}]}`, section 3.2 (exemples officiels Microsoft Learn) ; enum `ApiErrorCode`, section 3.2 ; `{"d":[]}` capturé avec la clé de Romain, section 4.3.

- [ ] **Étape 1 : le test qui échoue**

Écrire `skills/checklist/scripts/tests/actions.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { bingError, bingSubmitFeed, bingUserSites, INDEXNOW_ENDPOINT, pingIndexNow, redact, type Fetcher } from "../lib/actions";

const KEY = "abcdef0123456789abcdef0123456789";
type Call = { url: string; method: string; body?: string; headers?: Record<string, string> };
/** Un faux fetch qui journalise les appels et répond ce qu'on lui dit. */
function fake(reply: (c: Call) => { status: number; text: string }): { f: Fetcher; calls: Call[] } {
  const calls: Call[] = [];
  const f: Fetcher = async (url, init = {}) => { const c = { url, method: init.method ?? "GET", body: init.body, headers: init.headers }; calls.push(c); return reply(c); };
  return { f, calls };
}

describe("ping IndexNow", () => {
  test("POST groupé conforme à la doc : host, key, keyLocation, urlList, content-type JSON UTF-8 ; 202 coche", async () => {
    const { f, calls } = fake(() => ({ status: 202, text: "" }));
    const r = await pingIndexNow(f, { host: "www.chico.org", key: KEY, urls: ["https://www.chico.org/", "https://www.chico.org/a"] });
    expect(r).toEqual({ ok: true, status: 202, message: "Accepted, URL reçues, validation de la clé en attente", urls: 2 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(INDEXNOW_ENDPOINT);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers).toEqual({ "content-type": "application/json; charset=utf-8" });
    expect(JSON.parse(calls[0].body!)).toEqual({ host: "www.chico.org", key: KEY, keyLocation: `https://www.chico.org/${KEY}.txt`, urlList: ["https://www.chico.org/", "https://www.chico.org/a"] });
  });
  test("403 et 422 laissent vide avec la raison du tableau officiel ; sans URL, aucun appel", async () => {
    const { f } = fake(() => ({ status: 403, text: "" }));
    expect(await pingIndexNow(f, { host: "h", key: KEY, urls: ["https://h/"] })).toMatchObject({ ok: false, status: 403, message: expect.stringContaining("clé non servie") });
    const { f: f2 } = fake(() => ({ status: 422, text: "" }));
    expect(await pingIndexNow(f2, { host: "h", key: KEY, urls: ["https://h/"] })).toMatchObject({ ok: false, status: 422 });
    const { f: f3, calls } = fake(() => ({ status: 200, text: "" }));
    expect((await pingIndexNow(f3, { host: "h", key: KEY, urls: [] })).ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("Bing Webmaster Tools", () => {
  test("GetUserSites : GET avec apikey, réponse {d:[…]} lue ; {d:[]} = aucun site", async () => {
    const sample = { d: [{ __type: "Site:#Microsoft.Bing.Webmaster.Api", AuthenticationCode: "X", DnsVerificationCode: "x.example.com", IsVerified: false, Url: "http://example.com" }] };
    const { f, calls } = fake(() => ({ status: 200, text: JSON.stringify(sample) }));
    expect(await bingUserSites(f, KEY)).toEqual([{ Url: "http://example.com", IsVerified: false }]);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toBe(`https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=${KEY}`);
    const { f: f2 } = fake(() => ({ status: 200, text: '{"d":[]}' }));
    expect(await bingUserSites(f2, KEY)).toEqual([]);
  });
  test("clé refusée : erreur nommée, la clé n'apparaît nulle part", async () => {
    const { f } = fake(() => ({ status: 400, text: `{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey ${KEY}"}` }));
    let msg = "";
    try { await bingUserSites(f, KEY); } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain("InvalidApiKey");
    expect(msg).toContain("~/.zshenv");
    expect(msg).not.toContain(KEY);
  });
  test("SubmitFeed : POST JSON {siteUrl, feedUrl}, 200 = ok ; 13, 14 et 11 = consigne au propriétaire", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"d":null}' }));
    const r = await bingSubmitFeed(f, KEY, "https://www.chico.org/", "https://www.chico.org/sitemap.xml");
    expect(r.ok).toBe(true);
    expect(calls[0]).toMatchObject({ method: "POST", url: `https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=${KEY}`, headers: { "content-type": "application/json; charset=utf-8" } });
    expect(JSON.parse(calls[0].body!)).toEqual({ siteUrl: "https://www.chico.org/", feedUrl: "https://www.chico.org/sitemap.xml" });
    for (const code of [11, 13, 14]) {
      const { f: fe } = fake(() => ({ status: 400, text: JSON.stringify({ ErrorCode: code, Message: "ERROR!!! x" }) }));
      const e = await bingSubmitFeed(fe, KEY, "s", "u");
      expect(e.ok).toBe(false);
      expect(e.message).toContain("propriétaire du site");
    }
  });
  test("bingError et redact : throttle dit de réessayer, texte illisible tronqué, clé masquée", () => {
    expect(bingError(400, '{"ErrorCode":4,"Message":"slow"}', KEY)).toContain("réessayer plus tard");
    expect(bingError(500, "<html>boom</html>", KEY)).toContain("HTTP 500");
    expect(redact(`x ${KEY} y`, KEY)).toBe("x [clé] y");
    expect(redact("x", null)).toBe("x");
  });
});
```

- [ ] **Étape 2 : vérifier qu'il échoue**

Run : `bun test skills/checklist/scripts/tests/actions.test.ts`
Attendu : échec, module `../lib/actions` introuvable.

- [ ] **Étape 3 : l'implémentation**

Écrire `skills/checklist/scripts/lib/actions.ts` :

```ts
// Les deux écritures (D26) et la lecture Bing, avec un fetch injecté : les tests passent un faux, le CLI passe le vrai.
// Conventions figées sur les exemples officiels : docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md, sections 3.1 et 3.2.
import type { ActionResult, BingSite } from "./checklist";

export type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string };
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>;

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const JSON_UTF8 = "application/json; charset=utf-8";

/** Tableau officiel des codes IndexNow (indexnow.org/documentation), en français pour la ligne du fichier. */
export const INDEXNOW_MESSAGES: Record<number, string> = {
  200: "OK, URL reçues", 202: "Accepted, URL reçues, validation de la clé en attente",
  400: "Bad request, format invalide", 403: "Forbidden, clé non servie en /<clé>.txt sur la prod ou différente de celle du fichier",
  422: "Unprocessable Entity, une URL n'est pas sur host, ou la clé n'a pas la forme attendue", 429: "Too Many Requests, réessayer plus tard",
};

/** Enum ApiErrorCode de Bing Webmaster Tools (learn.microsoft.com, 2019-04-26). */
export const BING_ERROR_CODES: Record<number, string> = {
  0: "None", 1: "InternalError", 2: "UnknownError", 3: "InvalidApiKey", 4: "ThrottleUser", 5: "ThrottleHost", 6: "UserBlocked", 7: "InvalidUrl",
  8: "InvalidParameter", 9: "TooManySites", 10: "UserNotFound", 11: "NotFound", 12: "AlreadyExists", 13: "NotAllowed", 14: "NotAuthorized", 15: "UnexpectedState", 16: "Deprecated",
};

export const defaultFetcher: Fetcher = async (url, init = {}) => {
  try {
    const res = await fetch(url, { method: init.method ?? "GET", headers: init.headers, body: init.body, signal: AbortSignal.timeout(30000) });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    // Jamais l'objet Error brut : sur un échec réseau il peut porter l'URL complète, donc la clé (leçon de keywords.ts).
    throw new Error(`service injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }
};

/** Retire la clé d'un texte destiné au fichier ou à l'écran. */
export function redact(text: string, key: string | null): string {
  return key && key.length >= 8 ? text.split(key).join("[clé]") : text;
}

/** POST groupé IndexNow. 200 ou 202 = ok. La clé IndexNow est publique par construction (servie à la racine), pas un secret. */
export async function pingIndexNow(f: Fetcher, p: { host: string; key: string; urls: string[] }): Promise<ActionResult> {
  if (p.urls.length === 0) return { ok: false, status: 0, message: "aucune URL à soumettre : sitemap de prod vide" };
  const body = JSON.stringify({ host: p.host, key: p.key, keyLocation: `https://${p.host}/${p.key}.txt`, urlList: p.urls.slice(0, 10000) });
  const r = await f(INDEXNOW_ENDPOINT, { method: "POST", headers: { "content-type": JSON_UTF8 }, body });
  const ok = r.status === 200 || r.status === 202;
  return { ok, status: r.status, message: INDEXNOW_MESSAGES[r.status] ?? `réponse inattendue${r.text ? ` : ${r.text.slice(0, 120)}` : ""}`, urls: p.urls.length };
}

/** Message lisible d'une erreur Bing `{"ErrorCode":n,"Message":"…"}`, sans jamais relayer la clé. */
export function bingError(status: number, text: string, key: string): string {
  let code: number | null = null, msg = "";
  try { const j = JSON.parse(text); code = typeof j.ErrorCode === "number" ? j.ErrorCode : null; msg = typeof j.Message === "string" ? j.Message : ""; } catch { msg = text.slice(0, 120); }
  const name = code !== null ? (BING_ERROR_CODES[code] ?? `code ${code}`) : "";
  const hint = code === 3 ? " : la clé de ~/.zshenv n'est plus la bonne (Bing Webmaster Tools, Settings, API Access)"
    : code === 4 || code === 5 ? " : réessayer plus tard"
    : code === 11 || code === 13 || code === 14 ? " : site hors du compte ou droits insuffisants, à faire par le propriétaire du site dans Bing Webmaster Tools" : "";
  return redact(`HTTP ${status}${name ? ` ${name}` : ""}${msg ? ` (${msg})` : ""}${hint}`, key);
}

/** GET GetUserSites : la liste des sites du compte, `{"d":[…]}`. Lève sur une clé refusée ou une réponse illisible. */
export async function bingUserSites(f: Fetcher, key: string): Promise<BingSite[]> {
  const r = await f(`${BING_API_BASE}/GetUserSites?${new URLSearchParams({ apikey: key })}`);
  if (r.status !== 200) throw new Error(`GetUserSites : ${bingError(r.status, r.text, key)}`);
  let d: unknown;
  try { d = (JSON.parse(r.text) as { d?: unknown }).d; } catch { throw new Error("GetUserSites : réponse illisible"); }
  if (!Array.isArray(d)) throw new Error("GetUserSites : réponse sans tableau d");
  return d.filter((s): s is BingSite => typeof s?.Url === "string").map((s) => ({ Url: s.Url, IsVerified: Boolean(s.IsVerified) }));
}

/** POST SubmitFeed : `{"siteUrl","feedUrl"}`, réponse 200 `{"d":null}`. */
export async function bingSubmitFeed(f: Fetcher, key: string, siteUrl: string, feedUrl: string): Promise<ActionResult> {
  const r = await f(`${BING_API_BASE}/SubmitFeed?${new URLSearchParams({ apikey: key })}`, { method: "POST", headers: { "content-type": JSON_UTF8 }, body: JSON.stringify({ siteUrl, feedUrl }) });
  if (r.status === 200) return { ok: true, status: 200, message: `sitemap ${feedUrl} soumis pour ${siteUrl}` };
  return { ok: false, status: r.status, message: bingError(r.status, r.text, key) };
}
```

- [ ] **Étape 4 : vérifier que tout passe**

Run : `bun test skills/checklist/scripts/tests/actions.test.ts`
Attendu : 6 pass, 0 fail.

- [ ] **Étape 5 : commit**

```bash
git add skills/checklist/scripts/lib/actions.ts skills/checklist/scripts/tests/actions.test.ts
git commit -m "feat(checklist): ping IndexNow, GetUserSites et SubmitFeed avec fetch injecté, clé jamais relayée (D26)"
```

---

### Tâche 3 : les redirections de l'ancien site, `lib/ancien-sitemap.ts`

**Files:**
- Create: `skills/checklist/scripts/lib/ancien-sitemap.ts`
- Create: `skills/checklist/scripts/tests/ancien-sitemap.test.ts`

**Interfaces:**
- Consumes: `FetchResult`, `Hop` de `skills/audit/scripts/lib/types.ts` ; `sameSite` de `skills/audit/scripts/lib/sitemap.ts` ; `RedirectCheck` de `./checklist`.
- Produces: `judgeChain(r: FetchResult, siteOrigin: string): RedirectCheck` ; `checkRedirections(locs: string[], siteOrigin: string, f: ChainFetcher): Promise<RedirectCheck[]>` ; `type ChainFetcher = (url: string) => Promise<FetchResult>`.

Doctrine (recherche du 29/08, section 3.4) : Google, « The 301 and 308 status codes mean that a page has permanently moved to a new location » ; 302, 303, 307 temporaires, jamais promus.

- [ ] **Étape 1 : le test qui échoue**

Écrire `skills/checklist/scripts/tests/ancien-sitemap.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import type { FetchResult, Hop } from "../../../../skills/audit/scripts/lib/types";
import { checkRedirections, judgeChain } from "../lib/ancien-sitemap";

const SITE = "https://www.chico.org";
function result(requested: string, chain: Hop[], status: number, final: string, error?: string): FetchResult {
  return { requested, final, status, chain, headers: {}, body: new Uint8Array(), ms: 1, ...(error ? { error } : {}) };
}

describe("verdict d'une chaîne", () => {
  test("301 puis 200 sur le site : ok ; 308 aussi ; deux sauts permanents aussi", () => {
    expect(judgeChain(result("https://old.fr/a", [{ url: "https://old.fr/a", status: 301, location: `${SITE}/a` }, { url: `${SITE}/a`, status: 200 }], 200, `${SITE}/a`), SITE)).toEqual({ url: "https://old.fr/a", ok: true, detail: "301 → 200" });
    expect(judgeChain(result("https://old.fr/b", [{ url: "https://old.fr/b", status: 308 }, { url: "https://chico.org/b", status: 301 }, { url: `${SITE}/b`, status: 200 }], 200, `${SITE}/b`), SITE).ok).toBe(true);
  });
  test("404 direct, 302 temporaire, 301 vers un 404, 301 hors site : tous en défaut, avec la raison", () => {
    expect(judgeChain(result("https://old.fr/c", [{ url: "https://old.fr/c", status: 404 }], 404, "https://old.fr/c"), SITE)).toMatchObject({ ok: false, detail: "404 sans redirection" });
    expect(judgeChain(result("https://old.fr/d", [{ url: "https://old.fr/d", status: 302 }, { url: `${SITE}/d`, status: 200 }], 200, `${SITE}/d`), SITE).detail).toContain("302 est temporaire");
    expect(judgeChain(result("https://old.fr/e", [{ url: "https://old.fr/e", status: 301 }, { url: `${SITE}/e`, status: 404 }], 404, `${SITE}/e`), SITE)).toMatchObject({ ok: false, detail: "301 → 404" });
    expect(judgeChain(result("https://old.fr/f", [{ url: "https://old.fr/f", status: 301 }, { url: "https://ailleurs.fr/f", status: 200 }], 200, "https://ailleurs.fr/f"), SITE).detail).toContain("hors site");
    expect(judgeChain(result("https://old.fr/g", [], 0, "https://old.fr/g", "TimeoutError: x"), SITE)).toMatchObject({ ok: false, detail: "TimeoutError: x" });
  });
  test("checkRedirections suit les URL dans l'ordre, une par une", async () => {
    const seen: string[] = [];
    const f = async (u: string) => { seen.push(u); return result(u, [{ url: u, status: 301 }, { url: `${SITE}/x`, status: 200 }], 200, `${SITE}/x`); };
    const out = await checkRedirections(["https://old.fr/1", "https://old.fr/2"], SITE, f);
    expect(seen).toEqual(["https://old.fr/1", "https://old.fr/2"]);
    expect(out.every((r) => r.ok)).toBe(true);
  });
});
```

- [ ] **Étape 2 : vérifier qu'il échoue**

Run : `bun test skills/checklist/scripts/tests/ancien-sitemap.test.ts`
Attendu : échec, module introuvable.

- [ ] **Étape 3 : l'implémentation**

Écrire `skills/checklist/scripts/lib/ancien-sitemap.ts` :

```ts
// Site repris (D28) : chaque URL de l'ancien sitemap doit finir en 200 sur le nouveau site après des 301 ou 308 seulement.
// Google : « The 301 and 308 status codes mean that a page has permanently moved » ; 302, 303, 307 sont temporaires.
import type { FetchResult } from "../../../../skills/audit/scripts/lib/types";
import { sameSite } from "../../../../skills/audit/scripts/lib/sitemap";
import type { RedirectCheck } from "./checklist";

export type ChainFetcher = (url: string) => Promise<FetchResult>;
const PERMANENT = new Set([301, 308]);

/** Verdict d'une chaîne de redirections collectée par fetchChain. */
export function judgeChain(r: FetchResult, siteOrigin: string): RedirectCheck {
  const hops = r.chain.map((h) => h.status);
  const detail = hops.join(" → ");
  if (r.status === 0) return { url: r.requested, ok: false, detail: r.error ?? "injoignable" };
  const redirects = r.chain.slice(0, -1);
  if (redirects.length === 0) return { url: r.requested, ok: false, detail: `${r.status} sans redirection` };
  const temp = redirects.find((h) => !PERMANENT.has(h.status));
  if (temp) return { url: r.requested, ok: false, detail: `${detail} (${temp.status} est temporaire, Google ne transfère pas)` };
  if (r.status !== 200) return { url: r.requested, ok: false, detail };
  if (!sameSite(r.final, siteOrigin)) return { url: r.requested, ok: false, detail: `${detail} vers ${r.final}, hors site` };
  return { url: r.requested, ok: true, detail };
}

/** Suit chaque URL de l'ancien sitemap, dans l'ordre, sans parallélisme (on ne bombarde pas l'ancien hôte). */
export async function checkRedirections(locs: string[], siteOrigin: string, f: ChainFetcher): Promise<RedirectCheck[]> {
  const out: RedirectCheck[] = [];
  for (const u of locs) out.push(judgeChain(await f(u), siteOrigin));
  return out;
}
```

- [ ] **Étape 4 : vérifier que tout passe**

Run : `bun test skills/checklist/scripts/tests/ancien-sitemap.test.ts`
Attendu : 3 pass, 0 fail.

- [ ] **Étape 5 : commit**

```bash
git add skills/checklist/scripts/lib/ancien-sitemap.ts skills/checklist/scripts/tests/ancien-sitemap.test.ts
git commit -m "feat(checklist): suivi des redirections de l'ancien sitemap, 301 et 308 seulement (D28)"
```

---

### Tâche 4 : le CLI, `checklist.ts`

**Files:**
- Create: `skills/checklist/scripts/checklist.ts`
- Create: `skills/checklist/scripts/tests/checklist-cli.test.ts`

**Interfaces:**
- Consumes: tout ce que produisent les tâches 1 à 3 ; `parseStrategy`, `StrategyError` (`lib/strategy.ts`) ; `latestAuditDir`, `parseReport`, `ReportError` (`lib/report.ts`) ; `fetchChain` ; `decodeSitemapBody`, `parseSitemap`, `sameSite` ; `kindOf` ; `assertNoSecret` ; type `Manifest`.
- Produces: la commande `bun ${CLAUDE_PLUGIN_ROOT}/skills/checklist/scripts/checklist.ts [--mise-en-ligne AAAA-MM-JJ] [--ancien-sitemap <url ou fichier>] [--agir] [--seo seo] [--today AAAA-MM-JJ]` ; sortie standard `fichier : seo/checklist.md` puis la ligne `checklist : …` ; sortie d'erreur `attention : …` par chose à dire ; exit 0 fichier écrit, 1 sinon, 2 usage. `prodSitemapUrls(n0Dir, site)` exporté. `--today` sert aux tests et à la recette (date déterministe).

Comportements à retenir (spec 5.1, 5.3, 8) : une nouvelle `--mise-en-ligne` repart d'une moitié « Après » vide ; un audit n0 antérieur à la mise en ligne ne juge pas la prod (avertissement) ; l'origine servie vient de la home du dernier n0 (comme `build`, D21) ; `siteUrl` de `SubmitFeed` est le `Url` rendu par `GetUserSites` ; `assertNoSecret` avant toute écriture ; une `ChecklistError` laisse le fichier intact.

- [ ] **Étape 1 : le test qui échoue**

Écrire `skills/checklist/scripts/tests/checklist-cli.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { cp, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const F = `${import.meta.dir}/fixtures/chico`;
const CLI = `${import.meta.dir}/../checklist.ts`;
/** Jamais la vraie clé dans un test : sans clé, aucune requête Bing ; sans --agir, aucune écriture. */
const ENV = { ...process.env, BING_WMT_API_KEY: "" };
const run = (cwd: string, ...args: string[]) => Bun.spawnSync(["bun", CLI, "--today", "2026-08-30", ...args], { cwd, env: ENV });

/** Un dépôt de site factice sur main avec un commit seo(…), la stratégie, un audit n0 du 28/08 et un n2 du 29/08 (vert). */
async function fakeSite(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "erom-seo-checklist-"));
  const n0 = join(cwd, "seo/audits/2026-08-28-n0");
  const n2 = join(cwd, "seo/audits/2026-08-29-n2");
  await mkdir(join(n0, "raw"), { recursive: true });
  await mkdir(n2, { recursive: true });
  await cp(`${F}/strategy.md`, join(cwd, "seo/strategy.md"));
  await cp(`${F}/report.md`, join(n0, "report.md"));
  await cp(`${F}/manifest.json`, join(n0, "raw/manifest.json"));
  await cp(`${F}/report-n2.md`, join(n2, "report.md"));
  const g = (...a: string[]) => { const r = Bun.spawnSync(["git", ...a], { cwd, env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }); if (r.exitCode !== 0) throw new Error(r.stderr.toString()); };
  g("init", "-q", "-b", "main"); g("add", "."); g("commit", "-q", "-m", "seo(IDX-02): canonical absolu");
  return cwd;
}

describe("checklist.ts en ligne de commande", () => {
  test("premier passage, pas déployé : moitié Avant d'après le n2 et git, moitié Après vide, fichier écrit", async () => {
    const cwd = await fakeSite();
    const r = run(cwd);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(r.stdout.toString()).toContain("fichier : seo/checklist.md");
    const md = await Bun.file(join(cwd, "seo/checklist.md")).text();
    expect(md).toContain("Mise en ligne : non · Dernier passage : 2026-08-30 · Audit local : seo/audits/2026-08-29-n2 · Audit prod : aucun");
    expect(md).toContain("- [x] Audit niveau 2 vert · auto · seo/audits/2026-08-29-n2/report.md · 0 Critique, 0 Important");
    expect(md).toMatch(/- \[x\] Branche seo-build fusionnée · auto · git : [0-9a-f]{7} seo\(IDX-02\): canonical absolu/);
    expect(md).toContain("- [ ] Hors build réglés · main ·");
    expect(md).toContain("  - IDX-04 :");
    expect(md).toContain("- [ ] Bing Webmaster Tools : site ajouté · main ·");
    expect(md).toContain("- [ ] Prod verte · auto · pas encore déployé");
    expect(md).toContain("- [ ] J+1 : sitemap soumis dans Search Console · main ·");
  });
  test("une case main cochée à la main survit ; la mise en ligne date les jalons et lit le n0 postérieur", async () => {
    const cwd = await fakeSite();
    expect(run(cwd).exitCode).toBe(0);
    const p = join(cwd, "seo/checklist.md");
    await Bun.write(p, (await Bun.file(p).text()).replace("- [ ] Search Console : propriété créée", "- [x] Search Console : propriété créée"));
    const r = run(cwd, "--mise-en-ligne", "2026-08-29");
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const md = await Bun.file(p).text();
    expect(md).toContain("- [x] Search Console : propriété créée");
    expect(md).toContain("Mise en ligne : 2026-08-29");
    expect(md).toContain("- [ ] J+90 2026-11-27 : audit de contrôle");
    // le seul n0 date du 28/08, avant la mise en ligne : la prod n'est pas jugée
    expect(md).toContain("- [ ] Prod verte · auto · aucun audit prod depuis la mise en ligne");
    expect(r.stderr.toString()).toContain("antérieur à la mise en ligne");
    // relancer sans option garde la date
    expect(run(cwd).exitCode).toBe(0);
    expect(await Bun.file(p).text()).toContain("Mise en ligne : 2026-08-29");
  });
  test("un n0 postérieur à la mise en ligne juge la prod ; sans --agir le ping reste « à faire »", async () => {
    const cwd = await fakeSite();
    const n0b = join(cwd, "seo/audits/2026-08-30-n0");
    await mkdir(join(n0b, "raw"), { recursive: true });
    await cp(`${F}/report-n2.md`, join(n0b, "report.md"));
    await cp(`${F}/manifest.json`, join(n0b, "raw/manifest.json"));
    const r = run(cwd, "--mise-en-ligne", "2026-08-29");
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const md = await Bun.file(join(cwd, "seo/checklist.md")).text();
    expect(md).toContain("- [x] Prod verte · auto · seo/audits/2026-08-30-n0/report.md · 0 Critique, 0 Important");
    expect(md).toContain("- [ ] Ping IndexNow · action · à faire : relance avec --agir");
    expect(md).toContain("- [ ] Sitemap soumis à Bing · action · en attente : Bing Webmaster Tools pas encore configuré");
  });
  test("ancien sitemap depuis un fichier : sauvegardé sous seo/checklist/, compté sur la ligne 6", async () => {
    const cwd = await fakeSite();
    const old = join(cwd, "old.xml");
    await Bun.write(old, '<?xml version="1.0"?><urlset><url><loc>https://old.fr/a</loc></url><url><loc>https://old.fr/b</loc></url></urlset>');
    const r = run(cwd, "--ancien-sitemap", old);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(await Bun.file(join(cwd, "seo/checklist/ancien-sitemap.xml")).exists()).toBe(true);
    expect(await Bun.file(join(cwd, "seo/checklist.md")).text()).toContain("- [x] Ancien sitemap sauvegardé · auto · seo/checklist/ancien-sitemap.xml · 2 URL");
  });
  test("ligne inconnue dans le fichier : exit 1, fichier intact", async () => {
    const cwd = await fakeSite();
    expect(run(cwd).exitCode).toBe(0);
    const p = join(cwd, "seo/checklist.md");
    const broken = (await Bun.file(p).text()).replace("Ancien sitemap sauvegardé", "Ancien sitemap archivé");
    await Bun.write(p, broken);
    const r = run(cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("libellé inconnu");
    expect(await Bun.file(p).text()).toBe(broken);
  });
  test("date invalide ou future : exit 1 ; sans stratégie : exit 1 et propose le verbe strategy", async () => {
    const cwd = await fakeSite();
    expect(run(cwd, "--mise-en-ligne", "hier").exitCode).toBe(1);
    expect(run(cwd, "--mise-en-ligne", "2027-01-01").exitCode).toBe(1);
    const empty = await mkdtemp(join(tmpdir(), "erom-seo-checklist-"));
    const r = run(empty);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("/erom-seo:strategy");
  });
});
```

- [ ] **Étape 2 : vérifier qu'il échoue**

Run : `bun test skills/checklist/scripts/tests/checklist-cli.test.ts`
Attendu : 6 échecs (`bun` ne trouve pas `../checklist.ts`, exit code différent de 0).

- [ ] **Étape 3 : l'implémentation**

Écrire `skills/checklist/scripts/checklist.ts` :

```ts
#!/usr/bin/env bun
// checklist.ts : stratégie + audits + git + ancien fichier → seo/checklist.md. Toute la lecture disque, git et réseau est ici ;
// lib/checklist.ts est pur. Sans --agir, aucune écriture sortante (D26).
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseStrategy, StrategyError } from "../../../lib/strategy";
import { latestAuditDir, parseReport, ReportError, type Report } from "../../../lib/report";
import type { Manifest } from "../../../skills/audit/scripts/lib/types";
import { fetchChain } from "../../../skills/audit/scripts/lib/fetch";
import { decodeSitemapBody, parseSitemap, sameSite } from "../../../skills/audit/scripts/lib/sitemap";
import { kindOf } from "../../../skills/build/scripts/lib/plan";
import { assertNoSecret } from "../../../skills/strategy/scripts/lib/keywords";
import { checklistSummary, ChecklistError, computeChecklist, dueToday, parseChecklist, renderChecklist, type BingSite, type ChecklistInput, type RedirectCheck } from "./lib/checklist";
import { bingSubmitFeed, bingUserSites, defaultFetcher, pingIndexNow, redact } from "./lib/actions";
import { checkRedirections } from "./lib/ancien-sitemap";

export const ANCIEN_SITEMAP = "checklist/ancien-sitemap.xml";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function git(cwd: string, ...args: string[]): string | null {
  const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? r.stdout.toString().trim() || null : null;
}

async function readReport(dir: string | null): Promise<{ dir: string; report: Report } | null> {
  if (!dir) return null;
  return { dir, report: parseReport(await Bun.file(join(dir, "report.md")).text()) };
}

/** Les URL du sitemap collecté par l'audit n0 : raw/<fichier> de chaque entrée `sitemaps` du manifeste, filtrées sur le site. */
export async function prodSitemapUrls(n0Dir: string, site: string): Promise<{ urls: string[]; feedUrl: string | null }> {
  const manifest = JSON.parse(await Bun.file(join(n0Dir, "raw/manifest.json")).text()) as Manifest;
  const urls = new Set<string>();
  let feedUrl: string | null = null;
  for (const s of manifest.sitemaps) {
    if (s.status !== 200 || !s.file) continue;
    feedUrl ??= s.final;
    const f = Bun.file(join(n0Dir, "raw", s.file));
    if (!(await f.exists())) continue;
    const xml = decodeSitemapBody(new Uint8Array(await f.arrayBuffer()), s.final, s.contentType ?? null);
    for (const u of parseSitemap(xml).locs) if (sameSite(u, `https://${site}`)) urls.add(u);
  }
  return { urls: [...urls], feedUrl };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes("--help")) { console.error("usage : bun checklist.ts [--mise-en-ligne AAAA-MM-JJ] [--ancien-sitemap <url ou fichier>] [--agir] [--seo seo] [--today AAAA-MM-JJ]"); process.exit(2); }
  const seoDir = opt("--seo") ?? "seo";
  const today = opt("--today") ?? new Date().toISOString().slice(0, 10);
  const agir = args.includes("--agir");
  const key = process.env.BING_WMT_API_KEY ?? null;
  const warn = (m: string) => console.error(redact(`attention : ${m}`, key));
  const fail = (m: string): never => { console.error(redact(`erreur : ${m}`, key)); process.exit(1); };
  const strategyPath = join(seoDir, "strategy.md");
  const outPath = join(seoDir, "checklist.md");
  try {
    const strategyFile = Bun.file(strategyPath);
    if (!(await strategyFile.exists())) fail(`${strategyPath} absent ; lancer /erom-seo:strategy d'abord`);
    const strategy = parseStrategy(await strategyFile.text());
    const site = strategy.site;

    const prevFile = Bun.file(outPath);
    const previous = (await prevFile.exists()) ? parseChecklist(await prevFile.text()) : null;

    // mise en ligne : l'option pose ou change la date ; sinon celle du fichier
    const dateOpt = opt("--mise-en-ligne");
    if (dateOpt !== undefined && (!DATE.test(dateOpt) || Number.isNaN(new Date(`${dateOpt}T00:00:00Z`).getTime()))) fail(`--mise-en-ligne : date AAAA-MM-JJ attendue, reçu ${dateOpt}`);
    if (dateOpt !== undefined && dateOpt > today) fail(`--mise-en-ligne : ${dateOpt} est dans le futur`);
    const miseEnLigne = dateOpt ?? previous?.header.miseEnLigne ?? null;
    // une nouvelle date repart d'une moitié « Après » vide, actions comprises (spec 5.1)
    const prevForCompute = previous && dateOpt !== undefined && dateOpt !== previous.header.miseEnLigne
      ? { ...previous, lines: new Map([...previous.lines].filter(([id]) => Number(id.slice(3)) <= 6)) } : previous;

    const n2 = await readReport(await latestAuditDir(seoDir, { level: 2 }));
    const n0 = await readReport(await latestAuditDir(seoDir, { level: 0 }));
    // origine réellement servie : la home du dernier audit n0 (www ou apex), sinon la stratégie (même règle que build, D21)
    let origin = `https://${site}`;
    if (n0) { try { const m = JSON.parse(await Bun.file(join(n0.dir, "raw/manifest.json")).text()) as Manifest; const f = m.pages[0]?.final; if (f) origin = new URL(f).origin; } catch { warn(`${n0.dir}/raw/manifest.json illisible : origine prise dans la stratégie`); } }
    const n0Prod = n0 && miseEnLigne && n0.report.date >= miseEnLigne ? n0 : null;
    if (n0 && miseEnLigne && !n0Prod) warn(`audit niveau 0 ${n0.dir} antérieur à la mise en ligne (${miseEnLigne}) : il ne juge pas la prod`);

    const branch = git(process.cwd(), "rev-parse", "--abbrev-ref", "HEAD") ?? "(pas un dépôt git)";
    const seoCommit = git(process.cwd(), "log", "-1", "--grep=^seo(", "--format=%h %s");

    // ancien sitemap : déclaré maintenant (URL ou fichier) ou déjà sauvegardé
    const savedPath = join(seoDir, ANCIEN_SITEMAP);
    const declared = opt("--ancien-sitemap");
    if (declared !== undefined) {
      let xml: string;
      if (await Bun.file(declared).exists()) xml = await Bun.file(declared).text();
      else {
        const r = await fetchChain(declared, { timeoutMs: 30000 });
        if (r.status !== 200) fail(`--ancien-sitemap : ${declared} répond ${r.status || r.error}`);
        xml = decodeSitemapBody(r.body, declared, r.headers["content-type"] ?? null);
      }
      if (parseSitemap(xml).locs.length === 0) fail(`--ancien-sitemap : aucune <loc> dans ${declared}`);
      await mkdir(join(seoDir, "checklist"), { recursive: true });
      await Bun.write(savedPath, xml);
    }
    const saved = Bun.file(savedPath);
    const ancienLocs = (await saved.exists()) ? parseSitemap(await saved.text()).locs : null;
    const ancienSitemap = ancienLocs ? { path: savedPath, count: ancienLocs.length } : null;
    let redirections: RedirectCheck[] | null = null;
    if (ancienLocs && miseEnLigne) redirections = await checkRedirections(ancienLocs, origin, (u) => fetchChain(u, { timeoutMs: 20000 }));

    // Bing, lecture seule : les sites du compte
    let bing: BingSite[] | null = null;
    if (key) { try { bing = await bingUserSites(defaultFetcher, key); } catch (e) { warn(`Bing : ${(e as Error).message}`); } }
    const bingSiteMatches = (u: string) => sameSite(u, origin);

    // actions (écritures), seulement avec --agir et si tout est réuni
    const actions: ChecklistInput["actions"] = {};
    let feedUrl: string | null = null, urls: string[] = [];
    if (n0Prod) ({ urls, feedUrl } = await prodSitemapUrls(n0Prod.dir, site));
    if (agir && miseEnLigne && n0Prod) {
      const done = (id: string) => prevForCompute?.lines.get(id)?.checked ?? false;
      if (strategy.indexnow && !done("CL-09")) {
        const host = new URL(feedUrl ?? origin).host;
        actions.indexnow = await pingIndexNow(defaultFetcher, { host, key: strategy.indexnow, urls });
      } else if (!strategy.indexnow) warn("IndexNow : non dans seo/strategy.md, pas de ping");
      const bingSite = bing?.find((b) => bingSiteMatches(b.Url) && b.IsVerified) ?? null;
      if (key && bingSite && feedUrl && !done("CL-10")) actions.bing = await bingSubmitFeed(defaultFetcher, key, bingSite.Url, feedUrl);
    } else if (agir) warn("--agir sans effet : mise en ligne non posée ou aucun audit prod depuis");

    const cl = computeChecklist({
      site, origin, today, miseEnLigne, previous: prevForCompute, n2, n0, n0Prod, git: { branch, seoCommit },
      horsBuildOu: (id) => { const k = kindOf(id); return k.kind === "hors-build" ? k.ou : undefined; },
      ancienSitemap, redirections, bing, bingSiteMatches, pages: strategy.pages.map((p) => p.page), actions,
    });
    const md = renderChecklist(cl);
    assertNoSecret(md, key);
    await mkdir(seoDir, { recursive: true });
    await Bun.write(outPath, md);
    console.log(`fichier : ${outPath}`);
    console.log(checklistSummary(cl, today));
    for (const l of dueToday(cl, today)) if (l.label.match(/^J\+\d+ (\S+)/)![1] < today) warn(`en retard : ${l.label}`);
    for (const l of cl.lines) if (l.kind === "action" && !l.checked && /^en attente|^à faire/.test(l.note)) warn(`${l.label} : ${l.note}`);
  } catch (e) {
    const msg = e instanceof StrategyError ? `${strategyPath} inanalysable : ${e.errors.join(" ; ")}`
      : e instanceof ReportError ? `rapport inanalysable : ${e.errors.join(" ; ")}`
      : e instanceof ChecklistError ? `${outPath} illisible, rien n'est réécrit : ${e.errors.join(" ; ")}`
      : (e as Error).message;
    fail(msg);
  }
}
```

- [ ] **Étape 4 : vérifier que tout passe**

Run : `bun test skills/checklist/scripts/tests/checklist-cli.test.ts`
Attendu : 6 pass, 0 fail. Puis `bun test` : 250 pass, 0 fail (216 de départ, 19 de la tâche 1, 6 de la tâche 2, 3 de la tâche 3, 6 ici).

Contrôle à l'œil, sur un faux site (le rendu attendu, produit par ce même code le 29/08) :

```bash
D=$(mktemp -d) && mkdir -p $D/seo/audits/2026-08-28-n0/raw $D/seo/audits/2026-08-29-n2 $D/seo/audits/2026-08-30-n0/raw
F=skills/checklist/scripts/tests/fixtures/chico
cp $F/strategy.md $D/seo/ && cp $F/report.md $D/seo/audits/2026-08-28-n0/ && cp $F/manifest.json $D/seo/audits/2026-08-28-n0/raw/
cp $F/report-n2.md $D/seo/audits/2026-08-29-n2/report.md && cp $F/report-n2.md $D/seo/audits/2026-08-30-n0/report.md && cp $F/manifest.json $D/seo/audits/2026-08-30-n0/raw/
(cd $D && git init -q -b main && git add . && git -c user.name=t -c user.email=t@t commit -q -m "seo(IDX-02): canonical absolu")
(cd $D && BING_WMT_API_KEY= bun /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin/skills/checklist/scripts/checklist.ts --today 2026-08-30 --mise-en-ligne 2026-08-29 && cat seo/checklist.md)
```

Attendu (extrait) :

```
checklist : 5/15 cochées · mise en ligne : 2026-08-29 · dû aujourd'hui : J+1 2026-08-30 : sitemap soumis dans Search Console
# Checklist SEO/GEO : commentchercherbonheur.org
Mise en ligne : 2026-08-29 · Dernier passage : 2026-08-30 · Audit local : seo/audits/2026-08-29-n2 · Audit prod : seo/audits/2026-08-30-n0

## Avant le déploiement
- [x] Audit niveau 2 vert · auto · seo/audits/2026-08-29-n2/report.md · 0 Critique, 0 Important
- [x] Branche seo-build fusionnée · auto · git : <hash> seo(IDX-02): canonical absolu
- [ ] Hors build réglés · main · aucune trouvaille hors build connue
- [ ] Search Console : propriété créée · main · search.google.com/search-console, Ajouter une propriété, type Domaine, enregistrement TXT chez le registrar
  - site client : ajouter le compte de l'agence comme utilisateur de la propriété (rôle minimal)
- [ ] Bing Webmaster Tools : site ajouté · main · bing.com/webmasters, Ajouter un site, Importer depuis Google Search Console
  - site client : le client délègue le site en lecture seule au compte de l'agence (écran Users) ; ne jamais demander sa clé
- [x] Ancien sitemap sauvegardé · auto · sans objet (pas d'ancien site)

## Après le déploiement
- [x] Prod verte · auto · seo/audits/2026-08-30-n0/report.md · 0 Critique, 0 Important
- [x] Redirections de l'ancien site · auto · sans objet (pas d'ancien site)
- [ ] Ping IndexNow · action · à faire : relance avec --agir
- [ ] Sitemap soumis à Bing · action · en attente : Bing Webmaster Tools pas encore configuré (ligne « Bing Webmaster Tools : site ajouté »)
- [ ] J+1 2026-08-30 : sitemap soumis dans Search Console · main · Search Console, Sitemaps, coller https://<site>/sitemap.xml (rôle Owner)
- [ ] J+3 2026-09-01 : pages clés indexées · main · Search Console, Inspection d'URL, une page par sous-ligne
  - https://www.commentchercherbonheur.org/
  … (une sous-ligne par page de la stratégie, sur l'hôte www observé par l'audit)
- [ ] J+90 2026-11-27 : audit de contrôle · main · relance /erom-seo:checklist, l'audit niveau 0 est refait ; le niveau 1 arrive au chantier 5
```

- [ ] **Étape 5 : commit**

```bash
git add skills/checklist/scripts/checklist.ts skills/checklist/scripts/tests/checklist-cli.test.ts
git commit -m "feat(checklist): CLI checklist.ts, disque, git, options, aucune écriture sans --agir (D26)"
```

---

### Tâche 5 : la référence `consoles.md` et le contrôle des sources

**Files:**
- Create: `skills/checklist/references/consoles.md`
- Modify: `skills/audit/scripts/check-sources.ts:10-17` (ajouter le dossier des consoles)
- Create: `skills/checklist/scripts/tests/consoles.test.ts`

**Interfaces:**
- Consumes: `parseRecipes` de `skills/build/scripts/lib/recipes.ts` (même format de bloc : `### Titre (CL-nn)`, lignes `Chemin`, `Piège`, `Source`) ; `OFFICIAL_DOMAINS` de `skills/audit/scripts/lib/checks.ts`.
- Produces: `consoles.md`, une entrée par ligne de la checklist qui demande un geste à la main ou une lecture, avec le chemin de clics et la citation officielle ; `check-sources.ts` la vérifie sous le label `checklist:CL-nn`.

Toutes les citations viennent de `docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md`, sections 3.1 à 3.4 (pages en 200 le 29/08, extraites par `curl`). Les pages `support.google.com` répondent 404 à un HEAD : `check-sources.ts` est déjà en GET (`fetchChain`), ne pas changer.

- [ ] **Étape 1 : le test qui échoue**

Écrire `skills/checklist/scripts/tests/consoles.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { parseRecipes } from "../../../build/scripts/lib/recipes";
import { OFFICIAL_DOMAINS } from "../../../audit/scripts/lib/checks";
import { LINES } from "../lib/checklist";

const CONSOLES = await Bun.file(`${import.meta.dir}/../../references/consoles.md`).text();
const DOMAINS = [...OFFICIAL_DOMAINS, "learn.microsoft.com", "search.google.com"];
const allowed = (url: string) => { try { const h = new URL(url).hostname; return DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; } };

describe("references/consoles.md", () => {
  const entries = parseRecipes(CONSOLES);
  test("chaque entrée porte un id de ligne connu, un chemin de clics et au moins une source officielle", () => {
    expect(entries.length).toBeGreaterThan(0);
    const ids = new Set(LINES.map((l) => l.id));
    for (const e of entries) {
      for (const id of e.ids) expect(ids.has(id), `${e.title} : ${id} n'est pas une ligne de la checklist`).toBe(true);
      expect(e.sources.length, `${e.title} : aucune source`).toBeGreaterThan(0);
      for (const s of e.sources) expect(allowed(s.url), `${e.title} : ${s.url}`).toBe(true);
      const real = e.sources.filter((s) => !s.manual);
      expect(real.length, `${e.title} : au moins une source vérifiable par check-sources.ts`).toBeGreaterThan(0);
      for (const s of real) expect(s.quote, `${e.title} : citation vide`).not.toBe("");
    }
  });
  test("chaque ligne à la main ou action de la checklist a son entrée", () => {
    const covered = new Set(entries.flatMap((e) => e.ids));
    for (const l of LINES.filter((l) => l.kind !== "auto" || l.id === "CL-07" || l.id === "CL-08")) expect(covered.has(l.id), `${l.id} ${l.label} sans entrée dans consoles.md`).toBe(true);
  });
  test("un chemin de clics par entrée, en français, sans em dash", () => {
    expect(CONSOLES.includes("—")).toBe(false);
    const blocks = CONSOLES.split(/^### /m).slice(1);
    expect(blocks.length).toBe(entries.length);
    for (const b of blocks) expect(b, `${b.split("\n")[0]} : ligne « Chemin : » manquante`).toMatch(/^Chemin\s*:/m);
  });
});
```

- [ ] **Étape 2 : vérifier qu'il échoue**

Run : `bun test skills/checklist/scripts/tests/consoles.test.ts`
Attendu : échec, `consoles.md` introuvable.

- [ ] **Étape 3 : la référence**

Écrire `skills/checklist/references/consoles.md` :

````markdown
# Consoles et moteurs : les gestes à la main et ce que la skill fait toute seule

Une entrée par ligne de `seo/checklist.md` qui demande un clic, une lecture ou une action. Même forme que les recettes de `build` : `Chemin` (les clics, dans l'ordre), `Piège`, `Source` (URL officielle et citation mot pour mot, retrouvée par `check-sources.ts`). Les pages d'aide de Bing Webmaster Tools sont des applications JavaScript : citées `[manuel]`, à relire à la main. Sources vérifiées le 2026-08-29 (`docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md`).

### Hors build réglés (CL-03)
Chemin   : chaque sous-ligne porte son « ou » (l'endroit où agir : Vercel, DNS, PageSpeed) ; une fois réglé, cocher à la main. Après le déploiement, la ligne « Prod verte » revérifie IDX-03 et IDX-04 sur la prod.
Piège    : sur Vercel, la redirection apex vers www se règle dans Project Settings, Domains, Edit, « Redirect to », code 308 (permanent) et non 307. Vérifié sur chico le 29/08 : `curl -sI https://commentchercherbonheur.org/` rend `HTTP/2 308`.
Source   : https://developers.google.com/search/docs/crawling-indexing/301-redirects « The 301 and 308 status codes mean that a page has permanently moved to a new location. »

### Search Console : propriété créée (CL-04)
Chemin   : search.google.com/search-console, Ajouter une propriété, type Domaine (le nom de domaine nu, sans https ni www), puis dans la fenêtre de vérification, Select record type : TXT ; chez le registrar, un enregistrement TXT sur la racine (Host vide ou @), Value = la chaîne donnée par Search Console ; revenir et cliquer Verify. Site client : ensuite Settings, Users and permissions, Add user, l'adresse du compte de l'agence, le rôle minimal.
Piège    : la vérification par TXT ne touche que le DNS, pas une page servie ; elle peut donc précéder le déploiement (déduction, la page ne le dit pas noir sur blanc). Le DNS peut mettre jusqu'à trois jours à servir l'enregistrement.
Piège    : Restricted ne permet pas de soumettre un sitemap ; Full oui ; seul Owner ajoute des utilisateurs. Pour l'agence, viser le rôle minimal qui suffit à lire (note niveau 1, section 5).
Source   : https://support.google.com/webmasters/answer/9008080 « For TXT records, a Search Console verification record looks something like google-site-verification= »
Source   : https://support.google.com/webmasters/answer/9008080 « For manually installed records, it can take up to two or three days for your provider to start serving the record. »
Source   : https://support.google.com/webmasters/answer/7687615 « Open the Users and permissions page in property settings »
Source   : https://support.google.com/webmasters/answer/7687615 « Restricted user: Has simple view rights on most data. »

### Bing Webmaster Tools : site ajouté (CL-05)
Chemin   : bing.com/webmasters, se connecter avec le compte de l'agence, Ajouter un site, « Importer depuis Google Search Console » (un clic, la vérification est reprise de Google), ou Ajouter manuellement puis vérifier (fichier XML, balise meta ou CNAME). Site client : le client, depuis son propre compte, va dans Settings, Users, Add user, l'adresse du compte de l'agence, rôle Read only ; l'agence ne demande jamais sa clé API.
Piège    : la clé API Bing est faite par utilisateur, pas par site : une clé ouvre tous les sites du compte, en écriture. C'est pour ça que la délégation en lecture seule est la seule bonne réponse pour un client.
Piège    : quand `BING_WMT_API_KEY` est là, la skill lit `GetUserSites` et coche seule si le site y est et est vérifié (IsVerified) ; un site présent mais non vérifié laisse la case vide.
Piège    : le bouton « Importer depuis Google Search Console » n'est attesté que par des sources secondaires (les pages d'aide Bing ne se lisent pas par script) ; s'il manque, ajouter le site à la main et le vérifier par fichier XML, balise meta ou CNAME.
Source   : https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getusersites « This example shows how to list all sites which are not verified. »
Source   : https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.addsiteroles « Delegate site access to user »
Source   : https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b « Add and verify site » [manuel]
Source   : https://www.bing.com/webmasters/help/how-to-add-users-to-your-site-account-d5d00364 « How to add users to your site account » [manuel]

### Prod verte (CL-07)
Chemin   : rien à cliquer, c'est l'audit niveau 0 sur la prod qui juge (0 Critique, 0 Important). Si la case se vide après un déploiement, lire la ligne « En bref » du rapport cité, puis les trouvailles. Un noindex ou un X-Robots-Tag de staging resté en prod est une trouvaille SNIP ou ROBOTS de l'audit avant d'être un problème Google.
Piège    : côté Google, ce même noindex remonte dans le rapport Page Indexing (Why pages aren't indexed, « URL marked noindex »), pas dans Suppressions, qui sert aux retraits volontaires.
Source   : https://support.google.com/webmasters/answer/7440203 « When Google tried to index the page it encountered a 'noindex' directive and therefore did not index it. »

### Redirections de l'ancien site (CL-08)
Chemin   : rien à cliquer si la case est cochée. Sinon, chaque sous-ligne donne l'URL de l'ancien sitemap et ce qu'elle a répondu : à régler chez l'hébergeur de l'ancien domaine (redirection permanente vers la page équivalente du nouveau site), puis relancer la skill.
Piège    : 301 et 308 seulement ; un 302 ou un 307 ne transfère rien et ne devient jamais permanent avec le temps (aucune doctrine Google en ce sens).
Piège    : compter quelques semaines pour qu'un site petit ou moyen ait migré dans l'index.
Source   : https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes « Use server side permanent redirects if technically possible. Although Googlebot supports several kinds of redirects, we recommend that you use HTTP permanent redirects if possible, such as 301 and 308. »
Source   : https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes « As a general rule, a small to medium-sized website can take a few weeks for most pages to move, and larger sites take longer. »
Source   : https://developers.google.com/search/docs/crawling-indexing/301-redirects « The 301 and 308 status codes mean that a page has permanently moved to a new location. »

### Ping IndexNow (CL-09)
Chemin   : fait par la skill avec `--agir`, après accord : un POST à api.indexnow.org avec l'hôte, la clé de `seo/strategy.md`, l'emplacement du fichier clé et les URL du sitemap de prod collecté par l'audit. Accusé de réception : Bing Webmaster Tools, Reports & Data, IndexNow (bing.com/webmasters/indexnow), qui montre les URL soumises, explorées, indexées.
Piège    : 200 ou 202 veut dire « reçu », pas « indexé ». 403 : la clé n'est pas servie en /<clé>.txt, ou pas celle du fichier ; 422 : une URL n'est pas sur l'hôte, ou la clé a une forme inattendue ; 429 : attendre.
Piège    : une soumission par mise en ligne suffit ; IndexNow relaie aux autres moteurs participants dans les dix secondes.
Source   : https://www.indexnow.org/documentation « You can submit up to 10,000 URLs per post, mixing http and https URLs if needed. »
Source   : https://www.indexnow.org/documentation « The HTTP 200 response code only indicates that the search engine has received your set of URLs. »
Source   : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Source   : https://blogs.bing.com/webmaster/March-2024/Optimize-your-Impact-with-IndexNow-Insights « detailed reports on the number of URLs submitted, crawled, and indexed »

### Sitemap soumis à Bing (CL-10)
Chemin   : fait par la skill avec `--agir` quand le site est dans le compte Bing de l'agence et vérifié (ligne « Bing Webmaster Tools : site ajouté ») : `SubmitFeed` avec l'URL du site telle que Bing la nomme et l'URL du sitemap de prod. Sinon, ou si Bing refuse (site client délégué en lecture seule) : bing.com/webmasters, Sitemaps, Submit sitemap, coller l'URL complète du sitemap, par le propriétaire du site.
Piège    : les protocoles SOAP et POX sont retirés le 31 août 2026 ; la skill parle JSON, comme `keywords.ts`. Si l'API répond InvalidApiKey, la clé de ~/.zshenv n'est plus la bonne (Settings, API Access ; une seule clé par compte).
Source   : https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.submitfeed « Supported formats: Sitemap, RSS 2.0, Atom 0.3, Atom 1.0 and text files. »
Source   : https://learn.microsoft.com/en-us/bingwebmaster/api-protocols « Legacy SOAP and POX APIs will be retired on August 31, 2026. »

### J+1, sitemap soumis dans Search Console (CL-11)
Chemin   : search.google.com/search-console, choisir la propriété, Sitemaps (menu Indexation), « Ajouter un sitemap », coller l'URL complète https://<site>/sitemap.xml, Envoyer. Le statut doit passer à « Opération réussie » ; sinon cliquer la ligne pour le détail.
Piège    : il faut le rôle Owner sur la propriété : c'est le propriétaire qui clique, jamais l'agence à sa place, et jamais par l'API (jeton en lecture seule par construction, note niveau 1).
Piège    : le sitemap est lu tout de suite, mais l'exploration des URL prend du temps et n'est pas garantie pour toutes.
Source   : https://support.google.com/webmasters/answer/7451001 « You must have owner permissions on a property to submit a sitemap »
Source   : https://support.google.com/webmasters/answer/7451001 « The sitemap should be fetched immediately. However, it can take some time to crawl the URLs listed in a sitemap, and it is possible that not all URLs in a sitemap will be crawled, depending on the site size, activity, traffic, and so on. »

### J+3, pages clés indexées (CL-12)
Chemin   : dans Search Console, coller chaque URL des sous-lignes dans la barre d'inspection en haut de l'écran. Attendu : « URL is on Google ». Sinon, lire la raison (couverture, robots, canonical choisi par Google) et, si la page est bien servie, « Request indexing » (quota journalier).
Piège    : « URL is on Google » veut dire indexée, pas affichée : les impressions viennent après. Une demande d'indexation ne garantit rien ; comptez un jour, parfois beaucoup plus.
Piège    : le chantier 5 fera cette inspection par l'API (urlInspection.index.inspect, lecture seule) ; jusque là, à la main.
Source   : https://support.google.com/webmasters/answer/9012289 « The URL has been indexed, can appear in Google Search results, and no problems were found with any enhancements found in the page »
Source   : https://support.google.com/webmasters/answer/9012289 « Indexing typically takes only a day or so, but can take much longer in some cases. »

### J+7, premières impressions (CL-13)
Chemin   : Search Console, Performances, résultats de recherche, période 7 derniers jours : impressions et clics par page et par requête. Bing : bing.com/webmasters, Search Performance.
Piège    : les données les plus récentes sont provisoires et bougent encore quelques heures ; aucun délai en jours n'est documenté, J+7 est notre convention.
Source   : https://support.google.com/webmasters/answer/7576553 « The newest data can be preliminary, meaning it's still being collected and might change in the next few hours. »

### J+30, rapports IA lus (CL-14)
Chemin   : Search Console, Performances, rapport Generative AI (lien direct search.google.com/search-console/performance/search-analytics/ai) : impressions dans les fonctionnalités IA, par page et pays ; bouton Export. Bing : bing.com/webmasters, AI Performance : citations et part de citation dans Copilot. Noter ce qu'on lit dans la sous-ligne, ou déposer l'export dans seo/imports/ (le chantier 5 saura le lire).
Piège    : le rapport Google n'est pas ouvert à toutes les propriétés ; s'il manque, l'écrire (« non disponible pour cette propriété ») et cocher quand même. Ni l'un ni l'autre ne sont accessibles par API : ce sont des exports à la main, pour longtemps.
Source   : https://support.google.com/webmasters/answer/16984139 « Not all properties have access to the report, as we're rolling out over time. »

### J+90, audit de contrôle (CL-15)
Chemin   : relancer `/erom-seo:checklist` dans le repo du site : la skill refait un audit niveau 0 sur la prod et la ligne « Prod verte » se met à jour ; relire les trouvailles éventuelles et refaire un `build` si nécessaire. Le niveau 1 (impressions IA, indexation réelle par API) arrive au chantier 5.
Piège    : à J+90 la stratégie a peut-être bougé (cadence de fraîcheur, STRAT-04) : relire `seo/strategy.md` avant de conclure.
Source   : https://support.google.com/webmasters/answer/7576553 « The newest data can be preliminary, meaning it's still being collected and might change in the next few hours. »
````

- [ ] **Étape 4 : `check-sources.ts` lit aussi `consoles.md`**

Dans `skills/audit/scripts/check-sources.ts`, après la ligne qui définit `recipesDir` (ligne 11), ajouter :

```ts
const consolesDir = new URL("../../checklist/references/", import.meta.url).pathname;
```

et après la boucle des recettes (ligne 17), ajouter :

```ts
for (const f of (await readdir(consolesDir)).filter((f) => f.endsWith(".md"))) for (const r of parseRecipes(await Bun.file(consolesDir + f).text())) entries.push({ label: `checklist:${r.ids[0]}`, ids: r.ids, sources: r.sources });
```

Mettre à jour le commentaire d'en-tête du script (ligne 3) : « … et les consoles de la checklist (skills/checklist/references/) ».

- [ ] **Étape 5 : vérifier**

Run : `bun test skills/checklist/scripts/tests/consoles.test.ts`
Attendu : 3 pass.

Run : `bun skills/audit/scripts/check-sources.ts 2>&1 | grep -E "checklist:|citations retrouvées"`
Attendu : chaque ligne `checklist:CL-nn` en `OK` ou `MANUEL`, aucune `ABSENTE` ni `HTTP`, et la dernière ligne `<n> citations retrouvées, 0 en échec, 2 à vérifier à la main` (n = 80 + les 24 citations de `consoles.md` ; les deux manuelles sont les pages d'aide Bing). Une citation `ABSENTE` se corrige depuis la page officielle (copier la phrase exacte), jamais en l'assouplissant ; si la page ne contient plus la phrase, remplacer par une autre phrase de la même page qui dit la même chose.

- [ ] **Étape 6 : commit**

```bash
git add skills/checklist/references/consoles.md skills/checklist/scripts/tests/consoles.test.ts skills/audit/scripts/check-sources.ts
git commit -m "docs(checklist): référence consoles.md, chemins de clics et citations officielles, contrôlée par check-sources.ts"
```

---

### Tâche 6 : la skill, le README, le manifeste, la recette à dérouler

**Files:**
- Create: `skills/checklist/SKILL.md`
- Modify: `README.md` (après la section « Construire »)
- Modify: `.claude-plugin/plugin.json:3` (description)
- Create: `docs/superpowers/plans/2026-08-29-erom-seo-chantier-4-recette.md` (à la racine du repo, pas dans `plugin/`)

**Interfaces:**
- Consumes: la commande de la tâche 4, la référence de la tâche 5, la skill `/erom-seo:audit` (existante).
- Produces: `/erom-seo:checklist`, invocable depuis le repo d'un site.

- [ ] **Étape 1 : la skill**

Écrire `skills/checklist/SKILL.md` :

````markdown
---
name: checklist
description: Avant et après le déploiement d'un site, tient à jour seo/checklist.md, quinze cases avec leur preuve : audit vert, branche fusionnée, hors build, consoles Google et Bing, prod revérifiée par un audit, redirections d'un ancien site, ping IndexNow et sitemap chez Bing (avec accord), jalons J+1 à J+90. Ne déploie rien. Triggers : '/erom-seo:checklist', 'on déploie, qu'est-ce qui manque', 'checklist de mise en ligne', 'c'est en ligne, et maintenant', 'où en est le suivi SEO'.
argument-hint: "[--mise-en-ligne AAAA-MM-JJ] [--ancien-sitemap <url ou fichier>]"
---

# Checklist SEO/GEO, avant et après le déploiement

Tu tiens à jour `seo/checklist.md`. Tu ne déploies rien et tu ne lances rien : le déploiement est le geste de Romain. Tu ne juges pas la prod toi-même : l'audit juge. Tu n'envoies rien dehors (IndexNow, Bing) sans avoir dit ce qui va partir et attendu le OK.

## 0. Préparer

1. Répertoire courant : le repo du site. `seo/strategy.md` absent : proposer `/erom-seo:strategy` et s'arrêter. `Statut : brouillon` : le dire, continuer.
2. Scripts : `${CLAUDE_PLUGIN_ROOT}/skills/checklist/scripts/`. Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
3. Lire `seo/checklist.md` s'il existe : la date de mise en ligne, les cases cochées. Lire `${CLAUDE_PLUGIN_ROOT}/skills/checklist/references/consoles.md` en entier : c'est de là que viennent les chemins de clics de la restitution.
4. Clé Bing : `[ -n "$BING_WMT_API_KEY" ] && echo présente || echo absente`. Jamais `echo $BING_WMT_API_KEY`, jamais la clé dans une commande affichée. Absente : le dire une fois (« la ligne Bing restera à la main »), continuer.

## 1. Situer

Si le fichier n'existe pas ou porte « Mise en ligne : non », une seule question : « c'est déployé ? ».
- Non : rien d'autre à demander, on remplit la moitié « Avant ».
- Oui : demander la date (défaut : aujourd'hui, format AAAA-MM-JJ) et, si `seo/checklist/ancien-sitemap.xml` n'existe pas, « ancien site à rediriger ? » (réponse : l'URL de son sitemap, un fichier, ou non). Ces réponses deviennent `--mise-en-ligne` et `--ancien-sitemap`.
Le fichier existe avec une date : rien à demander, sauf si Romain passe une nouvelle date (elle remet la moitié « Après » à zéro, actions comprises : le dire).

## 2. Auditer la prod

Si la mise en ligne est posée et qu'aucun `seo/audits/<date>-n0*/report.md` daté d'aujourd'hui n'existe : invoquer la skill `/erom-seo:audit https://<site>` (`<site>` = titre de `seo/strategy.md`). Elle écrit le rapport et le passe au lint. Sans mise en ligne : rien, le dernier audit niveau 2 suffit.

## 3. Écrire

`bun ${CLAUDE_PLUGIN_ROOT}/skills/checklist/scripts/checklist.ts [--mise-en-ligne <date>] [--ancien-sitemap <url ou fichier>]`, sans `--agir`. Première ligne de la sortie : `fichier : seo/checklist.md` ; deuxième : `checklist : n/15 cochées · mise en ligne : … · dû aujourd'hui : …`. Chaque ligne `attention :` de la sortie d'erreur est répétée à Romain telle quelle. Exit 1 : montrer l'erreur, s'arrêter (le fichier n'a pas été réécrit).

## 4. Agir

Lire le fichier écrit. Si « Ping IndexNow » ou « Sitemap soumis à Bing » porte « à faire : relance avec --agir » :
1. Dire exactement ce qui va partir, en une ligne par action : « ping IndexNow : <n> URL du sitemap de <hôte>, clé <clé> » (la clé IndexNow est publique, servie à la racine du site) ; « sitemap <url> soumis à Bing Webmaster Tools pour <site tel que Bing le nomme> ».
2. Attendre le OK de Romain. Refus : ne rien relancer ; noter « refusé par Romain le <date> » dans la restitution (le fichier garde « à faire »).
3. OK : relancer la même commande qu'en 3 avec `--agir` en plus. Relire le fichier : chaque action porte maintenant sa date et sa réponse, ou son code d'erreur. Une action déjà cochée n'est jamais refaite.
« en attente : … » sur une action : ce n'est pas à toi de le lever, c'est une case à la main (Bing pas configuré, aucun audit prod) : le dire en restitution.

## 5. Restituer

Dans l'ordre, une liste par point, jamais un tableau (Romain lit sur mobile) :
1. Le chemin du fichier et la ligne `checklist : …`.
2. Ce qui est dû aujourd'hui (les jalons échus non cochés) : pour chacun, le chemin de clics de `consoles.md`, en trois lignes maximum.
3. Les cases `main` encore vides de la moitié courante, avec leur consigne (et les sous-lignes : hors build avec leur « ou », pages à inspecter).
4. Les cases `auto` vides et leur raison, telle quelle (« aucun audit prod depuis la mise en ligne », « tu es sur seo-build-…, fusionne d'abord », les URL de l'ancien site en défaut).
5. Les actions faites (date, réponse) ou refusées.
6. La suite : « relance `/erom-seo:checklist` le <prochaine date J+n> » ; ou, si tout est coché jusqu'au J+90, « chantier 5 : niveau 1 ». Rappeler que rien n'a été déployé ni poussé par la skill.

## 6. Règles d'écriture

Français, phrases courtes, aucun tiret cadratin. Ne jamais éditer `seo/checklist.md` à la main dans ce flux : tout passe par le script ; pour cocher une case `main` que Romain dit avoir faite, remplacer `- [ ]` par `- [x]` sur cette seule ligne, puis relancer le script. Ne jamais modifier `seo/audits/*/raw/`. Ne jamais afficher `BING_WMT_API_KEY`.
````

- [ ] **Étape 2 : README et manifeste**

Dans `README.md`, après la section « Construire » et avant « Vérifier que les références n'ont pas dérivé », ajouter :

```markdown
## Vérifier avant et après le déploiement

Depuis le repo du site, avec `seo/strategy.md` et un build fusionné :

```
/erom-seo:checklist
```

Sortie : `seo/checklist.md`, quinze cases en deux moitiés. Avant le déploiement : audit niveau 2 vert, branche fusionnée, hors build, Search Console et Bing Webmaster Tools créés, ancien sitemap sauvegardé si le site en remplace un. Après (la skill demande « c'est déployé ? » et la date) : un audit niveau 0 refait sur la prod, les redirections de l'ancien site, le ping IndexNow et le sitemap chez Bing (envoyés seulement après votre OK), puis les jalons J+1, J+3, J+7, J+30, J+90 avec, pour chacun, le chemin de clics. Les cases `auto` suivent les audits et git ; les cases `main` sont à vous et ne sont jamais décochées. Relancez la skill quand vous voulez : elle dit ce qui est dû. Elle ne déploie rien.
```

Dans `.claude-plugin/plugin.json`, ligne 3, remplacer « Audit, stratégie, build et lancement SEO/GEO sans abonnement tiers » par « Audit, stratégie, build et checklist de déploiement SEO/GEO sans abonnement tiers ». Même remplacement dans la première ligne du `README.md`.

- [ ] **Étape 3 : la recette, à dérouler en tâche 7**

Créer `docs/superpowers/plans/2026-08-29-erom-seo-chantier-4-recette.md` (à la racine du repo) :

```markdown
# Recette du chantier 4 : `checklist` sur chico

Cobaye : `/Users/recarnot/dev/chico-happiness` (commentchercherbonheur.org, déployé sur Vercel, build fusionné et poussé le 29/08, clé IndexNow `bf498d4959b94b88aa7bb3902433735f` servie en 200, sitemap de prod de 10 URL, compte Bing Webmaster Tools de Romain vide au 29/08). Plugin chargé depuis le worktree : `claude --plugin-dir /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin`. Tests et sources : AC-7 d'abord, puis AC-1 à AC-6 dans l'ordre. Chaque AC : la commande ou le clic, la sortie collée telle quelle, OK ou KO.

## AC-7 : suite et sources
`cd /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin && bun test && bun skills/audit/scripts/check-sources.ts | tail -3`
Attendu : 0 fail ; « 0 en échec ».

## AC-1 : premier passage, pas déployé, aucune écriture
Dans chico, sur `main`, arbre propre : `/erom-seo:checklist`, répondre « non » à « c'est déployé ? ». Puis `cat seo/checklist.md`.
Attendu : lignes 1 et 2 cochées (n2 du 29/08 vert, commit `seo(…)` sur main), 3 et 4 vides avec leur consigne, 5 vide « absent du compte Bing de l'agence » (clé présente, compte vide), 6 « sans objet », toute la moitié « Après » vide. Aucune requête sortante autre que `GetUserSites` : relancer le script à la main avec `BING_WMT_API_KEY=""` et comparer, seule la ligne 5 change.

## AC-2 : une case main survit
Remplacer `- [ ] Search Console : propriété créée` par `- [x] …` dans `seo/checklist.md`, relancer `/erom-seo:checklist`. `grep "Search Console : propriété créée" seo/checklist.md` : cochée avant et après.

## AC-3 : déployé, la prod est auditée, les jalons sont datés
Relancer, répondre « oui », date `2026-08-29`, « pas d'ancien site ». Attendu : `ls seo/audits/` montre un n0 du jour ; « Prod verte » suit ce rapport ; J+1 = 2026-08-30, J+3 = 2026-09-01, J+7 = 2026-09-05, J+30 = 2026-09-28, J+90 = 2026-11-27 ; sous J+3, les 10 pages sur www.
Note : si le n0 du jour n'est pas vert, la case reste vide avec « En bref » : c'est le comportement attendu, noter les trouvailles.

## AC-4 : le ping, avec accord
La skill propose « ping IndexNow : 10 URL de www.commentchercherbonheur.org, clé bf49… ». Romain dit OK. Attendu : la ligne « Ping IndexNow » cochée, `2026-08-29 · 200, 10 URL` ou `202`. Coller la réponse réelle (code) ici : c'est l'échantillon manquant de la recherche (incertitude 1). Relancer la skill : le ping n'est pas reproposé. Vérifier ensuite dans Bing Webmaster Tools, IndexNow, si le site y est un jour ajouté.
« Sitemap soumis à Bing » reste « en attente » tant que le compte Bing est vide : attendu.

## AC-5 : la prod qui régresse (test)
`cd /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin && bun test skills/checklist/scripts/tests/checklist.test.ts -t "régresse"` : pass. Sur chico, facultatif : copier le dernier n0 en `seo/audits/<date>-n0-2/`, y remplacer le rapport par un rapport avec une trouvaille Critique (fixture `report.md` de chico), relancer le script à la main : « Prod verte » vide avec « En bref ». Puis supprimer ce dossier (`trash`).

## AC-6 : ancien sitemap (test)
`bun test skills/checklist/scripts/tests/ancien-sitemap.test.ts skills/checklist/scripts/tests/checklist-cli.test.ts -t "ancien"` : pass. Sur chico, facultatif : `--ancien-sitemap` avec un fichier XML de deux URL inventées sur un autre domaine ; « Redirections » vide avec les deux URL et leur code ; puis `trash seo/checklist/`.

## Bilan
(à remplir en tâche 7 : OK/KO par AC, réponse réelle d'IndexNow, écarts, correctifs)
```

- [ ] **Étape 4 : vérifier**

Run : `bun test` (0 fail) ; `grep -c "—" skills/checklist/SKILL.md README.md skills/checklist/references/consoles.md` (0 partout) ; relancer `claude --plugin-dir /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin` dans un dossier vide et taper `/erom-seo:checklist` : la skill doit répondre qu'il manque `seo/strategy.md` et proposer `/erom-seo:strategy`.

- [ ] **Étape 5 : commit**

```bash
git add skills/checklist/SKILL.md README.md .claude-plugin/plugin.json ../docs/superpowers/plans/2026-08-29-erom-seo-chantier-4-recette.md
git commit -m "docs(checklist): skill checklist en six temps, README, manifeste, recette à dérouler sur chico"
```

---

### Tâche 7 : la recette sur chico (session mère, avec Romain)

**Files:**
- Modify: `docs/superpowers/plans/2026-08-29-erom-seo-chantier-4-recette.md` (les résultats)
- Dans chico : `seo/checklist.md`, `seo/audits/<date>-n0/` (créés par la skill), rien d'autre.

Cette tâche n'est pas pour un sous-agent : elle demande l'accord de Romain (AC-4 envoie une requête à IndexNow) et un compte Bing. La session mère la déroule après avoir relu et fusionné les tâches 1 à 6.

- [ ] **Étape 1 : AC-7 puis AC-1 à AC-6** dans l'ordre de la recette, en collant chaque sortie.
- [ ] **Étape 2 : consigner la réponse réelle d'IndexNow** (code, corps) dans la recette et dans `docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md`, section 5, incertitude 1 : levée ou non.
- [ ] **Étape 3 : les écarts** : chaque KO devient un correctif (spec amendée si la règle change, code et test sinon), comme R-6 et R-7a au chantier 3.
- [ ] **Étape 4 : commit de la recette** dans le repo erom-agence-seo (`docs: recette du chantier 4, résultats du <date>`), et dans chico un commit `seo(checklist): checklist du <date>` avec `seo/checklist.md` et l'audit n0 du jour (hors `raw/`, déjà ignoré), sur décision de Romain.
