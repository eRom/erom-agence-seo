# Fichiers clés (mis à jour le 2026-08-29, 22 h)

**Contrats partagés (`plugin/lib/`)**
- `lib/strategy.ts` : `parseStrategy`, `lintStrategy`, `normalizeText`, `keywordMatches`, `cadenceDays`, `INDEXNOW_KEY` ; le format strict de `seo/strategy.md`.
- `lib/report.ts` : `parseReport`, `latestAuditDir` (option `level`, `file`), `sortAuditDirs`, `ReportError` ; le format de `report.md`, réutilisé par `build` puis `launch`.
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
- `SKILL.md` : six temps (préparer, planifier, valider les textes, appliquer, vérifier, boucler, restituer). Étape 3 : règle texte « remplacer » (29/08).
- `scripts/plan.ts` + `lib/plan.ts` : `buildPlan` (entrée `n0` optionnelle : hors build du dernier audit niveau 0 rapatriés avec `origine`), `KINDS` (genre et `ou` par id, IDX-04 nomme le code 308 Vercel), `planSummary`, `derived/build-plan.json`.
- `lib/recipes.ts` : `parseRecipes`, `BUILD_DOMAINS`.
- `references/nextjs.md` : 13 recettes Next.js 16 par famille d'ids, pièges transverses, 23 citations ; `references/autre-stack.md`.
- `tests/fixtures/chico/` : strategy.md, report.md (n0 du 28/08), report-n2.md (n2 minimal, 0 trouvaille, pour R-6), manifest.json, pages.json, strategy-eval.json.
- `tests/plan-cli.test.ts` : `fakeSite()` et `fakeSiteWithN2()`, site factice en `mkdtemp` pour tester le câblage disque de `plan.ts`.

