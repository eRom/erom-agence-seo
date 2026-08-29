---
title: erom-seo, chantier 4 : le verbe checklist
date: 2026-08-29
status: proposed
project: erom-agence-seo
spec_mere: docs/superpowers/specs/2026-08-27-erom-seo-design.md
notes_liees:
  - docs/superpowers/specs/2026-08-28-erom-seo-build-design.md
  - docs/superpowers/plans/2026-08-28-erom-seo-chantier-3-recette.md
  - docs/recherches/2026-08-29-niveau-1-apis.md
  - .claude/notes/2026-08-27-reprise-2120.md
cobaye: /Users/recarnot/dev/chico-happiness (commentchercherbonheur.org, Next.js 16, build fusionné et déployé le 29/08, audit n2 à 0 Critique 0 Important, IDX-04 réglé en 308)
---

# erom-seo, chantier 4 : `checklist`

Cette spec porte le chantier 4 de l'ordre D8 de la spec mère. La spec mère l'appelait `launch` (section 6.3 : « Écrit `seo/launch.md`, deux listes à cocher, chaque ligne avec sa façon de vérifier »). Le nom change (D23), le fond reste : une liste à cocher, avant et après le déploiement, chaque ligne avec sa preuve. Elle précise la spec mère là où le chantier 4 la touche et ne la répète pas. Décisions prises avec Romain le 2026-08-29 entre 13 h 16 et 13 h 52 ; amendée à 14 h 10 d'après la note de recherche `docs/recherches/2026-08-29-niveau-1-apis.md` (session d'idéation, même jour) : méthodes Bing confirmées sur la doc officielle, modèle d'accès agence, ce qui restera à la main par construction.

## 1. But

Fermer le cycle après `build`. `build` laisse un code corrigé sur une branche, un audit niveau 2 vert et une liste de « hors build ». Entre ce moment et le jour où le site reçoit ses premières impressions, il y a une vingtaine de gestes à faire dans le bon ordre : fusionner, régler l'hébergeur, créer les consoles, déployer (hors périmètre), vérifier que la prod sert bien ce que le code promet, prévenir les moteurs, puis suivre à J+1, J+3, J+7, J+30, J+90. Aujourd'hui ces gestes sont dans la tête de Romain. Le chantier 4 les met dans un fichier que le plugin tient à jour.

Deux contraintes propres à ce verbe :

- **La skill ne déploie rien et ne lance rien.** Le déploiement (Vercel, Netlify, autre) reste le geste de Romain. La skill passe avant et après ; jamais à la place (D23).
- **Le juge reste l'audit.** Ce que le code promet et ce que la prod sert se mesurent par un audit, niveau 2 en local avant, niveau 0 sur la prod après. Le script de la checklist lit les rapports ; il ne refait aucune vérification de l'audit (D24).

## 2. Décisions

### D23. Le verbe s'appelle `checklist` ; il ne déploie ni ne lance rien

`/erom-seo:checklist`, dossier `skills/checklist/`, fichier `seo/checklist.md`. Le déploiement n'est pas dans le périmètre du plugin : « On ne launch que dalle » (Romain, 29/08, 13 h 44).

Battu : `launch`, le nom de la spec mère. Perdu parce qu'il prétend une action que la skill ne fait pas. `preflight`, joli, perdu parce que la moitié « après le déploiement » n'est plus du preflight.

### D24. L'audit juge, le script écrit la checklist

`checklist` lance un audit quand il en faut un (niveau 0 sur la prod, après le déploiement) et lit le dernier rapport de chaque niveau. Un script, `checklist.ts`, transforme rapport + stratégie + git + ancien fichier en un `seo/checklist.md` frais. Même doctrine que `build` (spec chantier 3, D17 et D18) : le script ne juge pas, il coche d'après le rapport.

Battu : une skill sans script (Claude fait des `curl` et écrit le fichier à la main). Perdu parce que non reproductible, les cases bougent d'un passage à l'autre, rien n'est testable. Un script avec ses propres `curl`, perdu parce qu'il recopie dix vérifications de l'audit qu'il faudrait maintenir deux fois.

