# erom-seo

Plugin Claude Code de l'agence : audit, stratégie, build et lancement SEO/GEO sans abonnement tiers. Chaque vérification cite la documentation officielle du moteur concerné, avec sa citation mot pour mot.

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

## Vérifier que les références n'ont pas dérivé

```bash
cd plugin && bun skills/audit/scripts/check-sources.ts
```

Chaque citation des références doit être retrouvée sur sa page officielle. Une citation absente se corrige depuis la page, jamais en l'assouplissant.

## Tests

```bash
cd plugin && bun test
```

## Attribution

La matière de départ de plusieurs références vient du dépôt [marketingskills](https://github.com/coreyhaines31/marketingskills) de Corey Haines, sous licence MIT, Copyright (c) 2025 Corey Haines. Les vérifications de ce plugin en diffèrent : chacune est réécrite et ancrée sur une source officielle, et une erreur connue de l'amont (Google-Extended présenté comme le bot des AI Overviews) y est corrigée.

## Licence

MIT.
