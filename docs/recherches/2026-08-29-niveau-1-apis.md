---
title: Niveau 1, ce que les API Search Console et Bing Webmaster donnent vraiment
date: 2026-08-29
status: proposed
project: erom-agence-seo
porte_sur: chantier 5, audit niveau 1 (LVL1-01 à LVL1-03, AI-03) ; chantier 4, lignes d'accès et J+1, J+3 de launch.md
spec: docs/superpowers/specs/2026-08-27-erom-seo-design.md
sondes: section 8, reproductibles sans clé sauf mention
---

# Niveau 1 : ce que les API donnent vraiment

Instruit le 2026-08-29 depuis le dossier d'idéation. Question de départ : existe-t-il un plugin, une skill ou une CLI pour Search Console et Bing Webmaster Tools que `erom-seo` pourrait embarquer pour le niveau 1 ? Réponse courte : non, et la recherche a surtout montré que la donnée-vitrine du niveau 1 n'est dans aucune API. Sources officielles vérifiées par `curl` (toutes en HTTP 200 le 29/08, section 9), discovery doc de l'API Search Console (révision 20260825) lu par script, sondes réelles sans clé. Les sources secondaires sont marquées comme telles.

## Verdict

1. **Aucun outil tiers.** Une dizaine de serveurs MCP communautaires pour Search Console, trois pour Bing, quelques CLI, des packs de skills SEO. Aucun n'entre dans `erom-seo` : ils violent D4 (`collect.ts` seul au réseau, `raw/` en octets exacts), la règle zéro dépendance (Python via `uvx`, Node via `npx`, bloqué par le garde-fou local) et le principe qu'un identifiant de client ne transite jamais par du code tiers. Section 1.
2. **Les deux rapports IA sont hors API.** Google : `searchanalytics.query` n'accepte que `WEB, IMAGE, VIDEO, NEWS, DISCOVER, GOOGLE_NEWS` (discovery doc du 25/08/2026), pas d'export BigQuery, un bouton Export dans l'interface. Bing : « no API is mentioned so the answer is not right now » (Microsoft Q&A, 19/02/2026), « more coming... sooner than later » (Fabrice Canel, relayé le 04/06/2026). **LVL1-01 et LVL1-02 sont donc des imports manuels de CSV**, quel que soit l'outil. Sections 2 et 4.
3. **Ce que l'API donne, elle le donne bien.** Inspection d'URL avec le canonical choisi par Google (`googleCanonical` contre `userCanonical`), l'état de couverture, la date de dernier crawl, l'état robots.txt ; requêtes et pages réelles ; côté Bing, « index details for single page » et les statistiques par page et par requête. De quoi livrer LVL1-03 et AI-03, et deux vérifications que la liste ne prévoit pas encore. Sections 3, 4 et 6.
4. **Le modèle d'accès est le vrai sujet.** Google : un service account de l'agence ajouté par le client sur sa propriété, jeton demandé en `webmasters.readonly`, écriture jamais portée par le jeton. Bing : clé par utilisateur, non scopable ; le client délègue son site au compte de l'agence en lecture seule, l'agence ne demande jamais la clé du client. Section 5.
5. **Coût de le faire à notre façon** : un `fetch` par méthode Bing (le pattern est dans `keywords.ts`), un JWT RS256 signé avec `crypto.subtle` pour Google. Zéro dépendance, `collect.ts --level 1`. Section 6.

## 1. Pourquoi pas un serveur MCP, une skill ou une CLI du marché

Inventaire du 29/08, sources secondaires (pages GitHub et annuaires MCP), donné pour mémoire :