### D25. Deux moitiés, un seul fichier, relançable sans peur

Le fichier porte deux sections, « Avant le déploiement » et « Après le déploiement ». La skill se relance autant de fois qu'on veut ; à chaque passage elle regarde où on en est et fait ce qui est possible. L'état, c'est le fichier : la date de mise en ligne, les cases, les preuves. Trois sortes de lignes :

- `auto` : le script coche d'après le rapport ou git. Une case `auto` peut redevenir vide si la source a régressé : c'est le but.
- `main` : Romain coche, dans le fichier ou en le disant à la skill. Le script ne décoche jamais une case `main`.
- `action` : le script agit (D26), puis coche avec la réponse HTTP.

Le suivi J+N vit dans ce fichier seul : dates calculées depuis « Mise en ligne », relire `/erom-seo:checklist` le jour venu.

Battu : des rappels dans l'agenda Google créés par la skill (question 3, option B). Perdu parce que ça ajoute une dépendance à un MCP présent dans la session de Romain seulement, et rien à synchroniser quand tout est dans le repo du site.

### D26. Aucune écriture sans `--agir` ; deux actions, pas plus

Sans le drapeau `--agir`, un passage de `checklist.ts` ne fait que des lectures : l'ancien sitemap (D28) et, si `BING_WMT_API_KEY` est là, `GetUserSites` chez Bing (« Get user sites », `IWebmasterApi`) pour savoir si le site est dans le compte. Avec `--agir`, passé par la skill après avoir dit à Romain ce qu'elle va envoyer, deux écritures et deux seulement :

