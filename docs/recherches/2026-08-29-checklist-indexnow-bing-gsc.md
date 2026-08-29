---
title: Chantier 4, checklist : IndexNow, API Bing Webmaster Tools, gestes Search Console
date: 2026-08-29
status: proposed
project: erom-agence-seo
porte_sur: chantier 4, skill checklist (spec docs/superpowers/specs/2026-08-29-erom-seo-checklist-design.md, section 12)
spec: docs/superpowers/specs/2026-08-29-erom-seo-checklist-design.md
sondes: section 4, reproductibles sans clé sauf mention
---

# Chantier 4 : ce qu'il faut figer avant le plan

Recherche pré-plan du 2026-08-29, 14 h 10 à 14 h 30. Trois briefs `search-builtin` en parallèle (IndexNow, Bing, Google) plus des captures par la session mère : les agents n'ont ni shell ni écriture de fichier, donc chaque page de la section 1 a été recurlée ici, et les conventions qui entrent dans le code (corps IndexNow, corps `SubmitFeed`, réponse `GetUserSites`, enum d'erreurs) ont été extraites de la page officielle par `curl`, pas reprises d'un résumé. Complète la note `docs/recherches/2026-08-29-niveau-1-apis.md` (session d'idéation, même jour) sans la répéter.

## Verdict

Prêt pour le plan. Les trois conventions de la spec marquées `[NON VERIFIE]` sont figées par un exemple officiel (section 3). Restent quatre incertitudes (section 5), aucune ne bloque : deux se règlent à la recette sur chico, deux restent des consignes prudentes dans la référence.

Deux faits qui touchent la spec :

1. **Soumettre un sitemap dans Search Console demande le rôle Owner**, pas Full : « You must have owner permissions on a property to submit a sitemap » (G-SITEMAP). D26 tient à plus forte raison : la ligne J+1 est au propriétaire, par construction.
2. **Un `noindex` de staging déployé par erreur remonte dans le rapport Page Indexing** (« URL marked 'noindex' »), pas dans Suppressions. La référence `consoles.md` pointera là. L'audit n0 de « Prod verte » le voit avant Google de toute façon (SNIP-01, ROBOTS).

## 1. Sources primaires

Codes HTTP relevés par la session mère le 29/08 (`curl -sL -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0'`). Piège : `support.google.com` répond **404 à un HEAD** et 200 à un GET ; `check-sources.ts` doit rester en GET.

