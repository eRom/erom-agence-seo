# Consoles et moteurs : les gestes à la main et ce que la skill fait toute seule

Une entrée par ligne de `seo/checklist.md` qui demande un clic, une lecture ou une action. Même forme que les recettes de `build` : `Chemin` (les clics, dans l'ordre), `Piège`, `Source` (URL officielle et citation mot pour mot, retrouvée par `check-sources.ts`). Les pages d'aide de Bing Webmaster Tools sont des applications JavaScript : citées `[manuel]`, à relire à la main. Sources vérifiées le 2026-08-29 (`docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md`).

### Hors build réglés (CL-03)
Chemin   : chaque sous-ligne porte son « ou » (l'endroit où agir : Vercel, DNS, PageSpeed) ; une fois réglé, cocher à la main. Après le déploiement, la ligne « Prod verte » revérifie IDX-03 et IDX-04 sur la prod.
Piège    : sur Vercel, la redirection apex vers www se règle dans Project Settings, Domains, Edit, « Redirect to », code 308 (permanent) et non 307. Vérifié sur chico le 29/08 : `curl -sI https://commentchercherbonheur.org/` rend `HTTP/2 308`.
Source   : https://developers.google.com/search/docs/crawling-indexing/301-redirects « The 301 and 308 status codes mean that a page has permanently moved to a new location. »

### Search Console : propriété créée (CL-04)
Chemin   : search.google.com/search-console, Ajouter une propriété, type Domaine (le nom de domaine nu, sans https ni www), puis dans la fenêtre de vérification, Select record type : TXT ; chez le registrar, un enregistrement TXT sur la racine (Host vide ou @), Value = la chaîne donnée par Search Console ; revenir et cliquer Verify. Site client : ensuite Settings, Users and permissions, Add user, l'adresse du compte de l'agence, le rôle minimal.
Piège    : la vérification par TXT ne touche que le DNS, pas une page servie ; elle peut donc précéder le déploiement (déduction, la page ne le dit pas noir sur blanc). Le DNS peut mettre jusqu'à trois jours à servir l'enregistrement.
Piège    : ni Restricted ni Full ne soumettent un sitemap : il faut le rôle Owner (voir la ligne « J+1, sitemap soumis dans Search Console ») ; seul Owner ajoute des utilisateurs. Pour l'agence, viser le rôle minimal qui suffit à lire (note niveau 1, section 5).
Source   : https://support.google.com/webmasters/answer/9008080 « For TXT records, a Search Console verification record looks something like google-site-verification= »
Source   : https://support.google.com/webmasters/answer/9008080 « For manually installed records, it can take up to two or three days for your provider to start serving the record. »
Source   : https://support.google.com/webmasters/answer/7687615 « Open the Users and permissions page in property settings »
Source   : https://support.google.com/webmasters/answer/7687615 « Restricted user: Has simple view rights on most data. »

### Bing Webmaster Tools : site ajouté (CL-05)
Chemin   : bing.com/webmasters, se connecter avec le compte de l'agence, Ajouter un site, « Importer depuis Google Search Console » (un clic, la vérification est reprise de Google), ou Ajouter manuellement puis vérifier (fichier XML, balise meta ou CNAME). Site client : le client, depuis son propre compte, va dans Settings, Users, Add user, l'adresse du compte de l'agence, rôle Read only ; l'agence ne demande jamais sa clé API.
Piège    : la clé API Bing est faite par utilisateur, pas par site : une clé ouvre tous les sites du compte, en écriture. C'est pour ça que la délégation en lecture seule est la seule bonne réponse pour un client.
Source   : https://learn.microsoft.com/en-us/bingwebmaster/getting-access « Only one API key can be generated per user. »
Piège    : quand `BING_WMT_API_KEY` est là, la skill lit `GetUserSites` et coche seule si le site y est et est vérifié (IsVerified) ; un site présent mais non vérifié laisse la case vide.
Piège    : le bouton « Importer depuis Google Search Console » n'est attesté que par des sources secondaires (les pages d'aide Bing ne se lisent pas par script) ; s'il manque, ajouter le site à la main et le vérifier par fichier XML, balise meta ou CNAME.
Source   : https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getusersites « This example shows how to list all sites which are not verified. »
Source   : https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.addsiteroles « Delegate site access to user »
Source   : https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b « Add and verify site » [manuel]
Source   : https://www.bing.com/webmasters/help/how-to-add-users-to-your-site-account-d5d00364 « How to add users to your site account » [manuel]

### Prod verte (CL-07)
Chemin   : rien à cliquer, c'est l'audit niveau 0 sur la prod qui juge (0 Critique, 0 Important). Si la case se vide après un déploiement, lire la ligne « En bref » du rapport cité, puis les trouvailles. Un noindex ou un X-Robots-Tag de staging resté en prod est une trouvaille SNIP ou ROBOTS de l'audit avant d'être un problème Google.
Piège    : côté Google, ce même noindex remonte dans le rapport Page Indexing (Why pages aren't indexed, « URL marked noindex »), pas dans Suppressions, qui sert aux retraits volontaires.
Source   : https://support.google.com/webmasters/answer/7440203 « When Google tried to index the page it encountered a 'noindex' directive and therefore did not index it. »

### Redirections de l'ancien site (CL-08)
Chemin   : rien à cliquer si la case est cochée. Sinon, chaque sous-ligne donne l'URL de l'ancien sitemap et ce qu'elle a répondu : à régler chez l'hébergeur de l'ancien domaine (redirection permanente vers la page équivalente du nouveau site), puis relancer la skill.
Piège    : 301 et 308 seulement ; un 302 ou un 307 ne transfère rien et ne devient jamais permanent avec le temps (aucune doctrine Google en ce sens).
Piège    : compter quelques semaines pour qu'un site petit ou moyen ait migré dans l'index.
Source   : https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes « Use server side permanent redirects if technically possible. Although Googlebot supports several kinds of redirects, we recommend that you use HTTP permanent redirects if possible, such as 301 and 308. »
Source   : https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes « As a general rule, a small to medium-sized website can take a few weeks for most pages to move, and larger sites take longer. »
Source   : https://developers.google.com/search/docs/crawling-indexing/301-redirects « The 301 and 308 status codes mean that a page has permanently moved to a new location. »

### Ping IndexNow (CL-09)
Chemin   : fait par la skill avec `--agir`, après accord : un POST à api.indexnow.org avec l'hôte, la clé de `seo/strategy.md`, l'emplacement du fichier clé et les URL du sitemap de prod collecté par l'audit. Accusé de réception : Bing Webmaster Tools, Reports & Data, IndexNow (bing.com/webmasters/indexnow), qui montre les URL soumises, explorées, indexées.
Piège    : 200 ou 202 veut dire « reçu », pas « indexé ». 403 : la clé n'est pas servie en /<clé>.txt, ou pas celle du fichier ; 422 : une URL n'est pas sur l'hôte, ou la clé a une forme inattendue ; 429 : attendre.
Piège    : une soumission par mise en ligne suffit ; IndexNow relaie aux autres moteurs participants dans les dix secondes.
Source   : https://www.indexnow.org/documentation « You can submit up to 10,000 URLs per post, mixing http and https URLs if needed. »
Source   : https://www.indexnow.org/documentation « The HTTP 200 response code only indicates that the search engine has received your set of URLs. »
Source   : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Source   : https://blogs.bing.com/webmaster/March-2024/Optimize-your-Impact-with-IndexNow-Insights « detailed reports on the number of URLs submitted, crawled, and indexed »
Source   : https://www.indexnow.org/searchengines « within 10 second after the verification »

### Sitemap soumis à Bing (CL-10)
Chemin   : fait par la skill avec `--agir` quand le site est dans le compte Bing de l'agence et vérifié (ligne « Bing Webmaster Tools : site ajouté ») : `SubmitFeed` avec l'URL du site telle que Bing la nomme et l'URL du sitemap de prod. Sinon, ou si Bing refuse (site client délégué en lecture seule) : bing.com/webmasters, Sitemaps, Submit sitemap, coller l'URL complète du sitemap, par le propriétaire du site.
Piège    : les protocoles SOAP et POX sont retirés le 31 août 2026 ; la skill parle JSON, comme `keywords.ts`. Si l'API répond InvalidApiKey, la clé de ~/.zshenv n'est plus la bonne (Settings, API Access ; une seule clé par compte).
Source   : https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.submitfeed « Supported formats: Sitemap, RSS 2.0, Atom 0.3, Atom 1.0 and text files. »
Source   : https://learn.microsoft.com/en-us/bingwebmaster/api-protocols « Legacy SOAP and POX APIs will be retired on August 31, 2026. »
Source   : https://learn.microsoft.com/en-us/bingwebmaster/getting-access « Only one API key can be generated per user. »

### J+1, sitemap soumis dans Search Console (CL-11)
Chemin   : search.google.com/search-console, choisir la propriété, Sitemaps (menu Indexation), « Ajouter un sitemap », coller l'URL complète https://<site>/sitemap.xml, Envoyer. Le statut doit passer à « Opération réussie » ; sinon cliquer la ligne pour le détail.
Piège    : il faut le rôle Owner sur la propriété : c'est le propriétaire qui clique, jamais l'agence à sa place, et jamais par l'API (jeton en lecture seule par construction, note niveau 1).
Piège    : le sitemap est lu tout de suite, mais l'exploration des URL prend du temps et n'est pas garantie pour toutes.
Source   : https://support.google.com/webmasters/answer/7451001 « You must have owner permissions on a property to submit a sitemap »
Source   : https://support.google.com/webmasters/answer/7451001 « The sitemap should be fetched immediately. However, it can take some time to crawl the URLs listed in a sitemap, and it is possible that not all URLs in a sitemap will be crawled, depending on the site size, activity, traffic, and so on. »

### J+3, pages clés indexées (CL-12)
Chemin   : dans Search Console, coller chaque URL des sous-lignes dans la barre d'inspection en haut de l'écran. Attendu : « URL is on Google ». Sinon, lire la raison (couverture, robots, canonical choisi par Google) et, si la page est bien servie, « Request indexing » (quota journalier).
Piège    : « URL is on Google » veut dire indexée, pas affichée : les impressions viennent après. Une demande d'indexation ne garantit rien ; comptez un jour, parfois beaucoup plus.
Piège    : le chantier 5 fera cette inspection par l'API (urlInspection.index.inspect, lecture seule) ; jusque là, à la main.
Source   : https://support.google.com/webmasters/answer/9012289 « The URL has been indexed, can appear in Google Search results, and no problems were found with any enhancements found in the page »
Source   : https://support.google.com/webmasters/answer/9012289 « Indexing typically takes only a day or so, but can take much longer in some cases. »

### J+7, premières impressions (CL-13)
Chemin   : Search Console, Performances, résultats de recherche, période 7 derniers jours : impressions et clics par page et par requête. Bing : bing.com/webmasters, Search Performance.
Piège    : les données les plus récentes sont provisoires et bougent encore quelques heures ; aucun délai en jours n'est documenté, J+7 est notre convention.
Source   : https://support.google.com/webmasters/answer/7576553 « The newest data can be preliminary, meaning it's still being collected and might change in the next few hours. »

### J+30, rapports IA lus (CL-14)
Chemin   : Search Console, Performances, rapport Generative AI (lien direct search.google.com/search-console/performance/search-analytics/ai) : impressions dans les fonctionnalités IA, par page et pays ; bouton Export. Bing : bing.com/webmasters, AI Performance : citations et part de citation dans Copilot. Noter ce qu'on lit dans la sous-ligne, ou déposer l'export dans seo/imports/ (le chantier 5 saura le lire).
Piège    : le rapport Google n'est pas ouvert à toutes les propriétés ; s'il manque, l'écrire (« non disponible pour cette propriété ») et cocher quand même. Ni l'un ni l'autre ne sont accessibles par API : ce sont des exports à la main, pour longtemps.
Source   : https://support.google.com/webmasters/answer/16984139 « Not all properties have access to the report, as we're rolling out over time. »

### J+90, audit de contrôle (CL-15)
Chemin   : relancer `/erom-seo:checklist` dans le repo du site : la skill refait un audit niveau 0 sur la prod et la ligne « Prod verte » se met à jour ; relire les trouvailles éventuelles et refaire un `build` si nécessaire. Le niveau 1 (impressions IA, indexation réelle par API) arrive au chantier 5.
Piège    : à J+90 la stratégie a peut-être bougé (cadence de fraîcheur, STRAT-04) : relire `seo/strategy.md` avant de conclure.
Source   : https://support.google.com/webmasters/answer/7576553 « The newest data can be preliminary, meaning it's still being collected and might change in the next few hours. »
