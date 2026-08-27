# Les trois niveaux d'audit

| Niveau | Entrée | Ce qu'on voit | Ce qu'on ne voit pas |
|---|---|---|---|
| 0 | L'URL seule | robots.txt, sitemaps, llms.txt, pages et headers, sondes (http, www, 404), PageSpeed si clé | données réelles de trafic et de citation, indexation effective, conformité à une stratégie |
| 1 | URL + accès Search Console et Bing Webmaster Tools | impressions dans les fonctionnalités IA (rapport Generative AI performance), citations et Citation Share (rapport AI Performance de Bing), état d'indexation, requêtes | conformité à une stratégie |
| 2 | Le code, lancé en local, + seo/strategy.md | tout le niveau 0 sur localhost, plus les vérifications stratégiques et AI-02 | le trafic réel (niveau 1) |

## Vérifications par niveau

Niveau 0 : ROBOTS-01 à ROBOTS-06, SNIP-01 à SNIP-03, IDX-01 à IDX-05, SD-01 à SD-03, TAG-01 à TAG-04, FRESH-01, FRESH-02, REND-01, PERF-01 (avec clé), AI-01.

Niveau 1, à livrer au chantier 5 :
- LVL1-01 impressions dans les AI Overviews et l'AI Mode (Search Console, rapport Generative AI performance)
- LVL1-02 citations et part de citation dans Copilot et Bing (Bing Webmaster Tools, rapport AI Performance)
- LVL1-03 pages indexées contre pages du sitemap (Search Console)
- AI-03 présence dans l'index Bing

Niveau 2, à livrer au chantier 2 :
- STRAT-01 chaque page de strategy.md existe et vise son mot-clé (title, h1, ouverture)
- STRAT-02 la phrase d'identité est sur la home et dans Organization
- STRAT-03 les sameAs prévus sont en place
- STRAT-04 la cadence de fraîcheur est respectée par type de page
- AI-02 clé IndexNow déposée

## Ce que le rapport écrit dans « Ce que je n'ai pas pu voir »

Au niveau 0 : la liste ci-dessus des niveaux 1 et 2, chaque ligne avec son id et son nom, plus PERF-01 si la clé PageSpeed manque.
