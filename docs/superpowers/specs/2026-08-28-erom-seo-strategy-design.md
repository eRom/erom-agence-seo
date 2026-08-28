---
title: erom-seo, chantier 2 : le verbe strategy, la couche stratégique et le niveau 2
date: 2026-08-28
status: proposed
project: erom-agence-seo
spec_mere: docs/superpowers/specs/2026-08-27-erom-seo-design.md
notes_liees:
  - docs/recherches/2026-08-27-mots-cles-gratuits.md
  - .claude/notes/2026-08-27-arbitrages-geo.md
  - plugin/skills/audit/references/levels.md
cobaye: /Users/recarnot/dev/chico-happiness (commentchercherbonheur.org, Next.js 16, 10 pages)
---

# erom-seo, chantier 2 : `strategy`, couche stratégique, niveau 2

Cette spec porte le chantier 2 de l'ordre D8 de la spec mère. Elle ne répète pas la spec mère : elle la précise là où le chantier 2 la touche, et l'amende sur un point (D9). Décisions prises avec Romain le 2026-08-28 entre 6 h 20 et 7 h 10.

## 1. But

Ouvrir le scénario S2 (le chantier) et enrichir S1 après signature :

- **`strategy`** produit `seo/strategy.md`, le contrat SEO/GEO d'un site : identité, cibles, concurrents, pages et mots-clés, entité, liens, cadence. Lisible par le client, lu par des scripts.
- **La couche stratégique de l'audit** compare un site à ce contrat : cinq vérifications (STRAT-01 à STRAT-04, AI-02) qui s'ajoutent aux 26 du niveau 0 dès qu'un `strategy.md` existe.
- **Le niveau 2** fait tourner l'audit sur un site lancé en local, pour la boucle build → audit → build du chantier 3.

Contrainte inchangée : zéro abonnement. Pour la demande de recherche, seul Bing donne un chiffre gratuit et officiel, et seulement sur les têtes de requête (recherche du 27/08). Tout chiffre écrit porte sa source et sa date ; un vide chez Bing s'écrit « non mesurable gratuitement », jamais un chiffre inventé.

## 2. Décisions

### D9. La couche stratégique s'allume dès que `seo/strategy.md` existe, à tout niveau

Amende D3 et D6 de la spec mère, qui liaient la couche stratégique au niveau 2. Règle nouvelle : **le niveau dit d'où on regarde (0 : l'URL ; 1 : les accès ; 2 : le code en local) ; la couche stratégique s'allume dès qu'il y a une stratégie.** Le rapport le dit en tête : « Couche stratégique : oui / non ».

Cas concret qui a tranché : un client signe, il a déjà un site chez un hébergeur quelconque. Romain écrit la stratégie, audite le site en ligne contre elle, et obtient la liste de travaux. Sans faire tourner le code du client chez lui, ce qui est souvent impossible (WordPress hébergé, Wix).

Battu : niveau 2 seulement, comme écrit dans la spec mère. Plus simple à coder, mais inutilisable pour un site existant qu'on ne peut pas lancer en local. Décision de Romain, 2026-08-28.

### D10. `strategy.md` est du Markdown strict, lu par des scripts

Un seul fichier, lisible par le client. Son tableau « Pages ↔ mots-clés » a un format fixe. Un parseur partagé le lit ; un lint le refuse s'il dérive ; l'audit l'évalue mécaniquement. Même recette que le chantier 1 (rapport structuré + `lint-report.ts`), qui a tenu.

Battu : Claude lit tout, sans parseur. Moins de code, mais rien n'est testable, le format dérive d'un client à l'autre, et `build` (chantier 3) devrait parser le fichier de toute façon.

Battu : un `strategy.yaml` machine rendu en `strategy.md` humain. Deux fichiers à garder synchrones pour un gain nul.

### D11. Bing seul pour la demande, aucune estimation Google

Pour chaque mot-clé, `strategy.md` écrit le chiffre Bing France avec sa date, et « Google : pas de source gratuite ». Aucun coefficient de part de marché.

Battu : une estimation Google = Bing × part de marché, marquée « grossière ». En RDV l'estimation devient le chiffre, et pour un client local ou de niche Bing ne rend rien de toute façon. La vraie conversion Bing → Google viendra du niveau 1 (Search Console contre Bing Webmaster Tools sur les sites de Romain), chantier 5. Décision de Romain, 2026-08-28.

### D12. Cadence par page, colonne « Type » retirée

Le gabarit de la spec mère avait une colonne Type et une colonne Cadence. La cadence est écrite par page, avec un vocabulaire fermé ; le type n'apporte rien de plus aux vérifications. Retiré (YAGNI).

### D13. Le parseur partagé vit dans `plugin/lib/`

`strategy` (lint) et `audit` (évaluation) lisent le même fichier avec le même code : `plugin/lib/strategy.ts`, testé dans `plugin/lib/tests/`. Le script de test du plugin devient `bun test` à la racine.

Battu : le parseur dans `skills/strategy/scripts/lib/` importé par `audit` en chemin relatif. Ça marche, mais le contrat commun mérite un emplacement commun.

### D14. Au niveau 2, la collecte ramène le sitemap sur `localhost`

