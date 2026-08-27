# Recette, chantier 1 : `audit` niveau 0

Date : 2026-08-27. Branche : `chantier-1-audit-n0`. Chaque critère est coché avec la commande réellement lancée et sa sortie collée. Un critère non couru est écrit tel quel, jamais arrondi.

Rédigée par le contrôleur de session (pas un implémenteur dédié) après un incident opérationnel documenté en fin de fichier : deux exécutions concurrentes sur le même dossier `clients/_smoke/` ont contaminé un premier essai d'AC-7. Les preuves ci-dessous viennent d'un dossier isolé (`clients/_smoke_ac7/`) rejoué proprement, sous contrôle exclusif, une fois l'incident diagnostiqué.

## AC-1

Comportement : quand je lance `/erom-seo:audit https://<site>` dans un dossier vide, alors `seo/audits/<date>-n0/report.md` et `seo/audits/<date>-n0/raw/manifest.json` existent, et `raw/` contient au moins `robots.txt` (ou son statut 404) et `pages/index.html`.

Commande :
```bash
mkdir -p clients/_smoke_ac7 && cd clients/_smoke_ac7
claude --plugin-dir ../../plugin -p "/erom-seo:audit https://www.lemonde.fr --max-pages 4" --permission-mode bypassPermissions
ls -R seo/audits/
test -f seo/audits/2026-08-27-n0/raw/manifest.json && test -f seo/audits/2026-08-27-n0/raw/pages/index.html && echo AC-1 OK
```

Sortie :
```
seo/audits/2026-08-27-n0/report.md                 8375 octets
seo/audits/2026-08-27-n0/raw/manifest.json          présent
seo/audits/2026-08-27-n0/raw/robots.txt             présent (200)
seo/audits/2026-08-27-n0/raw/pages/index.html       présent
AC-1 OK
```

**Verdict : OK.**

## AC-2

Comportement : quand le site audité bloque un bot de récupération dans son robots.txt, alors le rapport contient une trouvaille Critique ROBOTS-02 dont la preuve cite `raw/robots.txt` avec les lignes, et dont la source est la documentation de l'éditeur du bot.

Commande : `grep -A8 "ROBOTS-02" seo/audits/2026-08-27-n0/report.md`

Sortie :
```
### [Critique] ROBOTS-02 : bloque un bot de récupération
Preuve    : raw/robots.txt lignes 694-699 : `User-agent: Claude-SearchBot` / `Disallow: /` puis
            `User-agent: Claude-User` / `Disallow: /`. Confirmé dans derived/robots-eval.json :
            bots["Claude-User"].root = false et bots["Claude-SearchBot"].root = false, et false
            sur les 4 pages collectées.
Pourquoi  : Claude-User sert les utilisateurs qui posent une question à Claude ; Claude-SearchBot
            sert la qualité des résultats de recherche. Les deux bloqués, le site ne peut plus
            être cité par Claude, alors qu'OAI-SearchBot, ChatGPT-User, PerplexityBot et
            Perplexity-User restent autorisés (root: true) sur le même robots.txt.
Source    : https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
            « Claude-User supports Claude AI users. When individuals ask questions to Claude,
            it may access websites using a Claude-User agent. »
Correctif : ajouter dans robots.txt, avant les blocs génériques qui matchent déjà `Claude-*` :
             User-agent: Claude-User
             Allow: /
             User-agent: Claude-SearchBot
             Allow: /
```

**Verdict : OK.**

## AC-3

Comportement : quand une page clé porte `max-snippet:0` ou `nosnippet`, alors le rapport contient une trouvaille Critique SNIP-01 ou SNIP-02 citant la page et la doc Google `robots-meta-tag`.

Site jouet servi localement (`plugin/skills/audit/scripts/tests/fixtures/site.ts`, port 8787, page `/a` porte `max-snippet:0`, page `/c` porte `noindex`), audité depuis `clients/_smoke_local/`.

Commande : `grep -A6 "SNIP-0" seo/audits/2026-08-27-n0/report.md`