| Id | URL | HTTP | Date | Usage |
|---|---|---|---|---|
| IN-DOC | https://www.indexnow.org/documentation | 200 | non affichée | 3.1, corps POST, clé, codes |
| IN-FAQ | https://www.indexnow.org/faq | 200 (agent) | non affichée | 3.1, endpoints participants, fréquence |
| IN-SE | https://www.indexnow.org/searchengines | 200 (agent) | non affichée | 3.1, relais entre moteurs |
| IN-BLOG-2022 | https://blogs.bing.com/webmaster/january-2022/IndexNow-Announcing-Sharing-of-Submitted-URLs | 200 (agent) | 2022-01-13 | 3.1, `api.indexnow.org` |
| IN-BLOG-2024 | https://blogs.bing.com/webmaster/March-2024/Optimize-your-Impact-with-IndexNow-Insights | 200 (agent) | 2024-03-03 | 3.1, accusé de réception |
| MS-PROTOCOLS | https://learn.microsoft.com/en-us/bingwebmaster/api-protocols | 200 | updated_at 2026-08-10 (ms.date 2019-04-22) | 3.2, format JSON GET et POST, retrait SOAP/POX |
| MS-SUBMITFEED | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.submitfeed | 200 | 2023-11-14 | 3.2, exemple JSON officiel |
| MS-GETUSERSITES | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getusersites | 200 | 2023-11-14 | 3.2, exemple JSON officiel |
| MS-SITE | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.site | 200 | 2019-04-26 | 3.2, champs d'un site |
| MS-ERRORS | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.apierrorcode | 200 | 2019-04-26 | 3.2, enum d'erreurs |
| MS-USERROLE | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.siteroles.userrole | 200 | 2019-04-26 | 3.2, rôles de délégation |
| MS-ADDSITEROLES | https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.addsiteroles | 200 (agent) | 2023-11-14 | consoles.md CL-05, « Delegate site access to user » (cité aussi par la note niveau 1) |
| IN-SE (rappel) | https://www.indexnow.org/searchengines | 200 (agent) | non affichée | consoles.md CL-09, « within 10 second after the verification » |
| G-VERIFY | https://support.google.com/webmasters/answer/9008080 | 200 (GET) | non affichée | 3.3, propriété Domaine, TXT |
| G-PERMS | https://support.google.com/webmasters/answer/7687615 | 200 (GET) | non affichée | 3.3, rôles, ajout d'utilisateur |
| G-SITEMAP | https://support.google.com/webmasters/answer/7451001 | 200 (GET) | non affichée | 3.3, soumettre un sitemap |
| G-INSPECT | https://support.google.com/webmasters/answer/9012289 | 200 (GET) | non affichée | 3.3, inspection d'URL |
| G-PERF | https://support.google.com/webmasters/answer/7576553 | 200 (GET) | non affichée | 3.3, Performances |
| G-GENAI | https://support.google.com/webmasters/answer/16984139 | 200 (GET) | non affichée | 3.3, rapport Generative AI |
| G-REMOVALS | https://support.google.com/webmasters/answer/9689846 | 200 (GET) | non affichée | 3.3, ce que Suppressions n'est pas |
| G-PAGEIDX | https://support.google.com/webmasters/answer/7440203 | 200 (GET) | non affichée | 3.3, noindex détecté |
| G-MOVE | https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes | 200 | 2026-08-20 | 3.4, migration |
| G-REDIRECTS | https://developers.google.com/search/docs/crawling-indexing/301-redirects | 200 | 2026-04-14 | 3.4, 301 et 308 |

Pages d'aide `bing.com/webmasters/help/*` : applications JavaScript, seul le `<title>` est lisible par `curl` ; non citables par `check-sources.ts` (gotcha déjà connu, note du 27/08). URL listées en 3.2 pour la référence, sans citation.

## 2. Versions épinglées

- `bun` 1.4.0 (runtime, tests, `fetch` et `crypto` natifs). Aucune dépendance nouvelle : le chantier 4 n'ajoute rien à `dependencies` (`node-html-parser` 9.0.1 et `robots-parser` 3.0.1 restent ceux de l'audit).
- Aucun SDK : IndexNow et Bing sont des appels `fetch` nus, comme `keywords.ts`.

## 3. Conventions figées, avec leur échantillon

### 3.1 IndexNow, soumission groupée

Extrait brut de IN-DOC (curl, 29/08), à reprendre tel quel :

```
POST /indexnow HTTP/1.1
Content-Type: application/json; charset=utf-8
Host: <searchengine>
{
  "host": "www.example.com",
  "key": "<clé>",
  "keyLocation": "https://www.example.com/myIndexNowKey63638.txt",
  "urlList": [
    "https://www.example.com/url1",
    "https://www.example.com/folder/url2",
    "https://www.example.com/url3"
  ]
}
```

- Endpoint : `https://api.indexnow.org/indexnow` (IN-BLOG-2022, IN-FAQ : premier des « participating endpoints »). Relais obligatoire entre moteurs, IN-SE : « An IndexNow protocol participating search engine MUST notify every other participant (except those that have unsubscribed from notifications) with the URLs, after receiving notifications from one or more websites and verifying the authority of notifiers against their URLs, within 10 second after the verification. »
- `keyLocation` : facultatif quand le fichier est à la racine (« If you submit a set of URLs, specify the key file location as keyLocation variable in the JSON content » ne vaut que pour un emplacement autre). On le met quand même, explicite et sans coût.
- Limite : « You can submit up to 10,000 URLs per post, mixing http and https URLs if needed. »
- Clé : « Your-key should have a minimum of 8 and a maximum of 128 hexadecimal characters. The key can contain only the following characters: lowercase characters (a-z), uppercase characters (A-Z), numbers (0-9), and dashes (-). » (la doc se contredit sur « hexadecimal » ; la règle réelle est la liste de caractères). Fichier : « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
- Codes, tableau officiel mot pour mot (IN-DOC) :

