---
title: erom-seo, chantier 3 : le verbe build
date: 2026-08-28
status: proposed
project: erom-agence-seo
spec_mere: docs/superpowers/specs/2026-08-27-erom-seo-design.md
notes_liees:
  - docs/superpowers/specs/2026-08-28-erom-seo-strategy-design.md
  - docs/recherches/2026-08-28-nextjs-16-seo-api.md
  - .claude/notes/2026-08-27-reprise-2120.md
cobaye: /Users/recarnot/dev/chico-happiness (commentchercherbonheur.org, Next.js 16.1.1, 10 pages, stratégie validée, 13 trouvailles au 28/08)
---

# erom-seo, chantier 3 : `build`

Cette spec porte le chantier 3 de l'ordre D8 de la spec mère (section 6.2 : « Lit `strategy.md` et le dernier `report.md`. Corrige dans l'ordre Critique → Important → Mineur, l'id de la trouvaille dans chaque commit. Next.js App Router via ses références. Ne touche pas au contenu rédactionnel. Terminé quand un audit niveau 2 frais n'a plus ni Critique ni Important. »). Elle précise la spec mère là où le chantier 3 la touche et ne la répète pas. Décisions prises avec Romain le 2026-08-28 entre 12 h 56 et 13 h 05.

## 1. But

Fermer la boucle du scénario S2 : la stratégie dit ce que le site doit tenir, l'audit dit ce qu'il ne tient pas, `build` corrige le code jusqu'à ce qu'un audit niveau 2 frais n'ait plus ni Critique ni Important. La boucle build → audit → build est le système entier ; `build` ne juge jamais lui-même : le juge reste l'audit (spec mère D6, « des vérifications qui lisent le code source » battu).

Deux contraintes propres à ce verbe :

- **Le rédactionnel appartient à l'auteur.** `build` écrit des métadonnées, des données structurées, des fichiers de configuration. Les seuls textes visibles qu'il touche sont le h1 et la première phrase de chaque page, et seulement avec les valeurs d'une table que Romain a validée avant toute modification (D16).
- **Une trouvaille, un commit, l'id dans le message.** Le journal du build est le journal git du site ; rien d'autre n'est écrit dans `seo/` (D20).

## 2. Décisions

### D16. Les textes visibles passent par une table validée ; ensuite `build` est autonome

Avant toute modification, `build` présente, pour chaque page en défaut, le title, la description, le h1 et la première phrase qu'il propose, avec la valeur actuelle en face. Romain corrige ou dit OK, une seule fois. Puis `build` applique tout seul, commite par trouvaille et relance l'audit. Au second passage, seuls les textes nouveaux sont redemandés.

Cas concret qui a tranché : sur `/methode` de chico, la recette AC-5 du chantier 2 a remplacé le h1 « L'Algorithme de l'Âme » par « La Méthode Quantique Chico ». C'est le texte de l'auteur d'un site parodique : le mot-clé doit y entrer, mais pas sans lui.

Battu : `build` ne touche que le technique (metadata, JSON-LD, canonical, robots, sitemap, IndexNow) et laisse h1 et textes en liste de choses à faire. Plus pur, mais STRAT-01 ne passe jamais au vert sans un humain et la boucle s'arrête à mi-chemin.

Battu : `build` autonome de bout en bout, Romain lit le diff après. Le plus rapide, mais un h1 réécrit sans demander, c'est toucher au rédactionnel, ce que la spec mère interdit. Décision de Romain, 2026-08-28, 12 h 56.

### D17. `build` fait tout : serveur local, audit niveau 2, boucle

`build` lance lui-même le serveur de dev du site sur un port libre, attend qu'il réponde, lance l'audit niveau 2, éteint le serveur. S'il reste du Critique ou de l'Important après le premier passage, il refait un passage, puis rend la main avec ce qui reste. Deux passages au plus : au-delà, c'est qu'une trouvaille résiste et qu'un humain doit regarder.

