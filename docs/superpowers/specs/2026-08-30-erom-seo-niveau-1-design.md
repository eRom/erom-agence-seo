---
title: "erom-seo, chantier 5 étape 2 : l'audit niveau 1"
date: 2026-08-30
status: proposed
project: erom-agence-seo
spec_mere: docs/superpowers/specs/2026-08-27-erom-seo-design.md
notes_liees:
  - docs/superpowers/specs/2026-08-29-erom-seo-console-design.md
  - docs/recherches/2026-08-29-niveau-1-apis.md
  - docs/superpowers/plans/2026-08-29-erom-seo-chantier-5-recette.md
  - .claude/notes/2026-08-27-reprise-2120.md
cobaye: sc-domain:romain-ecarnot.com (rôle siteOwner), https://lebonpote.romain-ecarnot.com/ (préfixe, siteOwner), sc-domain:healthincloud.app (siteUnverifiedUser, propriété conservée mais SITE HORS LIGNE depuis le 30/08 par décision de Romain : sert le cas du refus de droits, plus celui de l'audit complet). Bing : les deux premiers sites vérifiés. Chico n'a de propriété chez aucun des deux et reste le seul site en ligne hors des deux consoles.
---

# erom-seo, chantier 5 étape 2 : l'audit niveau 1

L'étape 1 a livré le verbe `console`, une lentille de consultation en lecture seule. Cette spec porte l'étape 2 : le niveau 1 de l'audit, celui qui interroge Search Console et Bing Webmaster Tools et pose leurs réponses dans une collecte datée, à côté du niveau 0.

Toutes les conventions d'appel de cette spec ont été capturées en vrai le 30/08 sur les propriétés de Romain, section 11. Aucune n'est reprise d'un résumé ni d'une documentation. Deux des cinq incertitudes de la note d'idéation sont levées ici, une autre est reformulée.

## 1. But

Le niveau 0 lit le site tel qu'il se présente. Il ne sait pas si Google l'a indexé, sous quelle adresse canonique, ni sur quels mots il ressort. Le niveau 1 va chercher ces trois réponses là où elles existent, et une quatrième chez Bing.

Ce que le niveau 1 apporte que rien d'autre ne peut donner :

- **Une page peut être parfaite et absente de l'index.** Aucune analyse du HTML ne le dira.
- **Google peut avoir choisi une autre adresse canonique que celle déclarée.** C'est invisible depuis le site, et ça dilue les signaux entre deux URL.
- **Les mots sur lesquels un site ressort ne sont presque jamais ceux qu'il visait.** L'écart est le premier constat d'une stratégie qui rate.
- **Bing alimente Copilot.** Une page absente de l'index Bing est absente de Copilot.

## 2. Décisions

### D35. Les imports CSV des rapports IA sortent du chantier

LVL1-01 (impressions dans les AI Overviews) et LVL1-02 (citations Copilot) restent hors périmètre. Décision de Romain le 30/08, sur trois faits établis le matin même :

1. La propriété `romain-ecarnot.com` n'a pas le rapport Generative AI. Vérifié dans l'interface : absent du menu, absent du filtre « Type de recherche » (qui n'offre que Web, Image, Vidéo, Actualités), absent de « Ajouter un filtre » (Requête, Page, Pays, Appareil).
2. L'API refuse le type : `type: "GENERATIVE_AI"` rend `HTTP 400, Invalid value at 'type'` (section 11.4). La sonde 8.4 de la note d'idéation est confirmée sur du réel.
3. L'export Bing AI Performance de Romain porte son en-tête et zéro ligne de données (section 11.7).

Écrire ces deux lecteurs reviendrait à coder contre des fichiers que personne ne peut produire aujourd'hui, testés sur des fixtures fabriquées. Le format relevé le 30/08 est consigné en section 11.7 : le jour où un client a le rapport, la reprise coûte une demi-journée et part de mesures réelles.

Battu : coder les deux lecteurs maintenant, au motif que la visibilité IA est l'argument commercial du niveau 1. Perd parce que l'argument ne tient que si la donnée existe, et qu'un lecteur de zip Google écrit à l'aveugle a toutes les chances d'être faux le jour venu (noms de fichiers localisés selon la langue de l'interface, valeur du filtre inconnue).

### D36. Le niveau 1 est le niveau 0 plus quatre vérifications, dans une seule collecte

`collect.ts --level 1` fait tout le niveau 0 (robots, sitemaps, llms, pages, sondes, PageSpeed) puis ajoute la collecte des consoles. Un seul dossier, `seo/audits/<date>-n1/`, un seul manifeste, un seul rapport.

Conforme au tableau de `levels.md`, où le niveau 1 ne retire rien au niveau 0 et lève deux de ses trois angles morts. La couche stratégique reste indépendante du niveau (D9).

