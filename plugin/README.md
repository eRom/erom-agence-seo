# erom-seo

Plugin Claude Code de l'agence : audit, stratégie, build, checklist de déploiement, consoles (lecture et soumission aux moteurs) et rapport client SEO/GEO sans abonnement tiers. Chaque vérification cite la documentation officielle du moteur concerné, avec sa citation mot pour mot.

## Charger le plugin en local

```bash
claude --plugin-dir /chemin/vers/erom-agence-seo/plugin
```

Première fois : `cd plugin && bun install`.

## Auditer un site

Depuis le dossier du client (S1) ou le repo du site (S2) :

```
/erom-seo:audit https://acme.fr
```

Sortie : `seo/audits/<date>-n0/report.md`, avec la collecte brute dans `raw/` et les faits dérivés dans `derived/`.

Clé PageSpeed (gratuite, facultative) : `export PSI_API_KEY=...` avant de lancer Claude. Sans elle, la vérification PERF-01 est reportée.

## Écrire la stratégie

Depuis le même dossier, une interview d'une question à la fois :

```
/erom-seo:strategy
```

Sortie : `seo/strategy.md` (le contrat, lisible par le client) et `seo/strategy/<date>/` (réponses brutes de Bing et de Wikipédia, `derived/keywords.json`). Clé Bing Webmaster Tools, gratuite : `export BING_WMT_API_KEY=...`. Sans elle, les mots-clés sont « non interrogé ».

Dès que `seo/strategy.md` existe, l'audit ajoute la couche stratégique (STRAT-01 à STRAT-04, AI-02), à tout niveau. Site lancé en local : `/erom-seo:audit http://localhost:3000` fait un audit de niveau 2.

## Construire

Depuis le repo du site, avec `seo/strategy.md` et un audit :

```
/erom-seo:build
```

Build propose les textes (title, description, h1, ouverture) de chaque page en défaut, attend le OK, corrige le code une trouvaille par commit (`seo(ID): …`), lance le site en local, refait un audit de niveau 2, et recommence une fois si besoin. Terminé quand l'audit n'a plus ni Critique ni Important. Ce qui n'est pas dans le code (redirection chez l'hébergeur, performance) est listé à la fin avec l'endroit où agir. Next.js App Router d'abord ; autre stack : Claude lit le repo et vise le même HTML.

## Vérifier avant et après le déploiement

Depuis le repo du site, avec `seo/strategy.md` et un build fusionné :

```
/erom-seo:checklist
```

Sortie : `seo/checklist.md`, quinze cases en deux moitiés. Avant le déploiement : audit niveau 2 vert, branche fusionnée, hors build, Search Console et Bing Webmaster Tools créés, ancien sitemap sauvegardé si le site en remplace un. Après (la skill demande « c'est déployé ? » et la date) : un audit niveau 0 refait sur la prod, les redirections de l'ancien site, le ping IndexNow et le sitemap chez Bing (envoyés seulement après un OK explicite), puis les jalons J+1, J+3, J+7, J+30, J+90 avec, pour chacun, le chemin de clics. Les cases `auto` suivent les audits et git ; les cases `main` sont cochées à la main et ne sont jamais décochées. Relancer la skill quand on veut : elle dit ce qui est dû. Elle ne déploie rien.

## Lire les consoles, et soumettre aux moteurs

Sans ouvrir un onglet :

```
/erom-seo:console sites
/erom-seo:console inspect https://acme.fr/page
/erom-seo:console crawl
/erom-seo:console update
```

`sites` liste les propriétés Search Console et les sites Bing visibles par le compte, avec accès et sitemaps. `inspect <url>` donne l'état d'indexation Google (verdict, couverture, canonical retenu) et ce que Bing sait de cette URL. `crawl` donne les statistiques et erreurs de crawl côté Bing. Ces trois commandes n'écrivent rien.

`update` est la quatrième, et la seule qui écrive chez un tiers : elle soumet le sitemap à Google et à Bing, et poste les URL à IndexNow. Elle sonde d'abord le `robots.txt` en suivant les redirections, ce qui donne l'origine réellement servie et les sitemaps déclarés, puis lance les trois soumissions isolément, l'échec de l'une n'arrêtant pas les autres. Deux options : `--dry-run` joue toutes les lectures et n'envoie rien, `--url <u>` (répétable) poste ces pages seules sans toucher aux sitemaps. Google exige pour cela le scope d'écriture `https://www.googleapis.com/auth/webmasters` ; si le jeton ne l'a pas, la sortie donne la commande `gcloud` qui répare (`skills/console/references/acces.md`, ACC-07).

Clés : `GSC_QUOTA_PROJECT` ou `GSC_SA_KEY_FILE` pour Google, `BING_WMT_API_KEY` pour Bing (`skills/console/references/acces.md` détaille les accès). Sans clé Bing, la moitié Bing répond « non interrogé » ; sans jeton Google, c'est la consigne de connexion qui sort à sa place.

Les soumissions du plugin vivent à un seul endroit du code, avec deux appelants et deux seulement : `console update`, le geste répétable après une publication, et `/erom-seo:checklist --agir`, le rituel de mise en ligne qui garde son état sur disque. Pour une preuve datée, c'est `/erom-seo:audit`.

## Livrer au client

Depuis le dossier qui contient un audit déjà sur disque :

```
/erom-seo:rapport
```

Sans argument, le dernier audit sous `seo/audits/` est repris. La skill lit `report.md`, choisit une seule action à faire dans la semaine et reformule les trouvailles Critique et Important sans jargon, puis écrit `rapport-client.md` et le lint avant de le rendre. Deux gestes composent le flux : `rapport.ts --preparer` sort la matière du jugement sans rien écrire, `rapport.ts --rendre` lint le Markdown et n'écrit `rapport-client.html` que si le lint passe. Après une correction manuelle du Markdown, `rapport.ts --rendre-seul <dossier>` refait le HTML seul.

Le fichier produit est autonome : polices et styles embarqués, aucune requête réseau à l'ouverture. Il s'envoie en pièce jointe, s'ouvre d'un double-clic et s'imprime proprement en PDF par Cmd+P.

## Vérifier que les références n'ont pas dérivé

```bash
cd plugin && bun skills/audit/scripts/check-sources.ts
```

Chaque citation des références (vérifications de l'audit et recettes de build) doit être retrouvée sur sa page officielle. Une citation absente se corrige depuis la page, jamais en l'assouplissant.

## Tests

```bash
cd plugin && bun test
```

## Attribution

La matière de départ de plusieurs références vient du dépôt [marketingskills](https://github.com/coreyhaines31/marketingskills) de Corey Haines, sous licence MIT, Copyright (c) 2025 Corey Haines. Les vérifications de ce plugin en diffèrent : chacune est réécrite et ancrée sur une source officielle, et une erreur connue de l'amont (Google-Extended présenté comme le bot des AI Overviews) y est corrigée.

## Licence

MIT.
