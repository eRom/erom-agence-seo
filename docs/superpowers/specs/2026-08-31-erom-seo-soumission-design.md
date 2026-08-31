---
title: "erom-seo, chantier 7 : soumettre aux moteurs"
date: 2026-08-31
status: proposed
project: erom-agence-seo
spec_mere: docs/superpowers/specs/2026-08-27-erom-seo-design.md
notes_liees:
  - docs/superpowers/specs/2026-08-29-erom-seo-console-design.md
  - docs/superpowers/specs/2026-08-29-erom-seo-checklist-design.md
  - docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md
  - .claude/notes/2026-08-31-reprise-chantier-6.md
origine: >
  Recette manuelle de CHICO le 31/08. Romain a soumis le sitemap dans les deux consoles
  web à la main, puis lancé le POST IndexNow par curl depuis son terminal, puis corrigé
  trois titres signalés « Titre trop long » par l'export Site Scan de Bing Webmaster Tools.
  Les trois gestes sont répétables et deux des trois sont déjà codés dans le plugin,
  mais enfermés dans un rituel de mise en ligne qu'on ne joue qu'une fois par site.
---

# erom-seo, chantier 7 : soumettre aux moteurs

Septième verbe non, septième geste oui : `console` gagne une quatrième commande, `update`, qui prévient les deux moteurs qu'un site a bougé. Plus une vérification de catalogue, `TAG-05`, née du même incident.

## 1. But

Après chaque mise en production, trois choses doivent partir : le sitemap chez Google, le sitemap chez Bing, la liste des URL modifiées chez IndexNow. Aujourd'hui la première se fait à la main dans une console web, et les deux autres sont enfermées dans `checklist --agir`, un rituel de quinze cases conçu pour le jour du lancement et pas pour le mardi où l'on republie un article.

Ce chantier sort ces gestes du rituel et en fait une commande. Il n'invente presque rien : `pingIndexNow` et `bingSubmitFeed` existent et ont tourné en vrai le 29/08. Ce qui manque est l'écriture Google, un endroit commun où poser les trois, et une porte pour les appeler.

Il ouvre en revanche une capacité que le plugin n'avait pas : **écrire dans Search Console**. C'est le vrai objet de la spec, et la raison pour laquelle elle renverse une décision écrite.

## 2. Décisions

### D50. `console update` est une sous-commande, et elle supersede D30

D30 disait : « `console` est en lecture seule, les deux écritures du plugin restent dans `checklist --agir` ». Cette décision est remplacée, pas amendée.

La nouvelle règle, en deux temps pour éviter l'ambiguïté :

- **Il n'y a qu'un seul endroit du code qui écrit vers un moteur**, `plugin/lib/soumission.ts` (D52).
- **Il y a deux appelants, et deux seulement** : `console update`, le geste répétable, et `checklist --agir`, le rituel de lancement qui garde ses deux actions. Aucun autre verbe n'écrit, aujourd'hui ni plus tard.

Une sous-commande et non un drapeau, contrairement à la formulation d'origine (`console --update`) : les trois commandes existantes sont `sites`, `inspect`, `crawl`, toutes des sous-commandes. Un drapeau d'écriture greffé sur une commande de lecture serait un quatrième motif dans un CLI qui en a déjà deux (sous-commande chez `console`, drapeau `--agir` chez `checklist`).

**Battu** : un septième verbe `/erom-seo:soumettre`. Plus lisible à l'appel, mais il faudrait recabler chez lui l'authentification Google, la résolution de propriété et le transport Bing que `console` porte déjà, pour trois appels réseau. Rejeté par coût de surface.

**Battu** : tout laisser dans `checklist --agir` en y ajoutant Google. La checklist est un état à quinze lignes ancré sur un jour J, avec des cases qui ne se décochent jamais. Rejouer ce rituel pour signaler un article modifié n'a aucun sens.

### D51. `lib/gsc.ts` gagne exactement une écriture, et jamais une de plus