Un site Next.js en dev sert un sitemap qui liste l'hôte de production (`chico-happiness/src/app/sitemap.ts` écrit `https://commentchercherbonheur.org/...` en dur). Au niveau 2, `collect.ts` réécrit l'hôte de chaque `<loc>` (et des sitemaps déclarés dans robots.txt) vers l'origine locale, chemin gardé, et consigne l'hôte d'origine dans le manifeste. Au niveau 0, rien n'est réécrit (correctif `8d43a49` : les URLs sont gardées telles que listées, la chaîne de redirection est la preuve).

### D15. Toute la récupération réseau reste dans `collect.ts` ; l'évaluation stratégique est pure

`collect.ts` est le seul script qui parle au réseau pendant un audit (D4). Quand `seo/strategy.md` existe, c'est lui qui lit la liste des pages prévues pour les collecter explicitement, et la clé IndexNow pour aller chercher `/<clé>.txt`. `strategy-eval.ts` ne lit que `raw/` et `derived/` : sans réseau, donc testable sur fixtures.

## 3. Composants

```
plugin/
  package.json                       "test": "bun test"
  lib/
    strategy.ts                      parseur de strategy.md, types, normalisation, règle des mots (D13)
    tests/strategy.test.ts
  skills/
    strategy/
      SKILL.md                       l'interview, une question à la fois
      references/strategy-template.md
      scripts/
        keywords.ts                  Bing GetKeywordStats + Wikimedia Pageviews → seo/strategy/<date>/
        lint-strategy.ts             refuse un strategy.md non conforme
        tests/keywords.test.ts       fixtures depuis docs/recherches/echantillons/
        tests/lint-strategy.test.ts
    audit/
      SKILL.md                       niveau 2 = localhost ; couche stratégique = strategy.md présent
      references/
        levels.md                    mis à jour
        report-template.md           en-tête « Couche stratégique »
        checks/
          strategy.md                STRAT-01 à STRAT-04 (nouveau)
          ai-presence.md             AI-02 passe en couche stratégique
          performance.md             PERF-01 : cas « non applicable en local »
      scripts/
        collect.ts                   niveau 2, pages de la stratégie, IndexNow, --no-psi
        strategy-eval.ts             derived/strategy-eval.json (nouveau)
        lint-report.ts               ids attendus selon niveau et couche
        lib/page.ts                  + organization, + opening
        lib/types.ts                 + Manifest.strategy, Manifest.indexnow, SitemapUrlStats.rewrittenFrom
```

Dossier `seo/` d'un site, après le chantier 2 :

```
seo/
  strategy.md                        le contrat, mis à jour en place (git garde l'historique)
  strategy/
    2026-08-28/                      un dossier par exécution de strategy, jamais écrasé (suffixe -2, -3…)
      manifest.json                  date, pays, langue, clé Bing présente ou non, endpoint
      raw/
        bing-keywordstats-<slug>.json
        wikimedia-<article>.json
        concurrents/<domaine>/       collecte de l'audit (raw/, derived/) sur chaque concurrent
      derived/keywords.json
  audits/
    2026-08-28-n0/                   inchangé
    2026-08-29-n2/                   niveau 2 : site en local
      raw/indexnow.txt               la clé servie, si déclarée
      derived/strategy-eval.json     l'évaluation de la couche stratégique
```

## 4. Le fichier `strategy.md`

### 4.1 Gabarit

Huit sections H2, dans cet ordre, toutes obligatoires. Le gabarit complet vit dans `references/strategy-template.md` ; voici sa forme.

```markdown
# Stratégie SEO/GEO : commentchercherbonheur.org
2026-08-28 · Statut : brouillon · Données : seo/strategy/2026-08-28/

## Identité
L'Institut C.H.I.C.O. est un centre de coaching qui vend le bonheur comme une science exacte.

Une phrase, la première ligne non vide de la section. Elle nourrit le H1 de la home et la description d'Organization.

## Cibles
Audience : grand public francophone en quête de développement personnel
Langue : fr
Pays : FR
Surfaces IA : AI Overviews, ChatGPT
Pourquoi : audience grand public, les réponses IA grand public passent par Google et ChatGPT.

## Concurrents
| Concurrent | Ce qu'il vise | Ce qu'on prend, ce qu'on évite |
|---|---|---|
| exemple.fr | pages piliers « méthode », « formation », blog hebdomadaire | on prend la page pilier par offre ; on évite le blog sans cible |

Ou la ligne « Aucun concurrent identifié. »

## Pages ↔ mots-clés
| Page | Intention | Mot-clé principal | Secondaires | Cadence | Signaux |
|---|---|---|---|---|---|
| / | navigationnelle | institut chico | bonheur, coaching | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |
| /methode | informationnelle | méthode bonheur | bonheur au travail | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) ; autocomplétion : « méthode bonheur au travail » (relevé manuel 2026-08-28) |

## Entité
Nom : L'Institut C.H.I.C.O.
sameAs :
- https://x.com/...
- https://www.tipeee.com/...
NAP : non

## Liens externes
- Annuaires : ...
- Avis : ...
- Partenaires, presse, podcasts : ...
Pas d'achat de liens.

## Cadence de fraîcheur
Evergreen : trimestriel. Transactionnel et comparatifs : 2 à 4 semaines.
Double signal obligatoire : date visible, dateModified en JSON-LD, en-tête Last-Modified.
IndexNow : non

## Ce qu'on ne sait pas
Volumes de recherche : Bing France interrogé le 2026-08-28 sur les 12 mots-clés, aucun n'atteint le seuil de publication de Bing ; Google ne publie pas de volume sans compte publicitaire. La demande réelle est inconnue ; la présence est attestée par l'autocomplétion relevée à la main.
```

