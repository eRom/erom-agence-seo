---
title: erom-seo, chantier 5 étape 1 : le verbe console
date: 2026-08-29
status: proposed
project: erom-agence-seo
spec_mere: docs/superpowers/specs/2026-08-27-erom-seo-design.md
notes_liees:
  - docs/recherches/2026-08-29-niveau-1-apis.md
  - docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md
  - docs/superpowers/specs/2026-08-29-erom-seo-checklist-design.md
  - .claude/notes/2026-08-27-reprise-2120.md
cobaye: sc-domain:romain-ecarnot.com (propriété Search Console de Romain, rôle propriétaire, sitemap déclaré). Chico n'a de propriété ni chez Google ni chez Bing au 29/08.
---

# erom-seo, chantier 5 étape 1 : `console`

Le chantier 5 est le niveau 1 annoncé par la spec mère et par `skills/audit/references/levels.md`. La note d'idéation `docs/recherches/2026-08-29-niveau-1-apis.md` a établi ce que les API donnent vraiment. Cette spec ne porte pas tout le chantier 5 : elle porte sa première étape, décidée avec Romain le 29/08 entre 18 h 06 et 18 h 40, un verbe de consultation en lecture seule. L'audit niveau 1 (LVL1-01 à LVL1-05, AI-03, imports CSV des rapports IA) fera l'objet d'une seconde spec.

Toutes les conventions d'appel de cette spec ont été capturées en vrai le 29/08 sur les propriétés de Romain, section 12. Rien n'est repris d'un résumé.

## 1. But

Romain ouvre aujourd'hui un onglet Search Console ou Bing Webmaster Tools pour trois questions : est-ce que j'ai bien l'accès et mon sitemap est-il arrivé, est-ce que cette page est indexée et sous quel canonical, est-ce que Bing passe et voit-il des erreurs. Les trois sont dans les API. Le verbe `console` les ramène dans le terminal.

Deux contraintes propres à ce verbe :

- **Il ne fait rien.** Aucune écriture sortante, aucun fichier écrit. Les deux seules écritures du plugin (ping IndexNow, `SubmitFeed`) restent dans `checklist --agir` (D26). `console` regarde.
- **Ce n'est pas un audit.** Pas de dossier daté, pas de `raw/`, pas de rapport, pas de lint. La preuve sur disque est le métier de l'audit niveau 1, pas celui d'une lentille.

Ne pas confondre avec `skills/checklist/references/consoles.md`, qui est une référence de chemins de clics pour un humain. `console` est le verbe qui lit les API.

## 2. Décisions

### D29. Le niveau 1 se livre en deux temps, le verbe de consultation d'abord
Décision de Romain, 18 h 12 : l'outil du quotidien avant la valeur client. `console` d'abord, l'audit niveau 1 ensuite, en réutilisant les mêmes briques d'appel. Battu : livrer `collect.ts --level 1` d'abord (la spec mère l'annonce, un client le paie) ; perd parce que le rapport n1 n'a pas d'usage immédiat tant qu'aucune propriété client n'existe, alors que la lentille sert dès ce soir sur les sites de Romain.

### D30. `console` est en lecture seule et n'écrit rien sur disque
Aucun appel d'écriture d'API, aucun fichier produit. Un `fetch` injecté rend la contrainte testable, comme dans `checklist` (D26, section 5.4 de sa spec). Battu : rendre `console` capable de soumettre un sitemap ; perd parce que `checklist --agir` le fait déjà et qu'une seconde porte d'écriture double la surface de risque pour rien.

### D31. Trois commandes, choisies par Romain
`sites`, `inspect <url>`, `crawl`. Les requêtes réelles (`searchAnalytics`, `GetQueryStats`, `GetPageStats`) ne sont pas de cette étape : Romain ne les a pas cochées le 29/08 à 18 h 26, elles iront à l'audit niveau 1 où elles serviront à confronter `strategy.md` au réel (candidat LVL1-05). IndexNow n'a pas de commande : rien à lire en API, le ping est dans `checklist`, le fichier de clé est vérifié par AI-02 de l'audit, et le rapport IndexNow Insights n'est qu'un écran Bing.