Le fichier porte aujourd'hui le commentaire « Aucune écriture, et il n'y en aura pas. » Il devient : `submitSitemap` et rien d'autre.

Le scope OAuth `https://www.googleapis.com/auth/webmasters` que cette écriture réclame autorise aussi `sitemaps.delete`, `sites.add` et `sites.delete` (relevé sur le discovery document du 2026-08-30). **Aucune de ces trois n'est implémentée, et le refus est une décision, pas un oubli.** Un plugin qui peut retirer une propriété Search Console d'un client est un plugin qu'on n'ose plus lancer.

Le commentaire du fichier dit désormais quelles écritures existent et lesquelles sont refusées, pour que la question ne se repose pas.

### D52. Les trois soumissions vivent dans `plugin/lib/soumission.ts`

`pingIndexNow`, `bingSubmitFeed` et le nouveau `submitSitemap` Google sont réunis dans un module commun. `checklist/scripts/lib/actions.ts` perd ses deux fonctions et importe celles-là.

Motif déjà appliqué au chantier 5 : `lib/url.ts` a été extrait d'une skill pour la même raison. La règle du dépôt tient, `plugin/lib/` ne dépend d'aucune skill.

Conséquence obligatoire : `lib/soumission.ts` a besoin du parseur de sitemap, qui vit aujourd'hui dans `skills/audit/scripts/lib/sitemap.ts`. `parseSitemap`, `decodeSitemapBody` et `sitemapCandidates` remontent dans `plugin/lib/sitemap.ts` ; `collectSitemapUrls` reste dans l'audit, qui est le seul à en avoir besoin. Les imports d'`audit` sont corrigés dans le même mouvement.

### D53. Le sitemap se trouve par le robots.txt, pas par convention

`update` ne suppose pas `/sitemap.xml`. Il fait un GET sur `<origine>/robots.txt` **en suivant les redirections**, lit les directives `Sitemap:`, et prend la première qui répond 200.

Deux bénéfices pour le prix d'une requête. Le premier : un site qui déclare son sitemap ailleurs est servi correctement. Le second : la chaîne de redirections du `robots.txt` **donne l'origine réellement servie**. CHICO déclare l'apex dans plusieurs endroits et sert le www ; c'est cette origine finale, et elle seule, qui vaut pour `host` d'IndexNow et pour la réécriture des URL.

Repli sur `<origine>/sitemap.xml` si le `robots.txt` ne déclare rien. Si ni l'un ni l'autre ne répond 200, la commande s'arrête avant toute soumission et le dit : soumettre un sitemap absent est une erreur qu'on découvrirait trois jours plus tard dans une console web.

### D54. La clé IndexNow est vérifiée servie avant le POST

Avant d'envoyer quoi que ce soit à IndexNow, un GET sur `https://<origine>/<clé>.txt`, où la clé vient de `seo/strategy.md`. Le contenu doit être exactement la clé.

Sans ce contrôle, une clé changée depuis le dernier déploiement produit un 403 dont le message officiel (« key not found, file found but key not in the file ») n'arrive que dans la réponse, après un envoi inutile. Le cas n'est pas théorique : la clé de CHICO a changé entre le 29/08 et le 31/08.

Le contrôle échoue en nommant les deux valeurs, jamais en affichant seulement « échec ». La clé IndexNow est publique par construction, servie à la racine du site : ce n'est pas un secret et elle s'affiche.

### D55. `--url` pinge sans toucher aux sitemaps

`console update --url <u>` (répétable) fait le POST IndexNow sur ces URL seulement, et **n'émet aucune soumission de sitemap**. C'est le geste courant après le lancement : une page change, son contenu bouge, le sitemap ne bouge pas.

Chaque URL doit être sur l'origine servie, contrôlé avant l'appel. Une URL hors hôte est refusée localement plutôt que d'aller chercher un 422 chez IndexNow.

Sans `--url`, `update` soumet les deux sitemaps et poste toutes les URL du sitemap.

### D56. Le nom porte l'intention, la skill impose la répétition

