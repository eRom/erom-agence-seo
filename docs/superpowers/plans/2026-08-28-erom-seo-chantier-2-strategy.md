# Plan d'implémentation : erom-seo, chantier 2, `strategy`, couche stratégique, niveau 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer `/erom-seo:strategy` (interview qui produit `seo/strategy.md`, mesuré par Bing et Wikipédia), la couche stratégique de l'audit (STRAT-01 à STRAT-04, AI-02, évaluées mécaniquement dès que `seo/strategy.md` existe) et le niveau 2 (audit d'un site lancé en local).

**Architecture:** Un parseur partagé (`plugin/lib/strategy.ts`) lit un `strategy.md` strict ; un lint le refuse s'il dérive. `keywords.ts` interroge Bing et Wikimedia et garde les réponses brutes datées. `collect.ts` apprend le niveau 2 (détection à l'hôte, réécriture du sitemap vers localhost, PageSpeed et sondes d'hôte non applicables) et la stratégie (pages prévues collectées, clé IndexNow récupérée). `strategy-eval.ts`, sans réseau, compare stratégie et faits collectés dans `derived/strategy-eval.json` ; cinq vérifications s'y lisent, et le lint du rapport les exige quand la couche est active.

**Tech Stack:** Bun 1.4.0, TypeScript, `node-html-parser` 9.0.1, `bun:test`, `Bun.serve` pour le site jouet. Aucune dépendance nouvelle.

**Spec:** `docs/superpowers/specs/2026-08-28-erom-seo-strategy-design.md` (lue en entier avant de commencer ; la spec mère `docs/superpowers/specs/2026-08-27-erom-seo-design.md` pour les décisions D1 à D8). Recherche sur les mots-clés gratuits, avec les échantillons réels : `docs/recherches/2026-08-27-mots-cles-gratuits.md`.

## Contraintes globales