### D32. Un jeton Google, deux fournisseurs derrière une seule fonction
Décision de Romain, 18 h 23 : « compte Google via gcloud mais avec une doc pour passer à un compte de service ». `getAccessToken()` choisit son fournisseur ainsi : `GSC_SA_KEY_FILE` défini gagne (compte de service, JWT RS256 signé par `crypto.subtle`, scope `webmasters.readonly`) ; sinon `gcloud auth application-default print-access-token` ; sinon erreur qui dit quoi lancer. Basculer coûte une variable d'environnement et rien dans les appels. `references/acces.md` porte les deux marches à suivre. Battu : le compte de service tout de suite ; perd sur le temps de mise en route, alors que la bascule est prévue et documentée.

### D33. La propriété Search Console est résolue depuis `sites.list`, jamais construite
Search Console a deux sortes de propriété et l'API exige le nom exact : `sc-domain:romain-ecarnot.com` (Domaine) ou `https://lebonpote.romain-ecarnot.com/` (préfixe d'URL). Capturé le 29/08, section 12.1. `console` liste d'abord les propriétés et choisit celle qui couvre l'URL demandée (règle en 5.2). Fabriquer un `siteUrl` à partir d'un hôte donnerait un 403 silencieux sur la moitié des cas. La note d'idéation ne couvrait pas ce point.

### D34. Le transport Bing est recopié dans la skill ; la mise en commun est une dette datée
Décision de Romain, 18 h 37 : « recopie le dans la skill, on verra pour refactorer après (il y a de grandes chances qu'il n'y ait pas que lui) ». `BING_API_BASE` et le décodage de `{"ErrorCode","Message"}` existent déjà dans `skills/strategy/scripts/keywords.ts` et `skills/checklist/scripts/lib/actions.ts` ; `console` en fait une troisième copie. Dette inscrite en section 9 : une passe de mise en commun quand on saura ce qui se répète vraiment, l'inventaire faisant partie de la passe. Battu : hisser `plugin/lib/bing.ts` maintenant ; perd parce qu'on refactoriserait sur un seul symptôme observé au lieu de l'inventaire complet.

## 3. Composants

```
plugin/skills/console/
  SKILL.md                          le verbe, quatre temps (section 7)
  scripts/
    console.ts                      CLI : sites | inspect <url> | crawl
    lib/
      auth-google.ts                getAccessToken, deux fournisseurs (D32)
      gsc.ts                        appels Search Console, fetch injecté
      bing.ts                       appels Bing, fetch injecté (copie assumée, D34)
      resolve.ts                    résolution URL vers propriété (D33), pure
      render.ts                     mise en forme texte et JSON, pure
    tests/
      auth-google.test.ts
      gsc.test.ts
      bing.test.ts
      resolve.test.ts
      render.test.ts
      console-cli.test.ts
      fixtures/                     réponses réelles capturées le 29/08 (section 12)
  references/
    acces.md                        donner l'accès (Google, Bing) et bascule vers compte de service
plugin/skills/audit/scripts/check-sources.ts   étendu aux citations de acces.md
```

Réutilisé tel quel : `sameSite` de `skills/audit/scripts/lib/sitemap.ts` (comparaison apex et www) pour apparier un hôte à un site Bing ; `parseStrategy` de `plugin/lib/strategy.ts` pour deviner le site quand `--site` est absent ; `assertNoSecret` de `skills/strategy/scripts/lib/keywords.ts`, étendu au jeton porteur.

## 4. Environnement

| Variable | Rôle | Absente |
|---|---|---|
| `GSC_QUOTA_PROJECT` | projet GCP dont l'API Search Console est activée ; envoyé en `x-goog-user-project`. Obligatoire avec le fournisseur gcloud, ignoré avec un compte de service | Google en erreur lisible (5.6) |
| `GSC_SA_KEY_FILE` | chemin du JSON de compte de service, hors dépôt. Sa présence bascule le fournisseur | fournisseur gcloud |
| `BING_WMT_API_KEY` | clé Bing Webmaster Tools, une par utilisateur | Bing « non interrogé (clé absente) », Google répond quand même |