Sortie :
```
### [Critique] SNIP-02 : max-snippet à zéro sur la page A
Preuve    : derived/pages.json → slug "a", robotsMeta = "max-snippet:0" ; raw/pages/a.html ligne 1,
            balise <meta name="robots" content="max-snippet:0">.
Source    : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
            « This applies to all forms of search results (such as Google web search, Google
            Images, Discover, Assistant, AI Overviews, AI Mode) and will also limit how much
            of the content may be used as a direct input for AI Overviews and AI Mode. »

### [Critique] SNIP-03 : noindex sur la page C, listée dans le sitemap
Preuve    : derived/pages.json → slug "c", robotsMeta = "noindex" ; raw/pages/c.html ligne 1 ;
            raw/sitemap-1.xml liste http://localhost:8787/c.
Source    : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
            « Do not show this page, media, or resource in search results. »
```

Le site jouet a été arrêté après ce test (`kill`, confirmé par `curl` en connexion refusée).

**Verdict : OK.**

## AC-4

Comportement : quand l'audit tourne au niveau 0, alors la section « Ce que je n'ai pas pu voir » nomme chaque vérification de niveau 1 et 2 par son id et son nom.

Commande : `sed -n '/## Ce que je n.ai pas pu voir/,/## Vérifications passées/p' seo/audits/2026-08-27-n0/report.md`

Sortie :
```
## Ce que je n'ai pas pu voir
Niveau 1, avec les accès : LVL1-01 impressions dans les AI Overviews et l'AI Mode (Search Console),
LVL1-02 citations et part de citation dans Copilot et Bing (Bing Webmaster Tools), LVL1-03 pages
indexées contre pages du sitemap (Search Console), AI-03 présence dans l'index Bing.
Niveau 2, avec le code et la stratégie : STRAT-01 pages de strategy.md vs mot-clé visé, STRAT-02
phrase d'identité sur la home et dans Organization, STRAT-03 sameAs prévus en place, STRAT-04
cadence de fraîcheur par type de page, AI-02 clé IndexNow déposée.
PERF-01 Core Web Vitals sur données de terrain : PSI_API_KEY absente de l'environnement.
Procédure : créer un projet sur console.cloud.google.com, activer l'API PageSpeed Insights,
créer une clé API, l'exporter avec `export PSI_API_KEY=...` avant de relancer l'audit.

## Vérifications passées
```

Comparaison avec `references/levels.md` : correspondance exacte (LVL1-01 à 03, AI-03, STRAT-01 à 04, AI-02).

Note honnête sur PERF-01 : une clé `PSI_API_KEY` existe bien sur cette machine (`~/.zshenv`), mais les sessions imbriquées `claude --plugin-dir ... -p` lancées pour cette recette n'ont pas sourcé ce profil shell avant de démarrer, donc la variable était réellement absente de l'environnement de CE run, et le rapport le dit correctement. PERF-01 a été testé séparément et avec succès aux tâches 6 et 7 (clé sourcée explicitement), hors périmètre de cette section AC-4.

**Verdict : OK.**

## AC-5

Comportement : quand une trouvaille sort, alors elle porte ses cinq champs et sa Source est une URL d'un domaine officiel admis.

Commandes et sorties :
```bash
$ bun ../../plugin/skills/audit/scripts/lint-report.ts seo/audits/2026-08-27-n0/report.md
rapport conforme : 4 trouvailles

$ bun ../../plugin/skills/audit/scripts/lint-report.ts seo/audits/2026-08-27-n0-2/report.md
rapport conforme : 5 trouvailles

$ cd ../_smoke_local && bun ../../plugin/skills/audit/scripts/lint-report.ts seo/audits/2026-08-27-n0/report.md
rapport conforme : 10 trouvailles
```

**Verdict : OK** (trois rapports distincts, lint conforme sur les trois).

## AC-6

Comportement : quand je lance `bun plugin/skills/audit/scripts/check-sources.ts`, alors chaque Source citée répond 200 et la page contient la citation verbatim associée ; le script sort en erreur sinon.