Battu : un second script `collect-console.ts` rejouable seul. Perd contre D4 (`collect.ts` seul au réseau) et parce que deux passages produiraient deux dossiers à rapprocher à la main.

### D37. Le niveau 1 ne s'allume que sur `--level 1` explicite

`detectLevel()` continue de rendre 2 sur un hôte local et 0 partout ailleurs. Le niveau 1 ne s'obtient que par le drapeau.

Raison : les accès de Romain sont posés en permanence dans `~/.zshenv` et par `gcloud`. Une détection automatique ferait partir des requêtes vers Google et Bing à chaque audit, sur des propriétés qui ne sont pas forcément les siennes, sans qu'il l'ait demandé. Un audit qui contacte un tiers doit être un acte volontaire.

### D38. IDX-07 et STRAT-05 entrent au catalogue

Les deux candidats de la note d'idéation (section 6.5) sont retenus, décision de Romain le 30/08.

- **IDX-07**, canonical choisi par Google différent du canonical déclaré. Coût marginal nul : le champ arrive dans la réponse d'inspection déjà demandée par IDX-06, et `canonicalMismatch()` existe déjà dans `gsc.ts`.
- **STRAT-05**, requêtes réelles de la page contre le mot-clé visé par `strategy.md`. Un appel `searchanalytics` supplémentaire. Couche stratégique : ne s'évalue que si `seo/strategy.md` existe et s'analyse (D9).

### D39. IDX-06 se fonde sur l'inspection d'URL, jamais sur `sitemaps.list`

Le champ `contents[].indexed` de `sitemaps.list` n'est pas alimenté : il vaut `"0"` sur deux propriétés de Romain dont les pages sont indexées et reçoivent des impressions (section 11.3). S'y fier ferait écrire « 0 page indexée » sur un site qui l'est.

IDX-06 compte donc les verdicts d'`urlInspection.index.inspect`, une requête par page collectée, plafonnée par `--max-pages`. Les chiffres de `sitemaps.list` restent collectés dans `raw/` (soumission, dernière lecture, erreurs, avertissements : ceux-là sont justes) mais `indexed` n'est jamais présenté comme un compte d'indexation.

Ceci lève l'incertitude 4 de la note d'idéation.

### D40. Les briques Google et Bing montent dans `plugin/lib/`

D34 avait recopié le transport Bing dans `console` et daté la mise en commun « après un inventaire de ce qui se répète vraiment ». L'inventaire est fait le 30/08 : `BING_API_BASE` existe en **trois** exemplaires (`strategy/scripts/keywords.ts`, `checklist/scripts/lib/actions.ts`, `console/scripts/lib/bing.ts`) et la table `BING_ERROR_CODES` en **deux** (`actions.ts` et `bing.ts` ; `keywords.ts` n'en a pas, il teste `/InvalidApiKey/` sur le texte de la réponse). Le niveau 1 ajouterait une copie de plus, deux jours avant l'échéance Bing du 31 août.

Correction du 30/08 : cette section annonçait d'abord trois copies de la table. C'était faux, relevé par la revue du plan et confirmé à l'exécution de la tâche 3, dont le diff sur `keywords.ts` ne fait que trois lignes. La décision ne change pas pour autant : une adresse d'API en trois exemplaires suffit à la justifier, et c'est elle que l'échéance Bing menace.

Décision de Romain le 30/08 : on solde. Le détail du déplacement est en section 3.

Ce qui monte : le transport et les primitives partagées. Ce qui reste chez chaque skill : les méthodes métier qui lui sont propres (les écritures `SubmitFeed` et le ping IndexNow restent dans `checklist`, D26 et D30 inchangées).

### D41. Les trois vérifications prennent un identifiant que le catalogue sait lire

`IDX-06` (pages indexées), `IDX-07` (canonical retenu par Google) et `STRAT-05` (requêtes réelles contre mot-clé visé), au lieu de `LVL1-03`, `LVL1-04` et `LVL1-05`.

Cause, trouvée par la revue du plan le 30/08 et reproduite : le lecteur de catalogue accepte les identifiants de la forme `[A-Z]+-\d{2}`. Le chiffre de `LVL1` casse le motif. `parseChecks` sur un bloc `### LVL1-03 : …` rend **zéro** entrée, et pire, absorbe ses champs comme lignes de continuation de la vérification précédente, qu'il corrompt. Trois vérifications sur quatre n'auraient pas existé, une existante aurait été faussée, et la suite serait restée verte.

Le même motif vit à sept endroits, dans quatre fichiers : `lib/checks.ts`, `lib/report.ts` (deux fois), `skills/audit/scripts/lint-report.ts` (trois fois) et `skills/build/scripts/lib/recipes.ts`. Le renommage ne touche aucun d'eux.