**Checklist (`plugin/skills/checklist/`)**
- `SKILL.md` : six temps (préparer, situer « c'est déployé ? », auditer la prod, écrire, agir avec OK, restituer) ; `source ~/.zshenv` devant les commandes à clé ; un refus s'écrit dans le fichier (« refusé par Romain le <date> »).
- `scripts/checklist.ts` : CLI, toute la lecture disque, git, réseau ; options `--mise-en-ligne`, `--ancien-sitemap <url ou fichier>`, `--agir`, `--seo`, `--today` ; sorties `fichier :`, `checklist : n/15 cochées · …`, `attention :` ; exit 0 écrit, 1 sinon, 2 usage ; `pending` (raisons pour lesquelles `--agir` ne pourrait rien) ; `prodSitemapUrls` ; `assertNoSecret` avant l'écriture.
- `scripts/lib/checklist.ts` : pur ; `LINES` (CL-01 à CL-15, libellé, sorte, phase, jour J+n, consigne), `parseChecklist` (strict, `ChecklistError`), `renderChecklist`, `computeChecklist` (`ChecklistInput` : n2, n0, n0Prod, git, bing, redirections, actions, pending, previous), `dueToday`, `checklistSummary`, `addDays` (UTC).
- `scripts/lib/actions.ts` : `Fetcher` injecté, `pingIndexNow` (corps `{host, key, keyLocation, urlList}`, 200 ou 202), `bingUserSites` (`{"d":[…]}`), `bingSubmitFeed` (POST `{siteUrl, feedUrl}`, `{"d":null}`), `bingError` (enum `ApiErrorCode`, hint 11/13/14 = consigne au propriétaire), `redact`, `urlsOnOrigin` (R-3).
- `scripts/lib/ancien-sitemap.ts` : `judgeChain` (301 et 308 seulement, 200 final sur le site), `checkRedirections` (séquentiel).
- `references/consoles.md` : 12 entrées `### Titre (CL-nn)` avec `Chemin`, `Piège`, `Source` (24 citations + 2 `[manuel]` Bing), lues par `parseRecipes`, contrôlées par `check-sources.ts` (label `checklist:`).
- `tests/` : `checklist.test.ts` (23), `actions.test.ts` (7), `ancien-sitemap.test.ts` (3), `checklist-cli.test.ts` (8, `fakeSite()` avec dépôt git temporaire, `BING_WMT_API_KEY` vidée, sitemap brut synthétique écrit par le test), `consoles.test.ts` (3) ; `fixtures/chico/` copiés de build (+ `pages.json`).

**Console (`plugin/skills/console/`, chantier 5 étape 1)**
- `SKILL.md` : quatre temps (situer, vérifier l'accès, lire, restituer) ; dit que le verbe n'écrit rien (agir = `checklist --agir`), que ce n'est pas un audit (preuve datée = `/erom-seo:audit`), les trois variables d'environnement, les codes de sortie, et quoi faire quand les deux canonicals divergent (renvoi IDX-04).
- `scripts/console.ts` : CLI `sites | inspect <url> | crawl [--site <url>]` plus `--json`. Toutes les dépendances en paramètre de `runConsole` (`fetcher`, `env`, `gcloud`, `serviceAccount`, `readStrategy`), jamais `process.env` à l'intérieur : c'est ce qui rend testable « aucune requête ne part ». Chaque moteur est isolé, un échec de l'un n'interrompt pas l'autre. Sortie passée par `redact` puis `assertNoSecret` sur la clé Bing **et** le jeton. `import.meta.main` sous `try/catch`, jamais de trace brute.
- `scripts/lib/resolve.ts` : pur ; `resolveProperty` (préfixe d'URL le plus long, sinon propriété Domaine la plus spécifique ; frontière de segment, origine insensible à la casse et chemin sensible), `resolveBingSite` (par `sameSite`).
- `scripts/lib/auth-google.ts` : `getAccessToken` à deux fournisseurs (`GSC_SA_KEY_FILE` gagne, sinon `defaultGcloud`), `serviceAccountToken` (JWT RS256 signé par `crypto.subtle`, `exp` à `iat + 3540`), `AuthError` avec `hint`, `LOGIN_HINT` / `QUOTA_HINT` / `SA_HINT` réutilisés par `gsc.ts`.
- `scripts/lib/gsc.ts` : `listProperties`, `listSitemaps` (siteUrl encodé dans le chemin), `inspectUrl`, `canonicalMismatch`, `fail()` (six branches, dont `SERVICE_DISABLED` qui nomme le projet de quota fautif et `USER_PROJECT_DENIED`). En-tête `x-goog-user-project` seulement avec le fournisseur gcloud.
- `scripts/lib/bing.ts` : cinq lectures (`GetUserSites`, `GetFeeds`, `GetUrlInfo`, `GetCrawlStats`, `GetCrawlIssues`), `redact`, `parseDotNetDate` et `DATE_JAMAIS`. `ErrorCode` 0 vaut `None`, donc un succès.
- `scripts/lib/render.ts` : pur ; `renderSites`, `renderInspect`, `renderCrawl`. Une ligne par fait, jamais un tableau, aucune section vide, champ absent jamais affiché vide.
- `references/acces.md` : six entrées `### Titre (ACC-nn)` avec `Chemin`, `Piège`, `Source` (8 citations, label `console:` dans `check-sources.ts`).
- `tests/` : `resolve` (9), `auth-google` (13), `gsc` (12+), `bing` (9+), `render` (21), `console-cli` (26), `acces` (4) ; fixtures réelles dans `tests/fixtures/gsc/` (4) et `tests/fixtures/bing/` (5).

**Documentation**
- Specs : `docs/superpowers/specs/2026-08-27-erom-seo-design.md` (mère), `2026-08-28-erom-seo-strategy-design.md`, `2026-08-28-erom-seo-build-design.md` (5.2 fusion des hors build n0, AC-6 amendé, 7.3 règle texte, 29/08), `2026-08-29-erom-seo-checklist-design.md` (D23 à D28, quinze lignes en 4.3, AC-1 à AC-7), `2026-08-29-erom-seo-console-design.md` (D29 à D34, AC-1 à AC-10, échantillons d'API réels en 12.1 à 12.6).
- Plans et recettes : `docs/superpowers/plans/2026-08-28-erom-seo-chantier-{2-strategy,2-recette,3-build,3-recette}.md`, `2026-08-29-erom-seo-chantier-4-{checklist,recette}.md`, `2026-08-29-erom-seo-chantier-5-{console,recette}.md`. Journal d'exécution du chantier 5 (arbitrages et alternatives battues) : `docs/superpowers/journaux/2026-08-29-erom-seo-chantier-5-journal.md`. La recette 3 porte les résultats du 29/08 (R-3 à R-8) et les correctifs R-6, R-7a ; la recette 4, AC-1 à AC-7 OK, R-1 et R-3 corrigés, IndexNow 202.
- Recherches : `docs/recherches/2026-08-27-mots-cles-gratuits.md` (sondes Bing reproductibles), `2026-08-28-nextjs-16-seo-api.md`, `2026-08-29-checklist-indexnow-bing-gsc.md` (payloads IndexNow et Bing extraits par curl, gestes Search Console cités, sondes 4.1 à 4.4), `2026-08-29-niveau-1-apis.md` (session d'idéation : rapports IA hors API, modèle d'accès agence, chantier 5).
- Reprise : `.claude/notes/2026-08-27-reprise-2120.md` (lire en premier).

**Hors repo**
- Cobaye : `/Users/recarnot/dev/chico-happiness` (commentchercherbonheur.org, Next.js 16.1.1, Vercel, remote GitHub `eRom/chico-happiness`). Depuis le 29/08 : `seo/` suivi sauf `seo/**/raw/` (`.gitignore`), SEO du build fusionné dans `main` (`059480b`), apex en 308 vers www, puis `seo/checklist.md` et l'audit prod `seo/audits/2026-08-29-n0/` (0 Critique, 0 Important, 1 Mineur SD-03, 2 Info) commités et poussés (`a6d83ff`). Transcripts de ses sessions : `~/.claude/projects/-Users-recarnot-dev-chico-happiness/`.
- Clés : `~/.zshenv` (`PSI_API_KEY`, `BING_WMT_API_KEY`, `GSC_QUOTA_PROJECT=gen-lang-client-0479935649` posée le 29/08 ; `GSC_SA_KEY_FILE` non posée, le fournisseur par défaut reste gcloud), à sourcer avant de lancer Claude, jamais affichées. Le compte Bing Webmaster Tools de Romain n'a aucun site (`GetUserSites` = `{"d":[]}` le 29/08) : chico à ajouter pour que `SubmitFeed` parte un jour.
- Corpus d'inspiration : `inspiration/` (hors git, MIT Corey Haines), matière première des références.
- Remote : `git@github.com:eRom/erom-agence-seo.git`, premier push le 29/08 à 14 h 47, `main` synchronisé depuis (`9c0767a`).
- Worktrees : plus aucun au 29/08 (chantier-3, menage, recette-fix, chantier-4 supprimés après fusion) ; branche `chantier-1-audit-n0` conservée.