- Runtime `bun` uniquement. Jamais `npm`, `npx`, `node` : un garde-fou local les bloque.
- Aucun service payant. Clés dans l'environnement : `PSI_API_KEY`, `BING_WMT_API_KEY` (`source ~/.zshenv` avant toute commande à clé). Jamais dans un fichier commité, jamais affichées, jamais écrites sur disque : `keywords.ts` le garantit par un test (tâche 3).
- Rapports, stratégies et références en français. Citations de documentation en anglais, verbatim, entre « ».
- D5 de la spec mère : une vérification sans `Source` officielle ne se livre pas. Domaines admis : `OFFICIAL_DOMAINS` dans `plugin/skills/audit/scripts/lib/checks.ts`.
- Pas d'em dash dans les rapports, les références, le gabarit de stratégie, `strategy.md`, `SKILL.md` : ces textes partent chez des tiers. Le lint le vérifie.
- Vocabulaires fermés de `strategy.md` (spec 4.2) : Intention ∈ {informationnelle, transactionnelle, navigationnelle, locale} ; Cadence ∈ {2 semaines, 4 semaines, trimestriel, annuel, aucune}. Sections H2, dans l'ordre : Identité, Cibles, Concurrents, Pages ↔ mots-clés, Entité, Liens externes, Cadence de fraîcheur, Ce qu'on ne sait pas.
- Règle D9 : la couche stratégique s'allume dès que `seo/strategy.md` existe sous le répertoire courant, à tout niveau. Niveau 2 = hôte `localhost` ou `127.0.0.1`, rien d'autre.
- D11 : jamais un chiffre Google. Bing vide = « non mesurable gratuitement », daté.
- Un dossier par exécution, jamais écrasé : `seo/strategy/<AAAA-MM-JJ>/` (suffixe `-2`, `-3`…), même mécanique atomique que `seo/audits/`.
- **Git : travailler dans un worktree, jamais `git switch` dans `/Users/recarnot/dev/erom-agence-seo`** (le checkout est partagé avec d'autres sessions ; incident du 28/08). Tâche 1 : `git -C /Users/recarnot/dev/erom-agence-seo worktree add /Users/recarnot/dev/erom-agence-seo-chantier-2 -b chantier-2-strategy main`, puis tout se passe dans `/Users/recarnot/dev/erom-agence-seo-chantier-2`. Un commit par tâche, message en français, préfixes `feat(strategy):`, `feat(audit):`, `test(…):`, `docs(…):`, sans em dash. Pas de fusion : Romain (ou la session mère) relit et fusionne.
- Toute commande de ce plan se lance depuis `plugin/` du worktree sauf mention contraire. Tests : `bun test` (racine du plugin, après la tâche 1).
- Interdits dans les tests : lire le code source depuis un test, figer un compte de fixture ou de catalogue, asserter sur un mock plutôt que sur un comportement.
- Le code TypeScript des tâches 1, 3, 5, 6 (aides), 8 (bibliothèque) a été exécuté avec ses tests avant l'écriture du plan (59 tests verts, scratchpad du 28/08). Les câblages CLI et les diffs de `collect.ts` sont écrits contre le fichier à `8d43a49` : si une ligne a bougé, le test de la tâche fait foi, pas le numéro de ligne.

## Structure des fichiers

```
plugin/
  package.json                                   modifier : "test": "bun test"
  README.md                                      modifier : section « Écrire la stratégie », niveau 2
  lib/
    strategy.ts                                  créer : contrat de strategy.md (tâche 1)
    tests/strategy.test.ts                       créer
  skills/
    strategy/
      SKILL.md                                   créer : l'interview (tâche 4)
      references/strategy-template.md            créer : gabarit conforme (tâche 2)
      scripts/
        lint-strategy.ts                         créer (tâche 2)
        keywords.ts                              créer : CLI Bing + Wikimedia (tâche 3)
        lib/keywords.ts                          créer : parseurs et garde anti-fuite (tâche 3)
        tests/
          lint-strategy.test.ts                  créer
          keywords.test.ts                       créer
          fixtures/bing-keywordstats-seo-fr.json copié depuis docs/recherches/echantillons/
          fixtures/bing-keywordstats-plombier_nantes-fr.json
          fixtures/wikimedia-pageviews-seo-fr-30j.json
    audit/
      SKILL.md                                   modifier : niveau, couche, strategy-eval (tâche 10)
      references/
        levels.md                                modifier (tâche 10)
        report-template.md                       modifier : en-tête (tâche 10)
        checks/strategy.md                       créer : STRAT-01 à 04 (tâche 9)
        checks/ai-presence.md                    modifier : AI-02 (tâche 9)
        checks/performance.md                    modifier : PERF-01, cas local (tâche 9)
      scripts/
        collect.ts                               modifier (tâches 6, 7)
        strategy-eval.ts                         créer : CLI (tâche 8)
        lint-report.ts                           modifier : ids attendus selon en-tête (tâche 10)
        lib/
          page.ts                                modifier : organization, opening, bodyText (tâche 5)
          sitemap.ts                             modifier : rewriteTo, rewrittenFrom (tâche 6)
          strategy-eval.ts                       créer : évaluation pure (tâche 8)
          types.ts                               modifier (tâches 5, 6, 7)
        tests/
          page.test.ts                           modifier (tâche 5)
          sitemap.test.ts                        modifier (tâche 6)
          collect.test.ts                        modifier (tâches 6, 7)
          strategy-eval.test.ts                  créer (tâche 8)
          lint-report.test.ts                    modifier (tâche 10)
          fixtures/site.ts                       modifier : prodHost, indexnowKey (tâches 6, 7)
```

---

### Tâche 1 : le contrat de `strategy.md`, `plugin/lib/strategy.ts`

**Files:**
- Create: `plugin/lib/strategy.ts`
- Create: `plugin/lib/tests/fixtures/strategy-valide.ts` (exporte `VALID`, un `strategy.md` conforme ; importé par les tests des tâches 1, 7 et 8 : jamais importer un fichier `*.test.ts` depuis un autre test, bun relancerait ses tests)
- Create: `plugin/lib/tests/strategy.test.ts`
- Modify: `plugin/package.json` (script `test`)

**Interfaces:**
- Produces: `parseStrategy(md: string): Strategy` (lève `StrategyError` avec `errors: string[]`), `lintStrategy(md: string): string[]`, `analyseStrategy(md): { strategy: Strategy; errors: string[] }`, `normalizeText(s: string): string`, `keywordMatches(keyword: string, text: string): boolean`, `cadenceDays(c: Cadence): number | null`, constantes `INTENTIONS`, `CADENCES`, `SECTIONS`, `PAGES_COLUMNS`, `CONCURRENTS_COLUMNS`, `AUCUN_CONCURRENT`, `INDEXNOW_KEY`, `STOP_WORDS`, types `Strategy`, `PagePlan`, `Concurrent`, `Nap`, `Intention`, `Cadence`.

- [ ] **Étape 1 : créer le worktree et la branche**

```bash
git -C /Users/recarnot/dev/erom-agence-seo worktree add /Users/recarnot/dev/erom-agence-seo-chantier-2 -b chantier-2-strategy main
cd /Users/recarnot/dev/erom-agence-seo-chantier-2/plugin && bun install --frozen-lockfile && bun test skills 2>&1 | tail -3
```

Attendu : `84 pass`. Toutes les commandes suivantes se lancent depuis `/Users/recarnot/dev/erom-agence-seo-chantier-2/plugin`.

- [ ] **Étape 2 : écrire la fixture et le test qui échoue**

Créer `lib/tests/fixtures/strategy-valide.ts` :

```ts
/** Un strategy.md conforme, partagé par les tests du parseur, de la collecte et de l'évaluation. */
export const VALID = `# Stratégie SEO/GEO : commentchercherbonheur.org
2026-08-28 · Statut : brouillon · Données : seo/strategy/2026-08-28/

## Identité
L'Institut C.H.I.C.O. est un centre de coaching qui vend le bonheur comme une science exacte.

Une phrase, la première ligne non vide de la section.

## Cibles
Audience : grand public francophone
Langue : fr
Pays : FR
Surfaces IA : AI Overviews, ChatGPT
Pourquoi : audience grand public.

## Concurrents
Aucun concurrent identifié.

## Pages ↔ mots-clés
| Page | Intention | Mot-clé principal | Secondaires | Cadence | Signaux |
|---|---|---|---|---|---|
| / | navigationnelle | institut chico | bonheur, coaching | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |
| /methode | informationnelle | méthode bonheur | bonheur au travail | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |

## Entité
Nom : L'Institut C.H.I.C.O.
sameAs :
- https://x.com/chico
- https://www.tipeee.com/chico
NAP : non

## Liens externes
- Annuaires : aucun
Pas d'achat de liens.

## Cadence de fraîcheur
Evergreen : trimestriel.
IndexNow : non

## Ce qu'on ne sait pas
Volumes : Bing interrogé le 2026-08-28, rien.
`;
```

Créer `lib/tests/strategy.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { analyseStrategy, cadenceDays, keywordMatches, lintStrategy, normalizeText, parseStrategy, StrategyError } from "../strategy";
import { VALID } from "./fixtures/strategy-valide";

describe("parseStrategy", () => {
  const s = parseStrategy(VALID);
  test("en-tête", () => {
    expect(s.site).toBe("commentchercherbonheur.org");
    expect(s.date).toBe("2026-08-28");
    expect(s.statut).toBe("brouillon");
    expect(s.dataDir).toBe("seo/strategy/2026-08-28/");
  });
  test("identité : première ligne non vide", () => {
    expect(s.identite).toBe("L'Institut C.H.I.C.O. est un centre de coaching qui vend le bonheur comme une science exacte.");
  });
  test("cibles", () => {
    expect(s.cibles).toEqual({ audience: "grand public francophone", langue: "fr", pays: "FR", surfaces: ["AI Overviews", "ChatGPT"], pourquoi: "audience grand public." });
  });
  test("pages", () => {
    expect(s.pages).toHaveLength(2);
    expect(s.pages[1]).toEqual({ page: "/methode", intention: "informationnelle", motCle: "méthode bonheur", secondaires: ["bonheur au travail"], cadence: "trimestriel", signaux: "Bing FR : rien, non mesurable gratuitement (2026-08-28)" });
    expect(s.pages[0].secondaires).toEqual(["bonheur", "coaching"]);
  });
  test("entité, concurrents, indexnow", () => {
    expect(s.entite).toEqual({ nom: "L'Institut C.H.I.C.O.", sameAs: ["https://x.com/chico", "https://www.tipeee.com/chico"], nap: null });
    expect(s.concurrents).toEqual([]);
    expect(s.indexnow).toBeNull();
  });
  test("tableau de concurrents, NAP, clé IndexNow", () => {
    const md = VALID
      .replace("Aucun concurrent identifié.", "| Concurrent | Ce qu'il vise | Ce qu'on prend, ce qu'on évite |\n|---|---|---|\n| exemple.fr | pages piliers | on prend les piliers |")
      .replace("NAP : non", "NAP :\nAdresse : 1 rue du Bonheur, 44000 Nantes\nTéléphone : 02 00 00 00 00")
      .replace("IndexNow : non", "IndexNow : a1b2c3d4e5f6");
    const t = parseStrategy(md);
    expect(t.concurrents).toEqual([{ domaine: "exemple.fr", vise: "pages piliers", prendEvite: "on prend les piliers" }]);
    expect(t.entite.nap).toEqual({ adresse: "1 rue du Bonheur, 44000 Nantes", telephone: "02 00 00 00 00" });
    expect(t.indexnow).toBe("a1b2c3d4e5f6");
  });
  test("un fichier fautif lève StrategyError avec la liste", () => {
    expect(() => parseStrategy(VALID.replace("## Entité", "## Entite"))).toThrow(StrategyError);
  });
});

describe("lintStrategy", () => {
  test("le gabarit rempli passe", () => expect(lintStrategy(VALID)).toEqual([]));
  const cases: [string, string, string, RegExp][] = [
    ["section manquante", "## Liens externes\n", "## Liens\n", /section manquante : ## Liens externes/],
    ["sections dans le désordre", "## Entité", "## Zz", /section manquante|désordre/],
    ["en-tête sans statut", "Statut : brouillon", "Statut : bof", /ligne 2/],
    ["intention hors vocabulaire", "| informationnelle |", "| info |", /intention « info » hors vocabulaire/],
    ["cadence hors vocabulaire", "| trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n\n## Entité", "| mensuel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n\n## Entité", /cadence « mensuel » hors vocabulaire/],
    ["page sans /", "| /methode |", "| methode |", /doit commencer par \//],
    ["page en double", "| /methode |", "| / |", /« \/ » en double/],
    ["mot-clé principal vide", "| méthode bonheur |", "|  |", /mot-clé principal vide/],
    ["signaux sans date", "non mesurable gratuitement (2026-08-28) |\n\n## Entité", "non mesurable gratuitement |\n\n## Entité", /Signaux sans date/],
    ["nom manquant", "Nom : L'Institut C.H.I.C.O.", "Nom :", /« Nom : » manquant/],
    ["NAP absent", "NAP : non", "", /NAP : non/],
    ["clé IndexNow mal formée", "IndexNow : non", "IndexNow : abc", /clé IndexNow mal formée/],
    ["IndexNow manquant", "IndexNow : non", "", /IndexNow : <clé>/],
    ["ce qu'on ne sait pas vide", "Volumes : Bing interrogé le 2026-08-28, rien.", "", /Ce qu'on ne sait pas : section vide/],
    ["tiret cadratin", "Pas d'achat de liens.", "Pas d'achat — jamais.", /tiret cadratin/],
    ["langue manquante", "Langue : fr", "", /« Langue : » manquante/],
  ];
  for (const [name, from, to, re] of cases) {
    test(name, () => {
      const md = VALID.replace(from, to);
      expect(md, "le remplacement doit avoir eu lieu").not.toBe(VALID);
      expect(lintStrategy(md).join("\n")).toMatch(re);
    });
  }
  test("ordre des sections", () => {
    const md = VALID.replace("## Cibles\nAudience : grand public francophone\nLangue : fr\nPays : FR\nSurfaces IA : AI Overviews, ChatGPT\nPourquoi : audience grand public.\n\n", "")
      + "\n## Cibles\nAudience : x\nLangue : fr\nPays : FR\n";
    expect(lintStrategy(md).join("\n")).toMatch(/désordre/);
  });
  test("analyseStrategy rend aussi la stratégie partielle", () => {
    const { strategy, errors } = analyseStrategy(VALID.replace("Langue : fr", ""));
    expect(errors).toHaveLength(1);
    expect(strategy.pages).toHaveLength(2);
  });
});

describe("normalizeText et keywordMatches", () => {
  test("accents, casse, ponctuation, sigle à points", () => {
    expect(normalizeText("  L'Institut C.H.I.C.O. : Méthode  ")).toBe("l institut chico methode");
    expect(keywordMatches("institut chico", "L'Institut C.H.I.C.O. : le bonheur")).toBe(true);
  });
  test("Agence SEO à Nantes vise agence seo nantes", () => {
    expect(keywordMatches("agence seo nantes", "Agence SEO à Nantes, conseil")).toBe(true);
  });
  test("les mots vides du mot-clé sont ignorés", () => {
    expect(keywordMatches("méthode du bonheur", "La méthode C.H.I.C.O. pour le bonheur")).toBe(true);
  });
  test("un mot manquant fait échouer", () => {
    expect(keywordMatches("agence seo nantes", "Agence SEO à Rennes")).toBe(false);
  });
  test("mot partiel : seo ne vise pas seoul", () => {
    expect(keywordMatches("seo", "Voyage à Séoul")).toBe(false);
  });
  test("mot-clé fait de mots vides", () => {
    expect(keywordMatches("de la", "de la")).toBe(false);
  });
});

test("cadenceDays", () => {
  expect(cadenceDays("2 semaines")).toBe(14);
  expect(cadenceDays("4 semaines")).toBe(28);
  expect(cadenceDays("trimestriel")).toBe(92);
  expect(cadenceDays("annuel")).toBe(366);
  expect(cadenceDays("aucune")).toBeNull();
});
```

- [ ] **Étape 3 : vérifier que le test échoue**

Run : `bun test lib/tests/strategy.test.ts`
Attendu : échec, `Cannot find module "../strategy"`.

- [ ] **Étape 4 : écrire `lib/strategy.ts`**

```ts
// Contrat du fichier seo/strategy.md : parseur, lint, normalisation, règle des mots. Partagé par strategy et audit.

export const INTENTIONS = ["informationnelle", "transactionnelle", "navigationnelle", "locale"] as const;
export const CADENCES = ["2 semaines", "4 semaines", "trimestriel", "annuel", "aucune"] as const;
export type Intention = (typeof INTENTIONS)[number];
export type Cadence = (typeof CADENCES)[number];

export const SECTIONS = ["Identité", "Cibles", "Concurrents", "Pages ↔ mots-clés", "Entité", "Liens externes", "Cadence de fraîcheur", "Ce qu'on ne sait pas"] as const;
export const PAGES_COLUMNS = ["Page", "Intention", "Mot-clé principal", "Secondaires", "Cadence", "Signaux"] as const;
export const CONCURRENTS_COLUMNS = ["Concurrent", "Ce qu'il vise", "Ce qu'on prend, ce qu'on évite"] as const;
export const AUCUN_CONCURRENT = "Aucun concurrent identifié.";
/** https://www.indexnow.org/documentation (lu le 2026-08-28) : 8 à 128 caractères, a-z, A-Z, 0-9 et tirets. */
export const INDEXNOW_KEY = /^[a-zA-Z0-9-]{8,128}$/;
const HEADER = /^(\d{4}-\d{2}-\d{2}) · Statut : (brouillon|validée) · Données : (seo\/strategy\/\d{4}-\d{2}-\d{2}(?:-\d+)?\/)$/;
const DATE = /\d{4}-\d{2}-\d{2}/;

export type PagePlan = { page: string; intention: Intention; motCle: string; secondaires: string[]; cadence: Cadence; signaux: string };
export type Concurrent = { domaine: string; vise: string; prendEvite: string };
export type Nap = { adresse: string; telephone: string };
export type Strategy = {
  site: string;
  date: string;
  statut: "brouillon" | "validée";
  dataDir: string;
  identite: string;
  cibles: { audience: string; langue: string; pays: string; surfaces: string[]; pourquoi: string };
  concurrents: Concurrent[];
  pages: PagePlan[];
  entite: { nom: string; sameAs: string[]; nap: Nap | null };
  liensExternes: string;
  cadenceFraicheur: string;
  indexnow: string | null;
  inconnu: string;
};

export class StrategyError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "StrategyError"; }
}

/** Mots vides ignorés par la règle des mots. Liste fixe, courte, française. */
export const STOP_WORDS = new Set(["le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "a", "au", "aux", "en", "et", "ou", "pour", "sur", "par", "dans", "avec", "sans", "ce", "cet", "cette", "ces", "son", "sa", "ses", "votre", "vos", "notre", "nos", "mon", "ma", "mes"]);

/** Minuscules, accents retirés, sigles à points recollés (C.H.I.C.O. → chico), ponctuation remplacée par des espaces, espaces réduits. */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/(?<=\p{L})\.(?=\p{L})/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

/** Vrai si chaque mot du mot-clé, hors mots vides, apparaît comme mot entier dans le texte. « Agence SEO à Nantes » vise « agence seo nantes ». */
export function keywordMatches(keyword: string, text: string): boolean {
  const tokens = normalizeText(keyword).split(" ").filter((t) => t && !STOP_WORDS.has(t));
  if (tokens.length === 0) return false;
  const present = new Set(normalizeText(text).split(" "));
  return tokens.every((t) => present.has(t));
}

export function cadenceDays(c: Cadence): number | null {
  return { "2 semaines": 14, "4 semaines": 28, trimestriel: 92, annuel: 366, aucune: null }[c];
}

type Sections = Map<string, string[]>;

/** Découpe le fichier : en-tête (avant le premier `## `) et une entrée par section H2, dans l'ordre d'apparition. */
function split(md: string): { head: string[]; sections: Sections; order: string[] } {
  const head: string[] = [];
  const sections: Sections = new Map();
  const order: string[] = [];
  let cur: string[] | null = null;
  for (const raw of md.split("\n")) {
    const h = raw.match(/^## (.+?)\s*$/);
    if (h) { cur = []; sections.set(h[1], cur); order.push(h[1]); continue; }
    (cur ?? head).push(raw);
  }
  return { head, sections, order };
}

const field = (lines: string[], name: string): string | null => {
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(.*)$`);
  for (const l of lines) { const m = l.match(re); if (m) return m[1].trim(); }
  return null;
};

const cells = (line: string): string[] => line.split("|").slice(1, -1).map((c) => c.trim());
const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(l);

/** Lit un tableau Markdown : en-tête attendu, puis les lignes. Rend null s'il n'y a aucun tableau. */
function table(lines: string[], columns: readonly string[], where: string, errors: string[]): string[][] | null {
  const rows = lines.filter(isTableLine);
  if (rows.length === 0) return null;
  const header = cells(rows[0]);
  if (header.join(" | ") !== columns.join(" | ")) errors.push(`${where} : colonnes attendues « ${columns.join(" | ")} », lues « ${header.join(" | ")} »`);
  const body = rows.slice(1).filter((l) => !isSeparator(l)).map(cells);
  for (const r of body) if (r.length !== columns.length) errors.push(`${where} : ligne à ${r.length} cellules au lieu de ${columns.length} : « ${r[0] ?? ""} »`);
  return body.filter((r) => r.length === columns.length);
}

/** Analyse complète : rend la stratégie et la liste des défauts. `lintStrategy` et `parseStrategy` en dérivent. */
export function analyseStrategy(md: string): { strategy: Strategy; errors: string[] } {
  const errors: string[] = [];
  if (md.includes("—")) errors.push("tiret cadratin présent");
  const { head, sections, order } = split(md);

  const nonEmpty = head.filter((l) => l.trim() !== "");
  const title = nonEmpty[0]?.match(/^# Stratégie SEO\/GEO : (.+)$/);
  if (!title) errors.push("ligne 1 : attendu « # Stratégie SEO/GEO : <site> »");
  const meta = nonEmpty[1]?.match(HEADER);
  if (!meta) errors.push("ligne 2 : attendu « AAAA-MM-JJ · Statut : brouillon | validée · Données : seo/strategy/AAAA-MM-JJ/ »");

  for (const s of SECTIONS) if (!sections.has(s)) errors.push(`section manquante : ## ${s}`);
  const present = order.filter((o) => (SECTIONS as readonly string[]).includes(o));
  const expected = SECTIONS.filter((s) => sections.has(s));
  if (present.join("|") !== expected.join("|")) errors.push(`sections dans le désordre : ${present.join(", ")}`);
  const sec = (name: string) => sections.get(name) ?? [];

  const identite = sec("Identité").map((l) => l.trim()).find((l) => l !== "") ?? "";
  if (!identite) errors.push("Identité : la première ligne doit être la phrase d'identité");

  const c = sec("Cibles");
  const langue = field(c, "Langue") ?? "";
  const pays = field(c, "Pays") ?? "";
  if (!langue) errors.push("Cibles : « Langue : » manquante");
  if (!pays) errors.push("Cibles : « Pays : » manquant");
  const surfaces = (field(c, "Surfaces IA") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  let concurrents: Concurrent[] = [];
  const cl = sec("Concurrents");
  const ct = table(cl, CONCURRENTS_COLUMNS, "Concurrents", errors);
  if (ct) concurrents = ct.map(([domaine, vise, prendEvite]) => ({ domaine, vise, prendEvite }));
  else if (!cl.some((l) => l.trim() === AUCUN_CONCURRENT)) errors.push(`Concurrents : un tableau, ou la ligne « ${AUCUN_CONCURRENT} »`);

  const pages: PagePlan[] = [];
  const pt = table(sec("Pages ↔ mots-clés"), PAGES_COLUMNS, "Pages ↔ mots-clés", errors);
  if (!pt || pt.length === 0) errors.push("Pages ↔ mots-clés : au moins une ligne");
  const seen = new Set<string>();
  for (const [page, intention, motCle, secondaires, cadence, signaux] of pt ?? []) {
    if (!/^\/\S*$/.test(page)) errors.push(`Pages : « ${page} » doit commencer par / et ne pas contenir d'espace`);
    if (seen.has(page)) errors.push(`Pages : « ${page} » en double`);
    seen.add(page);
    if (!(INTENTIONS as readonly string[]).includes(intention)) errors.push(`Pages ${page} : intention « ${intention} » hors vocabulaire (${INTENTIONS.join(", ")})`);
    if (!motCle) errors.push(`Pages ${page} : mot-clé principal vide`);
    if (!(CADENCES as readonly string[]).includes(cadence)) errors.push(`Pages ${page} : cadence « ${cadence} » hors vocabulaire (${CADENCES.join(", ")})`);
    if (!DATE.test(signaux)) errors.push(`Pages ${page} : Signaux sans date AAAA-MM-JJ`);
    pages.push({ page, intention: intention as Intention, motCle, secondaires: secondaires.split(",").map((s) => s.trim()).filter(Boolean), cadence: cadence as Cadence, signaux });
  }

  const e = sec("Entité");
  const nom = field(e, "Nom") ?? "";
  if (!nom) errors.push("Entité : « Nom : » manquant");
  const sameAs = e.map((l) => l.match(/^\s*-\s*(https?:\/\/\S+)\s*$/)?.[1]).filter((u): u is string => Boolean(u));
  const napLine = field(e, "NAP");
  const adresse = field(e, "Adresse");
  const telephone = field(e, "Téléphone");
  let nap: Nap | null = null;
  if (adresse && telephone) nap = { adresse, telephone };
  else if (napLine !== "non") errors.push("Entité : « NAP : non », ou « Adresse : » et « Téléphone : »");

  const cf = sec("Cadence de fraîcheur");
  const ix = field(cf, "IndexNow");
  let indexnow: string | null = null;
  if (ix === null) errors.push("Cadence de fraîcheur : « IndexNow : <clé> » ou « IndexNow : non » manquant");
  else if (ix !== "non") { if (INDEXNOW_KEY.test(ix)) indexnow = ix; else errors.push("Cadence de fraîcheur : clé IndexNow mal formée (8 à 128 caractères, lettres, chiffres, tirets)"); }

  const inconnu = sec("Ce qu'on ne sait pas").join("\n").trim();
  if (!inconnu) errors.push("Ce qu'on ne sait pas : section vide");

  const strategy: Strategy = {
    site: title?.[1].trim() ?? "",
    date: meta?.[1] ?? "",
    statut: (meta?.[2] as Strategy["statut"]) ?? "brouillon",
    dataDir: meta?.[3] ?? "",
    identite,
    cibles: { audience: field(c, "Audience") ?? "", langue, pays, surfaces, pourquoi: field(c, "Pourquoi") ?? "" },
    concurrents,
    pages,
    entite: { nom, sameAs, nap },
    liensExternes: sec("Liens externes").join("\n").trim(),
    cadenceFraicheur: cf.join("\n").trim(),
    indexnow,
    inconnu,
  };
  return { strategy, errors };
}

export const lintStrategy = (md: string): string[] => analyseStrategy(md).errors;

export function parseStrategy(md: string): Strategy {
  const { strategy, errors } = analyseStrategy(md);
  if (errors.length) throw new StrategyError(errors);
  return strategy;
}
```

Note sur `normalizeText` : la plage `[\u0300-\u036f]` retire les diacritiques après `NFD`. L'écrire avec ces échappements, jamais avec les caractères combinants collés dans le source (vérifié le 28/08 : `bun -e` rend « Methode aout C.H.I.C.O. »).

- [ ] **Étape 5 : faire passer la suite entière par `bun test` à la racine**

Dans `package.json`, remplacer `"test": "bun test skills"` par `"test": "bun test"`.

Run : `bun test lib/tests/strategy.test.ts` puis `bun test`
Attendu : 33 pass sur le premier fichier ; suite entière verte (84 + 33).

- [ ] **Étape 6 : commit**

```bash
git add lib package.json
git commit -m "feat(strategy): contrat de strategy.md, parseur, lint et règle des mots partagés dans lib/"
```

---

### Tâche 2 : `lint-strategy.ts` et le gabarit conforme

**Files:**
- Create: `plugin/skills/strategy/scripts/lint-strategy.ts`
- Create: `plugin/skills/strategy/references/strategy-template.md`
- Create: `plugin/skills/strategy/scripts/tests/lint-strategy.test.ts`

**Interfaces:**
- Consumes: `lintStrategy` (tâche 1).
- Produces: CLI `bun lint-strategy.ts <strategy.md>` (0 conforme, 1 avec une ligne `ERREUR  …` par défaut, 2 usage) ; un gabarit qui passe lui-même le lint.

- [ ] **Étape 1 : écrire le test qui échoue**

```ts
import { describe, test, expect } from "bun:test";
import { lintStrategy } from "../../../../lib/strategy";

const template = await Bun.file(`${import.meta.dir}/../../references/strategy-template.md`).text();

describe("strategy-template.md", () => {
  test("le gabarit est lui-même conforme au lint", () => {
    expect(lintStrategy(template)).toEqual([]);
  });
  test("le gabarit porte les huit sections et les six colonnes", () => {
    for (const s of ["## Identité", "## Cibles", "## Concurrents", "## Pages ↔ mots-clés", "## Entité", "## Liens externes", "## Cadence de fraîcheur", "## Ce qu'on ne sait pas"]) expect(template).toContain(s);
    expect(template).toContain("| Page | Intention | Mot-clé principal | Secondaires | Cadence | Signaux |");
  });
});

describe("lint-strategy CLI", () => {
  const run = (path: string) => Bun.spawnSync(["bun", `${import.meta.dir}/../lint-strategy.ts`, path]);
  test("sort 0 sur le gabarit", () => {
    expect(run(`${import.meta.dir}/../../references/strategy-template.md`).exitCode).toBe(0);
  });
  test("sort 1 et nomme le défaut sur un fichier fautif", async () => {
    const bad = `${import.meta.dir}/bad-strategy.tmp.md`;
    await Bun.write(bad, template.replace("IndexNow : non", "IndexNow : abc"));
    const r = run(bad);
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString()).toContain("clé IndexNow mal formée");
  });
  test("sort 2 sans argument", () => {
    expect(Bun.spawnSync(["bun", `${import.meta.dir}/../lint-strategy.ts`]).exitCode).toBe(2);
  });
});
```

Run : `bun test skills/strategy` → échec (fichiers absents).

- [ ] **Étape 2 : écrire le gabarit `references/strategy-template.md`**

Le gabarit est un exemple complet et conforme ; Claude remplace les valeurs, jamais la structure. Les explications sont dans `SKILL.md` (tâche 4), pas dans le gabarit.

```markdown
# Stratégie SEO/GEO : exemple.fr
2026-01-01 · Statut : brouillon · Données : seo/strategy/2026-01-01/

## Identité
Exemple est un cabinet de conseil qui aide les PME de Nantes à vendre en ligne.

## Cibles
Audience : dirigeants de PME, Loire-Atlantique
Langue : fr
Pays : FR
Surfaces IA : AI Overviews, Copilot
Pourquoi : les dirigeants cherchent sur Google et posent leurs questions dans Copilot au bureau.

## Concurrents
Aucun concurrent identifié.

## Pages ↔ mots-clés
| Page | Intention | Mot-clé principal | Secondaires | Cadence | Signaux |
|---|---|---|---|---|---|
| / | navigationnelle | exemple conseil nantes | cabinet conseil pme | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-01-01) ; autocomplétion : non relevée |
| /vente-en-ligne | transactionnelle | vendre en ligne pme | boutique en ligne pme, site e-commerce pme | 4 semaines | Bing FR : 12 / semaine, 310 sur 25 semaines (2026-01-01) ; autocomplétion : « vendre en ligne pme sans site » (relevé manuel 2026-01-01) |

## Entité
Nom : Exemple Conseil
sameAs :
- https://www.linkedin.com/company/exemple-conseil
NAP : non

## Liens externes
- Annuaires : CCI Nantes, Pages Jaunes
- Avis : Google Business Profile
- Partenaires, presse, podcasts : à identifier
Pas d'achat de liens.

## Cadence de fraîcheur
Evergreen : trimestriel. Transactionnel et comparatifs : 2 à 4 semaines.
Double signal obligatoire : date visible, dateModified en JSON-LD, en-tête Last-Modified.
IndexNow : non

## Ce qu'on ne sait pas
Volumes de recherche : Bing France interrogé le 2026-01-01 sur les mots-clés du tableau ; seuls ceux qui portent un chiffre atteignent le seuil de publication de Bing. Google ne publie pas de volume sans compte publicitaire : la demande Google est inconnue. La présence est attestée par l'autocomplétion relevée à la main.
```

- [ ] **Étape 3 : écrire `scripts/lint-strategy.ts`**

```ts
#!/usr/bin/env bun
import { lintStrategy } from "../../../lib/strategy";

if (import.meta.main) {
  const path = Bun.argv[2];
  if (!path) { console.error("usage : bun lint-strategy.ts <strategy.md>"); process.exit(2); }
  const errors = lintStrategy(await Bun.file(path).text());
  if (errors.length) { console.log(errors.map((e) => `ERREUR  ${e}`).join("\n")); process.exit(1); }
  console.log("stratégie conforme");
}
```

- [ ] **Étape 4 : vérifier**

Run : `bun test skills/strategy`
Attendu : 5 pass. Puis `trash skills/strategy/scripts/tests/bad-strategy.tmp.md` si le fichier temporaire est resté, et ajouter `*.tmp.md` à `plugin/.gitignore`.

- [ ] **Étape 5 : commit**

```bash
git add skills/strategy .gitignore
git commit -m "feat(strategy): lint-strategy.ts et gabarit de strategy.md conforme, testé"
```

---

### Tâche 3 : `keywords.ts`, Bing et Wikimedia

**Files:**
- Create: `plugin/skills/strategy/scripts/lib/keywords.ts`
- Create: `plugin/skills/strategy/scripts/keywords.ts`
- Create: `plugin/skills/strategy/scripts/tests/keywords.test.ts`
- Create: `plugin/skills/strategy/scripts/tests/fixtures/` (copies de `docs/recherches/echantillons/bing-keywordstats-seo-fr.json`, `bing-keywordstats-plombier_nantes-fr.json`, `wikimedia-pageviews-seo-fr-30j.json`)

**Interfaces:**
- Produces: `runKeywords(o: KeywordsOptions): Promise<{ out: string; entries: KeywordEntry[] }>` avec `KeywordsOptions = { keywords: string[]; wiki?: Record<string, string>; country?: string; language?: string; key: string | null; out?: string; fetcher?: Fetcher; now?: () => Date; delayMs?: number; contact?: string | null }` et `Fetcher = (url: string, headers?: Record<string, string>) => Promise<{ status: number; text: string }>` ; types `KeywordEntry`, `BingSummary`, `WikiSummary`, `KeywordStatut` ; fonctions pures `parseBingStats`, `bingSummary`, `parseWikimediaMonthly`, `wikiSummary`, `entryFor`, `assertNoSecret`, `keywordSlug`, `wikimediaRange` ; constante `BING_API_BASE`.
- Sorties disque : `<out>/raw/bing-keywordstats-<slug>.json`, `<out>/raw/wikimedia-<article>.json`, `<out>/derived/keywords.json`, `<out>/manifest.json`.

Conventions externes, échantillons capturés (spec 5.3 et recherche du 27/08, sondes réelles) :
- Bing : `GET https://ssl.bing.com/webmaster/api.svc/json/GetKeywordStats?q=<mot-clé>&country=fr&language=fr-FR&apikey=<clé>` → `{"d":[{"__type":"KeywordStats:#Microsoft.Bing.Webmaster.Api","BroadImpressions":651,"Date":"\/Date(1772265600000)\/","Impressions":242,"Query":"seo"},…]}` ; vide `{"d":[]}` ; clé refusée `HTTP 400 {"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}`.
- Wikimedia : `GET https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/<Titre>/monthly/<AAAAMMJJ>/<AAAAMMJJ>` → `{"items":[{"project":"fr.wikipedia","article":"…","granularity":"monthly","timestamp":"2026070100","access":"all-access","agent":"user","views":2591},…]}`. User-Agent identifié exigé.

- [ ] **Étape 1 : copier les fixtures**

```bash
mkdir -p skills/strategy/scripts/tests/fixtures
cp ../docs/recherches/echantillons/bing-keywordstats-seo-fr.json ../docs/recherches/echantillons/bing-keywordstats-plombier_nantes-fr.json ../docs/recherches/echantillons/wikimedia-pageviews-seo-fr-30j.json skills/strategy/scripts/tests/fixtures/
```

- [ ] **Étape 2 : écrire le test qui échoue**

```ts
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
const KEY = "0123456789abcdef0123456789abcdef";

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
```

Run : `bun test skills/strategy/scripts/tests/keywords.test.ts` → échec (modules absents).

- [ ] **Étape 3 : écrire `scripts/lib/keywords.ts` (pur, exécuté le 28/08)**

```ts
// Parties pures de keywords.ts : parseurs Bing et Wikimedia, entrées dérivées, garde anti-fuite de clé.

export type BingPoint = { date: string; impressions: number; broadImpressions: number };
export type BingSummary = { fetchedAt: string; weeks: number; total: number; last: number; points: BingPoint[] };
export type WikiSummary = { article: string; fetchedAt: string; monthly: { month: string; views: number }[]; average: number };
export type KeywordStatut = "mesuré" | "non mesurable gratuitement" | "non interrogé (clé absente)" | `erreur : ${string}`;
export type KeywordEntry = { keyword: string; statut: KeywordStatut; bing: BingSummary | null; wikipedia: WikiSummary | null };

/** Échantillon réel du 2026-08-27 (tests/fixtures/bing-keywordstats-seo-fr.json) :
 * {"d":[{"__type":"KeywordStats:#Microsoft.Bing.Webmaster.Api","BroadImpressions":651,"Date":"\/Date(1772265600000)\/","Impressions":242,"Query":"seo"}, …]}
 * Réponse vide : {"d":[]}. La date est un epoch en millisecondes dans « /Date(…)/ ». */
export function parseBingStats(json: unknown): BingPoint[] {
  const d = (json as { d?: unknown })?.d;
  if (!Array.isArray(d)) throw new Error("réponse Bing sans tableau d");
  return d.map((row: Record<string, unknown>) => {
    const ms = String(row.Date ?? "").match(/\/Date\((\d+)\)\//);
    if (!ms) throw new Error(`date Bing illisible : ${String(row.Date)}`);
    return { date: new Date(Number(ms[1])).toISOString().slice(0, 10), impressions: Number(row.Impressions ?? 0), broadImpressions: Number(row.BroadImpressions ?? 0) };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function bingSummary(points: BingPoint[], fetchedAt: string): BingSummary | null {
  if (points.length === 0) return null;
  return { fetchedAt, weeks: points.length, total: points.reduce((n, p) => n + p.impressions, 0), last: points[points.length - 1].impressions, points };
}

/** Échantillon réel (tests/fixtures/wikimedia-pageviews-seo-fr-30j.json), granularité daily ; en monthly le timestamp
 * vaut « 2026070100 » pour juillet 2026. {"items":[{"project":"fr.wikipedia","article":"…","granularity":"daily","timestamp":"2026072700","access":"all-access","agent":"user","views":62}, …]} */
export function parseWikimediaMonthly(json: unknown): { month: string; views: number }[] {
  const items = (json as { items?: unknown })?.items;
  if (!Array.isArray(items)) throw new Error("réponse Wikimedia sans tableau items");
  return items.map((it: Record<string, unknown>) => {
    const ts = String(it.timestamp ?? "");
    if (!/^\d{10}$/.test(ts)) throw new Error(`timestamp Wikimedia illisible : ${ts}`);
    return { month: `${ts.slice(0, 4)}-${ts.slice(4, 6)}`, views: Number(it.views ?? 0) };
  });
}

export function wikiSummary(article: string, monthly: { month: string; views: number }[], fetchedAt: string): WikiSummary {
  const average = monthly.length ? Math.round(monthly.reduce((n, m) => n + m.views, 0) / monthly.length) : 0;
  return { article, fetchedAt, monthly, average };
}

export function entryFor(keyword: string, bing: BingSummary | null, keyPresent: boolean, error: string | null, wikipedia: WikiSummary | null): KeywordEntry {
  const statut: KeywordStatut = error ? `erreur : ${error}` : !keyPresent ? "non interrogé (clé absente)" : bing ? "mesuré" : "non mesurable gratuitement";
  return { keyword, statut, bing, wikipedia };
}

/** Invariant de sécurité : rien de ce qui contient la clé ne s'écrit sur disque. */
export function assertNoSecret(content: string, secret: string | null): void {
  if (secret && secret.length >= 8 && content.includes(secret)) throw new Error("refus d'écrire : le contenu contient la clé API");
}

/** Nom de fichier d'un mot-clé : « plombier nantes » → plombier_nantes, comme les échantillons du 27/08. */
export function keywordSlug(keyword: string): string {
  return keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "mot_cle";
}

/** Bornes mensuelles pour Wikimedia : 12 mois pleins avant le mois courant, au format AAAAMMJJ. */
export function wikimediaRange(today: Date): { start: string; end: string } {
  const y = today.getUTCFullYear(), m = today.getUTCMonth();
  const start = new Date(Date.UTC(y, m - 12, 1)), end = new Date(Date.UTC(y, m, 1));
  const f = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return { start: f(start), end: f(end) };
}
```

- [ ] **Étape 4 : écrire `scripts/keywords.ts` (câblage : contrat ci-dessus, le test fait foi)**

```ts
#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { assertNoSecret, bingSummary, entryFor, keywordSlug, parseBingStats, parseWikimediaMonthly, wikiSummary, wikimediaRange, type KeywordEntry, type WikiSummary } from "./lib/keywords";

export const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const WIKIMEDIA_BASE = "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user";
const UA = "erom-seo-strategy/0.1 (+https://github.com/eRom/erom-agence-seo)";

export type Fetcher = (url: string, headers?: Record<string, string>) => Promise<{ status: number; text: string }>;
export type KeywordsOptions = {
  keywords: string[]; wiki?: Record<string, string>; country?: string; language?: string; key: string | null;
  out?: string; fetcher?: Fetcher; now?: () => Date; delayMs?: number; contact?: string | null;
};

const defaultFetcher: Fetcher = async (url, headers = {}) => {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  return { status: res.status, text: await res.text() };
};

/** Réserve seo/strategy/<date>/ (ou -2, -3…) sous le répertoire courant, même mécanique atomique que collect.ts. */
async function reserveOutDir(date: string): Promise<string> {
  const parent = "seo/strategy";
  await mkdir(parent, { recursive: true });
  const base = `${parent}/${date}`;
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    try { await mkdir(candidate); return candidate; } catch (e) { if ((e as NodeJS.ErrnoException).code === "EEXIST") continue; throw e; }
  }
}

export async function runKeywords(o: KeywordsOptions): Promise<{ out: string; entries: KeywordEntry[] }> {
  const now = o.now ?? (() => new Date());
  const fetcher = o.fetcher ?? defaultFetcher;
  const country = (o.country ?? "FR").toLowerCase();
  const language = o.language ?? "fr-FR";
  const delay = o.delayMs ?? 500;
  const key = o.key;
  const out = o.out ?? (await reserveOutDir(now().toISOString().slice(0, 10)));
  await mkdir(join(out, "raw"), { recursive: true });
  await mkdir(join(out, "derived"), { recursive: true });
  const files: string[] = [];
  const warnings: string[] = [];
  const write = async (rel: string, content: string) => { assertNoSecret(content, key); await Bun.write(join(out, rel), content); files.push(rel); };

  const entries: KeywordEntry[] = [];
  for (const keyword of o.keywords) {
    const fetchedAt = now().toISOString();
    let bing = null, error: string | null = null;
    if (key) {
      const q = new URLSearchParams({ q: keyword, country, language, apikey: key });
      const r = await fetcher(`${BING_API_BASE}/GetKeywordStats?${q}`);
      if (r.status === 400 && /InvalidApiKey/.test(r.text)) throw new Error("clé refusée par Bing (InvalidApiKey) : régénérer la clé dans Bing Webmaster Tools, Settings, API Access");
      if (r.status !== 200) error = `HTTP ${r.status}`;
      else {
        await write(`raw/bing-keywordstats-${keywordSlug(keyword)}.json`, r.text);
        try { bing = bingSummary(parseBingStats(JSON.parse(r.text)), fetchedAt); } catch (e) { error = e instanceof Error ? e.message : String(e); }
      }
      if (delay > 0) await Bun.sleep(delay);
    }
    let wikipedia: WikiSummary | null = null;
    const article = o.wiki?.[keyword];
    if (article) {
      const { start, end } = wikimediaRange(now());
      const ua = o.contact ? `${UA} (contact: ${o.contact})` : UA;
      const r = await fetcher(`${WIKIMEDIA_BASE}/${encodeURIComponent(article)}/monthly/${start}/${end}`, { "user-agent": ua, accept: "application/json" });
      if (r.status === 200) {
        await write(`raw/wikimedia-${article}.json`, r.text);
        try { wikipedia = wikiSummary(article, parseWikimediaMonthly(JSON.parse(r.text)), fetchedAt); } catch (e) { warnings.push(`${keyword} : Wikimedia illisible, ${e instanceof Error ? e.message : String(e)}`); }
      } else warnings.push(`${keyword} : Wikimedia HTTP ${r.status} sur ${article}`);
    }
    entries.push(entryFor(keyword, bing, Boolean(key), error, wikipedia));
  }
  await write("derived/keywords.json", JSON.stringify(entries, null, 2));
  await write("manifest.json", JSON.stringify({ date: now().toISOString(), country, language, bingKeyPresent: Boolean(key), endpoint: BING_API_BASE, files, warnings }, null, 2));
  return { out, entries };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const wiki: Record<string, string> = {};
  args.forEach((a, i) => { if (a === "--wiki" && args[i + 1]) { const [k, v] = args[i + 1].split("="); if (k && v) wiki[k] = v; } });
  const skip = new Set(["--out", "--country", "--language", "--wiki"]);
  const keywords = args.filter((a, i) => !a.startsWith("--") && !skip.has(args[i - 1] ?? ""));
  if (keywords.length === 0) { console.error('usage : bun keywords.ts [--out <dossier>] [--country FR] [--language fr-FR] [--wiki "<mot-clé>=<Titre_article>"]... <mot-clé>...'); process.exit(2); }
  const key = process.env.BING_WMT_API_KEY ?? null;
  if (!key) console.error("BING_WMT_API_KEY absente : Bing non interrogé, les mots-clés seront « non interrogé (clé absente) »");
  try {
    const r = await runKeywords({ keywords, wiki, country: opt("--country"), language: opt("--language"), key, out: opt("--out"), contact: process.env.EROM_SEO_CONTACT ?? null });
    console.log(`dossier : ${r.out}`);
    for (const e of r.entries) console.log(`${e.keyword} : ${e.statut}${e.bing ? `, Bing ${e.bing.last} / semaine, ${e.bing.total} sur ${e.bing.weeks} semaines` : ""}${e.wikipedia ? `, Wikipédia ${e.wikipedia.average} vues / mois` : ""}`);
  } catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exit(2); }
}
```

- [ ] **Étape 5 : vérifier**

Run : `bun test skills/strategy/scripts/tests/keywords.test.ts` puis `bun test`
Attendu : tout vert. Vérifier à la main que `raw/bing-keywordstats-seo.json` d'un dossier de test ne contient pas `apikey`.

- [ ] **Étape 6 : commit**

```bash
git add skills/strategy
git commit -m "feat(strategy): keywords.ts, volumes Bing et intérêt Wikipédia, clé jamais écrite sur disque"
```

---

### Tâche 4 : `SKILL.md` du verbe `strategy`

**Files:**
- Create: `plugin/skills/strategy/SKILL.md`
- Modify: `plugin/README.md` (section « Écrire la stratégie » après « Auditer un site »)

**Interfaces:**
- Consumes: `lint-strategy.ts`, `keywords.ts` (tâches 2, 3), `collect.ts --no-psi --out` (tâche 6, la skill peut être écrite avant et testée après).

- [ ] **Étape 1 : écrire `SKILL.md`**

```markdown
---
name: strategy
description: Interview SEO/GEO qui produit seo/strategy.md, le contrat d'un site : identité, cibles, concurrents, pages et mots-clés mesurés (Bing, Wikipédia), entité, liens, cadence de fraîcheur. Une question à la fois, chiffres datés et sourcés, jamais un volume inventé. Triggers : '/erom-seo:strategy', 'écris la stratégie SEO de', 'stratégie de mots-clés pour', 'quelles pages viser pour'.
argument-hint: "[<url du site>]"
---

# Stratégie SEO/GEO

Tu produis `seo/strategy.md`, un contrat lisible par le client et lu par des scripts. Tu proposes, Romain corrige. Une question par message. Aucun chiffre sans date ni source ; un vide chez Bing s'écrit « non mesurable gratuitement », jamais un chiffre inventé, jamais un chiffre Google (D11).

## 0. Préparer

1. Répertoire courant : le dossier du site (`clients/<domaine>/` ou le repo du site). Créer `seo/` s'il manque.
2. Lire avant toute question, s'ils existent : le dernier `seo/audits/*/derived/pages.json` (titres, h1, descriptions, slugs) et `raw/pages/index.html` (liens du pied de page vers x.com, linkedin.com, facebook.com, instagram.com, youtube.com, tipeee.com, linktr.ee, github.com, wikidata.org, annuaires, plateformes d'avis) ; `seo/strategy.md` (mode mise à jour : résumer ce qu'il contient et demander ce qui change ; si `lint-strategy.ts` le refuse, proposer de le corriger d'abord).
3. Clé Bing : `BING_WMT_API_KEY` doit être dans l'environnement (`source ~/.zshenv` avant de lancer Claude). Absente : le dire une fois, continuer ; les signaux seront « Bing non interrogé (clé absente) ».
4. Scripts : `${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/`. Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
5. Le dossier de données `seo/strategy/<date>/` est réservé par `keywords.ts` à sa première exécution (étape 5) ; lire sa première ligne `dossier : …` et reprendre ce chemin dans l'en-tête du fichier (`Données : seo/strategy/<date>/`).

## 1. L'interview, neuf étapes

1. **Identité.** Proposer la phrase « <Site> est <catégorie> qui <différenciateur>. » à partir du title et de la description de la home, ou de ce que Romain dit. Une phrase, elle nourrira le H1 de la home et Organization.description.
2. **Cibles.** Audience, langue (défaut fr), pays (défaut FR). Surfaces IA proposées selon l'audience : B2B → Copilot, LinkedIn ; développeurs → Claude, Brave ; grand public → AI Overviews, ChatGPT, YouTube. Le « Pourquoi » en une phrase.
3. **Concurrents.** Zéro à quatre URLs. Pour chacune : `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/collect.ts <url> --max-pages 10 --no-psi --out seo/strategy/<date>/raw/concurrents/<domaine>` (si `keywords.ts` n'a pas encore réservé le dossier, le réserver maintenant avec `mkdir -p seo/strategy/<date>` et passer `--out seo/strategy/<date>` à `keywords.ts` à l'étape 5). Résumer ce que chacun vise depuis `derived/pages.json` (titres, h1, slugs) ; Romain dit ce qu'on prend et ce qu'on évite. Aucun concurrent : la ligne « Aucun concurrent identifié. ».
4. **Pages et mots-clés.** Liste des pages : le sitemap du dernier audit (site existant) ou Romain (site à construire). Pour chaque page, proposer intention (informationnelle, transactionnelle, navigationnelle, locale), mot-clé principal, secondaires, à partir des titres, des concurrents et des mots de Romain. Présenter le tableau entier, Romain amende.
5. **Mesure.** `source ~/.zshenv && bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/keywords.ts [--out seo/strategy/<date>] --country <PAYS> --language <langue-PAYS> [--wiki "<mot-clé>=<Titre_article>"]... <tous les mots-clés, principaux et secondaires>`. Pour les sujets informationnels qui ont un article Wikipédia en français, proposer le titre exact de l'article (`Optimisation_pour_les_moteurs_de_recherche`), Romain confirme. Montrer le tableau des statuts et des chiffres. Puis une question : relever l'autocomplétion Google des mots-clés principaux maintenant (Romain colle les suggestions, navigateur privé, localisé en France) ou plus tard.
6. **Entité.** Nom ; `sameAs` proposés depuis les liens de la home ; NAP seulement si une page a l'intention locale.
7. **Liens externes.** Liste libre : annuaires, avis, partenaires, presse, podcasts. Jamais d'achat de liens.
8. **Cadence.** Par page, proposée selon l'intention : transactionnelle et comparatifs → 4 semaines ; informationnelle et navigationnelle → trimestriel ; mentions légales → annuel. IndexNow : clé existante (Romain la colle), à générer (`bun -e "console.log(crypto.randomUUID().replace(/-/g, ''))"`, 32 caractères hexadécimaux, `build` la déposera), ou non.
9. **Écriture.** Copier `${CLAUDE_PLUGIN_ROOT}/skills/strategy/references/strategy-template.md`, remplacer les valeurs sans toucher à la structure, écrire `seo/strategy.md`. `bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/lint-strategy.ts seo/strategy.md` doit sortir 0 ; sinon corriger. Résumer en cinq lignes : identité, nombre de pages, mots-clés mesurés contre non mesurables, sameAs, cadence. Romain dit « validée » : passer `Statut : brouillon` à `Statut : validée`. Sinon le fichier reste en brouillon, ce qui n'empêche pas l'audit.

## 2. Ce que la cellule Signaux écrit

Dans l'ordre, chaque élément daté (AAAA-MM-JJ) :
- `Bing FR : <last> / semaine, <total> sur <weeks> semaines (<date>)`, ou `Bing FR : rien, non mesurable gratuitement (<date>)`, ou `Bing non interrogé (clé absente) (<date>)`, ou `Bing non interrogé (endpoint indisponible) (<date>)`.
- `Wikipédia fr : <average> vues / mois sur 12 mois (<date>)` si mesuré.
- `autocomplétion : « … », « … » (relevé manuel <date>)`, ou `autocomplétion : non relevée`.

Les chiffres viennent de `seo/strategy/<date>/derived/keywords.json`, jamais de mémoire. Le lint refuse une cellule sans date.

## 3. Règles d'écriture

Français, phrases courtes, aucun tiret cadratin. Le client lit ce fichier : pas de jargon sans explication. « Ce qu'on ne sait pas » dit noir sur blanc ce que le gratuit ne mesure pas. Ne jamais modifier `seo/strategy/<date>/raw/`.
```

- [ ] **Étape 2 : README**

Ajouter après la section « Auditer un site » :

```markdown
## Écrire la stratégie

Depuis le même dossier, une interview d'une question à la fois :

```
/erom-seo:strategy
```

Sortie : `seo/strategy.md` (le contrat, lisible par le client) et `seo/strategy/<date>/` (réponses brutes de Bing et de Wikipédia, `derived/keywords.json`). Clé Bing Webmaster Tools, gratuite : `export BING_WMT_API_KEY=...`. Sans elle, les mots-clés sont « non interrogé ».

Dès que `seo/strategy.md` existe, l'audit ajoute la couche stratégique (STRAT-01 à STRAT-04, AI-02), à tout niveau. Site lancé en local : `/erom-seo:audit http://localhost:3000` fait un audit de niveau 2.
```

- [ ] **Étape 3 : vérifier et commit**

```bash
grep -c "—" skills/strategy/SKILL.md README.md   # attendu : 0 partout
git add skills/strategy/SKILL.md README.md
git commit -m "docs(strategy): SKILL.md de l'interview et README"
```

---

### Tâche 5 : `page.ts` apprend Organization et l'ouverture

**Files:**
- Modify: `plugin/skills/audit/scripts/lib/page.ts`
- Modify: `plugin/skills/audit/scripts/lib/types.ts` (`PageFacts`)
- Modify: `plugin/skills/audit/scripts/tests/page.test.ts`

**Interfaces:**
- Produces: `PageFacts.organization: OrganizationFacts | null` avec `OrganizationFacts = { name: string | null; description: string | null; sameAs: string[] }`, `PageFacts.opening: string` (400 premiers caractères de `<main>` sinon `<body>`), fonctions exportées `extractOrganization(blocks: unknown[]): OrganizationFacts | null`, `visibleText(el: HTMLElement | null): string`, `opening(html: string): string`, `bodyText(html: string): string`, `jsonLdBlocks(html: string): unknown[]`.

- [ ] **Étape 1 : écrire les tests qui échouent** (ajouter à `page.test.ts`)

```ts
import { bodyText, extractOrganization, jsonLdBlocks, opening } from "../lib/page";

const ORG_HTML = `<!DOCTYPE html><html lang="fr"><head><title>T</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"x"},{"@type":"Organization","name":"Acme","description":"Acme est un cabinet qui conseille les PME.","sameAs":["https://www.linkedin.com/company/acme","https://x.com/acme"]}]}</script>
<script type="application/ld+json">{pas du json</script>
</head><body><nav>Accueil Contact</nav><main><h1>Acme</h1><p>Acme est un cabinet qui conseille les PME. ${"Suite. ".repeat(100)}</p></main><script>x()</script><footer>Pied</footer></body></html>`;

describe("extractOrganization", () => {
  test("dans un @graph, avec sameAs tableau", () => {
    expect(extractOrganization(jsonLdBlocks(ORG_HTML))).toEqual({ name: "Acme", description: "Acme est un cabinet qui conseille les PME.", sameAs: ["https://www.linkedin.com/company/acme", "https://x.com/acme"] });
  });
  test("sous-type LocalBusiness, sameAs chaîne", () => {
    expect(extractOrganization([{ "@type": "LocalBusiness", name: "Plomb", sameAs: "https://x.com/plomb" }])).toEqual({ name: "Plomb", description: null, sameAs: ["https://x.com/plomb"] });
  });
  test("aucune organisation", () => {
    expect(extractOrganization([{ "@type": "Article" }])).toBeNull();
    expect(extractOrganization([])).toBeNull();
  });
});

describe("opening, bodyText et PageFacts", () => {
  test("opening lit <main> sans la navigation, 400 caractères", () => {
    const o = opening(ORG_HTML);
    expect(o.startsWith("Acme Acme est un cabinet")).toBe(true);
    expect(o).not.toContain("Accueil");
    expect(o.length).toBe(400);
  });
  test("opening se replie sur <body> sans <main>", () => {
    expect(opening("<html><body><p>Bonjour</p><script>x()</script></body></html>")).toBe("Bonjour");
  });
  test("bodyText contient la navigation et le pied, pas les scripts", () => {
    const t = bodyText(ORG_HTML);
    expect(t).toContain("Accueil Contact");
    expect(t).toContain("Pied");
    expect(t).not.toContain("x()");
  });
  test("extractPageFacts porte organization et opening", () => {
    const f = extractPageFacts(ORG_HTML, "https://acme.fr/", 200, {}, "index");
    expect(f.organization?.name).toBe("Acme");
    expect(f.opening.startsWith("Acme Acme est")).toBe(true);
  });
});
```

Run : `bun test skills/audit/scripts/tests/page.test.ts` → échec.

- [ ] **Étape 2 : implémenter (code exécuté le 28/08 hors `extractPageFacts`)**

Dans `types.ts`, ajouter avant `PageFacts` :

```ts
export type OrganizationFacts = { name: string | null; description: string | null; sameAs: string[] };
```

et dans `PageFacts`, après `jsonld: JsonLdBlock[];` :

```ts
  organization: OrganizationFacts | null;   // premier bloc Organization (ou sous-type), y compris dans un @graph
  opening: string;                          // 400 premiers caractères de <main>, sinon de <body>
```

Dans `page.ts`, ajouter (imports : `import type { JsonLdBlock, OrganizationFacts, PageFacts } from "./types";`) :

```ts
function findOrganization(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) { for (const n of node) { const r = findOrganization(n); if (r) return r; } return null; }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const types = ([] as unknown[]).concat(o["@type"] ?? []).filter((t): t is string => typeof t === "string");
    if (types.some((t) => t === "Organization" || t.endsWith("Organization") || t.endsWith("Business"))) return o;
    if (o["@graph"]) return findOrganization(o["@graph"]);
  }
  return null;
}

/** Premier bloc JSON-LD de type Organization (ou sous-type), y compris dans un @graph. */
export function extractOrganization(blocks: unknown[]): OrganizationFacts | null {
  for (const b of blocks) {
    const o = findOrganization(b);
    if (o) {
      const sameAs = ([] as unknown[]).concat(o.sameAs ?? []).filter((s): s is string => typeof s === "string");
      return { name: typeof o.name === "string" ? o.name : null, description: typeof o.description === "string" ? o.description : null, sameAs };
    }
  }
  return null;
}

/** Texte visible d'un élément : scripts, styles et gabarits retirés, un espace entre blocs (structuredText), espaces réduits. */
export function visibleText(el: HTMLElement | null): string {
  if (!el) return "";
  for (const x of el.querySelectorAll("script, style, noscript, template")) (x as HTMLElement).remove();
  return el.structuredText.replace(/\s+/g, " ").trim();
}

/** Les 400 premiers caractères de <main> s'il existe, sinon de <body>. */
export function opening(html: string): string {
  const doc = parse(html);
  const main = doc.querySelector("main");
  return visibleText(main ?? doc.querySelector("body")).slice(0, 400);
}

export function bodyText(html: string): string {
  return visibleText(parse(html).querySelector("body"));
}

export function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  for (const s of parse(html).querySelectorAll('script[type="application/ld+json"]')) { try { out.push(JSON.parse(s.text)); } catch { /* bloc invalide, déjà compté par SD-01 */ } }
  return out;
}
```

Dans `extractPageFacts`, garder les blocs analysés : déclarer `const parsedBlocks: unknown[] = [];` avant la boucle des scripts JSON-LD, et dans le `try`, après `const j = JSON.parse(s.text);`, ajouter `parsedBlocks.push(j);`. L'`opening` se calcule sur le HTML d'origine, avant que les scripts soient retirés du `doc` : ajouter `const openingText = opening(html);` juste après `const doc = parse(html);`. Dans l'objet rendu, ajouter `organization: extractOrganization(parsedBlocks),` après `jsonld,` et `opening: openingText,` après.

- [ ] **Étape 3 : vérifier et commit**

Run : `bun test` → vert (les tests existants de `page.test.ts` ne changent pas).

```bash
git add skills/audit/scripts/lib/page.ts skills/audit/scripts/lib/types.ts skills/audit/scripts/tests/page.test.ts
git commit -m "feat(audit): page.ts extrait Organization (name, description, sameAs) et l'ouverture de la page"
```

---

### Tâche 6 : `collect.ts`, niveau 2

**Files:**
- Modify: `plugin/skills/audit/scripts/collect.ts`
- Modify: `plugin/skills/audit/scripts/lib/sitemap.ts`
- Modify: `plugin/skills/audit/scripts/lib/types.ts` (`SitemapUrlStats.rewrittenFrom`)
- Modify: `plugin/skills/audit/scripts/tests/fixtures/site.ts` (option `prodHost`)
- Modify: `plugin/skills/audit/scripts/tests/sitemap.test.ts`, `collect.test.ts`

**Interfaces:**
- Produces: `detectLevel(url: string): 0 | 2` (exporté de `collect.ts`), `rewriteToOrigin(u: string, origin: string): string | null` (exporté de `lib/sitemap.ts`), option `rewriteTo?: string` de `collectSitemapUrls`, champ `SitemapUrlStats.rewrittenFrom?: string[]`, option `noPsi?: boolean` de `CollectOptions`, flag CLI `--no-psi`. Au niveau 2 : `manifest.psi = { attempted: false, ok: false, error: "non applicable en local" }`, `probes.httpToHttps` et `probes.hostVariant` en `status: 0, error: "non applicable en local"`, `derived/psi.json` avec la même erreur.

- [ ] **Étape 1 : tests qui échouent**

Dans `sitemap.test.ts` :

```ts
import { rewriteToOrigin } from "../lib/sitemap";

