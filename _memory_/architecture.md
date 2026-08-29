# Architecture (mis à jour le 2026-08-29)

**Type.** Plugin Claude Code `erom-seo` (dossier `plugin/`) pour l'agence : audit, stratégie, build et lancement SEO/GEO sans abonnement tiers, sites propres et clients. Le repo héberge aussi les dossiers clients (`clients/<domaine>/seo/`, non suivis) et la documentation de conception.

**Stack.** Bun 1.4, TypeScript, `bun:test`, `node-html-parser`, `robots-parser`. Aucune autre dépendance. Une skill = `SKILL.md` (procédure en prose pour Claude) + `scripts/` bun + `references/` Markdown strict lus par des parseurs.

**Arborescence utile.**
```
plugin/
  .claude-plugin/plugin.json      manifeste, skills: ./skills/
  lib/strategy.ts                 contrat de seo/strategy.md (parseur, lint, règle des mots)
  lib/report.ts                   contrat de report.md (parseur, dernier audit)
  skills/audit/                   collect.ts, strategy-eval.ts, lint-report.ts, check-sources.ts, references/checks/*.md
  skills/strategy/                interview, keywords.ts (Bing, Wikimedia), lint-strategy.ts, gabarit
  skills/build/                   plan.ts, recettes Next.js par id, SKILL six temps
docs/superpowers/specs/           spec mère (D1 à D8), chantier 2 (D9 à D15), chantier 3 (D16 à D22)
docs/superpowers/plans/           plans avec code inclus, recettes AC par chantier
docs/recherches/                  mots-clés gratuits (Bing, Wikimedia), API SEO Next.js 16
.claude/notes/                    note de reprise (état, parqué, calendrier, commandes)
```

**Le dossier `seo/` au centre (D1).** Un dossier par site, quatre verbes dessus : `strategy` écrit `seo/strategy.md` (le contrat, Markdown strict) ; `audit` écrit `seo/audits/<date>-n<niveau>/` (raw/ octets exacts, derived/ JSON, report.md) ; `build` lit les deux, écrit `derived/build-plan.json`, corrige le code du site un commit par trouvaille, relance l'audit niveau 2 en boucle ; `launch` (chantier 4, à venir) écrira `seo/launch.md`.

**Partage script / modèle.** Les scripts font le déterministe (collecte réseau, évaluation stratégique, plan de build, lints) ; Claude fait le jugement (rapport, textes, modifications de code). La logique pure vit dans `scripts/lib/` sans réseau ni disque ; les CLI dans `scripts/` avec `import.meta.main`.

**Flux principal.** `collect.ts <url>` → `raw/` + `derived/pages.json`, `robots-eval.json`, `psi.json` ; `strategy-eval.ts` → `derived/strategy-eval.json` ; Claude écrit `report.md` selon `references/checks/*.md` et `report-template.md` ; `lint-report.ts` le refuse s'il dérive. `plan.ts` joint stratégie + rapport + dérivés → `build-plan.json` (trouvailles classées code / texte / hors build, valeurs par page, bloc Organization, base canonique observée) ; quand le rapport de départ n'est pas un niveau 0, il rapatrie aussi les hors build ouverts du dernier audit niveau 0 (champ `origine`), sinon IDX-03, IDX-04 et PERF-01 disparaissent du plan (R-6, 29/08).

**Niveaux et couche.** Niveau 0 = URL seule ; niveau 2 = site en local (`localhost`, sitemap de prod ramené en local, PageSpeed et sondes d'hôte non applicables) ; niveau 1 (Search Console, Bing) = chantier 5. Couche stratégique (STRAT-01 à 04, AI-02) active dès que `seo/strategy.md` existe, à tout niveau (D9).

**Dépendances externes.** PageSpeed Insights (`PSI_API_KEY`), Bing Webmaster JSON `GetKeywordStats` (`BING_WMT_API_KEY`), Wikimedia Pageviews, IndexNow ; documentation officielle des moteurs, de Next.js et de Vercel pour les citations, vérifiées par `check-sources.ts` (80 au 28/08).