Aucun secret n'entre dans le dépôt, ne s'affiche, ni n'apparaît dans un message d'erreur. Les URL de requête Bing portent la clé en paramètre : elles sont expurgées avant tout affichage, comme dans `keywords.ts`.

## 5. `console.ts`

### 5.1 Interface

```
console sites                     [--json]
console inspect <url>             [--json]
console crawl [--site <url>]      [--json]
```

Le site de `crawl` vient de `--site`, sinon de `seo/strategy.md` du répertoire courant, sinon erreur. `sites` n'a besoin d'aucun site : il liste tout ce que les deux comptes voient. `inspect` se contente de l'URL : la propriété s'en déduit (D33).

Sortie texte par défaut, une ligne par fait, la source entre parenthèses. `--json` rend l'objet, pour un usage machine. Exit 0 dès qu'un des deux moteurs a répondu ; exit 1 si aucun n'a pu être interrogé.

### 5.2 Résolution d'une propriété Search Console (D33)

Entrée : une URL. Sortie : le `siteUrl` exact d'une propriété de `sites.list`, ou rien.

1. Les propriétés en préfixe d'URL (`https://…`) qui préfixent l'URL demandée. La plus longue gagne.
2. Sinon les propriétés Domaine (`sc-domain:<domaine>`) dont le domaine est l'hôte de l'URL ou son suffixe (`sc-domain:romain-ecarnot.com` couvre `lebonpote.romain-ecarnot.com`). La plus spécifique gagne.
3. Sinon rien : erreur nommée, aucun appel d'inspection.

Le `permissionLevel` de la propriété retenue est reporté dans la sortie : c'est lui qui explique un refus ultérieur.

### 5.3 `console sites`

**Google.** `GET https://www.googleapis.com/webmasters/v3/sites` rend `{"siteEntry":[{"siteUrl","permissionLevel"}]}`. Puis, pour chaque propriété, `GET https://www.googleapis.com/webmasters/v3/sites/<siteUrl encodé>/sitemaps` rend `{"sitemap":[{path,lastSubmitted,lastDownloaded,isPending,isSitemapsIndex,type,warnings,errors,contents:[{type,submitted,indexed}]}]}`. Le `siteUrl` est encodé dans le chemin (`sc-domain%3Aromain-ecarnot.com`). Affiché par propriété : le rôle, chaque sitemap avec sa date de soumission, sa date de dernière lecture, ses avertissements et erreurs, et le couple soumis / indexé de `contents`.

**Bing.** `GET https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=<clé>` rend `{"d":[{"Url","IsVerified","AuthenticationCode","DnsVerificationCode"}]}`. Puis `GetFeeds(siteUrl)` par site. `{"d":[]}` est un état normal et se dit « aucun site dans ce compte Bing », pas une erreur.

### 5.4 `console inspect <url>`

