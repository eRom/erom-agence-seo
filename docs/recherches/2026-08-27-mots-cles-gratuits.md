---
title: Estimer la demande de recherche sans abonnement
date: 2026-08-27
status: proposed
project: erom-agence-seo
porte_sur: chantier 2, le verbe strategy
spec: docs/superpowers/specs/2026-08-27-erom-seo-design.md
---

# Mots-clés sans abonnement : ce que le gratuit donne vraiment

Instruit le 2026-08-27 en fin de journée, pendant l'exécution du chantier 1. Question posée : sans Ahrefs ni Semrush, sur quoi `strategy` peut-il s'appuyer pour dire qu'un mot-clé vaut le coup ? Sources officielles vérifiées par `curl` (toutes en HTTP 200), sondes réelles, et une question au notebook NotebookLM (101 sources, biais d'agence signalés).

## Verdict (mis à jour à 18 h, après les sondes avec la vraie clé)

1. **L'API Bing Webmaster est la seule source gratuite, officielle et programmable de volumes absolus, et elle ne couvre que les grosses requêtes.** Points hebdomadaires sur six mois, France : « chatgpt » 281 000 impressions par semaine, « assurance auto » 1 500, « site internet » 130, « seo » 90. Mais « agence seo », « référencement naturel », « plombier nantes », « agence web nantes » : réponse vide. Sous un seuil que Microsoft ne documente pas, il n'y a rien. Et les « mots-clés liés » le sont par le mot, pas par le sujet : « agence seo » renvoie « century 21 » et « agence immobilière ». Section 8.
2. **Google ne donne des volumes que contre de l'argent ou pour ton propre site.** Keyword Planner exige un compte Ads avec facturation saisie et ne montre que des fourchettes sans dépense. Search Console ne parle que des sites qu'on possède. Trends est relatif. L'API Trends est en alpha fermée.
3. **Le reste donne des intentions et des ordres de grandeur, jamais des volumes** : autocomplétion, « autres questions posées », sitemaps concurrents, pages vues Wikipédia.

Conséquence pour `strategy` : pour un client local ou une niche B2B, **aucune source gratuite ne mesure la demande.** `strategy.md` l'écrit tel quel : demande « non mesurable gratuitement », présence confirmée par l'autocomplétion et les questions, taille inconnue. Les volumes n'existent que pour les têtes de requête, et ils sont écrits avec leur source et leur date. Un chiffre inventé n'entre jamais dans le fichier.

## Les signaux, un par un

### 1. API Bing Webmaster : les volumes absolus

Documentation officielle Microsoft Learn, vérifiée le 2026-08-27 :

- Accès : https://learn.microsoft.com/en-us/bingwebmaster/getting-access. « Only one API key can be generated per user. » ; « the API key is generated for a user and not a site and hence a user can use the same API key for all their verified sites on Bing Webmaster Tools. » Étapes : compte Bing Webmaster Tools, un site vérifié, Settings, API Access, Generate API Key.
- Méthodes (interface `IWebmasterApi`, https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi) :
  - `GetKeywordStats(q, country, language)` : « Get keyword historical statistics ». Rend une liste de `KeywordStats` aux propriétés `Query`, `Date`, `Impressions`, `BroadImpressions`.
  - `GetKeyword(q, country, language, startDate, endDate)` : « Get keyword impressions for selected period ».
  - `GetRelatedKeywords(q, country, language, startDate, endDate)` : « Get keyword impressions for selected period », sur les requêtes liées.
  Aucune de ces trois méthodes ne prend d'URL de site : ce sont les données de recherche de Bing, pas celles du site.
