---
title: erom-seo, plugin Claude Code d'audit et de stratégie SEO/GEO
date: 2026-08-27
status: proposed
project: erom-agence-seo
notes_liees:
  - .claude/notes/2026-08-27-arbitrages-geo.md
  - inspiration/SOURCE-marketingskills.md
  - ~/.claude/erom-store/researchs/2026-08-27-seo-geo-2026-outils-gratuits.md
  - notebook NotebookLM 93303de0-95ea-4450-ad22-e42c0e85af20
---

# erom-seo : design

## 1. But

Un plugin Claude Code pour l'agence : auditer, décider, construire et lancer le SEO et le GEO (Generative Engine Optimization, la visibilité dans les réponses des moteurs IA) de sites, les siens et ceux des clients, **sans aucun abonnement tiers payant**.

Deux scénarios fondateurs :

- **S1, le RDV.** Romain arrive chez un prospect avec un audit préparé à partir de la seule URL. L'audit montre ce qui est cassé, avec la preuve et la source officielle. Chaque trouvaille doit résister au dev du client.
- **S2, le chantier.** Romain construit un site pour un client et veut qu'aucun « Romain bis » ne puisse dire ensuite que le SEO est moisi. La même liste de vérifications sert de bouclier : le build est fini quand l'audit est vert.

Contraintes :