Battu : élargir le motif en `[A-Z][A-Z0-9]*-\d{2}` pour garder la nomenclature `LVL1-*`. Perd parce qu'il faudrait modifier sept expressions dans quatre fichiers, dont le lecteur de rapport partagé par `build` et `checklist`, deux chantiers déjà recettés, pour ne gagner qu'un nom. Le nouveau nommage est de surcroît plus cohérent avec le catalogue, qui range par thème et non par niveau : le niveau est déjà porté par le champ `Niveau`.

`LVL1-01` et `LVL1-02` gardent leur nom : hors périmètre (D35), ils ne sont cités qu'en prose dans `levels.md` et dans la section « Ce que je n'ai pas pu voir » des rapports, jamais comme entrée de catalogue. Le jour où ils y entreront, ils devront être renommés de la même façon.

## 3. Composants

### 3.1 Le commun, après déplacement

`plugin/lib/` ne dépend d'aucune skill. C'est la contrainte qui décide du découpage.

| Fichier | État | Contenu |
|---|---|---|
| `url.ts` | nouveau | `sameSite`, `pageKey`, `rewriteToOrigin`, extraits de `audit/scripts/lib/sitemap.ts` |
| `auth-google.ts` | déplacé de `skills/console/scripts/lib/` | inchangé |
| `gsc.ts` | déplacé, étendu | plus `searchAnalytics()` (section 4.3) |
| `bing.ts` | déplacé | inchangé |
| `resolve.ts` | déplacé | importe `./url` au lieu de la skill audit |
| `report.ts`, `strategy.ts` | existants | inchangés |

`url.ts` existe pour une seule raison : sans lui, `resolve.ts` monté dans le commun importerait `../skills/audit/scripts/lib/sitemap`, et le commun dépendrait d'une skill. Les trois fonctions extraites sont des primitives d'URL pures, sans rapport avec le format sitemap ; `sitemap.ts` les importe désormais de là.

Consommateurs à recâbler, tous par simple changement de chemin d'import : `skills/console/scripts/console.ts` et ses cinq modules, `skills/strategy/scripts/keywords.ts`, `skills/checklist/scripts/lib/actions.ts`, `skills/checklist/scripts/lib/ancien-sitemap.ts`, `skills/checklist/scripts/checklist.ts`, `skills/audit/scripts/collect.ts`, `skills/audit/scripts/lib/sitemap.ts`.

`keywords.ts` et `actions.ts` gardent leurs fonctions d'appel propres : seuls `BING_API_BASE`, `BING_ERROR_CODES`, `BingError`, `redact` et `parseDotNetDate` deviennent communs. On ne fusionne pas des flux métier différents pour le plaisir de la symétrie.

### 3.2 Le nouveau module de collecte

`skills/audit/scripts/lib/level1.ts`. Pur, sans accès direct au réseau ni à `process.env` : le `Fetcher`, le jeton et la clé entrent en paramètre, comme dans `console.ts`. C'est ce qui rend « aucune requête ne part sans `--level 1` » testable.

Une fonction d'entrée, `collectLevel1(deps, options) → Level1Result`, qui rend un objet sérialisable et la liste des fichiers bruts à écrire. Elle n'écrit rien elle-même : `collect.ts` reste seul maître du disque, comme pour le reste de la collecte.

### 3.3 `collect.ts`

Une branche de plus, après les sondes et avant le manifeste. Environ 30 lignes : monter le jeton et la clé, appeler `collectLevel1`, écrire `raw/gsc/`, `raw/bing/` et `derived/console.json`, poser le résultat dans le manifeste. `CollectOptions.level` passe de `0 | 2` à `0 | 1 | 2` ; `reserveOutDir` et `Manifest.level` acceptent déjà les trois valeurs.

### 3.4 Le catalogue

Pas de nouveau fichier de références : chaque vérification rejoint son thème.

| Id | Fichier | Niveau | Couche | Sévérité |
|---|---|---|---|---|
| IDX-06 | `checks/indexability.md` | 1 | absolue | Critique |
| IDX-07 | `checks/indexability.md` | 1 | absolue | Important |
| STRAT-05 | `checks/strategy.md` | 1 | stratégique | Important |
| AI-03 | `checks/ai-presence.md` | 1 | absolue | Mineur |

Justification des sévérités, à contester à la relecture si elle ne va pas : une page absente de l'index ne peut recevoir aucun trafic, rien n'est plus grave (Critique) ; un canonical divergent et une stratégie qui vise à côté coûtent des positions sans rien casser (Important) ; l'absence de l'index Bing prive de Copilot, ce qui compte pour le GEO mais pèse peu en France, et reste cohérent avec AI-01 (Info) et AI-02 (Mineur).