1. le ping IndexNow (une requête, la clé de `seo/strategy.md`, les URL du sitemap de prod que l'audit vient de collecter) ;
2. la soumission du sitemap à Bing Webmaster Tools, méthode `SubmitFeed(siteUrl, feedUrl)` (« Submits feed », `IWebmasterApi`), par l'API JSON déjà utilisée par `keywords.ts` (`ssl.bing.com/webmaster/api.svc/json`, clé `BING_WMT_API_KEY`).

Google Search Console reste à la main, et pas seulement en attendant le chantier 5 : la note du 29/08 (section 5) fixe que le jeton de l'agence sera toujours demandé en `webmasters.readonly`, donc `sitemaps.submit` est refusé par construction ; le clic de soumission reste au propriétaire de la propriété. Même logique chez Bing pour un site client : le client délègue en lecture seule au compte de l'agence, et `SubmitFeed` sera refusé ; la ligne le dit et donne le clic au client. Sur les sites de Romain, le compte est propriétaire et l'action passe. Chaque action se fait une fois par mise en ligne ; la refaire demande `--agir` à nouveau et la skill le dit.

Battu : « regarder seulement » (question 2, option A). Perdu parce que les deux gestes sont gratuits, déjà outillés (clé Bing en place, clé IndexNow déposée par `build`), et sont exactement le J+1 de la liste.

### D27. Les lignes sont fixes, reconnues par leur libellé

La liste des lignes est une table du script (`LINES`), dans un ordre fixe. En relisant l'ancien `seo/checklist.md`, le script reconnaît chaque ligne à son libellé, jamais à sa position. Une ligne dont le libellé n'est dans la table ni dans les sous-lignes attendues est une erreur : le script s'arrête sans rien réécrire. Même raison que D10 du chantier 2 : un Markdown lu par un script est strict, sinon il ment en silence.

### D28. Le site repris est une option, et c'est la seule vérification neuve du script

`--ancien-sitemap <url>` déclare un site repris. Le script télécharge le sitemap, en garde une copie dans `seo/checklist/ancien-sitemap.xml`, et après le déploiement suit chaque URL : attendu, une redirection 301 ou 308 (une ou plusieurs) qui finit sur une page en 200 du nouveau site. C'est la seule vérification que le script fait lui-même, parce que l'audit ne connaît pas l'ancien site. Sans l'option, les deux lignes « ancien site » sont cochées « sans objet ».

Battu : demander « il y a un ancien site ? » à chaque passage. Perdu parce qu'une fois déclaré, l'ancien sitemap est dans `seo/` et le fichier s'en souvient.

## 3. Composants

```
plugin/
  lib/
    report.ts                       inchangé (parseReport, latestAuditDir)
    strategy.ts                     inchangé (parseStrategy : site, indexnow, pages)
  skills/
    checklist/
      SKILL.md                      le verbe, cinq temps (section 7)
      scripts/
        checklist.ts                CLI : lit, agit si --agir, réécrit seo/checklist.md
        lib/
          checklist.ts              LINES, parse et rendu du fichier, calcul des cases auto
          actions.ts                ping IndexNow, soumission Bing ; fetch injectable
          ancien-sitemap.ts         suivi des redirections de l'ancien sitemap ; fetch injectable
        tests/
          checklist.test.ts
          actions.test.ts
          ancien-sitemap.test.ts
          checklist-cli.test.ts
          fixtures/chico/           report-n2.md, report-n0.md, strategy.md, checklist.md, sitemap.xml
      references/
        consoles.md                 chemins de clics et sources officielles (section 6)
  skills/audit/scripts/check-sources.ts   étendu aux citations de consoles.md
```

Réutilisé tel quel : `fetchChain` et `text` de `skills/audit/scripts/lib/fetch.ts` (suivi de chaîne de redirections), `parseSitemap` et `decodeSitemapBody` de `skills/audit/scripts/lib/sitemap.ts`, la table `KINDS` de `skills/build/scripts/lib/plan.ts` (quelles trouvailles sont hors build).

## 4. Le fichier `seo/checklist.md`

Strict : un script l'écrit, le même le relit. Une case par ligne, trois sortes (D25), une preuve ou une consigne sur chaque ligne. Jamais de tableau (lecture sur mobile). Jamais de secret.

### 4.1 En-tête

```
# Checklist SEO/GEO : <site>
Mise en ligne : <AAAA-MM-JJ | non> · Dernier passage : <AAAA-MM-JJ> · Audit local : <dossier | aucun> · Audit prod : <dossier | aucun>
```

`<site>` est le titre de `seo/strategy.md`. « Audit local » est le dernier `seo/audits/*-n2*/` ; « Audit prod » le dernier `*-n0*/` postérieur ou égal à la date de mise en ligne (un n0 plus ancien est celui du site d'avant, il ne compte pas).

### 4.2 Grammaire d'une ligne

```
- [ ] <libellé> · <auto|main|action> · <preuve ou consigne>
  - <sous-ligne>
```

Le libellé est celui de la table `LINES`, au caractère près. La preuve d'une case `auto` nomme le fichier ou la commande qui la justifie. La consigne d'une case `main` est le chemin de clics, court ; la version longue est dans `references/consoles.md`. Une case `action` cochée porte la date et la réponse (`200, 14 URL`) ; vide, elle porte la raison (`en attente : …` ou `422, clé refusée : …`). Les sous-lignes servent aux listes : hors build avec leur `ou`, URL de l'ancien sitemap en défaut, pages clés à inspecter.

### 4.3 Les lignes, dans l'ordre

Avant le déploiement :

1. **Audit niveau 2 vert** · auto · coché si le dernier n2 a 0 Critique et 0 Important ; preuve : le chemin du rapport et les comptes. Pas de n2 : vide, « aucun audit niveau 2 : lance `/erom-seo:build` ».
2. **Branche seo-build fusionnée** · auto · coché si la branche courante est `main` ou `master` et que `git log --grep="^seo(" -1` y rend un commit ; preuve : ce commit. Sur une branche `seo-build-*` : vide, « tu es sur `seo-build-…`, fusionne d'abord ».
3. **Hors build réglés** · main · sous-lignes : les trouvailles hors build (table `KINDS`) du dernier audit n0 s'il en existe un, chacune avec son `ou`. Aucun n0 ou aucune trouvaille hors build : « aucune trouvaille hors build connue ». Après le déploiement, la ligne « Prod verte » couvre le même terrain (IDX-03 et IDX-04 sont évaluées au niveau 0) ; celle-ci reste ce que Romain en a fait.
4. **Search Console : propriété créée** · main · « search.google.com/search-console, Ajouter une propriété, type Domaine, enregistrement TXT chez le registrar » (marche avant le déploiement). Sous-ligne pour un site client : « ajouter le compte de l'agence comme utilisateur de la propriété (rôle minimal, note du 29/08, section 5) ».
5. **Bing Webmaster Tools : site ajouté** · auto si `BING_WMT_API_KEY` est là (le site est dans `GetUserSites` ; preuve : « présent dans le compte Bing de l'agence le <date> »), main sinon · « bing.com/webmasters, Ajouter un site, Importer depuis Google Search Console ». Sous-ligne pour un site client : « le client délègue le site en lecture seule au compte de l'agence (écran Users) ; ne jamais demander sa clé ».
6. **Ancien sitemap sauvegardé** · auto · coché avec le chemin `seo/checklist/ancien-sitemap.xml` et le nombre d'URL ; sans `--ancien-sitemap` : coché « sans objet (pas d'ancien site) ».

Après le déploiement (toutes vides tant que « Mise en ligne : non ») :

7. **Prod verte** · auto · coché si le dernier audit n0 postérieur à la mise en ligne a 0 Critique et 0 Important ; preuve : chemin et comptes. Sinon vide, avec la ligne « En bref » du rapport.
8. **Redirections de l'ancien site** · auto · coché si chaque URL de l'ancien sitemap finit en 200 après 301 ou 308 uniquement ; vide sinon, une sous-ligne par URL en défaut (`<url> → <code final>` ou `→ 302 puis 200`). Sans ancien site : « sans objet ».
9. **Ping IndexNow** · action · voir 5.3.
10. **Sitemap soumis à Bing** · action · voir 5.3 ; « en attente : Bing Webmaster Tools pas encore configuré » tant que la ligne 5 est vide ; refus de Bing (délégation lecture seule sur un site client) : la ligne devient une consigne, « à faire par le client : bing.com/webmasters, Sitemaps, Soumettre `/sitemap.xml` ».
11. **J+1 <date> : sitemap soumis dans Search Console** · main · « Search Console, Sitemaps, coller `/sitemap.xml` » ; par le propriétaire de la propriété, par construction (D26).
12. **J+3 <date> : pages clés indexées** · main · « Search Console, Inspection d'URL » ; sous-lignes : les pages de `seo/strategy.md`, en URL absolues. Le chantier 5 rendra cette ligne `auto` (`urlInspection.index.inspect`, note du 29/08, section 3.2).
13. **J+7 <date> : premières impressions** · main · « Search Console, Performances, 7 derniers jours ».
14. **J+30 <date> : rapports IA lus** · main · « Search Console, Performances, filtre Generative AI (pas sur toutes les propriétés) ; Bing Webmaster Tools, AI Performance ». Ces deux rapports sont hors API (note du 29/08, sections 2 et 4) : ils resteront des exports à la main, que le chantier 5 saura lire depuis `seo/imports/`.
15. **J+90 <date> : audit de contrôle** · main · « relance `/erom-seo:checklist`, l'audit niveau 0 est refait ; le niveau 1 (Search Console et Bing par API) arrive au chantier 5 ».

Les dates J+N sont calculées depuis « Mise en ligne » et font partie du libellé. Une ligne J+N dont la date est passée et la case vide est dite « en retard » dans la restitution, pas dans le fichier.

## 5. `checklist.ts`

### 5.1 Entrées

- `seo/strategy.md`, par `parseStrategy` : `site` (l'hôte de prod), `indexnow` (la clé ou `null`), `pages` (les pages clés). Absent ou inanalysable : exit 1, message, rien d'écrit.
- Le dernier `seo/audits/*-n2*/report.md` et le dernier `*-n0*/report.md`, par `latestAuditDir` et `parseReport`. Pour l'audit prod, `raw/sitemap.xml` et `raw/manifest.json` du n0 (les URL du sitemap collecté, pour le ping).
- `seo/checklist.md` s'il existe : la date de mise en ligne, les cases `main`, les cases `action` déjà faites, la présence d'un ancien sitemap.
- git : branche courante, dernier commit `seo(`.
- Options : `--mise-en-ligne <AAAA-MM-JJ>` (une fois ; redonner une autre date demande `--mise-en-ligne` à nouveau et le fichier repart de « Après » vide, les actions comprises), `--ancien-sitemap <url>`, `--agir`, `--seo <dossier>` (défaut `seo`, pour les tests).

### 5.2 Sortie

`seo/checklist.md` réécrit en entier. Sur la sortie standard : `checklist : <n cochées>/<n lignes> · mise en ligne : <date | non> · dû aujourd'hui : <libellés J+N échus non cochés | rien>`. Sur la sortie d'erreur : une ligne `attention :` par chose à dire (audit n0 antérieur à la mise en ligne ignoré, ligne J+N en retard, action non faite parce que Bing n'est pas configuré). Exit 0 si le fichier est écrit, 1 sinon.

### 5.3 Les actions (avec `--agir` seulement)

**Ping IndexNow.** Conditions : « Mise en ligne » posée, clé dans `seo/strategy.md`, un audit n0 postérieur à la mise en ligne avec un `raw/sitemap.xml` d'au moins une URL, case pas déjà cochée. Requête : `POST https://api.indexnow.org/indexnow`, corps JSON `{ host, key, keyLocation, urlList }`, `keyLocation` = `https://<host>/<clé>.txt`, `urlList` = les URL du sitemap collecté, `Content-Type: application/json; charset=utf-8`. Coché sur 200 ou 202 avec la date et le nombre d'URL ; vide sur tout autre code, avec le code et la raison. 422 : « la clé de `seo/strategy.md` n'est pas celle que sert la prod » (AI-02 du rapport n0 le dit aussi). Format exact du corps et des codes : `[NON VERIFIE]`, à figer sur la doc officielle pendant la recherche pré-plan.

**Sitemap chez Bing.** Conditions : ligne 5 cochée, `BING_WMT_API_KEY` dans l'environnement, « Mise en ligne » posée, case pas déjà cochée. Méthode `SubmitFeed(siteUrl, feedUrl)` de l'API JSON de Bing Webmaster Tools (`IWebmasterApi`, « Submits feed »), même base et même clé que `keywords.ts` ; `feedUrl` = `https://<site>/sitemap.xml` tel que l'audit n0 l'a trouvé. Le verbe HTTP et la forme du corps pour une méthode d'écriture en JSON sont `[NON VERIFIE]` (page `api-protocols`, à lire pendant la recherche pré-plan). Coché sur succès avec la date ; vide avec le code et le message sinon. Refus pour droits insuffisants (site client délégué en lecture seule) : consigne au client (ligne 10). Clé refusée (`InvalidApiKey`) : « la clé de `~/.zshenv` n'est plus la bonne » (incident du 28/08). La clé n'apparaît jamais, ni dans le fichier, ni sur la sortie, ni dans un message d'erreur : tout ce qui s'écrit passe par `assertNoSecret(content, key)` de `skills/strategy/scripts/lib/keywords.ts`, et les URL de requête sont expurgées avant affichage.

**Lecture `GetUserSites`** (sans `--agir`, D26) : même base, même clé ; le site de la stratégie présent dans la réponse (apex et www confondus) coche la ligne 5. La forme exacte de la réponse est `[NON VERIFIE]`, à capturer avec la vraie clé sur le compte de Romain pendant la recherche pré-plan.

### 5.4 Le fetch est injecté

`actions.ts` et `ancien-sitemap.ts` reçoivent leur `fetch` en paramètre. Les tests passent un faux ; le CLI passe le vrai. C'est ce qui rend « sans `--agir` aucune requête ne part » testable, et pas seulement promis.

## 6. La référence `consoles.md`

Une entrée par console ou service : Google Search Console (créer une propriété Domaine, vérification DNS, soumettre un sitemap, inspection d'URL, rapport Generative AI), Bing Webmaster Tools (ajouter un site, importer depuis Search Console, soumettre un sitemap, AI Performance), IndexNow (protocole, codes de réponse), redirections lors d'une migration (Google). Même forme que les recettes de `build` : `Chemin` (les clics), `Piège`, `Source` avec l'URL officielle et la citation mot pour mot. `check-sources.ts` retrouve chaque citation, comme pour les 80 déjà en place.

## 7. Le verbe `checklist`

### 7.0 Préparer

Répertoire courant : le repo du site. `seo/strategy.md` absent : proposer `/erom-seo:strategy`, s'arrêter. `Statut : brouillon` : le dire, continuer. `node_modules` du plugin absent : `bun install --frozen-lockfile`. Lire `seo/checklist.md` s'il existe.

### 7.1 Situer

Si le fichier n'existe pas ou porte « Mise en ligne : non » : une seule question, « c'est déployé ? ». Non : on reste sur la moitié « Avant ». Oui : demander la date (défaut : aujourd'hui), et « ancien site à rediriger ? » si aucun ancien sitemap n'est encore enregistré (réponse : l'URL de son sitemap, ou non). Ces réponses deviennent `--mise-en-ligne` et `--ancien-sitemap`. Le fichier existe avec une date : rien à demander.

### 7.2 Auditer la prod

Si la mise en ligne est posée et qu'aucun audit n0 postérieur n'existe, ou si le dernier date d'un autre jour : invoquer la skill `/erom-seo:audit https://<site>`. Elle écrit `seo/audits/<date>-n0*/` et passe le rapport au lint. Sans mise en ligne : rien, le dernier n2 suffit.

### 7.3 Écrire

`bun ${CLAUDE_PLUGIN_ROOT}/skills/checklist/scripts/checklist.ts [--mise-en-ligne …] [--ancien-sitemap …]`, sans `--agir`. Répéter chaque ligne `attention :` telle quelle.

### 7.4 Agir

Si une case `action` est faisable (conditions de 5.3) et pas encore cochée : dire ce qui va partir (« ping IndexNow : 14 URL de commentchercherbonheur.org » ; « sitemap soumis à Bing pour commentchercherbonheur.org »), attendre le OK, puis relancer le script avec `--agir`. Refus : la case reste vide avec « refusé par Romain le <date> ».

### 7.5 Restituer

Dans l'ordre : le chemin du fichier ; ce qui est dû aujourd'hui (les J+N échus non cochés), avec pour chacun le chemin de clics de `consoles.md` ; les cases `main` encore vides de la moitié courante, avec leur consigne ; les cases `auto` vides et leur raison ; les actions faites ou refusées. Puis la suite : « relance `/erom-seo:checklist` le <prochaine date J+N> ». Rappeler que rien n'est déployé ni poussé par la skill.

## 8. Erreurs

- `seo/strategy.md` absent ou inanalysable, aucun audit du niveau attendu : exit 1, le message nomme ce qui manque et la commande qui le produit.
- Ligne inconnue dans `seo/checklist.md` (D27) : exit 1, la ligne citée, rien de réécrit.
- `--mise-en-ligne` avec une date invalide ou future : exit 1.
- Ancien sitemap injoignable ou vide : exit 1 au moment de `--ancien-sitemap` ; si le fichier sauvegardé disparaît ensuite, la ligne 6 se vide avec la raison.
- Prod injoignable : c'est l'audit n0 qui échoue et le dit ; le script est relancé quand même, « Prod verte » reste vide (« aucun audit prod depuis la mise en ligne »).
- Action refusée par le service : case vide, code et message consignés (5.3), exit 0 (le fichier est écrit).
- Aucun secret nulle part : ni la clé Bing, ni une URL qui la contient.

## 9. Tests

Sur le modèle de `plan.test.ts` et `keywords.test.ts` : fixtures chico (les rapports n2 et n0 déjà dans `skills/build/scripts/tests/fixtures/chico/`, copiés ou référencés), un faux `fetch`, un dépôt git temporaire pour la ligne 2. Des comportements, jamais un compte de lignes ni le texte du source.

- Sans mise en ligne : la moitié « Avant » est remplie d'après le n2, la moitié « Après » est vide, aucun appel au faux `fetch`.
- Une case `main` cochée survit à trois passages ; une case `auto` cochée se vide quand le rapport suivant a une trouvaille Critique.
- Les dates J+N sont calculées depuis la mise en ligne (J+30 d'un 29 août est le 28 septembre).
- Un n0 antérieur à la mise en ligne est ignoré ; un n0 postérieur vert coche « Prod verte ».
- Ancien sitemap : une URL en 404 laisse la case vide et la liste ; une chaîne 301 puis 200 passe ; une 302 échoue avec la raison.
- Sans `--agir` aucune requête d'écriture (le faux `fetch` ne voit ni IndexNow ni `SubmitFeed`) ; avec `--agir`, le corps du ping porte `host`, `key`, `keyLocation` et toutes les URL du sitemap ; 202 coche ; 422 laisse vide avec le code ; une action déjà cochée n'est pas refaite.
- Bing : sans clé, ligne 5 `main` et aucun appel ; avec clé, `GetUserSites` qui liste le site coche la ligne 5, qui ne le liste pas la laisse vide ; sans ligne 5 cochée, `SubmitFeed` n'est pas appelé (« en attente ») ; refus pour droits insuffisants, consigne au client ; clé refusée, message sans la clé.
- Ligne inconnue dans le fichier : exit 1, fichier intact.
- Le CLI : exit 0 et fichier écrit sur le cas nominal ; exit 1 et rien d'écrit sans stratégie.
- `check-sources.ts` retrouve chaque citation de `consoles.md`.

## 10. Critères d'acceptation

- **AC-1**
  Comportement : quand je lance `/erom-seo:checklist` dans chico sans date de mise en ligne, alors `seo/checklist.md` existe, la moitié « Avant le déploiement » est remplie d'après le dernier audit niveau 2 (lignes 1 et 2 cochées, 3 et 4 vides avec leur consigne, 5 cochée par `GetUserSites` si chico est dans le compte Bing de Romain, 6 « sans objet »), la moitié « Après » est vide, et aucune écriture n'est partie.
  Vérifié par : `cat seo/checklist.md` ; le script relancé à la main avec `--seo seo` sous un `fetch` de trace ne journalise que `GetUserSites`.

- **AC-2**
  Comportement : quand je coche « Search Console : propriété créée » à la main dans le fichier, puis relance la skill, alors la case reste cochée.
  Vérifié par : `grep "Search Console" seo/checklist.md` avant et après.

- **AC-3**
  Comportement : quand je réponds « déployé, le 2026-08-29 », alors la skill lance `/erom-seo:audit https://commentchercherbonheur.org`, « Prod verte » suit le rapport (cochée si 0 Critique et 0 Important), et les lignes J+1 à J+90 portent les dates 08-30, 09-01, 09-05, 09-28, 11-27.
  Vérifié par : `ls seo/audits/` (un n0 du jour) et lecture du fichier, dates recalculées à la main.

- **AC-4**
  Comportement : quand la skill propose le ping IndexNow et que je dis OK, alors IndexNow répond 200 ou 202 et la ligne « Ping IndexNow » est cochée avec la date et le nombre d'URL ; relancer la skill ne repropose pas le ping.
  Vérifié par : la ligne du fichier ; `curl -s https://www.commentchercherbonheur.org/<clé>.txt` rend la clé de `seo/strategy.md`.

- **AC-5**
  Comportement : quand le dernier audit prod a une trouvaille Critique (rejoué en test avec un rapport n0 de fixture modifié), alors « Prod verte » redevient vide avec la ligne « En bref » du rapport.
  Vérifié par : `bun test skills/checklist` (test nommé) et la ligne du fichier produit par le test.

- **AC-6**
  Comportement : quand `--ancien-sitemap` pointe un sitemap dont une URL répond 404 (fixture et faux `fetch`), alors « Redirections de l'ancien site » reste vide et l'URL est listée dessous avec son code.
  Vérifié par : `bun test skills/checklist` (test nommé) et le fichier produit.

- **AC-7**
  Comportement : quand je lance `bun test` et `bun skills/audit/scripts/check-sources.ts` dans `plugin/`, alors tout est vert et chaque citation de `consoles.md` est retrouvée sur sa page officielle.
  Vérifié par : les deux commandes, sortie collée dans la recette.

## 11. Hors périmètre du chantier 4

Le déploiement lui-même ; l'API Search Console et l'API de rapports Bing (niveau 1, chantier 5) ; la vérification automatique que la propriété Search Console existe ; la création des consoles à la place de Romain ; des rappels hors du fichier (agenda, mail) ; un rendu client du fichier ; les redirections d'un ancien site qui n'a pas de sitemap (à la main, hors liste).

## 12. Points à instruire pendant la recherche pré-plan

- IndexNow : corps exact de la requête groupée, en-têtes, codes de réponse et leur sens (200, 202, 400, 403, 422, 429), limite d'URL par requête. `[NON VERIFIE]` (la doc `indexnow.org/documentation` est déjà épinglée au chantier 1, AI-02 ; il manque la forme du POST groupé.)
- Bing Webmaster Tools, API JSON : `SubmitFeed` et `GetUserSites` sont confirmés par `IWebmasterApi` (note du 29/08, section 4.2). Restent le verbe HTTP et la forme du corps d'une méthode d'écriture en JSON (page `api-protocols`), la forme de la réponse de `GetUserSites` (à capturer avec la vraie clé, jamais affichée), et le code renvoyé quand la délégation est en lecture seule. `[NON VERIFIE]`
- Search Console : méthodes de vérification d'une propriété Domaine (DNS TXT), et si la vérification peut précéder le déploiement. `[NON VERIFIE]`
- Ce que change le retrait SOAP/POX du 31 août pour l'endpoint JSON : sonde du 1er septembre déjà au calendrier (note de reprise), à étendre à `GetUserSites`.
- Google, migration de site : ce que la doc dit des codes 301 et 308 (le 308 est accepté par Google comme redirection permanente ; à citer) et du délai.
- Comment `build` a laissé chico : nombre de pages du sitemap de prod, clé IndexNow servie ou non (AI-02 du dernier n0 prod), pour que la recette AC-4 parte d'un état connu.

## 13. Sources et échantillons à vérifier

Vérifié par la note `docs/recherches/2026-08-29-niveau-1-apis.md` (sources en HTTP 200 le 29/08) : `SubmitFeed(siteUrl, feedUrl)` et `GetUserSites()` dans `IWebmasterApi` (Microsoft Learn, 2023-11-14) ; le format JSON `ssl.bing.com/webmaster/api.svc/json/METHODE?apikey=…` (page `api-protocols`, 2026-08-10) ; le jeton Search Console demandé en `webmasters.readonly` par posture, `sitemaps.submit` réservé au scope `webmasters` (discovery doc, révision 20260825) ; les rapports IA de Google et de Bing hors API. Aucun échantillon réel d'IndexNow groupé ni d'une réponse `SubmitFeed` ou `GetUserSites` n'a encore été capturé : les corps de la section 5.3 restent à figer sur la doc officielle et sur une vraie réponse pendant la recherche pré-plan, jamais dans le code d'abord. Les fixtures existantes : `plugin/skills/build/scripts/tests/fixtures/chico/` (manifest, pages, rapports n0 et n2, stratégie), collectées le 28/08 sur chico.