**Google.** `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, corps `{"inspectionUrl","siteUrl"}`, `siteUrl` issu de 5.2. Affiché depuis `inspectionResult.indexStatusResult` : `verdict`, `coverageState`, `robotsTxtState`, `indexingState`, `lastCrawlTime`, `pageFetchState`, `crawledAs`, et surtout `googleCanonical` face à `userCanonical`, avec une phrase quand ils diffèrent (« Google a retenu un autre canonical que celui déclaré »). `inspectionResultLink` est affiché tel quel : c'est le lien pour ouvrir l'écran si Romain veut voir. Quota, doc officielle : 2000 requêtes par jour et 600 par minute par propriété, sans objet ici.

**Bing.** `GET .../GetUrlInfo?siteUrl=<site>&url=<url>&apikey=<clé>`, site apparié par `sameSite`. Champs de `UrlInfo` : `DiscoveryDate`, `LastCrawledDate`, `HttpStatus`, `DocumentSize`, `AnchorCount`, `TotalChildUrlCount`, `IsPage`. Ce que rend `GetUrlInfo` pour une URL inconnue de Bing n'est pas documenté et n'a pas pu être capturé (compte vide) : incertitude 1, le code traite une réponse vide, `null` et une erreur de la même façon, « pas dans l'index Bing, ou site hors du compte ».

### 5.5 `console crawl`

Bing seul : `GetCrawlStats(siteUrl)` et `GetCrawlIssues(siteUrl)`. Google n'expose pas ses Crawl Stats en API ; la sortie le dit en une ligne au lieu de laisser un blanc. La forme exacte des deux réponses n'a pas pu être capturée (compte Bing vide) : incertitude 2, le décodage est écrit d'après la doc et une sonde est au calendrier de la recette dès qu'un site est ajouté.

### 5.6 Le jeton (D32)

`getAccessToken()` rend une chaîne, jamais journalisée.

- Compte de service, si `GSC_SA_KEY_FILE` est défini : lecture du JSON hors dépôt, JWT `{alg:RS256}` avec `iss` = `client_email`, `scope` = `https://www.googleapis.com/auth/webmasters.readonly`, `aud` = `https://oauth2.googleapis.com/token`, `exp` à une heure au plus, signature `RSASSA-PKCS1-v1_5` SHA-256 par `crypto.subtle` sur la clé PKCS8 importée, échange en `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`. Aucun en-tête de projet de quota.
- gcloud, sinon : `gcloud auth application-default print-access-token`. Toute requête Google porte alors `x-goog-user-project: $GSC_QUOTA_PROJECT`. Sans cette variable, l'API répond 403 `SERVICE_DISABLED` (capturé le 29/08, section 12.2) : le message d'erreur nomme la variable et donne la commande d'activation.
- Ni l'un ni l'autre : exit 1, message avec la commande exacte de connexion et le scope requis.

Le binaire `gcloud` est appelé par `Bun.spawn`, sa sortie n'est jamais affichée. Le fournisseur est injectable dans les tests.

## 6. La référence `acces.md`

Une entrée par geste, même forme que `consoles.md` : `Chemin` (les clics), `Piège`, `Source` avec l'URL officielle et la citation mot pour mot, retrouvée par `check-sources.ts`.

- Google, donner l'accès : ajouter un utilisateur à une propriété, les rôles et ce que chacun permet.
- Google, les deux sortes de propriété : Domaine (vérification DNS TXT) et préfixe d'URL, et pourquoi l'API veut le nom exact.
- Google, bascule vers un compte de service : créer le projet, activer l'API Search Console, créer le compte, télécharger la clé JSON, la ranger hors dépôt, poser `GSC_SA_KEY_FILE`, faire ajouter l'adresse du compte de service par le client. Dire que `GSC_QUOTA_PROJECT` devient inutile.
- Bing, ajouter et vérifier un site, importer depuis Search Console, déléguer en lecture seule (`AddSiteRoles`, `isReadOnly`).

Les pages d'aide `bing.com/webmasters/help/*` sont des applications JavaScript : nommées sans citation, hors du contrôle des sources (gotcha du 27/08). `support.google.com` répond 404 à un HEAD et 200 à un GET : rester en GET (gotcha du 29/08).

## 7. Le verbe `console`

`SKILL.md`, quatre temps.

1. **Situer.** Quelle question pose Romain, sur quel site. Si le dossier courant a un `seo/strategy.md`, c'est le site par défaut.
2. **Vérifier l'accès.** `console sites` en premier quand c'est la première fois sur ce site, ou quand une commande échoue : c'est la commande qui explique les autres.
3. **Lire.** `inspect` ou `crawl` selon la question.
4. **Restituer.** Ce que la sortie dit, en clair, et le geste suivant s'il y en a un (ajouter le site chez Bing, faire ajouter le compte, corriger un canonical). La skill ne propose jamais une écriture : elle renvoie à `checklist --agir`.

