# Patterns et conventions (mis à jour le 2026-08-28)

**Nommage.** Vérifications `FAMILLE-NN` (ROBOTS, SNIP, IDX, SD, TAG, FRESH, REND, PERF, AI, STRAT, LVL1). Sévérités : Critique, Important, Mineur, Info. Verbes : audit, strategy, build, launch. Dossiers : `seo/audits/<AAAA-MM-JJ>-n<niveau>[-k]/`, `seo/strategy/<AAAA-MM-JJ>[-k]/`, réservés atomiquement (`mkdir` non récursif, suffixe au premier libre, jamais écrasés).

**Markdown strict + parseur + lint.** Tout fichier lu par un script a un format fixe et un parseur dédié : `strategy.md` (`parseStrategy`, `lint-strategy.ts`), `report.md` (`parseReport`, `lint-report.ts`), `checks/*.md` (`parseChecks`), recettes `### Titre (ID, ID)` avec `Fichiers`, `Recette`, `Piège`, `Source` (`parseRecipes`, les blocs de code ignorés).

**D5, sources.** Une vérification ou une recette sans `Source` officielle citée mot pour mot ne se livre pas ; `check-sources.ts` retrouve chaque citation sur sa page. Domaines : `OFFICIAL_DOMAINS` (moteurs) pour les rapports et les checks, `BUILD_DOMAINS` (+ nextjs.org, vercel.com, react.dev) pour les recettes.

**Décisions notables.** D9 couche stratégique dès que `strategy.md` existe ; D11 jamais un chiffre Google, Bing vide = « non mesurable gratuitement » daté ; D15 tout le réseau dans `collect.ts` ; D16 textes visibles (h1, première phrase) via une table validée par Romain avant modification ; D17 build lance serveur local + audit niveau 2, 2 passages max ; D19 genre par id (code / texte / hors-build) dans une table testée ; D21 base canonique = hôte observé au niveau 0.

**Erreurs.** Les CLI impriment `erreur : …` et sortent 1, usage 2, jamais une stack ; `StrategyError` et `ReportError` portent `errors[]`. Un chemin explicite absent (`--strategy-path x.md`) est une erreur consignée ; le défaut absent est silencieux.

**Tests (`bun test`, 209 au 28/08).** Fixtures réelles (fichiers de chico, réponses Bing et Wikimedia), jamais un jouet quand un vrai échantillon existe. Invariants sur le catalogue (« tout id a un genre »), jamais un compte figé. CLI testés par `Bun.spawnSync` ; `Bun.spawn` asynchrone quand le sous-processus appelle un `Bun.serve` du même process (sinon interblocage). Interdit : lire le code source depuis un test, asserter sur un mock.

**Textes tiers.** Aucun em dash dans `plugin/**` (rapports, références, gabarits, SKILL.md, README) : lint et tests le refusent. Français, citations en anglais entre « ».

**Git.** Commits en français, préfixes `feat(build):`, `fix(audit):`, `test(…):`, `docs:` ; trailer Co-Authored-By ; fusions `--no-ff` avec message ; rien n'est poussé. `build` commite dans le repo du site : `seo(ID, ID): …`, branche `seo-build-<date>` si on part de main.

**Process de chantier.** Fable : brainstorming (2 options, une question par message), spec avec `Battu :` par décision et `## Critères d'acceptation` (AC-n, Comportement, Vérifié par), plan avec tout le code, code pur exécuté dans le scratchpad avant écriture. Sonnet : exécution subagent-driven dans un worktree frère `erom-agence-seo-<sujet>`, un commit par tâche, rapport dans le scratchpad. Fable : relecture du diff complet, tests et sources relancés, fusion, note de reprise.
