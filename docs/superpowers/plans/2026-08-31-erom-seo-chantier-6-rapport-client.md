# Rapport client (chantier 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ajouter à `erom-seo` un sixième verbe, `/erom-seo:rapport`, qui lit un audit déjà sur disque et en tire un fichier HTML autonome destiné au client final, construit autour d'une seule action à faire dans la semaine.

**Architecture:** le verbe ne collecte rien. Il résout un audit avec `latestAuditDir()`, le lit avec `parseReport()` (les deux existent déjà dans `plugin/lib/report.ts`), et imprime la matière du jugement. Claude écrit alors `rapport-client.md`, un Markdown strict dont le contrat est tenu par un parseur pur. Un lint vérifie mécaniquement ce qui est mécanisable (complétude des trouvailles graves, absence d'identifiants de catalogue, absence de tiret cadratin), puis un rendu pur transforme ce Markdown en un HTML sans aucune requête réseau, tokens du design system institut figés dans le plugin et fonts Spectral embarquées en base64.

**Tech Stack:** TypeScript, Bun (runtime, `bun test`), zéro dépendance nouvelle. Aucune API externe : ce chantier ne touche pas au réseau.

**Spec:** `docs/superpowers/specs/2026-08-31-erom-seo-rapport-client-design.md` (D42 à D48, AC-1 à AC-7)

## Global Constraints

- **Zéro dépendance nouvelle.** `bun` seul. Ni `npm`, ni `npx`, ni `pip` : le garde-fou local les bloque.
- **Aucun accès réseau dans ce chantier.** Le verbe lit des fichiers et en écrit. Un test qui ouvre une socket est un test à réécrire.
- **`plugin/lib/` ne gagne aucun module.** Rien ici ne sert à un autre verbe (spec, section 3). Toute la logique vit sous `plugin/skills/rapport/`.
- **La logique pure vit dans `scripts/lib/`**, sans disque ni réseau ; les CLI vivent dans `scripts/` avec `import.meta.main`. Convention des cinq verbes existants.
- **Pas de tiret cadratin** dans le rapport client. C'est un document lu par un tiers, et le lint le refuse (D47, règle 6).
- **Français** pour tout ce qui s'affiche ; anglais pour les identifiants de code.
- **Deux antipatrons de test bannis** : geler un instantané du HTML produit ou compter les tokens CSS ; affirmer sur le texte source plutôt que sur le comportement. On assère des invariants.
- **Les dix préfixes du catalogue**, relevés le 31/08 sur `plugin/skills/audit/references/checks/` (35 identifiants) : `AI`, `FRESH`, `IDX`, `PERF`, `REND`, `ROBOTS`, `SD`, `SNIP`, `STRAT`, `TAG`. Le préfixe est `ROBOTS`, pas `ROB`.
- **Commande de vérification** : depuis `plugin/`, `bun test`.

---

## Structure des fichiers

```
plugin/skills/rapport/
  SKILL.md                              la procédure en quatre temps (Task 6)
  scripts/
    rapport.ts                          CLI --preparer / --rendre (Task 5)
    lint-client.ts                      CLI du lint (Task 2)
    lib/
      contrat.ts                        parseur du Markdown client, pur (Task 1)
      verifier.ts                       les six règles de D47, pur (Task 2)
      theme.ts                          tokens + fonts en base64 (Task 3)
      rendu.ts                          Markdown client -> HTML, pur (Task 4)
    tests/
      contrat.test.ts                   (Task 1)
      verifier.test.ts                  (Task 2)
      rendu.test.ts                     (Task 4)
      rapport-cli.test.ts               (Task 5)
      fixtures/
        client-conforme.md              rapport client d'un site à six trouvailles graves (Task 1)
        client-sain.md                  rapport client d'un site sans trouvaille grave, cas D49 (Task 2)
        report-chico-n0.md              rapport technique du 28/08, copie de plugin/lib/tests/fixtures/ (Task 2)
        report-chico-sain.md            rapport technique du 31/08, copie du dossier client (Task 2)
  references/
    registre.md                         les règles de langue (Task 6)
    gabarit.md                          le squelette du Markdown client (Task 6)
    theme/
      tokens.css                        tokens institut figés (Task 3)
      OFL.txt                           licence des fonts (Task 3)
      spectral-v15-latin-regular.woff2  21 696 octets (Task 3)
      spectral-v15-latin-600.woff2      22 936 octets (Task 3)
      spectral-v15-latin-italic.woff2   22 712 octets (Task 3)
```

Réutilisé sans modification : `plugin/lib/report.ts` (`parseReport`, `Finding`, `Severity`, `latestAuditDir`).

---

### Task 1: `contrat.ts`, le parseur du Markdown client

**Files:**
- Create: `plugin/skills/rapport/scripts/lib/contrat.ts`
- Create: `plugin/skills/rapport/scripts/tests/contrat.test.ts`
- Create: `plugin/skills/rapport/scripts/tests/fixtures/client-conforme.md`

**Interfaces:**
- Consumes: rien.
- Produces: `parseRapportClient(md: string): RapportClient` ; `RapportClient = { site, date, synthese, action, bloque, freine, marche, methode, mineursAnnonces }` ; `SectionClient = { titre: string; couvre: string[]; corps: string }` ; `RapportClientError extends Error` avec `errors: string[]` ; `PREFIXES` (les dix) ; `idsVisibles(md): { ligne: number; id: string }[]` ; `lignesEmDash(md): number[]`.

Note de conception, tirée de la fixture réelle : le rapport de CHICO porte **zéro Critique**, six Important, six Mineur et un Info. La section « Ce qui bloque » doit donc pouvoir être absente sans faire échouer le parseur, et le compte de points mineurs annoncé vaut Mineur + Info, soit sept. Ce cas est le cas nominal du premier client, pas un cas limite.

- [ ] **Step 1: écrire la fixture conforme**

Créer `plugin/skills/rapport/scripts/tests/fixtures/client-conforme.md` :

```markdown
# Comment chercher le bonheur
Revue du 31 août 2026

Votre site est en bonne santé technique et rien ne bloque sa présence sur Google. Il manque surtout des repères qui aident les moteurs à comprendre de quoi parle chaque page. Ce document part de la chose la plus utile à faire cette semaine, puis liste ce qui freine.

## À faire cette semaine
### Donner un titre propre à vos six pages principales
<!-- couvre: TAG-01, IDX-02 -->
Le titre d'une page est la ligne bleue que Google affiche dans ses résultats. Six de vos pages n'en ont pas de spécifique, elles reprennent toutes le nom du site, et un visiteur ne peut pas deviner sur quoi il va cliquer.

1. Ouvrez chaque page listée ci-dessous dans votre éditeur.
2. Remplacez le titre par celui proposé, prêt à coller.

## Ce qui freine
### Vos pages ne disent pas encore à Google de quoi elles parlent
<!-- couvre: SD-01, SD-02 -->
Constaté : aucune de vos dix pages ne porte de fiche d'identité structurée, ce petit bloc invisible qui décrit le contenu aux moteurs.
Effet : vos pages s'affichent en résultat simple, sans les enrichissements visuels qui attirent l'oeil.
À faire : ajouter un bloc de description sur chaque page.

## Ce qui marche déjà
- Votre site est accessible aux robots des moteurs et des assistants IA
- Vos pages se chargent vite

## Méthode
Relevé du 28 août 2026 sur dix pages, depuis l'adresse publique du site.
7 points mineurs figurent dans le rapport technique complet, disponible sur demande.
```

- [ ] **Step 2: écrire les tests d'échec, qui doivent tous échouer à ce stade**

Créer `plugin/skills/rapport/scripts/tests/contrat.test.ts` :

```typescript
import { describe, test, expect } from "bun:test";
import { parseRapportClient, RapportClientError, idsVisibles, lignesEmDash } from "../lib/contrat";

const CONFORME = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();

const erreursDe = (md: string): string[] => {
  try { parseRapportClient(md); return []; }
  catch (e) { return (e as RapportClientError).errors; }
};

describe("parseRapportClient, cas nominal", () => {
  test("lit l'en-tête, l'action et ses identifiants couverts", () => {
    const r = parseRapportClient(CONFORME);
    expect(r.site).toBe("Comment chercher le bonheur");
    expect(r.date).toBe("31 août 2026");
    expect(r.action.titre).toBe("Donner un titre propre à vos six pages principales");
    expect(r.action.couvre).toEqual(["TAG-01", "IDX-02"]);
    expect(r.action.corps).toContain("Le titre d'une page est la ligne bleue");
  });

  test("une section absente n'est pas une erreur : un rapport sans Critique n'a pas de « Ce qui bloque »", () => {
    const r = parseRapportClient(CONFORME);
    expect(r.bloque).toEqual([]);
    expect(r.freine).toHaveLength(1);
    expect(r.freine[0].couvre).toEqual(["SD-01", "SD-02"]);
  });

  test("lit les points forts et le compte de mineurs annoncé", () => {
    const r = parseRapportClient(CONFORME);
    expect(r.marche).toHaveLength(2);
    expect(r.mineursAnnonces).toBe(7);
  });
});

describe("parseRapportClient, refus", () => {
  test("refuse un rapport sans action de la semaine", () => {
    const errs = erreursDe(CONFORME.replace("## À faire cette semaine", "## Autre chose"));
    expect(errs.join("\n")).toContain("À faire cette semaine » absente");
  });

  test("refuse deux actions : le rapport en porte une seule", () => {
    const deux = CONFORME.replace("## Ce qui freine", "### Une deuxième action\nUn corps.\n\n## Ce qui freine");
    expect(erreursDe(deux).join("\n")).toContain("une seule action attendue, 2 trouvée(s)");
  });

  test("refuse un compte de points mineurs absent", () => {
    const sansCompte = CONFORME.replace(/\d+ points mineurs[^\n]*\n?/, "");
    expect(erreursDe(sansCompte).join("\n")).toContain("compte de points mineurs est absente");
  });

  test("refuse un identifiant illisible dans couvre:", () => {
    const errs = erreursDe(CONFORME.replace("<!-- couvre: TAG-01, IDX-02 -->", "<!-- couvre: TAG-1, BIDON-02 -->"));
    expect(errs.join("\n")).toContain("TAG-1");
    expect(errs.join("\n")).toContain("BIDON-02");
  });

  test("refuse une synthèse d'ouverture absente", () => {
    const sansSynthese = CONFORME.replace(/Votre site est en bonne santé[^\n]*\n/, "");
    expect(erreursDe(sansSynthese).join("\n")).toContain("synthèse d'ouverture est absente");
  });
});

describe("détecteurs de surface", () => {
  test("idsVisibles ignore les commentaires couvre: et attrape le texte visible", () => {
    expect(idsVisibles(CONFORME)).toEqual([]);
    const fuite = CONFORME.replace("Le titre d'une page", "La vérification TAG-01 dit que le titre d'une page");
    const vus = idsVisibles(fuite);
    expect(vus).toHaveLength(1);
    expect(vus[0].id).toBe("TAG-01");
  });

  test("idsVisibles connaît le préfixe ROBOTS, qui n'est pas ROB", () => {
    expect(idsVisibles("Le fichier ROBOTS-02 bloque un bot.")).toHaveLength(1);
  });

  test("lignesEmDash rend le numéro de ligne fautive", () => {
    expect(lignesEmDash(CONFORME)).toEqual([]);
    expect(lignesEmDash("ligne une\nune phrase — coupée\n")).toEqual([2]);
  });
});
```

- [ ] **Step 3: lancer les tests et vérifier qu'ils échouent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/contrat.test.ts`
Expected: FAIL, `Cannot find module '../lib/contrat'`.

- [ ] **Step 4: écrire l'implémentation**

Créer `plugin/skills/rapport/scripts/lib/contrat.ts`. Ce code a été exécuté sur la fixture réelle avant d'entrer dans ce plan ; les huit cas de test ci-dessus passent avec lui.

```typescript
// Contrat de rapport-client.md, le Markdown que Claude écrit et que le rendu transforme en HTML.
// Le rapport technique (report.md) a son propre contrat dans plugin/lib/report.ts ; les deux ne se mélangent pas.

export type SectionClient = { titre: string; couvre: string[]; corps: string };
export type RapportClient = {
  site: string; date: string; synthese: string;
  action: SectionClient; bloque: SectionClient[]; freine: SectionClient[];
  marche: string[]; methode: string; mineursAnnonces: number;
};

export class RapportClientError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "RapportClientError"; }
}

/** Les dix préfixes du catalogue, relevés sur skills/audit/references/checks/. ROBOTS, jamais ROB. */
export const PREFIXES = ["AI", "FRESH", "IDX", "PERF", "REND", "ROBOTS", "SD", "SNIP", "STRAT", "TAG"] as const;
const ID_SOURCE = `\\b(${PREFIXES.join("|")})-\\d{2}\\b`;
const ID_EXACT = new RegExp(`^(${PREFIXES.join("|")})-\\d{2}$`);
const COUVRE_RE = /^<!--\s*couvre\s*:\s*(.+?)\s*-->\s*$/;

const TITRES = {
  action: "## À faire cette semaine", bloque: "## Ce qui bloque",
  freine: "## Ce qui freine", marche: "## Ce qui marche déjà", methode: "## Méthode",
} as const;

/** Contenu d'une section `## titre` jusqu'au prochain `## ` (ou la fin). Null si la section est absente. */
function section(md: string, heading: string): string | null {
  const i = md.indexOf(`\n${heading}`);
  if (i < 0) return null;
  const rest = md.slice(i + heading.length + 1);
  const next = rest.search(/\n## /);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

/** Découpe une section en blocs `### titre`, chacun pouvant porter un commentaire couvre:. */
function blocs(sec: string, errors: string[], ou: string): SectionClient[] {
  const out: SectionClient[] = [];
  for (const bloc of sec.split(/^### /m).slice(1)) {
    const [titre, ...lignes] = bloc.split("\n");
    const couvre: string[] = [];
    const corps: string[] = [];
    for (const l of lignes) {
      const m = l.match(COUVRE_RE);
      if (m) {
        for (const id of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
          if (ID_EXACT.test(id)) couvre.push(id);
          else errors.push(`${ou} « ${titre.trim()} » : identifiant illisible « ${id} »`);
        }
        continue;
      }
      corps.push(l);
    }
    out.push({ titre: titre.trim(), couvre, corps: corps.join("\n").trim() });
  }
  return out;
}

/** Lit un rapport client conforme au gabarit. Lève RapportClientError en listant tout ce qui cloche. */
export function parseRapportClient(md: string): RapportClient {
  const errors: string[] = [];
  const lignes = md.split("\n");

  const site = lignes[0]?.match(/^# (.+)$/)?.[1]?.trim();
  if (!site) errors.push("première ligne : « # <nom du site> » attendu");
  const date = lignes[1]?.match(/^Revue du (.+)$/)?.[1]?.trim();
  if (!date) errors.push("deuxième ligne : « Revue du <date> » attendu");

  const secAction = section(md, TITRES.action);
  if (secAction === null) errors.push("section « À faire cette semaine » absente");
  const actions = secAction === null ? [] : blocs(secAction, errors, "action");
  if (secAction !== null && actions.length !== 1) {
    errors.push(`section « À faire cette semaine » : une seule action attendue, ${actions.length} trouvée(s)`);
  }
  if (actions[0] && actions[0].corps === "") errors.push("l'action de la semaine n'a pas de corps");

  const secMethode = section(md, TITRES.methode);
  if (secMethode === null) errors.push("section « Méthode » absente");
  const mMineurs = (secMethode ?? "").match(/(\d+)\s+points?\s+mineurs?/);
  if (!mMineurs) errors.push("section « Méthode » : la ligne du compte de points mineurs est absente");

  const finEntete = md.indexOf("\n## ");
  const synthese = (finEntete < 0 ? "" : md.slice(0, finEntete)).split("\n").slice(2).join("\n").trim();
  if (synthese === "") errors.push("la synthèse d'ouverture est absente");

  const secBloque = section(md, TITRES.bloque);
  const secFreine = section(md, TITRES.freine);
  const secMarche = section(md, TITRES.marche);
  const bloque = secBloque === null ? [] : blocs(secBloque, errors, "blocage");
  const freine = secFreine === null ? [] : blocs(secFreine, errors, "frein");

  if (errors.length) throw new RapportClientError(errors);
  return {
    site: site!, date: date!, synthese, action: actions[0]!, bloque, freine,
    marche: (secMarche ?? "").split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim()),
    methode: secMethode!, mineursAnnonces: Number(mMineurs![1]),
  };
}

/** Les identifiants de catalogue visibles par le client, hors commentaires couvre:. */
export function idsVisibles(md: string): { ligne: number; id: string }[] {
  const out: { ligne: number; id: string }[] = [];
  const re = new RegExp(ID_SOURCE, "g");
  md.split("\n").forEach((l, i) => {
    if (COUVRE_RE.test(l.trim())) return;
    for (const m of l.matchAll(re)) out.push({ ligne: i + 1, id: m[0] });
  });
  return out;
}

/** Les numéros de ligne portant un tiret cadratin. */
export function lignesEmDash(md: string): number[] {
  const out: number[] = [];
  md.split("\n").forEach((l, i) => { if (l.includes("—")) out.push(i + 1); });
  return out;
}
```

- [ ] **Step 5: lancer les tests et vérifier qu'ils passent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/contrat.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add plugin/skills/rapport/scripts/lib/contrat.ts plugin/skills/rapport/scripts/tests/contrat.test.ts plugin/skills/rapport/scripts/tests/fixtures/client-conforme.md
git commit -m "feat(rapport): contrat.ts, le parseur du Markdown client"
```

---

### Task 2: `verifier.ts` et `lint-client.ts`, les six règles de D47

**Files:**
- Create: `plugin/skills/rapport/scripts/lib/verifier.ts`
- Create: `plugin/skills/rapport/scripts/lint-client.ts`
- Create: `plugin/skills/rapport/scripts/tests/verifier.test.ts`
- Copy: `plugin/lib/tests/fixtures/report-chico-n0.md` vers `plugin/skills/rapport/scripts/tests/fixtures/report-chico-n0.md`

**Interfaces:**
- Consumes: `parseRapportClient`, `RapportClientError`, `idsVisibles`, `lignesEmDash` (Task 1) ; `parseReport`, `Finding`, `Severity` de `plugin/lib/report.ts`.
- Produces: `verifier(clientMd: string, rapportMd: string): string[]` qui rend la liste des refus, vide si tout va bien.

La séparation compte : `verifier.ts` est pur et prend deux chaînes ; `lint-client.ts` est le CLI qui lit les fichiers et rend le code de sortie. Le premier se teste sans disque.

- [ ] **Step 1: copier les deux fixtures de rapport technique**

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p plugin/skills/rapport/scripts/tests/fixtures
cp plugin/lib/tests/fixtures/report-chico-n0.md plugin/skills/rapport/scripts/tests/fixtures/report-chico-n0.md
cp /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org/seo/audits/2026-08-31-n0/report.md plugin/skills/rapport/scripts/tests/fixtures/report-chico-sain.md
```

Le second chemin est absolu et pointe vers le **checkout principal**, à dessein : `clients/` est gitignoré (`clients/commentchercherbonheur.org/` dans le `.gitignore` racine), donc ce dossier n'existe dans aucun worktree. Un `cp` relatif échouerait ici. Une fois copiée, la fixture est versionnée sous `plugin/`, et plus rien ne dépend du checkout principal.

Deux vrais rapports du même site, à trois jours d'écart. Valeurs relevées sur les fichiers, pas supposées :

| Fixture | Critique | Important | Mineur | Info |
|---|---|---|---|---|
| `report-chico-n0.md` (28/08) | 0 | 6 : `SD-01`, `SD-02`, `IDX-02`, `TAG-01`, `STRAT-01`, `STRAT-02` | 6 | 1 |
| `report-chico-sain.md` (31/08) | 0 | 0 | 1 : `SD-03` | 2 : `PERF-01`, `AI-01` |

La seconde est le cas D49, celui du site suivi qui va bien. C'est l'état réel du site au 31/08, pas un cas fabriqué : il a corrigé ses six Important en trois jours.

- [ ] **Step 1 bis: écrire la fixture du rapport client d'un site sain**

Créer `plugin/skills/rapport/scripts/tests/fixtures/client-sain.md` :

```markdown
# Comment chercher le bonheur
Revue du 31 août 2026

Votre site est en bon état. Rien ne freine aujourd'hui sa présence sur Google, et les corrections faites depuis fin août ont porté. Ce document propose la prochaine chose utile à faire, puis rappelle ce qui fonctionne.

## À faire cette semaine
### Ajouter un fichier qui présente votre site aux assistants IA
<!-- couvre: AI-01 -->
Les assistants comme ChatGPT ou Perplexity cherchent à la racine des sites un petit fichier texte qui résume de quoi le site parle. Le vôtre n'en a pas, donc ces assistants doivent deviner.

1. Créez un fichier nommé llms.txt à la racine du site.
2. Écrivez-y le nom du site, une phrase de description, et la liste de vos pages principales.

## Ce qui marche déjà
- Chaque page a son propre titre et sa propre description
- Vos pages portent une fiche d'identité structurée que Google sait lire
- L'adresse sans www renvoie définitivement vers l'adresse avec www

## Méthode
Relevé du 31 août 2026 sur dix pages, depuis l'adresse publique du site.
2 points mineurs figurent dans le rapport technique complet, disponible sur demande.
```

Deux points à ne pas rater dans cette fixture : elle n'a **ni** « Ce qui bloque » **ni** « Ce qui freine », et son compte annonce **2** points mineurs alors que le rapport technique en porte 3, parce que l'action en a déjà remonté un (D49).

- [ ] **Step 2: écrire les tests**

Créer `plugin/skills/rapport/scripts/tests/verifier.test.ts` :

```typescript
import { describe, test, expect } from "bun:test";
import { verifier } from "../lib/verifier";

const CLIENT = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();
const RAPPORT = await Bun.file(`${import.meta.dir}/fixtures/report-chico-n0.md`).text();
const SAIN = await Bun.file(`${import.meta.dir}/fixtures/client-sain.md`).text();
const RAPPORT_SAIN = await Bun.file(`${import.meta.dir}/fixtures/report-chico-sain.md`).text();

describe("verifier", () => {
  test("la fixture conforme laisse deux Important non couvertes, et le dit", () => {
    // client-conforme.md couvre TAG-01, IDX-02, SD-01, SD-02 ; le rapport en porte six.
    const refus = verifier(CLIENT, RAPPORT);
    expect(refus.join("\n")).toContain("STRAT-01");
    expect(refus.join("\n")).toContain("STRAT-02");
  });

  test("aucun refus quand les six Important sont couvertes", () => {
    const complet = CLIENT.replace(
      "<!-- couvre: SD-01, SD-02 -->",
      "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->",
    );
    expect(verifier(complet, RAPPORT)).toEqual([]);
  });

  test("refuse une trouvaille mineure glissée dans une section d'inventaire", () => {
    const avecMineur = CLIENT.replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02, SD-03 -->");
    expect(verifier(avecMineur, RAPPORT).join("\n")).toContain("SD-03");
  });

  test("refuse un compte de points mineurs faux", () => {
    const fauxCompte = CLIENT
      .replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->")
      .replace("7 points mineurs", "3 points mineurs");
    expect(verifier(fauxCompte, RAPPORT).join("\n")).toContain("compte de points mineurs faux");
  });
});

describe("verifier, le site sain de D49", () => {
  test("accepte un rapport sans aucune trouvaille grave, dont l'action porte une Info", () => {
    // report-chico-sain.md : 0 Critique, 0 Important, 1 Mineur, 2 Info. L'action porte AI-01.
    expect(verifier(SAIN, RAPPORT_SAIN)).toEqual([]);
  });

  test("le compte annoncé exclut la mineure remontée par l'action", () => {
    // Trois mineures au rapport technique, une portée par l'action : deux restent à annoncer.
    const troisAnnonces = SAIN.replace("2 points mineurs", "3 points mineurs");
    expect(verifier(troisAnnonces, RAPPORT_SAIN).join("\n")).toContain("2 attendus");
  });

  test("refuse la même Info dans une section d'inventaire, alors qu'elle passe dans l'action", () => {
    const dansInventaire = SAIN.replace(
      "## Ce qui marche déjà",
      "## Ce qui freine\n### Pas de données de vitesse\n<!-- couvre: PERF-01 -->\nUn corps.\n\n## Ce qui marche déjà",
    );
    expect(verifier(dansInventaire, RAPPORT_SAIN).join("\n")).toContain("section d'inventaire ne porte que");
  });

  test("refuse un identifiant que le rapport technique ne porte pas", () => {
    const inventé = SAIN.replace("<!-- couvre: AI-01 -->", "<!-- couvre: IDX-01 -->");
    expect(verifier(inventé, RAPPORT_SAIN).join("\n")).toContain("absente du rapport technique");
  });

  test("refuse un identifiant de catalogue visible par le client", () => {
    const fuite = CLIENT
      .replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->")
      .replace("Le titre d'une page", "La vérification TAG-01 dit que le titre d'une page");
    expect(verifier(fuite, RAPPORT).join("\n")).toMatch(/TAG-01.*ligne \d+|ligne \d+.*TAG-01/);
  });

  test("refuse un tiret cadratin, en nommant la ligne", () => {
    const dash = CLIENT
      .replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->")
      .replace("Vos pages se chargent vite", "Vos pages se chargent vite — et bien");
    expect(dash).toContain("—");
    expect(verifier(dash, RAPPORT).join("\n")).toContain("tiret cadratin");
  });

  test("remonte les erreurs de contrat plutôt que de planter", () => {
    expect(verifier("# Rien\n", RAPPORT).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: lancer les tests et vérifier qu'ils échouent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/verifier.test.ts`
Expected: FAIL, `Cannot find module '../lib/verifier'`.

- [ ] **Step 4: écrire `verifier.ts`**

```typescript
// Les six règles de D47, amendées par D49. Pur : deux chaînes en entrée, la liste des refus en sortie.
// D49 : l'action de la semaine peut s'appuyer sur n'importe quelle trouvaille, y compris Mineur ou Info ;
// les sections d'inventaire ne portent que du Critique et de l'Important ; le compte de points mineurs
// annoncé exclut celles que l'action a déjà remontées.
import { parseReport, type Severity } from "../../../../lib/report";
import { parseRapportClient, RapportClientError, idsVisibles, lignesEmDash } from "./contrat";

const GRAVES: readonly Severity[] = ["Critique", "Important"];

export function verifier(clientMd: string, rapportMd: string): string[] {
  const refus: string[] = [];

  let client;
  try { client = parseRapportClient(clientMd); }
  catch (e) { return (e as RapportClientError).errors; }

  const rapport = parseReport(rapportMd);
  const graves = rapport.findings.filter((f) => GRAVES.includes(f.severity));
  const mineurs = rapport.findings.filter((f) => !GRAVES.includes(f.severity));
  const connus = new Map(rapport.findings.map((f) => [f.id, f.severity] as const));

  const parAction = new Set(client.action.couvre);
  const parSections = new Set([...client.bloque, ...client.freine].flatMap((s) => s.couvre));

  for (const f of graves) {
    if (!parAction.has(f.id) && !parSections.has(f.id)) {
      refus.push(`${f.id} (${f.severity}) n'est couverte ni par l'action ni par une section : « ${f.title} »`);
    }
  }
  for (const id of parSections) {
    const sev = connus.get(id);
    if (sev === undefined) refus.push(`${id} est couverte mais absente du rapport technique`);
    else if (!GRAVES.includes(sev)) refus.push(`${id} est ${sev} : une section d'inventaire ne porte que du Critique ou de l'Important (D49)`);
  }
  for (const id of parAction) {
    if (!connus.has(id)) refus.push(`${id} est couverte par l'action mais absente du rapport technique`);
  }

  const restants = mineurs.filter((f) => !parAction.has(f.id)).length;
  if (client.mineursAnnonces !== restants) {
    refus.push(`compte de points mineurs faux : ${client.mineursAnnonces} annoncés, ${restants} attendus`);
  }
  for (const { ligne, id } of idsVisibles(clientMd)) {
    refus.push(`ligne ${ligne} : l'identifiant ${id} est visible par le client`);
  }
  for (const ligne of lignesEmDash(clientMd)) {
    refus.push(`ligne ${ligne} : tiret cadratin interdit dans un document remis à un tiers`);
  }
  return refus;
}
```

Ce code a été exécuté le 31/08 sur quatre cas, dont le rapport réel de CHICO du jour : site sain accepté, compte ajusté à 2 au lieu de 3, Info refusée dans une section d'inventaire, et comportement inchangé sur la fixture à six graves.

- [ ] **Step 5: écrire le CLI `lint-client.ts`**

```typescript
#!/usr/bin/env bun
// Refuse un rapport client qui ne tient pas le contrat de D47. Sort 1 en nommant chaque refus.
import { join } from "node:path";
import { verifier } from "./lib/verifier";

export async function lintDossier(dossier: string): Promise<string[]> {
  const client = await Bun.file(join(dossier, "rapport-client.md")).text();
  const rapport = await Bun.file(join(dossier, "report.md")).text();
  return verifier(client, rapport);
}

if (import.meta.main) {
  const dossier = process.argv[2];
  if (!dossier) { console.error("usage : lint-client.ts <dossier d'audit>"); process.exit(2); }
  const refus = await lintDossier(dossier);
  if (refus.length === 0) { console.log("rapport client conforme"); process.exit(0); }
  console.error(`rapport client refusé, ${refus.length} point(s) :`);
  for (const r of refus) console.error(`  - ${r}`);
  process.exit(1);
}
```

- [ ] **Step 6: lancer les tests et vérifier qu'ils passent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/verifier.test.ts`
Expected: PASS, 11 tests (7 du contrat de base, 4 du site sain de D49).

- [ ] **Step 7: commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add plugin/skills/rapport/scripts/lib/verifier.ts plugin/skills/rapport/scripts/lint-client.ts plugin/skills/rapport/scripts/tests/verifier.test.ts plugin/skills/rapport/scripts/tests/fixtures/report-chico-n0.md
git commit -m "feat(rapport): lint-client, les six règles du contrat client (D47)"
```

---

### Task 3: le thème, tokens institut figés et fonts embarquées

**Files:**
- Create: `plugin/skills/rapport/references/theme/tokens.css`
- Create: `plugin/skills/rapport/references/theme/OFL.txt`
- Copy: trois `.woff2` depuis le repo du design system
- Create: `plugin/skills/rapport/scripts/lib/theme.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `chargerTheme(racine?: string): Promise<Theme>` avec `Fonte = { nom: string; poids: number; style: string; base64: string }` et `Theme = { tokens: string; fontes: Fonte[] }`. Le champ s'appelle `fontes`, en français comme le reste du domaine ; les tâches 4 et 5 le lisent sous ce nom.

Les valeurs des tokens ci-dessous ont été **copiées le 31/08** depuis `/Users/recarnot/dev/erom-design-system-institutionnel/src/styles/tokens.css`. Elles ne sont ni inventées ni déduites du digest. Le plugin ne dépend pas de ce repo à l'exécution : la copie est faite une fois et versionnée.

- [ ] **Step 1: copier les fonts et leur licence**

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p plugin/skills/rapport/references/theme
DS=/Users/recarnot/dev/erom-design-system-institutionnel
cp $DS/dist/fonts/spectral-v15-latin-regular.woff2 plugin/skills/rapport/references/theme/
cp $DS/dist/fonts/spectral-v15-latin-600.woff2 plugin/skills/rapport/references/theme/
cp $DS/dist/fonts/spectral-v15-latin-italic.woff2 plugin/skills/rapport/references/theme/
cp $DS/fonts/OFL.txt plugin/skills/rapport/references/theme/
ls -la plugin/skills/rapport/references/theme/
```

Expected: quatre fichiers, les woff2 pesant respectivement 21 696, 22 936 et 22 712 octets.

La licence OFL 1.1 exige d'accompagner les fichiers de fonte de sa copie. `OFL.txt` n'est pas décoratif : ne pas le copier rendrait la redistribution non conforme.

- [ ] **Step 2: écrire `tokens.css`**

```css
/* Tokens du design system eRom institut, copiés le 2026-08-31 depuis
   erom-design-system-institutionnel/src/styles/tokens.css (paquet erom-institut 0.1.0).
   Figés ici pour que le plugin ne dépende d'aucun repo externe à l'exécution.
   Sous-ensemble : seuls les tokens utilisés par le rapport client sont repris. */
:root {
  --papier-carte: #FDFCFA;
  --papier-fond: #FAF8F5;
  --papier-surface: #F3F0EA;
  --papier-creux: #EBE7DF;
  --filet: #D9D4CC;
  --filet-clair: #E5E0D8;

  --encre: #1C1A19;
  --encre-2: #44403C;
  --encre-3: #57534E;
  --encre-muted: #78716C;
  --encre-estompee: #A8A29E;

  --bleu-50: #F0F2F9;
  --bleu-100: #E5E8F3;
  --bleu-200: #C5CCE5;
  --bleu-700: #122B78;
  --bleu-800: #0D2058;

  --garance-50: #FCF0F1;
  --garance-200: #F5C2C7;
  --garance-500: #CE1126;
  --garance-700: #8A1622;

  --vert-fond: #E7F2EC;
  --vert: #1E6E45;
  --vert-texte: #14492E;

  --esp-4: 4px;   --esp-8: 8px;   --esp-12: 12px; --esp-16: 16px;
  --esp-24: 24px; --esp-32: 32px; --esp-48: 48px; --esp-64: 64px;

  --rayon-champ: 2px;
  --serif: 'Spectral', Georgia, 'Times New Roman', serif;
}
```

- [ ] **Step 3: écrire `theme.ts`**

```typescript
// Charge les tokens et les fonts du thème institut, et rend les fonts encodées en base64.
// Seul module de ce chantier à toucher le disque hors CLI : il lit des fichiers versionnés, jamais le réseau.
import { join } from "node:path";

export type Fonte = { nom: string; poids: number; style: string; base64: string };
export type Theme = { tokens: string; fontes: Fonte[] };

const RACINE = join(import.meta.dir, "..", "..", "references", "theme");

const FONTES: { fichier: string; poids: number; style: string }[] = [
  { fichier: "spectral-v15-latin-regular.woff2", poids: 400, style: "normal" },
  { fichier: "spectral-v15-latin-600.woff2", poids: 600, style: "normal" },
  { fichier: "spectral-v15-latin-italic.woff2", poids: 400, style: "italic" },
];

export async function chargerTheme(racine = RACINE): Promise<Theme> {
  const tokens = await Bun.file(join(racine, "tokens.css")).text();
  const fontes: Fonte[] = [];
  for (const f of FONTES) {
    const octets = await Bun.file(join(racine, f.fichier)).arrayBuffer();
    fontes.push({ nom: "Spectral", poids: f.poids, style: f.style, base64: Buffer.from(octets).toString("base64") });
  }
  return { tokens, fontes };
}
```

- [ ] **Step 4: vérifier le chargement et le poids**

```bash
cd "$(git rev-parse --show-toplevel)"/plugin
bun -e '
import { chargerTheme } from "./skills/rapport/scripts/lib/theme.ts";
const t = await chargerTheme();
const total = t.fontes.reduce((n, f) => n + f.base64.length, 0);
console.log("fontes :", t.fontes.length, "| base64 total :", Math.round(total / 1024), "Ko");
console.log("tokens :", t.tokens.includes("--bleu-700: #122B78") ? "bleu Souverain présent" : "TOKENS INCOMPLETS");
'
```

Expected: `fontes : 3 | base64 total : 88 Ko` et `bleu Souverain présent`. Le total mesuré le 31/08 est de 89 796 octets.

- [ ] **Step 5: commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add plugin/skills/rapport/references/theme plugin/skills/rapport/scripts/lib/theme.ts
git commit -m "feat(rapport): thème institut figé, tokens et fontes Spectral sous OFL"
```

---

### Task 4: `rendu.ts`, le Markdown client vers un HTML autonome

**Files:**
- Create: `plugin/skills/rapport/scripts/lib/rendu.ts`
- Create: `plugin/skills/rapport/scripts/tests/rendu.test.ts`

**Interfaces:**
- Consumes: `RapportClient`, `SectionClient` (Task 1) ; `Theme`, `Fonte` (Task 3).
- Produces: `rendre(rapport: RapportClient, theme: Theme): string`, la chaîne HTML complète.

`rendre` est pur : il reçoit le thème en paramètre plutôt que de le charger, ce qui le rend testable sans lire 66 Ko de binaire.

- [ ] **Step 1: écrire les tests**

Créer `plugin/skills/rapport/scripts/tests/rendu.test.ts` :

```typescript
import { describe, test, expect } from "bun:test";
import { parseRapportClient } from "../lib/contrat";
import { rendre } from "../lib/rendu";
import type { Theme } from "../lib/theme";

const CLIENT = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();
const THEME: Theme = {
  tokens: ":root { --papier-fond: #FAF8F5; --encre: #1C1A19; --bleu-700: #122B78; }",
  fontes: [
    { nom: "Spectral", poids: 400, style: "normal", base64: "AAAA" },
    { nom: "Spectral", poids: 600, style: "normal", base64: "BBBB" },
    { nom: "Spectral", poids: 400, style: "italic", base64: "CCCC" },
  ],
};

const html = () => rendre(parseRapportClient(CLIENT), THEME);

describe("rendre", () => {
  test("le document est autonome : aucune ressource distante", () => {
    // L'invariant de D46. On assère le comportement, pas le texte du code.
    expect(html()).not.toMatch(/(src|href)\s*=\s*["']https?:\/\//);
  });

  test("les trois fontes sont embarquées en base64", () => {
    const out = html();
    expect(out.match(/@font-face/g)).toHaveLength(3);
    expect(out).toContain("data:font/woff2;base64,AAAA");
  });

  test("aucun identifiant de catalogue ne survit dans le HTML remis au client", () => {
    const avecCouvre = html();
    expect(avecCouvre).not.toContain("couvre:");
    expect(avecCouvre).not.toMatch(/\b(AI|FRESH|IDX|PERF|REND|ROBOTS|SD|SNIP|STRAT|TAG)-\d{2}\b/);
  });

  test("le titre du document est le nom du site", () => {
    expect(html()).toContain("<title>Comment chercher le bonheur</title>");
  });

  test("une section absente ne laisse pas de titre vide", () => {
    // La fixture n'a aucune Critique : « Ce qui bloque » ne doit pas apparaître.
    expect(html()).not.toContain("Ce qui bloque");
    expect(html()).toContain("Ce qui freine");
  });

  test("le document porte une feuille d'impression", () => {
    expect(html()).toContain("@media print");
  });

  test("le texte du client est présent et échappé", () => {
    const r = parseRapportClient(CLIENT.replace("Vos pages se chargent vite", "Moins de 2s & <2 requêtes"));
    const out = rendre(r, THEME);
    expect(out).toContain("Moins de 2s &amp; &lt;2 requêtes");
  });
});
```

- [ ] **Step 2: lancer les tests et vérifier qu'ils échouent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/rendu.test.ts`
Expected: FAIL, `Cannot find module '../lib/rendu'`.

- [ ] **Step 3: écrire `rendu.ts`**

```typescript
// Rendu du rapport client en HTML autonome. Pur : aucun accès disque ni réseau, le thème arrive en paramètre.
// Règles du design system institut : light uniquement, Spectral partout, filets plutôt qu'ombres,
// angles à 0, rien ne bouge au survol, la couleur porte du sens.
import type { RapportClient, SectionClient } from "./contrat";
import type { Theme } from "./theme";

const echapper = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Un corps de section : paragraphes séparés par une ligne vide, listes numérotées reconnues. */
function corpsHtml(corps: string): string {
  const blocs = corps.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocs.map((bloc) => {
    const lignes = bloc.split("\n");
    if (lignes.every((l) => /^\d+\.\s/.test(l))) {
      return `<ol>${lignes.map((l) => `<li>${echapper(l.replace(/^\d+\.\s/, ""))}</li>`).join("")}</ol>`;
    }
    return `<p>${lignes.map(echapper).join("<br>")}</p>`;
  }).join("\n");
}

function sectionHtml(s: SectionClient): string {
  return `<article class="trouvaille">\n<h3>${echapper(s.titre)}</h3>\n${corpsHtml(s.corps)}\n</article>`;
}

function groupeHtml(titre: string, sections: SectionClient[], classe: string): string {
  if (sections.length === 0) return "";
  return `<section class="${classe}">\n<h2>${echapper(titre)}</h2>\n${sections.map(sectionHtml).join("\n")}\n</section>`;
}

function fontFaces(theme: Theme): string {
  return theme.fontes.map((f) => `@font-face{font-family:'${f.nom}';font-style:${f.style};font-weight:${f.poids};font-display:swap;src:url(data:font/woff2;base64,${f.base64}) format('woff2');}`).join("\n");
}

const FEUILLE = `
*{box-sizing:border-box}
html{background:var(--papier-fond)}
body{background:var(--papier-fond);color:var(--encre);font-family:var(--serif);font-size:15px;line-height:1.65;margin:0;padding:var(--esp-64) var(--esp-24)}
.page{max-width:44rem;margin:0 auto}
h1{font-size:2rem;font-weight:600;line-height:1.2;margin:0}
.date{color:var(--encre-muted);margin:var(--esp-4) 0 var(--esp-24)}
.synthese{font-size:1.05rem;color:var(--encre-2);margin:0 0 var(--esp-48);padding-bottom:var(--esp-32);border-bottom:3px double var(--filet)}
h2{font-size:0.78rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--encre-muted);margin:var(--esp-48) 0 var(--esp-16);padding-bottom:var(--esp-8);border-bottom:1px solid var(--filet)}
h3{font-size:1.15rem;font-weight:600;margin:0 0 var(--esp-8)}
p,ol,ul{margin:0 0 var(--esp-12)}
ol,ul{padding-left:var(--esp-24)}
.trouvaille{margin-bottom:var(--esp-32)}
.action{background:var(--bleu-50);border-left:3px solid var(--bleu-700);padding:var(--esp-24);margin-bottom:var(--esp-32)}
.action h2{color:var(--bleu-700);border-bottom-color:var(--bleu-200);margin-top:0}
.action h3{color:var(--bleu-800)}
.bloque .trouvaille{border-left:3px solid var(--garance-500);padding-left:var(--esp-16)}
.bloque h2{color:var(--garance-700);border-bottom-color:var(--garance-200)}
.marche{background:var(--vert-fond);padding:var(--esp-16) var(--esp-24);margin-top:var(--esp-32)}
.marche h2{color:var(--vert-texte);border-bottom-color:transparent;margin:0 0 var(--esp-8)}
.marche ul{margin:0;list-style:none;padding:0}
.marche li{padding-left:var(--esp-16);position:relative}
.marche li::before{content:"·";position:absolute;left:0;color:var(--vert)}
.methode{margin-top:var(--esp-48);padding-top:var(--esp-16);border-top:1px solid var(--filet);color:var(--encre-muted);font-size:0.9rem}
@media print{
  @page{margin:18mm}
  body{padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .trouvaille,.action,.marche{break-inside:avoid}
  h2,h3{break-after:avoid}
}
`.trim();

export function rendre(rapport: RapportClient, theme: Theme): string {
  const action = `<section class="action">\n<h2>À faire cette semaine</h2>\n<h3>${echapper(rapport.action.titre)}</h3>\n${corpsHtml(rapport.action.corps)}\n</section>`;
  const marche = rapport.marche.length === 0 ? "" :
    `<section class="marche">\n<h2>Ce qui marche déjà</h2>\n<ul>${rapport.marche.map((l) => `<li>${echapper(l)}</li>`).join("")}</ul>\n</section>`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(rapport.site)}</title>
<style>
${fontFaces(theme)}
${theme.tokens}
${FEUILLE}
</style>
</head>
<body>
<main class="page">
<h1>${echapper(rapport.site)}</h1>
<p class="date">Revue du ${echapper(rapport.date)}</p>
<p class="synthese">${echapper(rapport.synthese)}</p>
${action}
${groupeHtml("Ce qui bloque", rapport.bloque, "bloque")}
${groupeHtml("Ce qui freine", rapport.freine, "freine")}
${marche}
<section class="methode">${corpsHtml(rapport.methode)}</section>
</main>
</body>
</html>
`;
}
```

- [ ] **Step 4: lancer les tests et vérifier qu'ils passent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/rendu.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add plugin/skills/rapport/scripts/lib/rendu.ts plugin/skills/rapport/scripts/tests/rendu.test.ts
git commit -m "feat(rapport): rendu.ts, le HTML autonome au profil institut"
```

---

### Task 5: `rapport.ts`, le CLI à deux gestes

**Files:**
- Create: `plugin/skills/rapport/scripts/rapport.ts`
- Create: `plugin/skills/rapport/scripts/tests/rapport-cli.test.ts`

**Interfaces:**
- Consumes: `latestAuditDir`, `parseReport` de `plugin/lib/report.ts` ; `lintDossier` (Task 2) ; `chargerTheme` (Task 3) ; `parseRapportClient` (Task 1) ; `rendre` (Task 4).
- Produces: `preparer(dossier: string): Promise<string>` qui rend le texte imprimé sur stdout ; `rendreDossier(dossier: string): Promise<void>`.

Le CLI porte deux gestes parce que Claude écrit au milieu du flux : `--preparer` sort la matière du jugement sans rien écrire, `--rendre` lint puis écrit le HTML. Un lint qui échoue n'écrit rien.

- [ ] **Step 1: écrire les tests**

Créer `plugin/skills/rapport/scripts/tests/rapport-cli.test.ts` :

```typescript
import { describe, test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preparer, rendreDossier } from "../rapport";

const RAPPORT = await Bun.file(`${import.meta.dir}/fixtures/report-chico-n0.md`).text();
const CLIENT = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();
const COMPLET = CLIENT.replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->");

async function dossierAvec(client?: string): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "rapport-"));
  await writeFile(join(d, "report.md"), RAPPORT);
  if (client) await writeFile(join(d, "rapport-client.md"), client);
  return d;
}

describe("preparer", () => {
  test("sort les six trouvailles graves et le compte de mineurs, sans rien écrire", async () => {
    const d = await dossierAvec();
    const sortie = await preparer(d);
    for (const id of ["SD-01", "SD-02", "IDX-02", "TAG-01", "STRAT-01", "STRAT-02"]) {
      expect(sortie).toContain(id);
    }
    expect(sortie).toContain("7");
    expect(await Bun.file(join(d, "rapport-client.md")).exists()).toBe(false);
  });

  test("ne sort aucune trouvaille mineure : elles ne sont pas la matière du rapport client", async () => {
    const sortie = await preparer(await dossierAvec());
    expect(sortie).not.toContain("SD-03");
  });
});

describe("rendreDossier", () => {
  test("écrit le HTML quand le lint passe", async () => {
    const d = await dossierAvec(COMPLET);
    await rendreDossier(d);
    const html = await Bun.file(join(d, "rapport-client.html")).text();
    expect(html).toContain("<title>Comment chercher le bonheur</title>");
    expect(html).not.toMatch(/(src|href)\s*=\s*["']https?:\/\//);
  });

  test("n'écrit RIEN quand le lint refuse", async () => {
    const d = await dossierAvec(CLIENT); // STRAT-01 et STRAT-02 non couvertes
    await expect(rendreDossier(d)).rejects.toThrow(/STRAT-01/);
    expect(await Bun.file(join(d, "rapport-client.html")).exists()).toBe(false);
  });
});
```

- [ ] **Step 2: lancer les tests et vérifier qu'ils échouent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/rapport-cli.test.ts`
Expected: FAIL, `Cannot find module '../rapport'`.

- [ ] **Step 3: écrire `rapport.ts`**

```typescript
#!/usr/bin/env bun
// Le verbe rapport : deux gestes autour du jugement de Claude.
//   --preparer [dossier]  sort la matière du rapport client, n'écrit rien
//   --rendre <dossier>    lint le Markdown client puis écrit le HTML
import { join } from "node:path";
import { latestAuditDir, parseReport, type Severity } from "../../../lib/report";
import { lintDossier } from "./lint-client";
import { parseRapportClient } from "./lib/contrat";
import { chargerTheme } from "./lib/theme";
import { rendre } from "./lib/rendu";

const GRAVES: readonly Severity[] = ["Critique", "Important"];

/** Résout le dossier d'audit : celui passé en argument, sinon le dernier sur disque. */
export async function resoudre(dossier?: string): Promise<string> {
  if (dossier) return dossier;
  const dernier = await latestAuditDir();
  if (!dernier) throw new Error("aucun audit trouvé sous seo/audits/. Lancer /erom-seo:audit d'abord.");
  return dernier;
}

/** La matière du jugement : trouvailles graves, points forts, compte de mineurs. N'écrit rien. */
export async function preparer(dossier: string): Promise<string> {
  const rapport = parseReport(await Bun.file(join(dossier, "report.md")).text());
  const graves = rapport.findings.filter((f) => GRAVES.includes(f.severity));
  const mineurs = rapport.findings.filter((f) => !GRAVES.includes(f.severity));
  const lignes: string[] = [
    `dossier : ${dossier}`,
    `site : ${rapport.site}`,
    `date de la collecte : ${rapport.date} (niveau ${rapport.niveau}, ${rapport.nbPages} pages)`,
    `points mineurs à annoncer : ${mineurs.length}`,
    "",
    `trouvailles graves (${graves.length}), à couvrir toutes :`,
  ];
  for (const f of graves) {
    lignes.push(
      "", `  ${f.id} [${f.severity}] ${f.title}`,
      `    pourquoi   : ${f.pourquoi}`,
      `    preuve     : ${f.preuve}`,
      `    correctif  : ${f.correctif}`,
      `    effort     : ${f.effort}`,
    );
  }
  lignes.push("", `points forts disponibles (${rapport.passed.length}) : ${rapport.passed.join(", ")}`);
  return lignes.join("\n");
}

/** Lint puis rend. Lève sans rien écrire si le lint refuse. */
export async function rendreDossier(dossier: string): Promise<void> {
  const refus = await lintDossier(dossier);
  if (refus.length > 0) throw new Error(`rapport client refusé :\n  - ${refus.join("\n  - ")}`);
  const client = parseRapportClient(await Bun.file(join(dossier, "rapport-client.md")).text());
  const theme = await chargerTheme();
  await Bun.write(join(dossier, "rapport-client.html"), rendre(client, theme));
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const geste = args.find((a) => a.startsWith("--")) ?? "--preparer";
  const dossier = await resoudre(args.find((a) => !a.startsWith("--")));
  if (geste === "--preparer") {
    console.log(await preparer(dossier));
  } else if (geste === "--rendre" || geste === "--rendre-seul") {
    try {
      await rendreDossier(dossier);
      console.log(`rapport client écrit : ${join(dossier, "rapport-client.html")}`);
    } catch (e) { console.error((e as Error).message); process.exit(1); }
  } else {
    console.error("usage : rapport.ts [--preparer|--rendre|--rendre-seul] [dossier]");
    process.exit(2);
  }
}
```

- [ ] **Step 4: lancer les tests et vérifier qu'ils passent**

Run: `cd plugin && bun test skills/rapport/scripts/tests/rapport-cli.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: lancer toute la suite, pour vérifier qu'aucun verbe existant n'a bougé**

Run: `cd plugin && bun test`
Expected: PASS. La suite comptait 434 tests avant ce chantier ; elle en compte 464 après les tâches 1 à 5 : 8 de contrat, 11 de lint, 7 de rendu, 4 de CLI.

- [ ] **Step 6: commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add plugin/skills/rapport/scripts/rapport.ts plugin/skills/rapport/scripts/tests/rapport-cli.test.ts
git commit -m "feat(rapport): le CLI à deux gestes, preparer et rendre"
```

---

### Task 6: `SKILL.md`, le registre et le gabarit

**Files:**
- Create: `plugin/skills/rapport/SKILL.md`
- Create: `plugin/skills/rapport/references/registre.md`
- Create: `plugin/skills/rapport/references/gabarit.md`
- Modify: `README.md` et `plugin/README.md` (cinq skills deviennent six)

**Interfaces:**
- Consumes: les commandes de Task 5.
- Produces: rien de programmatique.

- [ ] **Step 1: écrire `references/gabarit.md`**

Ouvrir la spec (`docs/superpowers/specs/2026-08-31-erom-seo-rapport-client-design.md`, section 4) et copier son bloc de gabarit tel quel, avec ses `{{...}}`. Le fichier produit est ce bloc, précédé de ces trois règles :

```markdown
# Gabarit de rapport-client.md

- Une section dont la liste est vide s'omet entièrement, titre compris. Un rapport sans trouvaille Critique n'a donc pas de section « Ce qui bloque » : c'est le cas nominal d'un site sain, pas une anomalie.
- Le commentaire `<!-- couvre: ID, ID -->` est la seule trace des identifiants. Il est retiré au rendu et n'atteint jamais le client, pas même dans la source du HTML.
- Le compte de la section Méthode vaut Mineur plus Info, pas Mineur seul.
```

- [ ] **Step 2: écrire `references/registre.md`**

Reprendre les huit règles de langue de la spec (section 5, « Le registre de langue »), une par titre `##`. Chacune reçoit ici un exemple juste et un exemple fautif que la spec ne porte pas, par exemple :

```markdown
## Gloser chaque terme technique à sa première apparition

Fautif  : « Votre canonical pointe vers une autre URL. »
Juste   : « L'adresse canonique, celle que vous désignez à Google comme la version officielle d'une page, pointe aujourd'hui vers une autre adresse. »
```

Une règle mérite son exemple à elle, parce que le cas est arrivé le premier jour et se reproduira à chaque nouveau client :

```markdown
## Une mesure prise sur un accès tout neuf se date au lieu de s'affirmer

Contexte : la propriété Search Console de ce site a été vérifiée le jour de l'audit.
Le rapport technique classe en Critique une page « inconnue de Google ».

Fautif  : « Une de vos pages est invisible sur Google. »
Juste   : « Une de vos pages n'a pas encore été explorée par Google. La connexion à
           Search Console date d'aujourd'hui, c'est probablement un simple délai.
           À revérifier au prochain point. »
```

La sévérité du rapport technique est une convention de catalogue, pas une traduction directe en inquiétude client.

Terminer par la liste des quatre défauts de la relecture adversariale (spec, section 5, « Relecture adversariale avant de rendre ») : une affirmation qui va au-delà de la preuve, un terme technique non glosé, un passage qui submerge un débutant, une dramatisation.

- [ ] **Step 3: écrire `SKILL.md`**

```markdown
---
name: rapport
description: Rapport d'audit SEO destiné au client final, en HTML autonome imprimable. Lit un audit déjà sur disque et le reformule sans jargon autour d'une seule action à faire dans la semaine. Ne collecte rien, ne corrige rien. Triggers : '/erom-seo:rapport', 'fais le rapport pour le client', 'le livrable client', 'un rapport présentable', 'envoyer l'audit au client'.
argument-hint: "[dossier d'audit] [--rendre-seul]"
---

# Rapport client

Tu produis un document que le client lit seul, sans toi, et sur lequel il agit. Il ne connaît pas le SEO. Tu ne peux rien affirmer qui ne soit pas déjà dans `report.md` : tu le dis autrement.

## 1. Préparer

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/rapport/scripts/rapport.ts --preparer [dossier]
```

Sans dossier, le dernier audit sous `seo/audits/` est pris. La sortie donne le site, la date, les trouvailles graves avec leur pourquoi et leur correctif, les points forts, et le nombre de points mineurs à annoncer.

Si aucun audit n'existe, la commande le dit : lancer `/erom-seo:audit <url>` d'abord.

## 2. Écrire

Écrire `<dossier>/rapport-client.md` d'après `references/gabarit.md`, en appliquant `references/registre.md`.

Le travail de jugement tient en trois gestes :
- **Choisir l'action.** Une seule, faisable dans la semaine par quelqu'un qui n'est pas technicien, avec le geste exact et le texte prêt à coller quand c'est possible. Elle se déduit des trouvailles, jamais d'un conseil générique.
- **Regrouper.** Trois trouvailles de balises se disent en un paragraphe. Le commentaire `<!-- couvre: TAG-01, TAG-02, TAG-04 -->` porte les identifiants ; le client ne les voit jamais.
- **Gloser.** Chaque terme technique est expliqué en une demi-phrase à sa première apparition.

Toutes les trouvailles Critique et Important doivent être couvertes. Aucune Mineur ni Info ne doit l'être : leur nombre suffit, dans la section Méthode.

## 3. Relire

Relire le texte en cherchant quatre défauts précis : une affirmation qui va au-delà de la preuve, un terme technique non glosé, un passage qui submerge un débutant, une dramatisation. Corriger avant de rendre.

## 4. Rendre

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/rapport/scripts/rapport.ts --rendre <dossier>
```

Le lint passe d'abord ; s'il refuse, il nomme chaque point et rien n'est écrit. Corriger le Markdown et relancer.

Afficher ensuite le chemin du HTML, et dire au client ce qu'il en fait : l'ouvrir d'un double-clic, l'imprimer en PDF par Cmd+P. Après une correction manuelle du Markdown, `--rendre-seul <dossier>` refait le HTML sans repasser par les temps 1 à 3.
```

- [ ] **Step 4: mettre les deux README à jour**

Dans `README.md`, ajouter la ligne au tableau des skills, après `console` :

```markdown
| `rapport` | Le livrable client : un HTML autonome et imprimable, bâti sur une seule action à faire dans la semaine |
```

Et remplacer « Cinq skills, sans abonnement tiers. » par « Six skills, sans abonnement tiers. »

Dans `plugin/README.md`, ajouter une section « Livrer au client » après « Lire les consoles », décrivant les deux gestes et le fait que le fichier est autonome.

- [ ] **Step 5: vérifier que la skill est découverte**

```bash
cd "$(git rev-parse --show-toplevel)"/plugin
RTK_DISABLED=1 command grep -c "skills" .claude-plugin/plugin.json
ls skills/
```

Expected: `skills/` liste six dossiers, dont `rapport`. Le manifeste pointe `./skills/` et découvre automatiquement : aucune modification de `plugin.json` n'est nécessaire.

- [ ] **Step 6: commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add plugin/skills/rapport/SKILL.md plugin/skills/rapport/references/registre.md plugin/skills/rapport/references/gabarit.md README.md plugin/README.md
git commit -m "docs(rapport): la skill, le registre client et le gabarit"
```

---

### Task 7: la recette sur CHICO

**Files:**
- Create: `docs/superpowers/plans/2026-08-31-erom-seo-chantier-6-recette.md`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: le document de recette, avec les résultats réels et les écarts numérotés `R-n`.

Cette tâche se fait avec Romain, sur le vrai site. Elle ne se simule pas.

- [ ] **Step 1: produire trois rapports clients réels**

CHICO a été outillé le 31/08 (propriété Search Console vérifiée, site dans Bing, `seo/strategy.md` validé). Trois audits y coexistent et couvrent trois formes de rapport. Les produire tous les trois, dans cet ordre :

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org
```

| Dossier | Ce qu'il éprouve | Attendu dans le rapport client |
|---|---|---|
| `seo/audits/2026-08-31-n1-2` | 1 Critique, 0 Important | « Ce qui bloque » présent, « Ce qui freine » **absent** |
| `seo/audits/2026-08-31-n0` | 0 grave, cas D49 | ni l'un ni l'autre ; l'action porte une mineure |
| `seo/audits/2026-08-28-n0-3` | 6 Important | plusieurs sections, le plus fourni des trois |

Lancer `/erom-seo:rapport <dossier>` sur chacun. Le premier est le cas nominal du suivi client, c'est celui que Romain lira en priorité.

**Piège de registre à surveiller sur le n1-2.** Son unique Critique est `IDX-06` : `/telekinesie` inconnue de Google, relevée le jour même où la propriété Search Console a été vérifiée. Le rapport technique le dit dans son correctif (« ça peut n'être qu'un délai de première exploration »). Le rapport client doit transmettre cette nuance et écrire « à revérifier au prochain point », jamais « votre page est invisible sur Google ». Aucun lint n'attrape ça : c'est le premier endroit où le jugement se prend en défaut, et c'est à vérifier à l'œil.

- [ ] **Step 2: vérifier AC-1, AC-2, AC-3, AC-4, AC-5 par commande**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org
D=$(ls -d seo/audits/* | tail -1)
ls $D/rapport-client.md $D/rapport-client.html                                    # AC-1
RTK_DISABLED=1 command grep -cE '(src|href)="https?://' $D/rapport-client.html    # AC-2, attendu 0
bun ../../plugin/skills/rapport/scripts/lint-client.ts $D                         # AC-3, attendu 0
RTK_DISABLED=1 command grep -cE '\b(AI|FRESH|IDX|PERF|REND|ROBOTS|SD|SNIP|STRAT|TAG)-[0-9]{2}\b' $D/rapport-client.html  # AC-4, attendu 0
```

Pour AC-5, injecter un tiret cadratin dans le Markdown, relancer le lint, vérifier qu'il sort 1 en nommant la ligne, puis retirer le tiret.

- [ ] **Step 2 bis: vérifier AC-8, le site sain**

C'est le cas réel de CHICO au 31/08, pas une simulation : l'audit ne porte aucune trouvaille grave.

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org
D=seo/audits/2026-08-31-n0
bun ../../plugin/skills/rapport/scripts/lint-client.ts $D                        # attendu 0
RTK_DISABLED=1 command grep -c "Ce qui bloque\|Ce qui freine" $D/rapport-client.html  # attendu 0
RTK_DISABLED=1 command grep -o "[0-9]* points mineurs" $D/rapport-client.md      # attendu « 2 points mineurs »
```

L'action doit porter `AI-01` et proposer le fichier `llms.txt`. Si Claude a choisi une autre action, ce n'est pas un échec : vérifier qu'elle s'appuie bien sur une des trois trouvailles réelles (`SD-03`, `PERF-01`, `AI-01`) et que le compte annoncé vaut 3 moins celles remontées.

- [ ] **Step 3: vérifier AC-6, l'impression**

Ouvrir `rapport-client.html` dans le navigateur, Cmd+P, enregistrer en PDF sans toucher aux options. Vérifier qu'aucune trouvaille n'est coupée entre deux pages et que le fond papier est conservé. Un rapport à moins de six sections ne prouve rien : si CHICO en produit moins, ajouter des sections au Markdown le temps du test.

- [ ] **Step 4: passer le rendu au juge**

```
/erom-taste-gate ds=institut <capture de la page 1> <capture de la page 2>
```

Le verdict PASS ou FAIL est collé dans la recette. Un FAIL se corrige dans `rendu.ts` avant de clore le chantier.

- [ ] **Step 5: vérifier AC-7, la re-génération**

Corriger une phrase à la main dans `rapport-client.md`, lancer `--rendre-seul`, vérifier que la phrase corrigée est dans le HTML.

- [ ] **Step 6: écrire la recette et la faire lire à Romain**

Reprendre la forme des recettes du dépôt : procédure par AC, section « Résultats du 2026-08-31 » avec OK ou KO et les sorties réelles, chaque écart numéroté `R-n` avec sévérité et cause, puis un bilan. Le rapport client produit est le premier vrai livrable de l'agence : Romain le lit comme le lirait le client, et son verdict sur le fond compte autant que les sept AC.

- [ ] **Step 7: commit**

```bash
cd /Users/recarnot/dev/erom-agence-seo
git add docs/superpowers/plans/2026-08-31-erom-seo-chantier-6-recette.md
git commit -m "docs(recette): chantier 6, le rapport client recetté sur CHICO"
```

---

## Ce que ce plan ne fait pas

- **Il ne touche pas aux cinq verbes existants.** Aucune modification de `collect.ts`, `plan.ts`, `checklist.ts`, `console.ts` ni de `plugin/lib/`.
- **Il n'ajoute aucune vérification au catalogue.** Le rapport client reformule ce qui existe.
- **Il n'envoie rien.** Pas de mail, pas de dépôt distant, aucune requête sortante.
- **Il ne traite pas le cas multi-audits.** Un rapport porte sur un audit ; comparer deux dates est un autre chantier.