| Outil | Ce que c'est | Pourquoi non pour `erom-seo` |
|---|---|---|
| `AminForou/mcp-gsc` (1,5k étoiles, v0.3.3 juillet 2026) | MCP Python, OAuth ou service account, 20 outils dont `delete sitemap` | Python via `uvx` ; données dans le contexte du modèle, pas dans `raw/` ; outils d'écriture sur une propriété client |
| `charlesdove977/search-console-mcp` | MCP Python minimal (~350 lignes), sans état | Utile comme lecture de code, pas comme dépendance |
| `ahonn/mcp-server-gsc`, `acamolese`, `Shin-sibainu`, `mario-hernandez`… | Variations, souvent avec de la « SEO intelligence » en prompt | Idem |
| `isiahw1/mcp-server-bing-webmaster` | MCP Node, 40 outils lecture et écriture, clé API | `npx` bloqué par le garde-fou ; écriture (blocage d'URL, suppression de site) sous une clé plein pouvoir |
| `zizzfizzix/mcp-server-bwt` | Wrapper de la lib Python `bing-webmaster-tools` | Idem |
| `google-apis-rs` `searchconsole1` | CLI Rust auto-générée, toute l'API, révision 2024-03-04 | Complet mais brut ; nos scripts sont déjà des CLI |
| `benedict2310/gsc-cli` | CLI Go, service account, lecture seule, 6 commits | Embryonnaire |
| Composio, Cogny, SEOcrawl | Proxies SaaS | Les jetons transitent chez eux |
| SE Ranking, SearchFit, `AgriciDaniel/claude-seo` | Packs de skills | Tirent sur des données payantes ou sont du prompt ; la valeur est dans l'API, pas dans la skill |

Le bon usage : lire la liste d'outils de `mcp-gsc` comme carte de la surface API quand on écrira les vérifications. Rien de plus.

Ce que l'architecture impose de toute façon : « `collect.ts` est le seul script qui parle au réseau pendant un audit (D4) », `raw/` reçoit les octets exacts, `derived/` les faits, `lint-report.ts` refuse un rapport qui dérive. Un serveur MCP renvoie le JSON au modèle : plus de preuve sur disque, plus de fixture, plus de lint. C'est un changement d'architecture, pas un ajout.

## 2. Google Search Console : les rapports IA sont hors API

**Le rapport existe et il est limité, cité texto** (aide officielle, `support.google.com/webmasters/answer/16984139`) :

> Impressions are how many times links to your site were shown to a user in a generative AI feature on Google Search.

Dimensions : pages (« final URL », donc le canonical retenu par Google), pays, dates, appareils. Ni requêtes, ni clics, ni CTR, ni position (l'arbitrage 2 de `.claude/notes/2026-08-27-arbitrages-geo.md` tient). Export : la page annonce « an export button to download both the chart and table data ». Disponibilité :

> Not all properties have access to the report, as we're rolling out over time.

Le billet de lancement (`developers.google.com/search/blog/2026/06/gen-ai-performance-reports`) le dit autrement :

> We are rolling these reports out to a subset of websites, allowing us to thoroughly test them and receive feedback before making them widely available.

**Conséquence** : une propriété client peut ne pas avoir le rapport. LVL1-01 a donc trois états, pas deux : mesuré, non disponible pour cette propriété, non fourni (export absent).

**L'API ne l'expose pas.** Discovery doc `searchconsole` v1, révision 20260825, lu par script (sonde 8.1) :

```
SearchAnalyticsQueryRequest.type : enum ['WEB', 'IMAGE', 'VIDEO', 'NEWS', 'DISCOVER', 'GOOGLE_NEWS']
description : Type of report: search type, or either Discover or Gnews.
```

La page de référence (`developers.google.com/webmaster-tools/v1/searchanalytics/query`) liste les mêmes six valeurs en minuscules et ne contient aucune mention d'IA. Source secondaire concordante, Chudi.dev, test du 12/08/2026 sur sa propre propriété : six valeurs candidates (`aiMode`, `AI_MODE`, `generativeAi`, `GENERATIVE_AI`, `aiOverview`, `genAi`) rejetées avec « Invalid value at 'type' » ; pas d'export BigQuery non plus ; « The Generative AI report is a manual artifact. A human has to log in and click EXPORT every time. » Reproductible avec un jeton (sonde 8.4).

## 3. Google Search Console : ce que l'API donne

Authentification, cité texto (`developers.google.com/webmaster-tools/v1/how-tos/authorizing`) : « All requests to the Google Search Console API must be authorized by an authenticated user. » ; « Your application must use OAuth 2.0 to authorize requests. No other authorization protocols are supported. » Scopes : `https://www.googleapis.com/auth/webmasters` (« Read/write access ») et `https://www.googleapis.com/auth/webmasters.readonly` (« Read-only access »).

### 3.1 `searchanalytics.query` : requêtes et pages réelles

- `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`, scopes `webmasters` ou `webmasters.readonly`.
- Dimensions filtrables : `country`, `device`, `page`, `query`, `searchAppearance`, plus `date` et `hour` en regroupement. `rowLimit` : « Valid range is 1–25,000; Default is 1,000 ».
- Fraîcheur, cité texto : « If "all" (case-insensitive), data will include fresh data. If "final" (case-insensitive) or if this parameter is omitted, the returned data will include only finalized data. » Paramètre `dataState`.
- Jours disponibles, cité texto : « To learn which days have data, issue a query without filters grouped by date, for the date range of interest. » C'est la sonde de rétention (incertitude 5).
- Requêtes anonymisées : la longue traîne fine est absente de l'API (déjà instruit, `docs/recherches/2026-08-27-mots-cles-gratuits.md`, section 4).

Usage : impressions et clics par page et par requête sur les pages de `strategy.md`. Confronte STRAT-01 au réel : la page vise son mot-clé, mais Google lui envoie-t-il des impressions dessus ? Candidat LVL1-05, section 6.

### 3.2 `urlInspection.index.inspect` : le canonical choisi par Google

- `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, corps `{ inspectionUrl, siteUrl, languageCode }`, scopes `webmasters` ou `webmasters.readonly` (discovery doc, sonde 8.1).
- Réponse, champs de `IndexStatusInspectionResult` tirés du discovery doc : `verdict` (enum `PASS`, `PARTIAL`, `FAIL`, `NEUTRAL`, `VERDICT_UNSPECIFIED`), `coverageState`, `robotsTxtState`, `indexingState`, `lastCrawlTime`, `pageFetchState`, `googleCanonical`, `userCanonical`, `crawledAs`, `referringUrls`, `sitemap`. Le résultat complet (`UrlInspectionResult`) porte aussi `richResultsResult`, `mobileUsabilityResult`, `ampResult`, `inspectionResultLink`.
- Quota, cité texto (`developers.google.com/webmaster-tools/limits`, « Last updated 2025-08-28 UTC ») : « URL inspection index inspection quota Per-site quota (calls querying the same site): 2000 QPD 600 QPM ». Le billet de lancement (janvier 2022) dit la même chose : « the quota is enforced per Search Console website property (calls querying the same site): 2,000 queries per day 600 queries per minute ». Avec `--max-pages 10` par défaut, sans objet.
- Permission, point ouvert : dans le tableau des permissions de l'aide (`support.google.com/webmasters/answer/7687615`), la ligne « URL Inspection » donne « Fetch only » à l'utilisateur Restricted, la ligne « Submit sitemap » ne lui donne rien. La page de l'API ne dit rien du niveau requis. Incertitude 1, sonde 8.5.

Usage : LVL1-03 (pages du sitemap contre état d'indexation réel) et un candidat LVL1-04 : `googleCanonical` différent de `userCanonical`, la seule vérité sur toute la famille IDX, notamment le cas www / apex d'IDX-04.

### 3.3 `sitemaps` : lecture oui, soumission hors audit

- `sitemaps.get` et `sitemaps.list` : scopes lecture seule acceptés ; `WmxSitemapContent` porte `submitted`, `indexed`, `type` (discovery doc). Si `indexed` est renseigné, LVL1-03 a un compte global gratuit ; incertitude 4.
- `sitemaps.submit` : `PUT https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}`, scope `webmasters` **seul** (discovery doc et page de référence). Un jeton `readonly` ne peut pas soumettre : c'est voulu, section 5.

### 3.4 `sites.list` : la sonde d'accès

Première requête de tout niveau 1 : la propriété du client apparaît dans la liste, avec son `permissionLevel`. Sinon, l'audit s'arrête là et le rapport écrit « accès Search Console non accordé ».

## 4. Bing Webmaster Tools : AI Performance hors API, le reste dedans

### 4.1 AI Performance : pas d'API

- Microsoft Q&A, question du 19/02/2026 (« Is there an official Bing Webmaster API endpoint (or planned support) to export/pull AI Performance data ») ; réponse d'un Independent Advisor, pas d'un employé Microsoft : « In the Blog post, no API is mentioned so the answer is not right now. »
- Search Engine Roundtable, 04/06/2026, relayant Fabrice Canel (Microsoft) interrogé sur un export API : « more coming... sooner than later ». Source secondaire, à revérifier au démarrage du chantier 5 (incertitude 9).
- L'interface `IWebmasterApi` (Microsoft Learn, mise à jour 2023-11-14) ne contient aucune méthode mentionnant AI, Copilot ou citation.

LVL1-02 = export manuel depuis l'interface, comme LVL1-01. Même forme : trois états.

### 4.2 Méthodes utiles, descriptions citées texto de `IWebmasterApi`

| Méthode | Description officielle | Usage niveau 1 |
|---|---|---|
| `GetUserSites()` | « Get user sites » | sonde d'accès (le site délégué apparaît) |
| `GetUrlInfo(siteUrl, url)` | « Get index details for single page » | AI-03, page par page |
| `GetChildrenUrlInfo(siteUrl, url, page, filter)` | « Get index details for directory » | AI-03, liste des URL connues sous la racine |
| `GetUrlTrafficInfo(siteUrl, url)` | « Get index traffic details for single page » | AI-03, preuve par le trafic |
| `GetQueryStats(siteUrl)` | « Get detailed traffic statistics for top queries » | requêtes réelles Bing |
| `GetPageStats(siteUrl)` | « Get detailed traffic statistics for top pages » | pages réelles Bing |
| `GetPageQueryStats(siteUrl, page)` | « Get detailed traffic statistics for specific site's page » | LVL1-05 côté Bing |
| `GetRankAndTrafficStats(siteUrl)` | « Get traffic statistics » | tendance globale |
| `GetCrawlStats(siteUrl)` | « Get crawl statistics » | fréquence de passage (FRESH, IndexNow) |
| `GetCrawlIssues(siteUrl)` | « Get list of crawl issues for specific site » | erreurs vues par Bing |
| `GetFeeds(siteUrl)` | « Return all top-level feeds for the site » | sitemap déclaré chez Bing |
| `SubmitFeed(siteUrl, feedUrl)` | « Submits feed » | J+1 de launch.md, hors audit |
| `SubmitUrlBatch(siteUrl, urls)` | « Submit url Batch » | hors audit ; `GetUrlSubmissionQuota` donne le quota |

`UrlInfo` (classe, mise à jour 2019-04-26) porte : `AnchorCount`, `DiscoveryDate`, `DocumentSize`, `HttpStatus`, `IsPage`, `LastCrawledDate`, `TotalChildUrlCount`, `Url`. Pas de booléen « indexée » : ce que renvoie `GetUrlInfo` pour une URL connue mais non indexée est à sonder avec la vraie clé (incertitude 3). Format JSON : `https://ssl.bing.com/webmaster/api.svc/json/METHODE?apikey=…&param=…` (page `api-protocols`, déjà instruite le 27/08). L'endpoint `GetUrlInfo` répond `400 {"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}` à une clé factice : vivant (sonde 8.3).

### 4.3 Clé et délégation

- « Only one API key can be generated per user. » ; « the API key is generated for a user and not a site » (page `getting-access`, instruite le 27/08). Une clé = tous les sites du compte, sans rôle attaché à la clé.
- La délégation existe avec un rôle lecture seule, cité texto : `AddSiteRoles(siteUrl, delegatedUrl, userEmail, authenticationCode, isAdministrator, isReadOnly)`, « Delegate site access to user », exemple JSON officiel avec `"isReadOnly": true`. Côté client, c'est l'écran Users de l'interface (pages d'aide Bing en SPA, non citables par script, gotcha connu).
- Retrait SOAP et POX le 31/08/2026 ; l'endpoint JSON est listé à part et devrait survivre. Sonde du 1er septembre déjà au calendrier, à étendre à `GetUrlInfo` et `GetQueryStats` (incertitude 8).