test("rewriteToOrigin garde chemin et requête, change schéma et hôte", () => {
  expect(rewriteToOrigin("https://commentchercherbonheur.org/methode?x=1", "http://localhost:3000")).toBe("http://localhost:3000/methode?x=1");
  expect(rewriteToOrigin("https://commentchercherbonheur.org", "http://localhost:3000")).toBe("http://localhost:3000/");
  expect(rewriteToOrigin("http://", "http://localhost:3000")).toBeNull();
});

test("rewriteTo : les locs d'un autre hôte sont ramenées sur l'origine et l'hôte d'origine est consigné", async () => {
  const f = fakeFetcher({ "http://localhost:3000/sitemap.xml": { status: 200, body: urlset("https://acme.fr/a", "https://acme.fr/b") } });
  const r = await collectSitemapUrls(["http://localhost:3000/sitemap.xml"], f, { maxUrls: 10, origin: "http://localhost:3000", rewriteTo: "http://localhost:3000" });
  expect(r.urls).toEqual(["http://localhost:3000/a", "http://localhost:3000/b"]);
  expect(r.stats).toEqual({ listed: 2, kept: 2, skipped: [], rewrittenFrom: ["acme.fr"] });
});
```

Dans `fixtures/site.ts`, étendre les options : `opts: { homeInSitemap?: boolean; prodHost?: string } = {}` et, dans `/sitemap-pages.xml`, construire les locs sur `const base = opts.prodHost ? \`https://${opts.prodHost}\` : origin;` au lieu de `origin` (la loc hors site `https://autre.fr/hors-site` reste). Le sitemap index `/sitemap.xml` continue de pointer sur `${origin}/sitemap-pages.xml`.

