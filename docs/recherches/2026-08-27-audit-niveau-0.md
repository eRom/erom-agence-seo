---
title: Brief pré-plan, chantier 1, audit niveau 0
date: 2026-08-27
status: implemented
project: erom-agence-seo
spec: docs/superpowers/specs/2026-08-27-erom-seo-design.md
sondes: docs/recherches/echantillons/
---

# Brief pré-plan : audit niveau 0

Recherche menée le 2026-08-27 avant d'écrire le plan du chantier 1. Cinq recherches en parallèle (bots IA, docs Google et Bing, API PageSpeed / IndexNow / sitemaps / RFC 9309, rendu JavaScript par les bots IA, bibliothèques Bun), plus des sondes réelles lancées depuis cette machine. Chaque convention que le plan fige pointe ici vers sa source vérifiée ou vers son incertitude.

## Verdict

**Prêt pour le plan.** Dix décisions actées par la recherche (section 1), sept incertitudes portées telles quelles dans le plan (section 6). Rien à trancher avec Romain avant d'écrire le plan.

## 1. Ce que la recherche change par rapport à la spec

1. **PageSpeed Insights : clé obligatoire en pratique.** La doc dit « The API can be used with or without an API key, although a key is recommended for frequent, automated queries. » La sonde réelle dit autre chose : sans clé, HTTP 429, `quota_limit_value: "0"` sur `defaultPerDayPerProject` (échantillon `echantillons/psi-sans-cle-429.json`). Le plan impose une clé gratuite via la variable d'environnement `PSI_API_KEY`. Sans clé, PERF-01 va dans « Ce que je n'ai pas pu voir » avec la procédure d'obtention.
2. **AI-02 (clé IndexNow) n'est pas vérifiable de l'extérieur.** Le nom du fichier est la clé elle-même (`{your-key}.txt`, 8 à 128 caractères). Impossible à deviner. AI-02 passe au niveau 2 (la clé est connue dans le repo). Au niveau 0 : ligne Info « non vérifiable sans accès ».
3. **AI-03 (présence dans l'index Bing) n'a pas de méthode propre au niveau 0.** Aucune API publique gratuite, le scraping d'une page de résultats est fragile. Reporté au niveau 1 (Bing Webmaster Tools).
4. **REND-01 est ancré officiellement, en Important.** Aucun éditeur IA ne documente le rendu JavaScript. Mais Google écrit : « server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and not all bots can run JavaScript. » L'étude Vercel de décembre 2024 (« none of the major AI crawlers currently render JavaScript ») est citée en appui, étiquetée étude et non doc officielle. Sévérité Important, pas Critique : la source officielle est une recommandation, pas un constat d'exclusion.
5. **SNIP-01 et SNIP-02 sont plus solides que prévu.** La doc `robots-meta-tag` dit, pour `nosnippet` : « This applies to all forms of search results (at Google: web search, Google Images, Discover, AI Overviews, AI Mode) and will also prevent the content from being used as a direct input for AI Overviews and AI Mode. » Critique confirmé, avec citation directe.
6. **IDX-04 (www / apex) reformulé.** Aucune page Google actuelle ne recommande www ou non-www. L'ancrage est la consolidation des doublons : « Use this method when you want to get rid of existing duplicate pages. All permanent redirection methods have the same effect on Google Search » Le check devient : « une seule des deux versions sert du 200, l'autre redirige en permanent ». Important.
7. **`check-sources.ts` doit normaliser avant de comparer.** Simulation sur 12 citations : 8 trouvées telles quelles dans le HTML brut, 4 absentes. Trois des quatre sont de vraies citations qui échouent pour des raisons de forme : apostrophe encodée en entité HTML, `sameAs` entouré d'une balise `<code>`, retour à la ligne dans le texte brut de la RFC. Le script retire les balises, décode les entités, replie les espaces, puis compare. La quatrième est une page d'aide Bing rendue en JavaScript : invérifiable par script.
8. **Les pages d'aide Bing Webmaster sont des SPA.** Trois pages fetchées, aucune ne rend son contenu sans JavaScript. Les checks qui citent Bing s'appuient sur `blogs.bing.com` (rendu serveur, domaine officiel) ; une source marquée `verify: manual` est listée par `check-sources.ts` sans être fetchée.
9. **Bibliothèques validées sur échantillons réels.** `robots-parser` 3.0.1 rend les verdicts attendus sur les quatre robots.txt testés, y compris le cas de précédence lefigaro (`Disallow: /` battu par `Allow: /voyages`). `node-html-parser` 9.0.1 extrait title, lang, meta robots, canonical, h1, og:title, blocs JSON-LD et longueur de texte sur la home du Monde (1 Mo de HTML). `fetch` de Bun 1.4.0 avec `redirect: "manual"` capture la chaîne `301 http://lemonde.fr/ → 200 https://www.lemonde.fr/`.
10. **Nouveauté à garder sous le coude, hors v1.** Lighthouse expose depuis mai 2026 une catégorie `AGENTIC_BROWSING` : « category pertaining to a website's ability to be rendered by an agentic browsing system. » Accessible via la même API PageSpeed. Candidat pour un futur REND-02 outillé par Google lui-même.

## 2. Sources primaires

Toutes vérifiées par `curl -L` depuis cette machine le 2026-08-27 (code HTTP sur l'URL finale). Les dates sont celles affichées par la page.

| Id | URL finale | HTTP | Date page | Sert à |
|---|---|---|---|---|
| G-ROBOTS | https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec | 200 | 2026-07-08 | ROBOTS-* précédence, 4xx, 5xx |
| G-META | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag | 200 | 2026-03-24 | SNIP-01, SNIP-02, SNIP-03 |
| G-AIFEAT | https://developers.google.com/search/docs/appearance/ai-features | 200 | 2025-12-10 | SNIP-*, éligibilité AIO |
| G-AIGUIDE | https://developers.google.com/search/docs/fundamentals/ai-optimization-guide | 200 | non affichée | AI-01 (llms.txt ignoré), REND-01 |
| G-CRAWLERS | https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers | 200 | 2026-07-14 | ROBOTS-03, ROBOTS-04 |
| G-JS | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics | 200 | 2026-03-04 | REND-01 |
| G-SOFT404 | https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors | 200 | 2025-12-18 | IDX-05 |
| G-CANON | https://developers.google.com/search/docs/crawling-indexing/canonicalization | 200 | 2026-08-20 | IDX-02 |
| G-DUP | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls | 200 | 2026-07-10 | IDX-02, IDX-03, IDX-04 |
| G-HTTPS | https://web.dev/enable-https/ | 200 | ancienne | IDX-03 |
| G-DATES | https://developers.google.com/search/docs/appearance/publication-dates | 200 | 2025-12-10 | FRESH-01, FRESH-02 |
| G-SD | https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data | 200 | 2025-12-10 | SD-01 |
| G-ORG | https://developers.google.com/search/docs/appearance/structured-data/organization | 200 | 2026-04-15 | SD-02 |
| G-SITEMAP | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap | 200 | 2026-07-08 | IDX-01, ROBOTS-05 |
| G-PSI | https://developers.google.com/speed/docs/insights/v5/get-started | 200 | 2025-08-28 | PERF-01 |
| G-PSI-ABOUT | https://developers.google.com/speed/docs/insights/v5/about | 200 | 2024-10-21 | PERF-01 (repli origine) |
| G-PSI-DISCO | https://www.googleapis.com/discovery/v1/apis/pagespeedonline/v5/rest | 200 | rev. 20260825 | PERF-01 (schéma de réponse) |
| OAI-BOTS | https://developers.openai.com/api/docs/bots | 200 | non affichée | ROBOTS-02 |
| ANTH-BOTS | https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler | 200 | 2026-04-07 | ROBOTS-02 |
| PPLX-BOTS | https://docs.perplexity.ai/docs/resources/perplexity-crawlers | 200 | non affichée | ROBOTS-02 |
| APPLE-BOTS | https://support.apple.com/en-us/119829 | 200 | 2026-06-08 | ROBOTS-* (contexte) |
| BING-UA | https://blogs.bing.com/webmaster/april-2022/Announcing-user-agent-change-for-Bing-crawler-bingbot | 200 | 2022-04-28 | ROBOTS-03 (token `bingbot`) |
| BING-AIPERF | https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview | 200 | 2026-02-10 | niveau 1, `launch.md` |
| INDEXNOW | https://www.indexnow.org/documentation | 200 | non affichée | AI-02 |
| SITEMAPS | https://www.sitemaps.org/protocol.html | 200 | 2016-11-21 | IDX-01 |
| RFC9309 | https://www.rfc-editor.org/rfc/rfc9309.txt | 200 | 2022-09 | ROBOTS-* précédence, 4xx, 5xx |
| G-TITLE | https://developers.google.com/search/docs/appearance/title-link | 200 | 2025-12-10 | TAG-01, TAG-03 |
| G-SNIPPET | https://developers.google.com/search/docs/appearance/snippet | 200 | 2026-04-20 | TAG-02 |
| W3C-LANG | https://www.w3.org/International/questions/qa-html-language-declarations | 200 | non affichée | TAG-04 |
| WEBDEV-CWV | https://web.dev/articles/vitals | 200 | non affichée | PERF-01 seuils |

Anciennes URL Google (`/search/docs/crawling-indexing/robots/robots_txt`, `/google-common-crawlers`, `/http-network-errors`) redirigent en 301 vers `developers.google.com/crawling/...`. Le plan cite les URL finales.

Non exploitables par script (SPA) : `bing.com/webmasters/help/robots-meta-tags-and-attributes-that-bing-supports-5198d240`, `bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0`, `bing.com/webmasters/help/ai-performance-9f8e7d6c`.

## 3. Citations verbatim par famille

À copier telles quelles dans `references/checks/*.md`. Chaque citation a été retrouvée dans le HTML de la page (après normalisation pour trois d'entre elles, voir section 1.7).

### Bots IA (ROBOTS-02, ROBOTS-03, ROBOTS-04)

| Éditeur | Token | Rôle, verbatim | Source |
|---|---|---|---|
| OpenAI | `GPTBot` | « It is used to crawl content that may be used in training our generative AI foundation models. » | OAI-BOTS |
| OpenAI | `OAI-SearchBot` | « Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers, though can still appear as navigational links. » | OAI-BOTS |
| OpenAI | `ChatGPT-User` | « When users ask ChatGPT or a CustomGPT a question, it may visit a web page with a ChatGPT-User agent. » et « Because these actions are initiated by a user, robots.txt rules may not apply. » | OAI-BOTS |
| OpenAI | indépendance | « a webmaster can allow OAI-SearchBot in order to appear in search results while disallowing GPTBot to indicate that crawled content should not be used for training OpenAI's generative AI foundation models. » | OAI-BOTS |
| Anthropic | `ClaudeBot` | « ClaudeBot helps enhance the utility and safety of our generative AI models by collecting web content that could potentially contribute to their training. » | ANTH-BOTS |
| Anthropic | `Claude-User` | « Claude-User supports Claude AI users. When individuals ask questions to Claude, it may access websites using a Claude-User agent. » | ANTH-BOTS |
| Anthropic | `Claude-SearchBot` | « Claude-SearchBot navigates the web to improve search result quality for users. » | ANTH-BOTS |
| Anthropic | robots.txt | « Anthropic's Bots respect 'do not crawl' signals by honoring industry standard directives in robots.txt. » | ANTH-BOTS |
| Perplexity | `PerplexityBot` | « designed to surface and link websites in search results on Perplexity. It is not used to crawl content for AI foundation models. » | PPLX-BOTS |
| Perplexity | `Perplexity-User` | « Since a user requested the fetch, this fetcher generally ignores robots.txt rules. » | PPLX-BOTS |
| Google | `Google-Extended` | « Google-Extended is a standalone product token that web publishers can use to manage whether content Google crawls from their sites may be used for training future generations of Gemini models » et « Google-Extended does not impact a site's inclusion in Google Search nor is it used as a ranking signal in Google Search. » | G-CRAWLERS |
| Google | `Googlebot` | « Crawling preferences addressed to the Googlebot user agent affect Google Search (including Discover and all Google Search features) » | G-CRAWLERS |
| Bing | `bingbot` | token en minuscules dans la chaîne officielle `bingbot/2.0` | BING-UA |
| Apple | `Applebot-Extended` | « Applebot-Extended does not crawl webpages. » et « Applebot-Extended is only used to determine how to use the data crawled by the Applebot user agent. » | APPLE-BOTS |

Bots dits « de récupération » pour ROBOTS-02 : `OAI-SearchBot`, `ChatGPT-User`, `Claude-User`, `Claude-SearchBot`, `PerplexityBot`, `Perplexity-User`. Bots d'entraînement (bloquables sans perte de visibilité) : `GPTBot`, `ClaudeBot`, `CCBot`, tokens de contrôle `Google-Extended` et `Applebot-Extended`.

Nuance à garder dans le correctif : `ChatGPT-User` et `Perplexity-User` peuvent ignorer robots.txt (verbatim ci-dessus). Les bloquer n'a donc pas d'effet garanti, mais les bloquer par erreur reste un signal d'intention négatif ; le check les traite comme les autres et le rapport porte la nuance.

### Précédence robots.txt (parseur)

- G-ROBOTS : « Google's crawlers determine the correct group of rules by finding in the robots.txt file the group with the most specific user agent that matches the crawler's user agent. »
- G-ROBOTS : « When matching robots.txt rules to URLs, crawlers use the most specific rule based on the length of the rule path. In case of conflicting rules, including those with wildcards, Google uses the least restrictive rule. »
- G-ROBOTS : « Google's crawlers treat all 4xx errors, except 429, as if a valid robots.txt file didn't exist. This means that Google assumes that there are no crawl restrictions. »
- G-ROBOTS, 5xx : « For the first 12 hours, Google stops crawling the site but keeps trying to fetch the robots.txt file. »
- RFC9309 : « Crawlers MUST use case-insensitive matching to find the group that matches the product token » ; « The most specific match found MUST be used. The most specific match is the match that has the most octets. » ; « If an "allow" rule and a "disallow" rule are equivalent, then the "allow" rule SHOULD be used. »
- RFC9309, 5xx : « If the robots.txt file is unreachable due to server or network errors, this means the robots.txt file is undefined and the crawler MUST assume complete disallow. »

Conséquence pour ROBOTS-01 : robots.txt en 404 = Info (aucune restriction, comportement documenté) ; robots.txt en 5xx = Critique (Google arrête de crawler 12 h, la RFC dit disallow complet).

### Snippets et éligibilité AIO (SNIP-01, SNIP-02, SNIP-03)

- G-META, `nosnippet` : « This applies to all forms of search results (at Google: web search, Google Images, Discover, AI Overviews, AI Mode) and will also prevent the content from being used as a direct input for AI Overviews and AI Mode. »
- G-META, `max-snippet` : « This applies to all forms of search results (such as Google web search, Google Images, Discover, Assistant, AI Overviews, AI Mode) and will also limit how much of the content may be used as a direct input for AI Overviews and AI Mode. »
- G-META, `noindex` : « Do not show this page, media, or resource in search results. »
- G-AIFEAT : « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
- G-AIFEAT : « There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary. »

Seuil SNIP-02 : `max-snippet:0` est Critique (équivaut à `nosnippet` pour le texte). Toute autre valeur basse est Important sans seuil chiffré : la doc ne fixe aucun nombre, et le plan n'en invente pas.

### Indexabilité (IDX-01 à IDX-05)

- G-SITEMAP : « All formats limit a single sitemap to 50MB (uncompressed) or 50,000 URLs. » ; « Sitemap: https://example.com/my_sitemap.xml »
- SITEMAPS : « The file itself must be UTF-8 encoded » ; format d'index `<sitemapindex>` avec `<sitemap><loc>`.
- G-DUP : « Use absolute paths rather than relative paths with the rel="canonical" link element. » ; « We recommend adding this same self-referential rel="canonical" link element to the canonical page itself as well. »
- G-DUP : « Google prefers HTTPS pages over equivalent HTTP pages as canonical, except when there are issues or conflicting signals »
- G-DUP : « Use this method when you want to get rid of existing duplicate pages. All permanent redirection methods have the same effect on Google Search »
- G-HTTPS : « Google uses HTTPS as a positive search quality indicator. »
- G-SOFT404 : « A soft 404 error is when a URL that returns a page telling the user that the page does not exist and also a 200 (success) status code. » ; « Such pages are excluded from Search. »

### Données structurées (SD-01, SD-02)

- G-SD : « In general, Google recommends using JSON-LD for structured data if your site's setup allows it »
- G-ORG, `sameAs` : « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »
- Aucune API publique pour le Rich Results Test ni le Schema Markup Validator : SD-01 = JSON parsable + `@context` + `@type` présents ; le rapport donne le lien du Rich Results Test pour la validation manuelle.

### Fraîcheur (FRESH-01, FRESH-02)

- G-DATES : « Specify dates with structured data. We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
- G-DATES, exemples de date visible : « Posted Feb 4, 2019 », « Last updated: Feb 14, 2018 ».

### Rendu (REND-01)

- G-JS : « server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and not all bots can run JavaScript. »
- G-JS : « Once Google's resources allow, a headless Chromium renders the page and executes the JavaScript. »
- Étude, pas doc officielle : Vercel, « The rise of the AI crawler », 2024-12-17 : « The results consistently show that none of the major AI crawlers currently render JavaScript. » Bingbot n'y figure pas ; Microsoft documente que bingbot rend avec Edge (blogs.bing.com, 2019-10-09).

### Performance (PERF-01)

- G-PSI : « The API can be used with or without an API key, although a key is recommended for frequent, automated queries. » Contredit en pratique par l'échantillon 429.
- G-PSI-DISCO : endpoint `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed`, paramètres `url` (requis), `category` (répétable : `PERFORMANCE`, `SEO`, `ACCESSIBILITY`, `BEST_PRACTICES`, `AGENTIC_BROWSING`), `strategy` (`DESKTOP` par défaut, `MOBILE`), `key`.
- Réponse : `loadingExperience.metrics` est une map dont les clés sont `LARGEST_CONTENTFUL_PAINT_MS`, `INTERACTION_TO_NEXT_PAINT`, `CUMULATIVE_LAYOUT_SHIFT_SCORE`, chaque valeur portant `percentile`, `category` (chaîne libre, valeurs observées `FAST`, `AVERAGE`, `SLOW`) ; `loadingExperience.origin_fallback` vaut `true` si les données sont celles de l'origine ; `lighthouseResult.categories.performance.score`.
- G-PSI-ABOUT, repli : « PSI will fall back to origin-level granularity » ; « Sometimes the origin may also have insufficient data, in which case PSI will be unable to show any real-user experience data. »

### Présence IA (AI-01, AI-02)

- G-AIGUIDE : « You don't need to create new machine readable files, AI text files, markup, or Markdown to appear in Google Search » ; « Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them. »
- INDEXNOW : « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. » ; clé de « minimum of 8 and a maximum of 128 hexadecimal characters » (la doc dit hexadécimal puis liste a-z, A-Z, 0-9 et tiret : incohérence citée telle quelle).

## 4. Versions épinglées

| Composant | Version | Date | Licence | Statut |
|---|---|---|---|---|
| bun | 1.4.0 | installé | | runtime et tests |
| robots-parser | 3.0.1 | 2023-02-21 | MIT | retenu, validé sur 4 échantillons réels |
| node-html-parser | 9.0.1 | 2026-07-29 | MIT | retenu, validé sur la home du Monde |
| cheerio | 1.2.0 | 2026-01-23 | MIT | écarté : plus lourd, rien de plus pour ce besoin |

`robots-parser` n'a pas publié depuis 2023 ; le protocole (RFC 9309, septembre 2022) non plus. Comportement vérifié sur échantillons plutôt que sur la date de release.

## 5. Échantillons réels

Tous dans `docs/recherches/echantillons/`, capturés le 2026-08-27.

**PageSpeed sans clé** (`psi-sans-cle-429.json`) : HTTP 429, `"quota_limit_value": "0"`, `"quota_limit": "defaultPerDayPerProject"`, `"reason": "RATE_LIMIT_EXCEEDED"`.

**robots.txt réels** (`robots/*.txt`, 8 fichiers) et verdicts de `robots-parser` (A = autorisé, D = interdit ; première lettre pour `/`, seconde pour `/voyages/paris`) :

| Site | OAI-SearchBot | Claude-User | Claude-SearchBot | PerplexityBot | GPTBot | Googlebot | Google-Extended |
|---|---|---|---|---|---|---|---|
| lemonde.fr | AA | **DD** | **DD** | AA | AA | AA | DD |
| lefigaro.fr | **DA** | **DA** | **DA** | AA | DD | AA | DD |
| leboncoin.fr | AA | AA | AA | AA | AA | AA | AA |
| nytimes.com | **DD** | **DD** | **DD** | **DD** | DD | AA | DD |

Lecture : lemonde.fr bloque les deux bots de récupération d'Anthropic mais laisse OpenAI ; lefigaro.fr bloque à la racine et autorise `/voyages` ; nytimes.com bloque toute récupération IA. Sites candidats pour l'AC-2 : lemonde.fr (français) et nytimes.com. Site témoin « passe » : leboncoin.fr.

**Chaîne de redirections** (sonde `fetch` Bun, `redirect: "manual"`) : `301 http://lemonde.fr/ → 200 https://www.lemonde.fr/`. `https://lemonde.fr/` et `http://www.lemonde.fr/` redirigent aussi en 301 vers `https://www.lemonde.fr/`.

**Soft 404** (`/erom-seo-probe-404-x9q`) : lemonde.fr **200**, mais le corps est une page de challenge anti-bot « Client Challenge » (vu après coup grâce à la sonde `probe-notfound.html` : pas un soft 404, cas « protection » d'IDX-05), leboncoin.fr **403** (protection anti-bot, cas « collecte bloquée » de la spec), doctolib.fr **404** (correct).

**Headers** : `last-modified` présent sur developer.mozilla.org et bun.sh, absent sur doctolib.fr et lemonde.fr. `x-robots-tag` absent partout.

**Extraction HTML, home du Monde** (`sonde-html-fetch.ts`) : title, `lang="fr"`, meta robots `index, follow, noarchive`, canonical `https://www.lemonde.fr`, un h1, og:title, un bloc JSON-LD de type `NewsMediaOrganization`, 41 211 caractères de texte pour 1 008 793 octets de HTML.

**Simulation `check-sources`** : 12 citations, 8 trouvées en brut, 3 trouvées après normalisation (entités, balises, espaces), 1 invérifiable (SPA Bing).

## 6. Incertitudes, à porter telles quelles dans le plan

1. **Quota PageSpeed avec clé : non documenté.** Le « 25 000 par jour » ne vient que d'un fil Google Groups de 2016. Le plan fait un appel par audit et par stratégie (mobile), jamais de rafale, et journalise le code HTTP.
2. **`loadingExperience` absent ou vide sans données CrUX ?** La doc décrit le repli vers l'origine, pas la forme du JSON. Le script traite les deux cas (champ absent, ou `metrics` vide) comme « pas de données terrain ».
3. **Pages d'aide Bing invérifiables par script.** Les checks citent `blogs.bing.com`. Le support par Bing de `nosnippet` reste sans citation officielle accessible : SNIP-* ne cite que Google.
4. **Rendu JavaScript par ClaudeBot : contradiction non résolue** entre l'étude Vercel (non) et une conférence rapportée (« in some cases »). REND-01 ne nomme aucun bot : il cite Google (« not all bots can run JavaScript ») et signale l'étude.
5. **Extension du rapport AI Performance de Bing (16 juin 2026)** connue par la deep research, non re-fetchée ici. Sans incidence sur le chantier 1.
6. **Numéros de section RFC 9309** restitués par l'outil, non recomptés à la main. Le plan cite les phrases, pas les numéros.
7. **`ChatGPT-User` et `Perplexity-User` peuvent ignorer robots.txt.** ROBOTS-02 les inclut avec la nuance dans le texte du rapport.

## 7. Sondes reproductibles

```bash
# PSI sans clé (attendu : 429 tant que la clé n'est pas fournie)
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://developers.google.com/&strategy=mobile" | jq '.error.code'

# robots.txt réels et verdicts du parseur
cd docs/recherches/echantillons && bun add -d robots-parser node-html-parser && bun run sonde-robots-parser.ts

# chaîne de redirections, headers, extraction HTML
bun run sonde-html-fetch.ts

# citation verbatim présente dans une page officielle (exemple)
curl -sL https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag | grep -c "direct input for AI Overviews and AI Mode"
```

## 8. Complément du 2026-08-27, fin de journée : balises, dates, seuils

Quatre pages ajoutées après la première passe, toutes vérifiées par la sonde `sonde-normalize.ts` (11 citations sur 11 retrouvées).

- G-TITLE : « Make sure every page on your site has a title specified in the <title> element. » ; « It's important to have distinct text that describes the content of the page in the <title> element for each page on your site. » ; les « Heading elements, such as <h1> elements » figurent parmi les sources que Google utilise pour fabriquer un title link. Donc TAG-01 (title présent et distinct) Important, TAG-03 devient « un h1 présent » en Mineur : aucune doc n'exige un h1 unique.
- G-SNIPPET : « Create unique descriptions for each page on your site » TAG-02 Mineur.
- G-DATES, en plus des citations de la section 3 : « Ensure that the date (and optional time and timezone) match between the equivalent user-visible and structured values. » et « Label your dates appropriately with text like "Publish" or "Last updated". » FRESH-02 (cohérence des dates) est donc ancré officiellement, en Important.
- W3C-LANG : « Always use a language attribute on the html tag to declare the default language of the text in the page. » TAG-04 Mineur, source W3C.
- WEBDEV-CWV : « LCP should occur within 2.5 seconds of when the page first starts loading » ; « pages should have a INP of 200 milliseconds or less » ; « pages should maintain a CLS of 0.1. or less » ; « a good threshold to measure is the 75th percentile of page loads ». Seuils PERF-01.
- Écarté faute de source admise : les balises Open Graph (protocole Meta, hors liste des domaines), et le « h1 unique ».

**Leçon pour `check-sources.ts`** : une citation peut contenir littéralement `<title>` ou `<h1>`. Le script retire les balises de la page puis décode les entités (la page encode `&lt;title&gt;`), mais ne retire jamais de balises dans la citation. Deux fonctions distinctes, `normalizePage` et `normalizeQuote`, code dans `echantillons/sonde-normalize.ts`.

## 9. Ce que le plan a attrapé en tournant à blanc

Le code du plan a été extrait et exécuté avant livraison (52 tests, `check-sources.ts` en réseau, collecte réelle sur lemonde.fr).

- **Neuf citations sur quarante-neuf n'étaient pas mot pour mot sur la page.** Toutes venaient de résumés (agents de recherche ou WebFetch) que je n'avais pas recontrôlées en brut : point final là où la page continue par une virgule, majuscule initiale absente, guillemets simples au lieu de doubles, fin de phrase tronquée. Corrigées depuis la page. Leçon : une citation n'est verbatim que si un script l'a retrouvée.
- **lemonde.fr sert une page « Client Challenge » en 200** sur ses articles et sur les URL inexistantes. Sans garde-fou, REND-01 y verrait une coquille JavaScript et IDX-05 un soft 404. Le plan ajoute `challenge` aux faits par page et sauvegarde le corps de la sonde 404.
- Le parseur des références ne lisait pas « Sévérité » (deux accents, un seul remplacé). Attrapé par le test de format.

## 10. Complément tardif : brief bibliothèques (agent explore-library-docs, reçu après le plan)

Rapport arrivé après l'écriture du plan, avec ses propres sondes exécutées sur Bun 1.4.0. Il ne change pas le plan ; il en documente deux arbitrages.

**Confirmé.**
- `robots-parser` 3.0.1 : sept scénarios RFC 9309 rejoués par l'agent (groupe spécifique contre `*`, repli vers `*`, règle la plus longue, égalité Allow/Disallow, casse du user-agent, sitemaps, crawl-delay), sept conformes. Le paquet npm date de 2023 mais le dépôt GitHub a été poussé le 2026-08-07. Aucune alternative npm ne fait mieux : `robotstxt-ts-port` n'est pas publié, `robotstxt-util` et `robots-txt-parser` sont inactifs.
- `fetch` de Bun avec `redirect: "manual"` : la Response garde son vrai statut 3xx, `type: "default"`, et `location` brut à résoudre avec `new URL(location, courant)`. Vérifié par l'agent et par la sonde `sonde-html-fetch.ts`, deux fois indépendamment. Non documenté en prose côté Bun : à revérifier à la prochaine montée de version (`src/http/lib.rs`, `src/http_types/FetchRedirect.rs`).

**Arbitrage : node-html-parser retenu contre cheerio.**
L'agent recommande cheerio : sur un `<p>` non fermé juste avant un `<ul>`, node-html-parser fait fuir le texte du paragraphe dans le premier `<li>`, cheerio ferme le paragraphe comme HTML5 le prescrit. Sur HTML propre, extraction identique.
Battu : cheerio. Perdu parce qu'aucun champ extrait par le plan n'est sensible à cette fuite : title, meta, canonical, h1, JSON-LD et `lang` sont identiques dans les deux, et `textChars` est une longueur totale de texte, insensible à la frontière de paragraphe. cheerio coûte 11 dépendances transitives et 50 % d'octets en plus pour rien ici. À rouvrir le jour où une vérification lira le texte d'un élément précis (un « premier paragraphe », par exemple).

**Risque résiduel noté.** Issue GitHub #41 de robots-parser (juillet 2025, ouverte) : `isDisallowed()` pourrait rendre `true` sans règle correspondante dans un cas précis. Le plan n'appelle que `isAllowed()`.
