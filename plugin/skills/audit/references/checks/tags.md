# Balises de page

Contexte pour Claude : `derived/pages.json` → `title`, `description`, `h1`, `lang` par page.

### TAG-01 : title présent et distinct par page
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque page a un <title> non vide, et deux pages n'ont pas le même title.
Comment    : derived/pages.json → title null ou vide = trouvaille ; titles identiques sur deux slugs = trouvaille (citer les slugs).
Source     : https://developers.google.com/search/docs/appearance/title-link « Make sure every page on your site has a title specified in the <title> element. »
Source     : https://developers.google.com/search/docs/appearance/title-link « It's important to have distinct text that describes the content of the page in the <title> element for each page on your site. »
Correctif  : un title descriptif et unique par page.
Effort     : rapide

### TAG-02 : meta description présente et distincte
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : chaque page a une meta description, et deux pages n'ont pas la même.
Comment    : derived/pages.json → description null = trouvaille ; descriptions identiques = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/snippet « Create unique descriptions for each page on your site »
Source     : https://developers.google.com/search/docs/appearance/snippet « Identical or similar descriptions on every page of a site aren't helpful when individual pages appear in search results. »
Correctif  : une description propre à chaque page.
Effort     : rapide

### TAG-03 : un h1 présent
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : chaque page a au moins un h1 ; plusieurs h1 ne sont pas une faute (aucune doc ne l'exige) mais sont signalés en Info.
Comment    : derived/pages.json → h1 vide = trouvaille Mineur ; h1.length > 1 = Info.
Source     : https://developers.google.com/search/docs/appearance/title-link « Heading elements, such as <h1> elements »
Correctif  : un h1 qui reprend le sujet de la page.
Effort     : rapide

### TAG-04 : langue déclarée
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : l'élément html porte un attribut lang.
Comment    : derived/pages.json → lang null = trouvaille.
Source     : https://www.w3.org/International/questions/qa-html-language-declarations « Always use a language attribute on the html tag to declare the default language of the text in the page. »
Correctif  : <html lang="fr">.
Effort     : rapide

### TAG-05 : title trop long
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : aucun <title> ne dépasse 65 caractères.
Comment    : derived/pages.json → title.length > 65 = trouvaille (citer le slug et la longueur).
             Le seuil de 65 est une convention d'agence : aucun moteur n'en publie. Google écrit
             qu'il n'y a pas de limite et que le titre est tronqué à la largeur de l'écran ; Bing
             signale « Titre trop long » dans le Site Scan de Webmaster Tools sans publier son
             seuil (relevé le 31/08/2026 sur commentchercherbonheur.org : 3 pages sur 10).
Source     : https://developers.google.com/search/docs/appearance/title-link « Also avoid unnecessarily long or verbose text in your <title> elements. »
Correctif  : viser 60 caractères, l'information distinctive en premier, le nom de marque en dernier.
Effort     : rapide
