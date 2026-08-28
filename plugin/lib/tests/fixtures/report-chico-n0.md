# Audit SEO/GEO : https://www.commentchercherbonheur.org

2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : oui (seo/strategy.md, validée, 2026-08-28) · 10 pages collectées · 31 vérifications
Stack détecté : Vercel (Info)

## En bref
0 Critique · 6 Important · 6 Mineur · 1 Info

Les trois choses à dire en RDV :
1. Zéro JSON-LD sur les 10 pages : pas d'Organization, pas de type de contenu, rien à montrer aux moteurs ni aux IA génératives.
2. Title et meta description identiques mot pour mot sur les 10 pages : Google ne peut distinguer aucune page dans ses résultats.
3. La stratégie de mots-clés validée aujourd'hui (seo/strategy.md) n'est appliquée sur aucune des 10 pages : le travail de placement (title, h1, ouverture) reste entièrement à faire.

## Trouvailles

### [Important] SD-01 : Aucune donnée structurée (JSON-LD) sur les 10 pages collectées
Preuve    : derived/pages.json, champ jsonld vide ([]) pour les 10 slugs (index, methode, telekinesie, studies, institut, ascension, tkt-tomorrow, audit, newsletter, legal)
Pourquoi  : sans JSON-LD, Google ne peut construire ni rich results ni fiche Organization, et les moteurs IA n'ont aucun signal structuré pour situer le site.
Source    : https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data « In general, Google recommends using JSON-LD for structured data if your site's setup allows it, as it's the easiest solution for website owners to implement and maintain at scale (in other words, less prone to user errors). »
Correctif : ajouter un bloc <script type="application/ld+json"> valide sur chaque page (Organization sur la home, type de contenu adapté ailleurs), tester chaque page sur le Rich Results Test.
Effort    : moyen

### [Important] SD-02 : Pas de type Organization ni de sameAs sur la home
Preuve    : derived/pages.json, slug index, jsonld: [] ; derived/strategy-eval.json, identity.organizationPresent: false
Pourquoi  : sans bloc Organization, Google n'a aucune fiche d'identité du site à afficher ou à relier aux profils sociaux (Tipeee, X, LinkTree).
Source    : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »
Correctif : ajouter sur la home
             {
               "@context": "https://schema.org",
               "@type": "Organization",
               "name": "L'Institut C.H.I.C.O.",
               "url": "https://www.commentchercherbonheur.org/",
               "sameAs": [
                 "https://fr.tipeee.com/rebondir-apres-lavc-ma-carriere-dans-la-tech",
                 "https://x.com/CloudinNantes",
                 "https://www.romain-ecarnot.com/"
               ]
             }
Effort    : rapide

### [Important] IDX-02 : Canonical absent sur les 10 pages collectées
Preuve    : derived/pages.json, champ canonical: null pour les 10 slugs
Pourquoi  : sans balise canonical, rien n'indique à Google quelle URL est la version de référence en cas de duplication (paramètres, variantes d'hôte).
Source    : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « We recommend adding this same self-referential rel="canonical" link element to the canonical page itself as well. »
Correctif : ajouter <link rel="canonical" href="https://www.commentchercherbonheur.org/<chemin>"> absolu et auto-référent sur chaque page.
Effort    : rapide

