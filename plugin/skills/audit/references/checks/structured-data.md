# Données structurées

Contexte pour Claude : `derived/pages.json` → `jsonld[]` par page, avec `valid`, `hasContext`, `types`. Aucune API publique ne valide les rich results : le rapport renvoie vers https://search.google.com/test/rich-results pour la validation manuelle.

### SD-01 : JSON-LD présent et parsable
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque page collectée porte au moins un bloc JSON-LD valide, avec @context et @type.
Comment    : derived/pages.json → jsonld vide = trouvaille ; un bloc valid false = trouvaille (citer le slug) ; hasContext false = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data « In general, Google recommends using JSON-LD for structured data if your site's setup allows it, as it's the easiest solution for website owners to implement and maintain at scale (in other words, less prone to user errors). »
Correctif  : ajouter un bloc <script type="application/ld+json"> valide par page, tester sur le Rich Results Test.
Effort     : moyen

### SD-02 : Organization avec sameAs sur la home
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : la home porte un type Organization (ou un sous-type : LocalBusiness, NewsMediaOrganization, Corporation…) et une propriété sameAs non vide.
Comment    : derived/pages.json → page slug index → jsonld[].types contient Organization ou un type finissant par Organization ou Business ; puis raw/pages/index.html → chercher "sameAs" dans le bloc. Absence du type = trouvaille ; type présent sans sameAs = trouvaille Mineur.
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »
Correctif  : Organization avec name, url, logo et sameAs vers LinkedIn, annuaires et plateformes d'avis ; Wikidata si l'entité y existe.
Effort     : rapide

### SD-03 : type de page adapté au contenu
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : les pages de contenu (articles, fiches, FAQ) portent un type adapté (Article, BlogPosting, Product, FAQPage…), pas seulement WebPage ou rien.
Comment    : derived/pages.json → pour chaque page hors home : jsonld[].types ne contient aucun type de contenu = trouvaille. Juger le type attendu d'après le title et le h1.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Specify dates with structured data. We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif  : ajouter le type adapté avec ses propriétés requises, selon la doc Google du type.
Effort     : moyen