Si le serveur ne démarre pas (pas de script `dev`, port muet après le délai, variables d'environnement manquantes), `build` retombe sur l'autre option et le dit : « lance `bun run dev`, puis `/erom-seo:audit http://localhost:3000` ».

Battu : `build` s'arrête après les commits et Romain lance l'audit. Moins de mécanique, mais la boucle est le produit. Décision de Romain, 2026-08-28, 12 h 58.

### D18. Un script de plan, puis la skill

`plan.ts` joint la stratégie, le dernier rapport et les JSON dérivés de l'audit, et écrit un plan machine : trouvailles ouvertes triées et classées, valeurs réelles par page, bloc Organization prêt, fichier IndexNow, base canonique. Claude fait ensuite les modifications de code en suivant une référence par id de trouvaille. Même partage que `strategy-eval.ts` (chantier 2) : la partie mécanique dans un script testé, la partie intelligente chez Claude.

Battu : la skill seule, sans script. Moins de code, mais rien ne garantit qu'une trouvaille n'est pas oubliée, et le bloc Organization sort de la tête du modèle (sameAs inventés). Battu aussi : des scripts qui réécrivent le code du site par AST. Déterministe, mais fragile sur un repo quelconque (composants client, layouts sur mesure) et hors de proportion avec le gain. Décision de Romain, 2026-08-28, 13 h 00.

### D19. Le genre d'une trouvaille est une table fixe par id

Chaque id du catalogue a un genre : `code` (build corrige), `texte` (build corrige, valeurs de la table validée seulement), `hors-build` (hébergeur, DNS, performance, contenu à produire, niveau 1 : build ne touche pas, liste à la fin avec l'endroit exact). La table vit dans le code du plan et un test garantit que tout id du catalogue en a un. Un id inconnu (par exemple un futur LVL1-01) est `hors-build` par défaut.

Battu : Claude décide du genre à la lecture du Correctif. Souple, mais non testable, et c'est exactement le genre de choix qui dérive d'une session à l'autre.

### D20. Pas de journal de build dans `seo/`

Le code est la mémoire (les textes validés y sont), les commits sont le journal (l'id dans chaque message), l'audit frais est l'état. Le seul fichier écrit est `derived/build-plan.json` dans le dossier de l'audit qui l'a produit, à côté de `strategy-eval.json` : traçabilité, pas journal.

Battu : `seo/build/<date>/textes.md` pour porter la table validée. Un troisième fichier à tenir synchrone avec le code pour un gain nul tant que la reprise consiste à relancer `build` sur un audit frais.

### D21. La base canonique est l'hôte observé, pas celui du code ni de la stratégie

L'URL canonique, `metadataBase`, la base du sitemap et la déclaration du sitemap dans robots.txt doivent porter l'hôte réellement servi. `plan.ts` le lit dans le dernier audit de niveau 0 : l'origine de l'URL finale de la home après redirections. Sans audit niveau 0 (site pas encore en ligne), il prend `https://<site de la stratégie>` et le signale.

Cas concret : le code de chico dit `https://commentchercherbonheur.org` (apex) partout, la prod répond en www (l'apex redirige en 307). Un canonical construit depuis le code ne serait pas auto-référent, ce que IDX-02 demande.

Battu : l'hôte de la stratégie. C'est une déclaration, pas une observation ; la stratégie de chico écrit le domaine nu.

### D22. Le rapport se lit par un parseur partagé, `plugin/lib/report.ts`

Même raison que D13 du chantier 2 : `launch` (chantier 4) lira le même rapport (« audit niveau 2 vert »). Le format est strict et `lint-report.ts` le fait respecter ; le parseur suit les mêmes règles.

## 3. Composants

```
plugin/
  lib/
    report.ts                          parseReport, latestAuditDir (D22)
    tests/report.test.ts
    tests/fixtures/report-chico-n0.md  copie du vrai rapport de chico du 28/08
  skills/
    audit/scripts/check-sources.ts     vérifie aussi skills/build/references/*.md
    build/
      SKILL.md                         le verbe, six temps (section 7)
      scripts/
        plan.ts                        CLI : lit, écrit derived/build-plan.json, imprime le bilan
        lib/plan.ts                    buildPlan(), KINDS, tri, bloc Organization (pur, testé)
        lib/recipes.ts                 parseRecipes() pour la référence (tests et check-sources)
        tests/plan.test.ts
        tests/recipes.test.ts
        tests/fixtures/chico/          strategy.md, report.md, manifest.json, pages.json, strategy-eval.json
      references/
        nextjs.md                      une recette par famille de trouvailles, Next.js 16 App Router
        autre-stack.md                 hors Next.js : lire le repo, viser le même HTML
```

Ce qui ne change pas : `collect.ts`, `strategy-eval.ts`, `lint-report.ts`, le catalogue `checks/`, `plugin/lib/strategy.ts`.

## 4. `plugin/lib/report.ts`

```ts
export type Severity = "Critique" | "Important" | "Mineur" | "Info";
export type Finding = { severity: Severity; id: string; title: string; preuve: string; pourquoi: string; source: string; correctif: string; effort: string };
export type Report = {
  site: string; date: string; niveau: number; couche: boolean; nbPages: number; nbChecks: number;
  findings: Finding[]; passed: string[]; notSeen: string; counts: Record<Severity, number>;
};
export function parseReport(md: string): Report;            // lève ReportError { errors } si l'en-tête ou un bloc est illisible
export async function latestAuditDir(seoDir = "seo"): Promise<string | null>;
```

Règles de lecture, alignées sur `lint-report.ts` :
- `site` : première ligne `# Audit SEO/GEO : <site>`. `date`, `niveau`, `couche`, `nbPages`, `nbChecks` : la ligne de métadonnées dans les trois premières lignes (`<date> · Niveau <n> (…) · Couche stratégique : oui|non … · <p> pages collectées · <c> vérifications`).
- Trouvailles : blocs `### [Sévérité] ID : titre` de la section « Trouvailles ». Un champ (`Preuve`, `Pourquoi`, `Source`, `Correctif`, `Effort`) court jusqu'au champ suivant ou à la fin du bloc : le Correctif de SD-02 dans le rapport de chico tient sur douze lignes indentées (un JSON), il doit revenir entier.
- `passed` : les ids en tête de ligne de « Vérifications passées ». `notSeen` : le texte brut de « Ce que je n'ai pas pu voir ».
- `latestAuditDir` : parmi `seo/audits/*` qui contiennent un `report.md` (chico a deux dossiers n2 collectés sans rapport : ignorés), le plus récent par la date du nom, puis par la date de modification de `report.md` (deux audits le même jour, niveaux 0 et 2 : le dernier écrit gagne).

## 5. `plan.ts` et `build-plan.json`

### 5.1 Entrées

- `seo/strategy.md` par `parseStrategy` (`plugin/lib/strategy.ts`). Refusé par le parseur : arrêt, erreurs affichées.
- Le dossier d'audit : `--audit <dossier>` ou `latestAuditDir()`. Dedans : `report.md`, `raw/manifest.json`, `derived/pages.json`, `derived/strategy-eval.json` (absent si l'audit a tourné sans stratégie : le plan le signale, les champs `missing` restent `null`).
- Pour la base canonique : le dernier `seo/audits/*-n0*/raw/manifest.json` (même s'il n'est pas le dernier audit), champ `pages[0].final` (la home, première page collectée).
- `package.json` du répertoire courant : `next` dans `dependencies` ou `devDependencies` vaut `stack: "nextjs"`, sinon `"autre"`.

### 5.2 Sortie

Écrite dans `<audit>/derived/build-plan.json`, une ligne de bilan sur stdout :

```
plan : 12 trouvailles ouvertes (0 Critique, 6 Important, 6 Mineur) : 8 code, 3 texte, 1 hors build ; 10 pages avec des textes à valider ; base canonique https://www.commentchercherbonheur.org (audit niveau 0)
```

```ts
export type Kind = "code" | "texte" | "hors-build";
export type PlanFinding = { id: string; severity: Severity; title: string; kind: Kind; correctif: string; effort: string; ou?: string; origine?: string };
export type PlanPage = {
  page: string; intention: string; motCle: string; secondaires: string[]; cadence: string;
  current: { url: string | null; status: number | null; title: string | null; description: string | null; h1: string[]; opening: string; canonical: string | null; jsonldTypes: string[]; datePublished: string | null; dateModified: string | null; challenge: boolean } | null;
  missing: { title: boolean; h1: boolean; opening: boolean } | null;   // depuis strategy-eval.json, null si absent
  textes: ("title" | "description" | "h1" | "opening")[];               // ce que la table doit proposer pour cette page
};
export type BuildPlan = {
  generatedAt: string;
  audit: { dir: string; date: string; niveau: number; counts: Record<Severity, number> };
  strategy: { path: string; statut: string; date: string; site: string };
  stack: "nextjs" | "autre";
  canonicalBase: { origin: string; source: "audit niveau 0" | "stratégie" };
  findings: PlanFinding[];      // Info exclues ; tri Critique, Important, Mineur ; puis code, texte, hors-build ; puis id
  pages: PlanPage[];            // une par ligne du tableau Pages ↔ mots-clés, dans l'ordre de la stratégie
  organization: { "@context": "https://schema.org"; "@type": "Organization"; name: string; url: string; description: string; sameAs: string[]; telephone?: string; address?: string };
  indexnow: { key: string; file: string } | null;   // file = public/<clé>.txt
  warnings: string[];           // « audit sans couche stratégique », « base canonique prise dans la stratégie », « page /x absente de l'audit »
};
export function buildPlan(input: { strategy: Strategy; report: Report; manifest: Manifest; pages: PageFacts[]; strategyEval: StrategyEval | null; homeFinalUrl: string | null; deps: string[]; auditDir: string }): BuildPlan;
```

Règles :
- `pages[].current` vient de `derived/pages.json`, apparié par chemin (`pathOf` et `normalizeUrl` de `lib/strategy-eval.ts`) ; page absente de la collecte : `current: null` et un warning. `missing` vient de `strategy-eval.json` (`inTitle`, `inH1`, `inOpening` faux).
- `textes` : `h1` si `missing.h1` ou `current.h1` vide ; `opening` si `missing.opening` ; `title` si `missing.title`, `current.title` nul, ou TAG-01 ouverte ; `description` si `current.description` nulle ou TAG-02 ouverte. Une page avec au moins un texte requis reçoit les quatre champs dans la table (on propose l'ensemble cohérent, Romain amende), les champs requis marqués.
- `organization` : `name` = Entité.Nom, `url` = `canonicalBase.origin` + `/`, `description` = la phrase d'identité, `sameAs` = ceux de la stratégie ; `telephone` et `address` seulement si la stratégie porte un NAP.
- `indexnow` : la clé de la stratégie si présente, `file: "public/<clé>.txt"`.
- `ou` (hors-build) : l'endroit exact, depuis la table KINDS : IDX-03 « certificat et redirection HTTP chez l'hébergeur (Vercel : automatique) », IDX-04 « Vercel : Project Settings, Domains, Redirect to ; ou DNS de l'hébergeur », PERF-01 « PageSpeed Insights, puis un chantier de performance à part », STRAT-04 « calendrier éditorial : mettre à jour le contenu à la cadence promise ». Une page prévue absente de la collecte (STRAT-01, `found: false`) est aussi hors build : « page à créer, contenu à écrire ».
- Quand le plan part d'un audit niveau 2, les vérifications non applicables en local (IDX-03, IDX-04, PERF-01) n'y sont jamais évaluées : elles disparaîtraient du plan si un audit niveau 2 plus récent existe. `plan.ts` va donc aussi lire le `report.md` du dernier audit niveau 0, s'il diffère de l'audit du plan, et rapatrie ses trouvailles encore ouvertes dont le genre est `hors-build`, dédoublonnées par id (une trouvaille déjà présente dans le plan ne se répète pas). Chacune porte alors `origine` : le dossier de l'audit niveau 0 d'où elle vient. Sans audit niveau 0 différent, rien à fusionner. Corrige R-6 de la recette du 2026-08-29 : le premier build avait perdu IDX-04 en restitution parce que le plan était reparti de l'audit niveau 2 tout vert, sans IDX-04 à évaluer.

### 5.3 La table KINDS

| Genre | Ids |
|---|---|
| code | ROBOTS-01 à 06, SNIP-01 à 03, IDX-01, IDX-02, IDX-05, SD-01, SD-02, SD-03, TAG-01, TAG-02, TAG-04, FRESH-01, FRESH-02, REND-01, AI-02, STRAT-03 |
| texte | STRAT-01, STRAT-02, TAG-03 |
| hors-build | IDX-03, IDX-04, PERF-01, STRAT-04, tout id inconnu |

AI-01 est Info : jamais dans le plan. STRAT-02 est `texte` pour la phrase sur la home ; sa moitié Organization.description est couverte par le bloc Organization (recette SD-02). STRAT-01 est `texte` pour le h1 et l'ouverture ; sa moitié title est couverte par la recette TAG-01 avec les valeurs de la table.

## 6. La référence Next.js

`references/nextjs.md`, dérivée du corpus `inspiration/nextjs-seo` (hors git) et de la recherche du 28/08 (`docs/recherches/2026-08-28-nextjs-16-seo-api.md`), jamais copiée. Format strict, un bloc par recette :

````
### Canonical (IDX-02)
Fichiers : app/layout.tsx (metadataBase), page.tsx ou layout.tsx de chaque segment (alternates.canonical)
Recette  :
```tsx
…
```
Piège    : metadataBase doit être l'hôte réellement servi (www ou apex), pas celui qu'on croit ; sinon le canonical n'est pas auto-référent.
Piège    : metadata ne s'exporte que d'un composant serveur ; page « use client » = layout.tsx de segment ou page serveur qui enveloppe.
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « … »
````

Le titre porte les ids couverts entre parenthèses. `parseRecipes(md)` rend `{ title, ids, fichiers, pieges, sources }` par bloc. Un test garantit que tout id `code` ou `texte` de KINDS figure dans au moins un bloc ; `check-sources.ts` vérifie chaque citation mot pour mot, avec pour ces fichiers les domaines `nextjs.org`, `vercel.com`, `react.dev` en plus des domaines officiels des moteurs (`BUILD_DOMAINS`, distinct d'`OFFICIAL_DOMAINS` : un rapport d'audit ne cite jamais nextjs.org).

Les blocs (treize) :

1. `robots.ts` (ROBOTS-01 à 06) : `MetadataRoute.Robots`, règles par user-agent, `sitemap` sur l'hôte observé.
2. Directives robots par page (SNIP-01 à 03) : `metadata.robots`, `noindex` sur un segment entier (`/checkout`, `/dashboard` chez chico) ; jamais de `max-snippet` bas sur une page clé.
3. `sitemap.ts` (IDX-01) : `MetadataRoute.Sitemap`, `url` sur l'hôte observé ; `lastModified` = une vraie date (dernier commit du fichier de la page, `git log -1 --format=%cI -- <fichier>`), jamais `new Date()` (Google ignore un `lastmod` qu'il ne peut pas vérifier ; chico le fait aujourd'hui sur dix pages).
4. Canonical (IDX-02) : `metadataBase` racine sur l'hôte observé, `alternates.canonical` relatif par page, résolu par Next.js.
5. Vraie 404 (IDX-05) : `app/not-found.tsx`, `notFound()` dans les routes dynamiques ; un catch-all qui rend 200 est le cas typique.
6. JSON-LD Organization sur la home (SD-02, STRAT-02, STRAT-03) : un composant serveur `OrganizationJsonLd` qui rend `<script type="application/ld+json">` avec `JSON.stringify(plan.organization).replace(/</g, "\\u003c")`, placé dans `app/page.tsx`. Le bloc vient du plan, jamais réécrit à la main.
7. JSON-LD par page (SD-01, SD-03, FRESH-01, FRESH-02) : `WebPage` par défaut, `Article` pour une page éditoriale, `datePublished` et `dateModified` depuis git (premier et dernier commit du fichier), une date visible `<time dateTime>` cohérente. `Last-Modified` : non émis par Next.js sur Vercel (vérifié sur chico le 28/08 : `etag` et `cache-control` seulement) ; le double signal est date visible + `dateModified`, l'en-tête reste hors build.
8. Title et description (TAG-01, TAG-02) : `metadata` par segment (`title` simple sous le `template` du layout racine, `description`) ; contrainte composant serveur (piège 1). Les valeurs viennent de la table validée.
9. h1 et ouverture (TAG-03, STRAT-01) : édition du JSX de la page, valeurs de la table validée, un seul h1 par page.
10. Langue (TAG-04) : `<html lang="fr">` dans le layout racine.
11. Contenu sans JavaScript (REND-01) : le texte principal rendu par un composant serveur ; un texte chargé en `useEffect` ou derrière un état client n'existe pas pour un bot.
12. IndexNow (AI-02) : `public/<clé>.txt` avec la clé en contenu, servi sur `/<clé>.txt`.
13. Hors build (IDX-03, IDX-04, PERF-01, STRAT-04) : pas de recette, l'endroit où agir (repris dans KINDS.ou), et pour IDX-04 la raison : la redirection apex vers www se règle chez Vercel (Domains, Redirect to), `next.config` n'est pas le bon endroit.

En tête du fichier, les pièges transverses, tous vérifiés le 28/08 : metadata côté serveur seulement ; `metadataBase` = hôte servi ; un champ `openGraph` redéfini dans une page remplace tout l'objet du layout (pas de fusion) ; `title.template` ne s'applique pas à la page du même segment ; `robots.other` exige Next.js 16.3 ; `lastModified: new Date()` est un signal faux ; `Last-Modified` n'est pas émis.

`references/autre-stack.md` tient en une page : lire le repo, trouver où vivent le `<head>`, le robots.txt, le sitemap et les pages, viser le même HTML de sortie que la référence Next.js décrit, sans recette dédiée en v1.

## 7. Le verbe `build`

`SKILL.md`, frontmatter : `name: build`, `argument-hint: "[--audit <dossier>]"`, triggers `/erom-seo:build`, « corrige le SEO du site », « applique la stratégie au code », « fais passer l'audit au vert ».

### 7.0 Préparer

1. Répertoire courant : le repo du site. `seo/strategy.md` absent : proposer `/erom-seo:strategy` et s'arrêter. `lint-strategy.ts` non nul : afficher les erreurs et s'arrêter. Statut brouillon : le dire, continuer.
2. `git status --porcelain` non vide : s'arrêter (« commite ou range tes modifications d'abord » ; `build` commite par trouvaille et ne doit pas mélanger). Branche `main` ou `master` : créer `seo-build-<AAAA-MM-JJ>` ; autre branche : y rester. Jamais de push.
3. Stack : `next` dans `package.json` → `references/nextjs.md` ; sinon `references/autre-stack.md`.
4. Scripts : `${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/` ; `bun install --frozen-lockfile` dans le plugin si `node_modules` manque.
5. Aucun `seo/audits/*/report.md` : aller à 7.4 pour produire l'audit, puis reprendre en 7.1.

### 7.1 Planifier

`bun ${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/plan.ts [--audit <dossier>]`. Lire `derived/build-plan.json`. `warnings` non vide : les répéter à l'utilisateur.

### 7.2 Valider les textes

Si `pages[].textes` est vide partout : sauter. Sinon, une liste par page, lisible sur mobile (pas de tableau à quatre colonnes de texte) :

```
/telekinesie · mot-clé « télékinésie » · requis : title, h1, ouverture
  title       : Télékinésie : la méthode MindBridge 6Ge | Institut C.H.I.C.O.
                actuel : L'Institut C.H.I.C.O. | Optimisation Quantique de l'Ego
  description : …
                actuel : …
  h1          : …
                actuel : …
  ouverture   : …
                actuel : …
```

Règles de rédaction : le mot-clé principal au début du title, la marque après le séparateur du `template` du layout racine ; title et description uniques par page ; description qui reprend le mot-clé et une secondaire ; h1 unique, avec le mot-clé, dans le ton du site (chico : parodique, le mot-clé placé sans casser la blague) ; première phrase qui reprend le mot-clé. Guides de longueur, pas de limites : ~60 caractères pour le title, ~155 pour la description.

Romain répond OK ou amende (par page, par champ). Boucler jusqu'à OK. **Aucune modification de fichier avant l'OK.** Au second passage, seules les pages dont `textes` est non vide et qui n'ont pas déjà été validées sont présentées.

### 7.3 Appliquer

Dans l'ordre de `findings`. Pour chaque trouvaille `code` ou `texte` :

1. Lire le bloc de la référence qui porte son id, puis les fichiers visés. Déjà conforme (la modification a été faite avant, par exemple le title de `/methode` chez chico) : noter « déjà conforme », pas de commit.
2. Modifier. Règle texte : le h1 et la première phrase seulement, avec les valeurs validées ; jamais un autre paragraphe, jamais un lien, une image ou une classe CSS ; ne rien supprimer. Le bloc Organization est celui du plan, collé tel quel.
3. `bun x tsc --noEmit` si `tsconfig.json` existe (2 s sur chico). Échec : corriger avant de commiter.
4. Commit : `seo(IDX-02): canonical absolu et auto-référent sur chaque page`. Une modification qui règle plusieurs ids porte tous les ids : `seo(SD-02, STRAT-02, STRAT-03): bloc Organization sur la home`. Le commit des textes le dit : `seo(TAG-01, TAG-02, TAG-03, STRAT-01): title, description, h1 et ouverture, textes validés par Romain le 2026-08-28`.

Trouvailles `hors-build` : rien, gardées pour 7.6. Après la dernière : `bun run build` (Next.js) doit passer. Échec : montrer l'erreur, corriger si c'est une modification de `build` ; sinon s'arrêter, commits gardés.

### 7.4 Vérifier

1. Serveur : si `http://localhost:3000/robots.txt` répond 200 et déclare un `Sitemap:` sur l'hôte de la stratégie (`sameSite`, apex et www confondus), c'est le serveur de dev de Romain sur le même repo : l'utiliser, ne pas l'éteindre. Sinon : `bun run dev --port <port>` en arrière-plan, journal dans le scratchpad, premier port libre entre 3456 et 3466 (vérifié sur chico : `bun run dev --port 3999` transmet le port à `next dev`, prêt en une seconde). Attendre : `curl --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors -s -o /dev/null -w '%{http_code}' --max-time 120 http://localhost:<port>/robots.txt`, puis la même chose sur `/`. Muet : D17, retomber sur « lance l'audit toi-même » avec le chemin du journal.
2. Audit : `/erom-seo:audit http://localhost:<port>` (la skill audit, invoquée depuis `build`). Elle écrit `seo/audits/<date>-n2*/`.
3. Éteindre le serveur que `build` a lancé (le pid noté au lancement), jamais celui de Romain.

### 7.5 Boucler

Relire le nouveau rapport (`plan.ts` sur le nouvel audit imprime les comptes). Critique + Important > 0 et un seul passage fait : retour en 7.1 avec ce nouvel audit. Sinon : 7.6.

### 7.6 Restituer

Dans l'ordre : le chemin du dernier rapport et sa ligne « En bref » ; les commits (`git log --oneline <début>..HEAD`) ; les « déjà conforme » ; les hors build, chacun avec son `ou` ; les textes que Romain a refusés ; ce qui reste en Critique ou Important après deux passages, s'il y a lieu. Proposer la suite : régler les hors build, puis `/erom-seo:launch` (chantier 4). Rappeler que rien n'est poussé et sur quelle branche on est.

## 8. Erreurs

| Situation | Comportement |
|---|---|
| Pas de `seo/strategy.md` | Proposer `/erom-seo:strategy`, s'arrêter |
| Stratégie refusée par le lint | Afficher les erreurs, s'arrêter |
| Arbre git sale | S'arrêter, demander de commiter ou ranger |
| Pas d'audit avec rapport | Produire l'audit d'abord (7.4), puis planifier |
| Audit sans couche stratégique | Warning du plan ; les pages n'ont pas de `missing` ; proposer de relancer l'audit avec la stratégie |
| Pas de script `dev`, port muet après 120 s, `bun run dev` en erreur | « lance le serveur et `/erom-seo:audit http://localhost:3000` toi-même », chemin du journal |
| `tsc` ou `bun run build` en échec | Corriger si c'est une modification de build ; sinon s'arrêter, commits gardés, erreur montrée |
| Page prévue absente du site | Hors build « page à créer, contenu à écrire », jamais une page vide créée |
| Deux passages et il reste du Critique ou de l'Important | S'arrêter, lister ce qui reste et pourquoi |

## 9. Tests

- `plugin/lib/tests/report.test.ts` : le vrai rapport n0 de chico (fixture) donne 13 trouvailles, comptes 0/6/6/1, niveau 0, couche oui, 31 vérifications, 14 passées, le Correctif de SD-02 entier ; un rapport minimal conforme au gabarit ; les rapports que `lint-report.test.ts` accepte se parsent sans erreur ; en-tête absent = `ReportError`.
- `skills/build/scripts/tests/plan.test.ts` : sur les fixtures chico, `buildPlan` rend 12 trouvailles (AI-01 exclue) dans l'ordre attendu, IDX-04 hors build avec `ou` qui contient « Vercel », STRAT-01, STRAT-02, TAG-03 texte, le reste code ; `organization` avec les 3 sameAs, le nom et la phrase d'identité ; `canonicalBase` www depuis la home finale, et « stratégie » quand `homeFinalUrl` est nul ; `indexnow.file` = `public/bf498d4959b94b88aa7bb3902433735f.txt` ; `pages` : 10, chacune avec `textes` non vide (chico a title et description identiques partout), `/audit` et `/legal` avec `h1` requis ; `strategyEval: null` donne `missing: null` et un warning.
- Invariants : tout id de `parseChecks` sur `references/checks/*.md` a un genre dans KINDS ; tout id `code` ou `texte` figure dans un bloc de `nextjs.md` (`parseRecipes`) ; chaque bloc a au moins une Source sur un domaine de `BUILD_DOMAINS`. Aucun compte figé.
- `plan.ts` en CLI (`Bun.spawnSync`) : sur les fixtures copiées dans un dossier temporaire, écrit `derived/build-plan.json` et imprime la ligne de bilan ; sans audit : exit 1 et message lisible.
- `check-sources.ts` couvre `nextjs.md` (réseau, lancé à la recette et avant fusion).
- La skill elle-même n'a pas de test unitaire : la recette (section 10) la couvre.

## 10. Critères d'acceptation

Cobaye : `chico-happiness`, répertoire courant `/Users/recarnot/dev/chico-happiness`, branche de travail créée par `build`. Le diff laissé par la recette du chantier 2 sur `/methode` est commité ou rangé avant (7.0.2).

- **AC-1**
  Comportement : quand je lance `bun <plugin>/skills/build/scripts/plan.ts` dans chico avec l'audit n0 du 28/08 et la stratégie validée, alors `seo/audits/2026-08-28-n0/derived/build-plan.json` existe avec 12 trouvailles, IDX-04 hors build (« Vercel »), STRAT-01, STRAT-02 et TAG-03 texte, un bloc Organization à 3 sameAs, la base canonique `https://www.commentchercherbonheur.org` (audit niveau 0), le fichier IndexNow `public/bf498d4959b94b88aa7bb3902433735f.txt`, et 10 pages avec des textes requis.
  Vérifié par : `jq '.findings | length' derived/build-plan.json` égale 12 ; `jq '[.findings[] | select(.kind == "hors-build") | .id]'` égale `["IDX-04"]` ; `jq '.organization.sameAs | length'` égale 3 ; `jq -r '.canonicalBase.origin'` ; `jq '[.pages[] | select(.textes | length > 0)] | length'` égale 10.

- **AC-2**
  Comportement : quand je lance `/erom-seo:build` dans chico, alors la liste des textes proposés pour les 10 pages s'affiche (title, description, h1, ouverture, chacun avec l'actuel) avant toute modification, et rien n'est modifié tant que je n'ai pas dit OK.
  Vérifié par : la liste dans la conversation ; `git status --porcelain` vide pendant la validation.

- **AC-3**
  Comportement : quand j'ai dit OK, alors `build` commite une fois par trouvaille (ou groupe d'ids) avec l'id dans le message, note « déjà conforme » pour ce qui l'est déjà, et `bun run build` passe avant l'audit.
  Vérifié par : `git log --oneline main..seo-build-2026-08-28` : chaque ligne commence par `seo(` et porte au moins un id ; la sortie de `bun run build` se termine sans erreur.

- **AC-4**
  Comportement : quand les commits sont faits, alors `build` lance lui-même le serveur de dev sur un port libre, produit `seo/audits/<date>-n2*/report.md`, et éteint le serveur.
  Vérifié par : le nouveau dossier existe et son rapport passe `lint-report.ts` ; `lsof -i :<port>` vide après la fin.

- **AC-5**
  Comportement : quand l'audit niveau 2 frais est lu, alors il n'a ni Critique ni Important : STRAT-01 passée sur les 10 pages, SD-02, STRAT-02, STRAT-03 passées, IDX-02 passée, TAG-01 et TAG-02 passées, AI-02 passée.
  Vérifié par : la ligne « En bref » du rapport (`0 Critique · 0 Important`) ; `grep -c "^STRAT-0[1-3]\|^SD-02\|^IDX-02\|^TAG-0[12]\|^AI-02" <rapport>` dans la section « Vérifications passées » égale 8.

- **AC-6**
  Comportement : quand `build` restitue, alors IDX-04 apparaît en hors build avec l'endroit exact (Vercel, Domains, Redirect to), même si le plan est reparti du dernier audit niveau 2 (où IDX-04 n'est jamais évalué, non applicable en local) : `plan.ts` va le chercher dans le dernier audit niveau 0 et le rapatrie avec son origine.
  Vérifié par : le message final dans la conversation ; `jq -c '[.findings[] | select(.kind == "hors-build") | {id, ou, origine}]' derived/build-plan.json` sur le plan reparti de l'audit niveau 2 montre IDX-04 avec `origine` pointant vers l'audit niveau 0.