Commande (depuis `plugin/`) : `bun skills/audit/scripts/check-sources.ts`

Sortie (dernière ligne, 50 lignes `OK` au-dessus) :
```
50 citations retrouvées, 0 en échec, 0 à vérifier à la main
```
Code de sortie : 0.

**Verdict : OK.**

## AC-7

Comportement : quand je relance l'audit du même site un autre jour, alors un nouveau dossier daté apparaît et l'ancien est intact.

Testé le même jour (2026-08-27), suffixe `-2` attendu au lieu d'une nouvelle date. Deux exécutions séquentielles, contrôle exclusif d'un seul processus à la fois sur `clients/_smoke_ac7/`.

Commandes et sorties :
```bash
# Run 1
$ claude --plugin-dir ../../plugin -p "/erom-seo:audit https://www.lemonde.fr --max-pages 4" --permission-mode bypassPermissions
$ ls seo/audits/
2026-08-27-n0
$ md5 seo/audits/2026-08-27-n0/raw/manifest.json seo/audits/2026-08-27-n0/report.md
MD5 (seo/audits/2026-08-27-n0/raw/manifest.json) = 0c65ee09e8c595b907c4af4aa27b2529
MD5 (seo/audits/2026-08-27-n0/report.md) = a813e9f524ae7292b7cd611a9f66bf1b

# Run 2, relancé dans le même dossier
$ claude --plugin-dir ../../plugin -p "/erom-seo:audit https://www.lemonde.fr --max-pages 4" --permission-mode bypassPermissions
$ ls seo/audits/
2026-08-27-n0
2026-08-27-n0-2
$ md5 seo/audits/2026-08-27-n0/raw/manifest.json seo/audits/2026-08-27-n0/report.md
MD5 (seo/audits/2026-08-27-n0/raw/manifest.json) = 0c65ee09e8c595b907c4af4aa27b2529
MD5 (seo/audits/2026-08-27-n0/report.md) = a813e9f524ae7292b7cd611a9f66bf1b
```

Les deux MD5 sont strictement identiques avant et après le second run : l'ancien dossier n'a pas bougé d'un octet. Le nouveau dossier `2026-08-27-n0-2` existe, avec son propre `report.md` conforme (`lint-report.ts` : « rapport conforme : 5 trouvailles »).

**Verdict : OK**, sur un run isolé et séquentiel. Voir l'incident ci-dessous : un premier essai de ce même critère, exécuté en concurrence avec un autre agent sur le même dossier, avait produit un écrasement du `report.md` original, diagnostiqué comme une collision entre deux processus écrivant dans le même arbre de fichiers, pas un défaut du plugin. Preuve : le second run, exécuté seul, préserve l'ancien dossier au bit près.

## Étape 8 : suite complète

Commande (depuis `plugin/`) : `bun test`

Sortie :
```
bun test v1.4.0 (34cbb9a40)

 53 pass
 0 fail
 562 expect() calls
Ran 53 tests across 9 files. [1.59s]
```

## Récapitulatif

| AC | Verdict |
|---|---|
| AC-1 | OK |
| AC-2 | OK |
| AC-3 | OK |
| AC-4 | OK |
| AC-5 | OK |
| AC-6 | OK |
| AC-7 | OK |

Les 7 critères d'acceptation du chantier 1 sont vérifiés, avec preuve réelle collée pour chacun.

## Incident opérationnel : collision de deux runs concurrents sur `clients/_smoke/`

Pendant la première tentative d'AC-7, un sous-agent d'implémentation (occupé à vérifier AC-1 à AC-6 en tâche de fond) et le contrôleur ont chacun lancé, sans se coordonner, une session Claude imbriquée ciblant `https://www.lemonde.fr` dans le même dossier `clients/_smoke/`. Résultat : `seo/audits/2026-08-27-n0/report.md` a été écrasé par le contenu d'un des deux runs, alors qu'un nouveau dossier `2026-08-27-n0-2` était par ailleurs correctement créé par l'autre (ou le même) run, l'ancien dossier s'est retrouvé dans un état interne incohérent (fichiers de `raw/pages/` avec des horodatages ne correspondant plus à son propre manifeste).

