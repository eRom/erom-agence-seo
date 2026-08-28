---
name: audit
description: Audit SEO et GEO d'un site à partir de son URL (niveau 0) ou de son code lancé en local (niveau 2). Collecte reproductible dans seo/audits/<date>-n<niveau>/, vérifications ancrées sur la documentation officielle des moteurs, rapport Markdown en français. Triggers : '/erom-seo:audit <url>', 'audite le SEO de', 'audit GEO', 'est-ce que ce site est visible dans ChatGPT / les AI Overviews', 'vérifie le robots.txt de'.
argument-hint: "<url> [--max-pages N] [--page <url>]..."
---

# Audit SEO/GEO, niveau 0 et 2

Tu produis un audit défendable : chaque trouvaille cite une preuve dans la collecte et une source officielle. Tu n'inventes jamais une trouvaille sans preuve dans `raw/` ou `derived/`, et tu ne modifies jamais `raw/`.

## 0. Préparer

1. URL de base : l'argument, ou demander. Ajouter `https://` s'il manque.
2. Niveau : 2 si l'hôte est `localhost` ou `127.0.0.1`, sinon 0. Couche stratégique : active si `seo/strategy.md` existe sous le répertoire courant ; `collect.ts` le lit et le manifeste porte `strategy` (avec `error` s'il est inanalysable : le dire dans le rapport, la couche ne tourne pas).
3. Dossier : ne pas le calculer soi-même. `collect.ts` (étape 1) réserve lui-même `seo/audits/<YYYY-MM-DD>-n<niveau>/` sous le répertoire courant, de façon atomique (suffixe `-2`, `-3`… si besoin, jamais d'écrasement), et imprime le chemin retenu sur la première ligne de sa sortie.
4. Scripts : ils sont dans le dossier `scripts/` à côté de ce fichier (`${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/`). Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
5. Clé PageSpeed : si `PSI_API_KEY` est absente de l'environnement, le dire une fois à l'utilisateur ; l'audit continue sans PERF-01.

## 1. Collecter

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/collect.ts <url> --max-pages 10 [--page <url>]... [--level 0|2]
```

Ne pas passer `--out` : `collect.ts` réserve lui-même le dossier (voir étape 0.3) et l'imprime sur la première ligne de sa sortie, par exemple `dossier : seo/audits/2026-08-27-n0-3`. Lire cette ligne et utiliser ce chemin pour la suite (écrire `report.md` dedans, étape 3). `--out <dossier>` reste disponible pour forcer un chemin précis en cas de besoin exceptionnel, mais n'est plus nécessaire en usage normal.

Sortie attendue : `dossier : <chemin>` en première ligne, puis `collecte terminée : N pages, robots.txt <code>, ...`. Si la collecte échoue (site injoignable, 403 partout), écrire un `report.md` court qui le dit, avec `raw/manifest.json` en annexe, et s'arrêter : pas de trouvailles inventées.

Si la collecte écrit sur la sortie d'erreur `attention : N URL(s) du sitemap ignorées, hors site : <hôtes>`, le rapport le dit en une ligne Info dans « Ce que je n'ai pas pu voir », avec les hôtes et le compte, preuve `raw/manifest.json` champ `sitemapUrls`. Pas de nouveau check : c'est une limite de la collecte, pas une vérification.

Si `raw/manifest.json` porte `strategy` sans `error` : `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/strategy-eval.ts <dossier>` (option `--strategy <chemin>` si le fichier n'est pas `seo/strategy.md`). Sortie attendue : `évaluation stratégique : …`.

## 2. Vérifier

Lire dans l'ordre : `raw/manifest.json`, `derived/robots-eval.json`, `derived/pages.json`, `derived/psi.json`, `derived/strategy-eval.json`. Ouvrir `raw/robots.txt` et `raw/pages/*.html` seulement pour citer une preuve avec ses lignes.

Pages avec `challenge: true` dans `derived/pages.json` : les exclure des vérifications par page, et écrire une ligne Info dans le rapport : « N pages servies derrière une protection anti-bot au user-agent erom-seo-audit ; ce que voit un bot inconnu est probablement ce que voient les bots IA ». Jamais une trouvaille REND-01 sur ces pages.

Puis parcourir chaque fichier de `references/checks/` (robots, snippets, indexability, structured-data, tags, freshness, rendering, performance, ai-presence, strategy). Pour chaque bloc `### ID : titre` :
- Couche stratégique et couche inactive : le noter dans « Ce que je n'ai pas pu voir » avec son id, son titre et la raison (« pas de seo/strategy.md » ou « seo/strategy.md inanalysable : … »), sans même regarder `Comment`.
- Niveau du bloc supérieur au niveau exécuté : le noter dans « Ce que je n'ai pas pu voir » avec son id et son titre.
- Sinon, appliquer `Comment` sur les JSON : passé, ou trouvaille avec la sévérité indiquée (SNIP-02 et TAG-03 ont deux sévérités possibles, `Comment` dit laquelle).
- Sinon, si le check ne peut tout simplement pas être évalué sur cette collecte précise (par exemple : aucune page de contenu auditable derrière une protection anti-bot, aucun bloc JSON-LD de type page trouvé) : le noter aussi dans « Ce que je n'ai pas pu voir », avec son id, son titre et la raison précise en une phrase courte.
- Une trouvaille reprend `Source` telle quelle (URL et citation), `Correctif`, `Effort`, et une `Preuve` précise.

Règle stricte : chaque vérification du niveau exécuté, plus les cinq de la couche stratégique si active, apparaît exactement une fois dans le rapport final, sous une seule des trois formes trouvaille, passée, ou non vue avec sa raison. Aucune vérification ne disparaît silencieusement. `lint-report.ts` (étape 3) fait respecter cette règle mécaniquement et échoue si un id manque, apparaît deux fois, ou apparaît hors du périmètre du rapport (couche inactive ou niveau supérieur).

## 3. Rapporter

Écrire `<dossier>/report.md` d'après `references/report-template.md`, en respectant ses règles d'écriture. L'en-tête porte « Couche stratégique : oui/non » (avec le fichier, le statut et la date si oui). Le tableau d'annexe se construit depuis `raw/manifest.json`. Pour la liste des vérifications non vues : le niveau 1 et, si la couche est inactive, la couche stratégique viennent de `references/levels.md` ; les vérifications du niveau exécuté non évaluables sur cette collecte précise viennent de ce qui a été constaté à l'étape 2.

Contrôle avant de rendre : `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/lint-report.ts <dossier>/report.md` doit sortir 0. Sinon corriger le rapport.

## 4. Restituer

Afficher le chemin du rapport, le compte par sévérité, et « Les trois choses à dire en RDV ». Proposer le niveau suivant : les accès Search Console et Bing (niveau 1) ou le code (niveau 2). Sans `seo/strategy.md` : proposer `/erom-seo:strategy`. Avec une stratégie en brouillon : le dire.