Dans `collect.test.ts` :

```ts
import { detectLevel, runCollect, wantedPages } from "../collect";

test("detectLevel", () => {
  expect(detectLevel("http://localhost:3000")).toBe(2);
  expect(detectLevel("http://127.0.0.1:8787/")).toBe(2);
  expect(detectLevel("https://www.commentchercherbonheur.org/")).toBe(0);
  expect(detectLevel("https://localhost.evil.com/")).toBe(0);
});

describe("niveau 2", () => {
  test("sur localhost : niveau 2 détecté, sitemap de prod ramené en local, PageSpeed et sondes d'hôte non applicables", async () => {
    const s = startFixtureSite(0, { prodHost: "acme.fr" });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 10, delayMs: 0, psiKey: "cle-factice" });
      expect(m.level).toBe(2);
      expect(m.pages.map((p) => p.final)).toEqual([`http://localhost:${s.port}/`, `http://localhost:${s.port}/a`, `http://localhost:${s.port}/b`, `http://localhost:${s.port}/c`]);
      expect(m.sitemapUrls.rewrittenFrom).toEqual(["acme.fr"]);
      expect(m.sitemapUrls.skipped).toEqual([{ host: "autre.fr", count: 1 }]);
      expect(m.psi).toEqual({ attempted: false, ok: false, error: "non applicable en local" });
      expect(m.probes.httpToHttps).toMatchObject({ status: 0, error: "non applicable en local" });
      expect(m.probes.hostVariant).toMatchObject({ status: 0, error: "non applicable en local" });
      expect(m.probes.notFound.status).toBe(200);
      expect(JSON.parse(await Bun.file(join(o, "derived/psi.json")).text()).error).toBe("non applicable en local");
    } finally { s.stop(true); }
  });
  test("niveau 0 forcé sur le même site : rien n'est réécrit, les locs de prod sont écartées et comptées", async () => {
    const s = startFixtureSite(0, { prodHost: "acme.fr" });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 10, delayMs: 0, psiKey: null, level: 0 });
      expect(m.level).toBe(0);
      expect(m.pages).toHaveLength(1);
      expect(m.sitemapUrls.rewrittenFrom).toBeUndefined();
      expect(m.sitemapUrls.skipped).toEqual([{ host: "acme.fr", count: 3 }, { host: "autre.fr", count: 1 }]);
    } finally { s.stop(true); }
  });
  test("--no-psi : PageSpeed non tenté même avec une clé", async () => {
    const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const m = await runCollect({ url: base, out: o, maxPages: 2, delayMs: 0, psiKey: "cle-factice", noPsi: true, level: 0 });
    expect(m.psi).toEqual({ attempted: false, ok: false, error: "PageSpeed non demandé (--no-psi)" });
  });
});
```

Attention : le `beforeAll` existant lance `runCollect` sur `http://localhost:<port>` sans `level` ; avec la détection automatique il passerait au niveau 2 et casserait `manifest.level toBe(0)` et la sonde `hostVariant`. Ajouter `level: 0` à cet appel du `beforeAll` (le site jouet est un site « en ligne » simulé).