| Code | Response | Reasons |
|---|---|---|
| 200 | OK | URL submitted successfully |
| 202 | Accepted | URL received. IndexNow key validation pending. |
| 400 | Bad request | Invalid format |
| 403 | Forbidden | In case of key not valid (e.g. key not found, file found but key not in the file) |
| 422 | Unprocessable Entity | In case of URLs which don't belong to the host or the key is not matching the schema in the protocol |
| 429 | Too Many Requests | Too Many Requests (potential Spam) |

- Ce que 200 veut dire : « The HTTP 200 response code only indicates that the search engine has received your set of URLs. » Pas de corps de réponse exploitable. Accusé de réception côté Bing : rapport IndexNow Insights, `https://www.bing.com/webmasters/indexnow` (Reports & Data, IndexNow), « detailed reports on the number of URLs submitted, crawled, and indexed » (IN-BLOG-2024). Pas d'équivalent documenté chez les autres moteurs.
- Fréquence : IN-FAQ recommande d'attendre au moins cinq minutes avant de resoumettre une même URL et ne publie aucun plafond. Une soumission par mise en ligne (D26) est très en dessous.

Pour le plan : la case 403 = « la clé de `seo/strategy.md` n'est pas servie en `/<clé>.txt` » ; 422 = « une URL du sitemap n'est pas sur `host`, ou la clé n'a pas la forme attendue » (le sitemap de prod collecté par l'audit n0 est déjà filtré sur l'hôte, `sameSite`, donc 422 pointe la clé). La spec disait 422 pour la clé absente : c'est 403, corrigé dans la référence.

### 3.2 Bing Webmaster Tools, API JSON

Format général (MS-PROTOCOLS) : JSON GET `https://ssl.bing.com/webmaster/api.svc/json/METHOD_NAME?apikey=API_KEY&param1=VALUE…` ; JSON POST `https://ssl.bing.com/webmaster/api.svc/json/METHOD_NAME?apikey=API_KEY`, paramètres dans le corps. Bandeau de la page : « Legacy SOAP and POX APIs will be retired on August 31, 2026. Migrate to our REST APIs to avoid service disruption. » L'endpoint JSON est celui de `keywords.ts` ; la sonde du 1er septembre (note de reprise) dira s'il survit.

**`SubmitFeed`**, exemple officiel (MS-SUBMITFEED), écriture :

```
POST /webmaster/api.svc/json/SubmitFeed?apikey=sampleapikeyedecc1ea4ae341cc8b6 HTTP/1.1
Content-Type: application/json; charset=utf-8
Host: ssl.bing.com
{
"siteUrl":"http://example.com",
"feedUrl":"http://example.com/sitemap.xml"
}

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{
"d":null
}
```

Remarks : « Supported formats: Sitemap, RSS 2.0, Atom 0.3, Atom 1.0 and text files. » Attribut .NET `WebInvoke(BodyStyle=WrappedRequest, Method="POST")` : le corps est l'objet des paramètres, tel quel.

**`GetUserSites`**, exemple officiel (MS-GETUSERSITES), lecture :

```
GET /webmaster/api.svc/json/GetUserSites?apikey=sampleapikeyedecc1ea4ae341cc8b6 HTTP/1.1
Host: ssl.bing.com

HTTP/1.1 200 OK
{
"d":[
{
"__type":"Site:#Microsoft.Bing.Webmaster.Api",
"AuthenticationCode":"258CAD36B9EEE22F1CFDEB4C239D26BB",
"DnsVerificationCode":"258cad36b9eee22f1cfdeb4c239d26bb.example.com",
"IsVerified":false,
"Url":"http://example.com"
}]
}
```

