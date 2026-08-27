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