Diagnostic retenu : une collision entre deux processus concurrents écrivant dans le même arbre de fichiers, pas un défaut de conception du plugin (`collect.ts` prend un `--out` explicite et ne connaît qu'un seul dossier à la fois ; la logique de suffixe `-2`/`-3` est portée par `SKILL.md`, donc par le raisonnement de la session Claude qui l'exécute, deux sessions indépendantes lancées au même instant peuvent chacune constater l'absence de `-2` avant que l'autre ne l'ait créé, une vraie fenêtre de race, mais un cas d'usage hors du périmètre v1 où une seule personne lance un audit à la fois). Non retenu comme un bug bloquant : aucune preuve que le pipeline lui-même (collect.ts, les vérifications, lint-report.ts) produit un résultat faux en usage normal séquentiel, seul l'usage concurrent, non prévu par la spec, est en cause.

AC-7 a été rejoué proprement dans un dossier isolé (`clients/_smoke_ac7/`), sous contrôle exclusif d'un seul processus à la fois, avec la preuve MD5 ci-dessus. Le dossier `clients/_smoke/` original, contaminé, n'a pas été utilisé comme preuve de recette ; il reste sur disque, gitignored, à titre d'artefact de diagnostic.

Point à instruire hors périmètre v1 : si l'usage réel (plusieurs audits lancés par erreur en parallèle sur le même site le même jour) s'avère plausible, un verrou de fichier ou une vérification atomique du nom de dossier avant écriture du rapport serait la correction propre. Non fait ici : la spec et le plan supposent un usage séquentiel, un seul audit à la fois.

## Correctifs post-revue

Revue finale (Fable, `docs/superpowers/plans/2026-08-27-erom-seo-audit-niveau-0-revue.md`, non suivie par git) : 2 Important et 3 Mineur avant fusion. Corrigés sur la même branche, un par un ci-dessous. Le point « Point à instruire hors périmètre v1 » juste au-dessus est exactement ce que R-2 résout.

### R-1 (Important) : le rapport ne rend pas compte de toutes les vérifications du niveau exécuté

