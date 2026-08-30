# Indexabilité

Contexte pour Claude : `raw/manifest.json` porte les sondes (`probes.httpToHttps`, `probes.hostVariant`, `probes.notFound`) et les sitemaps ; `derived/pages.json` porte `canonical` par page.

### IDX-01 : sitemap présent, valide, avec des URL qui répondent
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : un sitemap répond 200 et se parse (index ou urlset) ; les pages collectées depuis ce sitemap répondent 200.
Comment    : raw/manifest.json → sitemaps[] : au moins un status 200 avec file ; raw/sitemap-*.xml contient <urlset> ou <sitemapindex>. Puis pages[] issues du sitemap : status différent de 200 = trouvaille (citer l'URL et le code).
Source     : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « All formats limit a single sitemap to 50MB (uncompressed) or 50,000 URLs. »
Source     : https://www.sitemaps.org/protocol.html « The file itself must be UTF-8 encoded »
Correctif  : générer un sitemap XML à jour, le servir en 200, le déclarer dans robots.txt (ROBOTS-05), retirer les URL en erreur.
Effort     : moyen

### IDX-02 : canonical présent, absolu et cohérent
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque page collectée porte un rel=canonical absolu, qui pointe vers elle-même ou vers une URL de même origine.
Comment    : derived/pages.json → canonical null = trouvaille ; canonical relatif (ne commence pas par http) = trouvaille ; canonical vers une autre origine = trouvaille à examiner (peut être voulu pour une syndication).
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « Use absolute paths rather than relative paths with the rel="canonical" link element. »
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « We recommend adding this same self-referential rel="canonical" link element to the canonical page itself as well. »
Correctif  : ajouter <link rel="canonical" href="https://…"> absolu sur chaque page, auto-référent par défaut.
Effort     : rapide

### IDX-03 : HTTPS servi et HTTP redirigé
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : le site répond en HTTPS et http:// redirige en 301 ou 308 vers https://.
Comment    : raw/manifest.json → site commence par https ; probes.httpToHttps.chain : premier saut 301 ou 308 vers une URL https. Un 200 direct en http, ou une absence de redirection, = trouvaille. Hôte localhost ou 127.0.0.1 : Info « non applicable en local », jamais Critique.
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « Google prefers HTTPS pages over equivalent HTTP pages as canonical, except when there are issues or conflicting signals »
Source     : https://web.dev/enable-https/ « Google uses HTTPS as a positive search quality indicator. »
Correctif  : certificat TLS et redirection permanente de tout http:// vers https://.
Effort     : moyen

### IDX-04 : une seule version d'hôte, www ou apex
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : l'autre variante d'hôte (www si le site est en apex, apex si le site est en www) redirige en permanent vers le site ; elle ne sert pas de 200.
Comment    : raw/manifest.json → probes.hostVariant : status 200 sans redirection = deux versions servies, trouvaille ; 301 ou 308 vers l'origine du site = passé ; status 0 ou erreur DNS = Info « variante non résolue ». Hôte localhost ou 127.0.0.1 : Info « non applicable en local », jamais Important.
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « Use this method when you want to get rid of existing duplicate pages. All permanent redirection methods have the same effect on Google Search »
Source     : https://developers.google.com/search/docs/crawling-indexing/canonicalization « a canonical URL is the URL of a page that Google chose as the most representative from a set of duplicate pages. »
Correctif  : rediriger en 301 la variante non retenue vers la version canonique, sur toutes les URL.
Effort     : rapide

### IDX-05 : soft 404
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : une URL inexistante répond 404 ou 410, pas 200.
Comment    : raw/manifest.json → probes.notFound.status === 200 : ouvrir raw/probe-notfound.html ; si son title est une page de challenge (Client Challenge, Just a moment, Access denied), Info « protection anti-bot » ; sinon trouvaille. 403 ou 429 = Info « protection anti-bot, à vérifier depuis un navigateur » ; 404 ou 410 = passé.
Source     : https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors « A soft 404 error is when a URL that returns a page telling the user that the page does not exist and also a 200 (success) status code. »
Source     : https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors « Such pages are excluded from Search. »
Correctif  : renvoyer un vrai code 404 (ou 410) sur les pages introuvables.
Effort     : moyen

### IDX-06 : pages indexées par Google
Couche     : absolue
Niveau     : 1
Sévérité   : Critique
Vérifie    : les pages collectées sont dans l'index Google. Une page absente de l'index ne reçoit aucun trafic, quelle que soit sa qualité.
Comment    : derived/console.json → google : error non nul = non vue, avec la raison. Sinon google.index : indexed sur total, et notIndexed liste chaque page avec son coverageState. Dire toujours que le compte porte sur les pages collectées et non sur le site entier (--max-pages plafonne). Ne jamais utiliser le champ indexed de sitemaps.list : il vaut « 0 » même sur des pages indexées (mesure du 30/08).
Source     : https://support.google.com/webmasters/answer/9012289 « The URL Inspection tool provides information about Google's indexed version of a specific page, and also allows you to test whether a URL might be indexable. »
Correctif  : vérifier robots.txt et la balise robots, soumettre la page dans Search Console, et s'assurer qu'elle est atteignable depuis le sitemap et un lien interne.
Effort     : moyen

### IDX-07 : Google a choisi un autre canonical que celui déclaré
Couche     : absolue
Niveau     : 1
Sévérité   : Important
Vérifie    : pour chaque page, le canonical retenu par Google est celui que la page déclare.
Comment    : derived/console.json → google : error non nul = non vue, avec la raison. Sinon google.canonical : une entrée par divergence, avec googleCanonical et userCanonical. Liste vide = passée. Une page sans canonical déclaré n'apparaît pas ici : c'est TAG-03 au niveau 0, ne pas doubler la trouvaille.
Source     : https://support.google.com/webmasters/answer/9012289 « Inspect the indexed version of the page and look at the Page indexing > Google-selected canonical field. »
Correctif  : rapprocher la balise canonique de l'URL réellement servie, vérifier les redirections apex/www et les paramètres d'URL, puis redemander l'indexation.
Effort     : moyen