## 5. Modèle d'accès agence

**Google.** Un service account de l'agence, un par agence et non par client, ajouté par le client comme utilisateur de sa propriété. Le mécanisme « service account = utilisateur Search Console » est documenté officiellement pour l'API Indexing, cité texto (`developers.google.com/search/apis/indexing-api/v3/prereqs`) : « Add your service account as a (delegated) site owner » ; « Provide your service account email as the delegated owner. You can find your service account email address in two places: The `client_email` field in the JSON private key that you downloaded when you created your project. » Pour l'API Search Console un rôle utilisateur devrait suffire ; à confirmer par `sites.list` (incertitude 2).

Le jeton, flux serveur à serveur, cité texto (`developers.google.com/identity/protocols/oauth2/service-account`) : signature « RSA using SHA-256 hashing algorithm, expressed as `RS256` » ; claims `iss` (« The email address of the service account »), `scope` (« A space-delimited list of the permissions that the application requests »), `aud` (« always `https://oauth2.googleapis.com/token` »), `exp` (« a maximum of 1 hour after the issued time »), `iat` ; échange sur `https://oauth2.googleapis.com/token` avec `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`. Tout cela tient dans `crypto.subtle` (import PKCS8, `RSASSA-PKCS1-v1_5`, SHA-256) et `fetch`. Zéro dépendance.

