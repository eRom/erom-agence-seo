# Audit SEO/GEO : https://commentchercherbonheur.org
2026-08-31 · Niveau 0 (URL seule) · Couche stratégique : non · 10 pages collectées · 26 vérifications
Stack détecté : Vercel (Info)

## En bref
0 Critique · 0 Important · 1 Mineur · 2 Info
Les trois choses à dire en RDV :
1. Grosse amélioration depuis l'audit du 28/08 : les 5 trouvailles Important de l'époque (title et description identiques sur 9 pages, aucun JSON-LD, aucun canonical, redirection apex vers www temporaire) ont toutes disparu. Chaque page a désormais un title et une description propres, un bloc JSON-LD valide, un canonical, et la redirection apex vers www est passée en 308 (permanente).
2. Le site n'a toujours de propriété ni dans Google Search Console ni dans Bing Webmaster Tools : impossible de voir l'indexation réelle, le canonical choisi par Google, ou la présence dans l'index Bing. C'est le seul vrai point aveugle de ce rapport.
3. Reste un petit défaut de finition : la page /ascension vend des paliers de prix mais reste typée WebPage générique au lieu de Product ou Offer (Mineur).

## Trouvailles

### [Mineur] SD-03 : la page /ascension reste en type WebPage générique
Preuve    : derived/pages.json, slug "ascension" : jsonld[0].types = ["WebPage"] ; title "Ascension C.H.I.C.O. : Tarifs de la Transcendance | Institut C.H.I.C.O." et h1 "COMMENCEZ VOTRE ASCENSION C.H.I.C.O." décrivent une page de paliers tarifaires.
Pourquoi  : une page qui vend des offres à plusieurs paliers de prix gagne à porter un type Product ou Offer plutôt que WebPage : c'est ce qui dit à un moteur qu'il s'agit d'une offre commerciale et non d'une page de contenu générique.
Source    : https://developers.google.com/search/docs/appearance/publication-dates « Specify dates with structured data. We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif : ajouter un type Product (ou Offer) avec ses propriétés (name, offers, price) sur /ascension, ou a minima un type plus spécifique que WebPage.
Effort    : moyen

### [Info] PERF-01 : pas de données de terrain (CrUX), score labo mobile 57/100
Preuve    : derived/psi.json → ok: true, pas de champ field (aucune donnée CrUX), lab.performance: 0.57, lab.seo: 1.
Pourquoi  : Google n'a pas assez de visites réelles sur ce site pour publier des Core Web Vitals de terrain. Le seul chiffre disponible est une mesure de laboratoire, à 57 sur 100 en mobile, qui indique une marge de progrès avant d'envoyer du trafic.
Source    : https://web.dev/articles/vitals « a good threshold to measure is the 75th percentile of page loads »
Correctif : aucune action urgente tant qu'il n'y a pas de données de terrain. Suivre le score labo dans le temps et refaire la mesure quand le trafic sera installé.
Effort    : lourd

### [Info] AI-01 : pas de fichier llms.txt, sans effet sur Google
Preuve    : raw/manifest.json → llms.status = 404 pour https://www.commentchercherbonheur.org/llms.txt.
Pourquoi  : l'absence de llms.txt ne pénalise rien, Google écrit explicitement qu'il ignore ce fichier. C'est du contexte, pas un défaut.
Source    : https://developers.google.com/search/docs/fundamentals/ai-optimization-guide « Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them. »
Correctif : aucun. Utile seulement si le site vise aussi les outils de code.
Effort    : rapide

## Ce que je n'ai pas pu voir
Niveau 1, avec les accès Search Console et Bing Webmaster Tools :
- IDX-06 pages indexées par Google
- IDX-07 canonical retenu par Google différent de celui déclaré
- AI-03 présence dans l'index Bing