`references/levels.md` est mis à jour : la ligne « Niveau 1, à livrer au chantier 5 » devient la liste livrée, et LVL1-01 et LVL1-02 sont nommés comme hors périmètre avec leur raison.

## 4. Ce que la collecte demande

### 4.1 Résolution des accès

La propriété Search Console est résolue par `resolveProperty()` depuis `sites.list`, jamais construite (D33). Le site Bing par `resolveBingSite()`. Si l'un des deux ne résout pas, sa moitié du niveau 1 est non vue, et l'autre continue.

### 4.2 Inspection d'URL

Une requête `urlInspection.index.inspect` par page de la collecte, dans l'ordre où `collect.ts` les a déjà retenues (home, pages de la stratégie, `--page`, sitemap), plafonnée par `--max-pages`. Sert IDX-06 et IDX-07.

Quota documenté par Google : 2000 par jour et par propriété, 600 par minute. À 10 pages par défaut, la marge est de deux ordres de grandeur. Le délai de 250 ms déjà appliqué entre pages est conservé.

Réponse brute dans `raw/gsc/inspect/<slug>.json`, avec le même `slugFor()` que `raw/pages/<slug>.html` : un seul mécanisme de nommage dans la collecte, et les deux fichiers d'une même page se retrouvent à l'œil.

### 4.3 Requêtes réelles

Deux appels `searchAnalytics.query` sur 90 jours, `type: "web"` explicite pour que `raw/` soit rejouable :

1. `dimensions: ["date"]` : donne le dernier jour avec données, donc la fraîcheur réelle (section 5.3), et le volume de la période.
2. `dimensions: ["page", "query"]`, `rowLimit: 1000` : sert STRAT-05. Si la réponse atteint 1000 lignes, le rapport le dit et ne conclut pas sur l'exhaustivité. Pas de pagination : au-delà, le constat ne change pas.

Requête et réponse dans `raw/gsc/searchanalytics-<dimensions>.json`, la requête comprise : sans elle, la réponse n'est pas rejouable.

### 4.4 Bing

`GetUrlInfo` par page, même plafond et même nommage (`raw/bing/urlinfo/<slug>.json`). Sert AI-03.

`GetUserSites` est appelé pour résoudre le site ; sa réponse est gardée dans `raw/bing/`.

`GetFeeds` n'est **pas** appelé. Corrigé le 30/08 après la revue du plan, qui a relevé qu'aucune tâche ne l'appelait alors que cette section l'exigeait : il n'est pas nécessaire à la résolution du site, et les sitemaps sont déjà collectés côté Google et côté site. Le verbe `console crawl` couvre ce besoin quand il se présente.

### 4.5 Ce qui n'est pas demandé

Ni `sitemaps.submit`, ni `SubmitFeed`, ni `SubmitUrlBatch`, ni le ping IndexNow. Le niveau 1 est une lecture. Les deux seules écritures du plugin restent dans `checklist --agir` (D26).

## 5. Les quatre vérifications

### 5.1 IDX-06, pages indexées

Compte les verdicts d'inspection sur les pages collectées, et nomme celles qui ne sont pas indexées avec leur `coverageState` traduit. Trouvaille dès qu'une page du sitemap ou de `strategy.md` n'est pas indexée ; passée si toutes le sont ; non vue si l'accès manque.

Le rapport dit toujours sur combien de pages porte le compte, et que ce n'est pas le total du site : `--max-pages` plafonne.

### 5.2 IDX-07, canonical choisi par Google

Trouvaille si `googleCanonical` et `userCanonical` sont tous deux renseignés et diffèrent, avec les deux adresses. `canonicalMismatch()` est déjà écrit et testé.

Cas particulier à traiter explicitement : `userCanonical` absent (aucune balise canonique déclarée) n'est pas une divergence, c'est le domaine de TAG-03 au niveau 0. Ne pas doubler la trouvaille.

### 5.3 STRAT-05, mots réels contre mots visés

Pour chaque page de `strategy.md` présente dans la réponse `page × query` : le mot-clé visé apparaît-il dans les requêtes réelles de cette page ? Trouvaille si la page a des impressions et que le mot visé n'y figure pas, avec les trois premières requêtes réelles à la place. Passée s'il y figure. Non vue si la page n'a aucune impression sur la période, ce qui est une information distincte et doit être dit comme tel.

La comparaison est faite sur une normalisation simple (minuscules, accents retirés, espaces réduits) et cherche une inclusion, pas une égalité : « bon pote nantes » couvre le mot visé « bon pote ». Le seuil est volontairement grossier ; un faux positif se lit dans le rapport, qui cite toujours les requêtes réelles.