Posture : rôle minimal qui permet l'inspection (Restricted si la sonde passe, Full sinon), et **jeton toujours demandé en `webmasters.readonly`**. Même si le rôle permet d'écrire, le jeton ne le porte jamais : `sitemaps.submit` est refusé par construction. Le clic de soumission du sitemap au J+1 reste au client, sur sa propriété. La clé JSON du service account vit hors du repo, chemin dans l'environnement (`GSC_SA_KEY_FILE`), `assertNoSecret` étendu au JSON et au bearer.

**Bing.** Le client délègue son site au compte de l'agence en lecture seule ; l'agence interroge avec sa propre clé. On ne demande jamais la clé d'un client (elle ouvrirait tous ses sites, en écriture). La clé de l'agence est un secret de premier rang : elle a déjà fuité une fois (28/08), même règle `~/.zshenv`, jamais affichée.

**Dans `launch.md`, avant mise en ligne** : « Search Console : propriété vérifiée, service account de l'agence ajouté (rôle : …) · capture » ; « Bing Webmaster Tools : site vérifié, délégation lecture seule au compte agence · capture ». **Après** : J+1 sitemap soumis par le client (GSC, Bing) et ping IndexNow (`POST api.indexnow.org/indexnow`, doc déjà vérifiée au chantier 1) ; J+3 pages clés inspectées **par l'API**, plus de capture ; J+30 exports IA déposés dans `raw/` ; J+90 audit niveau 1.

