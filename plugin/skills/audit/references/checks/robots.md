# Bots et robots.txt

Contexte pour Claude : chaque moteur sépare un bot d'entraînement d'un ou plusieurs bots de récupération. Bloquer un bot de récupération retire le site des réponses IA de ce moteur. `derived/robots-eval.json` donne, pour chaque bot, `root` (verdict sur `/`) et `pages` (verdict par page collectée) ; `null` = pas de verdict possible. `semantics` dit comment robots.txt a été servi.

### ROBOTS-01 : robots.txt présent et lisible
Couche     : absolue
Niveau     : 0
Sévérité   : Info
Vérifie    : robots.txt répond 200 et se parse ; s'il est absent (4xx), aucune restriction ne s'applique.
Comment    : raw/manifest.json → robots.status ; derived/robots-eval.json → semantics. 200 et parseable : passé. allow-all-4xx : Info « aucun robots.txt, tout est autorisé ». 5xx ou 429 : voir ROBOTS-06.
Source     : https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec « Google's crawlers treat all 4xx errors, except 429, as if a valid robots.txt file didn't exist. This means that Google assumes that there are no crawl restrictions. »
Correctif  : si absent et que le site veut piloter les bots IA, créer /robots.txt avec des groupes explicites par bot (voir ROBOTS-02).
Effort     : rapide

### ROBOTS-02 : bloque un bot de récupération
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucun bot de récupération (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User) n'est interdit sur la racine ni sur une page clé.
Comment    : derived/robots-eval.json → bots[<bot>].root === false, ou bots[<bot>].pages[<page>] === false pour une page collectée. Preuve : le groupe User-agent et la ligne Disallow dans raw/robots.txt (numéros de ligne). Nuance à écrire dans le rapport : ChatGPT-User et Perplexity-User peuvent ignorer robots.txt ; les bloquer n'a pas d'effet garanti mais reste un signal d'intention à corriger.
Source     : https://developers.openai.com/api/docs/bots « Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers, though can still appear as navigational links. »
Source     : https://developers.openai.com/api/docs/bots « a webmaster can allow OAI-SearchBot in order to appear in search results while disallowing GPTBot to indicate that crawled content should not be used for training OpenAI's generative AI foundation models. »
Source     : https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler « Claude-User supports Claude AI users. When individuals ask questions to Claude, it may access websites using a Claude-User agent. »
Source     : https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler « Claude-SearchBot navigates the web to improve search result quality for users. »
Source     : https://docs.perplexity.ai/docs/resources/perplexity-crawlers « designed to surface and link websites in search results on Perplexity. It is not used to crawl content for AI foundation models. »
Source     : https://developers.openai.com/api/docs/bots « Because these actions are initiated by a user, robots.txt rules may not apply. »
Correctif  : séparer entraînement et récupération. Exemple à adapter :
             User-agent: GPTBot
             Disallow: /
             User-agent: ClaudeBot
             Disallow: /
             User-agent: OAI-SearchBot
             Allow: /
             User-agent: ChatGPT-User
             Allow: /
             User-agent: Claude-User
             Allow: /
             User-agent: Claude-SearchBot
             Allow: /
             User-agent: PerplexityBot
             Allow: /
Effort     : rapide

### ROBOTS-03 : bloque Googlebot ou bingbot
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : Googlebot et bingbot sont autorisés sur la racine et sur les pages clés.
Comment    : derived/robots-eval.json → bots["Googlebot"].root et bots["bingbot"].root, puis pages. Un false = trouvaille. Googlebot alimente Search et donc l'éligibilité aux AI Overviews ; bingbot alimente l'index Bing dont dépend Copilot.
Source     : https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers « Crawling preferences addressed to the Googlebot user agent affect Google Search (including Discover and all Google Search features) »
Source     : https://developers.google.com/search/docs/appearance/ai-features « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
Source     : https://blogs.bing.com/webmaster/april-2022/Announcing-user-agent-change-for-Bing-crawler-bingbot « compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm »
Correctif  : retirer le Disallow visé ou ajouter un groupe Allow explicite pour le bot concerné.
Effort     : rapide

### ROBOTS-04 : Google-Extended bloqué, sans effet sur les AI Overviews
Couche     : absolue
Niveau     : 0
Sévérité   : Info
Vérifie    : si Google-Extended est bloqué, le rapport rappelle que cela ne retire pas des AI Overviews ; si le site croyait s'en exclure ainsi, le vrai levier est SNIP-01, SNIP-02 ou SNIP-03.
Comment    : derived/robots-eval.json → bots["Google-Extended"].root === false. Toujours Info : c'est un choix légitime (refus de l'entraînement Gemini), mais souvent mal compris.
Source     : https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers « Google-Extended is a standalone product token that web publishers can use to manage whether content Google crawls from their sites may be used for training future generations of Gemini models »
Source     : https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers « Google-Extended does not impact a site's inclusion in Google Search nor is it used as a ranking signal in Google Search. »
Correctif  : aucun si le blocage est voulu. Sinon, expliquer la distinction au client.
Effort     : rapide

### ROBOTS-05 : sitemap déclaré dans robots.txt
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : au moins une ligne Sitemap: pointe vers un sitemap qui répond 200.
Comment    : derived/robots-eval.json → sitemaps non vide, et raw/manifest.json → sitemaps[].status contient un 200 pour une URL déclarée.
Source     : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « Sitemap: https://example.com/my_sitemap.xml »
Correctif  : ajouter la ligne Sitemap: <URL absolue> dans robots.txt.
Effort     : rapide

### ROBOTS-06 : robots.txt en erreur serveur
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : robots.txt ne répond ni 5xx ni 429 ni timeout.
Comment    : derived/robots-eval.json → semantics vaut disallow-all-5xx, rate-limited-429 ou unreachable. Preuve : raw/manifest.json → robots.status et robots.error.
Source     : https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec « For the first 12 hours, Google stops crawling the site but keeps trying to fetch the robots.txt file. »
Source     : https://www.rfc-editor.org/rfc/rfc9309.txt « If the robots.txt file is unreachable due to server or network errors, this means the robots.txt file is undefined and the crawler MUST assume complete disallow. »
Correctif  : faire répondre /robots.txt en 200 (même vide) ou en 404, jamais en 5xx.
Effort     : moyen