Run : `bun test skills/audit` → échecs attendus.

- [ ] **Étape 2 : `lib/sitemap.ts`**

Ajouter après `sameSite` :

```ts
/** Même chemin et même requête, mais sur l'origine donnée. Rend null si l'URL est inanalysable. */
export function rewriteToOrigin(u: string, origin: string): string | null {
  try {
    const p = new URL(u);
    const o = new URL(origin);
    p.protocol = o.protocol;
    p.host = o.host;
    return p.toString();
  } catch { return null; }
}
```

Dans `collectSitemapUrls` : option `rewriteTo?: string` dans `opts`. Ajouter une fonction locale avant `take` :

```ts
  const rewrite = (u: string): string => {
    if (!opts.rewriteTo) return u;
    const r = rewriteToOrigin(u, opts.rewriteTo);
    if (r === null || r === u) return u;
    let host: string;
    try { host = new URL(u).host.toLowerCase(); } catch { return u; }
    if (host !== new URL(opts.rewriteTo).host.toLowerCase()) { stats.rewrittenFrom ??= []; if (!stats.rewrittenFrom.includes(host)) stats.rewrittenFrom.push(host); }
    return r;
  };
```

Dans `take`, la première ligne de la boucle devient `const loc = rewrite(u);` et les usages suivants de `u` (sameSite, pageKey, `urls.push`) portent sur `loc` (`skip(u)` garde l'URL d'origine). Dans la branche `index`, lire `read(rewrite(child))`. Type : dans `types.ts`, `SitemapUrlStats` gagne `rewrittenFrom?: string[];`.

- [ ] **Étape 3 : `collect.ts`**

Ajouter `noPsi?: boolean;` à `CollectOptions`. Exporter :

```ts
/** Niveau 2 si l'hôte est local. `--level` reste disponible pour forcer. */
export function detectLevel(url: string): 0 | 2 {
  const h = new URL(url).hostname;
  return h === "localhost" || h === "127.0.0.1" ? 2 : 0;
}
```