- Format JSON (https://learn.microsoft.com/en-us/bingwebmaster/api-protocols, mise à jour 2026-08-10) : `https://ssl.bing.com/webmaster/api.svc/json/METHOD_NAME?apikey=API_KEY&param1=VALUE...`. Erreur documentée : HTTP 400 avec `{"ErrorCode":3,"Message":"InvalidApiKey"}`.

Sonde réelle du 2026-08-27, clé factice : `GET .../json/GetKeywordStats?q=agence%20seo&country=fr&language=fr-FR&apikey=<factice>` répond `HTTP 400 {"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}`. Même chose sur `GetRelatedKeywords`. L'endpoint JSON est vivant et se comporte comme la doc le dit.

**Alerte de retrait.** La même page annonce : « Legacy SOAP and POX APIs will be retired on August 31, 2026. Migrate to our REST APIs to avoid service disruption. » JSON/HTTP y est listé comme un protocole distinct de SOAP et de POX, et la note ne nomme que ces deux-là. Lecture : l'endpoint `/api.svc/json/` est ce que Microsoft appelle REST et survit. La page de détail du retrait est une SPA illisible par script. Incertitude 1 ci-dessous.

Le même jeu de données est visible sans code dans l'interface Bing Webmaster Tools, outil Keyword Research (page d'aide SPA ; texte relevé via le moteur de recherche : « check the phrases and keywords that searchers are querying for and their corresponding search volumes », « trending keywords, related search queries, and long-tail opportunities »).

Ce que ça vaut : des volumes Bing. En France, Bing est minoritaire (part de marché à sourcer, incertitude 3). Mais l'index Bing alimente ChatGPT Search et Copilot (rapport de recherche du matin, section 1), donc la demande Bing est aussi une lecture directe de ce que ces moteurs voient.

### 2. Google Keyword Planner : des fourchettes, contre une facturation saisie

- https://support.google.com/google-ads/answer/7337243 : « must complete your account setup by entering your billing information to access basic features like 'Get ideas for new keywords' ». Un compte Google Ads est obligatoire ; la saisie de la facturation aussi, sans obligation de dépense.
- https://support.google.com/google-ads/answer/3022575 : « Average monthly searches ("Avg. monthly searches"): The average number of times people have searched for a keyword and its close variants based on the month range as well as the location and Search Network settings you selected. » ; « by default, the number of searches for the term (regardless of language) is averaged over a 12-month period ».
- Fourchettes (« 1K–10K ») au lieu de nombres exacts sans campagne active : constaté dans plusieurs fils de la communauté Google Ads (support.google.com/google-ads/thread/52338397, /194729575, /254017525) et repris par le notebook via un guide Semrush. **Aucune phrase officielle trouvée** qui l'énonce. Incertitude 4.

Ce que ça vaut : un ordre de grandeur Google, à la main, une requête à la fois. Pas d'API sans dépense publicitaire.

### 3. Google Trends : relatif, jamais absolu

