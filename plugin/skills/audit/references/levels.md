# Les trois niveaux d'audit

| Niveau | Entrée | Ce qu'on voit | Ce qu'on ne voit pas |
|---|---|---|---|
| 0 | L'URL seule | robots.txt, sitemaps, llms.txt, pages et headers, sondes (http, www, 404), PageSpeed si clé | données réelles de trafic et de citation, indexation effective, conformité à une stratégie |
| 1 | URL + accès Search Console et Bing Webmaster Tools | impressions dans les fonctionnalités IA (rapport Generative AI performance), citations et Citation Share (rapport AI Performance de Bing), état d'indexation, requêtes | conformité à une stratégie |
| 2 | Le code, lancé en local | tout le niveau 0 sur localhost, sitemap de production ramené en local | PageSpeed, sondes http et www (non applicables en local), le trafic réel (niveau 1) |

**Couche stratégique**, indépendante du niveau : dès que `seo/strategy.md` existe sous le répertoire courant et s'analyse, STRAT-01 à STRAT-04 et AI-02 s'ajoutent aux vérifications du niveau. Sans stratégie, elles sont nommées dans « Ce que je n'ai pas pu voir ».

## Vérifications par niveau

Niveau 0 : ROBOTS-01 à ROBOTS-06, SNIP-01 à SNIP-03, IDX-01 à IDX-05, SD-01 à SD-03, TAG-01 à TAG-04, FRESH-01, FRESH-02, REND-01, PERF-01 (avec clé), AI-01.

Niveau 1, à livrer au chantier 5 :
- LVL1-01 impressions dans les AI Overviews et l'AI Mode (Search Console, rapport Generative AI performance)
- LVL1-02 citations et part de citation dans Copilot et Bing (Bing Webmaster Tools, rapport AI Performance)
- LVL1-03 pages indexées contre pages du sitemap (Search Console)
- AI-03 présence dans l'index Bing

Couche stratégique (chantier 2) :
- STRAT-01 chaque page de strategy.md existe et vise son mot-clé (title, h1, ouverture)
- STRAT-02 la phrase d'identité est sur la home et dans Organization
- STRAT-03 les sameAs prévus sont en place
- STRAT-04 la cadence de fraîcheur est respectée par type de page
- AI-02 clé IndexNow déposée

## Ce que le rapport écrit dans « Ce que je n'ai pas pu voir »

Au niveau 0 sans stratégie : la liste ci-dessus du niveau 1 et de la couche stratégique, chaque ligne avec son id et son nom, plus PERF-01 si la clé PageSpeed manque, plus toute vérification du niveau exécuté qui n'a pas pu être évaluée sur cette collecte précise (par exemple : toutes les pages de contenu derrière une protection anti-bot, aucun bloc JSON-LD de type page trouvé), avec son id et sa raison en une phrase courte. Aucune vérification du niveau exécuté ni de la couche stratégique active ne doit rester absente des trois sections du rapport (Trouvailles, Vérifications passées, Ce que je n'ai pas pu voir).