- Zéro abonnement payant. Données et outils gratuits ou officiels seulement : Google Search Console, Bing Webmaster Tools, PageSpeed Insights, IndexNow, schema.org, documentation des moteurs.
- Rapports en français. Citations de documentation en anglais, verbatim : c'est ce qui les rend incontestables.
- Le plugin reste privé (sites propres et clients de l'agence). Le repo `erom-agence-seo` héberge le plugin (`plugin/`) et les dossiers clients (`clients/`).

## 2. Décisions d'architecture

### D1. Le dossier au centre, pas les phases

Le système s'organise autour d'un dossier par site, `seo/`, que quatre verbes lisent et écrivent. Les phases du cycle de vie d'un site (stratégie, build, audit, lancement) sont des verbes sur ce dossier, pas des silos.

Battu : un découpage par phase (strategy, build, audit-dev, audit-prod), chacune autonome. Perdu parce que les deux audits dupliquent la même liste de vérifications et que rien ne relie les phases : chaque skill reposerait les mêmes questions à chaque fois.

### D2. Le dossier est `seo/` sous le répertoire courant

Une seule règle, deux usages. En S1, Romain travaille depuis `clients/<domaine>/` dans ce repo : le dossier est `clients/<domaine>/seo/`. En S2, le dossier est `<repo du site>/seo/` et part avec le code du client : c'est un livrable, pas un déchet. Le plugin ne sait pas dans quel scénario il est.

Battu : un dossier central dans le repo de l'agence pour tous les sites. Perdu parce que le plugin devrait connaître un chemin externe quand Romain travaille dans le repo du site, et que le client perdrait la trace de la démarche.

Battu : un dossier caché `.seo/`. Perdu parce que le client doit voir la stratégie et les audits, et que Romain les lit lui-même.

### D3. Un seul audit, trois niveaux d'entrée, deux couches de vérifications

Même liste de vérifications quel que soit le contexte. Chaque vérification déclare le niveau minimal dont elle a besoin et sa couche.

| Niveau | Entrée | Scénario |
|---|---|---|
| 0 | L'URL seule | S1 avant signature |
| 1 | URL + accès Search Console et Bing Webmaster Tools | S1 après signature |
| 2 | Le code (site lancé en local) + `strategy.md` | S2 |

- Couche **absolue** : vraie pour tout site, ancrée sur une documentation officielle. Tourne dès le niveau 0.
- Couche **stratégique** : compare le site à `strategy.md` (pages ↔ mots-clés, identité, entité). Niveau 2.

Le rapport indique le niveau exécuté et liste nommément ce qu'il n'a pas pu voir. En RDV, « voilà ce que je verrai une fois les accès ouverts » vend le niveau suivant.

Battu : deux audits séparés, dev et prod. Perdu parce que c'est la même liste, seule l'entrée change.

### D4. Collecte par script, octets exacts

Un script `bun` collecte les fichiers bruts (robots.txt, sitemap, llms.txt, pages, headers) dans `raw/` avec un manifeste. Claude juge ensuite à partir de `raw/`.

Battu : Claude collecte lui-même avec `WebFetch`. Perdu parce que `WebFetch` résume la page via un petit modèle : lossy, non reproductible, sans preuve durable. Un `raw/` daté se rouvre six mois après.

### D5. Pas de source officielle, pas de vérification

Une vérification n'entre dans la liste que si elle cite une documentation officielle (moteur, spec, W3C ou IETF) avec une citation verbatim. Une règle qui ne repose que sur des blogs d'agence est exclue, quelle que soit sa popularité. Un script de contrôle vérifie que chaque source répond et contient sa citation (AC-6).

Battu : accepter les « bonnes pratiques » consensuelles du corpus. Perdu parce que le corpus contient des erreurs vivantes dans des repos à 45 000 étoiles (`Google-Extended` présenté comme le bot des AI Overviews, voir la note d'arbitrages), et que l'audit doit résister au dev du client.

### D6. Le niveau 2 est un niveau 0 sur localhost, plus la couche stratégique

En dev, le site tourne en local et le script collecte sur `http://localhost:<port>`. L'audit reste agnostique du stack. Seul `build` connaît le stack.

Battu : des vérifications qui lisent le code source (`app/robots.ts`, `generateMetadata`). Perdu parce que spécifique à Next.js et redondant avec l'observation du site rendu.

### D7. Rapport Markdown structuré d'abord, rendu client ensuite

`report.md` est le livrable v1 : Romain le lit avant le RDV et en parle. Le rendu « beau » pour le client est un chantier ultérieur, borné, rendu possible par la structure fixe du rapport.

Battu : un document client dès la v1. Perdu parce que le fond doit être juste avant d'être beau. Décision de Romain, 2026-08-27.

### D8. Ordre de construction du plugin

1. `audit` niveau 0 (S1). Cette spec porte les critères d'acceptation de ce chantier.
2. `strategy` + couche stratégique + niveau 2 (ouvre S2).
3. `build`, Next.js d'abord.
4. `launch`.
5. Niveau 1 : API Search Console et Bing Webmaster Tools.
6. Rendu client du rapport.

Battu : commencer par `strategy`, l'ordre du cycle de vie. Perdu parce que l'audit se vend, se vérifie, et que quatre vérifications sont déjà prêtes et sourcées.

## 3. Composants

### 3.1 Plugin

```
plugin/
  .claude-plugin/plugin.json      name: erom-seo
  README.md                       attribution MIT Corey Haines pour la matière dérivée
  LICENSE                         MIT
  skills/
    audit/
      SKILL.md
      scripts/collect.ts          collecte (D4)
      scripts/check-sources.ts    contrôle des sources (AC-6)
      references/
        levels.md                 les 3 niveaux, ce que chacun voit
        report-template.md        gabarit du rapport
        checks/
          robots.md
          snippets.md
          indexability.md
          structured-data.md
          tags.md
          freshness.md
          rendering.md
          performance.md
          ai-presence.md
    strategy/
      SKILL.md
      references/strategy-template.md
    build/
      SKILL.md
      references/                 Next.js, dérivé de inspiration/nextjs-seo
    launch/
      SKILL.md
      references/launch-template.md
```

Invocation : `/erom-seo:audit`, `/erom-seo:strategy`, `/erom-seo:build`, `/erom-seo:launch`. Les skills restent invocables par le modèle sur une demande en langage naturel (« audite le SEO de acme.fr »).

Le corpus `inspiration/` (Corey Haines sous MIT, searchfit, nextjs-seo) est une matière première : on en dérive nos références, on ne les copie pas telles quelles. `inspiration/` reste hors git.

### 3.2 Dossier `seo/`

```
seo/
  strategy.md                     S2 ; absent en S1 niveau 0
  launch.md                       S2
  audits/
    2026-09-03-n0/
      report.md
      raw/
        manifest.json
        robots.txt
        sitemap.xml
        llms.txt
        pages/
          index.html
          index.headers
          <slug>.html
          <slug>.headers
```

Un dossier par audit, daté, suffixé du niveau. Jamais écrasé : relancer crée un nouveau dossier.

## 4. Le verbe `audit`

### 4.1 Pipeline en trois temps

**Temps 1, collecter** (`collect.ts`).

- Entrée : URL de base, niveau (déduit : `localhost` et `strategy.md` présent → 2, sinon 0 ; le niveau 1 viendra avec les accès), nombre max de pages (défaut 10).
- Récupère `robots.txt`, `sitemap.xml` (suit un index de sitemaps sur un niveau, plafonné), `llms.txt`, la home, puis les N-1 premières URLs du sitemap dans son ordre.
- Consigne pour chaque requête : URL demandée, URL finale, chaîne de redirections, statut, content-type, taille, horodatage.
- Relève les indices de stack (meta `generator`, headers `x-powered-by`, `server`) pour la ligne Info du rapport.
- Teste aussi : `http://` → `https://`, `www` ↔ apex, une URL inexistante (soft 404).
- User-agent explicite `erom-seo-audit/<version>`. Timeout par requête. Un échec est consigné, jamais bloquant.
- Sortie : `raw/` + `manifest.json`.

**Temps 2, vérifier.** Claude lit `manifest.json` et `raw/`, puis déroule `references/checks/*.md`. Pour chaque vérification : applicable au niveau exécuté ? Si non, elle va dans « Ce que je n'ai pas pu voir ». Si oui : passée, ou trouvaille avec ses cinq champs.

**Temps 3, rapporter.** Écrit `report.md` selon `report-template.md`.

### 4.2 Format d'une vérification

```
### ROBOTS-02 : bloque un bot de récupération
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucun `Disallow: /` (ni sur les pages clés) pour OAI-SearchBot,
             ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot
Comment    : parser raw/robots.txt par groupes User-agent ; appliquer la
             précédence (le groupe le plus spécifique gagne)
Source     : <URL officielle> « citation verbatim »
Correctif  : bloc robots.txt à proposer, séparant entraînement et récupération
Effort     : rapide
```

Tous les champs sont obligatoires. Sans `Source`, la vérification n'est pas livrable.

### 4.3 Familles et vérifications candidates, niveau 0

| Famille | Id | Vérifie | Sévérité |
|---|---|---|---|
| Bots IA | ROBOTS-01 | robots.txt présent et parsable | Info |
| | ROBOTS-02 | bloque un bot de récupération (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot) | Critique |
| | ROBOTS-03 | bloque Googlebot ou Bingbot | Critique |
| | ROBOTS-04 | `Google-Extended` bloqué : rappel que cela ne retire pas des AI Overviews | Info |
| | ROBOTS-05 | sitemap déclaré dans robots.txt | Mineur |
| Snippets | SNIP-01 | `nosnippet` ou `data-nosnippet` sur une page clé | Critique |
| | SNIP-02 | `max-snippet:0` (Critique) ou sous un seuil fixé au plan, avec sa source (Important) | Critique |
| | SNIP-03 | `noindex` sur une page clé | Critique |
| Indexabilité | IDX-01 | sitemap.xml présent, XML valide, URLs en 200 | Important |
| | IDX-02 | canonical présent, absolu, cohérent | Important |
| | IDX-03 | HTTPS et redirection http → https | Critique |
| | IDX-04 | une seule version www / apex | Important |
| | IDX-05 | soft 404 (page inexistante servie en 200) | Important |
| Données structurées | SD-01 | JSON-LD présent et JSON valide | Important |
| | SD-02 | Organization avec `sameAs` | Important |
| | SD-03 | schéma de type page adapté (Article, Product, FAQPage) | Mineur |
| Balises | TAG-01 | title présent, unique par page | Important |
| | TAG-02 | meta description | Mineur |
| | TAG-03 | H1 unique | Important |
| | TAG-04 | attribut `lang` | Mineur |
| | TAG-05 | Open Graph de base | Mineur |
| Fraîcheur | FRESH-01 | date visible sur les pages de contenu | Mineur |
| | FRESH-02 | cohérence date visible ↔ `dateModified` ↔ `Last-Modified` (schema drift) | Important |
| Rendu | REND-01 | contenu principal présent dans le HTML brut, sans JavaScript | Critique |
| Performance | PERF-01 | Core Web Vitals via PageSpeed Insights | Important |
| Présence IA | AI-01 | `llms.txt` présent ou absent | Info |
| | AI-02 | clé IndexNow déposée | Mineur |
| | AI-03 | présence dans l'index Bing | Important |

« Page clé » = la home et les pages du sitemap collectées.

Cette liste est un point de départ. Le plan du chantier 1 fixe la liste livrée, chaque entrée avec sa source épinglée et sa citation. Une vérification sans source à la fin du plan est retirée, jamais livrée sans source.

### 4.4 Niveaux 1 et 2, conçus maintenant, livrés plus tard

- **Niveau 1** : impressions et pages citées dans les fonctionnalités IA (rapport Generative AI performance de Search Console, rapport AI Performance de Bing), état d'indexation réel, requêtes.
- **Niveau 2, couche stratégique** : STRAT-01 chaque page de `strategy.md` existe et vise son mot-clé (title, H1, ouverture) ; STRAT-02 la phrase d'identité est sur la home et dans Organization ; STRAT-03 les `sameAs` prévus sont en place ; STRAT-04 la cadence de fraîcheur est respectée par type de page.

### 4.5 Erreurs

- Site injoignable : manifeste avec le statut, rapport court « collecte impossible » et la raison. Pas de trouvailles inventées.
- Fichier absent (`robots.txt`, `sitemap.xml`) : statut 404 dans le manifeste, la vérification correspondante devient trouvaille ou Info.
- Protection anti-bot (403, challenge) : consigné ; le rapport le dit et propose une collecte manuelle depuis le navigateur.
- Sitemap énorme : plafond de pages, le rapport précise l'échantillon.

## 5. Format du rapport

Un seul fichier, `report.md`, toujours la même forme.

```
# Audit SEO/GEO : acme.fr
2026-09-03 · Niveau 0 (URL seule) · 12 pages collectées · 28 vérifications
Stack détecté : WordPress 6.x (Info)

## En bref
3 Critique · 5 Important · 4 Mineur · 2 Info
Les trois choses à dire en RDV :
1. Vous êtes invisible pour ChatGPT et Claude : votre robots.txt les bloque.
2. ...
3. ...

## Trouvailles
(par sévérité décroissante)

### [Critique] ROBOTS-02 : bloque Claude-User et OAI-SearchBot
Preuve    : raw/robots.txt lignes 4-7
Pourquoi  : ces bots vont chercher la page au moment de la question.
            Bloqués, vous ne pouvez pas être cité.
Source    : <URL> « citation verbatim »
Correctif : (bloc prêt à coller)
Effort    : rapide

## Ce que je n'ai pas pu voir
Niveau 1, avec les accès : <liste nommée des vérifications>
Niveau 2, avec le code et la stratégie : <liste nommée>

## Vérifications passées
ROBOTS-01 robots.txt présent et parsable
TAG-04 attribut lang
...

## Annexe : collecte
(le manifeste : URL, statut, taille, heure)
```

Sévérités :

- **Critique** : exclu d'une surface (AI Overviews, ChatGPT Search, Claude) ou indexation cassée.
- **Important** : perte mesurable, documentée.
- **Mineur** : hygiène.
- **Info** : ni bien ni mal, du contexte. `llms.txt` vit ici (Google l'ignore, c'est écrit).

Effort en trois crans : rapide, moyen, lourd. Pour chiffrer la mission sans promettre des heures.

« Vérifications passées » n'est pas de la décoration. En S1, ça montre que tout a été regardé. En S2, c'est le bouclier : la liste de ce qu'un Romain bis ne pourra pas reprocher.

## 6. Les autres verbes

### 6.1 `strategy`

Une interview, une question à la fois, qui produit `seo/strategy.md` :

```
# Stratégie SEO/GEO : <site>
Date · Statut

## Identité
<Site> est <catégorie> qui <différenciateur>.
(une phrase ; nourrit Organization et le H1 de la home)

## Cibles
Audience · Langue · Pays
Surfaces IA visées et pourquoi :
  B2B → Copilot, LinkedIn · Dev → Claude, Brave · Grand public → AI Overviews, YouTube

## Concurrents
| Concurrent | Ce qu'il vise (sitemap, titres) | Ce qu'on prend, ce qu'on évite |

## Pages ↔ mots-clés
| Page | Intention | Mot-clé principal | Secondaires | Type | Cadence | Signaux à l'appui |
(la table que STRAT-01 lit)

## Entité
sameAs visés : LinkedIn, Wikidata si éligible, annuaires, plateformes d'avis
NAP si local

## Liens externes
Annuaires, avis, partenaires, presse, podcasts. Pas d'achat de liens.

## Cadence de fraîcheur
Evergreen : trimestriel · Transactionnel et comparatifs : 2 à 4 semaines
Double signal obligatoire : date visible + dateModified + Last-Modified

## Ce qu'on ne sait pas
Volumes de mots-clés : signaux gratuits utilisés et leurs limites.
```

Les volumes de mots-clés restent le point faible du « zéro abonnement ». Le fichier dit sur quels signaux gratuits chaque choix repose. Instruit au chantier 2.

### 6.2 `build`

Lit `strategy.md` et le dernier `report.md`. Corrige dans l'ordre Critique → Important → Mineur, l'id de la trouvaille dans chaque commit. Next.js App Router via ses références (metadata API, `sitemap.ts`, `robots.ts`, JSON-LD). Autre stack : Claude lit le repo et vise le même HTML de sortie, sans référence dédiée en v1. Ne touche pas au contenu rédactionnel.

**Terminé quand un audit niveau 2 frais n'a plus ni Critique ni Important.** La boucle build → audit → build est le système entier.

### 6.3 `launch`

Écrit `seo/launch.md`, deux listes à cocher, chaque ligne avec sa façon de vérifier :

```
## Avant mise en ligne
- [ ] Audit niveau 2 vert (0 Critique, 0 Important)      · seo/audits/<dernier>/report.md
- [ ] robots.txt de production, pas celui du staging     · curl <prod>/robots.txt
- [ ] canonical sur le domaine final                     · raw/pages/*.html
- [ ] sitemap.xml accessible et déclaré                  · curl
- [ ] Search Console : propriété vérifiée                · capture
- [ ] Bing Webmaster Tools : site vérifié                · capture
- [ ] clé IndexNow déposée à la racine                   · curl <prod>/<clé>.txt
- [ ] redirections 301 si migration, testées sur l'ancien sitemap · script
- [ ] Organization + sameAs en place                     · SD-02 passé

## Après mise en ligne
- [ ] J+1  : sitemap soumis (GSC, Bing), ping IndexNow   · captures
- [ ] J+3  : pages clés indexées (inspection d'URL)      · capture
- [ ] J+7  : premières impressions GSC                   · capture
- [ ] J+30 : rapports IA lus (GSC Generative AI, Bing AI Performance) · notes ici
- [ ] J+90 : audit niveau 1                              · seo/audits/<date>-n1/
```

## 7. Hors périmètre v1

Noir sur blanc : rédaction de contenu, traduction, pages programmatiques, reporting mensuel, analyse de backlinks (données payantes), volumes de mots-clés fiables, rendu client du rapport, API de niveau 1, YouTube.

## 8. Points à instruire avant ou pendant le plan

- **PageSpeed Insights API** : clé requise, quota. [NON VERIFIE]
- **REND-01** : source primaire sur les bots IA et l'exécution de JavaScript avant livraison ; sinon rétrogradé en Info.
- **AI-03** : méthode de niveau 0 pour la présence dans Bing sans scraping fragile ; sinon reporté au niveau 1.
- **Validation schema.org** : pas d'API publique connue. [NON VERIFIE] En v1 : validité JSON + propriétés requises selon la doc Google, lien vers le Rich Results Test dans le rapport.
- **Sources gratuites de mots-clés** pour `strategy` : outil de recherche de mots-clés de Bing Webmaster Tools, autocomplétion, People Also Ask, sitemaps concurrents. [NON VERIFIE]
- **URLs officielles à épingler par famille** : Google robots.txt, robots meta tag, ai-features, structured data, canonical, sitemaps, soft 404 ; OpenAI bots ; Anthropic crawlers ; Perplexity crawlers ; IndexNow ; web.dev Core Web Vitals ; schema.org.
- `npx is-agentic` (outil de scoring gratuit cité par le corpus) : `npx` est bloqué par le garde-fou local, passer par `bunx` ou le site. Pas intégré en v1, au mieux une ligne Info.

## 9. Critères d'acceptation, chantier 1 (`audit` niveau 0)

- **AC-1**
  Comportement : quand je lance `/erom-seo:audit https://<site>` dans un dossier vide, alors `seo/audits/<date>-n0/report.md` et `seo/audits/<date>-n0/raw/manifest.json` existent, et `raw/` contient au moins `robots.txt` (ou son statut 404) et `pages/index.html`.
  Vérifié par : `ls -R seo/audits/` et lecture du manifeste.

- **AC-2**
  Comportement : quand le site audité bloque un bot de récupération (par exemple `Claude-User` ou `OAI-SearchBot`) dans son robots.txt, alors le rapport contient une trouvaille Critique ROBOTS-02 dont la preuve cite `raw/robots.txt` avec les lignes, et dont la source est la documentation de l'éditeur du bot.
  Vérifié par : audit d'un site réel connu pour bloquer, à repérer pendant le plan ; `grep -A6 "ROBOTS-02" report.md`.

- **AC-3**
  Comportement : quand une page clé porte `max-snippet:0` ou `nosnippet`, alors le rapport contient une trouvaille Critique SNIP-01 ou SNIP-02 citant la page et la doc Google `ai-features`.
  Vérifié par : audit d'une page de test sur un site à Romain portant la directive ; `grep -A6 "SNIP-0" report.md`.

- **AC-4**
  Comportement : quand l'audit tourne au niveau 0, alors la section « Ce que je n'ai pas pu voir » nomme chaque vérification de niveau 1 et 2 par son id et son nom.
  Vérifié par : lecture du rapport ; comparaison avec `references/levels.md`.

- **AC-5**
  Comportement : quand une trouvaille sort, alors elle porte ses cinq champs (Preuve, Pourquoi, Source, Correctif, Effort) et sa Source est une URL d'un domaine officiel (developers.google.com, support.google.com, platform.openai.com, docs.anthropic.com, docs.perplexity.ai, bing.com, indexnow.org, schema.org, web.dev, w3.org, ietf.org).
  Vérifié par : un grep sur le rapport ; zéro trouvaille sans les cinq champs, zéro Source hors liste. La liste de domaines est ajustée au plan si une doc officielle vit ailleurs (par exemple `learn.microsoft.com` ou `blogs.bing.com` pour Bing) ; elle ne s'ouvre jamais à un blog d'agence.

- **AC-6**
  Comportement : quand je lance `bun plugin/skills/audit/scripts/check-sources.ts`, alors chaque Source citée dans `references/checks/*.md` répond 200 et la page contient la citation verbatim associée ; le script sort en erreur sinon.
  Vérifié par : exécution du script, sortie zéro. C'est l'anti-folklore, en dur.

- **AC-7**
  Comportement : quand je relance l'audit du même site un autre jour, alors un nouveau dossier daté apparaît et l'ancien est intact.
  Vérifié par : `ls seo/audits/` avant et après, `diff -r` sur l'ancien.

Les critères sont cochés un par un, avec la commande réellement lancée et sa sortie, avant de déclarer le chantier 1 terminé. Un critère non couru est dit tel quel, jamais arrondi.

## 10. Sources primaires déjà vérifiées le 2026-08-27

- https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
  « Google-Extended does not impact a site's inclusion in Google Search nor is it used as a ranking signal in Google Search. »
- https://developers.google.com/search/docs/appearance/ai-features
  « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
  « To limit the information shown from your pages in Search, use `nosnippet`, `data-nosnippet`, `max-snippet`, or `noindex` controls. »
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
  « Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them. » (à propos des fichiers IA type `llms.txt`)

Le détail des quatre arbitrages (Google-Extended, Search Console, llms.txt, fraîcheur) est dans `.claude/notes/2026-08-27-arbitrages-geo.md`.