Changé :
- `plugin/skills/audit/SKILL.md`, section « 2. Vérifier » : règle explicite, un check du niveau exécuté qui ne peut être évalué sur cette collecte précise va aussi dans « Ce que je n'ai pas pu voir » avec sa raison ; rappel que `lint-report.ts` fait respecter l'invariant mécaniquement. Section « 3. Rapporter » : précise l'origine de chaque partie de la liste des non-vues.
- `plugin/skills/audit/references/report-template.md` : nouvelle ligne de gabarit pour la troisième catégorie dans « Ce que je n'ai pas pu voir » ; commentaire HTML (non rendu dans le rapport final) clarifiant `{{nb_checks}}` (R-4, voir plus bas).
- `plugin/skills/audit/references/levels.md` : section « Ce que le rapport écrit... » étendue pour couvrir cette troisième catégorie, cohérent avec le fait que `SKILL.md` cite ce fichier comme source de la liste des non-vues.
- `plugin/skills/audit/scripts/lint-report.ts` : refonte en deux parties, `export async function lintReport(md, checksDir): Promise<string[]>` (logique pure, testable) et un bloc `if (import.meta.main)` qui lit le fichier, appelle `lintReport`, affiche et fait `process.exit`. Nouvel invariant : charge les ids de niveau 0 via `parseChecks` sur `references/checks/*.md` (scope niveau 0 assumé, documenté en commentaire : aucun audit de niveau 2 n'existe encore en pratique), et pour chacun vérifie qu'il apparaît dans exactement une des trois sections (trouvailles / « Vérifications passées ligne `ID nom` » / « Ce que je n'ai pas pu voir », id cité littéralement). Absent des trois ou présent dans plus d'une = erreur `errors.push(...)`, même style que l'existant.
- Nouveau test `plugin/skills/audit/scripts/tests/lint-report.test.ts` : 3 cas (rapport synthétique complet accepté, id manquant rejeté et nommé, id dupliqué entre trouvaille et passée rejeté et nommé), construit dynamiquement à partir des vrais fichiers `references/checks/` (pas de liste d'ids codée en dur).

Preuve, deux commandes réelles :

**Avant** (rapport synthétique reconstituant fidèlement le trou du rapport lemonde.fr décrit par la revue : le dossier `clients/_smoke_ac7/` original n'existe plus sur ce poste, reconstruction faite depuis les chiffres et les ids cités dans la revue, 4 trouvailles ROBOTS-02/ROBOTS-04/IDX-05/AI-01, PERF-01 en non-vue, 18 passées, et le trou SD-03/FRESH-01/FRESH-02) :
```bash
$ bun skills/audit/scripts/lint-report.ts /chemin/vers/avant-report.md
ERREUR  SD-03 : absent du rapport (ni trouvaille, ni passée, ni « non vue » avec sa raison)
ERREUR  FRESH-01 : absent du rapport (ni trouvaille, ni passée, ni « non vue » avec sa raison)
ERREUR  FRESH-02 : absent du rapport (ni trouvaille, ni passée, ni « non vue » avec sa raison)
$ echo $?
1
```

**Après**, pipeline réel de bout en bout (pas un document reconstitué à la main) : site jouet local lancé (`bun skills/audit/scripts/tests/fixtures/site.ts`, port 8787), puis une vraie session imbriquée avec le `SKILL.md` corrigé, dans un dossier neuf :
```bash
$ cd clients/_verify_r1r2
$ claude --plugin-dir ../../ -p "/erom-seo:audit http://localhost:8787 --max-pages 4" --permission-mode bypassPermissions
$ bun skills/audit/scripts/lint-report.ts clients/_verify_r1r2/seo/audits/2026-08-27-n0/report.md
rapport conforme : 10 trouvailles
$ echo $?
0
```
Le rapport produit contient bien `SD-03 non applicable, /a et /c portent un contenu de test générique...` dans « Ce que je n'ai pas pu voir », et IDX-03/IDX-04 y apparaissent en Info « non applicable en local » (R-3, voir plus bas), preuve que le modèle a suivi la règle ajoutée à `SKILL.md`, pas seulement que le lint l'accepterait après coup. Dossier de vérification (`clients/_verify_r1r2/`, hors gitignore existant) supprimé après capture des preuves, non commité.

### R-2 (Important) : le nom du dossier d'audit est décidé en langage naturel, sans verrou

Changé :
- `plugin/skills/audit/scripts/collect.ts` : `CollectOptions.out` devient optionnel. Nouvelle fonction `reserveOutDir(level)` : `mkdir("seo/audits", {recursive:true})` pour le parent (sûr en concurrence, aucun contenu n'y est écrit directement), puis boucle `mkdir(candidate)` **non récursif** sur `seo/audits/<date>-n<niveau>`, `-2`, `-3`... : un `EEXIST` fait passer au suffixe suivant plutôt que d'écraser, ce qui rend la réservation atomique même entre deux process concurrents. `runCollect` retourne maintenant `Manifest & { out: string }` (le fichier `raw/manifest.json` sur disque, lui, n'a pas changé de forme). Le CLI n'exige plus `--out` et imprime `dossier : <chemin>` en toute première ligne de sortie (avant `collecte terminée : ...`), `--out` explicite reste possible et prioritaire (compatibilité avec les appels existants de `runCollect`).
- `plugin/skills/audit/SKILL.md`, sections « 0. Préparer » et « 1. Collecter » : le modèle ne calcule plus le suffixe, il appelle `collect.ts` sans `--out`, lit `dossier : ...` sur la première ligne et l'utilise pour la suite.
- Nouveau test dans `plugin/skills/audit/scripts/tests/collect.test.ts` : deux appels successifs de `runCollect` sans `out`, dans un répertoire de travail temporaire dédié (`process.chdir`), donnent deux dossiers distincts (`<base>` puis `<base>-2`), et le `raw/manifest.json` du premier dossier est comparé **par contenu** avant/après le second appel.

Preuve, CLI réel, deux runs successifs dans un dossier neuf sur le site jouet :
```bash
$ bun collect.ts http://localhost:8787 --max-pages 2
dossier : seo/audits/2026-08-27-n0
collecte terminée : 2 pages, robots.txt 200, 2 sitemap(s), llms.txt 200, PageSpeed PSI_API_KEY absent : PERF-01 non exécutable
$ bun collect.ts http://localhost:8787 --max-pages 2
dossier : seo/audits/2026-08-27-n0-2
collecte terminée : 2 pages, robots.txt 200, 2 sitemap(s), llms.txt 200, PageSpeed PSI_API_KEY absent : PERF-01 non exécutable
$ ls seo/audits/
2026-08-27-n0
2026-08-27-n0-2
```
Deux dossiers distincts créés sans concertation entre les deux appels, `dossier :` bien en première ligne. Preuve « premier dossier inchangé au bit près » : test unitaire `collect.test.ts` (`bun test`, décrit ci-dessus), qui compare le contenu texte intégral de `raw/manifest.json` du premier dossier avant et après le second appel (`expect(manifest1After).toBe(manifest1Before)`), verte.

### R-3 (Mineur) : IDX-03 et IDX-04, faux positifs sur localhost

Changé : `plugin/skills/audit/references/checks/indexability.md`, champ `Comment` de IDX-03 et IDX-04, une clause ajoutée à chacun : hôte `localhost` ou `127.0.0.1` → Info « non applicable en local », jamais Critique (IDX-03) ni Important (IDX-04). Visible en pratique dans le rapport « après » de R-1 ci-dessus : IDX-03 et IDX-04 y sont en `[Info]`, pas en Critique/Important.

### R-4 (Mineur) : `{{nb_checks}}` ambigu entre 26 et 27

Changé : `plugin/skills/audit/references/report-template.md`, commentaire HTML ajouté juste après la ligne d'en-tête (non rendu dans le rapport final) : `{{nb_checks}}` = nombre de vérifications dont le niveau est inférieur ou égal au niveau exécuté (26 au niveau 0), jamais le total des blocs de `references/checks/`. Vérifié : `bun -e` comptant les checks de niveau 0 via `parseChecks` donne bien 26. Le rapport « après » de R-1 ci-dessus affiche « 26 vérifications ».

### R-5 (Mineur) : correctif ROBOTS-02 mal formulé pour le cas lemonde

Changé : `plugin/skills/audit/references/checks/robots.md`, bloc ROBOTS-02, champ `Correctif` : phrase ajoutée avant l'exemple, « modifier le groupe existant du bot s'il en a déjà un (passer Disallow: / en Allow: /) ; n'ajouter un nouveau groupe que s'il n'en a pas », l'exemple de blocs à ajouter est conservé pour le cas où le site n'a encore aucun groupe.

### R-6 (Info) : commentaire trompeur dans `psi.ts`

Changé : `plugin/skills/audit/scripts/lib/psi.ts`, commentaire au-dessus de `fetchPsi` reformulé : le code HTTP est conservé dans `PsiFacts.error`, à charge de l'appelant de le journaliser ou de l'afficher (au lieu de « on journalise le code HTTP »). Aucun changement de comportement.

### Vérifications globales

```bash
$ bun test
bun test v1.4.0 (34cbb9a40)

 57 pass
 0 fail
 569 expect() calls
Ran 57 tests across 10 files. [1.59s]
```
(53 avant la revue, +4 : 3 dans `lint-report.test.ts`, 1 dans `collect.test.ts`.)

```bash
$ bun skills/audit/scripts/check-sources.ts
...
50 citations retrouvées, 0 en échec, 0 à vérifier à la main
```
Inchangé (50/0) : R-1 à R-6 ne touchent aucun champ `Source`, uniquement `Comment`, `Correctif` et la logique de `lint-report.ts`/`collect.ts`.