## 6. Ce que ça change pour la spec et les chantiers

1. **« API de niveau 1 » sort du hors-périmètre** (spec mère, section 7) et devient le chantier 5, tel que `levels.md` l'annonce.
2. **LVL1-01 et LVL1-02 deviennent des imports.** `collect.ts --level 1` cherche `seo/imports/gsc-generative-ai-<date>.csv` et `seo/imports/bing-ai-performance-<date>.csv` (nom et emplacement à fixer dans la spec), copie l'octet exact dans `raw/`, dérive `derived/ai-visibility.json` avec la date de l'export. Trois états : mesuré, non disponible pour cette propriété, non fourni. Le format de colonnes est à relever à la main (incertitude 6).
3. **LVL1-03** : inspection d'URL sur les pages collectées (sitemap et `strategy.md`), plafonnée par `--max-pages`, plus `sitemaps.get` si `indexed` est renseigné. Preuve dans `raw/gsc/inspect/<hash>.json`.
4. **AI-03** : `GetUrlInfo` par page, ou `GetChildrenUrlInfo` sur la racine, selon la sonde de l'incertitude 3.
5. **Deux candidats nouveaux, à sourcer avant d'entrer au catalogue** : LVL1-04, canonical choisi par Google différent du canonical déclaré (`googleCanonical` ≠ `userCanonical`) ; LVL1-05, requêtes réelles de la page contre le mot-clé de `strategy.md` (`searchanalytics` page × query, `GetPageQueryStats`).
6. **D4 tient** : le niveau 1 est une branche de `collect.ts`, pas un second script réseau. `raw/gsc/` et `raw/bing/` gardent la réponse brute et la requête (dates, dimensions) pour rejouer ; aucun jeton, aucune clé, aucun JSON de service account n'y entre.
7. **Étalon Bing vers Google** (note du 27/08, méthode point 2) : la collecte niveau 1 sur les sites de Romain donne, gratuitement, les impressions Google et Bing par requête sur la même période. Le chantier 5 nourrit `strategy`.
8. **Sécurité** : deux secrets (`BING_WMT_API_KEY`, `GSC_SA_KEY_FILE`), `assertNoSecret` élargi, une vérification `[ -n "$VAR" ]` avant toute collecte, jamais d'affichage.