Champs de `Site` (MS-SITE) : `AuthenticationCode`, `DnsVerificationCode`, `IsVerified`, `Url`. La page MS-GETUSERSITES porte aussi un exemple C# introduit par « This example shows how to list all sites which are not verified. » (boucle sur `IsVerified`), cité par `consoles.md` CL-05. Pour la ligne 5 de la checklist : le site est « ajouté » si une entrée a `Url` sur le même hôte que la stratégie (apex et www confondus, comparaison par `sameSite` de `lib/sitemap.ts`) ; la preuve dit aussi `IsVerified` (un site ajouté mais non vérifié ne recevra pas de `SubmitFeed`).

**Erreurs** (MS-ERRORS, enum `ApiErrorCode`) : None 0, InternalError 1, UnknownError 2, InvalidApiKey 3, ThrottleUser 4, ThrottleHost 5, UserBlocked 6, InvalidUrl 7, InvalidParameter 8, TooManySites 9, UserNotFound 10, NotFound 11, AlreadyExists 12, NotAllowed 13, NotAuthorized 14, UnexpectedState 15, Deprecated 16. Forme observée le 27/08 et le 29/08 : HTTP 400, corps `{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}`. Le script lit `ErrorCode` et `Message` ; 4 et 5 = réessayer plus tard, 13 et 14 = droits insuffisants (consigne au client), 11 = site inconnu (ligne 5 à refaire). Lequel de 13, 14 ou 11 sort réellement pour un site absent du compte : incertitude 2.

**Rôles de délégation** (MS-USERROLE, `SiteRoles.UserRole`) : Administrator 0, ReadOnly 1, ReadWrite 2. La note niveau 1 cite `AddSiteRoles(…, isReadOnly)` ; la posture agence (client délègue en `ReadOnly`) a donc un nom dans l'API. `GetSiteRoles(siteUrl, includeAllSubdomains)` rend, exemple officiel, `{"d":[{"__type":"SiteRoles:#Microsoft.Bing.Webmaster.Api","Role":2,"Site":"http://host1.example.com","VerificationSite":"http://example.com",…}]}` : un site et son site de vérification sont deux champs, et `includeAllSubdomains` existe, ce qui suggère (sans phrase officielle) que www et apex sont deux sites chez Bing.

**Format de `siteUrl`** (brief Bing, reçu à 14 h 20) : tous les exemples officiels (`SubmitFeed`, `AddSite`, `GetUserSites`, `GetSiteRoles`, `oauth2`) écrivent `http(s)://domaine` sans slash final. Le script reprend le `Url` rendu par `GetUserSites` tel quel, ce qui règle la question. Quotas : aucune page ne documente un seuil pour `SubmitFeed` ni `GetUserSites` ; seuls les codes `ThrottleUser` 4 et `ThrottleHost` 5 existent.

**Pages d'aide Bing, applications JavaScript** (titre seul lisible, contenu non citable) : ajout et vérification d'un site `https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b` ; ajout d'utilisateurs (délégation) `https://www.bing.com/webmasters/help/how-to-add-users-to-your-site-account-d5d00364` ; retrait SOAP/POX `https://www.bing.com/webmasters/help/soap-pox-api-retirement-s0appox01`. Le bouton « Importer depuis Google Search Console » n'a été vu que dans des sources secondaires : consigne gardée, marquée à relire à la main (incertitude 5).

### 3.3 Search Console, gestes à la main (pour `consoles.md`)

