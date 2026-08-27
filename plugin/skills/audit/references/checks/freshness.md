# Fraîcheur

Contexte pour Claude : `derived/pages.json` → `datePublished`, `dateModified` (JSON-LD), `lastModified` (header HTTP), `visibleDates` (texte et <time>). Ces vérifications portent sur les pages de contenu, pas sur la home ni les pages de service.

### FRESH-01 : date visible et date structurée sur les pages de contenu
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : une page de contenu affiche une date étiquetée et porte datePublished ou dateModified en JSON-LD.
Comment    : derived/pages.json → pages dont jsonld[].types contient Article, BlogPosting, NewsArticle ou dont le title suggère un article : visibleDates vide = trouvaille ; datePublished et dateModified tous deux null = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Label your dates appropriately with text like "Publish" or "Last updated". »
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Specify dates with structured data. We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif  : afficher « Publié le » et « Mis à jour le », et renseigner datePublished / dateModified.
Effort     : rapide

### FRESH-02 : dates cohérentes entre visible, JSON-LD et header
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : quand dateModified existe, le même jour apparaît dans visibleDates ; quand Last-Modified existe, il n'est pas antérieur à dateModified.
Comment    : derived/pages.json → comparer le jour (AAAA-MM-JJ) de dateModified avec les visibleDates converties ; écart = trouvaille (citer les trois valeurs). Last-Modified antérieur à dateModified = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Ensure that the date (and optional time and timezone) match between the equivalent user-visible and structured values. »
Correctif  : une seule source de vérité pour la date de mise à jour, propagée à la fois dans le texte, le JSON-LD et le header.
Effort     : moyen
