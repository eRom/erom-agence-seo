# Architecture (mis à jour le 2026-08-30, 15 h)

**Type.** Plugin Claude Code `erom-seo` (dossier `plugin/`) pour l'agence : audit, stratégie, build, checklist de déploiement et consultation des consoles, sans abonnement tiers, sites propres et clients. **Cinq verbes plus l'audit niveau 1, tout fusionné dans `main` au 30/08 ; le chantier 5 est terminé.** 434 tests, 119 citations officielles vérifiées, 35 entrées de catalogue. Le repo héberge aussi les dossiers clients (`clients/<domaine>/seo/`, non suivis) et la documentation de conception.

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
  skills/checklist/               checklist.ts (CLI), lib/{checklist,actions,ancien-sitemap}.ts, references/consoles.md, SKILL six temps
  skills/console/                 console.ts (CLI), lib/{resolve,auth-google,gsc,bing,render}.ts, references/acces.md, SKILL quatre temps
docs/superpowers/specs/           spec mère (D1 à D8), chantier 2 (D9 à D15), chantier 3 (D16 à D22), chantier 4 (D23 à D28), chantier 5 étape 1 (D29 à D34)
docs/superpowers/journaux/        registre d'exécution en sous-agents, décisions et alternatives battues
docs/superpowers/plans/           plans avec code inclus, recettes AC par chantier
docs/recherches/                  mots-clés gratuits (Bing, Wikimedia), API SEO Next.js 16, IndexNow + API Bing + gestes Search Console, APIs niveau 1
.claude/notes/                    note de reprise (état, parqué, calendrier, commandes)
```

**Le dossier `seo/` au centre (D1).** Un dossier par site, quatre verbes dessus : `strategy` écrit `seo/strategy.md` (le contrat, Markdown strict) ; `audit` écrit `seo/audits/<date>-n<niveau>/` (raw/ octets exacts, derived/ JSON, report.md) ; `build` lit les deux, écrit `derived/build-plan.json`, corrige le code du site un commit par trouvaille, relance l'audit niveau 2 en boucle ; `checklist` (chantier 4, ex `launch`, D23 : ne déploie rien) écrit `seo/checklist.md`, quinze lignes en deux moitiés (avant et après le déploiement), relançable : cases `auto` calculées depuis les audits et git, cases `main` cochées par Romain et jamais décochées, cases `action` (ping IndexNow, `SubmitFeed` Bing) derrière `--agir` (D26 : aucune écriture sortante sans ce drapeau ; sans lui, seules les lectures `GetUserSites` et ancien sitemap). Le fichier est l'état (D25) ; une ligne se reconnaît à son libellé, une ligne inconnue est une erreur (D27) ; site repris en option `--ancien-sitemap` (D28).

**Partage script / modèle.** Les scripts font le déterministe (collecte réseau, évaluation stratégique, plan de build, lints) ; Claude fait le jugement (rapport, textes, modifications de code). La logique pure vit dans `scripts/lib/` sans réseau ni disque ; les CLI dans `scripts/` avec `import.meta.main`.

**Flux principal.** `collect.ts <url>` → `raw/` + `derived/pages.json`, `robots-eval.json`, `psi.json` ; `strategy-eval.ts` → `derived/strategy-eval.json` ; Claude écrit `report.md` selon `references/checks/*.md` et `report-template.md` ; `lint-report.ts` le refuse s'il dérive. `plan.ts` joint stratégie + rapport + dérivés → `build-plan.json` (trouvailles classées code / texte / hors build, valeurs par page, bloc Organization, base canonique observée) ; quand le rapport de départ n'est pas un niveau 0, il rapatrie aussi les hors build ouverts du dernier audit niveau 0 (champ `origine`), sinon IDX-03, IDX-04 et PERF-01 disparaissent du plan (R-6, 29/08).

**Niveaux et couche.** Niveau 0 = URL seule ; niveau 2 = site en local (`localhost`, sitemap de prod ramené en local, PageSpeed et sondes d'hôte non applicables) ; niveau 1 (Search Console, Bing) = chantier 5 étape 2, à faire. Couche stratégique (STRAT-01 à 04, AI-02) active dès que `seo/strategy.md` existe, à tout niveau (D9).

**Le verbe `console` (chantier 5 étape 1, D29 à D34).** Lentille **en lecture seule** sur Google Search Console et Bing Webmaster Tools, trois commandes : `sites` (propriétés et rôles, sitemaps déclarés, sites Bing et leurs flux), `inspect <url>` (état d'indexation et surtout le canonical retenu par Google contre celui déclaré), `crawl` (statistiques et erreurs Bing ; Google n'expose rien en API). N'écrit aucun fichier et n'émet aucun appel d'écriture : les deux écritures du plugin restent dans `checklist --agir` (D30). Le jeton Google a deux fournisseurs derrière une seule fonction, `gcloud auth application-default print-access-token` aujourd'hui et un compte de service demain, la bascule coûtant une variable d'environnement (D32). La propriété Search Console est **résolue depuis `sites.list` et jamais fabriquée** : Search Console a deux sortes de propriété, `sc-domain:` et préfixe d'URL, et l'API exige le nom exact (D33). Codes de sortie : `inspect` rend 1 si aucune propriété ne couvre l'URL, `crawl` rend 1 si Bing n'a rien pu être lu.

**Flux checklist.** `checklist.ts` lit `strategy.md`, le dernier n2 et le dernier n0 (`latestAuditDir`), git (branche, dernier commit `seo(`), l'ancien `seo/checklist.md`, l'hôte réellement servi (home de `raw/manifest.json` du n0, sinon `derived/pages.json`, sinon la stratégie) ; calcule les quinze lignes (`computeChecklist`, pur) ; avec `--agir`, POST IndexNow (URL du sitemap collecté ramenées sur l'hôte servi) et `SubmitFeed` Bing si le site est dans le compte et vérifié. La skill (`SKILL.md`) lance d'abord `/erom-seo:audit https://<site>` quand la mise en ligne est posée, puis le script, puis demande le OK avant `--agir`.

**Dépendances externes.** PageSpeed Insights (`PSI_API_KEY`), Bing Webmaster JSON `GetKeywordStats`, `GetUserSites`, `SubmitFeed`, `GetFeeds`, `GetUrlInfo`, `GetCrawlStats`, `GetCrawlIssues` (`BING_WMT_API_KEY`), Search Console `sites.list`, `sitemaps.list` et `urlInspection.index.inspect` (jeton gcloud plus `GSC_QUOTA_PROJECT`, ou `GSC_SA_KEY_FILE`), Wikimedia Pageviews, IndexNow (`POST https://api.indexnow.org/indexnow`, clé publique servie en `/<clé>.txt`) ; documentation officielle des moteurs, de Next.js, de Vercel et de Microsoft Learn pour les citations, vérifiées par `check-sources.ts` (115 au 29/08 au soir, dont 24 de `consoles.md` et 8 de `acces.md`).

## Le niveau 1 (chantier 5 étape 2, fusionné le 30/08)

`audit --level 1` fait tout le niveau 0 puis interroge Search Console et Bing, et en tire quatre vérifications : `IDX-06` (pages réellement indexées, Critique), `IDX-07` (canonical retenu par Google, Important), `STRAT-05` (requêtes réelles contre le mot-clé visé, Important, couche stratégique), `AI-03` (présence dans l'index Bing, Mineur). Il ne s'allume **jamais** tout seul : les accès étant posés en permanence sur la machine, une détection automatique enverrait des requêtes à des tiers sans demande.

**Le dossier commun `plugin/lib/` est passé de 2 modules à 7** : `url.ts` (primitives d'URL), `auth-google.ts` (jeton, deux fournisseurs), `gsc.ts` (les quatre lectures Search Console), `bing.ts` (transport et lectures Bing), `resolve.ts` (résolution de propriété), plus `report.ts` et `strategy.ts` déjà là. Règle qui décide du découpage : **`plugin/lib/` ne dépend d'aucune skill**. Le transport Bing n'existe plus qu'en un exemplaire, partagé par les cinq verbes.

**Flux du niveau 1** : `collect.ts` monte le jeton et la clé, appelle `skills/audit/scripts/lib/level1.ts` (module **pur** : `Fetcher`, jeton et clé en paramètre, aucune écriture), écrit les réponses brutes dans `raw/gsc/` et `raw/bing/`, et le dérivé dans `derived/console.json`, seul fichier que les quatre vérifications du catalogue lisent. Toute la branche est sous `try` : une panne du niveau 1 ne fait jamais échouer l'audit.