## 8. Erreurs

Chaque cas a une phrase et une consigne, jamais une trace.

- Aucun jeton disponible : exit 1, la commande de connexion avec son scope.
- `GSC_QUOTA_PROJECT` absente avec le fournisseur gcloud : exit 1, la variable à poser et la commande `gcloud services enable searchconsole.googleapis.com --project=<projet>`.
- 403 scope insuffisant : la même consigne que le cas précédent, avec le scope manquant nommé.
- Aucune propriété ne couvre l'URL demandée : exit 1, la liste des propriétés vues, et le renvoi à `acces.md`.
- Propriété visible mais rôle insuffisant (403 sur l'inspection) : le rôle observé est nommé, consigne au propriétaire de la propriété.
- `BING_WMT_API_KEY` absente : Bing « non interrogé (clé absente) », Google répond, exit 0.
- Bing `{"ErrorCode":3}` : « clé refusée par Bing, `~/.zshenv` porte peut-être l'ancienne » (incident du 28/08).
- Bing `{"d":[]}` : « aucun site dans ce compte Bing », exit 0.
- Bing 4 ou 5 (Throttle) : « réessayer plus tard ». 11, 13, 14 : « site hors du compte ou droits insuffisants ».
- Un moteur en panne n'empêche jamais l'autre de répondre.

## 9. Tests

`bun:test`, `fetch` injecté, fournisseur de jeton injecté, fixtures = les réponses réelles capturées le 29/08 (section 12). Des comportements, jamais un compte de lignes ni le texte du source.

- Résolution (`resolve.ts`) : un préfixe d'URL bat une propriété Domaine sur la même URL ; `sc-domain:romain-ecarnot.com` couvre `lebonpote.romain-ecarnot.com` ; une URL hors de toute propriété ne résout rien ; deux préfixes candidats, le plus long gagne.
- Auth : `GSC_SA_KEY_FILE` défini choisit le compte de service ; sans lui, gcloud ; sans les deux, une erreur qui nomme la commande. Aucun jeton dans la sortie ni dans l'erreur.
- Google : les six champs d'état sont extraits de la réponse réelle ; `googleCanonical` différent de `userCanonical` produit la phrase ; une réponse sans `indexStatusResult` ne plante pas.
- Google, quota : sans `GSC_QUOTA_PROJECT` le fournisseur gcloud échoue avant tout appel ; avec, l'en-tête `x-goog-user-project` part sur chaque requête (vu par le faux `fetch`).
- Bing : `{"d":[]}` donne « aucun site » et non une erreur ; `{"ErrorCode":3}` donne le message sans la clé ; sans clé, aucun appel Bing ne part et Google est quand même interrogé.
- Aucune écriture : le faux `fetch` ne voit que des GET, plus le POST d'inspection, et jamais `SubmitFeed`, `SubmitUrlBatch` ni `api.indexnow.org`.
- Rendu : la sortie texte ne contient jamais la clé Bing ni un jeton (`assertNoSecret`) ; `--json` s'analyse.
- CLI : exit 0 quand un moteur répond, exit 1 quand aucun ne peut l'être, exit 1 sur une URL hors propriété.
- `check-sources.ts` retrouve chaque citation de `acces.md`.

Dette (D34) : `BING_API_BASE` et le décodage `{"ErrorCode","Message"}` existent en trois copies après ce chantier (`keywords.ts`, `checklist/lib/actions.ts`, `console/lib/bing.ts`). Une passe de mise en commun est à programmer, précédée de l'inventaire de ce qui se répète vraiment entre les skills.

## 10. Critères d'acceptation

- **AC-1** Quand je lance `console sites`, alors la sortie nomme les trois propriétés Search Console de Romain avec leur rôle et, pour chacune, ses sitemaps déclarés avec soumis et indexé ; côté Bing elle dit « aucun site dans ce compte Bing ».
  Vérifié par : la commande, sortie collée dans la recette.
- **AC-2** Quand je lance `console inspect https://romain-ecarnot.com/`, alors la sortie nomme la propriété retenue (`sc-domain:romain-ecarnot.com`) et porte verdict, état de couverture, état robots.txt, état d'indexation, date du dernier crawl, état de récupération, et les deux canonicals côte à côte, plus le lien d'inspection.
  Vérifié par : la commande, sortie collée ; le lien ouvert une fois pour contrôle visuel.
- **AC-3** Quand j'inspecte une URL du site qui n'existe pas, alors la sortie le dit sans planter des deux côtés, et le code de sortie est 0.
  Vérifié par : `console inspect https://romain-ecarnot.com/page-qui-nexiste-pas`.
- **AC-4** Quand j'inspecte une URL qu'aucune propriété ne couvre, alors la commande sort en 1, nomme les propriétés vues, et aucune requête d'inspection n'est partie.
  Vérifié par : `console inspect https://example.com/` sous un `fetch` de trace.
- **AC-5** Quand aucun jeton Google n'est disponible, alors la sortie donne la commande exacte à lancer avec son scope, et aucun jeton n'apparaît.
  Vérifié par : `env -u GSC_SA_KEY_FILE PATH=/usr/bin bun scripts/console.ts sites`.
- **AC-6** Quand `GSC_QUOTA_PROJECT` est absente et que le fournisseur est gcloud, alors la sortie nomme la variable et donne la commande d'activation de l'API, sans appeler l'API.
  Vérifié par : `env -u GSC_QUOTA_PROJECT bun scripts/console.ts sites`.
- **AC-7** Quand `BING_WMT_API_KEY` est absente, alors Google répond quand même, Bing est marqué « non interrogé (clé absente) », et le code de sortie est 0.
  Vérifié par : `env -u BING_WMT_API_KEY bun scripts/console.ts sites`.
- **AC-8** Quand je lance `console crawl --site https://romain-ecarnot.com`, alors la sortie dit que Google n'expose pas ses statistiques de crawl et, côté Bing, « aucun site dans ce compte Bing ».
  Vérifié par : la commande.
- **AC-9** Quand une commande tourne avec `--json`, alors la sortie s'analyse et ne contient ni clé Bing ni jeton.
  Vérifié par : `console sites --json | python3 -m json.tool`, plus une recherche de la clé dans la sortie qui ne rend rien.
- **AC-10** Quand la suite de tests tourne, alors elle est verte et `check-sources.ts` retrouve les citations de `acces.md` en plus des 107 existantes.
  Vérifié par : `bun test` et `bun skills/audit/scripts/check-sources.ts`.

## 11. Hors périmètre de cette étape

- L'audit niveau 1 : `collect.ts --level 1`, `raw/gsc/`, `raw/bing/`, LVL1-01 à LVL1-05, AI-03, imports CSV des rapports IA. Seconde spec du chantier 5.
- Les requêtes réelles (`searchAnalytics`, `GetQueryStats`, `GetPageStats`), D31.
- Toute écriture : `SubmitFeed`, `SubmitUrlBatch`, `sitemaps.submit`, ping IndexNow. Elles sont dans `checklist --agir` ou restent au client.
- La mise en commun du transport Bing, D34.
- Un serveur MCP : écarté le 29/08 à 18 h 20, la skill et ses scripts suffisent et ne coûtent aucun contexte hors SEO.

## 12. Échantillons capturés le 29/08

Session mère, jeton ADC de Romain, jamais affiché. Ces trois réponses sont les fixtures des tests.

### 12.1 `sites.list`, HTTP 200

```json
{"siteEntry":[
 {"siteUrl":"https://lebonpote.romain-ecarnot.com/","permissionLevel":"siteOwner"},
 {"siteUrl":"sc-domain:healthincloud.app","permissionLevel":"siteUnverifiedUser"},
 {"siteUrl":"sc-domain:romain-ecarnot.com","permissionLevel":"siteOwner"}]}
```

### 12.2 Le 403 sans projet de quota

Avec le scope `webmasters.readonly` accordé mais sans en-tête `x-goog-user-project`, `sites.list` répond HTTP 403, `reason: SERVICE_DISABLED`, `service: searchconsole.googleapis.com`, message « The searchconsole.googleapis.com API requires a quota project, which is not set by default. » L'API a été activée le 29/08 sur le projet `seo-harness-1787844978744` ; l'en-tête posé, la même requête rend 200.

### 12.3 `urlInspection.index.inspect`, HTTP 200

```json
{"inspectionResult":{
 "inspectionResultLink":"https://search.google.com/search-console/inspect?resource_id=sc-domain:romain-ecarnot.com&id=…",
 "indexStatusResult":{"verdict":"NEUTRAL","coverageState":"Page with redirect","robotsTxtState":"ALLOWED",
  "indexingState":"INDEXING_ALLOWED","lastCrawlTime":"2026-08-21T08:31:23Z","pageFetchState":"SUCCESSFUL",
  "googleCanonical":"https://www.romain-ecarnot.com/","userCanonical":"https://www.romain-ecarnot.com/",
  "referringUrls":["https://www.romain-ecarnot.com/","http://romain-ecarnot.com/"],"crawledAs":"MOBILE"},
 "mobileUsabilityResult":{"verdict":"VERDICT_UNSPECIFIED"}}}
```

### 12.4 `sitemaps.list`, HTTP 200

```json
{"sitemap":[{"path":"https://lebonpote.romain-ecarnot.com/sitemap.xml",
 "lastSubmitted":"2026-04-30T16:13:26.601Z","isPending":false,"isSitemapsIndex":false,"type":"sitemap",
 "lastDownloaded":"2026-05-01T18:06:47.626Z","warnings":"0","errors":"0",
 "contents":[{"type":"web","submitted":"1","indexed":"0"}]}]}
```

Lève l'incertitude 4 de la note d'idéation : `contents[].indexed` est bien renseigné, en chaîne. Que sa valeur soit ici `0` alors que `submitted` vaut `1` reste un échantillon unique, non généralisable [candidat 1x, capture du 29/08].

### 12.5 Bing, inchangé

`GetUserSites` avec la clé de Romain rend `{"d":[]}` (capturé le 29/08 pendant le chantier 4). Le compte ne contient aucun site.

## 13. Incertitudes

1. **`GetUrlInfo` sur une URL inconnue de Bing** : réponse vide, `null` ou erreur ? Non capturable tant que le compte est vide. Traitement unique en attendant (5.4).
2. **Forme de `GetCrawlStats` et `GetCrawlIssues`** : jamais capturée. Décodage écrit d'après la doc, sonde au calendrier de la recette dès qu'un site entre dans le compte.
3. **Permission minimale pour l'inspection d'URL** : la sonde du 29/08 a été faite en rôle propriétaire. Ce qu'un rôle restreint obtient reste ouvert (incertitude 1 de la note d'idéation, non levée).
4. **Survie de l'endpoint JSON Bing après le retrait SOAP et POX du 31/08/2026** : sonde déjà au calendrier du 1er septembre, à étendre à `GetUrlInfo`, `GetCrawlStats` et `GetFeeds`.
5. **Scope `webmasters.readonly` sur le client gcloud** : accordé le 29/08 sur le compte de Romain. Qu'il le soit toujours après une reconnexion, ou sur un autre compte, n'est pas garanti par une phrase officielle.

## 14. Prérequis hors code

Aucun ne bloque l'écriture du code ; les trois bloquent une partie de la recette.

1. `export GSC_QUOTA_PROJECT="seo-harness-1787844978744"` dans `~/.zshenv`. Romain s'en charge (29/08, 18 h 40).
2. Chico n'a pas de propriété Search Console. AC-1 à AC-4 se jouent donc sur `romain-ecarnot.com`.
3. Le compte Bing de Romain est vide. AC-1, AC-7 et AC-8 vérifient l'état « compte vide » ; la lecture réelle de Bing attend qu'un site y soit ajouté, et les incertitudes 1 et 2 avec.