Couche stratégique, avec seo/strategy.md : pas de seo/strategy.md sous clients/commentchercherbonheur.org/seo/, donc :
- STRAT-01 chaque page de strategy.md existe et vise son mot-clé (title, h1, ouverture)
- STRAT-02 la phrase d'identité est sur la home et dans Organization
- STRAT-03 les sameAs prévus sont en place
- STRAT-04 la cadence de fraîcheur est respectée par type de page
- AI-02 clé IndexNow déposée

## Vérifications passées
ROBOTS-01 robots.txt présent et lisible
ROBOTS-02 aucun bot de récupération bloqué
ROBOTS-03 Googlebot et bingbot autorisés
ROBOTS-04 Google-Extended non bloqué
ROBOTS-05 sitemap déclaré dans robots.txt
ROBOTS-06 robots.txt sans erreur serveur
SNIP-01 aucun nosnippet
SNIP-02 aucun max-snippet
SNIP-03 aucun noindex
IDX-01 sitemap présent, valide, les 10 URLs collectées répondent 200
IDX-02 canonical présent, absolu et cohérent sur les 10 pages
IDX-03 HTTPS servi et HTTP redirigé en 308
IDX-04 apex redirige en 308 (permanent) vers www, une seule version d'hôte servie
IDX-05 URL inexistante renvoyée en 404
SD-01 JSON-LD présent et valide sur les 10 pages
SD-02 Organization avec sameAs sur la home
TAG-01 title présent et distinct par page
TAG-02 meta description présente et distincte par page
TAG-03 un h1 par page
TAG-04 langue déclarée (lang="fr" sur les 10 pages)
FRESH-01 date visible et structurée sur les pages de contenu (methode, studies, telekinesie)
FRESH-02 dates cohérentes entre visible et JSON-LD
REND-01 contenu principal présent dans le HTML brut

## Annexe : collecte
| Ressource | URL | Statut | Octets | Fichier |
|---|---|---|---|---|
| robots.txt | https://commentchercherbonheur.org/robots.txt | 200 | 123 | robots.txt |
| sitemap 0 | https://commentchercherbonheur.org/sitemap.xml | 200 | 1793 | sitemap-0.xml |
| llms.txt | https://commentchercherbonheur.org/llms.txt | 404 | 32559 | n/a |
| page / | https://commentchercherbonheur.org/ | 200 | 75445 | pages/index.html |
| page /ascension | https://commentchercherbonheur.org/ascension | 200 | 59529 | pages/ascension.html |
| page /methode | https://commentchercherbonheur.org/methode | 200 | 63291 | pages/methode.html |
| page /institut | https://commentchercherbonheur.org/institut | 200 | 44654 | pages/institut.html |
| page /studies | https://commentchercherbonheur.org/studies | 200 | 69082 | pages/studies.html |
| page /tkt-tomorrow | https://commentchercherbonheur.org/tkt-tomorrow | 200 | 62272 | pages/tkt-tomorrow.html |
| page /telekinesie | https://commentchercherbonheur.org/telekinesie | 200 | 51789 | pages/telekinesie.html |
| page /audit | https://commentchercherbonheur.org/audit | 200 | 40870 | pages/audit.html |
| page /newsletter | https://commentchercherbonheur.org/newsletter | 200 | 42656 | pages/newsletter.html |
| page /legal | https://commentchercherbonheur.org/legal | 200 | 38711 | pages/legal.html |
| sonde http vers https | http://commentchercherbonheur.org/ | 200 | 75445 | n/a |
| sonde variante hôte | https://www.commentchercherbonheur.org/ | 200 | 75445 | n/a |
| sonde 404 | https://commentchercherbonheur.org/erom-seo-probe-c12b9bd3 | 404 | 32559 | n/a |

Note sur IDX-04 : le site a été audité depuis l'URL apex (sans www). La sonde hostVariant interroge donc www, qui répond 200 sans redirection propre puisque www est déjà l'hôte final visé par la redirection apex (confirmée par la sonde httpToHttps : apex répond 308 vers https, puis 308 vers www, puis 200). Il n'y a qu'un seul hôte qui sert réellement le contenu (www) et l'autre (apex) redirige de façon permanente vers lui : configuration saine, retenue comme passée.
