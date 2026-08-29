---
title: 'erom-seo, chantier 5 étape 1 : journal d'exécution et décisions'
date: 2026-08-29
status: implemented
project: erom-agence-seo
spec: docs/superpowers/specs/2026-08-29-erom-seo-console-design.md
recette: docs/superpowers/plans/2026-08-29-erom-seo-chantier-5-recette.md
---

Registre tenu pendant l'exécution en sous-agents du chantier 5 étape 1. Conservé ici parce que le dossier
de travail (`.superpowers/sdd/`) est ignoré par git et disparaît avec le worktree. Chaque arbitrage porte
sa raison et, quand il y avait une vraie alternative, la ligne `Battu :` qui dit pourquoi elle a perdu.

Spec : docs/superpowers/specs/2026-08-29-erom-seo-console-design.md (autorité en cas de conflit).
Worktree : /Users/recarnot/dev/erom-agence-seo-chantier-5, branche chantier-5-console, base 79bd0b9.
Baseline : 260 tests verts, 107 citations (0 échec, 2 manuelles), après `bun install` dans le worktree.
Tâches 1 à 7 en sous-agents. Tâche 8 (recette sur les vraies API, jeton de Romain) reste dans la session mère.

## Contraintes de dépôt, à joindre à chaque brief

- Bun 1.4, TypeScript, `bun:test`. Aucune dépendance ajoutée à `plugin/package.json`.
- `plugin/` n'a pas de tsconfig.json : pas de drapeau de rigueur supplémentaire à respecter.
- Commentaires et messages en français, comme tout le dépôt. Pas de tiret cadratin dans les chaînes affichées ni dans le Markdown.
- Imports relatifs, pas d'alias. Logique pure dans `scripts/lib/`, CLI dans `scripts/` avec `import.meta.main`.
- `bun install` a déjà été lancé dans ce worktree (node_modules est ignoré par git et absent d'un worktree neuf).
- Aucun secret affiché : ni BING_WMT_API_KEY, ni jeton porteur, ni URL qui contient la clé.
- Aucune écriture sortante : ni SubmitFeed, ni SubmitUrlBatch, ni sitemaps.submit, ni api.indexnow.org.

## Scan préalable du plan (29/08, avant la tâche 1)

### Interfaces entre tâches

| Produit par | Consommé par | Ce qui traverse | Vérifié |
|---|---|---|---|
| T1 `resolve.ts` | T3, T5, T6 | `type Property` | OK, même forme partout |
| T1 `resolve.ts` | T4, T5, T6 | `type BingSite` | OK après correctif F1 du bloc Produces (le nom n'était pas donné) |
| T1 `resolve.ts` | T6 | `resolveProperty`, `resolveBingSite` | OK, signatures identiques dans les deux tâches |
| T2 `auth-google.ts` | T3, T6 | `GoogleAuth`, `LOGIN_HINT`, `QUOTA_HINT`, `SCOPE` | OK après correctif F1 (les trois constantes manquaient au bloc Produces) |
| T2 `auth-google.ts` | T6 | `defaultGcloud`, `serviceAccountToken` | OK |
| T3 `gsc.ts` | T5, T6 | `Fetcher`, `SitemapInfo`, `IndexStatus`, `Inspection`, `canonicalMismatch`, `listProperties`, `listSitemaps`, `inspectUrl` | OK |
| T4 `bing.ts` | T6 | `redact`, `bingUserSites`, `bingFeeds`, `bingUrlInfo`, `bingCrawlStats`, `bingCrawlIssues` | OK |
| T5 `render.ts` | T6 | `SitesView`, `InspectView`, `CrawlView`, `renderSites`, `renderInspect`, `renderCrawl` | OK, les trois vues sont construites par T6 avec les mêmes champs |
| T7 | T8 | `check-sources.ts` étendu, `acces.md` | OK, format `parseRecipes` vérifié sur le source |

### Cohérence interne de chaque tâche

| Tâche | Ce qui a été vérifié | Résultat |
|---|---|---|
| T1 | 7 `test()` annoncés contre 7 écrits ; chemin `../../../audit/scripts/lib/sitemap` compté sur l'arbre | OK |
| T2 | 5 `test()` annoncés contre 5 écrits ; `serviceAccountToken` référence `Fetcher` | **Défaut F2**, corrigé |
| T3 | fixtures A à D contre les assertions ; chemins de fixtures | OK ; **défaut F3** sur un test, corrigé |
| T4 | enveloppe `{"d": …}` contre les assertions | **Défaut F3** sur deux tests, corrigé |
| T5 | les trois vues contre les champs rendus | OK |
| T6 | routage du faux `fetch` contre les URL réellement construites | **Défaut F4**, corrigé (fragile, pas faux) |
| T7 | format attendu par `parseRecipes` contre le format écrit dans `acces.md` | OK |
| T8 | une étape par AC de la spec, AC-1 à AC-10 | OK, les dix sont couverts |

### Faits périssables affirmés par le plan

| Affirmation | Ce que dit l'arbre aujourd'hui | Accord |
|---|---|---|
| `Fetcher` et `FetchInit` dans `skills/checklist/scripts/lib/actions.ts` | présents, mêmes formes | oui |
| `sameSite(u, origin): boolean` dans `skills/audit/scripts/lib/sitemap.ts` | présent, même signature | oui |
| `parseStrategy(md): Strategy`, `Strategy.site` dans `plugin/lib/strategy.ts` | présents | oui |
| `parseRecipes(md): Recipe[]` dans `skills/build/scripts/lib/recipes.ts`, format `### Titre (ID-NN)` + `Fichiers:` / `Piège:` / `Source: url « citation »` | présent, regex lue sur le source | oui |
| `check-sources.ts` porte `checksDir`, `recipesDir`, `consolesDir` | les trois présents, même patron d'ajout | oui |
| `assertNoSecret` dans `skills/strategy/scripts/lib/keywords.ts` | présent | oui |
| `redact` et `defaultFetcher` dans `actions.ts` | présents | oui |
| `plugin/README.md` existe | oui, 3.6 Ko | oui |
| 260 tests existants | `bun test` : 260 pass, 0 fail | oui |
| 107 citations | `check-sources.ts` : 107 retrouvées, 0 échec, 2 manuelles | oui |
| `plugin/package.json`, bloc `scripts` | présent, 4 entrées | oui |

### Rulings du scan préalable

- **Ruling F1** : les blocs `Produces` des tâches 1 et 2 ne nommaient pas `BingSite`, `SCOPE`, `LOGIN_HINT` ni `QUOTA_HINT`, que des tâches ultérieures importent. Ajoutés au plan. Coût si faux : nul, c'est de la documentation d'interface.
- **Ruling F2** : la tâche 2 donnait à `serviceAccountToken` un paramètre de type `Fetcher`, type qui ne naît qu'à la tâche 3. `auth-google.ts` déclare désormais son propre `Fetcher`, de forme identique. Alternative écartée : hisser le type dans `plugin/lib/` avant la tâche 1, ce qui ouvre une mise en commun que D34 a explicitement reportée. Coût si faux : une troisième déclaration structurellement identique, à ramasser dans la passe de mise en commun déjà en dette.
- **Ruling F3** : trois tests du plan (un en tâche 3, deux en tâche 4) utilisaient `await promesse.catch(assertion)` sans assertion de rejet préalable. Un tel test passe à vide si la promesse résout, ce que la grille de revue traite comme un défaut. Un `await expect(p).rejects.toBeInstanceOf(...)` a été ajouté avant chaque `.catch`. Coût si faux : nul, l'assertion ajoutée est strictement plus forte.
- **Ruling F4** : le faux `fetch` de la tâche 6 discriminait sur `/sites/`, ce qui marchait mais dépendait de l'absence de slash final sur l'URL de `sites.list`. Discrimination portée sur `/webmasters/v3/sites/`. Coût si faux : nul.

## Journal

## Revue adversariale du plan (29/08, avant la tâche 1)

Sous-agent Opus, rapport complet dans `plan-review.md`. Méthode : les treize blocs `ts` extraits et exécutés
dans une copie du dépôt (49 tests), `check-sources.ts` patché et lancé contre le réseau réel.
Verdict : 2 Critiques, 9 Importants, 10 Mineurs. **Les 21 ont été acceptés et corrigés.** Aucun parqué.

Ce que la revue a fait gagner de plus précieux : trois défauts (I-1, I-4, I-8) qu'aucun test du plan ne
pouvait voir, parce que tous les faux `fetch` reproduisaient un compte Bing vide. Ils se seraient réveillés
ensemble le jour où un site entre dans le compte, donc devant un client, sans que la recette les atteigne.

- **Ruling C-1** : trois des six citations dictées à la tâche 7 étaient introuvables ou paraphrasées, ce qui
  faisait sortir `check-sources.ts` en 1 et échouer AC-10. Les huit citations finales ont été revérifiées par
  la session mère avec `normalizePage` et `normalizeQuote` du dépôt contre les pages réelles : 8 sur 8
  retrouvées. Le plan dicte désormais les lignes `Source:` verbatim, sans backticks. Coût si faux : la
  tâche 7 échoue à son propre gate, visible immédiatement.
- **Ruling C-2** : `console.ts` importait `serviceAccountToken`, que le bloc normatif de la tâche 2
  n'exportait pas. Plutôt que le contourner, `serviceAccountToken` a été écrit et testé pour de bon
  (10 assertions, dont la vérification de la signature RS256 avec la clé publique). La tâche 2 n'a plus
  aucune zone non normative. Battu : ajouter une simple assertion de présence au gate de la tâche 2, qui
  aurait laissé un corps non écrit et non testé. Coût si faux : nul, le test est plus fort qu'avant.
- **Ruling I-1** : `inspect` sort désormais en 1 dès que la propriété n'a pas résolu, quoi que Bing réponde.
  Un cas de test avec un compte Bing non vide exerce la branche. Coût si faux : un script appelant
  interpréterait un échec comme un succès.
- **Ruling I-2** : la ligne « propriété : … (rôle) » sort du branchement de succès et s'écrit toujours.
  Spec section 8 l'exigeait. Coût si faux : nul.
- **Ruling I-3** : `assertNoSecret` est implémenté sur la sortie, clé Bing et jeton Google, plus un test de
  non-fuite sur les trois commandes en texte et en JSON. Battu : inscrire au plan la décision de ne pas le
  faire ; perd parce que la spec le nomme deux fois et que le garde-fou coûte deux lignes.
- **Ruling I-4** : `ErrorCode: 0` vaut `None` dans l'enum officielle et n'est plus traité comme un refus.
  Coût si faux : un succès Bing serait rendu comme une erreur, avec le message absurde « Bing a refusé : None ».
- **Ruling I-5** : `acces.md` porte `Chemin:` et non `Fichiers:`, avec le contrôle correspondant dans le test,
  comme `consoles.md`. Spec section 6 l'exigeait. Coût si faux : une référence sans les clics, inutile devant
  un client, et un trou invisible aux tests puisque `parseRecipes` ignore silencieusement `Chemin:`.
- **Ruling I-6** : `acces.test.ts` est aligné sur `consoles.test.ts` : citation non vide et domaine autorisé.
  Une citation vide est incluse par n'importe quelle page, donc `check-sources.ts` la déclarait OK : le gate
  d'AC-10 était creux. Coût si faux : nul.
- **Ruling I-7** : deux tests ajoutés sur la branche « réponse sans `indexStatusResult` », que la spec
  section 9 nommait et que rien ne couvrait. Coût si faux : nul.
- **Ruling I-8** : `crawl` sort en 1 quand Bing n'a rien pu être lu. Battu : assumer par écrit qu'il sort
  toujours en 0 au motif que la phrase sur Google est déjà une réponse ; perd parce que le contrat du plan
  et la spec section 5.1 disent tous deux l'inverse, et qu'un code de sortie sert à un script, pas à un
  lecteur. AC-8 est amendé dans la spec pour attendre 1 aujourd'hui. Coût si faux : Romain voit un 1 sur une
  commande qui a fait ce qu'elle pouvait ; se corrige en une ligne.
- **Ruling I-9** : la commande de vérification d'AC-5 ne s'exécutait pas (`PATH=/usr/bin` retire aussi `bun`).
  Remplacée par `PATH="$(dirname "$(command -v bun)")"`, testée sur cette machine : `bun` répond, `gcloud`
  est injoignable. Corrigée dans le plan ET dans la spec. Coût si faux : AC-5 non recettable.
- **Rulings M-1 à M-10** : tous acceptés et corrigés, y compris les compteurs de tests de l'en-tête, recomptés
  mécaniquement (resolve 9, auth-google 8, gsc 12, bing 9, render 14, console-cli 15, acces 4).

Correctifs réexécutés avant d'être écrits dans le plan : 12 assertions sur la logique pure corrigée,
15 sur l'orchestration, 10 sur `serviceAccountToken`, 8 citations revérifiées en réseau. Tout vert.

## Journal d'exécution

- Base de branche : `a4dcdb6` (plan et spec corrigés). Briefs des tâches 1 à 8 générés d'avance.
- **Tâche 1** dispatchée sur haiku (le brief porte le code complet, c'est de la transcription plus des tests).
  Rendue DONE, commit `336ef61`, 9 tests, suite 269 verts 0 échec, aucun résidu non suivi. Vérifié par la
  session mère avant revue : `git diff --stat` = 2 fichiers créés, 106 lignes, rien d'autre touché.
  Revue de tâche dispatchée sur sonnet.
- Tâche 1 : revue propre. Conformité ✅ (fichiers identiques au brief, `sameSite` et le chemin relatif
  revérifiés par le relecteur), qualité approuvée, grille du code creux vide.
  Mineur différé : `resolveProperty` reparse `new URL(url)` une fois de trop pour extraire l'hôte. Sans
  risque (`target !== null` garantit déjà la validité), et présent tel quel dans le brief, donc pas une
  déviation de l'implémenteur. À trier à la revue finale.
- **Tâche 1 : complete (commits a4dcdb6..336ef61, revue propre, 1 mineur différé)**
- **Tâche 2** dispatchée sur sonnet (le brief porte le code complet, mais la crypto et la génération de clé
  RSA dans le test justifient le cran au-dessus). Base : `336ef61`.
- Tâche 2 rendue DONE, commit `ad4557e`, 8 tests, suite 277 verts 0 échec, `git status` propre
  (`tmp-sa/` ajouté à `plugin/.gitignore`). Vérifié par la session mère : 3 fichiers touchés, 212 lignes,
  16 exports dans `auth-google.ts`. Revue de tâche dispatchée sur **opus** (la tâche touche jeton porteur,
  clé privée RSA et signature JWT : cran au-dessus justifié par la règle de sélection de modèle).
- Tâche 2, revue opus : **conformité ✅** (fichiers identiques caractère pour caractère au brief, crypto
  conforme et signature réellement vérifiée avec la clé publique, 5 fragments de consigne présents, 3 exports
  attendus par la tâche 6 présents, dépôt propre, `tmp-sa/` bien ignoré). **Qualité approuvée avec 3
  importants, tous sur les tests, tous hérités du brief et non des déviations de l'implémenteur.** Le
  relecteur les a prouvés par mutation : il a fait fuir des secrets et la suite est restée verte.
  - **Ruling I-1** : le test anti-fuite du jeton porteur ne peut pas échouer (dans ce scénario aucun jeton
    n'existe). Décision : supprimer l'assertion vide et la remplacer par un vrai test de `defaultGcloud`
    contre de faux binaires jetables, quatre branches. Ça couvre du même coup le seul export du module qui
    manipule un secret et qui n'avait aucun test. Battu : garder l'assertion en la documentant comme
    symbolique ; perd parce qu'une assurance fausse est pire qu'une absence d'assurance. Coût si faux : un
    test de plus qui écrit des fichiers jetables, déjà ignorés par git.
  - **Ruling I-2** : le garde du JWT cherchait le mot « assertion », pas le jeton signé ; muter le code pour
    faire fuir le JWT entier laissait la suite verte. Décision : capturer le JWT réellement envoyé depuis le
    faux `fetcher` et asserter son absence dans l'erreur, plus une assertion que le JWT a bien été formé
    (sinon le test ne prouverait rien non plus). Coût si faux : nul, l'assertion est strictement plus forte.
  - **Ruling I-3** : le `JSON.parse` de la réponse de jeton n'était pas gardé, contrairement à celui du
    fichier de clé ; un corps non JSON en HTTP 200 (proxy, portail captif) lève un `SyntaxError` que la
    tâche 6 ne reconnaîtra pas comme `AuthError` et affichera en trace brute. Décision : l'envelopper et
    lever une `AuthError`, avec le test qui va avec. Coût si faux : nul.
  - **Ruling mineur horloge** : `exp = iat + 3600` est pile au maximum documenté par Google ; une horloge
    locale en retard donnerait un `invalid_grant` que `SA_HINT` diagnostiquerait à tort en « compte pas
    ajouté à la propriété ». Décision : `iat + 3540`, une minute de marge. Non reproduit contre le vrai
    Google (confiance moyenne du relecteur), mais le correctif coûte un nombre. Coût si faux : nul.
  - **Parqué, non corrigé** : le `keyFilePath` dans le message d'erreur divulgue une arborescence locale.
    Ruling : il reste. C'est exactement l'information dont Romain a besoin pour corriger, sur sa propre
    machine, et le message ne sort pas de chez lui.
  - Exigence ajoutée au correctif : **prouver les nouveaux tests anti-fuite par mutation** (faire fuir, voir
    échouer, remettre en état). Un test anti-fuite qu'on n'a pas vu échouer ne prouve rien, c'est
    précisément le reproche fait aux précédents.
  - Le plan sera mis à jour avec le code corrigé une fois le correctif vert, pour qu'une reprise ne
    réintroduise pas les défauts.
- Tâche 2 : fix round 1/5 dispatché (reprise de l'implémenteur d'origine, contexte intact).
- **Tâche 2 : fix round 1/5** (4 adressées, 0 ouverte : garde du JWT rendu réel, `defaultGcloud` couvert sur
  quatre branches par de faux binaires, `JSON.parse` de la réponse de jeton gardé, `exp` à 3540 s ;
  commits ad4557e..1800cc9). L'implémenteur a prouvé chaque nouveau test par mutation, sortie d'échec à
  l'appui. Suite 282 verts 0 échec, dépôt propre. Re-revue ciblée dispatchée sur sonnet.
- Plan mis à jour : les deux blocs de la tâche 2 sont maintenant le contenu exact des fichiers livrés,
  vérifié ligne à ligne. Une reprise ne peut plus réintroduire les défauts.
- Tâche 2, re-revue ciblée : les 4 trouvailles ADRESSÉES. Le relecteur a rejoué les mutations en aveugle
  dans une copie (jeton rendu malgré un code de sortie non nul → le test I-1 échoue ; `jwt=${jwt}` dans le
  message → le test I-2 échoue), ce qu'il observe correspond exactement au rapport de l'implémenteur.
  Aucune casse nouvelle. `not.toContain("PRIVATE KEY")` intact et mordant toujours.
- **Tâche 2 : complete (commits 336ef61..1800cc9, revue propre après 1 fix round, 1 parqué)**
  Parqué : le `keyFilePath` dans le message d'erreur divulgue une arborescence locale. Ruling déjà consigné.
- **Tâche 3** dispatchée sur sonnet. Base : `7a486c0`.
- Tâche 3 rendue DONE, commit `a135dad`, 12 tests, suite 294 verts 0 échec, dépôt propre. Vérifié par la
  session mère : 6 fichiers, 225 lignes, et les quatre fixtures portent bien les captures réelles du 29/08
  (`Page with redirect` avec `lastCrawlTime`, `URL is unknown to Google` **sans** `lastCrawlTime` ni
  canonical, `submitted 1 / indexed 0`, les trois propriétés). Revue dispatchée sur sonnet.
- **Écart de procédé remonté par l'implémenteur, réel** : `scripts/task-brief` n'extrait que le corps de la
  tâche, donc la section « Échantillons réels » du plan (les captures d'API) n'est dans aucun brief, alors
  que les tâches 3 et 4 s'y réfèrent. L'implémenteur a fait au mieux (grep ciblé sur cette section seule,
  sans lire le reste du plan) et a vérifié ses fixtures caractère pour caractère.
  **Ruling** : pour la tâche 4, les échantillons E et F seront recopiés directement dans le prompt de
  dispatch, pour ne pas obliger l'implémenteur à aller chercher dans le plan. Coût si faux : quelques lignes
  de prompt en plus. Ne pas corriger `task-brief`, c'est un script du plugin superpowers, hors périmètre.
- Tâche 3, revue : **conformité ✅** (transcription caractère pour caractère, fixtures diffées octet à octet
  contre le plan, aucune écriture, aucune dépendance), **qualité approuvée**, 0 critique 0 important.
  Le relecteur a rejoué lui-même la mutation du test « aucune écriture » : rouge confirmé, ce n'est pas du
  théâtre.
- Tâche 3 : minor (deferred) : le test d'encodage du `siteUrl` ne couvre que la forme `sc-domain:`, pas la
  forme préfixe d'URL. Le relecteur a vérifié que l'encodage de la seconde est correct, mais rien ne
  l'exerce : une régression passerait.
- Tâche 3 : minor (deferred) : `fail()` a six branches, deux sont testées. Les branches 401, 403 générique,
  404, statut générique et le `catch` d'un corps illisible en 200 sont correctes (vérifiées à la main par le
  relecteur hors suite) mais non couvertes.
  Les deux préexistent dans le brief, ce ne sont pas des déviations de l'implémenteur. À trier à la revue
  finale : la revue elle-même juge le risque faible, les six branches suivant un patron identique sans
  logique propre.
- **Tâche 3 : complete (commits 7a486c0..a135dad, revue propre, 2 mineurs différés)**
- **Tâche 4** dispatchée sur haiku (transcription pure, volume comparable à la tâche 1 que haiku a rendue
  sans un écart). Base : `a135dad`. Échantillons E et F recopiés dans le prompt de dispatch, conformément
  au ruling de la tâche 3.
- Tâche 4, revue : **conformité ✅**, **qualité approuvée**, 0 critique. Les deux pièges correctement
  encodés, aucun champ inventé pour les quatre méthodes jamais capturées, et le relecteur a muté deux fois
  (fuite de la clé, retrait du garde `ErrorCode !== 0`) : les deux tests mordent.
  - **Ruling clé de test caviardée** : la constante `KEY` livrée n'était pas la valeur du brief mais le
    masque de caviardage (vérifié par la session mère : 21 caractères, commençant par un crochet). Sur cette
    machine, toute chaîne de 32 caractères hexadécimaux est masquée dans la sortie affichée, Read comme
    Bash, et l'implémenteur a recopié le masque. Troisième occurrence du même piège en un jour, et la
    première **sans casser aucun test** : seule une comparaison octet à octet du livré au brief l'a vue.
    Décision : casser le piège à la source plutôt que le contourner. La clé de test des tâches 4 et 6 du
    plan devient `cle-de-test-bing-jamais-reelle`, non hexadécimale, avec un commentaire qui dit pourquoi,
    plus une contrainte globale ajoutée au plan. Battu : prévenir l'implémenteur dans le dispatch ; perd
    parce que c'est exactement ce qui avait été décidé après la deuxième occurrence, et que la troisième
    est arrivée quand même. Coût si faux : une fixture qui ressemble moins à une vraie clé Bing, sans effet
    sur ce que les tests prouvent (`redact` n'exige que 8 caractères).
    Mémoire `read-tool-caviarde-hex32` mise à jour : promue de « prévenir au dispatch » à « règle de
    rédaction du plan », avec la commande de contrôle et le fait vérifié que `grep -oE '[0-9a-f]{32}'`
    échappe au masque là où `cat` ne l'échappe pas.
- Tâche 4 : minor (deferred) : aucun test sur le chemin `JSON.parse` invalide de `bing.ts`. Le brief n'en
  demandait pas ; ce chemin ne touche ni le corps ni la clé, donc pas de risque de fuite.
- Tâche 4 : fix round 1/5 dispatché (reprise de l'implémenteur d'origine).
- Tâche 4 : fix round 1/5 (1 adressée, 0 ouverte ; commits 836a39e..3000a57). Le relecteur a remuté le
  garde anti-fuite avec la nouvelle clé : il mord toujours. Contrôle de la valeur fait par mesure et non par
  affichage (longueur 30, pas de crochet, non hexadécimale), le masque frappant aussi la sortie des
  relecteurs. Aucune casse nouvelle.
- **Tâche 4 : complete (commits a135dad..3000a57, revue propre après 1 fix round, 1 mineur différé)**
- **Tâche 5** dispatchée sur sonnet. Base : `3000a57`.
- Tâche 5 rendue DONE, commit `c8e8ae0`, 14 tests, suite 317 verts 0 échec, dépôt propre. La session mère a
  généré la sortie réelle des trois fonctions avec les vrais modules : lisible, une ligne par fait, champs
  absents omis, canonical divergent signalé en clair.
- Tâche 5, revue : **conformité ✅** (diff octet-identique au brief), **qualité approuvée avec réserve**,
  1 important, 0 critique. Les quatre règles de rendu tenues, sondées à la main sur du code réel, y compris
  les quatre combinaisons susceptibles de produire une section vide. Les trois assertions négatives mutées :
  les trois mordent.
  - **Ruling important, portée du filet anti-tiret cadratin** : le test ne voit que les branches que les
    quatorze tests exercent. Cinq branches de `render.ts` n'étaient exercées par rien (sitemaps vide,
    contents vide, liste Bing non vide dans `renderSites`, issues non vide dans `renderCrawl`, `googleError`
    non nul dans `renderSites`). Reproduction : un `—` injecté dans « aucun sitemap déclaré » laisse
    317/317 verts. Décision : ajouter cinq cas de comportement, un par branche, et faire boucler le test du
    tiret cadratin sur toutes les sorties, de sorte que toute chaîne littérale de `render.ts` apparaisse
    dans au moins une sortie contrôlée. Battu : asserter que le fichier source ne contient pas de tiret
    cadratin ; perd parce que c'est un test qui lit le source, banni dans ce dépôt (il casse à un refactor
    correct et passe sur une implémentation cassée). Coût si faux : cinq tests de plus.
    Preuve exigée : rejouer la mutation du relecteur et une seconde, constater les deux échecs.
- Tâche 5 : fix round 1/5 dispatché (reprise de l'implémenteur d'origine).
- Tâche 5 : fix round 1/5 (1 adressée, 0 ouverte ; commits c8e8ae0..78d7afa). L'implémenteur est allé plus
  loin que la consigne : inventaire ligne par ligne des littéraux de `render.ts` plutôt que les cinq
  branches citées, et il a trouvé trois littéraux que mon propre exemple de tableau ratait.
  **Vérification de la session mère, plus forte que la re-revue** : mutation automatique de chacun des
  28 littéraux affichables de `render.ts`, un par un, en relançant la suite à chaque fois.
  **28 tués, 0 survivant.** Le filet couvre désormais toute chaîne visible par l'utilisateur.
  Re-revue ciblée : `render.ts` intact, aucun test ne lit le source, aucune assertion affaiblie, les deux
  injections demandées mordent. Aucune casse nouvelle.
- **Tâche 5 : complete (commits 3000a57..78d7afa, revue propre après 1 fix round)**
- **Tâche 6** dispatchée sur sonnet. Base : `78d7afa`.
- Tâche 6 rendue DONE, commit `a6e2b91`, 15 tests, suite 337 verts 0 échec, dépôt propre, entrée `console`
  ajoutée à `plugin/package.json`. L'implémenteur a fait ses deux mutations de garde et les a documentées.
  - **Écart de procédé, ma faute** : j'avais généré les briefs 2 à 8 d'avance, avant de corriger la clé de
    test dans le plan. Le brief de la tâche 6 était donc périmé et portait encore la clé hexadécimale.
    L'implémenteur l'a détecté, a repris la valeur déjà établie au commit `14ebbde`, et l'a documenté.
    **Ruling** : les briefs 7 et 8 ont été régénérés depuis le plan à jour avant tout dispatch. Ne jamais
    réutiliser un brief généré avant une modification du plan. Coût si faux : un implémenteur travaille sur
    une consigne périmée, ce qui vient d'arriver et n'a été rattrapé que par sa vigilance.
  - **Réserve honnête de l'implémenteur, vérifiée par la session mère** : il a reconstruit par inférence une
    ligne que le masque lui cachait. Comparaison caractère par caractère avec le plan : écart d'une
    parenthèse redondante. Prouvé par exécution sur les quatre cas possibles que les deux formes sont
    sémantiquement identiques. Rien à corriger.
- Revue de la tâche 6 dispatchée sur **opus** (tâche de jonction, codes de sortie et garde des secrets).
- Tâche 6, revue opus : **conformité ✅** (transcription fidèle, chemins d'import comptés contre l'arbre,
  `defaultFetcher` identique à celui de `actions.ts`, `package.json` propre). **Les quatre points de
  conception tenus**, prouvés par 31 cas exercés sur `runConsole` avec de faux `fetch`. Le code est juste.
  **Ce sont les tests qui ne le tiennent pas : sur onze mutations, sept survivent.**
  - **Ruling C-1, critique** : le test d'AC-4 n'exerce pas AC-4. Le faux `fetcher` ne répond rien pour
    `GetUrlInfo`, donc `bing` reste `null` et le code 1 sort tout seul, garde ou pas. **Reproduit par la
    session mère** : garde `property !== null` retirée, 15 pass 0 fail. Décision : option `urlInfo` dans
    `deps()`, utilisée dans ce test, plus preuve par mutation. Coût si faux : AC-4 resterait une case cochée
    sans rien derrière, et la recette le confirmerait à tort puisque le compte Bing est vide aujourd'hui.
  - **Ruling I-1** : `import.meta.main` sans garde-fou, une exception sort en trace brute de dix lignes.
    Atteignable par conception, `assertNoSecret` levant si un secret survit à `redact`. Décision : try/catch
    qui imprime `reason(e)` et sort en 1.
  - **Ruling I-2** : `.catch(() => [])` sur `listSitemaps` et `bingFeeds` fait mentir la sortie (un 403
    s'affiche « aucun sitemap déclaré »). C'est le péché que le reste du chantier interdit. Décision :
    `SitemapInfo[] | null` et `unknown[] | null`, `null` signifiant « non lisible », avec une phrase dédiée
    au rendu. Battu : laisser le catch et documenter ; perd parce qu'une sortie qui ment est pire qu'une
    sortie qui manque. Coût si faux : un champ de type en plus et deux tests de rendu.
  - **Ruling I-3** : une `seo/strategy.md` illisible est avalée et l'utilisateur lit « lance depuis un
    dossier qui en a une » alors qu'il y est. Décision : garder le message de la `StrategyError`.
  - **Rulings mineurs** : `Invalid URL` en anglais brut à traduire ; `crawl --site` sans valeur à signaler ;
    le commentaire d'`assertNoSecret` doit dire honnêtement qu'il n'a pas de chemin d'exercice réel plutôt
    que de laisser croire qu'un test le tient. Ce dernier point est assumé : c'est un garde-fou de dernier
    recours, il ne se déclenche que si `redact` a laissé passer, et `redact`, lui, sera désormais testé par
    un `fetcher` qui lève avec l'URL complète dans son message.
  - Six autres tests à ajouter, un par mutation survivante, chacun à prouver par mutation.
- Tâche 6 : fix round 1/5 dispatché (reprise de l'implémenteur d'origine).
- Tâche 6 : fix round 1/5 (7 adressées, 1 ouverte ; commits a6e2b91..6fd2db8, suite 348 verts 0 échec).
  **Vérification par la session mère, batterie de 7 mutations rejouées à la main sur le code corrigé :
  6 tuées** (garde d'AC-4, `sites` toujours 0, `crawl` toujours 0, Bing sauté quand Google échoue, `redact`
  retiré de `done()`, rendu qui dirait « vide » au lieu de « non lisible »).
  **1 survivante** : remplacer `.catch(() => null)` par `.catch(() => [])` sur la lecture des sitemaps
  laisse la suite entièrement verte. Le correctif du point I-2 est juste dans le code et les deux tests de
  rendu sont bons, mais aucun test du CLI ne produit ce `null` : la chaîne complète, d'un `listSitemaps` qui
  échoue jusqu'à la phrase à l'écran, n'est exercée par rien. Même défaut qu'AC-4 un cran plus bas.
- Tâche 6 : fix round 2/5 dispatché (deux tests de bout en bout, sitemaps illisibles et flux Bing
  illisibles, chacun à prouver par la mutation que j'ai rejouée).
- Tâche 6 : fix round 2/5 (1 adressée, 0 ouverte ; commits 6fd2db8..21ba3a0). Les deux `.catch` mutés un par
  un par la session mère : les deux tués, zéro survivant sur neuf mutations au total.
  Re-revue ciblée : les 8 trouvailles ADRESSÉES, trois d'entre elles remutées par le relecteur (distinction
  compte vide sur `inspect`, isolation dans les deux sens, garde de méthode HTTP) : les trois mordent.
  Aucune assertion existante retirée. Aucune casse nouvelle. Le relecteur a aussi vérifié que le nouveau
  `catch` d'`import.meta.main` ne peut pas fuiter un secret : `assertNoSecret` lève un message fixe, sans
  valeur interpolée.
- **Tâche 6 : complete (commits 78d7afa..21ba3a0, revue propre après 2 fix rounds)**
- Plan réaligné sur le code livré pour les tâches 5 et 6 (quatre blocs remplacés par le contenu réel).
- **Tâche 7** dispatchée sur sonnet. Base : commit du réalignement.
- Tâche 7 rendue DONE, commit `4a74933`, suite 354 verts 0 échec, **115 citations retrouvées 0 en échec**
  (107 existantes plus les 8 nouvelles, toutes du premier coup). Dépôt propre.
  Sonde réelle de la session mère, qui prouve trois choses d'un coup : le CLI livré tourne pour de vrai,
  `env -u GSC_QUOTA_PROJECT bun console.ts sites` rend la consigne exacte et sort en 1 (**AC-6 déjà passé
  sur le vrai binaire**), et le 403 `SERVICE_DISABLED` se produit quand le projet de quota est posé mais
  que l'API n'y est pas activée (vérifié sur `dockertest-1268`), pas quand la variable manque.
  - **Ruling, réserve 1 de l'implémenteur retenue** : le piège d'ACC-04 dit « avec gcloud, sans elle, l'API
    répond 403 SERVICE_DISABLED ». C'est faux dans le code livré : `getAccessToken` lève avant tout appel
    réseau quand la variable manque. À corriger dans le tour de correctif, avec la formulation exacte
    vérifiée en réseau. Coût si faux : une référence qui envoie le lecteur chercher la mauvaise cause.
- Tâche 7, revue : **conformité ✅**, **qualité non approuvée**, 1 important, 0 critique. Le relecteur a
  confronté chaque affirmation du `SKILL.md` au code et au vrai binaire : les trois variables, les trois
  codes de sortie et les quatre renvois croisés (dont IDX-04, dont le texte correspond mot pour mot à la
  restitution canonical de la skill) collent tous. Il a muté le test de format deux fois : il mord.
  - **Ruling ACC-06, important** : l'implémenteur a recopié dans le `Piège` mon instruction d'auteur
    (« les nommer sans `Source:` ») au lieu de l'exécuter. Résultat, aucune URL d'aide Bing n'est nommée et
    le lecteur n'a rien à cliquer, alors que le modèle `consoles.md` les cite en clair. Décision : nommer
    les deux URL déjà présentes dans `consoles.md`, dans le `Chemin`, sans ligne `Source:` (elles feraient
    échouer `check-sources.ts`, ce sont des applications JavaScript), et reformuler le piège en information
    plutôt qu'en consigne d'écriture. Battu : reclasser en mineur et différer, comme le relecteur le
    proposait lui-même dans sa contre-objection ; perd parce qu'une référence d'accès sans lien est
    exactement ce qu'elle ne doit pas être, et que le correctif coûte deux lignes.
  - **Ruling ACC-04** : formulation corrigée d'après la sonde réseau. Absente, la variable arrête le verbe
    avant tout appel ; posée sur un projet sans l'API activée, Google répond 403 `SERVICE_DISABLED` et nomme
    le projet fautif.
  - Réserves 2 et 3 de l'implémenteur levées : pas de dossier `commands/` dans ce plugin, les verbes
    viennent du nom des skills et `console` est déclaré comme les quatre autres.
- Tâche 7 : fix round 1/5 dispatché.
- Tâche 7 : fix round 1/5 (2 adressées, 0 ouverte ; commits 4a74933..ed22208). Diff de 3 lignes de prose,
  lu en entier par la session mère : ACC-04 porte désormais la cause réelle du 403, ACC-06 nomme les deux
  URL d'aide Bing en clair et son piège est reformulé en information. 354 tests verts, 115 citations
  0 échec (compte inchangé, aucune ligne `Source:` ajoutée ni cassée), dépôt propre.
  **Écart de procédé assumé** : pas de re-revue ciblée sur ce tour. Le correctif est de la prose que j'avais
  dictée mot pour mot, j'en ai lu le diff complet, et les deux compteurs qui pourraient bouger (tests et
  citations) sont inchangés. La revue finale de branche, dispatchée dans la foulée, couvre ces trois lignes
  comme le reste. Coût si faux : trois lignes de prose non relues par un tiers avant la revue finale.
- **Tâche 7 : complete (commits aa775d8..ed22208, revue propre après 1 fix round)**

## Les sept tâches sont terminées. Revue finale de branche dispatchée sur fable (tier think).

### Mineurs différés, à trier par la revue finale
- Tâche 1 : `resolveProperty` reparse `new URL(url)` une fois de trop pour extraire l'hôte. Sans risque,
  présent tel quel dans le brief.
- Tâche 3 : le test d'encodage du `siteUrl` ne couvre que la forme `sc-domain:`, pas la forme préfixe d'URL.
  L'encodage de la seconde est correct (vérifié à la main), rien ne l'exerce.
- Tâche 3 : `fail()` a six branches, deux sont testées. Les quatre autres sont correctes mais non couvertes.
- Tâche 4 : aucun test sur le chemin `JSON.parse` invalide de `bing.ts`. Ce chemin ne touche ni le corps ni
  la clé, donc pas de risque de fuite.

### Parqué avec ruling
- Tâche 2 : le `keyFilePath` dans le message d'erreur divulgue une arborescence locale. Ruling : il reste,
  c'est l'information dont Romain a besoin pour corriger, sur sa propre machine.

## Revue finale de branche (fable) : non fusionnable en l'état, 4 importants, 0 critique

**Le fait qui change tout : Romain a ajouté ses deux sites dans Bing pendant la session.** Le compte,
vide toute la journée, contient désormais `lebonpote.romain-ecarnot.com` et `romain-ecarnot.com`, tous deux
vérifiés, avec un flux soumis ce soir. **Vérifié par la session mère** : `GetUserSites` rend bien deux
entrées. Toute la branche a été écrite contre un compte vide.

Conséquence directe, capturée par la session mère : **les quatre méthodes Bing jamais observables le sont
enfin** (`GetUrlInfo` connue et inconnue, `GetFeeds`, `GetCrawlStats`, `GetCrawlIssues`). Les réponses sont
dans la spec, section 12.6. **Incertitude 1 levée, incertitude 2 réduite.**

- **Ruling I-1, important** : une URL inconnue de Bing ne rend pas `null` mais un objet complet à sentinelles
  `DateTime.MinValue`. La branche « pas dans l'index Bing » de `render.ts` n'est donc jamais atteinte en vrai,
  et Romain lirait `DiscoveryDate : /Date(-62135568000000-0800)/` à l'écran. **Reproduit sur le vrai binaire
  par la session mère.** Décision : décoder le format .NET `/Date(<ms>[±hhmm])/`, reconnaître la sentinelle,
  et rendre les champs en français avec leurs libellés, maintenant qu'un échantillon les ancre. `HttpStatus`
  n'est pas affiché : il vaut `0` même sur une URL connue et indexée, donc il induirait en erreur.
- **Ruling I-2, important, et c'est ma décision qui était fausse** : le relecteur a relevé qu'à la tâche 7
  j'ai découvert la vraie cause du 403 `SERVICE_DISABLED` et **corrigé la référence au lieu du message**.
  `acces.md` dit désormais que Google « nomme le projet fautif », mais le CLI, lui, dit toujours
  « GSC_QUOTA_PROJECT absente » alors que la variable est posée. **Reproduit** :
  `GSC_QUOTA_PROJECT=dockertest-1268 bun console.ts sites` sort exactement ce message faux. C'est la seule
  branche réelle de ce code, une variable absente arrêtant le verbe avant tout appel réseau. Décision :
  `fail()` reçoit le projet de quota et nomme le projet fautif avec sa commande d'activation, plus le cas
  voisin `USER_PROJECT_DENIED` d'un projet inexistant. La correction de `acces.md` reste juste, c'est le
  code qui la rejoint. Bonne prise du relecteur : c'était mon angle mort.
- **Ruling I-3** : `GetFeeds` étant capturé, `console sites` doit nommer le flux, son statut, ses dates et
  son nombre d'URL, au lieu de « 1 flux déclaré(s) ».
- **Ruling I-4, mineurs** : `crawl --site pas-une-url` affiche encore `Invalid URL` brut (le correctif d'
  `inspect` n'a pas été porté), et les codes de sortie sont résumés trop court dans `SKILL.md` et le README.
- **Triage des mineurs différés, tranché par la revue** : les quatre branches non couvertes de `fail()`
  passent dans ce tour puisqu'on touche la fonction. L'encodage du préfixe d'URL attend (prouvé en
  production ce soir sur lebonpote). Le double `new URL` attend. Le `JSON.parse` de `bing.ts` attend.
  Le `keyFilePath` reste parqué, ruling confirmé par la revue.
- Sécurité : six chemins suivis, aucun n'amène un secret à une sortie. Aucune écriture, confirmé sur le code
  et non sur les tests. La retenue « aucun champ inventé » est appliquée partout.
- Spec mise à jour par la session mère (`4b3938e`) : section 12.6 avec les captures du soir, incertitudes 1
  et 2, AC-1, AC-3 et AC-8 amendés, section 8 corrigée sur la cause du 403.
- Tour de correctif unique dispatché sur sonnet, avec les cinq captures réelles dans le prompt.

## Vague de correctifs finale, puis re-revue ciblée (opus) : fusionnable

Vague : 4 commits (`a9e8271`, `598e5d9`, `9d5f402`, `8074812`), 354 → **375 tests verts**, 115 citations
0 échec, dépôt propre. **Les quatre trouvailles ADRESSÉES**, vérifiées sur le vrai binaire par la session
mère : plus aucune date .NET à l'écran, le 403 nomme le projet fautif et donne sa commande, les flux Bing
sont détaillés, aucun secret dans les trois sorties JSON.

- **Ruling, mon observation sur les `*_UNSPECIFIED` : j'avais tort sur la classe.** J'ai soumis au relecteur
  le fait que `robots.txt : ROBOTS_TXT_STATE_UNSPECIFIED` reste affiché en brut, en pensant que c'était la
  même faute que `HttpStatus`. Il a tranché contre moi, avec raison : `HttpStatus` **mentait** (0 sur une
  page indexée), `*_UNSPECIFIED` ne ment pas et se lit, et c'est la même classe que `verdict : NEUTRAL` ou
  `récupération : SUCCESSFUL` que tout le bloc Google rend déjà en brut sans que ça gêne. La règle juste
  n'est pas de traduire (ce serait ouvrir la traduction des six énumérations) mais d'**omettre** :
  `*_UNSPECIFIED` est la convention protobuf de Google pour « pas de valeur », et `line()` a déjà cette
  règle pour `null`. Coût : deux lignes. Ne pas toucher `verdict`, qui ne passe pas par `line()`.
- **Adjudication, trou du filet anti-tiret cadratin** : deux littéraux ajoutés par la vague ne sont couverts
  par rien, `jamais` (secours de `bingDate` sur `LastCrawledDate`) et `sous-URL connues`. Le relecteur les a
  trouvés par mutation un par un. **Mon propre balayage automatique n'en avait vu qu'un** : ma regex sur
  guillemets droits ne voyait pas les chaînes dans les gabarits à accents graves. Angle mort de mon outil,
  rattrapé par le relecteur. Vérifié ensuite à la main : les deux survivent. Les deux branches
  correspondantes ne sont exercées par aucun test. Correctif : cinq lignes, une sortie forgée combinant une
  `DiscoveryDate` valide, une `LastCrawledDate` sentinelle et un `TotalChildUrlCount` non nul.
- **Adjudication, `RangeError` de `parseDotNetDate`** au-delà de ±8,64e15 millisecondes. Rattrapé par le
  `catch` d'`import.meta.main` (code 1, sans trace ni fuite), et exige que Bing renvoie un horodatage de
  cent mille ans. Parqué.
- **Adjudication, branche morte** `USER_PROJECT_DENIED` sans projet posé : inatteignable, l'en-tête de projet
  n'existe que si la variable l'est. Parqué.
- Le décodage de date est juste : cinq formes réelles correctes, onze quasi-dates rejetées, et pas de
  glissement de jour (le décalage ignoré est structurellement sans effet, Bing ne servant que des décalages
  négatifs). Le `<=` sur la sentinelle rattrape même l'heure d'été, qu'une égalité aurait ratée.
- Aucune régression, aucune assertion perdue, rayon d'explosion nul hors de `console.ts`.
- **Honnêteté du relecteur, à retenir** : il dit lui-même n'avoir relu le vrai binaire sur aucune sortie et
  m'avoir cru sur parole. C'est la session mère qui a fait ces vérifications, sur les cinq commandes.

**Cap de la boucle atteint** : revue finale, une vague de correctifs, une re-revue ciblée. Pas de seconde
vague. Les trois résidus ci-dessus remontent à Romain avec la décision de fusion.