`update` écrit, c'est dans son nom : pas de drapeau d'armement à la `--agir`. Mais `--dry-run` existe et affiche les trois appels qui partiraient, sans en émettre aucun.

Le `SKILL.md` impose l'ordre : `--dry-run` d'abord, montrer la sortie à Romain, attendre le OK, puis l'envoi réel. C'est la même discipline que `checklist`, portée par la procédure plutôt que par le CLI. Un script appelé en boucle par un humain pressé garde ainsi un point d'arrêt, et un script appelé par un autre script n'a pas à mentir sur ses intentions.

### D57. Un moteur en panne n'empêche pas les autres, et le code de sortie compte les échecs

Les trois soumissions sont indépendantes et isolées, chacune sous son `try`. Motif déjà en place dans les trois commandes de lecture de `console`.

Sortie : `0` si toute soumission tentée a réussi, `1` si au moins une a échoué. Une soumission **non applicable** n'est pas un échec et n'affecte pas le code : clé Bing absente, site hors du compte Bing, pas de clé IndexNow dans la stratégie. Chacune écrit sa raison, aucune ne teinte le verdict.

La distinction compte : sur un client où l'agence n'a pas encore l'accès Bing, `update` doit sortir en 0 après avoir fait ce qu'il pouvait, sinon la commande crie tous les jours pour un état connu et voulu.

### D58. TAG-05 détecte à 65, le correctif vise 60

Nouveau check de catalogue, famille `tags.md`, sévérité **Mineur**, niveau 0.

Aucun moteur ne publie de seuil chiffré. Google écrit l'inverse, vérifié le 31/08 sur `title-link` : « While there's no limit on how long a `<title>` element can be, the title link is truncated in Google Search results as needed, typically to fit the device width. » Bing signale la faute sans publier son chiffre : le libellé du Site Scan est derrière l'authentification et son bundle JavaScript ne le porte pas.

Ce que le check cite est donc de deux natures, et le dit :

- la règle qualitative, sourcée et re-vérifiable par `check-sources.ts` : « Also avoid unnecessarily long or verbose text in your `<title>` elements. »
- l'incident daté, marqué `[manuel]` comme les deux entrées Bing de `consoles.md` : export Site Scan du 31/08/2026 sur `commentchercherbonheur.org`, catégorie « Titre trop long », trois pages (`/ascension`, `/audit`, `/studies`).

Le seuil de 65 est une **convention d'agence**, écrite comme telle dans le champ `Comment`. Le correctif vise 60, une marge délibérée. Deux nombres, deux rôles : 65 pour signaler, 60 pour écrire.

**Battu** : mesurer en pixels, ce que Google décrit réellement (« to fit the device width »). Exact et inapplicable : il faudrait embarquer une table de largeurs de glyphes par police, pour un check Mineur.

**Battu** : citer une réponse de moteur génératif donnant « 50 à 65 caractères ». `check-sources.ts` va rechercher chaque citation sur sa page et refuserait celle-là, à raison : une synthèse d'IA n'est pas la documentation d'un moteur.

## 3. Composants

```
plugin/lib/
  soumission.ts        NOUVEAU. Les trois écritures, fetcher injecté, aucun accès disque.
                       submitSitemapGoogle, submitFeedBing, postIndexNow, verifierCleServie
  sitemap.ts           NOUVEAU. parseSitemap, decodeSitemapBody, sitemapCandidates,
                       remontés de skills/audit/scripts/lib/sitemap.ts
  gsc.ts               + submitSitemap (la seule écriture), + SUBMIT_HINT
  bing.ts              inchangé
  resolve.ts           inchangé

plugin/skills/console/
  scripts/console.ts   + la branche `update`, + le parsing de --url et --dry-run
  scripts/lib/render.ts + renderUpdate (pur, une ligne par soumission)
  SKILL.md             + un cinquième temps : soumettre, avec la discipline du dry-run
  references/acces.md  + ACC-07 : obtenir le scope d'écriture Google

plugin/skills/checklist/
  scripts/lib/actions.ts  perd pingIndexNow et bingSubmitFeed, importe lib/soumission

plugin/skills/audit/
  references/checks/tags.md  + TAG-05
  scripts/lib/checks.ts      inchangé (le catalogue est déclaratif)

plugin/skills/build/
  references/nextjs.md   + la consigne des 60 caractères sur metadata.title
```

