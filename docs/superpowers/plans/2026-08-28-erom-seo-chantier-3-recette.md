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

## Résultats du 2026-08-29, tâche 7 (recette vivante avec Romain)

Session chico `chico-happiness-49` (`0ad6e2bb-cffc-4dbe-af9a-98e31cb71784`), plugin `main` de `/Users/recarnot/dev/erom-agence-seo/plugin` (chantier 3 fusionné, `acbac74`). Préalable : le diff du chantier 2 commité dans chico (`e06f2c5`). Vérifications faites après coup par la session Fable depuis les fichiers de chico, le journal git et le transcript de la session chico.

### AC-2 : OK

Les textes des 10 pages ont été présentés en listes par page (pas de tableau), les quatre champs avec l'actuel en face, puis « Je bloque là, je ne touche aucun fichier avant ton feu vert ». Romain : « ok sur tout » à 10 h 49 min 48 s. Premier commit à 10 h 56 min 12 s (`a8524ce`). Aucune écriture de fichier entre le plan et le OK dans le transcript.

### AC-3 : OK avec un écart mineur

```
git -C /Users/recarnot/dev/chico-happiness log --oneline e06f2c5..3e7023b
```

```
3e7023b seo: audit niveau 2 final, 0 Critique/Important/Mineur
a1fa533 seo(FRESH-01, FRESH-02): date visible alignée sur dateModified
81d45a1 seo(SD-01): corrige dateModified JSON-LD /telekinesie et /studies
4485cd8 seo(TAG-01, TAG-02, TAG-03, STRAT-01): title, description, h1 et ouverture, textes validés par Romain le 2026-08-29
52e0f3b seo(AI-02): dépôt de la clé IndexNow
6c14a6f seo(SD-02, STRAT-02, STRAT-03): bloc Organization et phrase d'identité sur la home
e17ff94 seo(SD-01): JSON-LD Article/WebPage sur les pages de contenu
a8524ce seo(IDX-02): canonical absolu et auto-référent sur chaque page
```

`bun run build` dans chico : passe (toutes les routes en statique).

