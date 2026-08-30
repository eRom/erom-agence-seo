# Les trois niveaux d'audit

| Niveau | Entrée | Ce qu'on voit | Ce qu'on ne voit pas |
|---|---|---|---|
| 0 | L'URL seule | robots.txt, sitemaps, llms.txt, pages et headers, sondes (http, www, 404), PageSpeed si clé | données réelles de trafic et de citation, indexation effective, conformité à une stratégie |
| 1 | URL + accès Search Console et Bing Webmaster Tools | état d'indexation, canonical retenu par Google, requêtes réelles, présence dans l'index Bing | impressions et citations dans les fonctionnalités IA, conformité à une stratégie |
| 2 | Le code, lancé en local | tout le niveau 0 sur localhost, sitemap de production ramené en local | PageSpeed, sondes http et www (non applicables en local), le trafic réel (niveau 1) |

LVL1-01 (impressions dans les fonctionnalités IA) et LVL1-02 (citations Copilot) ne sont pas livrés : ces deux rapports ne sont dans aucune API (l'API Search Console refuse le type `GENERATIVE_AI`, mesuré le 30/08) et leur export n'est ouvert qu'à une partie des propriétés. Ils reviendront en import de fichier quand une propriété cliente les aura. Voir la spec du 30/08, section 11.7.

**Couche stratégique**, indépendante du niveau : dès que `seo/strategy.md` existe sous le répertoire courant et s'analyse, STRAT-01 à STRAT-05 et AI-02 s'ajoutent aux vérifications du niveau (STRAT-05 seulement au niveau 1, qui seul porte des requêtes réelles). Sans stratégie, elles sont nommées dans « Ce que je n'ai pas pu voir ».

## Vérifications par niveau

Niveau 0 : ROBOTS-01 à ROBOTS-06, SNIP-01 à SNIP-03, IDX-01 à IDX-05, SD-01 à SD-03, TAG-01 à TAG-04, FRESH-01, FRESH-02, REND-01, PERF-01 (avec clé), AI-01.

Niveau 1 :
- IDX-06 pages indexées par Google (Search Console)
- IDX-07 canonical retenu par Google différent de celui déclaré (Search Console)
- AI-03 présence dans l'index Bing (Bing Webmaster Tools)

Couche stratégique (chantiers 2 et 5) :
- STRAT-01 chaque page de strategy.md existe et vise son mot-clé (title, h1, ouverture)
- STRAT-02 la phrase d'identité est sur la home et dans Organization
- STRAT-03 les sameAs prévus sont en place
- STRAT-04 la cadence de fraîcheur est respectée par type de page
- STRAT-05 les requêtes réelles contre le mot-clé visé, niveau 1 seulement (Search Console, 90 derniers jours)
- AI-02 clé IndexNow déposée

## Ce que le rapport écrit dans « Ce que je n'ai pas pu voir »

Au niveau 0 sans stratégie : la liste ci-dessus du niveau 1 et de la couche stratégique, chaque ligne avec son id et son nom, plus PERF-01 si la clé PageSpeed manque, plus toute vérification du niveau exécuté qui n'a pas pu être évaluée sur cette collecte précise (par exemple : toutes les pages de contenu derrière une protection anti-bot, aucun bloc JSON-LD de type page trouvé), avec son id et sa raison en une phrase courte. Aucune vérification du niveau exécuté ni de la couche stratégique active ne doit rester absente des trois sections du rapport (Trouvailles, Vérifications passées, Ce que je n'ai pas pu voir).
