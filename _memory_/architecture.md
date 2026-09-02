# Architecture (mis à jour le 2026-09-02, 17 h)

**Type.** Plugin Claude Code `erom-seo` (dossier `plugin/`) pour l'agence : audit, stratégie, build, checklist de déploiement, consultation des consoles et rapport client, sans abonnement tiers, sites propres et clients. **Six verbes, le chantier 7 fusionné dans `main` et recetté au 02/09.** 547 tests, 36 entrées de catalogue. Le repo héberge aussi les dossiers clients (`clients/<domaine>/seo/`, non suivis) et la documentation de conception.

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

**Le verbe `console` (chantier 5 étape 1, D29 à D34).** Lentille **en lecture seule** sur Google Search Console et Bing Webmaster Tools, trois commandes à l'époque : `sites` (propriétés et rôles, sitemaps déclarés, sites Bing et leurs flux), `inspect <url>` (état d'indexation et surtout le canonical retenu par Google contre celui déclaré), `crawl` (statistiques et erreurs Bing ; Google n'expose rien en API). N'écrivait alors aucun fichier ni aucun appel d'écriture, les deux écritures du plugin vivant dans `checklist --agir` (D30). **Périmé depuis le chantier 7 : D50 remplace D30 et `console update` écrit vers les moteurs, voir plus bas.** Le jeton Google a deux fournisseurs derrière une seule fonction, `gcloud auth application-default print-access-token` aujourd'hui et un compte de service demain, la bascule coûtant une variable d'environnement (D32). La propriété Search Console est **résolue depuis `sites.list` et jamais fabriquée** : Search Console a deux sortes de propriété, `sc-domain:` et préfixe d'URL, et l'API exige le nom exact (D33). Codes de sortie : `inspect` rend 1 si aucune propriété ne couvre l'URL, `crawl` rend 1 si Bing n'a rien pu être lu.

**Flux checklist.** `checklist.ts` lit `strategy.md`, le dernier n2 et le dernier n0 (`latestAuditDir`), git (branche, dernier commit `seo(`), l'ancien `seo/checklist.md`, l'hôte réellement servi (home de `raw/manifest.json` du n0, sinon `derived/pages.json`, sinon la stratégie) ; calcule les quinze lignes (`computeChecklist`, pur) ; avec `--agir`, POST IndexNow (URL du sitemap collecté ramenées sur l'hôte servi) et `SubmitFeed` Bing si le site est dans le compte et vérifié. La skill (`SKILL.md`) lance d'abord `/erom-seo:audit https://<site>` quand la mise en ligne est posée, puis le script, puis demande le OK avant `--agir`.

**Dépendances externes.** PageSpeed Insights (`PSI_API_KEY`), Bing Webmaster JSON `GetKeywordStats`, `GetUserSites`, `SubmitFeed`, `GetFeeds`, `GetUrlInfo`, `GetCrawlStats`, `GetCrawlIssues` (`BING_WMT_API_KEY`), Search Console `sites.list`, `sitemaps.list` et `urlInspection.index.inspect` (jeton gcloud plus `GSC_QUOTA_PROJECT`, ou `GSC_SA_KEY_FILE`), Wikimedia Pageviews, IndexNow (`POST https://api.indexnow.org/indexnow`, clé publique servie en `/<clé>.txt`) ; documentation officielle des moteurs, de Next.js, de Vercel et de Microsoft Learn pour les citations, vérifiées par `check-sources.ts` (115 au 29/08 au soir, dont 24 de `consoles.md` et 8 de `acces.md`).

## Le niveau 1 (chantier 5 étape 2, fusionné le 30/08)

`audit --level 1` fait tout le niveau 0 puis interroge Search Console et Bing, et en tire quatre vérifications : `IDX-06` (pages réellement indexées, Critique), `IDX-07` (canonical retenu par Google, Important), `STRAT-05` (requêtes réelles contre le mot-clé visé, Important, couche stratégique), `AI-03` (présence dans l'index Bing, Mineur). Il ne s'allume **jamais** tout seul : les accès étant posés en permanence sur la machine, une détection automatique enverrait des requêtes à des tiers sans demande.

**Le dossier commun `plugin/lib/` est passé de 2 modules à 7** : `url.ts` (primitives d'URL), `auth-google.ts` (jeton, deux fournisseurs), `gsc.ts` (les quatre lectures Search Console), `bing.ts` (transport et lectures Bing), `resolve.ts` (résolution de propriété), plus `report.ts` et `strategy.ts` déjà là. Règle qui décide du découpage : **`plugin/lib/` ne dépend d'aucune skill**. Le transport Bing n'existe plus qu'en un exemplaire, partagé par les cinq verbes.

**Flux du niveau 1** : `collect.ts` monte le jeton et la clé, appelle `skills/audit/scripts/lib/level1.ts` (module **pur** : `Fetcher`, jeton et clé en paramètre, aucune écriture), écrit les réponses brutes dans `raw/gsc/` et `raw/bing/`, et le dérivé dans `derived/console.json`, seul fichier que les quatre vérifications du catalogue lisent. Toute la branche est sous `try` : une panne du niveau 1 ne fait jamais échouer l'audit.


## Le verbe `rapport` (chantier 6, fusionné le 31/08)

**Ce qu'il fait.** `/erom-seo:rapport` ne collecte rien, ne vérifie rien, ne corrige rien. Il lit un audit déjà sur disque et en tire `rapport-client.html` à côté du `report.md` : un fichier **autonome** (aucune requête réseau, fontes Spectral en base64, environ 94 Ko) destiné au client final, envoyé en pièce jointe et imprimé en PDF. Il est bâti sur **une seule action** à faire dans la semaine, puis les trouvailles Critique et Important reformulées sans jargon. C'est le premier artefact du dépôt destiné à quelqu'un d'extérieur à l'agence.

**Le modèle écrit au milieu du flux**, d'où un CLI à deux gestes : `rapport.ts --preparer [dossier]` sort la matière du jugement sans rien écrire, Claude rédige `rapport-client.md`, puis `--rendre <dossier>` lint et n'écrit le HTML que si le lint passe. `--rendre-seul` est l'alias du second geste, pour re-rendre après une correction manuelle du Markdown sans réécrire le jugement.

**Arborescence.**
```
plugin/skills/rapport/
  SKILL.md                     quatre temps, l'aiguillage --rendre-seul est en tête
  scripts/rapport.ts           CLI deux gestes ; ../../../lib/report (3 niveaux)
  scripts/lint-client.ts       lintDossier(), lit les deux fichiers du dossier
  scripts/lib/contrat.ts       parseRapportClient, idsVisibles, couvreMalPlaces, PREFIXES
  scripts/lib/verifier.ts      les 7 règles ; ../../../../lib/report (4 niveaux)
  scripts/lib/theme.ts         chargerTheme(), champ `fontes` (français), base64
  scripts/lib/rendu.ts         rendre(rapport, theme), pur, thème en paramètre
  references/registre.md       neuf règles de langue face au client
  references/gabarit.md        le squelette du Markdown client
  references/theme/            tokens institut figés, 3 woff2 Spectral, OFL.txt
```

**Le profil visuel est `institut`, par exception au routage** d'`erom-design` qui donne `perso` (D45) : perso est dark-first, disqualifiant pour un document imprimé chez un client. Tokens copiés une fois depuis `erom-design-system-institutionnel/src/styles/tokens.css` et figés ; aucune dépendance à ce dépôt à l'exécution.

**Ce que le lint garantit, et ce qu'il ne garantit pas.** Il refuse un rapport dont une trouvaille grave n'est couverte nulle part, une mineure glissée dans l'inventaire, un compte de points mineurs faux, un identifiant de catalogue visible, un tiret cadratin, un balisage que le rendu ne sait pas produire, un commentaire `couvre:` hors bloc. Il **ne peut pas** vérifier que le texte parle vraiment de la trouvaille qu'il déclare couvrir : la couverture est un pointage d'identifiant (D47). Seule la relecture du temps 3, dont c'est le premier des cinq défauts cherchés, protège de cette triche.

**Reste à faire.** La recette (tâche 7 du plan) : impression PDF réelle et taste-gate, les deux seuls critères qu'aucun test ne juge. Trois audits de CHICO couvrent les trois formes de rapport (fourni, site sain, un bloquant sans frein).

## Le chantier 7, soumettre aux moteurs (fusionné et recetté le 02/09)

**État.** Fusionné dans `main` le 02/09 après recette réelle sur CHICO, 547 tests. Le worktree `/Users/recarnot/dev/erom-seo-chantier-7` peut être retiré. **`console` n'est plus en lecture seule** : toute phrase de la mémoire qui l'affirme encore est périmée. Recette : `docs/superpowers/plans/2026-09-02-erom-seo-chantier-7-recette.md`.

**Ce que la recette a établi**, chaque succès confirmé par une relecture indépendante de l'API et pas par le rendu du CLI : Google enregistre le sitemap et le télécharge 787 ms après réception (0 erreur, 0 avertissement, 10 URL) ; Bing l'enregistre aussi et **unifie apex et www sur la même propriété**, ce qui annule le risque que la spec redoutait ; IndexNow rend 200 sur 10 URL. Trois points restent non vérifiés et sont nommés comme tels dans la recette : AC-7 (aucune cible réelle ne dépasse 65 caractères de titre), le rôle Owner par API, et l'existence d'un refus Bing caché dans un corps HTTP 200.

**Ce que la branche ajoute.** Une quatrième commande au verbe `console` : `update`, qui soumet le sitemap chez Google (`sitemaps.submit`, écriture nouvelle) et chez Bing (`SubmitFeed`), et poste les URL à IndexNow. Plus `TAG-05`, une vérification de catalogue sur les titres trop longs, détection à 65 caractères et correctif visant 60.

**D50 remplace D30.** `console` n'est plus en lecture seule. La règle devient : **un seul endroit du code écrit vers un moteur**, `plugin/lib/soumission.ts`, et il a **deux appelants et deux seulement**, `console update` (le geste répétable d'après publication) et `checklist --agir` (le rituel de mise en ligne, avec son état persisté).

**D51, le refus explicite.** Le scope OAuth `auth/webmasters` qu'exige `sitemaps.submit` autorise aussi `sitemaps.delete`, `sites.add` et `sites.delete`. Aucune n'est implémentée, et c'est une décision inscrite dans le commentaire de tête de `gsc.ts`, vérifiée par grep sur le type `FetchInit` qui n'admet que GET, POST et PUT.

**Le flux d'`update`.** Sonde du `robots.txt` en suivant les redirections, ce qui donne d'un coup l'origine réellement servie (D53) et les directives `Sitemap:` ; recherche du sitemap (robots d'abord, repli `/sitemap.xml` puis `/sitemap_index.xml`) ; puis trois soumissions isolées, chacune sous son `try/catch`, l'échec de l'une n'arrêtant pas les autres. Avant IndexNow, un GET sur `/<clé>.txt` vérifie que la clé déclarée dans `seo/strategy.md` est bien celle servie (D54), sinon on s'arrête plutôt que de manger un 403 muet.

**Codes de sortie (D57).** Trois situations seulement sont « non applicables » et laissent 0 : clé Bing absente, site hors du compte Bing, pas de clé IndexNow dans la stratégie. Tout le reste vaut 1, y compris une clé IndexNow servie mais différente de celle déclarée.

**Deux options.** `--url <u>` répétable poste ces pages seules sans toucher aux sitemaps, et n'affiche aucune ligne de moteur ; `--dry-run` joue toutes les lectures et n'émet aucune écriture.

**IndexNow ne prévient pas Google.** Sept participants relevés le 31/08 sur `indexnow.org/searchengines.json` : bing, yandex, seznam, naver, yep, internetarchive, amazonbot. Un seul POST suffit pour les sept, le protocole obligeant le moteur receveur à relayer sous dix secondes. Chez Google, seul le sitemap compte.