### 4.2 Ce que les scripts lisent

- **En-tête** : ligne 2, `AAAA-MM-JJ · Statut : brouillon | validée · Données : seo/strategy/<AAAA-MM-JJ>/`.
- **Identité** : la première ligne non vide de la section est la phrase. STRAT-02 la cherche.
- **Cibles** : `Langue : <code>` et `Pays : <CODE>` pilotent `keywords.ts` (`language=fr-FR`, `country=fr`).
- **Pages ↔ mots-clés** : une ligne par page. `Page` commence par `/` et est unique. `Intention` ∈ {informationnelle, transactionnelle, navigationnelle, locale}. `Cadence` ∈ {2 semaines, 4 semaines, trimestriel, annuel, aucune}. `Secondaires` : liste séparée par des virgules, peut être vide. `Signaux` : texte libre, mais chaque cellule porte au moins une date `AAAA-MM-JJ` (le jour où le signal a été relevé, y compris pour « non mesurable gratuitement »).
- **Entité** : `Nom :` non vide ; `sameAs :` suivi de zéro ou plusieurs lignes `- https://...` ; `NAP : non` ou un bloc `Adresse :` / `Téléphone :`.
- **Cadence de fraîcheur** : une ligne `IndexNow : <clé>` (8 à 128 caractères, lettres, chiffres, tirets) ou `IndexNow : non`.
- **Ce qu'on ne sait pas** : non vide.

### 4.3 `lint-strategy.ts`

`bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/lint-strategy.ts seo/strategy.md` sort 0 si tout est conforme, 1 avec une ligne `ERREUR` par défaut sinon. Refuse : une section manquante ou dans le désordre, un en-tête sans date, statut ou dossier de données, une intention ou une cadence hors vocabulaire, une page sans `/` initial ou en double, un mot-clé principal vide, une cellule Signaux sans date, un `Nom` vide, une clé IndexNow mal formée, une section « Ce qu'on ne sait pas » vide, un tiret cadratin. Pur, comme `lint-report.ts` : la fonction `lintStrategy(md): string[]` est exportée et testée, le bloc `import.meta.main` fait l'entrée-sortie.

### 4.4 `plugin/lib/strategy.ts`

- `parseStrategy(md): Strategy` avec `Strategy = { site, date, statut, dataDir, identite, cibles: { audience, langue, pays, surfaces }, concurrents: Concurrent[], pages: PagePlan[], entite: { nom, sameAs: string[], nap: Nap | null }, indexnow: string | null, inconnu: string }` et `PagePlan = { page, intention, motCle, secondaires, cadence, signaux }`. Lance une erreur typée avec la liste des défauts si le fichier est inanalysable ; `lintStrategy` réutilise cette liste.
- `normalizeText(s)` : minuscules, accents retirés (NFD puis suppression des diacritiques), ponctuation remplacée par des espaces, espaces réduits.
- `keywordMatches(keyword, text)` : vrai si chaque mot du mot-clé normalisé, hors mots vides, apparaît comme mot entier dans le texte normalisé. Mots vides, liste fixe dans le code : le, la, les, l, un, une, des, du, de, d, à, a, au, aux, en, et, ou, pour, sur, par, dans, avec, sans, ce, cet, cette, ces, son, sa, ses, votre, vos, notre, nos, mon, ma, mes. « Agence SEO à Nantes » vise bien « agence seo nantes » ; « seo » seul ne vise pas « agence seo nantes ».
- `cadenceDays(cadence)` : 2 semaines → 14, 4 semaines → 28, trimestriel → 92, annuel → 366, aucune → null.

## 5. Le verbe `strategy`

### 5.1 Préparer

