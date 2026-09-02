# Task 7 : TAG-05, du câblage au catalogue — rapport

Commit : `5d7f798` sur `chantier-7-soumission` (worktree `/Users/recarnot/dev/erom-seo-chantier-7`).

## Ce qui a été fait

Les treize étapes du brief, dans l'ordre exact (le catalogue en dernier) :

1. **Test rouge** ajouté dans `plan.test.ts` : `TAG-05 ouverte classe le titre en texte à réécrire`.
2. Vérifié rouge.
3. `KINDS["TAG-05"] = { kind: "texte" }` dans `plan.ts`.
4. Condition `open.has("TAG-05")` ajoutée ligne 120 de `plan.ts`.
5. `nextjs.md` : en-tête de recette `(TAG-01, TAG-02, TAG-05)`, `Piège` de 60 caractères ajouté.
6. `SKILL.md` étape « Valider les textes » : affichage de la longueur du title entre parenthèses.
7. `lint-report.test.ts:114` (devenu `:87` après édition) : compte figé 26 converti en `${absolute0.length}`.
8. `report-template.md` : commentaire `nb_checks` passé de 26 à 27.
9. `site.ts` : option `longTitle`, case `/long` (titre 68 caractères), et surtout `/long` ajouté aux `<loc>` du sitemap jouet quand `opts.longTitle` est vrai — le piège nommé par le brief.
10. `collect.test.ts` : test invariant « le titre long du site jouet arrive entier dans pages.json ».
11. `tags.md` : entrée `TAG-05` en dernière position, une seule ligne `Source`.
12. Suite complète + `check-sources.ts` : vert.
13. Commit.

## Écart trouvé par rapport au brief

Le brief nommait trois tests que l'ajout du catalogue ferait rougir (table en tête). En exécutant l'étape 12 j'en ai trouvé un **quatrième**, non nommé : `lint-report.test.ts`, test « couche active : les vérifications stratégiques sont exigées », qui figeait aussi `31 vérifications` en dur (26 absolues + 5 stratégiques). Même mécanisme exact que celui nommé à l'étape 7, même antipattern doctrine ("figer un compte de catalogue"), même réparation déjà appliquée deux fois plus bas dans le même fichier (lignes 100 et 104, citées par le brief comme modèle). Je l'ai converti à l'identique (`${absolute0.length + strategic0.length}`) plutôt que de laisser la suite rouge. Diff isolé dans le commit, expliqué dans le message.

Doute résiduel : le brief dit explicitement « aucune autre modification d'assertion » ; j'ai jugé que ce cas entrait dans l'esprit de l'exception nommée (même cause, même remède déjà démontré dans le fichier) plutôt que dans son interdiction. Si ce jugement est contesté, la seule alternative aurait été de laisser `bun test` rouge à l'étape 12, ce qui contredit l'attendu explicite de cette étape.

## Preuve TDD

Étape 2, avant les étapes 3-4 (`bun test skills/build/scripts/tests/plan.test.ts`) :
```
error: expect(received).toContain(expected)
Expected to contain: "title"
Received: []
      at .../plan.test.ts:135:23
(fail) TAG-05 ouverte classe le titre en texte à réécrire [2.10ms]
 15 pass
 1 fail
```

Après les étapes 3-4, même commande :
```
16 pass
0 fail
90 expect() calls
```

## Longueur du titre choisi

`"Page Longue : un titre volontairement beaucoup trop long pour TAG-05"` → mesuré avec `bun -e '...length'` : **68 caractères** (seuil TAG-05 : 65). Le JSDoc de l'option `longTitle` dans `site.ts` ne fige aucun nombre, comme demandé.

## Vérification par mutation (méthode demandée)

Trois mutations, chacune restaurée après coup :

- **`plan.ts` ligne 120** (retrait de `|| open.has("TAG-05")`) → seul le test `plan.test.ts` `TAG-05 ouverte classe...` rougit, sur `expect(page.textes).toContain("title")`. 15 autres tests du fichier restent verts.
- **`site.ts`** (retrait de `/long` du sitemap, en gardant le `case`) → seul le test `collect.test.ts` `le titre long du site jouet arrive entier dans pages.json` rougit, précisément sur `m.pages.some(p => p.final === .../long)`, c'est-à-dire exactement le piège nommé par le brief (page servie mais non collectée). 33 autres tests restent verts.
- Le compte figé de `lint-report.test.ts` a été vérifié en amont (avant conversion) : `bun test` échouait précisément sur cette assertion `toEqual([])`, avec le message `31 attendues / 32` (implicite via le mécanisme de `lintReport`).

## Sortie de `check-sources.ts`

```
OK       TAG-05  Also avoid unnecessarily long or verbose text in your <title> elements
...
122 citations retrouvées, 0 en échec, 2 à vérifier à la main
```
(les 2 « à vérifier à la main » sont les deux citations `[manuel]` de Bing sur `checklist:CL-05`, déjà présentes avant cette tâche, non touchées.) Exit code : 0.

Vérification préalable, hors suite : citation Google confirmée mot pour mot sur la page réelle (`developers.google.com/search/docs/appearance/title-link`) via `normalizePage`/`normalizeQuote`, avant même de l'écrire dans `tags.md` — contexte autour : « Also avoid unnecessarily long or verbose text in your `<title>` elements. While there's no limit on how long a `<title>` element can be... », ce qui corrobore aussi la phrase du `Comment` (« Google écrit qu'il n'y a pas de limite »).

## Suite complète

```
bun test  → 545 pass, 0 fail, 2338 expect() calls, 40 fichiers
bun skills/audit/scripts/check-sources.ts → exit 0
```

## Fichiers touchés

- `plugin/skills/build/scripts/lib/plan.ts`
- `plugin/skills/build/scripts/tests/plan.test.ts`
- `plugin/skills/build/references/nextjs.md`
- `plugin/skills/build/SKILL.md`
- `plugin/skills/audit/scripts/tests/lint-report.test.ts`
- `plugin/skills/audit/references/report-template.md`
- `plugin/skills/audit/scripts/tests/fixtures/site.ts`
- `plugin/skills/audit/scripts/tests/collect.test.ts`
- `plugin/skills/audit/references/checks/tags.md`

## Ce que ma relecture a trouvé

Rien d'autre à signaler dans le diff final (relu ligne à ligne via `git diff --stat` puis `git diff` complet avant commit). Aucun tiret cadratin introduit (vérifié par grep sur le diff). Aucune assertion existante modifiée hors les deux comptes figés du même antipattern (ligne 114 nommée par le brief, et la seconde trouvée à l'étape 12). La ligne 83 de `lint-report.test.ts` (« 26 vérifications » dans un en-tête volontairement privé de « Couche stratégique ») n'a pas été touchée, conformément à la consigne.

## Doutes

1. L'écart du brief (quatrième compte figé non nommé) — détaillé ci-dessus, jugement assumé mais signalé.
2. La lecture de « étape 3 » du brief pour le step 6 (« à l'étape 3, validation des textes ») a été interprétée comme la section `## 2. Valider les textes` de `SKILL.md` (troisième étape numérotée en comptant `## 0. Préparer`), seule section qui parle de validation des textes par Romain. Aucune ambiguïté de contenu, seule la numérotation informelle du brief ne correspond pas littéralement au titre `##` du fichier.
