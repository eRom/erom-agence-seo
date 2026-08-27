---
name: audit
description: Audit SEO et GEO d'un site à partir de son URL (niveau 0) ou de son code lancé en local (niveau 2). Collecte reproductible dans seo/audits/<date>-n<niveau>/, vérifications ancrées sur la documentation officielle des moteurs, rapport Markdown en français. Triggers : '/erom-seo:audit <url>', 'audite le SEO de', 'audit GEO', 'est-ce que ce site est visible dans ChatGPT / les AI Overviews', 'vérifie le robots.txt de'.
argument-hint: "<url> [--max-pages N] [--page <url>]..."
---

# Audit SEO/GEO, niveau 0 et 2

Tu produis un audit défendable : chaque trouvaille cite une preuve dans la collecte et une source officielle. Tu n'inventes jamais une trouvaille sans preuve dans `raw/` ou `derived/`, et tu ne modifies jamais `raw/`.

## 0. Préparer

1. URL de base : l'argument, ou demander. Ajouter `https://` s'il manque.
2. Niveau : 2 si l'URL est `localhost` ou `127.0.0.1` et que `seo/strategy.md` existe ; sinon 0.
3. Dossier : `seo/audits/<YYYY-MM-DD>-n<niveau>/` sous le répertoire courant. S'il existe déjà, suffixe `-2`, `-3`. Ne jamais écraser.
4. Scripts : ils sont dans le dossier `scripts/` à côté de ce fichier (`${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/`). Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
5. Clé PageSpeed : si `PSI_API_KEY` est absente de l'environnement, le dire une fois à l'utilisateur ; l'audit continue sans PERF-01.

## 1. Collecter

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/collect.ts <url> --out <dossier> --max-pages 10 [--page <url>]... [--level 0|2]
```

Sortie attendue : `collecte terminée : N pages, robots.txt <code>, ...`. Si la collecte échoue (site injoignable, 403 partout), écrire un `report.md` court qui le dit, avec `raw/manifest.json` en annexe, et s'arrêter : pas de trouvailles inventées.

## 2. Vérifier

Lire dans l'ordre : `raw/manifest.json`, `derived/robots-eval.json`, `derived/pages.json`, `derived/psi.json`. Ouvrir `raw/robots.txt` et `raw/pages/*.html` seulement pour citer une preuve avec ses lignes.

Pages avec `challenge: true` dans `derived/pages.json` : les exclure des vérifications par page, et écrire une ligne Info dans le rapport : « N pages servies derrière une protection anti-bot au user-agent erom-seo-audit ; ce que voit un bot inconnu est probablement ce que voient les bots IA ». Jamais une trouvaille REND-01 sur ces pages.

Puis parcourir chaque fichier de `references/checks/` (robots, snippets, indexability, structured-data, tags, freshness, rendering, performance, ai-presence). Pour chaque bloc `### ID : titre` :
- Niveau du bloc supérieur au niveau exécuté : le noter dans « Ce que je n'ai pas pu voir » avec son id et son titre.
- Sinon, appliquer `Comment` sur les JSON : passé, ou trouvaille avec la sévérité indiquée (SNIP-02 et TAG-03 ont deux sévérités possibles, `Comment` dit laquelle).
- Une trouvaille reprend `Source` telle quelle (URL et citation), `Correctif`, `Effort`, et une `Preuve` précise.

## 3. Rapporter

Écrire `<dossier>/report.md` d'après `references/report-template.md`, en respectant ses règles d'écriture. Le tableau d'annexe se construit depuis `raw/manifest.json`. La liste des vérifications non vues vient de `references/levels.md`.

Contrôle avant de rendre : `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/lint-report.ts <dossier>/report.md` doit sortir 0. Sinon corriger le rapport.

## 4. Restituer

Afficher le chemin du rapport, le compte par sévérité, et « Les trois choses à dire en RDV ». Proposer le niveau suivant : les accès Search Console et Bing (niveau 1) ou le code (niveau 2).