Remplacer `const level = o.level ?? 0;` par `const level = o.level ?? detectLevel(o.url);`.

Sitemaps déclarés et collecte, étape 2 : `const declaredLocal = level === 2 ? declared.map((d) => rewriteToOrigin(d, origin) ?? d) : declared;` puis `collectSitemapUrls(sitemapCandidates(declaredLocal, origin), (u) => fetchChain(u), { maxUrls: maxPages, origin, rewriteTo: level === 2 ? origin : undefined })` (importer `rewriteToOrigin`).

Sondes, étape 6 : ajouter avant `const probes` :

```ts
  const notApplicable = (url: string): FetchRecord => ({ requested: url, final: url, status: 0, chain: [], bytes: 0, fetchedAt: new Date().toISOString(), error: "non applicable en local", ms: 0 });
  const altUrl = `${site.protocol}//${altHost}${altPort}/`;
```

et les deux premières sondes deviennent `httpToHttps: level === 2 ? notApplicable(httpUrl) : toRecord(await fetchChain(httpUrl)),` et `hostVariant: level === 2 ? notApplicable(altUrl) : toRecord(await fetchChain(altUrl)),`.

PageSpeed, étape 7 : remplacer le bloc par

```ts
  let psi: Manifest["psi"] = { attempted: false, ok: false, error: "PSI_API_KEY absent : PERF-01 non exécutable" };
  if (level === 2) psi = { attempted: false, ok: false, error: "non applicable en local" };
  else if (o.noPsi) psi = { attempted: false, ok: false, error: "PageSpeed non demandé (--no-psi)" };
  if (level !== 2 && !o.noPsi && o.psiKey) {
    const p = await fetchPsi(`${origin}/`, o.psiKey, "MOBILE");
    await Bun.write(join(derived, "psi.json"), JSON.stringify(p, null, 2));
    psi = { attempted: true, ok: p.ok, error: p.error };
  } else {
    await Bun.write(join(derived, "psi.json"), JSON.stringify({ ok: false, strategy: "MOBILE", error: psi.error }, null, 2));
  }
```

Trois cas et pas un de plus : local, `--no-psi`, ou clé absente, tous « non tenté » avec leur raison ; sinon un appel.

CLI : `usage : bun collect.ts <url> [--out <dossier>] [--max-pages 10] [--page <url>]... [--level 0|2] [--no-psi]` ; `level: args.includes("--level") ? (Number(opt("--level")) === 2 ? 2 : 0) : undefined` ; `noPsi: args.includes("--no-psi")`. Après la ligne `collecte terminée`, si `m.level === 2 && m.sitemapUrls.rewrittenFrom?.length` : `console.error(\`info : sitemap sur l'hôte de production ${m.sitemapUrls.rewrittenFrom.join(", ")}, URLs ramenées sur ${m.site}\`)`.

- [ ] **Étape 4 : vérifier et commit**

Run : `bun test` → vert.

```bash
git add skills/audit
git commit -m "feat(audit): niveau 2 sur localhost, sitemap de prod ramené en local, PageSpeed et sondes d'hôte non applicables, --no-psi"
```

---

### Tâche 7 : `collect.ts` lit la stratégie

**Files:**
- Modify: `plugin/skills/audit/scripts/collect.ts`
- Modify: `plugin/skills/audit/scripts/lib/types.ts` (`StrategyRef`, `Manifest.strategy`, `Manifest.indexnow`)
- Modify: `plugin/skills/audit/scripts/tests/fixtures/site.ts` (option `indexnowKey`)
- Modify: `plugin/skills/audit/scripts/tests/collect.test.ts`

**Interfaces:**
- Consumes: `parseStrategy`, `StrategyError` (tâche 1, import `../../../lib/strategy`).
- Produces: `CollectOptions.strategyPath?: string | null` (défaut `"seo/strategy.md"` relatif au répertoire courant ; `null` = ne pas lire), `Manifest.strategy: StrategyRef | null` avec `StrategyRef = { path: string; date?: string; statut?: string; pages?: number; error?: string }`, `Manifest.indexnow: FetchRecord | null`, fichier `raw/indexnow.txt` quand la clé répond 200. Les pages prévues sont collectées avant celles du sitemap ; `maxPages` devient `max(maxPages, 1 + pages prévues)`.

- [ ] **Étape 1 : tests qui échouent**

Fixture : `opts.indexnowKey?: string` ; dans le `switch`, avant `default`, si `opts.indexnowKey && u.pathname === \`/${opts.indexnowKey}.txt\`` rendre `new Response(opts.indexnowKey, { headers: { "content-type": "text/plain" } })`. Comme `switch (u.pathname)` ne prend pas de condition, écrire ce test avant le `switch` : `if (opts.indexnowKey && u.pathname === \`/${opts.indexnowKey}.txt\`) return new Response(opts.indexnowKey, { headers: { "content-type": "text/plain" } });`.

Dans `collect.test.ts` :

```ts
import { VALID } from "../../../../lib/tests/fixtures/strategy-valide";

describe("stratégie présente", () => {
  const strategyWith = (indexnow: string, pages: string) => VALID.replace("IndexNow : non", `IndexNow : ${indexnow}`).replace(
    "| / | navigationnelle | institut chico | bonheur, coaching | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n| /methode | informationnelle | méthode bonheur | bonheur au travail | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |",
    pages,
  );
  test("pages prévues collectées avant le sitemap, plafond relevé, clé IndexNow récupérée, manifeste renseigné", async () => {
    const s = startFixtureSite(0, { indexnowKey: "a1b2c3d4e5f6" });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const sp = join(o, "strategy.md");
      await Bun.write(sp, strategyWith("a1b2c3d4e5f6", "| /c | informationnelle | page c | | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n| /b | informationnelle | page b | | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 2, delayMs: 0, psiKey: null, level: 0, strategyPath: sp });
      expect(m.pages.map((p) => p.final)).toEqual([`http://localhost:${s.port}/`, `http://localhost:${s.port}/c`, `http://localhost:${s.port}/b`]);
      expect(m.maxPages).toBe(3);
      expect(m.strategy).toEqual({ path: sp, date: "2026-08-28", statut: "brouillon", pages: 2 });
      expect(m.indexnow?.status).toBe(200);
      expect(await Bun.file(join(o, "raw/indexnow.txt")).text()).toBe("a1b2c3d4e5f6");
    } finally { s.stop(true); }
  });
  test("stratégie inanalysable : manifeste avec l'erreur, collecte normale", async () => {
    const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const sp = join(o, "strategy.md");
    await Bun.write(sp, VALID.replace("IndexNow : non", "IndexNow : abc"));
    const m = await runCollect({ url: base, out: o, maxPages: 2, delayMs: 0, psiKey: null, level: 0, strategyPath: sp });
    expect(m.strategy?.path).toBe(sp);
    expect(m.strategy?.error).toMatch(/clé IndexNow mal formée/);
    expect(m.indexnow).toBeNull();
    expect(m.pages).toHaveLength(2);
  });
  test("sans stratégie : strategy null, indexnow null", () => {
    expect(manifest.strategy).toBeNull();
    expect(manifest.indexnow).toBeNull();
  });
});
```

Le `beforeAll` existant doit passer `strategyPath: null` pour ne pas dépendre d'un `seo/strategy.md` présent dans le répertoire courant de la suite.

- [ ] **Étape 2 : implémenter**

`types.ts` :

```ts
export type StrategyRef = { path: string; date?: string; statut?: string; pages?: number; error?: string };
```

et dans `Manifest` : `strategy: StrategyRef | null;` et `indexnow: FetchRecord | null;`.

`collect.ts` : `import { parseStrategy, StrategyError, type Strategy } from "../../../lib/strategy";` ; `strategyPath?: string | null;` dans `CollectOptions` ;

```ts
async function readStrategy(path: string): Promise<{ ref: StrategyRef; strategy: Strategy | null } | null> {
  const f = Bun.file(path);
  if (!(await f.exists())) return null;
  try {
    const s = parseStrategy(await f.text());
    return { ref: { path, date: s.date, statut: s.statut, pages: s.pages.length }, strategy: s };
  } catch (e) {
    return { ref: { path, error: e instanceof StrategyError ? e.errors.join(" ; ") : String(e) }, strategy: null };
  }
}
```

Dans `runCollect`, avant le calcul de `maxPages` : `const strat = o.strategyPath === null ? null : await readStrategy(o.strategyPath ?? "seo/strategy.md");` puis `const planned = strat?.strategy?.pages.map((p) => p.page) ?? [];` et `const maxPages = Math.max(o.maxPages ?? 10, 1 + planned.length);`. Étape 4 : `wantedPages(origin, [...planned, ...(o.pages ?? [])], sm.urls)`. Après l'étape 4 :

```ts
  // 4b. clé IndexNow déclarée par la stratégie
  let indexnow: FetchRecord | null = null;
  if (strat?.strategy?.indexnow) {
    const r = await fetchChain(`${origin}/${strat.strategy.indexnow}.txt`);
    indexnow = toRecord(r, r.status === 200 ? await save("indexnow.txt", text(r)) : undefined);
  }