1. Répertoire courant : le dossier du site (`clients/<domaine>/` en S1, le repo du site en S2). `seo/` est créé s'il manque.
2. Contexte lu avant toute question : le dernier `seo/audits/*/derived/pages.json` et `raw/pages/index.html` s'ils existent (titres, h1, descriptions, slugs, liens sortants de la home vers des plateformes sociales) ; `seo/strategy.md` s'il existe (mode mise à jour : Claude annonce ce qu'il contient et demande ce qui change).
3. Clé Bing : `BING_WMT_API_KEY` dans l'environnement (`source ~/.zshenv`). Absente : le dire une fois, continuer ; les signaux Bing seront « non interrogé (clé absente) ».
4. Dossier de données : réservé par `keywords.ts` à la première exécution (`seo/strategy/<AAAA-MM-JJ>/`, suffixe `-2`, `-3`… si besoin, jamais d'écrasement), chemin imprimé sur la première ligne, comme `collect.ts`.

### 5.2 L'interview, une question à la fois

Claude propose, Romain corrige. Une question par message.

1. **Identité** : Claude propose la phrase à partir du title et de la description de la home, ou de ce que Romain dit du site.
2. **Cibles** : audience, langue (défaut fr), pays (défaut FR). Surfaces IA proposées selon l'audience : B2B → Copilot, LinkedIn ; développeurs → Claude, Brave ; grand public → AI Overviews, ChatGPT, YouTube. Le « Pourquoi » s'écrit en une phrase.
3. **Concurrents** : zéro à quatre URLs. Pour chacune, `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/collect.ts <url> --max-pages 10 --no-psi --out seo/strategy/<date>/raw/concurrents/<domaine>`. Claude résume ce que le concurrent vise (titres, h1, slugs du sitemap) ; Romain dit ce qu'on prend et ce qu'on évite.
4. **Pages et mots-clés** : la liste des pages vient du sitemap du dernier audit (site existant) ou de Romain (site à construire). Pour chaque page, Claude propose intention, mot-clé principal et secondaires à partir des titres, des concurrents et des mots de Romain. Romain amende ligne par ligne ou en bloc.
5. **Mesure** : `keywords.ts` sur tous les mots-clés (principaux et secondaires), Wikipédia sur les sujets informationnels pour lesquels un article existe (Claude propose le titre d'article, Romain confirme). Claude montre le tableau des chiffres. Puis une question : relever l'autocomplétion Google des mots-clés principaux maintenant (Romain colle les suggestions, navigateur privé, localisé en France) ou plus tard (la cellule dit « autocomplétion : non relevée »).
6. **Entité** : nom ; `sameAs` proposés depuis les liens de la home vers des plateformes connues (x.com, linkedin.com, facebook.com, instagram.com, youtube.com, tipeee.com, linktr.ee, github.com, wikidata.org, annuaires et plateformes d'avis) ; NAP demandé seulement si une page a l'intention locale.
7. **Liens externes** : liste libre, Claude propose les catégories.
8. **Cadence** : proposée par page selon l'intention (transactionnelle et comparatifs → 4 semaines ; informationnelle → trimestriel ; navigationnelle → trimestriel ; legal et mentions → annuel). IndexNow : clé existante (Romain la colle), à générer (Claude génère 32 caractères hexadécimaux et l'écrit ; `build` la déposera), ou non.
9. **Écriture** : `strategy.md` d'après le gabarit, `lint-strategy.ts` à 0, résumé en cinq lignes (identité, nombre de pages, mots-clés mesurés contre non mesurables, sameAs, cadence). Romain dit « validée » : le statut passe de brouillon à validée. Sinon le fichier reste en brouillon, ce qui n'empêche pas l'audit.

### 5.3 `keywords.ts`

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/keywords.ts [--out <dossier>] [--country FR] [--language fr-FR] [--wiki "<mot-clé>=<Titre_d_article>"]... <mot-clé>...
```

- Sans `--out`, réserve `seo/strategy/<date>/` et l'imprime en première ligne.
- Bing, par mot-clé : `GET https://ssl.bing.com/webmaster/api.svc/json/GetKeywordStats?q=<mot-clé>&country=<pays minuscule>&language=<langue>&apikey=<clé>`. Réponse : points hebdomadaires sur environ six mois (`Query`, `Date`, `Impressions`, `BroadImpressions`), vide sous un seuil non documenté (recherche du 27/08, section 8). Sauvée telle quelle dans `raw/bing-keywordstats-<slug>.json`. Appels séquentiels, 500 ms d'écart. HTTP 400 `InvalidApiKey` : arrêt immédiat, message clair, code 2 (tous les appels suivants échoueraient). Autre erreur : `erreur : <message>` sur ce mot-clé, on continue.
- Wikimedia, par mapping `--wiki` : `GET https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/<Titre>/monthly/<il y a 12 mois>/<mois courant>`, User-Agent identifié, exigé par Wikimedia : `erom-seo-strategy/0.1 (+https://github.com/eRom/erom-agence-seo)`, complété par `contact: <EROM_SEO_CONTACT>` si cette variable d'environnement existe (Romain choisit l'adresse, elle n'est jamais écrite dans un fichier). Sauvé dans `raw/wikimedia-<article>.json`.
- `derived/keywords.json` : une entrée par mot-clé, `{ keyword, statut, bing: { fetchedAt, weeks, total, last, points: [{ date, impressions, broadImpressions }] } | null, wikipedia: { article, fetchedAt, monthly: [{ month, views }] } | null }` avec `statut` ∈ {mesuré, non mesurable gratuitement, non interrogé (clé absente), erreur : …}. « mesuré » exige au moins un point Bing ; une réponse vide vaut « non mesurable gratuitement ».
- `manifest.json` : date, pays, langue, `bingKeyPresent`, endpoint, liste des fichiers.
- **Invariant de sécurité, testé** : avant chaque écriture, le contenu est vérifié sans occurrence de la clé ; sinon le script s'arrête sans écrire. Aucune URL de requête n'est jamais écrite sur disque.
- Endpoint dans une constante `BING_API_BASE`. Microsoft retire SOAP et POX le 31 août 2026 ; JSON est listé à part et devrait survivre. Sonde à rejouer le 1er septembre (note de reprise) ; si l'endpoint meurt, `keywords.ts` rend `erreur` par mot-clé et la stratégie écrit « Bing non interrogé (endpoint indisponible) ».

### 5.4 Ce que `strategy.md` écrit pour un mot-clé

Dans la cellule Signaux, dans cet ordre, chaque élément daté : `Bing FR : <last> / semaine, <total> sur <weeks> semaines (<date>)` ou `Bing FR : rien, non mesurable gratuitement (<date>)` ou `Bing non interrogé (clé absente) (<date>)` ; `Wikipédia fr : <moyenne> vues / mois sur 12 mois (<date>)` si mesuré ; `autocomplétion : « … », « … » (relevé manuel <date>)` ou `autocomplétion : non relevée`. Jamais un chiffre Google.

## 6. L'audit : couche stratégique et niveau 2

### 6.1 `collect.ts`

- **Niveau** : 2 si l'hôte de l'URL est `localhost` ou `127.0.0.1`, sinon 0. `--level` reste disponible pour forcer.
- **Stratégie présente** (`seo/strategy.md` sous le répertoire courant, analysable) : ses pages sont ajoutées à la liste explicite, avant celles du sitemap, et le plafond devient `max(--max-pages, 1 + nombre de pages prévues)` pour qu'aucune page prévue ne tombe sur le plafond. Si `IndexNow : <clé>`, `GET <origine>/<clé>.txt` est collecté dans `raw/indexnow.txt` (manifeste `indexnow: FetchRecord`). Manifeste `strategy: { path, date, statut, pages: n }`. Stratégie inanalysable : `strategy: { path, error: "<défauts>" }`, le rapport le dit et la couche ne tourne pas. Stratégie absente : `strategy: null`.
- **Niveau 2** : réécriture d'hôte (D14) sur les sitemaps déclarés et les `<loc>`, `sitemapUrls.rewrittenFrom: [<hôtes>]` ; PageSpeed non tenté (`psi: { attempted: false, ok: false, error: "non applicable en local" }`) ; sondes `httpToHttps` et `hostVariant` non tentées (`status: 0, error: "non applicable en local"`) ; la sonde 404 tourne.
- **`--no-psi`** : ne tente pas PageSpeed (collecte des concurrents).

### 6.2 `page.ts`

`PageFacts` gagne `organization: { name, description, sameAs: string[] } | null` (premier objet de type Organization ou sous-type, y compris dans `@graph`) et `opening: string` (400 premiers caractères du texte de `<main>` s'il existe, sinon de `<body>`, scripts et styles retirés, espaces réduits).

### 6.3 `strategy-eval.ts`

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/strategy-eval.ts <dossier d'audit> [--strategy seo/strategy.md]
```

Sans réseau (D15). Lit `strategy.md`, `raw/manifest.json`, `derived/pages.json`, `raw/indexnow.txt`. Écrit `derived/strategy-eval.json` :

```json
{
  "strategy": { "path": "seo/strategy.md", "date": "2026-08-28", "statut": "validée", "site": "commentchercherbonheur.org" },
  "pages": [
    { "page": "/methode", "url": "https://www.commentchercherbonheur.org/methode", "found": true, "status": 200,
      "keyword": "méthode bonheur", "inTitle": false, "inH1": true, "inOpening": true,
      "cadence": "trimestriel", "lastKnownDate": null, "cadenceRespected": null }
  ],
  "identity": { "sentence": "…", "onHome": false, "inOrganization": false, "expectedName": "L'Institut C.H.I.C.O.", "organizationName": null, "nameMatches": false },
  "sameAs": [ { "url": "https://x.com/…", "present": false } ],
  "indexnow": { "declared": null, "fetched": false, "status": null, "contentMatches": null }
}
```

Règles :
- `found` : une page collectée dont le chemin égale `page` (barre finale ignorée), statut 200, `challenge` faux. Une page prévue absente de la collecte : `found: false, status: null`.
- `inTitle`, `inH1`, `inOpening` : `keywordMatches(motCle, champ)` ; `inH1` vrai si l'un des h1 correspond.
- `lastKnownDate` : la plus récente parmi `dateModified`, `lastModified`, `visibleDates` analysables ; `cadenceRespected` : `null` si `cadence` vaut « aucune » ou si aucune date ; sinon `aujourd'hui - lastKnownDate <= cadenceDays`.
- `identity.onHome` : `normalizeText(phrase)` est une sous-chaîne du texte normalisé de la home (corps entier, pas seulement l'ouverture) ; `inOrganization` : la description d'Organization normalisée contient la phrase normalisée ; `nameMatches` : `normalizeText(Nom) === normalizeText(organization.name)`.
- `sameAs[].present` : l'URL normalisée (schéma ignoré, hôte en minuscules, barre finale retirée) est dans `organization.sameAs` normalisé de la home.
- `indexnow` : `declared` la clé ou null ; `contentMatches` vrai si `raw/indexnow.txt` existe, statut 200, contenu égal à la clé une fois les espaces retirés.

### 6.4 Les cinq vérifications de la couche stratégique

Fichier `references/checks/strategy.md` (STRAT-01 à 04) ; AI-02 modifié dans `ai-presence.md`. Toutes : `Couche : stratégique`, `Niveau : 0`. Les sources ci-dessous ont été récupérées en direct le 2026-08-28 ; `check-sources.ts` les recontrôle (AC-7).

**STRAT-01 : chaque page prévue existe et vise son mot-clé.** Important. Comment : `pages[]` → `found` faux = trouvaille (page absente) ; `inTitle`, `inH1` ou `inOpening` faux = trouvaille, en citant lesquels. Un seul bloc STRAT-01 qui liste les pages en défaut, une ligne par page. Sources : https://developers.google.com/search/docs/appearance/title-link « Write descriptive and concise text for your <title> elements. » et « Consider ensuring that your main heading is distinctive from other text on a page and stands out as being the most prominent on the page (for example, using a larger font, putting the title text in the first visible <h1> element on the page, etc). » Correctif : title et h1 qui portent le mot-clé, ouverture qui le reprend. Effort : moyen.

**STRAT-02 : la phrase d'identité est sur la home et dans Organization.** Important. Comment : `identity` → `onHome` faux = trouvaille ; `inOrganization` faux = trouvaille (si la home n'a aucune Organization, le dire : la phrase n'a nulle part où vivre ; SD-02 porte déjà l'absence du bloc) ; `nameMatches` faux = trouvaille. Source : https://developers.google.com/search/docs/appearance/structured-data/organization « The name of your organization. » et « A detailed description of your organization, if applicable. » Correctif : la phrase dans le premier bloc de texte de la home, `Organization.name` et `Organization.description` alignés sur `strategy.md`. Effort : rapide.

**STRAT-03 : les sameAs prévus sont en place.** Mineur. Comment : `sameAs[]` → une URL `present` faux = trouvaille, lister les manquantes ; aucun sameAs prévu = non vue, « aucun sameAs prévu dans la stratégie ». Source : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. » Correctif : ajouter les URLs manquantes à `Organization.sameAs`. Effort : rapide.

**STRAT-04 : la cadence de fraîcheur est respectée par page.** Mineur. Comment : `pages[]` → `cadenceRespected` faux = trouvaille, citer la page, la cadence et `lastKnownDate` ; tous `null` = non vue, « aucune date exploitable » (FRESH-01 porte l'absence de dates). Source : https://developers.google.com/search/docs/appearance/publication-dates « That's why our systems look at several factors to determine our best estimate of when a page was published or significantly updated. » et « We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. » Nuance à écrire dans le bloc : la cadence est l'engagement de la stratégie, pas une règle de Google ; la source dit comment Google estime une mise à jour. Correctif : mettre à jour le contenu et propager la date (visible, `dateModified`, `Last-Modified`). Effort : moyen.

**AI-02 : clé IndexNow déposée**, modifié. Mineur, couche stratégique, niveau 0. Comment : `indexnow.declared` null (« IndexNow : non ») = trouvaille « aucune clé prévue » ; clé déclarée et `contentMatches` vrai = passé ; sinon trouvaille (statut et contenu). Source inchangée (indexnow.org). L'ancien Comment « la clé est lue dans le repo » disparaît : la clé est lue dans `strategy.md`.

### 6.5 Rapport et lint

- En-tête du rapport, ligne 2 : `{{date}} · Niveau {{niveau}} ({{entree}}) · Couche stratégique : {{oui (seo/strategy.md, {{statut}}, {{date_strategie}}) | non}} · {{nb_pages}} pages collectées · {{nb_checks}} vérifications`. `nb_checks` = vérifications absolues de niveau ≤ niveau exécuté, plus 5 si la couche est active.
- « Ce que je n'ai pas pu voir » : la ligne « Niveau 2, avec le code et la stratégie » devient « Couche stratégique, avec `seo/strategy.md` : {{les cinq ids et noms}} » quand la couche est inactive ; au niveau 2, une ligne par vérification non applicable en local (PERF-01, IDX-03, IDX-04) avec cette raison ; stratégie inanalysable : une ligne Info avec les défauts du lint.
- `lint-report.ts` : lit `Niveau (\d)` et `Couche stratégique : (oui|non)` dans l'en-tête, erreur si l'un manque. Ids attendus = vérifications dont `niveau <= n` et (`couche === "absolue"` ou couche active). L'invariant R-1 (chaque id exactement une fois) s'applique à cet ensemble.
- `levels.md` : le tableau dit que le niveau 2 est le niveau 0 sur localhost, et qu'une couche stratégique s'ajoute à tout niveau dès que `seo/strategy.md` existe ; la liste « Niveau 2, à livrer au chantier 2 » devient « Couche stratégique : STRAT-01 à 04, AI-02 ».

### 6.6 `SKILL.md` de l'audit

Étape 0 : niveau selon l'hôte ; couche selon la présence de `seo/strategy.md` ; le dire dans le rapport. Étape 1 : après `collect.ts`, si le manifeste porte `strategy` non nul et sans erreur, lancer `strategy-eval.ts <dossier>`. Étape 2 : lire aussi `derived/strategy-eval.json` et parcourir `checks/strategy.md`. Étape 4 : proposer le niveau suivant, et, sans stratégie, proposer `/erom-seo:strategy`.

## 7. Erreurs

- `strategy.md` inanalysable : l'audit tourne sans la couche et écrit les défauts du lint en Info ; `strategy` en mode mise à jour propose de le corriger d'abord.
- Clé Bing absente : dit une fois ; statut « non interrogé (clé absente) » ; la stratégie s'écrit quand même, la cellule Signaux le dit avec sa date.
- Clé Bing refusée (400 InvalidApiKey) : arrêt de `keywords.ts`, code 2, message « clé refusée par Bing, régénérer dans Bing Webmaster Tools » ; rien d'écrit dans `derived/`.
- Endpoint Bing indisponible (après le 31 août) : `erreur` par mot-clé, la stratégie écrit « Bing non interrogé (endpoint indisponible) », note de reprise à mettre à jour.
- Concurrent injoignable : sa collecte échoue comme un audit (manifeste avec le statut), la ligne du tableau dit « injoignable le <date> ».
- Site local non lancé au niveau 2 : la collecte échoue, rapport court « collecte impossible », règle du chantier 1.
- Une page prévue derrière une protection anti-bot (`challenge`) : `found: false` avec la raison, non vue pour cette page, jamais une trouvaille STRAT-01.

## 8. Tests

Suite unique, `cd plugin && bun test`, verte avant chaque commit. Interdits : lire le code source depuis un test, figer un compte de fixture, asserter sur un mock plutôt que sur un comportement.

- `lib/tests/strategy.test.ts` : un `strategy.md` valide se parse en `Strategy` complète ; chaque défaut du lint (section manquante, vocabulaire, page sans `/`, doublon, Signaux sans date, clé mal formée, tiret cadratin) produit son erreur nommée ; `normalizeText` et `keywordMatches` sur les cas « Agence SEO à Nantes », accents, mots vides, mot partiel (« seo » ne vise pas « agence seo nantes ») ; `cadenceDays`.
- `skills/strategy/scripts/tests/keywords.test.ts` : fetcher injecté ; réponse Bing avec points (échantillon `bing-keywordstats-seo-fr.json`) → `mesuré` avec `last`, `total`, `weeks` ; réponse vide (`bing-keywordstats-plombier_nantes-fr.json`) → « non mesurable gratuitement » ; 400 InvalidApiKey → arrêt sans écriture ; clé absente → « non interrogé (clé absente) » sans appel ; Wikimedia (`wikimedia-pageviews-seo-fr-30j.json`) → mensuel ; **invariant** : aucun fichier écrit ne contient la clé, testé avec une clé factice injectée dans une réponse piégée.
- `skills/strategy/scripts/tests/lint-strategy.test.ts` : le gabarit rempli passe ; chaque règle refuse.
- `skills/audit/scripts/tests/page.test.ts` : `organization` extrait depuis un bloc simple et depuis un `@graph` ; `opening` depuis `<main>` puis repli sur `<body>`.
- `skills/audit/scripts/tests/strategy-eval.test.ts` : site jouet + `strategy.md` de fixture ; chaque condition vraie puis fausse (page absente, mot-clé hors title, hors h1, hors ouverture, identité absente de la home, Organization absente, nom différent, sameAs manquant, cadence dépassée, cadence sans date, clé IndexNow servie, absente, contenu différent).
- `skills/audit/scripts/tests/collect.test.ts` : niveau détecté sur localhost ; réécriture d'hôte au niveau 2 (`rewrittenFrom`), aucune au niveau 0 ; PageSpeed et sondes d'hôte non tentés au niveau 2 ; pages de la stratégie collectées avant le sitemap et plafond relevé ; `raw/indexnow.txt` collecté ; `--no-psi`.
- `skills/audit/scripts/tests/lint-report.test.ts` : en-tête sans « Couche stratégique » refusé ; couche active → les cinq ids exigés ; couche inactive → exigés en « non vues » ; niveau 2 → PERF-01, IDX-03, IDX-04 acceptés en « non vues ».
- `checks-format.test.ts` existant : couvre `strategy.md` automatiquement (format des blocs, domaines officiels).

## 9. Critères d'acceptation

Cobaye : `chico-happiness`, répertoire courant `/Users/recarnot/dev/chico-happiness`, dossier `seo/` dans ce repo (D2, scénario S2 ; son commit dans ce repo est le choix de Romain). Les critères sont cochés un par un avec la commande réellement lancée et sa sortie ; un critère non couru est dit tel quel.

- **AC-1**
  Comportement : quand je lance `/erom-seo:strategy` dans `chico-happiness`, alors `seo/strategy.md` existe avec ses huit sections et une ligne par page du sitemap (10), `seo/strategy/<date>/derived/keywords.json` porte une entrée par mot-clé avec son statut, et chaque cellule Signaux porte une date.
  Vérifié par : `bun <plugin>/skills/strategy/scripts/lint-strategy.ts seo/strategy.md` sort 0 ; `jq '[.[] | .statut] | group_by(.) | map({(.[0]): length}) | add' seo/strategy/*/derived/keywords.json`.

- **AC-2**
  Comportement : quand `keywords.ts` interroge une tête de requête (« chatgpt ») et une requête locale (« plombier nantes »), alors la première est « mesuré » avec des points datés et la seconde « non mesurable gratuitement », et aucun fichier écrit ne contient la clé.
  Vérifié par : `source ~/.zshenv && bun keywords.ts --out /tmp/kw chatgpt "plombier nantes"` puis `jq '.[] | {keyword, statut, last: .bing.last}' /tmp/kw/derived/keywords.json` et `grep -rc "$BING_WMT_API_KEY" /tmp/kw | grep -v ':0$'` vide.

- **AC-3**
  Comportement : quand je lance `/erom-seo:audit https://www.commentchercherbonheur.org/` dans `chico-happiness` avec `seo/strategy.md` présent, alors le rapport dit « Niveau 0 » et « Couche stratégique : oui », et STRAT-01, STRAT-02, STRAT-03, STRAT-04, AI-02 apparaissent chacun exactement une fois. Sur l'état actuel du site (titles identiques, aucun JSON-LD, aucune clé), STRAT-01, STRAT-02 et AI-02 sont des trouvailles avec leur preuve dans `derived/strategy-eval.json`.
  Vérifié par : `bun lint-report.ts seo/audits/<date>-n0/report.md` sort 0 ; `grep -c "STRAT-0\|AI-02" report.md` ; lecture des blocs.

- **AC-4**
  Comportement : quand le site tourne en local (`bun run dev`, port 3000) et que je lance `/erom-seo:audit http://localhost:3000`, alors le dossier est `seo/audits/<date>-n2/`, 10 pages sont collectées avec `sitemapUrls.rewrittenFrom` égal à `["commentchercherbonheur.org"]`, PERF-01, IDX-03 et IDX-04 sont dans « Ce que je n'ai pas pu voir » avec « non applicable en local », et la couche stratégique est évaluée.
  Vérifié par : `jq '{level, pages: (.pages|length), rewritten: .sitemapUrls.rewrittenFrom, psi}' raw/manifest.json` ; `bun lint-report.ts` sort 0.

- **AC-5** (chemin d'échec, puis boucle de build en miniature)
  Comportement : quand je remplace dans `strategy.md` le mot-clé principal de `/methode` par un mot absent de la page, alors l'audit niveau 2 suivant porte une trouvaille STRAT-01 qui nomme `/methode` et dit lesquels de title, h1, ouverture manquent ; quand je corrige ensuite le `<title>` et le h1 de `/methode` dans le code pour porter le vrai mot-clé, alors l'audit suivant ne cite plus `/methode` dans STRAT-01.
  Vérifié par : `grep -A8 "STRAT-01" report.md` sur les deux rapports successifs.

- **AC-6**
  Comportement : quand je lance l'audit niveau 0 dans un dossier sans `seo/strategy.md` (par exemple `clients/_smoke/`), alors le rapport dit « Couche stratégique : non », les cinq ids sont dans « Ce que je n'ai pas pu voir » avec la raison « pas de seo/strategy.md », et rien d'autre ne change par rapport au chantier 1.
  Vérifié par : `bun lint-report.ts` sort 0 ; `grep -c "STRAT-0\|AI-02" report.md` égale 5 ; `cd plugin && bun test` vert.

- **AC-7**
  Comportement : quand je lance `bun plugin/skills/audit/scripts/check-sources.ts`, alors chaque Source des cinq vérifications de la couche stratégique répond 200 et contient sa citation.
  Vérifié par : sortie du script, code 0, les lignes `OK STRAT-0x` et `OK AI-02`.

- **AC-8**
  Comportement : quand `BING_WMT_API_KEY` est absente de l'environnement, alors `keywords.ts` le dit une fois, marque chaque mot-clé « non interrogé (clé absente) », sort 0, et `strategy.md` passe le lint avec cette mention datée dans Signaux.
  Vérifié par : `env -u BING_WMT_API_KEY bun keywords.ts --out /tmp/kw2 test` puis `jq '.[0].statut' /tmp/kw2/derived/keywords.json`.

## 10. Hors périmètre du chantier 2

Estimation de volumes Google (D11) ; autocomplétion par script (aucune doc, conditions non vérifiées) ; API Google Trends (alpha fermée) ; `GetRelatedKeywords` (proximité lexicale sans valeur, recherche du 27/08) ; regroupement sémantique de mots-clés ; `build` et `launch` (chantiers 3 et 4) ; niveau 1 (chantier 5) ; rendu client ; rédaction du contenu.

## 11. Points à instruire pendant le plan

- Sonde Bing JSON le 1er septembre 2026 (`curl` de la note de recherche, attendu 400 InvalidApiKey). Si l'endpoint a bougé, trouver la nouvelle base REST avant d'écrire `keywords.ts`.
- Format officiel de la clé IndexNow (longueur, alphabet) sur https://www.indexnow.org/documentation, pour la règle du lint et le générateur.
- Vérifier sur les pages de `chico-happiness` que `<main>` existe ; sinon l'ouverture se lit sur `<body>` et le bruit de la navigation est à mesurer.
- Le texte normalisé de la home pour `identity.onHome` : vérifier sur `chico-happiness` que la phrase d'identité, une fois écrite dans le code, est bien retrouvée malgré les balises inline.
- Quotas de l'API Bing Webmaster : non documentés ; 500 ms entre appels par défaut, à ajuster si 429.

## 12. Sources vérifiées le 2026-08-28

Récupérées par `curl` et balises retirées, texte exact :

- https://developers.google.com/search/docs/appearance/structured-data/organization
  « The name of your organization. » ; « A detailed description of your organization, if applicable. » ; « The URL of a page on another website with additional information about your organization, if applicable. »
- https://developers.google.com/search/docs/appearance/title-link
  « Write descriptive and concise text for your <title> elements. » ; « Consider ensuring that your main heading is distinctive from other text on a page and stands out as being the most prominent on the page (for example, using a larger font, putting the title text in the first visible <h1> element on the page, etc). »
- https://developers.google.com/search/docs/appearance/publication-dates
  « That's why our systems look at several factors to determine our best estimate of when a page was published or significantly updated. » ; « We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
- https://www.indexnow.org/documentation : déjà vérifiée au chantier 1 (AI-02).
- API Bing Webmaster et Wikimedia Pageviews : `docs/recherches/2026-08-27-mots-cles-gratuits.md`, sondes réelles du 27/08.
