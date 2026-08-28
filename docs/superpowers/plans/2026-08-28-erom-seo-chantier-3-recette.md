# Recette du chantier 3, erom-seo build

Date : 2026-08-28
Cobaye : `/Users/recarnot/dev/chico-happiness`
Plugin testé : worktree `/Users/recarnot/dev/erom-agence-seo-chantier-3/plugin`

Ce document couvre les 8 critères d'acceptation de la spec (section 10). AC-1 et la partie tests d'AC-8 ont été courus mécaniquement (tâche 6, sans Romain). AC-2 à AC-7 et le chemin d'échec d'AC-8 restent à courir avec Romain (tâche 7) : la procédure exacte est recopiée ci-dessous pour qu'une autre session puisse la dérouler sans relire le plan.

## AC-1

Comportement (spec 10, AC-1) : quand je lance `bun <plugin>/skills/build/scripts/plan.ts` dans chico avec l'audit n0 du 28/08 et la stratégie validée, alors `seo/audits/2026-08-28-n0/derived/build-plan.json` existe avec 12 trouvailles, IDX-04 hors build (Vercel), STRAT-01, STRAT-02 et TAG-03 texte, un bloc Organization à 3 sameAs, la base canonique `https://www.commentchercherbonheur.org` (audit niveau 0), le fichier IndexNow `public/bf498d4959b94b88aa7bb3902433735f.txt`, et 10 pages avec des textes requis.

Commande :

```bash
cd /Users/recarnot/dev/chico-happiness
bun /Users/recarnot/dev/erom-agence-seo-chantier-3/plugin/skills/build/scripts/plan.ts --audit seo/audits/2026-08-28-n0
```

Sortie réelle :

```
dossier : seo/audits/2026-08-28-n0
plan : 12 trouvailles ouvertes (0 Critique, 6 Important, 6 Mineur) : 8 code, 3 texte, 1 hors build ; 10 pages avec des textes à valider ; base canonique https://www.commentchercherbonheur.org (audit niveau 0)
```

Vérifié par (spec 10, AC-1) :

```bash
cd /Users/recarnot/dev/chico-happiness
P=seo/audits/2026-08-28-n0/derived/build-plan.json
jq '.findings | length' $P
jq -c '[.findings[] | select(.kind == "hors-build") | .id]' $P
jq -c '[.findings[] | select(.kind == "texte") | .id]' $P
jq '.organization.sameAs | length' $P
jq -r '.canonicalBase.origin + " (" + .canonicalBase.source + ")"' $P
jq -r '.indexnow.file' $P
jq '[.pages[] | select(.textes | length > 0)] | length' $P
```

Sortie réelle :

```
12
["IDX-04"]
["STRAT-01","STRAT-02","TAG-03"]
3
https://www.commentchercherbonheur.org (audit niveau 0)
public/bf498d4959b94b88aa7bb3902433735f.txt
10
```

Contrôle complémentaire (aucun autre fichier de chico ne doit bouger), avant puis après l'exécution de `plan.ts` :

```bash
git -C /Users/recarnot/dev/chico-happiness status --short
```

Sortie réelle, identique avant et après :

```
 M src/app/methode/page.tsx
?? bun.lock
?? seo/
?? src/app/methode/layout.tsx
```

Seul changement réel : l'ajout de `seo/audits/2026-08-28-n0/derived/build-plan.json` à l'intérieur du dossier déjà non suivi `seo/` (ce qui n'apparaît pas comme une nouvelle ligne puisque `seo/` était déjà listé en `??` avant l'exécution). `src/app/methode/*` et `bun.lock` sont le diff laissé par le chantier 2, non touché.

**Statut : OK.** Toutes les valeurs obtenues correspondent exactement à l'attendu de la spec et du brief.

## AC-2 à AC-7, et chemin d'échec d'AC-8

**À courir avec Romain (tâche 7 du plan).** Non exécutées dans cette tâche : elles nécessitent une session interactive avec validation humaine des textes proposés. Procédure exacte, recopiée du plan (`docs/superpowers/plans/2026-08-28-erom-seo-chantier-3-build.md`, tâche 7), pour dérouler sans relire le plan.

### Étape 1 : préparer chico

Le diff laissé par le chantier 2 (`src/app/methode/page.tsx`, `src/app/methode/layout.tsx`, `seo/`) doit être commité ou rangé avant, sinon build s'arrête à l'étape 0.2. Proposition à Romain : `git -C /Users/recarnot/dev/chico-happiness add -A && git -C /Users/recarnot/dev/chico-happiness commit -m "seo: stratégie, audits et title de /methode (recette erom-seo chantier 2)"`. Décision de Romain, pas de la session.

### Étape 2 : lancer

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

### Étape 3 : consigner

Coller les sorties réelles dans ce document, section par AC ci-dessus, avec OK ou KO. Tout écart entre le comportement et la spec est une trouvaille de recette : la noter, ne pas corriger en silence. Commit dédié à ce moment-là : `docs: recette du chantier 3, AC-2 à AC-8 courus avec Romain`.

## AC-8, partie tests

Comportement (spec 10, AC-8), partie couverte ici : le reste du plugin tient (suite verte, sources vérifiées) indépendamment du chemin d'échec humain, qui reste à courir avec Romain.

Commandes :

```bash
cd /Users/recarnot/dev/erom-agence-seo-chantier-3/plugin
bun test 2>&1 | tail -6
bun skills/audit/scripts/check-sources.ts | tail -3
grep -rn "—" skills/build/ README.md || echo "aucun em dash"
```

Sortie réelle, `bun test` :

```
bun test v1.4.0 (34cbb9a40)

 206 pass
 0 fail
 1163 expect() calls
Ran 206 tests across 18 files. [2.61s]
```

Sortie réelle, `check-sources.ts` :

```
80 citations retrouvées, 0 en échec, 0 à vérifier à la main
```

Sortie réelle, grep em dash :

```
skills/build/scripts/tests/recipes.test.ts:65:    expect(NEXTJS.includes("—")).toBe(false);
```

Écart avec l'attendu du brief (« aucun em dash ») : un seul résultat, dans `recipes.test.ts:65`. Ce n'est pas un em dash de prose mais le caractère littéral que le test utilise lui-même pour vérifier l'absence d'em dash dans `nextjs.md` (`NEXTJS.includes("—")` doit être `false`). Aucun em dash de contenu ou de documentation n'est présent dans `skills/build/` ni dans `README.md`. Faux positif du grep attendu par construction du test, pas une trouvaille de recette.

Chemin d'échec réel (renommer `dev`, relancer `/erom-seo:build`) : **à courir avec Romain (tâche 7)**, geste humain dans une session interactive, hors périmètre de cette tâche.

**Statut : OK** pour la partie tests (206 tests verts, 80 citations retrouvées et 0 en échec, aucun em dash de contenu). Chemin d'échec non couvert ici, en attente de la tâche 7.