### [Important] TAG-01 : Title identique sur les 10 pages
Preuve    : derived/pages.json, title: "L'Institut C.H.I.C.O. | Optimisation Quantique de l'Ego" identique sur index, methode, telekinesie, studies, institut, ascension, tkt-tomorrow, audit, newsletter, legal
Pourquoi  : un title identique partout empêche Google de distinguer les pages entre elles dans les résultats, et dilue le mot-clé propre à chacune.
Source    : https://developers.google.com/search/docs/appearance/title-link « It's important to have distinct text that describes the content of the page in the <title> element for each page on your site. »
Correctif : un title descriptif et unique par page, qui reprend le mot-clé de seo/strategy.md (ex. /telekinesie : « Télékinésie et MindBridge 6Ge | L'Institut C.H.I.C.O. »).
Effort    : rapide

### [Important] STRAT-01 : Les 10 pages prévues ne placent pas leur mot-clé principal
Preuve    : derived/strategy-eval.json, champ pages[]
Pourquoi  : la stratégie de mots-clés validée le 2026-08-28 n'est reflétée sur aucune page ; sans le mot-clé dans le title, le h1 ou l'ouverture, la page ne cible rien de précis pour Google.
Source    : https://developers.google.com/search/docs/appearance/title-link « Consider ensuring that your main heading is distinctive from other text on a page and stands out as being the most prominent on the page (for example, using a larger font, putting the title text in the first visible <h1> element on the page, etc). »
Correctif : / : mot-clé « institut chico » absent du h1 et de l'ouverture (présent dans le title). /methode : « méthode quantique chico » absent du title, du h1, de l'ouverture. /telekinesie : « télékinésie » absent du title, du h1, de l'ouverture. /studies : « études télékinésie » absent du title, du h1, de l'ouverture. /institut : « jean-pierre chico » absent du title et du h1 (présent dans l'ouverture). /ascension : « ascension chico » absent du title, du h1, de l'ouverture. /tkt-tomorrow : « tkt tomorrow » absent du title (présent dans le h1 et l'ouverture). /audit : « audit karmique gratuit » absent du title, du h1, de l'ouverture. /newsletter : « newsletter chico » absent du title, du h1, de l'ouverture. /legal : « mentions légales chico » absent du title, du h1, de l'ouverture.
Effort    : moyen

### [Important] STRAT-02 : La phrase d'identité n'est ni sur la home ni dans Organization
Preuve    : derived/strategy-eval.json, champ identity (onHome: false, organizationPresent: false, inOrganization: false, nameMatches: false)
Pourquoi  : la phrase qui définit le site pour un client ou un moteur IA (« site satirique qui parodie l'industrie du bien-être ») n'apparaît nulle part dans le texte visible ni dans une fiche Organization, donc rien ne porte cette identité côté machine.
Source    : https://developers.google.com/search/docs/appearance/structured-data/organization « A detailed description of your organization, if applicable. »
Correctif : placer la phrase d'identité dans le premier bloc de texte de la home, et la reprendre dans Organization.description (voir le correctif SD-02) avec Organization.name = « L'Institut C.H.I.C.O. ».
Effort    : rapide

### [Mineur] SD-03 : Aucun type de contenu adapté sur les pages hors home
Preuve    : derived/pages.json, jsonld vide sur methode, telekinesie, studies, institut, ascension, tkt-tomorrow, audit, newsletter, legal
Pourquoi  : des pages qui lisent comme des articles (« La Science ne Ment Pas », « L'Algorithme de l'Âme ») n'ont aucun type structuré (Article, CreativeWork...) pour le signaler à Google.
Source    : https://developers.google.com/search/docs/appearance/publication-dates « We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif : ajouter un type Article (ou CreativeWork) avec ses propriétés requises sur les pages éditoriales (methode, telekinesie, studies, institut, ascension, tkt-tomorrow), WebPage suffit pour audit, newsletter, legal.
Effort    : moyen

### [Mineur] IDX-04 : Redirection temporaire (307) entre l'apex et le www, au lieu d'une redirection permanente
Preuve    : raw/manifest.json, probes.hostVariant.chain : https://commentchercherbonheur.org/ répond 307 vers https://www.commentchercherbonheur.org/ (même schéma sur sitemaps[0].chain)
Pourquoi  : le site consolide bien vers www.commentchercherbonheur.org, mais avec un code 307 (temporaire) plutôt que 301 ou 308 (permanent) ; ce n'est pas le cas de blocage que ce check cible en premier lieu (deux versions servies en 200), donc reporté en Mineur, mais ça reste un signal moins net pour la consolidation des signaux de classement.
Source    : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « Use this method when you want to get rid of existing duplicate pages. All permanent redirection methods have the same effect on Google Search »
Correctif : configurer la redirection apex vers www en 308 permanent (ex. redirects avec permanent: true dans vercel.json) plutôt qu'en 307.
Effort    : rapide

### [Mineur] TAG-02 : Meta description identique sur les 10 pages
Preuve    : derived/pages.json, description: "Leader mondial du bonheur asynchrone et de la spiritualité Blockchain-native. Découvrez notre méthode validée par 0% des scientifiques." identique sur les 10 slugs
Pourquoi  : une description dupliquée sur tout le site n'aide personne quand plusieurs pages du même site apparaissent dans les mêmes résultats.
Source    : https://developers.google.com/search/docs/appearance/snippet « Identical or similar descriptions on every page of a site aren't helpful when individual pages appear in search results. »
Correctif : une description propre à chaque page, qui reprend son mot-clé de seo/strategy.md.
Effort    : rapide

### [Mineur] TAG-03 : h1 vide sur /audit et /legal
Preuve    : derived/pages.json, h1: [] pour les slugs audit et legal
Pourquoi  : ces deux pages n'ont aucun titre principal identifiable, ni pour l'utilisateur ni pour un moteur.
Source    : https://developers.google.com/search/docs/appearance/title-link « Heading elements, such as <h1> elements »
Correctif : ajouter un h1 sur /audit (ex. « Audit karmique gratuit ») et /legal (ex. « Mentions légales »).
Effort    : rapide

### [Mineur] STRAT-03 : Les 3 sameAs prévus par la stratégie sont absents
Preuve    : derived/strategy-eval.json, champ sameAs (les 3 entrées à present: false)
Pourquoi  : sans ces liens dans Organization.sameAs, Google ne peut pas relier le site à ses profils Tipeee, X et LinkTree pour construire l'entité.
Source    : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. »
Correctif : ajouter les 3 URLs (https://fr.tipeee.com/rebondir-apres-lavc-ma-carriere-dans-la-tech, https://x.com/CloudinNantes, https://www.romain-ecarnot.com/) dans Organization.sameAs sur la home (voir le correctif SD-02).
Effort    : rapide

### [Mineur] AI-02 : Clé IndexNow déclarée mais non servie
Preuve    : derived/strategy-eval.json, indexnow.declared: "bf498d4959b94b88aa7bb3902433735f", status: 404, contentMatches: false
Pourquoi  : la stratégie prévoit IndexNow mais le fichier de clé n'existe pas à la racine, donc la clé ne peut pas être vérifiée par Bing.
Source    : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Correctif : servir /bf498d4959b94b88aa7bb3902433735f.txt à la racine avec la clé en contenu, puis soumettre à Bing.
Effort    : rapide

### [Info] AI-01 : llms.txt absent
Preuve    : raw/manifest.json, llms.status: 404
Pourquoi  : sans effet sur Google, qui ignore ce fichier ; utile seulement aux agents de code et plateformes de documentation, non prioritaire pour ce site.
Source    : https://developers.google.com/search/docs/fundamentals/ai-optimization-guide « Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them. »
Correctif : aucun.
Effort    : rapide

## Ce que je n'ai pas pu voir
Niveau 1, avec les accès Search Console et Bing Webmaster Tools : LVL1-01 impressions dans les AI Overviews et l'AI Mode, LVL1-02 citations et part de citation dans Copilot et Bing, LVL1-03 pages indexées contre pages du sitemap, AI-03 présence dans l'index Bing.
Couche stratégique : aucune, la stratégie est active (seo/strategy.md).
PERF-01 Core Web Vitals sur données de terrain : PSI_API_KEY absente de l'environnement. Procédure : créer un projet sur console.cloud.google.com, activer l'API PageSpeed Insights, créer une clé API, l'exporter avec export PSI_API_KEY=... avant de relancer l'audit.
FRESH-01 date visible et date structurée sur les pages de contenu : aucune page ne peut être identifiée comme un contenu daté (jsonld vide sur les 10 pages, titres identiques et non distinctifs), le heuristique du check ne trouve pas de page cible.
FRESH-02 dates cohérentes entre visible, JSON-LD et header : aucune date exploitable nulle part (datePublished, dateModified et visibleDates vides sur les 10 pages), rien à comparer.
STRAT-04 la cadence de fraîcheur est respectée par page : aucune date exploitable sur les pages prévues par la stratégie (voir FRESH-01), impossible de juger le respect de la cadence.

## Vérifications passées
ROBOTS-01 robots.txt présent et lisible
ROBOTS-02 bloque un bot de récupération
ROBOTS-03 bloque Googlebot ou bingbot
ROBOTS-04 Google-Extended bloqué, sans effet sur les AI Overviews
ROBOTS-05 sitemap déclaré dans robots.txt
ROBOTS-06 robots.txt en erreur serveur
SNIP-01 nosnippet sur une page clé
SNIP-02 max-snippet à zéro ou très bas
SNIP-03 noindex sur une page clé
IDX-01 sitemap présent, valide, avec des URL qui répondent
IDX-03 HTTPS servi et HTTP redirigé
IDX-05 soft 404
TAG-04 langue déclarée
REND-01 contenu principal présent sans JavaScript

## Annexe : collecte
| Ressource | URL | Statut | Octets | Fichier |
|---|---|---|---|---|
| robots.txt | https://www.commentchercherbonheur.org/robots.txt | 200 | 123 | raw/robots.txt |
| sitemap | https://commentchercherbonheur.org/sitemap.xml (307 vers www) | 200 | 1793 | raw/sitemap-0.xml |
| llms.txt | https://www.commentchercherbonheur.org/llms.txt | 404 | 32333 | (absent) |
| page / | https://www.commentchercherbonheur.org/ | 200 | 73677 | raw/pages/index.html |
| page /methode | https://www.commentchercherbonheur.org/methode | 200 | 61587 | raw/pages/methode.html |
| page /telekinesie | https://www.commentchercherbonheur.org/telekinesie | 200 | 49878 | raw/pages/telekinesie.html |
| page /studies | https://www.commentchercherbonheur.org/studies | 200 | 67126 | raw/pages/studies.html |
| page /institut | https://www.commentchercherbonheur.org/institut | 200 | 43511 | raw/pages/institut.html |
| page /ascension | https://www.commentchercherbonheur.org/ascension | 200 | 58240 | raw/pages/ascension.html |
| page /tkt-tomorrow | https://www.commentchercherbonheur.org/tkt-tomorrow | 200 | 61235 | raw/pages/tkt-tomorrow.html |
| page /audit | https://www.commentchercherbonheur.org/audit | 200 | 39602 | raw/pages/audit.html |
| page /newsletter | https://www.commentchercherbonheur.org/newsletter | 200 | 41449 | raw/pages/newsletter.html |
| page /legal | https://www.commentchercherbonheur.org/legal | 200 | 37565 | raw/pages/legal.html |
| sonde http vers https | http://www.commentchercherbonheur.org/ | 200 (via 308) | 73677 | - |
| sonde apex vers www | https://commentchercherbonheur.org/ | 200 (via 307) | 73677 | - |
| sonde 404 | https://www.commentchercherbonheur.org/erom-seo-probe-b75c201b | 404 | 32333 | - |