- **Propriété Domaine, TXT** (G-VERIFY) : popup de vérification, « Select record type » = TXT ; chez le registrar, Host vide ou `@`, Value = la chaîne ; puis Verify. « For TXT records, a Search Console verification record looks something like `google-site-verification=_<<some number>>_`. » Délai : « For manually installed records, it can take up to two or three days for your provider to start serving the record. » Avant déploiement : la méthode ne touche que le DNS, pas une page ; la page ne le dit pas noir sur blanc (incertitude 3).
- **Ajouter un utilisateur** (G-PERMS) : « Open the property in Search Console. » ; « Open the Users and permissions page in property settings (Settings > Users and permissions). » ; « Click Add user » ; « Enter the Google Account name (email) of the new user » ; « Choose the permission level (role) to grant the user. » ; « Save your changes. » Rôles : « Owner: Has full control over properties in Search Console. Owners can add and remove other users, configure settings, view all data, and use all tools. » ; « Full user: Has view rights to all data and can take some actions. » ; « Restricted user: Has simple view rights on most data. »
- **Soumettre un sitemap** (G-SITEMAP) : « You must have owner permissions on a property to submit a sitemap » ; « Open the Sitemaps report, copy the URL you tested in step 3, paste it into the Add a new sitemap box in the Sitemaps report, then click Submit » ; « The sitemap should be fetched immediately. However, it can take some time to crawl the URLs listed in a sitemap, and it is possible that not all URLs in a sitemap will be crawled, depending on the site size, activity, traffic, and so on. » Consigne : coller l'URL complète `https://<site>/sitemap.xml`.
- **Inspection d'URL** (G-INSPECT) : « Type the fully-qualified URL to inspect in the inspection search bar at the top of any Search Console screen ». « URL is on Google » = « The URL has been indexed, can appear in Google Search results, and no problems were found with any enhancements found in the page. » et « URL is on Google doesn't guarantee that your page is appearing in Search results ». Request indexing : « a daily limit to how many index requests you can submit » ; « Indexing typically takes only a day or so, but can take much longer in some cases. »
- **Performances** (G-PERF) : « The newest data can be preliminary, meaning it's still being collected and might change in the next few hours. » Aucun délai en jours documenté ; le J+7 de la checklist reste une convention à nous.
- **Generative AI** (G-GENAI) : lien direct `https://search.google.com/search-console/performance/search-analytics/ai` ; « Not all properties have access to the report, as we're rolling out over time. » La ligne J+30 le dit.
- **noindex de staging** (G-PAGEIDX) : rapport Page Indexing, « Why pages aren't indexed », ligne « URL marked 'noindex' » : « When Google tried to index the page it encountered a 'noindex' directive and therefore did not index it. » Suppressions (G-REMOVALS) sert aux retraits volontaires, pas à ça.

### 3.4 Redirections d'un ancien site

- G-MOVE : « Use server side permanent redirects if technically possible. Although Googlebot supports several kinds of redirects, we recommend that you use HTTP permanent redirects if possible, such as 301 and 308. » Délai : « As a general rule, a small to medium-sized website can take a few weeks for most pages to move, and larger sites take longer. »
- G-REDIRECTS : « The `301` and `308` status codes mean that a page has permanently moved to a new location. » 302, 303, 307 sont temporaires ; aucune doctrine écrite qui ferait d'un 302 un permanent avec le temps.

Pour le script (D28) : accepter 301 et 308 seulement, une chaîne de plusieurs sauts permise, page finale en 200 sur l'hôte de la stratégie ; 302 ou 307 = défaut, avec « temporaire, Google ne transfère pas » en raison.

## 4. Échantillons réels

Sondes du 29/08, session mère, sans effet de bord.