## 7. Incertitudes

1. **Permission minimale pour `urlInspection.index.inspect`.** L'interface donne « Fetch only » au Restricted ; l'API ne documente rien. Sonde 8.5 avec le service account en Restricted sur chico ; 403 → Full.
2. **Service account comme utilisateur Search Console.** Documenté en propriétaire délégué pour l'API Indexing ; en simple utilisateur pour l'API Search Console, à confirmer par `sites.list`.
3. **`GetUrlInfo` sur une URL absente de l'index Bing** : réponse vide, `null`, ou erreur ? Décide la forme d'AI-03. Sonde 8.6 avec la vraie clé.
4. **`sitemaps.get` : `indexed` renseigné ou à zéro ?** Le champ existe dans le schéma ; sa valeur réelle n'est pas documentée.
5. **Rétention et délai de `searchanalytics`.** 16 mois de mémoire, aucune phrase officielle trouvée le 29/08 sur les pages lues [NON VERIFIE]. Sonde : requête groupée par `date` sur deux ans, premier jour avec données ; `dataState=all` contre `final` pour le délai.
6. **Format des exports CSV** (Generative AI, AI Performance) : colonnes, encodage, séparateur. À relever sur chico si la propriété a le rapport (subset), sinon sur un site de Romain qui l'a.
7. **Quotas de l'API Bing** hors soumission : toujours non documentés (reprise de la note du 27/08).
8. **Survie de l'endpoint JSON Bing après le 31/08/2026** (reprise) : sonde du 1er septembre, étendue à `GetUrlInfo`.
9. **API AI Performance Bing** : « sooner than later » en juin ; revérifier le blog `blogs.bing.com/webmaster` au démarrage du chantier 5. Si elle arrive, LVL1-02 passe de l'import à l'API sans toucher au reste.

## 8. Sondes reproductibles

```bash
# 8.1 discovery doc Search Console : valeurs de type, champs d'inspection, scopes (attendu : six types, aucun IA)
curl -s "https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest" -o /tmp/sc.json
python3 -c 'import json;d=json.load(open("/tmp/sc.json"));s=d["schemas"];print(d["revision"],s["SearchAnalyticsQueryRequest"]["properties"]["type"]["enum"],sorted(s["IndexStatusInspectionResult"]["properties"]))'

# 8.2 inspection sans jeton (attendu : HTTP 401)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" \
  -d '{"inspectionUrl":"https://example.com/","siteUrl":"https://example.com/"}' \
  https://searchconsole.googleapis.com/v1/urlInspection/index:inspect

# 8.3 Bing GetUrlInfo JSON, clé factice (attendu : HTTP 400, InvalidApiKey)
curl -s -w "\n%{http_code}\n" "https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo?siteUrl=https%3A%2F%2Fexample.com&url=https%3A%2F%2Fexample.com%2F&apikey=0000000000000000000000000000000f"

# 8.4 avec un jeton (flux JWT du chantier 5, jamais affiché) : type IA refusé (attendu : 400, Invalid value at 'type')
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"startDate":"2026-06-01","endDate":"2026-08-28","type":"GENERATIVE_AI"}' \
  "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fcommentchercherbonheur.org%2F/searchAnalytics/query"

# 8.5 avec un jeton readonly, service account en Restricted : inspection (attendu : 200 ou 403, tranche l'incertitude 1)
curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"inspectionUrl":"https://commentchercherbonheur.org/","siteUrl":"https://commentchercherbonheur.org/"}' \
  https://searchconsole.googleapis.com/v1/urlInspection/index:inspect

# 8.6 avec la vraie clé Bing (source ~/.zshenv, [ -n "$BING_WMT_API_KEY" ] && echo présente) : une URL indexée, puis une URL inventée
curl -s "https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo?siteUrl=https%3A%2F%2Fcommentchercherbonheur.org&url=https%3A%2F%2Fcommentchercherbonheur.org%2F&apikey=$BING_WMT_API_KEY"
```