- **AC-7**
  Comportement : quand je lis le diff de la branche, alors les fichiers `src/app/**/page.tsx` ne changent que sur leur h1, leur première phrase et un éventuel export `metadata` ou composant JSON-LD ; le reste du diff tient dans `layout.tsx`, `sitemap.ts`, `robots.ts`, `not-found.tsx`, `public/<clé>.txt`, un composant JSON-LD.
  Vérifié par : `git diff main..seo-build-2026-08-28 --stat` puis lecture du diff par Romain ; aucun `<p>` hors ouverture, aucun lien, aucune image modifiés.

- **AC-8** (chemin d'échec)
  Comportement : quand le script `dev` est absent de `package.json` (renommé le temps du test) et que je lance `/erom-seo:build`, alors `build` fait ses commits, dit qu'il ne peut pas lancer le serveur, donne la commande à lancer moi-même et s'arrête proprement.
  Vérifié par : le message dans la conversation ; `cd plugin && bun test` vert ; `bun plugin/skills/audit/scripts/check-sources.ts` : 57 citations d'audit plus celles de `nextjs.md`, 0 en échec.

## 11. Hors périmètre du chantier 3

Référence dédiée pour un autre stack (Astro, WordPress) ; création de pages manquantes ; images Open Graph ; travail de performance (PERF-01) ; internationalisation ; un journal de build ; `launch` (chantier 4) ; réécriture d'un texte au-delà du h1 et de la première phrase.

## 12. Points à instruire pendant le plan

- `check-sources.ts` sur les pages nextjs.org : vérifier que le HTML servi contient bien les citations (le sous-agent les a lues par Context7 et en direct ; le script doit les retrouver de la même façon). Sinon : marquer `[manuel]` comme pour les sources des checks.
- Invoquer `/erom-seo:audit` depuis `build` : confirmer sur chico que la skill audit lancée au milieu du build écrit bien son dossier et rend la main (une skill qui en appelle une autre).
- Deux `next dev` sur le même repo : la règle de réutilisation du port 3000 (7.4.1) évite le cas ; vérifier qu'un serveur lancé par `build` sur 3456 n'entre pas en conflit avec `.next/` si Romain en a un sur 3000 (avertissement Turbopack « multiple lockfiles » vu sur chico le 28/08, dû à un `package-lock.json` dans `/Users/recarnot/`, sans rapport avec nous).
- Dates git pour `datePublished` et `dateModified` : sur un repo fraîchement cloné ou un fichier renommé, `git log --follow` ; sur un site sans historique, la date du jour, signalée dans le commit.
- `latestAuditDir` quand `report.md` a la même date de modification (clone frais) : l'ordre du nom suffit ; documenter.

## 13. Sources et échantillons vérifiés le 2026-08-28

- API SEO de Next.js 16 : `docs/recherches/2026-08-28-nextjs-16-seo-api.md` (Context7 `/vercel/next.js/v16.1.1`, nextjs.org, vercel.com, developers.google.com).
- `bun run dev --port 3999` dans chico : `$ next dev --port "3999"`, `✓ Ready in 1023ms`, `GET /robots.txt 200 in 236ms`, home 200 en 0,54 s, sitemap 200.
- `bun x tsc --noEmit` dans chico : 2,0 s, aucune erreur.
- `curl -sI https://www.commentchercherbonheur.org/` : `cache-control: public, max-age=0, must-revalidate`, `etag`, `server: Vercel`, `x-vercel-cache: HIT`, pas de `Last-Modified`.
- Rapport n0 de chico du 28/08 : 0 Critique, 6 Important, 6 Mineur, 1 Info ; le Correctif de SD-02 sur douze lignes indentées.