### 3.1 Le flux d'`update`, sans `--url`

1. **Situer.** `--site <url>` sinon `seo/strategy.md` du répertoire courant. Absent des deux : usage, code 2.
2. **Trouver l'origine servie et le sitemap.** GET `robots.txt` en suivant les redirections. L'origine finale est l'origine servie. Directives `Sitemap:`, première qui répond 200, repli `<origine>/sitemap.xml`. Rien en 200 : arrêt, code 1.
3. **Lire le sitemap.** `parseSitemap`. Un index de sitemaps est suivi d'un niveau. Les URL sont ramenées sur l'origine servie par `urlsOnOrigin`, qui compte les réécritures.
4. **Google.** `listProperties` puis `resolveProperty` pour la propriété qui couvre l'origine, jamais fabriquée (D33). Puis `PUT webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}`, les deux encodés dans le chemin.
5. **Bing.** `bingUserSites` puis `resolveBingSite` par `sameSite`. Puis `SubmitFeed` avec le `Url` que Bing a rendu.
6. **IndexNow.** Vérification de la clé servie (D54), puis POST groupé.
7. **Restituer.** Une ligne par soumission, la raison quand elle n'est pas partie.

Avec `--url`, seules les étapes 1, 2 (pour l'origine servie) et 6 sont jouées.

### 3.2 L'écriture Google, en détail

Relevé sur le discovery document `searchconsole.googleapis.com/$discovery/rest?version=v1`, révision 20260830, lu le 31/08 :

```
PUT webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}
scopes   : https://www.googleapis.com/auth/webmasters   (écriture seule, readonly refusé)
siteUrl  : "The site's URL, including protocol. For example: http://www.example.com/."
feedpath : "The URL of the actual sitemap. For example: http://www.example.com/sitemap.xml."
réponse  : aucun schéma de réponse, corps vide
```

Les deux paramètres sont dans le chemin et s'encodent, comme `listSitemaps` le fait déjà pour `siteUrl`.

**Le jeton actuel de la machine ne suffit pas.** Relevé le 31/08 par `oauth2.googleapis.com/tokeninfo` : `email cloud-platform userinfo.email webmasters.readonly openid`. Le PUT rendra 403 tant que ce login n'a pas été refait :

```bash
gcloud auth application-default login \
  --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
```

`cloud-platform` est conservé parce que `GSC_QUOTA_PROJECT` en dépend. `webmasters` couvre `webmasters.readonly`, donc les quatre lectures existantes continuent sans changement.

`gsc.ts` gagne `SUBMIT_HINT`, qui porte cette commande et sort sur les deux refus qui la signifient : scope insuffisant, et `403 insufficientPermissions`. Un utilisateur qui n'est pas Owner de la propriété reçoit la même famille de refus avec une consigne différente : « à faire par le propriétaire de la propriété », comme Bing le fait déjà pour ses codes 11, 13 et 14.

### 3.3 Ce que `checklist --agir` devient

Rien ne change pour l'appelant. Les lignes CL-09 (IndexNow) et CL-10 (sitemap Bing) gardent leur libellé, leur phase et leur comportement. Seul l'import change.

La ligne CL-11 (« soumettre le sitemap dans Search Console »), aujourd'hui une case `main` cochée par Romain après un geste manuel, **reste une case `main`**. Elle ne devient pas automatique. La checklist décrit ce qui doit être vrai au lancement, et le fait qu'un humain ait vérifié la propriété Search Console d'un client vaut plus qu'un PUT réussi. Le SKILL.md mentionne que `console update` peut faire le geste, sans le faire à sa place.

## 4. Le contrat de la commande

```
console update [--site <url>] [--url <u>]... [--dry-run] [--json]
```

Sortie texte, une ligne par soumission, dans l'ordre Google, Bing, IndexNow. Jamais de tableau, jamais de section vide, un champ absent ne s'affiche pas vide : les règles de `render.ts` valent ici.

```
site      : https://www.commentchercherbonheur.org (origine servie, apex redirigé en 308)
sitemap   : https://www.commentchercherbonheur.org/sitemap.xml (10 URL)
google    : soumis à sc-domain:commentchercherbonheur.org
bing      : soumis pour https://commentchercherbonheur.org/
indexnow  : 202 Accepted, 10 URL reçues, validation de la clé en attente
```

En `--dry-run`, les mêmes lignes au futur, préfixées, et aucune requête d'écriture émise. Les lectures nécessaires au calcul (robots, sitemap, `sites.list`, `GetUserSites`) partent quand même : c'est ce qui rend le dry-run honnête plutôt que décoratif.

Codes de sortie : `0` tout ce qui a été tenté a réussi, `1` au moins un échec, `2` usage.

## 5. TAG-05

Entrée ajoutée à `references/checks/tags.md`, dans le format strict lu par `parseChecks` :

```
### TAG-05 : title trop long
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : aucun <title> ne dépasse 65 caractères.
Comment    : derived/pages.json → title.length > 65 = trouvaille (citer le slug et la longueur).
             Le seuil de 65 est une convention d'agence : aucun moteur n'en publie. Google dit
             qu'il n'y a pas de limite et que le titre est tronqué à la largeur de l'écran ;
             Bing signale « Titre trop long » sans dire son seuil.
Source     : https://developers.google.com/search/docs/appearance/title-link « Also avoid unnecessarily long or verbose text in your <title> elements. »
Source     : https://www.bing.com/webmasters/sitescan « Titre trop long » [manuel]
Correctif  : viser 60 caractères, l'information distinctive en premier, le nom de marque en dernier.
Effort     : rapide
```

La seconde source suit la syntaxe exacte du parseur, relevée dans `parseChecks` : URL, citation entre guillemets français, puis `[manuel]` en fin de ligne. Sans cette forme, `check-sources.ts` prendrait la ligne entière pour une URL et tenterait d'aller la chercher. Le régime `[manuel]` est celui des deux entrées Bing de `consoles.md` : la page est une application JavaScript derrière authentification, `check-sources.ts` la liste en `MANUEL` et ne la vérifie pas.

L'incident qui justifie le seuil vit dans le champ `Comment` et dans cette spec, pas dans le champ `Source` dont le format est contraint : export Site Scan du 31/08/2026 sur `commentchercherbonheur.org`, catégorie « Titre trop long », trois pages sur dix (`/ascension`, `/audit`, `/studies`).

Le compte de vérifications de l'en-tête de rapport passe de 35 à 36, et `lint-report.ts` le contrôle déjà.

Côté `build`, la recette des balises de `nextjs.md` gagne la contrainte : un `metadata.title` proposé fait 60 caractères ou moins, et l'étape 3 (validation des textes par Romain) affiche la longueur à côté de chaque proposition.

## 6. Tests

`bun test`, conventions du dépôt. Fixtures dans `scripts/tests/fixtures/`.

Sur `lib/soumission.ts`, fetcher injecté, aucune requête réelle :
- `submitSitemapGoogle` encode les deux paramètres dans le chemin, et une propriété `sc-domain:` survit à l'encodage.
- un 403 de scope produit un message qui contient la commande `gcloud`, un 403 de permission produit celui qui nomme le propriétaire.
- `verifierCleServie` accepte un corps égal à la clé, refuse un 404, refuse un corps différent, et nomme les deux valeurs dans le refus.
- `postIndexNow` envoie les quatre champs et le content-type de la documentation officielle, accepte 200 et 202, traduit 403 et 422 par leur cause.
- une URL hors origine passée à `--url` est refusée avant l'appel.

Sur la branche `update` de `console.ts`, avec le fetcher compteur déjà utilisé par les tests existants :
- `--dry-run` n'émet **aucune** requête dont la méthode est PUT ou POST. Assertion sur les appels observés, pas sur le texte du source.
- un échec Google n'empêche ni Bing ni IndexNow de partir, et réciproquement, les trois combinaisons.
- clé Bing absente : la ligne Bing dit sa raison et le code de sortie reste 0.
- un `robots.txt` sans directive `Sitemap:` fait tomber sur `/sitemap.xml` ; un 404 sur les deux fait sortir en 1 avant toute écriture.

Sur `lib/sitemap.ts` après le déménagement : les tests existants de l'audit passent sans modification de leurs assertions, seul leur import change.

Sur `checklist` : la suite existante passe sans modification. C'est la non-régression du déménagement.

Sur `tags.md` : `checks-format.test.ts` valide le format de TAG-05 comme les 35 autres. Aucun test ne fige le nombre 36 ni le contenu du catalogue, conformément à la doctrine sur les tests détecteurs de changement : on assère que chaque entrée a ses champs, jamais qu'il y en a un certain nombre.

## 7. Critères d'acceptation

**AC-1. Le dry-run n'écrit rien.**
Quand `console update --dry-run` est lancé sur un site réel, alors aucune requête d'écriture ne part vers Google, Bing ou IndexNow.
*Vérifié par* : `bun test` sur le test au fetcher compteur, qui assère zéro appel PUT et zéro appel POST ; plus la sortie réelle sur CHICO, comparée à l'état des consoles avant et après (le sitemap Google garde sa date de soumission précédente).

**AC-2. Les trois soumissions partent pour de vrai.**
Quand `console update` est lancé sur `commentchercherbonheur.org` après le OK de Romain, alors le sitemap est reçu par Google et par Bing, et IndexNow accuse réception.
*Vérifié par* : la sortie de la commande, puis `console sites` qui montre la nouvelle date de soumission du sitemap chez Google et le flux chez Bing. Les trois réponses réelles (codes HTTP et corps) sont collées dans la recette : aucune n'a jamais été capturée pour Google.

**AC-3. Un scope insuffisant se répare sans chercher.**
Quand le jeton n'a que `webmasters.readonly`, alors la ligne Google donne la commande `gcloud` exacte à lancer.
*Vérifié par* : lancer `console update` avant de refaire le login, relever le message ; il contient `--scopes=` et les quatre scopes. C'est l'état réel de la machine au 31/08, donc le cas se joue une fois sans le fabriquer.

**AC-4. `--url` ne touche pas aux sitemaps.**
Quand `console update --url https://<site>/une-page` est lancé, alors IndexNow reçoit cette URL seule et aucune soumission de sitemap ne part.
*Vérifié par* : la sortie ne porte pas de ligne `google` ni `bing` ; le test au fetcher compteur assère un seul POST, vers `api.indexnow.org`. Une URL sur un autre hôte est refusée avec sa raison, sans appel réseau.

**AC-5. Un moteur muet n'en fait pas taire un autre.**
Quand la clé Bing est absente de l'environnement, alors Google et IndexNow partent quand même et le code de sortie est 0.
*Vérifié par* : `BING_WMT_API_KEY= console update --dry-run` sur CHICO ; la ligne Bing dit « non interrogé (clé absente) », les deux autres sont calculées, `echo $?` sort 0.

**AC-6. La checklist ne régresse pas.**
Quand les deux fonctions ont déménagé dans `plugin/lib/soumission.ts`, alors `checklist` se comporte exactement comme avant.
*Vérifié par* : `bun test skills/checklist` reste vert sur ses 44 tests (relevé le 31/08 avant le chantier, 5 fichiers, 279 assertions) sans qu'une seule assertion ait été modifiée. Seuls les imports changent. `checklist --agir` n'ayant pas de mode répétition, ces tests sont la seule preuve disponible, ce qui rend l'interdiction de toucher aux assertions non négociable.

**AC-7. TAG-05 sort les bonnes pages.**
Quand un audit tourne sur un site portant un titre de plus de 65 caractères, alors le rapport porte une trouvaille TAG-05 nommant le slug et la longueur.
*Vérifié par* : le site jouet de `tests/fixtures/site.ts`, avec une page à 80 caractères de titre et une à 60, produit exactement une trouvaille. Aucun site réel disponible ne dépasse aujourd'hui le seuil, les titres de CHICO ayant été corrigés le 31/08 (le plus long, `/institut`, fait 58 caractères) : la vérification sur cible réelle est donc reportée au premier client qui en portera.

**AC-8. Le refus d'écrire au-delà du sitemap est vérifiable.**
Quand on cherche une écriture Google autre que `sitemaps.submit` dans le plugin, alors il n'y en a aucune.
*Vérifié par* : `grep -rn "sitemaps/.*DELETE\|sites.delete\|method: \"DELETE\"" plugin/` sort zéro ligne, et le commentaire de tête de `gsc.ts` nomme les trois écritures refusées et pourquoi.

## 8. Hors périmètre

- **L'inspection d'URL en écriture** (« Request indexing » de Search Console). L'API ne l'expose pas, seule l'interface web le fait, et elle a un quota quotidien. Rien à automatiser.
- **La soumission à Yandex, Seznam, Naver et les trois autres participants IndexNow.** Le protocole oblige le moteur qui reçoit à relayer aux autres sous dix secondes : un POST suffit pour les sept. Taper leurs endpoints séparément serait du bruit.
- **Google et IndexNow.** Google ne participe pas au protocole. Les sept participants, relevés sur `indexnow.org/searchengines.json` le 31/08 : bing, yandex, seznam, naver, yep, internetarchive, amazonbot. Aucune quantité de POST IndexNow ne préviendra Google, et le plugin ne doit jamais laisser croire l'inverse.
- **Un filtre par `lastmod`** pour ne pinger que les URL récemment modifiées. `--url` couvre le besoin réel avec moins de magie. À rouvrir si un client dépasse le millier de pages.
- **La création de propriété** (`sites.add`) et la vérification de site. Ce sont des gestes de compte, faits une fois, avec des conséquences que personne ne veut voir automatisées.
- **Le seuil de titre en pixels.** Voir D58.

## 9. Incertitudes

1. **Bing connaît CHICO sous l'apex, le site sert le www.** Relevé le 31/08 : `GetUserSites` rend `https://commentchercherbonheur.org/` alors que l'origine servie est `www.`. `SubmitFeed` recevra donc un `siteUrl` en apex et un `feedUrl` en www. Aucune documentation ne dit si Bing l'accepte. Premier test de la recette ; si Bing refuse (`InvalidUrl` 7), la ligne Bing devra dire au propriétaire d'ajouter la variante www dans son compte.
2. **La réponse réelle du PUT Google n'a jamais été capturée.** Le discovery ne déclare aucun schéma de réponse, ce qui laisse attendre un 204 sans corps. À confirmer et à coller dans la recette.
3. **Le comportement du PUT quand on n'est pas Owner** n'est pas documenté avec son code exact. `403 insufficientPermissions` est l'hypothèse. Le message de refus traite les deux causes possibles (scope, rôle) tant que le code réel n'a pas été observé chez un client.
4. **Le seuil réel du Site Scan de Bing** reste inconnu. Romain l'a lu à l'écran comme inférieur à 70 ; le bundle public ne porte pas le libellé et l'export CSV ne porte que les URL. Si le texte exact est capturé un jour, la citation `[manuel]` de TAG-05 gagne son verbatim et le seuil de 65 se réexamine.
5. **Un sitemap index à plusieurs niveaux** n'a jamais été rencontré sur les sites du portefeuille. `update` suit un niveau d'indirection ; au-delà, il prend ce qu'il a et le dit.