- https://support.google.com/trends/answer/4365533 : « Each data point is divided by the total searches of the geography and time range it represents to compare relative popularity. » ; « The resulting numbers are then scaled on a range of 0 to 100 based on a topic's proportion to all searches on all topics. »
- API Trends, alpha (https://developers.google.com/search/apis/trends, annonce du 24 juillet 2025 sur https://developers.google.com/search/blog/2025/07/trends-api) : « We're now accepting applications for alpha testers » ; « a rolling window of the last 5 years of data » ; agrégations « daily, weekly, monthly, and yearly » ; « Consistently scaled data ». Accès limité ; plusieurs fils communautaires signalent des candidatures sans réponse.

Ce que ça vaut : la saisonnalité, et le classement relatif entre candidats. Avec un mot-clé étalon dont on connaît le volume (Bing, ou Search Console d'un site à soi), le ratio Trends donne une estimation du reste. Rien de plus.

### 4. Google Search Console : la vérité, mais seulement chez soi

- API officielle `searchanalytics.query` : https://developers.google.com/webmaster-tools/v1/searchanalytics/query (HTTP 200).
- Requêtes anonymisées (https://developers.google.com/search/blog/2022/10/performance-data-deep-dive et https://support.google.com/webmasters/answer/7576553) : les requêtes « aren't issued by more than a few dozen users over a two-to-three month period » sont omises des tables et de l'API, mais comptées dans les totaux des graphiques. La longue traîne fine est donc invisible.

Ce que ça vaut : pour les sites de Romain, la seule donnée Google réelle. Et l'**étalon** de la méthode : sur un site où Search Console et Bing Webmaster Tools coexistent, le ratio impressions Google / impressions Bing par requête donne le coefficient qui convertit un volume Bing en estimation Google, thématique par thématique.

### 5. Autocomplétion et « autres questions posées » : des intentions

- https://support.google.com/websearch/answer/7368877 : « autocomplete predictions reflect real searches that have been done on Google » ; les systèmes considèrent « The language of the query », « The location a query is coming from », « Trending interest in a query », « Your past searches » ; « Predictions aren't assertions of facts or opinions ».
- Aucun volume, aucune API officielle. Le notebook ne cite que des playbooks d'agences pour la méthode.

Ce que ça vaut : les formulations réelles et les questions, pour les FAQ et les « answer capsules ». À relever à la main dans un navigateur en navigation privée, localisé en France. Interroger l'endpoint de suggestion par script n'est couvert par aucune doc : incertitude 5.

### 6. Sitemaps des concurrents : la structure, pas la demande

Déjà collectés par l'audit (chantier 1). Ils disent ce qu'un concurrent vise (slugs, silos, pages piliers), jamais combien ça rapporte. Le notebook confirme, sans source à opposer.

### 7. Wikipédia : l'intérêt francophone, en absolu

API Wikimedia Pageviews, gratuite, sans authentification, User-Agent identifié exigé, données depuis le 1er juillet 2015 (https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html).

Sonde réelle du 2026-08-27 : `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/Optimisation_pour_les_moteurs_de_recherche/monthly/20260101/20260801` rend, par mois de 2026 : 2 313, 2 161, 2 413, 2 261, 2 195, 1 968, 2 591 vues (échantillon `echantillons/wikimedia-pageviews-seo-fr-30j.json` pour le quotidien).

Ce que ça vaut : un ordre de grandeur français, mensuel, absolu, sur les sujets qui ont un article. Ce n'est pas un volume de recherche, c'est un intérêt lu ailleurs. Utile pour trier des sujets informationnels, inutile pour du transactionnel.

## Méthode proposée pour `strategy`

Dans l'ordre, du plus solide au plus mou :

1. **Bing API** pour les volumes absolus (`country=fr`, `language=fr-FR`) sur les candidats, et `GetRelatedKeywords` pour élargir.
2. **Étalonnage Bing vers Google** : coefficient calculé sur les sites de Romain (Search Console contre Bing Webmaster Tools, même requête, même période), médiane par thématique. À défaut, coefficient de part de marché, sourcé, marqué comme tel.
3. **Trends** pour la saisonnalité et le rang relatif entre candidats.
4. **Autocomplétion et questions** pour les formulations, relevées à la main.
5. **Wikipédia** pour trier les sujets informationnels.
6. **Keyword Planner** en dernier recours, pour une fourchette Google sur un mot-clé décisif.

Étape 0, avant tout : interroger Bing sur chaque candidat. Une réponse vide classe la requête « non mesurable gratuitement » ; on ne cherche pas à lui fabriquer un volume par un autre chemin, on documente la présence (autocomplétion, questions, concurrents positionnés) et on s'arrête là.

Ce que `strategy.md` écrit pour chaque mot-clé : volume Bing (date de la donnée), estimation Google (coefficient et son origine), tendance 12 mois, formulations relevées, source de chaque nombre.

## Ce que ça change pour la spec et les chantiers

- Le chantier 2 a besoin d'une clé API Bing Webmaster dès le départ. Elle sert aussi au niveau 1 de l'audit (chantier 5 : `GetQueryStats`, `GetRankAndTrafficStats`, `SubmitUrlBatch` sont dans la même API). Une clé, deux chantiers.
- La clé vit dans l'environnement (`BING_WMT_API_KEY`), jamais dans un fichier commité, même règle que `PSI_API_KEY`.
- Le point faible annoncé dans la spec (« les volumes de mots-clés restent le point faible ») a une réponse honnête : des volumes Bing exacts, des estimations Google étalonnées, et la mention de la source à chaque ligne.

## Incertitudes

1. **Survie de l'endpoint JSON après le 31 août 2026.** La note de retrait ne nomme que SOAP et POX ; JSON est listé à part. À revérifier le 1er septembre avec la sonde ci-dessous : si `GetKeywordStats` en JSON ne répond plus 400 InvalidApiKey mais autre chose, chercher la nouvelle base REST.
2. **Quotas de l'API Bing Webmaster** : aucune page lue ne les documente.
3. **Part de marché de Bing en France** : chiffre à sourcer avant de s'en servir comme coefficient de repli. [NON VERIFIE]
4. **Fourchettes de Keyword Planner sans dépense** : constat communautaire, pas de phrase officielle.
5. **Endpoint d'autocomplétion par script** : aucune doc, conditions d'usage non vérifiées ; relevé manuel en attendant.
6. **API Trends** : accès alpha non garanti ; candidature possible, pas de plan qui en dépende.
7. **`GetKeywordStats` avec une clé dont le site vérifié n'est pas le site étudié** : la méthode ne prend pas d'URL de site, donc a priori indifférent ; à confirmer avec une vraie clé.

## Sondes reproductibles

```bash
# endpoint JSON Bing vivant ? (attendu : HTTP 400, InvalidApiKey)
curl -s -w "\nHTTP %{http_code}\n" "https://ssl.bing.com/webmaster/api.svc/json/GetKeywordStats?q=agence%20seo&country=fr&language=fr-FR&apikey=0000000000000000000000000000dead"

# avec une vraie clé (ne jamais afficher la clé) : volumes Bing FR pour une requête
source ~/.zshenv && test -n "$BING_WMT_API_KEY" && curl -s "https://ssl.bing.com/webmaster/api.svc/json/GetKeywordStats?q=agence%20seo&country=fr&language=fr-FR&apikey=$BING_WMT_API_KEY" | jq '.d[:3]'

# Wikipédia, intérêt mensuel 2026 pour un sujet
curl -s -A "erom-seo-audit/0.1 (contact: <mail>)" "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/Optimisation_pour_les_moteurs_de_recherche/monthly/20260101/20260801" | jq '[.items[] | {mois: .timestamp[0:6], views}]'
```

## 8. Sondes avec la vraie clé, 2026-08-27 à 18 h

Clé générée par Romain (32 caractères, dans l'environnement, jamais affichée). Toutes les réponses vérifiées sans occurrence de la clé avant sauvegarde dans `echantillons/`.

**Granularité** : un point par semaine, du 2026-02-28 au 2026-08-15, soit environ six mois glissants (25 points).

| Requête (country=fr, language=fr-FR) | Lignes | Total 6 mois | Dernier point hebdo |
|---|---|---|---|
| chatgpt | 25 | 10 852 405 | 281 275 |
| assurance auto | 25 | 36 973 | 1 514 |
| site internet | 25 | 5 523 | 130 |
| seo | 25 | 5 066 | 90 |
| création site internet | 21 | 481 | 6 |
| consultant seo | 1 | 0 | 0 |
| agence seo | 0, réponse vide | | |
| référencement naturel | 0, réponse vide | | |
| plombier nantes | 0, réponse vide | | |
| agence web nantes | 0, réponse vide | | |

Lecture : Bing France a des données sur les têtes de requête et rien sur le local ni la niche B2B, précisément les requêtes qu'un client de l'agence vise. Le seuil de coupure n'est pas documenté ; « création site internet » à 6 impressions par semaine passe encore, « consultant seo » tombe à zéro.

`GetRelatedKeywords` sur « agence seo » (juillet 2026) : 88 lignes, les plus fortes sont « century 21 » (11 174), « citya » (8 824), « immobilier », « agence immobilière », « agence de voyage ». Proximité lexicale, aucune valeur pour élargir un sujet.

`GetKeyword` sur « création site internet », période du 1er au 31 juillet 2026 : 21 impressions, alors que les points hebdomadaires de `GetKeywordStats` sur juillet cumulent davantage. Sémantique de la période à éclaircir : incertitude 8.

Échantillons : `bing-keywordstats-creation-site-internet-fr.json`, `bing-keywordstats-seo-fr.json`, `bing-keywordstats-chatgpt-fr.json`, `bing-keywordstats-plombier_nantes-fr.json` (vide), `bing-relatedkeywords-agence-seo-fr.json`.

Incertitudes ajoutées :

8. **`GetKeyword` sur période** rend moins que la somme des points hebdomadaires de `GetKeywordStats` sur la même période. Définition non documentée.
9. **Seuil de coupure** sous lequel Bing ne rend rien : non documenté, observé entre 0 et 6 impressions par semaine.

L'incertitude 7 est levée : la clé d'un compte dont le site vérifié n'a rien à voir avec la requête fonctionne, les méthodes mots-clés ne prennent pas d'URL de site.
