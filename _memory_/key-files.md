# Fichiers clés (mis à jour le 2026-08-28)

**Contrats partagés (`plugin/lib/`)**
- `lib/strategy.ts` : `parseStrategy`, `lintStrategy`, `normalizeText`, `keywordMatches`, `cadenceDays`, `INDEXNOW_KEY` ; le format strict de `seo/strategy.md`.
- `lib/report.ts` : `parseReport`, `latestAuditDir`, `sortAuditDirs`, `ReportError` ; le format de `report.md`, réutilisé par `build` puis `launch`.
- `lib/tests/fixtures/` : `strategy-valide.ts` (VALID), `report-chico-n0.md` (vrai rapport du 28/08).

**Audit (`plugin/skills/audit/`)**
- `SKILL.md` : la procédure (préparer, collecter, vérifier, rapporter, restituer).
- `scripts/collect.ts` : collecte réseau, réserve `seo/audits/<date>-n<niveau>/` atomiquement, `--strategy-path`, niveau 2.
- `scripts/strategy-eval.ts` + `lib/strategy-eval.ts` : compare stratégie et faits, `pathOf`, `normalizeUrl`, `parseDateLoose`.
- `scripts/lint-report.ts` : invariant R-1 (chaque vérification exactement une fois), en-tête (niveau, couche, nb vérifications), em dash.
- `scripts/check-sources.ts` : retrouve chaque citation sur sa page (checks et recettes de build).
- `lib/{page,sitemap,robots,fetch,psi,checks,normalize,types}.ts` : faits par page, sitemaps (`sameSite`, `rewriteToOrigin`), robots, fetch avec chaîne de redirections, PSI, parseur des checks, normalisation, types (`Manifest`, `PageFacts`).
- `references/checks/*.md` : 31 vérifications (id, couche, niveau, sévérité, Comment, Source verbatim, Correctif, Effort). `report-template.md`, `levels.md`.
- `tests/fixtures/site.ts` : site jouet `Bun.serve` (options `homeInSitemap`, `prodHost`, `prodSitemaps`, `indexnowKey`).

**Stratégie (`plugin/skills/strategy/`)**
- `SKILL.md` : interview en neuf étapes, une question par message.
- `scripts/keywords.ts` + `lib/keywords.ts` : Bing + Wikimedia, réponses brutes datées, `assertNoSecret`.
- `scripts/lint-strategy.ts`, `references/strategy-template.md`.

**Build (`plugin/skills/build/`)**
- `SKILL.md` : six temps (préparer, planifier, valider les textes, appliquer, vérifier, boucler, restituer).
- `scripts/plan.ts` + `lib/plan.ts` : `buildPlan`, `KINDS` (genre par id), `planSummary`, `derived/build-plan.json`.
- `lib/recipes.ts` : `parseRecipes`, `BUILD_DOMAINS`.
- `references/nextjs.md` : 13 recettes Next.js 16 par famille d'ids, pièges transverses, 23 citations ; `references/autre-stack.md`.
- `tests/fixtures/chico/` : strategy.md, report.md, manifest.json, pages.json, strategy-eval.json du 28/08.

**Documentation**
- Specs : `docs/superpowers/specs/2026-08-27-erom-seo-design.md` (mère), `2026-08-28-erom-seo-strategy-design.md`, `2026-08-28-erom-seo-build-design.md`.
- Plans et recettes : `docs/superpowers/plans/2026-08-28-erom-seo-chantier-{2-strategy,2-recette,3-build,3-recette}.md`.
- Recherches : `docs/recherches/2026-08-27-mots-cles-gratuits.md` (sondes Bing reproductibles), `2026-08-28-nextjs-16-seo-api.md`.
- Reprise : `.claude/notes/2026-08-27-reprise-2120.md` (lire en premier).

**Hors repo**
- Cobaye : `/Users/recarnot/dev/chico-happiness` (commentchercherbonheur.org, Next.js 16.1.1, `seo/` non suivi, stratégie validée).
- Clés : `~/.zshenv` (`PSI_API_KEY`, `BING_WMT_API_KEY`), à sourcer avant de lancer Claude, jamais affichées.
- Corpus d'inspiration : `inspiration/` (hors git, MIT Corey Haines), matière première des références.