### 5.4 AI-03, présence dans l'index Bing

Une page est connue de Bing si `GetUrlInfo` rend un objet dont `LastCrawledDate` n'est pas la sentinelle `DateTime.MinValue` (`DATE_JAMAIS`, déjà constante dans `bing.ts`, capturée le 29/08). Trouvaille si des pages sont inconnues, avec leur liste. `HttpStatus` n'est jamais présenté : il vaut 0 même sur une page indexée (constat du 29/08).

## 6. Erreurs et dégradation

Le niveau 1 ne fait jamais échouer l'audit. Toute panne d'accès se traduit par des vérifications non vues, avec leur raison en une phrase, dans « Ce que je n'ai pas pu voir ».

| Panne | Effet | Message |
|---|---|---|
| Aucun jeton Google | IDX-06, 04, 05 non vues | la consigne de `LOGIN_HINT` |
| `GSC_QUOTA_PROJECT` absente | idem | la consigne de `QUOTA_HINT` |
| Propriété introuvable dans `sites.list` | idem | « aucune propriété Search Console ne couvre cette URL » |
| Rôle insuffisant (403) | idem | « le rôle de ce compte ne permet pas cette lecture » |
| `BING_WMT_API_KEY` absente | AI-03 non vue | « clé Bing absente » |
| Site hors du compte Bing | AI-03 non vue | « ce site n'est pas dans le compte Bing » |
| Une page en échec, les autres non | cette page seule est non vue | l'erreur, par page |

Les deux lignes Bing et celle du rôle insuffisant sont exerçables sur les comptes réels : `sc-domain:healthincloud.app` est en `siteUnverifiedUser` et refuse ses sitemaps (section 11.5), et chico n'est dans aucun des deux comptes. Attention, `healthincloud.app` ne sert plus qu'à observer le refus par `console sites` : le site est hors ligne depuis le 30/08 et aucun audit ne peut plus s'y dérouler.

Le décodage des refus est déjà écrit et recetté dans `gsc.ts` et `bing.ts` : cette spec n'en ajoute aucun, elle les fait remonter dans le manifeste.

## 7. Secrets

Aucun jeton, aucune clé, aucun chemin de fichier de clé n'entre dans `raw/`, dans `derived/`, dans le manifeste ni dans le rapport. Les requêtes conservées pour la rejouabilité gardent le corps et les dimensions, jamais l'en-tête `authorization` ni le paramètre `apikey`.

`assertNoSecret` est appliqué au manifeste et à `derived/console.json` avant écriture, sur la clé Bing et sur le jeton, comme `console.ts` le fait sur sa sortie écran.

Une URL Bing porte la clé en paramètre : ce qui est écrit dans `raw/bing/` est le corps de la réponse et le nom de la méthode, jamais l'URL appelée.

## 8. Tests

Le motif du repo est déjà celui qu'il faut : `Fetcher` injecté, aucune sortie réseau en test.

- `level1.ts` : les quatre vérifications sur des réponses forgées à partir des captures réelles de la section 11, plus chaque ligne du tableau de dégradation de la section 6.
- `collect.ts` : sans `--level 1`, le `Fetcher` des consoles n'est jamais appelé. C'est le test qui garde D37.
- Les modules déplacés gardent leurs tests, déplacés avec eux. Aucun test n'est réécrit à l'occasion du déplacement : un test qui change de sens pendant un déménagement ne prouve plus rien.
- Le filet anti-tiret cadratin couvre les nouvelles sorties.
- `check-sources.ts` retrouve les citations des quatre nouvelles vérifications.

Pas de test qui gèle un compte de vérifications ni un instantané de catalogue : la règle du projet, et ces tests casseraient au premier ajout légitime.

## 9. Critères d'acceptation

Recette jouée sur les comptes réels de Romain, depuis un dossier de site, après `source ~/.zshenv`.

**AC-1. Le niveau 1 produit une collecte complète.**
Quand `collect.ts <url> --level 1` tourne sur `https://www.romain-ecarnot.com/`, alors un dossier `seo/audits/<date>-n1/` existe, contient tout ce que produit le niveau 0, plus `raw/gsc/`, `raw/bing/` et `derived/console.json`, et le manifeste porte `level: 1`.
Vérifié par : la commande, puis `ls -R seo/audits/<date>-n1/` et `jq .level seo/audits/<date>-n1/raw/manifest.json`.