Écart R-3 (mineur) : le neuvième commit `3e7023b` (le rapport d'audit final) ne commence pas par `seo(` et ne porte aucun id. La skill ne dit ni de commiter le rapport ni comment le nommer.

### AC-4 : OK

Serveur lancé par build sur le port 3456 (`bun run dev --port 3456`, pid 94732), audit niveau 2 via la skill `/erom-seo:audit http://localhost:3456`, `seo/audits/2026-08-29-n2-3/report.md` écrit, `kill 94732` puis « serveur arrêté ». Après coup : `lsof -i :3456` vide.

Observation R-4 (mineure) : trois collectes pour un seul passage (`2026-08-29-n2`, `-n2-2`, `-n2-3`). Build a corrigé entre deux collectes sans écrire de rapport (`81d45a1` un `dateModified` faux qu'il avait lui-même introduit, `a1fa533` FRESH-01 et FRESH-02), puis a mis les deux dossiers avortés à la poubelle (un `rm -rf` d'abord, refusé par le garde, puis `trash`). Résultat correct, mais la boucle prévue (étape 4 rapport, étape 5 plan, retour à l'étape 1, deux passages max) n'a pas été suivie à la lettre : un seul passage compté, trois audits joués.

### AC-5 : OK

```
sed -n 5,6p seo/audits/2026-08-29-n2-3/report.md
grep -c "^STRAT-0[1-3]\|^SD-02\|^IDX-02\|^TAG-0[12]\|^AI-02" seo/audits/2026-08-29-n2-3/report.md
```

```
## En bref
0 Critique · 0 Important · 0 Mineur · 1 Info
8
```

Seule trouvaille restante : `[Info] AI-01 : llms.txt absent`.

### AC-6 : KO

Message final de build : « Rien en attente, pas de "hors build" cette fois ». IDX-04 (307 apex vers www, Vercel) n'apparaît nulle part.

Cause : le plan a été calculé sur `seo/audits/2026-08-28-n2` (audit localhost), pas sur `2026-08-28-n0` (prod). `latestAuditDir` départage deux audits du même jour par la date de modification de `report.md`, et le n2 a été écrit après le n0. Sur localhost, IDX-04 est non applicable, donc absent du plan, donc absent de la restitution. L'étape 6 de la skill prévoit bien de reporter « les hors build du premier plan, même si l'audit local les a marqués non applicables », mais ici le premier plan n'en avait déjà plus. Une trouvaille de prod disparaît en silence dès qu'un audit local plus récent existe.

Trouvaille R-6 (importante) : à trancher par Romain. Pistes : `plan.ts` ajoute les trouvailles `hors-build` du dernier audit n0 (prod) à tout plan calculé sur un audit n2, ou la restitution de build relit le dernier rapport n0 pour lister ses hors build. Pas corrigé pendant la recette.

### AC-7 : KO partiel

```
git -C /Users/recarnot/dev/chico-happiness diff main..3e7023b --stat | tail -1
```

```
52 files changed, 2490 insertions(+), 19 deletions(-)
```

Fichiers hors `seo/` et `public/` : `src/app/layout.tsx`, `src/app/page.tsx`, 9 `src/app/<page>/page.tsx`, 7 `src/app/<page>/layout.tsx` (6 créés), `src/components/seo/JsonLd.tsx` (créé), `src/components/sections/Hero.tsx`. Dans les `page.tsx` : h1, première phrase, `metadata`, `<JsonLd>`, conformes à la règle.

Trouvaille R-7a (importante, texte visible sur le site) : sur `/ascension` et `/methode`, la phrase d'ouverture validée a été ajoutée devant l'ancienne, et l'ancienne conservée. Résultat visible :

```
L'ascension C.H.I.C.O. commence ici : choisissez votre niveau de conscience, sans remboursement sur le Nirvana. Pas de remboursement sur le Nirvana.
```

```
La Méthode Quantique C.H.I.C.O. combine miroir quantique et hypnose blockchain pour transmuter votre chakra racine en ROI (Retour On Illumination). Là où la blockchain rencontre le chakra racine pour une optimisation quantique de votre ROI (Retour On Illumination)
```

Cause probable : la règle texte de l'étape 3 dit « h1 et première phrase seulement » et « ne rien supprimer », sans dire que la première phrase est remplacée. Le modèle a pris « ne rien supprimer » au pied de la lettre. Correctif skill à écrire : « remplacer la première phrase par la valeur validée (l'ancienne disparaît), ne rien supprimer d'autre ». Chico : corriger les deux phrases avant fusion.

Écart R-7b (déclaré par build dans sa restitution, à trancher) : deux textes visibles hors de la table validée. L'ouverture de la home remplacée par la phrase d'identité de `seo/strategy.md` (exigée par STRAT-03, l'audit refusait le bloc Organization sans elle) ; une ligne « Mis à jour le 29 août 2026 » ajoutée sur `/methode`, `/telekinesie`, `/studies` (FRESH-01, FRESH-02 : date visible alignée sur `dateModified`). Build les a annoncés franchement, ce qui est le bon comportement, mais la règle 7 « aucun texte visible inventé hors de la table validée » n'est pas tenue. Piste : l'étape 2 propose d'office la phrase d'identité comme ouverture de la home quand STRAT-03 est ouvert, et annonce la ligne de date quand FRESH est ouvert.

Écart R-7c (mineur) : le h1 de la home vit dans `src/components/sections/Hero.tsx`, pas dans `page.tsx` ; la liste de fichiers d'AC-7 ne prévoit pas les composants de section. À préciser dans la spec plutôt qu'à interdire.

Écart R-7d (mineur) : `seo/audits/2026-08-28-n2/derived/build-plan.json` (le premier plan) et tout `seo/audits/2026-08-29-n2-3/` (dont `raw/`) commités sur la branche par build. Depuis la recette, chico ignore `seo/**/raw/` (commit `chore` sur la branche build) ; la skill pourrait poser ce `.gitignore` elle-même.

### AC-8, chemin d'échec : OK

Joué en headless par la session Fable, sur une branche jetable de chico partant de la branche build : `git switch -c ac8-jetable`, `dev` renommé `dev-off` dans `package.json` (commit `2dc0e01`), puis :

```bash
env -u CLAUDECODE claude -p "/erom-seo:build" --plugin-dir /Users/recarnot/dev/erom-agence-seo/plugin --dangerously-skip-permissions --max-turns 80 --output-format text
```

Sortie réelle (extrait) :

```
Build terminé. Rien à corriger, mais je n'ai pas pu revérifier par un audit frais.
- Plan sur `seo/audits/2026-08-29-n2-3` : 0 trouvaille ouverte. Aucun texte à valider, aucun fichier touché.
- Étape 4 : je ne peux pas lancer le serveur. Lance `bun run dev`, puis `/erom-seo:audit http://localhost:3000`. Journal : `$TMPDIR/erom-seo-dev.log` (contenu : `error: Script not found "dev"`). Cause : le script s'appelle `dev-off` dans `package.json`.
- Commits depuis `2dc0e01` : aucun.
Branche `ac8-jetable`, rien n'est poussé.
```

Après coup : `git log 2dc0e01..HEAD` vide, `lsof -i :3456` vide, aucun serveur laissé. Branche jetable supprimée, chico remis sur `seo-build-2026-08-29`, `dev` intact.

Observation R-8 (mineure) : `plan.ts` réécrit `derived/build-plan.json`, que build avait commité ; le second lancement laisse donc ce fichier modifié dans l'arbre (` M seo/audits/2026-08-29-n2-3/derived/build-plan.json`). Sans effet sur le contrôle d'arbre propre (fait avant `plan.ts`), mais un run de build sur un arbre déjà porteur d'un plan commité finit avec un fichier modifié non commité.

## Bilan de la tâche 7

- OK : AC-1, AC-2, AC-3, AC-4, AC-5, AC-8. KO : AC-6 (hors build de prod perdus quand le dernier audit est local, R-6). KO partiel : AC-7 (phrases d'ouverture dupliquées sur deux pages, R-7a).
- À trancher par Romain : R-6 (où build va chercher les hors build de prod), R-7a (correctif de la règle texte de la skill, puis correction des deux phrases dans chico avant fusion), R-7b (textes hors table : les proposer à l'étape 2).
- Mineurs, à prendre dans un ménage : R-3 (nom du commit du rapport), R-4 (boucle compressée, trois collectes), R-7c (composants de section dans AC-7), R-7d (`.gitignore` de `seo/**/raw/` posé par la skill), R-8 (plan régénéré sur un arbre porteur d'un plan commité).
- Chico : branche `seo-build-2026-08-29` (8 commits `seo(...)`, le rapport, le `chore` gitignore), non fusionnée, rien poussé. Le site est visible en local avec `bun run dev`.

## Correctifs du 2026-08-29 (décision de Romain : « 1 oui, 2a »)

Exécutés par la session chico `chico-happiness-49` sur brief de Fable (worktree `erom-agence-seo-recette-fix`, branche `recette-3-fix`), relus et fusionnés dans `main` par Fable (`66f7378`).

### R-7a : réglé

- Chico, commit `087ff67` `seo(STRAT-01): ouverture sans doublon sur /ascension et /methode` : seule la phrase validée reste. `grep -c "sans remboursement sur le Nirvana" src/app/ascension/page.tsx` rend 1, `grep -c "Retour On Illumination" src/app/methode/page.tsx` rend 1, `bun x tsc --noEmit` muet.
- Skill, `skills/build/SKILL.md` étape 3 point 2 (`8bb1229`) : « le h1 et la première phrase sont remplacés par les valeurs validées ; l'ancien h1 et l'ancienne phrase disparaissent. Rien d'autre n'est touché ni supprimé ». Spec section 7.3 alignée (`c606648`).

### R-6 : réglé (option a)

- `skills/build/scripts/plan.ts` et `lib/plan.ts` (`ce48b66`, `c606648`) : quand le plan ne part pas d'un audit niveau 0, `plan.ts` lit le `report.md` du dernier audit niveau 0 (s'il diffère) et rapatrie ses trouvailles ouvertes de genre `hors-build`, dédoublonnées par id, chacune avec `origine` (le dossier n0). Rapport n0 illisible : `attention : rapport niveau 0 <dossier>/report.md illisible, ses hors build ne sont pas dans le plan` sur stderr, plan produit quand même. Spec 5.2 et AC-6 amendés (`8dfcbda`).
- Tests : 7 ajoutés (3 sur `buildPlan`, 4 sur le câblage disque de `plan.ts`), fixture `tests/fixtures/chico/report-n2.md`. `bun test` : 216 pass, 0 fail.
- Vérifié sur chico avec le plugin `main` fusionné :

```bash
cd /Users/recarnot/dev/chico-happiness
bun /Users/recarnot/dev/erom-agence-seo/plugin/skills/build/scripts/plan.ts --audit seo/audits/2026-08-28-n2 | tail -1
jq -c '[.findings[] | select(.kind == "hors-build") | {id, origine}]' seo/audits/2026-08-28-n2/derived/build-plan.json
```

```
plan : 11 trouvailles ouvertes (0 Critique, 6 Important, 5 Mineur) : 7 code, 3 texte, 1 hors build ; 10 pages avec des textes à valider ; base canonique https://www.commentchercherbonheur.org (audit niveau 0)
[{"id":"IDX-04","origine":"seo/audits/2026-08-28-n0"}]
```

AC-6 passe donc au niveau du plan ; le message final de build (étape 6, qui liste les hors build du plan) n'a pas été rejoué en session, il le sera au prochain build réel.

### Reste ouvert

R-7b (textes hors table validée, à proposer à l'étape 2), et les mineurs R-3, R-4, R-7c, R-7d, R-8 : à prendre dans un ménage ou au chantier 4.
