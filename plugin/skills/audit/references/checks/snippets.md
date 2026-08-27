# Snippets et éligibilité aux AI Overviews

Contexte pour Claude : une page n'est citée dans les AI Overviews ou l'AI Mode que si elle est indexée et éligible à un extrait. `nosnippet`, `max-snippet:0` et `noindex` sortent donc la page de ces surfaces, parfois sans que personne ne l'ait décidé. `derived/pages.json` donne `robotsMeta` (balise meta) et `xRobotsTag` (header) par page.

### SNIP-01 : nosnippet sur une page clé
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucune page collectée ne porte nosnippet, en meta robots ou en X-Robots-Tag.
Comment    : derived/pages.json → robotsMeta ou xRobotsTag contient « nosnippet » (insensible à la casse). Preuve : la balise dans raw/pages/<slug>.html ou le header dans raw/pages/<slug>.headers.json.
Source     : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag « This applies to all forms of search results (at Google: web search, Google Images, Discover, AI Overviews, AI Mode) and will also prevent the content from being used as a direct input for AI Overviews and AI Mode. »
Source     : https://developers.google.com/search/docs/appearance/ai-features « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
Correctif  : retirer nosnippet de la page, ou le limiter à un fragment avec data-nosnippet si seul un passage doit rester hors extrait.
Effort     : rapide

### SNIP-02 : max-snippet à zéro ou très bas
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucune page ne porte max-snippet:0 ; toute autre valeur de max-snippet est signalée en Important, sans seuil chiffré car la documentation n'en fixe aucun.
Comment    : derived/pages.json → robotsMeta ou xRobotsTag contient « max-snippet: » ; valeur 0 = Critique ; autre valeur = Important, en citant la valeur.
Source     : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag « This applies to all forms of search results (such as Google web search, Google Images, Discover, Assistant, AI Overviews, AI Mode) and will also limit how much of the content may be used as a direct input for AI Overviews and AI Mode. »
Correctif  : retirer la directive, ou remonter la valeur si une limite est réellement voulue.
Effort     : rapide

### SNIP-03 : noindex sur une page clé
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucune page collectée depuis le sitemap ni la home ne porte noindex ou none.
Comment    : derived/pages.json → robotsMeta ou xRobotsTag contient « noindex » ou vaut « none ». Une page en noindex présente dans le sitemap est une contradiction à signaler en plus.
Source     : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag « Do not show this page, media, or resource in search results. »
Source     : https://developers.google.com/search/docs/appearance/ai-features « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
Correctif  : retirer noindex des pages qui doivent être trouvées ; retirer du sitemap celles qui doivent rester hors index.
Effort     : rapide