```bash
# 4.1 clé IndexNow de chico servie en prod (attendu : 200, text/plain, contenu = la clé de seo/strategy.md)
curl -s -w '\nHTTP %{http_code} · %{content_type}\n' https://www.commentchercherbonheur.org/bf498d4959b94b88aa7bb3902433735f.txt
# résultat : bf498d4959b94b88aa7bb3902433735f · HTTP 200 · text/plain; charset=utf-8

# 4.2 sitemap de prod (attendu : 10 <loc>)
curl -s https://www.commentchercherbonheur.org/sitemap.xml | grep -c "<loc>"
# résultat : 10

# 4.3 GetUserSites avec la vraie clé (source ~/.zshenv ; la clé n'est jamais affichée)
source ~/.zshenv && [ -n "$BING_WMT_API_KEY" ] && curl -s -w '\nHTTP %{http_code}\n' "https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=$BING_WMT_API_KEY" | sed "s/$BING_WMT_API_KEY/[CLE]/g"
# résultat : {"d":[]} · HTTP 200 : le compte Bing de Romain n'a aucun site, chico n'y est pas

# 4.4 GetUserSites, clé factice (attendu : HTTP 400, InvalidApiKey ; vu le 27/08 et le 29/08 sur GetUrlInfo)
curl -s -w '\nHTTP %{http_code}\n' "https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=0000000000000000000000000000000f"
# résultat : {"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"} · HTTP 400
```

Ce que 4.3 change pour la recette : sur chico, la ligne 5 sera vide et la ligne 10 « en attente » tant que Romain n'a pas ajouté le site dans Bing Webmaster Tools (import depuis Search Console). C'est le bon état de départ pour AC-1 ; AC-4 (ping IndexNow) ne dépend pas de Bing.

Non capturé, par choix : aucune réponse réelle de `SubmitFeed` (écriture) ni du POST IndexNow. Les deux seront capturées à la recette, sur chico, avec l'accord de Romain (AC-4), et collées dans la recette.

## 5. Incertitudes, à porter dans le plan

1. **Réponse réelle du POST IndexNow** : levée le 29/08 à 17 h 45 (recette AC-4 sur chico) : HTTP 202, 10 URL sur www.commentchercherbonheur.org ; le script accepte 200 et 202 et ignore le corps. Au passage, R-3 : un sitemap qui liste l'apex pendant que le site sert www doit être ramené sur l'hôte servi avant le ping (`urlsOnOrigin`).
2. **Code Bing pour un site absent du compte** (NotFound 11, NotAllowed 13 ou NotAuthorized 14) et pour une délégation ReadOnly : non documenté. Le script traite 11, 13, 14 pareil (case vide, consigne au client, code et message consignés) ; la recette notera le code réel si Romain l'obtient.
3. **Vérification DNS TXT avant déploiement** : non tranchée par la page. La consigne de la ligne 4 dit « marche en général avant le déploiement, le DNS suffit », sans citation.
4. **Format de `siteUrl` chez Bing** : les exemples officiels sont tous sans slash final ; www et apex sont probablement deux sites (`includeAllSubdomains`, `Site` contre `VerificationSite`), sans phrase officielle. Le script envoie l'URL telle que `GetUserSites` la rend pour ce site (c'est Bing qui la nomme), ce qui contourne la question.
5. **« Importer depuis Google Search Console » dans Bing Webmaster Tools** : vu en sources secondaires seulement, les pages d'aide Bing ne sont pas lisibles par script. La consigne de la ligne 5 le garde, avec la voie manuelle (ajouter, puis vérifier par fichier, balise ou CNAME) en repli ; à confirmer à l'écran pendant la recette, quand Romain ajoute chico.
6. **Effet réel d'un rôle `ReadOnly` sur `SubmitFeed`** : aucune phrase officielle ; seule l'existence de l'enum prouve que le serveur connaît le rôle. Rejoint l'incertitude 2 : même traitement dans le script (case vide, consigne au propriétaire), code réel noté quand un site client le produira.

## 6. Ce que ça change pour la spec

- 5.3 : 403 pour la clé absente ou fausse, 422 pour une URL hors hôte ; `keyLocation` toujours envoyé ; `siteUrl` de `SubmitFeed` pris dans la réponse de `GetUserSites`.
- 4.3 ligne 5 : la preuve porte `IsVerified`.
- 4.3 ligne 11 : « par le propriétaire » a une source (G-SITEMAP, rôle Owner).
- Section 8 : `check-sources.ts` en GET sur `support.google.com` (404 en HEAD).