**AC-2. Sans `--level 1`, aucune requête ne part vers les consoles.**
Quand un audit tourne sans le drapeau, alors aucun appel à Search Console ni à Bing n'est émis, et le rapport nomme les quatre vérifications parmi celles qu'il n'a pas pu voir.
Vérifié par : le test unitaire de `collect.ts` (le `Fetcher` des consoles est un espion qui échoue s'il est appelé), plus l'absence de `raw/gsc/`, de `raw/bing/` et de `derived/console.json` dans le dossier d'un audit lancé sans le drapeau.

**AC-3. IDX-06 compte les pages réellement indexées.**
Quand la collecte porte sur une propriété accessible, alors le rapport donne le nombre de pages indexées sur le nombre inspecté, nomme celles qui ne le sont pas avec leur état, et ne présente jamais le champ `indexed` de `sitemaps.list` comme un compte.
Vérifié par : le rapport, plus `jq '.[].status.coverageState' derived/console.json` confronté à `raw/gsc/inspect/*.json`.

**AC-4. IDX-07 voit une divergence de canonical, ou dit qu'il n'y en a pas.**
Quand `googleCanonical` et `userCanonical` diffèrent sur une page, alors le rapport en fait une trouvaille citant les deux adresses ; quand ils sont égaux sur toutes les pages, la vérification est passée ; quand `userCanonical` est absent, la vérification ne produit rien et laisse le sujet à TAG-03.
Vérifié par : le rapport sur romain-ecarnot.com (les deux sont égaux ce jour, donc « passée »), plus un test unitaire sur une réponse forgée divergente et une réponse sans `userCanonical`.

**AC-5. STRAT-05 confronte les mots réels aux mots visés, et seulement avec une stratégie.**
Quand `seo/strategy.md` existe, alors le rapport dit pour chaque page prévue si son mot-clé apparaît dans ses requêtes réelles, et cite les requêtes réelles sinon ; quand il n'existe pas, STRAT-05 figure dans « Ce que je n'ai pas pu voir ».
Vérifié par : deux passages, l'un avec `--strategy-path none`, l'autre sans, et la lecture des deux rapports.

**AC-6. AI-03 dit quelles pages Bing connaît.**
Quand le site est dans le compte Bing, alors le rapport liste les pages inconnues de l'index Bing, en se fondant sur la sentinelle de date et jamais sur `HttpStatus`.
Vérifié par : le rapport sur lebonpote.romain-ecarnot.com, plus `jq '.[].LastCrawledDate' raw/bing/urlinfo/*.json`.

**AC-7. Un accès refusé est nommé, jamais confondu avec une absence.**
Quand la collecte porte sur une propriété dont le rôle ne permet pas la lecture, alors le refus est nommé dans `derived/console.json` avec sa raison, et il n'est jamais présenté comme « aucun sitemap déclaré ».
Vérifié par : le test unitaire de `level1.ts` qui force `listSitemaps` à rendre 403 et exige le message dans `sitemapsError`, plus, sur le compte réel, `console sites` qui rend « sitemaps non lisibles pour cette propriété » sur `sc-domain:healthincloud.app` (rôle `siteUnverifiedUser`).

Révisé le 30/08 : le critère exigeait d'abord « le rapport complet du niveau 0 » lors d'une collecte sur `healthincloud.app`. Romain a mis ce site hors ligne volontairement, et il ne répond plus (HTTP 000 mesuré le 30/08). La **propriété** Search Console, elle, existe toujours et refuse toujours ses sitemaps : le cas de refus de droits reste donc observable sur du réel, mais il ne peut plus être observé au travers d'un audit complet, faute de site à auditer. La garantie « l'audit ne meurt pas » est portée par AC-8, sur un site en ligne.

**AC-8. Un site hors des deux comptes dégrade proprement, et l'audit se termine.**
Quand la collecte porte sur un site en ligne absent des deux consoles, alors l'audit se termine avec un **code de sortie 0**, le **rapport complet du niveau 0 est produit**, et les vérifications du niveau 1 sont non vues avec deux raisons distinctes : « aucune propriété Search Console ne couvre cette URL » et « ce site n'est pas dans le compte Bing ».
Vérifié par : la commande sur `commentchercherbonheur.org`, qui est en ligne et dans aucun des deux comptes, `echo $?` qui rend 0, et la lecture du rapport.

Ce critère porte désormais la garantie « le niveau 1 ne fait jamais échouer l'audit » que portait AC-7 avant sa révision : c'est le seul cas réel restant où un site vivant rencontre un accès manquant. Un test unitaire de `collect.ts` la garde en plus, en simulant une panne de la branche elle-même.

**AC-9. La fraîcheur des données est écrite.**
Quand le rapport présente des chiffres de requêtes, alors il nomme le dernier jour couvert par les données, distinct de la date de l'audit.
Vérifié par : le rapport, dont la date de fraîcheur doit correspondre à la dernière ligne de `raw/gsc/searchanalytics-date.json` (attendu : environ 3 jours avant l'audit).

**AC-10. Aucun secret sur le disque.**
Quand la collecte est terminée, alors ni le jeton, ni la clé Bing, ni le chemin d'une clé de compte de service n'apparaissent dans le dossier d'audit.
Vérifié par : `[ -n "$BING_WMT_API_KEY" ] && command grep -rl "$BING_WMT_API_KEY" seo/audits/<date>-n1/` qui ne rend rien (la garde `[ -n ]` est obligatoire : sur une variable vide, `grep` chercherait la chaîne vide et rendrait tous les fichiers), et une recherche de `ya29.`, de `authorization` et de `apikey=` sur tout le dossier, qui ne rend rien.

**AC-11. La mise en commun ne casse rien.**
Quand les briques sont déplacées dans `plugin/lib/`, alors la suite de tests reste verte et les trois skills qui les consomment fonctionnent sur les comptes réels.
Vérifié par : `bun test` (au moins les 375 tests actuels, aucun échec), puis `console sites`, `keywords.ts` sur un mot, et `checklist` sans `--agir`, tous trois avec le même résultat qu'avant le déplacement.

## 10. Hors périmètre

- **LVL1-01 et LVL1-02**, les deux rapports IA (D35). Format relevé en section 11.7 pour la reprise.
- **Le compte de service.** Le fournisseur `gcloud` reste celui de l'usage courant ; `GSC_SA_KEY_FILE` est déjà codé et testé mais n'est pas recetté ici. La permission minimale pour l'inspection reste l'incertitude 1 de la note d'idéation, non levée.
- **La pagination de `searchanalytics`** au-delà de 1000 lignes.
- **Les autres méthodes Bing** (`GetPageStats`, `GetPageQueryStats`, `GetQueryStats`) : elles doubleraient STRAT-05 côté Bing. À reprendre quand un site aura de l'historique.
- **`GetCrawlStats` et `GetCrawlIssues` non vides** : incertitude 2 de l'étape 1, toujours ouverte, les deux sites étant trop récents.
- **Un verbe de rapport comparatif Google contre Bing** (l'étalon de la note du 27/08).

## 11. Échantillons capturés le 30/08

Tous obtenus sur les comptes réels de Romain, par la CLI `console` ou par une sonde jetable utilisant les modules du plugin. Aucun n'est reconstruit.

### 11.1 `urlInspection.index.inspect`, HTTP 200

Sur `https://www.romain-ecarnot.com/`, propriété `sc-domain:romain-ecarnot.com`, rôle `siteOwner` :

```json
{
  "verdict": "PASS",
  "coverageState": "Submitted and indexed",
  "robotsTxtState": "ALLOWED",
  "indexingState": "INDEXING_ALLOWED",
  "lastCrawlTime": "2026-08-27T13:07:59Z",
  "pageFetchState": "SUCCESSFUL",
  "googleCanonical": "https://www.romain-ecarnot.com/",
  "userCanonical": "https://www.romain-ecarnot.com/",
  "crawledAs": "MOBILE"
}
```

Les deux canonicals sont égaux : IDX-07 sera « passée » sur ce site, et la divergence devra être testée sur une réponse forgée.

### 11.2 `searchAnalytics.query`, page × query, HTTP 200

90 jours, `dimensions: ["page", "query"]`. `responseAggregationType: "byPage"`. Quatre lignes :

```json
{"keys": ["https://www.romain-ecarnot.com/", "ecarnot"], "clicks": 0, "impressions": 2, "ctr": 0, "position": 10}
```

Forme confirmée : `keys` dans l'ordre des dimensions demandées, quatre métriques en nombres, `ctr` en fraction (0 à 1) et non en pourcentage. À ne pas confondre avec l'export CSV, qui écrit `0%`.

### 11.3 `sitemaps.list` : `indexed` n'est pas alimenté

```json
{
  "path": "https://lebonpote.romain-ecarnot.com/sitemap.xml",
  "lastSubmitted": "2026-04-30T16:13:26.601Z",
  "lastDownloaded": "2026-05-01T18:06:47.626Z",
  "warnings": "0", "errors": "0", "isPending": false,
  "contents": [{"type": "web", "submitted": "1", "indexed": "0"}]
}
```

Observé identique sur les deux propriétés qui portent ce sitemap (la propriété Domaine et la propriété Préfixe). La page concernée reçoit 6 impressions sur 90 jours selon l'export Google du même jour : elle est indexée, et `indexed` dit `"0"`. Fonde D39, lève l'incertitude 4.

### 11.4 Le type IA est refusé par l'API

`type: "GENERATIVE_AI"` sur `searchAnalytics.query` :

```json
{"error": {"code": 400, "status": "INVALID_ARGUMENT",
 "message": "Invalid value at 'type' (type.googleapis.com/google.searchconsole.v1.searchanalytics.SearchType), \"GENERATIVE_AI\""}}
```

Fonde D35, avec le constat d'interface (menu, filtre « Type de recherche » limité à Web, Image, Vidéo, Actualités, et « Ajouter un filtre » limité à Requête, Page, Pays, Appareil).

### 11.5 Rôle insuffisant, cas de dégradation réel

`console sites` sur `sc-domain:healthincloud.app`, rôle `siteUnverifiedUser` : « sitemaps non lisibles pour cette propriété ». Sert AC-7 sans rien avoir à fabriquer.

Mesuré à nouveau le 30/08 à 13 h 21, après que Romain a mis le site hors ligne : la **propriété** répond toujours et refuse toujours ses sitemaps, alors que `curl https://healthincloud.app/` rend **HTTP 000**, injoignable. Une propriété Search Console survit donc au site qu'elle décrit, ce qui est utile à savoir pour un audit d'agence : les données de la console restent lisibles après la mise hors ligne d'un site.

### 11.6 Fraîcheur et rétention

Appel du 30/08, `dimensions: ["date"]` : la dernière ligne rendue est le **27/08**. Le délai est donc d'environ trois jours. `dataState: "final"` et `dataState: "all"` rendent le même dernier jour : sur cette propriété, l'un n'anticipe pas l'autre.

Demande depuis le 2024-08-30 : la première ligne rendue est le **2025-10-12**. Ce n'est pas une mesure de la rétention, seulement l'âge des données de cette propriété. L'incertitude 5 de la note d'idéation est donc **reformulée**, pas levée : le délai est mesuré (trois jours), la limite des 16 mois ne l'est pas.

### 11.7 Format des exports CSV, pour la reprise de D35

Relevé sur les deux exports réels de Romain du 30/08, conservés dans `docs/recherches/`.

**Google.** Un fichier `.zip` nommé `<propriété>-Performance-on-Search-<AAAA-MM-JJ>.zip`, contenant sept CSV dont les noms sont **traduits dans la langue de l'interface** (ici `Graphique.csv`, `Requêtes.csv`, `Pages.csv`, `Pays.csv`, `Appareils.csv`, `Apparence dans les résultats de recherche.csv`, `Filtres.csv`). UTF-8 **sans** BOM, fins de ligne **LF**, séparateur virgule, guillemets seulement si nécessaire. Colonnes `Clics,Impressions,CTR,Position`, le CTR écrit en pourcentage (`33.33%`), la position en décimal, cellules vides les jours sans donnée. La première colonne change de nom selon l'onglet.

`Filtres.csv` porte l'état du rapport exporté et **est le garde-fou** d'un futur lecteur :

```
Filtre,Valeur
Type de recherche,Web
Date,Les 3 derniers mois
```

Un lecteur devra refuser tout export dont ce fichier ne prouve pas le rapport attendu. La valeur qui marque le rapport Generative AI reste inconnue : aucune propriété accessible ne l'a.

Piège relevé : les noms accentués font échouer `unzip` en ligne de commande (`write error`), là où `ditto -x -k` les extrait correctement. Un lecteur écrit en TypeScript devra décoder lui-même les noms d'entrée du zip.

**Bing.** Un CSV nu, `<domaine>_AIPerformanceOverviewStats_<JJ_MM_AAAA>.csv`. UTF-8 **avec** BOM (`EF BB BF`), fins de ligne **CRLF**, toutes les valeurs entre guillemets. En-tête `"Date","Citations","Cited Pages"`, et **zéro ligne de données** sur le compte de Romain. Le format des valeurs est donc inconnu.

## 12. Incertitudes

1. **Permission minimale pour l'inspection d'URL.** Non levée, reprise de l'étape 1. Toutes les captures sont en rôle propriétaire.
2. **`GetCrawlStats` et `GetCrawlIssues` non vides.** Non levée, les deux sites Bing sont trop récents.
3. **Rétention de `searchAnalytics`.** Reformulée en 11.6 : le délai est mesuré, la limite ne l'est pas.
4. **Survie de l'endpoint JSON Bing après le 31 août.** Sonde prévue le 1er septembre, à jouer avant la recette si le chantier va jusque-là. D40 réduit le coût d'un correctif éventuel à un seul fichier.
5. **Valeur du filtre marquant le rapport Generative AI.** Inconnue, sans conséquence tant que D35 tient.

## 13. Prérequis hors code

Déjà posés par Romain, vérifiés le 30/08 : `GSC_QUOTA_PROJECT` dans `~/.zshenv`, API Search Console activée sur ce projet, `BING_WMT_API_KEY` valide, deux sites vérifiés dans Bing Webmaster Tools.

Rien de nouveau n'est demandé.