Résultats du 29/08 : 8.1 révision 20260825, six types, onze champs ; 8.2 HTTP 401 ; 8.3 HTTP 400 `InvalidApiKey`. 8.4 à 8.6 attendent le chantier 5.

## 9. Sources

Vérifiées par `curl -sIL` le 2026-08-29, toutes en 200. Date = date affichée par la page ou révision.

| Id | URL | HTTP | Date | Usage |
|---|---|---|---|---|
| G-SA-QUERY | https://developers.google.com/webmaster-tools/v1/searchanalytics/query | 200 | non affichée | 3.1, LVL1-05 |
| G-DISCO | https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest | 200 | rev. 20260825 | 2, 3.2, 3.3 (schémas, enums, scopes) |
| G-INSPECT | https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect | 200 | non affichée | 3.2, LVL1-03, LVL1-04 |
| G-LIMITS | https://developers.google.com/webmaster-tools/limits | 200 | 2025-08-28 | 3.2 quota |
| G-INSPECT-BLOG | https://developers.google.com/search/blog/2022/01/url-inspection-api | 200 | 2022-01 | 3.2 quota |
| G-SITEMAP-SUBMIT | https://developers.google.com/webmaster-tools/v1/sitemaps/submit | 200 | non affichée | 3.3, section 5 |
| G-AUTH | https://developers.google.com/webmaster-tools/v1/how-tos/authorizing | 200 | non affichée | 3, scopes |
| G-SA-OAUTH | https://developers.google.com/identity/protocols/oauth2/service-account | 200 | non affichée | 5, flux JWT |
| G-IDX-PREREQS | https://developers.google.com/search/apis/indexing-api/v3/prereqs | 200 | non affichée | 5, service account comme propriétaire délégué |
| G-PERMS | https://support.google.com/webmasters/answer/7687615 | 200 | non affichée | 3.2, 5, rôles |
| G-GENAI-HELP | https://support.google.com/webmasters/answer/16984139 | 200 | non affichée | 2, LVL1-01 |
| G-GENAI-BLOG | https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports | 200 | 2026-06-03 | 2, déploiement « subset » |
| G-PERF | https://support.google.com/webmasters/answer/7576553 | 200 | non affichée | 3.1, données préliminaires |
| MS-IWEBMASTERAPI | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi | 200 | 2023-11-14 | 4.2, méthodes |
| MS-URLINFO | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.urlinfo | 200 | 2019-04-26 | 4.2, AI-03 |
| MS-ADDSITEROLES | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.addsiteroles | 200 | 2023-11-14 | 4.3, délégation lecture seule |
| MS-PROTOCOLS | https://learn.microsoft.com/en-us/bingwebmaster/api-protocols | 200 | 2026-08-10 | 4.2, format JSON, retrait SOAP/POX |
| MS-ACCESS | https://learn.microsoft.com/en-us/bingwebmaster/getting-access | 200 | non affichée | 4.3, une clé par utilisateur |
| MS-QA-AIPERF | https://learn.microsoft.com/en-us/answers/questions/5780844/bing-webmaster-tools-ai-performance-report-is-ther | 200 | 2026-02-19 | 4.1 (réponse d'un Independent Advisor) |
| BING-AIPERF | https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview | 200 | 2026-02-10 | 4.1, LVL1-02 |
| INDEXNOW | https://www.indexnow.org/documentation | 200 | non affichée | 5, J+1 |
| SER-CANEL | https://www.seroundtable.com/bing-webmaster-tools-ai-coming-soon-41449.html | 200 | 2026-06-04 | 4.1, secondaire |
| CHUDI | https://chudi.dev/blog/search-console-generative-ai-report | 200 | 2026-08-12 | 2, secondaire, test API reproductible (8.4) |

Inventaire des outils tiers (section 1) : pages GitHub et annuaires MCP consultés le 29/08, secondaires, non épinglés.
