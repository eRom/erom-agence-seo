# Fichiers clés (mis à jour le 2026-09-02, 17 h)

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

## Le commun et le niveau 1 (30/08)

- `plugin/lib/url.ts` — primitives d'URL partagées : `sameSite`, `pageKey`, `rewriteToOrigin`, plus deux aides privées. Extraites de `audit/lib/sitemap.ts` pour que le commun ne dépende d'aucune skill.
- `plugin/lib/auth-google.ts` — un jeton, deux fournisseurs (`gcloud` aujourd'hui, compte de service prêt). Ne journalise jamais sa sortie.
- `plugin/lib/gsc.ts` — les quatre lectures Search Console : `listProperties`, `listSitemaps`, `inspectUrl`, `searchAnalytics`. Plus `submitSitemap`, la seule écriture, qui refuse explicitement les trois autres que le scope autorise (D51).
- `plugin/lib/bing.ts` — **seul** endroit où vit `BING_API_BASE` et la table des codes d'erreur. Porte `parseDotNetDate` et la sentinelle `DATE_JAMAIS`.
- `plugin/lib/resolve.ts` — résout une URL vers la propriété Search Console qui la couvre, en choisissant dans ce que `sites.list` a rendu, jamais en fabriquant un `siteUrl`.
- `plugin/skills/audit/scripts/lib/level1.ts` — la collecte du niveau 1 et ses dérivés. Module **pur** (rien du réseau ni du disque n'y entre sans passer par un paramètre). Porte `collectLevel1`, `bingKnows`, `indexSummary`, `canonicalFindings`, `keywordChecks`, `deriveConsole`.
- `plugin/skills/audit/references/checks/` — `indexability.md` porte `IDX-06` et `IDX-07`, `strategy.md` porte `STRAT-05`, `ai-presence.md` porte `AI-03`. C'est le texte que le modèle lit pour écrire le rapport d'un client : sa justesse compte autant que celle du code.


## Le verbe `rapport` (chantier 6, 31/08)

| Fichier | Rôle |
|---|---|
| `plugin/skills/rapport/SKILL.md` | Quatre temps. L'aiguillage `--rendre-seul` est **avant le temps 1**, sinon le modèle rejoue l'écriture et écrase une correction manuelle |
| `plugin/skills/rapport/scripts/rapport.ts` | CLI deux gestes. Valide le geste **avant** de résoudre le dossier, traduit un fichier absent en message lisible. Importe `../../../lib/report`, trois niveaux |
| `plugin/skills/rapport/scripts/lint-client.ts` | `lintDossier(dossier)`, lit `report.md` et `rapport-client.md`, rend la liste des refus |
| `plugin/skills/rapport/scripts/lib/contrat.ts` | Parseur du Markdown client. Expose `parseRapportClient`, `idsVisibles`, `lignesEmDash`, `couvreMalPlaces`, `pucesMarcheTronquees`, `chapeauAvantBloc`, `PREFIXES` |
| `plugin/skills/rapport/scripts/lib/verifier.ts` | Les sept règles, pur, deux chaînes en entrée. Importe `../../../../lib/report`, **quatre** niveaux |
| `plugin/skills/rapport/scripts/lib/theme.ts` | `chargerTheme()`. Champ `fontes` en français. **Retire les commentaires CSS au chargement**, le fichier versionné garde le sien |
| `plugin/skills/rapport/scripts/lib/rendu.ts` | `rendre(rapport, theme)`, pur, thème en paramètre pour rester testable sans lire 66 Ko de binaire |
| `plugin/skills/rapport/references/registre.md` | Neuf règles de langue client, chacune avec un exemple fautif et un juste |
| `plugin/skills/rapport/references/gabarit.md` | Le squelette du Markdown client. Une section vide s'omet, titre compris |
| `plugin/skills/rapport/references/theme/tokens.css` | Tokens institut figés, 32 valeurs identiques à la source, un écart voulu sur `--serif` |
| `plugin/skills/rapport/references/theme/OFL.txt` | Licence des fontes. **L'avis de copyright a dû être rempli ici**, la source du DS institut ne l'a pas |
| `plugin/skills/rapport/scripts/tests/catalogue.test.ts` | Dérive `PREFIXES` du contenu réel de `references/checks/` et échoue en nommant la famille à ajouter |
| `.claude/notes/2026-08-31-chantier-6-journal.md` | Le registre du chantier : 26 arbitrages avec leur coût si faux, les deux gotchas de harness |

## Le chantier 7, soumettre aux moteurs (fusionné dans `main` le 02/09)

| Fichier | Rôle |
|---|---|
| `plugin/lib/soumission.ts` | **Créé.** Les trois écritures vers les moteurs et elles seules (D52), plus `sitemapsFromRobots`, `trouverSitemap`, `verifierCleServie`, `submitSitemapGoogle`. Porte aussi un `bingUserSites` qui n'est **pas** celui de `lib/bing.ts` (voir gotchas) |
| `plugin/lib/sitemap.ts` | **Créé.** `parseSitemap`, `decodeSitemapBody`, `sitemapCandidates`, remontés de la skill audit parce que `checklist` les importait déjà à travers elle |
| `plugin/lib/gsc.ts` | Gagne `submitSitemap`, la seule écriture Google, hors de `call()` parce que le PUT rend un corps vide. `fail()` prend un paramètre `ecriture` : sans lui, un refus de scope renverrait vers la commande gcloud du scope de lecture, celle qui ne répare rien |
| `plugin/lib/auth-google.ts` | `SCOPE_WRITE` et `SUBMIT_HINT` à côté de `SCOPE` et `LOGIN_HINT`. `FetchInit` admet `PUT`, le `Fetcher` rend `final?` (l'URL après redirections, d'où l'origine servie) |
| `plugin/lib/bing.ts` | Inchangé sauf son commentaire de tête, qui affirmait que `checklist/lib/actions.ts` était le seul endroit écrivant vers l'extérieur |
| `plugin/skills/checklist/scripts/lib/actions.ts` | Réduit à un fichier de réexport, ce qui laisse les 44 tests de la skill inchangés (AC-6) |
| `plugin/skills/console/scripts/console.ts` | La branche `update` : sonde d'origine, recherche de sitemap, trois soumissions isolées, deux drapeaux. `bingUserSites` y vient de `lib/bing` et de nulle part ailleurs |
| `plugin/skills/console/scripts/lib/render.ts` | `renderUpdate`, pur, sept branches, inscrit au filet anti tiret cadratin du fichier de tests |
| `plugin/skills/console/SKILL.md` | Cinquième temps « Soumettre », la discipline dry-run puis OK puis envoi, qui vaut aussi pour `--url`. Frontmatter réécrit : il affirmait que le verbe n'écrit rien |
| `plugin/skills/console/references/acces.md` | `ACC-07` (obtenir le scope d'écriture), `ACC-03` corrigé |
| `plugin/skills/build/scripts/lib/plan.ts` | `TAG-05` dans `KINDS` en genre `texte`, et la condition ligne 120 qui pousse `title` dans les textes à réécrire |
| `plugin/skills/audit/references/checks/tags.md` | `TAG-05`, une seule ligne `Source` (voir gotchas) |
| `.claude/notes/2026-09-01-reprise-chantier-7.md` | La note de reprise : où est le travail, la première commande, ce qui reste ouvert |
| `.claude/notes/2026-08-31-chantier-7-sdd/progress.md` | Le journal d'exécution : 26 décisions prises en cours de route, chacune avec son coût si elle est fausse. Sauvé du worktree le 02/09 avant son retrait, avec les briefs et rapports de chaque tâche |