```

Manifeste : `strategy: strat?.ref ?? null, indexnow,`. CLI : après la ligne `collecte terminée`, si `m.strategy?.error` : `console.error(\`attention : ${m.strategy.path} inanalysable, couche stratégique non évaluée : ${m.strategy.error}\`)`.

- [ ] **Étape 3 : vérifier et commit**

Run : `bun test` → vert.

```bash
git add skills/audit
git commit -m "feat(audit): la collecte lit seo/strategy.md, collecte les pages prévues et la clé IndexNow"
```

---

### Tâche 8 : `strategy-eval.ts`

**Files:**
- Create: `plugin/skills/audit/scripts/lib/strategy-eval.ts`
- Create: `plugin/skills/audit/scripts/strategy-eval.ts`
- Create: `plugin/skills/audit/scripts/tests/strategy-eval.test.ts`

**Interfaces:**
- Consumes: `Strategy`, `cadenceDays`, `keywordMatches`, `normalizeText` (tâche 1) ; `PageFacts` avec `organization` et `opening` (tâche 5) ; `bodyText` (tâche 5) ; `Manifest.indexnow` (tâche 7).
- Produces: `evaluateStrategy(input): StrategyEval`, `pathOf`, `normalizeUrl`, `parseDateLoose`, `lastKnownDate`, types `StrategyEval`, `PageEval`, `PageFactsLike` ; CLI `bun strategy-eval.ts <dossier> [--strategy seo/strategy.md]` qui écrit `<dossier>/derived/strategy-eval.json` (forme : spec 6.3).

- [ ] **Étape 1 : test qui échoue**

```ts
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
    expect(r.identity).toMatchObject({ onHome: false, organizationPresent: false, inOrganization: false, nameMatches: false, organizationName: null });
    expect(r.indexnow).toEqual({ declared: null, fetched: false, status: null, contentMatches: null });
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
      expect(ev.pages[1]).toMatchObject({ inTitle: true, inH1: true, lastKnownDate: "2026-06-12", cadenceRespected: false });
      expect(ev.identity.organizationPresent).toBe(true);
      expect(ev.indexnow).toEqual({ declared: "a1b2c3d4e5f6", fetched: true, status: 200, contentMatches: true });
      expect(r.stdout.toString()).toContain("évaluation stratégique");
    } finally { s.stop(true); }
  });
});
```

Note : sur le site jouet, `/b` a pour title « Page B » et h1 « Page B », donc `page b` est placé ; sa `dateModified` vaut 2026-06-12, donc au 2026-08-28 la cadence trimestrielle (92 jours) est dépassée de 77 jours : `cadenceRespected: false`. Le CLI accepte `--today AAAA-MM-JJ` pour que ce test ne dépende pas de la date du jour.

- [ ] **Étape 2 : `lib/strategy-eval.ts` (exécuté le 28/08)**

```ts
// Logique pure de strategy-eval.ts : compare une stratégie aux faits collectés. Aucun réseau, aucun disque.
import { cadenceDays, keywordMatches, normalizeText, type Cadence, type Strategy } from "../../../../lib/strategy";

/** Sous-ensemble de PageFacts (lib/types.ts) utilisé ici ; `opening` et `organization` sont les champs ajoutés par le chantier 2. */
export type PageFactsLike = {
  url: string; slug: string; status: number; title: string | null; h1: string[]; opening: string;
  organization: { name: string | null; description: string | null; sameAs: string[] } | null;
  dateModified: string | null; lastModified: string | null; visibleDates: string[]; challenge: boolean;
};

export type PageEval = {
  page: string; url: string | null; found: boolean; status: number | null; keyword: string;
  inTitle: boolean | null; inH1: boolean | null; inOpening: boolean | null;
  cadence: Cadence; lastKnownDate: string | null; cadenceRespected: boolean | null;
};
export type StrategyEval = {
  strategy: { path: string; date: string; statut: string; site: string };
  pages: PageEval[];
  identity: { sentence: string; onHome: boolean; organizationPresent: boolean; inOrganization: boolean; expectedName: string; organizationName: string | null; nameMatches: boolean };
  sameAs: { url: string; present: boolean }[];
  indexnow: { declared: string | null; fetched: boolean; status: number | null; contentMatches: boolean | null };
};

/** Chemin d'une URL sans barre finale ; « / » pour la racine. */
export function pathOf(url: string): string {
  try { return new URL(url).pathname.replace(/\/+$/, "") || "/"; } catch { return url; }
}

/** URL comparable : schéma ignoré, hôte en minuscules, barre finale retirée. */
export function normalizeUrl(u: string): string {
  try { const p = new URL(u); return `${p.host.toLowerCase()}${p.pathname.replace(/\/+$/, "")}${p.search}`; } catch { return u.trim().toLowerCase(); }
}

const FR_MONTHS: Record<string, string> = { janvier: "01", "février": "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06", juillet: "07", "août": "08", aout: "08", septembre: "09", octobre: "10", novembre: "11", "décembre": "12", decembre: "12" };

/** Jour ISO depuis une date ISO, HTTP (Last-Modified), « 12/06/2026 » ou « 12 juin 2026 » ; null sinon. */
export function parseDateLoose(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = t.toLowerCase().match(/^(\d{1,2})(?:er)?\s+([a-zéû]+)\s+(\d{4})$/);
  if (m && FR_MONTHS[m[2]]) return `${m[3]}-${FR_MONTHS[m[2]]}-${m[1].padStart(2, "0")}`;
  if (/\d{4}/.test(t)) { const d = new Date(t); if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10); }
  return null;
}

export function lastKnownDate(p: PageFactsLike): string | null {
  const dates = [p.dateModified, p.lastModified, ...p.visibleDates].map(parseDateLoose).filter((d): d is string => d !== null);
  return dates.length ? dates.sort().at(-1)! : null;
}

export function evaluateStrategy(input: {
  strategy: Strategy; strategyPath: string; pages: PageFactsLike[]; homeText: string;
  indexnow: { status: number | null; content: string | null }; today: string;
}): StrategyEval {
  const { strategy, pages, today } = input;
  const byPath = new Map(pages.map((p) => [pathOf(p.url), p]));
  const home = byPath.get("/") ?? pages.find((p) => p.slug === "index") ?? null;
  const org = home?.organization ?? null;
  const sentence = normalizeText(strategy.identite);

  const pageEvals: PageEval[] = strategy.pages.map((plan) => {
    const p = byPath.get(pathOf(plan.page));
    const found = Boolean(p && p.status === 200 && !p.challenge);
    const days = cadenceDays(plan.cadence);
    const last = p ? lastKnownDate(p) : null;
    const respected = found && days !== null && last ? (Date.parse(today) - Date.parse(last)) / 86400000 <= days : null;
    return {
      page: plan.page, url: p?.url ?? null, found, status: p?.status ?? null, keyword: plan.motCle,
      inTitle: found ? keywordMatches(plan.motCle, p!.title ?? "") : null,
      inH1: found ? p!.h1.some((h) => keywordMatches(plan.motCle, h)) : null,
      inOpening: found ? keywordMatches(plan.motCle, p!.opening) : null,
      cadence: plan.cadence, lastKnownDate: last, cadenceRespected: respected,
    };
  });

  const declared = strategy.indexnow;
  const fetched = declared !== null && input.indexnow.status !== null;
  return {
    strategy: { path: input.strategyPath, date: strategy.date, statut: strategy.statut, site: strategy.site },
    pages: pageEvals,
    identity: {
      sentence: strategy.identite,
      onHome: sentence !== "" && normalizeText(input.homeText).includes(sentence),
      organizationPresent: org !== null,
      inOrganization: sentence !== "" && org?.description ? normalizeText(org.description).includes(sentence) : false,
      expectedName: strategy.entite.nom,
      organizationName: org?.name ?? null,
      nameMatches: org?.name ? normalizeText(org.name) === normalizeText(strategy.entite.nom) : false,
    },
    sameAs: strategy.entite.sameAs.map((url) => ({ url, present: (org?.sameAs ?? []).some((s) => normalizeUrl(s) === normalizeUrl(url)) })),
    indexnow: {
      declared, fetched, status: declared !== null ? input.indexnow.status : null,
      contentMatches: declared === null ? null : input.indexnow.status === 200 && (input.indexnow.content ?? "").trim() === declared,
    },
  };
}
```

- [ ] **Étape 3 : `scripts/strategy-eval.ts` (câblage, le test CLI fait foi)**

```ts
#!/usr/bin/env bun
import { join } from "node:path";
import { parseStrategy } from "../../../lib/strategy";
import { bodyText } from "./lib/page";
import { evaluateStrategy } from "./lib/strategy-eval";
import type { Manifest, PageFacts } from "./lib/types";

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const dir = args[0];
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const strategyPath = opt("--strategy") ?? "seo/strategy.md";
  const today = opt("--today") ?? new Date().toISOString().slice(0, 10);
  if (!dir || dir.startsWith("--")) { console.error("usage : bun strategy-eval.ts <dossier d'audit> [--strategy seo/strategy.md] [--today AAAA-MM-JJ]"); process.exit(2); }
  const strategy = parseStrategy(await Bun.file(strategyPath).text());
  const manifest = JSON.parse(await Bun.file(join(dir, "raw/manifest.json")).text()) as Manifest;
  const pages = JSON.parse(await Bun.file(join(dir, "derived/pages.json")).text()) as PageFacts[];
  const homeFile = Bun.file(join(dir, "raw/pages/index.html"));
  const homeText = (await homeFile.exists()) ? bodyText(await homeFile.text()) : "";
  const ixFile = Bun.file(join(dir, "raw/indexnow.txt"));
  const result = evaluateStrategy({
    strategy, strategyPath, pages, homeText, today,
    indexnow: { status: manifest.indexnow?.status ?? null, content: (await ixFile.exists()) ? await ixFile.text() : null },
  });
  await Bun.write(join(dir, "derived/strategy-eval.json"), JSON.stringify(result, null, 2));
  const ko = result.pages.filter((p) => !p.found || p.inTitle === false || p.inH1 === false || p.inOpening === false).length;
  const ident = result.identity.onHome && result.identity.inOrganization ? "en place" : "à placer";
  const ix = result.indexnow.declared ? (result.indexnow.contentMatches ? "servie" : "non servie") : "non prévue";
  console.log(`évaluation stratégique : ${result.pages.length} pages prévues, ${ko} en défaut, identité ${ident}, sameAs ${result.sameAs.filter((s) => s.present).length}/${result.sameAs.length}, IndexNow ${ix}`);
}
```

- [ ] **Étape 4 : vérifier et commit**

Run : `bun test` → vert.

```bash
git add skills/audit/scripts/lib/strategy-eval.ts skills/audit/scripts/strategy-eval.ts skills/audit/scripts/tests/strategy-eval.test.ts
git commit -m "feat(audit): strategy-eval.ts compare la stratégie aux pages collectées, sans réseau"
```

---

### Tâche 9 : les cinq vérifications de la couche stratégique

**Files:**
- Create: `plugin/skills/audit/references/checks/strategy.md`
- Modify: `plugin/skills/audit/references/checks/ai-presence.md` (bloc AI-02)
- Modify: `plugin/skills/audit/references/checks/performance.md` (Comment de PERF-01)

**Interfaces:**
- Consumes: `derived/strategy-eval.json` (tâche 8).
- Produces: cinq blocs `Couche : stratégique`, `Niveau : 0`, lus par `checks-format.test.ts`, `check-sources.ts` et le lint du rapport (tâche 10).

Sources récupérées en direct le 2026-08-28 (spec, section 12) ; `check-sources.ts` les recontrôle. `<title>` s'écrit littéralement dans la citation : `normalizePage` décode les entités de la page.

- [ ] **Étape 1 : `checks/strategy.md`**

```markdown
# Couche stratégique

Contexte pour Claude : `derived/strategy-eval.json`, écrit par `strategy-eval.ts` quand `seo/strategy.md` existe et s'analyse. Sans ce fichier, les cinq vérifications de cette couche (STRAT-01 à STRAT-04, AI-02) vont dans « Ce que je n'ai pas pu voir » avec la raison « pas de seo/strategy.md » ou « seo/strategy.md inanalysable : <défauts> ». La stratégie est un engagement pris avec le client ; ces vérifications disent si le site le tient.

### STRAT-01 : chaque page prévue existe et vise son mot-clé
Couche     : stratégique
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque ligne du tableau « Pages ↔ mots-clés » correspond à une page collectée en 200 dont le title, le h1 et l'ouverture (400 premiers caractères) contiennent le mot-clé principal, selon la règle des mots (minuscules, sans accents, mots vides ignorés).
Comment    : derived/strategy-eval.json → pages[] : found false = trouvaille (page absente ou hors 200) ; inTitle, inH1 ou inOpening false = trouvaille, citer lesquels. Un seul bloc STRAT-01 qui liste les pages en défaut, une ligne par page « /chemin : mot-clé « … » absent du title, du h1 » avec la valeur lue. Toutes les pages found et placées = passée. Une page en challenge anti-bot : non vue pour cette page, jamais une trouvaille.
Source     : https://developers.google.com/search/docs/appearance/title-link « Write descriptive and concise text for your <title> elements. »
Source     : https://developers.google.com/search/docs/appearance/title-link « Consider ensuring that your main heading is distinctive from other text on a page and stands out as being the most prominent on the page (for example, using a larger font, putting the title text in the first visible <h1> element on the page, etc). »
Correctif  : title et h1 qui portent le mot-clé principal, ouverture qui le reprend dans la première phrase ; page manquante : la créer selon la stratégie.
Effort     : moyen

### STRAT-02 : la phrase d'identité est sur la home et dans Organization
Couche     : stratégique
Niveau     : 0
Sévérité   : Important
Vérifie    : la phrase d'identité de strategy.md apparaît dans le texte visible de la home et dans Organization.description ; Organization.name est le Nom de l'entité.
Comment    : derived/strategy-eval.json → identity : onHome false = trouvaille ; organizationPresent false = trouvaille « aucun bloc Organization sur la home, la phrase n'a nulle part où vivre » (SD-02 porte déjà l'absence du bloc, STRAT-02 porte la phrase) ; inOrganization false = trouvaille ; nameMatches false = trouvaille (citer organizationName et expectedName). Tout vrai = passée.
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « The name of your organization. »
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « A detailed description of your organization, if applicable. »
Correctif  : la phrase dans le premier bloc de texte de la home ; Organization.name et Organization.description alignés sur strategy.md.
Effort     : rapide

### STRAT-03 : les sameAs prévus sont en place
Couche     : stratégique
Niveau     : 0
Sévérité   : Mineur
Vérifie    : chaque URL sameAs de strategy.md figure dans Organization.sameAs de la home.
Comment    : derived/strategy-eval.json → sameAs[] : une entrée present false = trouvaille, lister les URLs manquantes ; tableau vide (aucun sameAs prévu) = non vue « aucun sameAs prévu dans la stratégie » ; toutes present = passée.
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »
Correctif  : ajouter les URLs manquantes à Organization.sameAs sur la home.
Effort     : rapide

### STRAT-04 : la cadence de fraîcheur est respectée par page
Couche     : stratégique
Niveau     : 0
Sévérité   : Mineur
Vérifie    : pour chaque page prévue avec une cadence, la date de mise à jour la plus récente connue (dateModified, Last-Modified, date visible) est plus récente que la cadence promise.
Comment    : derived/strategy-eval.json → pages[] : cadenceRespected false = trouvaille, citer la page, la cadence et lastKnownDate ; toutes null (aucune date exploitable ou cadence « aucune ») = non vue « aucune date exploitable sur les pages prévues » (FRESH-01 porte l'absence de dates) ; le reste = passée. La cadence est l'engagement de la stratégie, pas une règle de Google : la source dit comment Google estime une mise à jour, ce qui rend cet engagement visible.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « That's why our systems look at several factors to determine our best estimate of when a page was published or significantly updated. »
Source     : https://developers.google.com/search/docs/appearance/publication-dates « We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif  : mettre à jour le contenu à la cadence promise et propager la date : visible, dateModified en JSON-LD, en-tête Last-Modified.
Effort     : moyen
```

- [ ] **Étape 2 : AI-02 dans `ai-presence.md`** (remplacer le bloc entier)

```markdown
### AI-02 : clé IndexNow déposée
Couche     : stratégique
Niveau     : 0
Sévérité   : Mineur
Vérifie    : la clé IndexNow déclarée dans strategy.md est servie à la racine du site, avec la clé pour contenu.
Comment    : derived/strategy-eval.json → indexnow : declared null (« IndexNow : non » dans la stratégie) = trouvaille « aucune clé prévue » ; declared présent et contentMatches true = passée ; sinon trouvaille, citer status et le contenu de raw/indexnow.txt s'il existe. Sans strategy.md : non vue.
Source     : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Correctif  : générer une clé (8 à 128 caractères, lettres, chiffres, tirets), la déclarer dans strategy.md, la servir en /<clé>.txt, la soumettre à Bing.
Effort     : rapide
```

- [ ] **Étape 3 : PERF-01** : dans `performance.md`, au début du champ `Comment` de PERF-01, ajouter « raw/manifest.json → psi.error « non applicable en local » (niveau 2) ou « PageSpeed non demandé (--no-psi) » = non vue avec cette raison, sans procédure de clé. Sinon : » puis le texte existant.

- [ ] **Étape 4 : vérifier**

```bash
bun test skills/audit/scripts/tests/checks-format.test.ts
bun skills/audit/scripts/check-sources.ts --only STRAT-01 && bun skills/audit/scripts/check-sources.ts --only STRAT-02 && bun skills/audit/scripts/check-sources.ts --only STRAT-03 && bun skills/audit/scripts/check-sources.ts --only STRAT-04 && bun skills/audit/scripts/check-sources.ts --only AI-02
```

Attendu : format vert ; chaque `check-sources` rend `OK` pour ses citations et sort 0. Une citation `ABSENTE` se corrige depuis la page, jamais en l'assouplissant.

- [ ] **Étape 5 : commit**

```bash
git add skills/audit/references/checks
git commit -m "feat(audit): vérifications STRAT-01 à STRAT-04, AI-02 en couche stratégique, PERF-01 en local"
```

---

### Tâche 10 : rapport, lint et `SKILL.md` de l'audit

**Files:**
- Modify: `plugin/skills/audit/references/report-template.md`
- Modify: `plugin/skills/audit/references/levels.md`
- Modify: `plugin/skills/audit/scripts/lint-report.ts`
- Modify: `plugin/skills/audit/scripts/tests/lint-report.test.ts`
- Modify: `plugin/skills/audit/SKILL.md`

**Interfaces:**
- Produces: `lintReport(md, checksDir)` exige les ids selon l'en-tête : `Niveau (\d)` et `Couche stratégique : (oui|non)` ; erreur `en-tête : Niveau ou Couche stratégique manquant` sinon ; fonction exportée `expectedIds(checks: Check[], niveau: number, couche: boolean): string[]`.

- [ ] **Étape 1 : tests qui échouent** (`lint-report.test.ts`)

Remplacer la ligne d'en-tête du `report()` par une fonction paramétrée : `function report(ids: Check[], head = "2026-08-27 · Niveau 0 (URL seule) · Couche stratégique : non · 1 pages collectées · 26 vérifications"): string` et utiliser `head` à la place de la ligne fixe. Remplacer `"Niveau 2, avec le code et la stratégie : aucun"` par `"Couche stratégique, avec seo/strategy.md : aucune"` dans le gabarit de test et dans le test « non applicable » (qui remplace cette ligne). Définir `const absolute0 = all.filter((c) => c.niveau === 0 && c.couche === "absolue");` et `const strategic = all.filter((c) => c.couche === "stratégique");`, et remplacer `level0` par `absolute0` dans les tests existants. Ajouter :

```ts
describe("lint-report : couche stratégique et niveau", () => {
  test("en-tête sans « Couche stratégique » refusé", async () => {
    const errors = await lintReport(report(absolute0, "2026-08-27 · Niveau 0 (URL seule) · 1 pages collectées · 26 vérifications"), checksDir);
    expect(errors.some((e) => e.includes("Couche stratégique"))).toBe(true);
  });
  test("couche active : les vérifications stratégiques sont exigées", async () => {
    const head = "2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : oui (seo/strategy.md, brouillon, 2026-08-28) · 10 pages collectées · 31 vérifications";
    const missing = await lintReport(report(absolute0, head), checksDir);
    for (const c of strategic) expect(missing.some((e) => e.includes(c.id) && e.includes("absent")), c.id).toBe(true);
    expect(await lintReport(report([...absolute0, ...strategic], head), checksDir)).toEqual([]);
  });
  test("couche inactive : une vérification stratégique en passée est une erreur, en non vue est acceptée", async () => {
    const s = strategic[0];
    const errors = await lintReport(report([...absolute0, s]), checksDir);
    expect(errors.some((e) => e.includes(s.id))).toBe(true);
    const md = report(absolute0).replace("Couche stratégique, avec seo/strategy.md : aucune\n", `Couche stratégique, avec seo/strategy.md : aucune\n${s.id} ${s.title}, pas de seo/strategy.md\n`);
    expect(await lintReport(md, checksDir)).toEqual([]);
  });
  test("niveau 2 : PERF-01, IDX-03 et IDX-04 acceptés en non vues avec leur raison", async () => {
    const head = "2026-08-28 · Niveau 2 (site en local) · Couche stratégique : non · 10 pages collectées · 26 vérifications";
    const na = ["PERF-01", "IDX-03", "IDX-04"];
    const rest = absolute0.filter((c) => !na.includes(c.id));
    const md = report(rest, head).replace("Couche stratégique, avec seo/strategy.md : aucune\n", `Couche stratégique, avec seo/strategy.md : aucune\n${na.map((id) => `${id} non applicable en local`).join("\n")}\n`);
    expect(await lintReport(md, checksDir)).toEqual([]);
  });
});
```

Le test « couche inactive, stratégique en passée = erreur » suppose que le lint signale un id hors de l'ensemble attendu quand il apparaît en « passées » ou en trouvaille : c'est une règle nouvelle (« id inattendu »), à implémenter.

- [ ] **Étape 2 : `lint-report.ts`**

Remplacer `level0Ids` par :

```ts
/** Vérifications attendues dans un rapport : niveau inférieur ou égal au niveau exécuté, couche absolue toujours, couche stratégique si active. */
export function expectedIds(checks: ReturnType<typeof parseChecks>, niveau: number, couche: boolean): string[] {
  return checks.filter((c) => c.niveau <= niveau && (c.couche === "absolue" || couche)).map((c) => c.id);
}

async function allChecks(checksDir: string) {
  const files = (await readdir(checksDir)).filter((f) => f.endsWith(".md"));
  const all: ReturnType<typeof parseChecks> = [];
  for (const f of files) all.push(...parseChecks(await Bun.file(`${checksDir}/${f}`).text()));
  return all;
}
```

Dans `lintReport`, après les sections obligatoires :

```ts
  const head = md.split("\n").slice(0, 3).join("\n");
  const niveau = head.match(/Niveau (\d)/);
  const couche = head.match(/Couche stratégique : (oui|non)/);
  if (!niveau || !couche) errors.push("en-tête : Niveau ou Couche stratégique manquant sur la deuxième ligne");
  const checks = await allChecks(checksDir);
  const expected = expectedIds(checks, niveau ? Number(niveau[1]) : 0, couche?.[1] === "oui");
  const known = new Set(checks.map((c) => c.id));
```

et remplacer la boucle `for (const id of await level0Ids(checksDir))` par `for (const id of expected)`. Ajouter après la boucle :

```ts
  // un id connu mais hors de l'ensemble attendu (couche inactive, niveau supérieur) ne peut être que « non vu »
  for (const id of [...findingIds, ...passedIds]) if (known.has(id) && !expected.includes(id)) errors.push(`${id} : hors du périmètre de ce rapport (niveau ou couche), ne peut figurer qu'en « Ce que je n'ai pas pu voir »`);
```

- [ ] **Étape 3 : `report-template.md`**

Ligne 2 : `{{date}} · Niveau {{niveau}} ({{entree}}) · Couche stratégique : {{oui (seo/strategy.md, {{statut}}, {{date_strategie}}) | non}} · {{nb_pages}} pages collectées · {{nb_checks}} vérifications` ; commentaire : `nb_checks` = vérifications absolues de niveau ≤ niveau exécuté (26 au niveau 0 et au niveau 2), plus 5 si la couche est active. `{{entree}}` : « URL seule » au niveau 0, « site en local » au niveau 2.

Section « Ce que je n'ai pas pu voir » : remplacer la ligne `Niveau 2, avec le code et la stratégie : {{liste id + nom}}` par `Couche stratégique, avec seo/strategy.md : {{les cinq ids et noms si la couche est inactive, avec la raison « pas de seo/strategy.md » ou « seo/strategy.md inanalysable : … » ; « aucune » si la couche est active}}`, et ajouter `{{au niveau 2 : PERF-01, IDX-03, IDX-04 non applicable en local, une ligne par id}}` et `{{si manifest.sitemapUrls.skipped non vide : une ligne Info « N URLs du sitemap ignorées, hors site : … », preuve raw/manifest.json }}`.

- [ ] **Étape 4 : `levels.md`**

Tableau : ligne niveau 2 → « Le code, lancé en local » | « tout le niveau 0 sur localhost, sitemap de production ramené en local » | « PageSpeed, sondes http et www (non applicables en local), le trafic réel (niveau 1) ». Ajouter sous le tableau : « **Couche stratégique**, indépendante du niveau : dès que `seo/strategy.md` existe sous le répertoire courant et s'analyse, STRAT-01 à STRAT-04 et AI-02 s'ajoutent aux vérifications du niveau. Sans stratégie, elles sont nommées dans « Ce que je n'ai pas pu voir ». » Remplacer la liste « Niveau 2, à livrer au chantier 2 » par « Couche stratégique (chantier 2) : STRAT-01 … AI-02 clé IndexNow déposée ». Mettre à jour le dernier paragraphe : au niveau 0 sans stratégie, la liste des niveaux 1 et de la couche stratégique.

- [ ] **Étape 5 : `SKILL.md` de l'audit**

Étape 0.2 : « Niveau : 2 si l'hôte est `localhost` ou `127.0.0.1`, sinon 0. Couche stratégique : active si `seo/strategy.md` existe sous le répertoire courant ; `collect.ts` le lit et le manifeste porte `strategy` (avec `error` s'il est inanalysable : le dire dans le rapport, la couche ne tourne pas). » Étape 1 : après la collecte, « Si `raw/manifest.json` porte `strategy` sans `error` : `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/strategy-eval.ts <dossier>` (option `--strategy <chemin>` si le fichier n'est pas `seo/strategy.md`). Sortie attendue : `évaluation stratégique : …`. » Étape 2 : lire aussi `derived/strategy-eval.json` ; parcourir aussi `references/checks/strategy.md` ; règle stricte : chaque vérification du niveau exécuté, plus les cinq de la couche si active, exactement une fois. Étape 3 : l'en-tête porte « Couche stratégique : oui/non ». Étape 4 : sans stratégie, proposer `/erom-seo:strategy` ; avec une stratégie en brouillon, le dire.

- [ ] **Étape 6 : vérifier et commit**

Run : `bun test` → vert. `grep -c "—" skills/audit/SKILL.md skills/audit/references/*.md` → 0.

```bash
git add skills/audit
git commit -m "feat(audit): en-tête « Couche stratégique », ids attendus selon niveau et couche, niveaux et SKILL.md à jour"
```

---

### Tâche 11 : recette sur `chico-happiness`, AC-1 à AC-8

**Files:**
- Create: `.superpowers/sdd/2026-08-28-erom-seo-chantier-2/recette.md` (dans le worktree, non commité si `.superpowers/` est ignoré ; sinon commité en `docs/superpowers/plans/2026-08-28-erom-seo-chantier-2-recette.md`)
- Modify (dans le repo `chico-happiness`, choix de Romain) : `seo/strategy.md`, `seo/strategy/<date>/`, `seo/audits/…`

Cette tâche demande Romain pour AC-1 (l'interview) et AC-5 (une modification du code de `chico-happiness`). Le plugin se charge avec `claude --plugin-dir /Users/recarnot/dev/erom-agence-seo-chantier-2/plugin` depuis `/Users/recarnot/dev/chico-happiness`. Chaque critère est coché avec la commande réellement lancée et sa sortie collée dans `recette.md`. Un critère non couru est dit tel quel.

- [ ] **AC-1** : `/erom-seo:strategy` dans `chico-happiness` (Romain répond ; `source ~/.zshenv` avant de lancer Claude). Attendu : `seo/strategy.md` avec 10 lignes de pages, `bun <plugin>/skills/strategy/scripts/lint-strategy.ts seo/strategy.md` sort 0, `jq '[.[] | .statut] | group_by(.) | map({(.[0]): length}) | add' seo/strategy/*/derived/keywords.json` rend les statuts.
- [ ] **AC-2** : `source ~/.zshenv && bun <plugin>/skills/strategy/scripts/keywords.ts --out /tmp/kw chatgpt "plombier nantes"` puis `jq '.[] | {keyword, statut, last: .bing.last}' /tmp/kw/derived/keywords.json` ; `grep -rl "$BING_WMT_API_KEY" /tmp/kw` doit rendre vide (ne jamais afficher la clé).
- [ ] **AC-3** : `/erom-seo:audit https://www.commentchercherbonheur.org/` dans `chico-happiness`. Attendu : en-tête « Niveau 0 » et « Couche stratégique : oui », `grep -c "STRAT-0\|AI-02" report.md` égale 5, lint 0, trouvailles STRAT-01, STRAT-02, AI-02 avec preuves dans `derived/strategy-eval.json`.
- [ ] **AC-4** : dans `chico-happiness`, `bun run dev` (port 3000) dans un terminal, puis `/erom-seo:audit http://localhost:3000`. Attendu : dossier `seo/audits/<date>-n2/`, `jq '{level, pages: (.pages|length), rewritten: .sitemapUrls.rewrittenFrom, psi}' raw/manifest.json` rend `level 2`, 10 pages, `["commentchercherbonheur.org"]`, `psi.error` « non applicable en local » ; PERF-01, IDX-03, IDX-04 en non vues ; lint 0.
- [ ] **AC-5** : remplacer dans `seo/strategy.md` le mot-clé principal de `/methode` par `licorne quantique`, relancer l'audit niveau 2 : `grep -A8 "STRAT-01" report.md` nomme `/methode` et les trois champs. Puis, avec Romain, corriger `<title>` et h1 de `/methode` dans `src/app/methode/` pour porter le vrai mot-clé, remettre le mot-clé dans la stratégie, relancer : `/methode` n'apparaît plus dans STRAT-01.
- [ ] **AC-6** : dans `/Users/recarnot/dev/erom-agence-seo-chantier-2/clients/_smoke/` (sans `seo/strategy.md`), `/erom-seo:audit http://localhost:8787` avec le site jouet lancé par `bun skills/audit/scripts/tests/fixtures/site.ts` et `--level 0` forcé sur la collecte si nécessaire (le site jouet est sur localhost : passer `--level 0` à `collect.ts` pour simuler un site en ligne). Attendu : « Couche stratégique : non », `grep -c "STRAT-0\|AI-02" report.md` égale 5 (les cinq en non vues), lint 0, `bun test` vert.
- [ ] **AC-7** : `bun skills/audit/scripts/check-sources.ts` sort 0 avec `OK STRAT-01` (×2), `OK STRAT-02` (×2), `OK STRAT-03`, `OK STRAT-04` (×2), `OK AI-02`.
- [ ] **AC-8** : `env -u BING_WMT_API_KEY bun <plugin>/skills/strategy/scripts/keywords.ts --out /tmp/kw2 test` sort 0, affiche une fois « BING_WMT_API_KEY absente », `jq '.[0].statut' /tmp/kw2/derived/keywords.json` rend « non interrogé (clé absente) ».
- [ ] **Clôture** : mettre à jour `.claude/notes/2026-08-27-reprise-2120.md` (état du chantier 2, chemin de la recette, ce qui reste), commit `docs: recette du chantier 2 et note de reprise`. Ne pas fusionner : signaler à Romain que la branche `chantier-2-strategy` est prête pour la revue finale.

---

## Auto-revue du plan (faite le 2026-08-28)

- **Couverture de la spec** : 4.1 à 4.4 → tâches 1, 2 ; 5.1 à 5.4 → tâches 3, 4 ; 6.1 → tâches 6, 7 ; 6.2 → tâche 5 ; 6.3 → tâche 8 ; 6.4 → tâche 9 ; 6.5 et 6.6 → tâche 10 ; 7 (erreurs) → tâches 3 (clé refusée, absente), 7 (stratégie inanalysable), 10 (rapport) ; 8 (tests) → chaque tâche ; 9 (AC) → tâche 11. Point de la spec non couvert par une tâche : la sonde Bing du 1er septembre (section 11), qui est une action calendaire, notée dans la note de reprise.
- **Placeholders** : aucun « TBD » ; les câblages CLI (tâches 3, 8) et les diffs de `collect.ts` (tâches 6, 7) sont écrits en entier contre le fichier à `8d43a49`, leurs tests font foi.
- **Cohérence des noms** : `parseStrategy`, `lintStrategy`, `analyseStrategy`, `keywordMatches`, `normalizeText`, `cadenceDays` (tâche 1) sont utilisés tels quels en 2, 7, 8 ; `rewriteToOrigin`, `detectLevel`, `noPsi`, `strategyPath`, `rewrittenFrom`, `StrategyRef`, `Manifest.strategy`, `Manifest.indexnow` (6, 7) tels quels en 8, 10 ; `extractOrganization`, `opening`, `bodyText`, `jsonLdBlocks`, `visibleText`, `PageFacts.organization`, `PageFacts.opening` (5) tels quels en 8 ; `expectedIds` (10).
- **Code exécuté** : `lib/strategy.ts` (33 tests), `lib/keywords.ts` (parties pures, 13 tests), ajouts de `page.ts` (6 tests), `lib/strategy-eval.ts` (7 tests), `detectLevel` et `rewriteToOrigin` (2 tests) : 59 tests verts dans le scratchpad du 28/08 avant l'écriture du plan. Non exécutés : `keywords.ts` (câblage), `strategy-eval.ts` (câblage), les diffs de `collect.ts` et `sitemap.ts`, `lint-report.ts` ; chacun a son test dans la tâche.
- **Conventions externes** : Bing (échantillons réels du 27/08, sondes avec la vraie clé), Wikimedia (échantillon réel du 27/08), IndexNow (documentation lue le 28/08), citations Google (récupérées le 28/08, recontrôlées par `check-sources.ts`).
