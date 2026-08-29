---
title: erom-seo, chantier 5 étape 1 : recette du verbe console
date: 2026-08-29
status: implemented
project: erom-agence-seo
spec: docs/superpowers/specs/2026-08-29-erom-seo-console-design.md
plan: docs/superpowers/plans/2026-08-29-erom-seo-chantier-5-console.md
branche: chantier-5-console
---

# Recette du verbe `console`

Jouée le 2026-08-29 au soir par la session mère, sur les vrais comptes de Romain, avec son jeton et sa clé.
Aucune valeur de secret n'apparaît dans ce document.

**État de la branche à la recette** : 375 tests verts, 0 échec ; `check-sources.ts` rend 115 citations
retrouvées, 0 en échec, exit 0 ; dépôt propre.

## Ce qui a changé pendant le chantier

Romain a **ajouté ses deux sites dans Bing Webmaster Tools en cours de session**. Le compte, vide toute la
journée et sur lequel toute la branche a été écrite, contient depuis `lebonpote.romain-ecarnot.com` et
`romain-ecarnot.com`, tous deux vérifiés, avec un flux soumis à 16 h 36 UTC.

Deux conséquences. Les quatre méthodes Bing jamais observables l'ont enfin été (spec, section 12.6), ce qui
lève l'incertitude 1 et réduit l'incertitude 2. Et deux défauts que rien ne pouvait voir avant sont apparus,
tous deux corrigés avant cette recette : une URL inconnue de Bing rend un objet à sentinelles `DateTime.MinValue`
et non `null` (Romain aurait lu `/Date(-62135568000000-0800)/` à l'écran), et le message du 403
`SERVICE_DISABLED` affirmait « GSC_QUOTA_PROJECT absente » alors que la variable était posée.

AC-1, AC-3 et AC-8 ont été amendés dans la spec pour décrire l'état réel du compte.

## Résultats

| Critère | Verdict | Preuve |
|---|---|---|
| AC-1 `console sites` | **OK** | Les trois propriétés Google avec leur rôle, leurs sitemaps avec soumis et indexé ; les deux sites Bing vérifiés, le flux de lebonpote détaillé. Code 0. |
| AC-2 `inspect` sur une page connue | **OK** | Propriété nommée, verdict, couverture, robots.txt, indexation, dernier crawl, récupération, exploré en, les deux canonicals, lien d'inspection. Côté Bing : découverte, dernier crawl, taille, liens entrants. Code 0. |
| AC-3 `inspect` sur une URL inconnue | **OK** | `URL is unknown to Google` côté Google, `pas dans l'index Bing` côté Bing. **Aucune date .NET brute, aucun `HttpStatus`.** Code 0. |
| AC-4 URL hors de toute propriété | **OK** | Message nommant les trois propriétés vues, renvoi à `acces.md`, **code 1** bien que Bing ait répondu. |
| AC-5 aucun jeton Google | **OK** | Commande de connexion complète avec le scope `webmasters.readonly`. Aucun jeton affiché. Bing répond quand même. |
| AC-6 `GSC_QUOTA_PROJECT` absente | **OK** | La variable est nommée, la commande d'activation donnée. Le verbe s'arrête avant tout appel réseau. |
| AC-7 sans clé Bing | **OK** | Google répond, Bing dit « non interrogé (clé absente) », code 0. Aucun appel vers `ssl.bing.com`. |
| AC-8 `console crawl` | **OK** | « Google : pas de statistiques de crawl en API », Bing lu, les deux listes vides annoncées sans les confondre avec une absence de site. Code 0. |
| AC-9 `--json` sans secret | **OK** | Les trois commandes en `--json` s'analysent ; recherche de la clé Bing et du préfixe `ya29.` dans les sorties enregistrées : aucune occurrence. |
| AC-10 tests et sources | **OK** | `bun test` : 375 verts, 0 échec. `check-sources.ts` : 115 citations, 0 en échec, exit 0. |

**Dix sur dix.**

## Deux sondes hors critères

`GSC_QUOTA_PROJECT` posée sur un projet où l'API n'est pas activée (`dockertest-1268`) : la sortie nomme le
projet fautif et donne `gcloud services enable searchconsole.googleapis.com --project=dockertest-1268`.
C'est la seule branche réelle de ce 403, et elle disait le contraire avant le dernier correctif.

Propriété `healthincloud.app`, où Romain est utilisateur non vérifié : la sortie dit « sitemaps non lisibles
pour cette propriété » là où elle aurait affirmé « aucun sitemap déclaré » avant le correctif. Une lecture
impossible ne se présente plus comme une absence de donnée.

## Résidus, tous parqués avec leur décision

Aucun ne change ce que Romain voit, aucun ne bloque la fusion. Détail et raisons dans le registre
d'exécution, `.superpowers/sdd/2026-08-29-erom-seo-chantier-5-console/progress.md`.

1. **Filet anti-tiret cadratin, deux littéraux non couverts** : `jamais` et `sous-URL connues`. Les deux
   branches correspondantes (URL découverte mais jamais crawlée, nombre de sous-URL non nul) ne sont
   exercées par aucun test. Correctif connu : cinq lignes, une sortie forgée ajoutée au tableau du filet.
2. **`*_UNSPECIFIED` de Google affichés en brut** sur une URL inconnue. Ne mentent pas, contrairement à
   `HttpStatus` qui a été retiré, mais n'apportent rien. Règle retenue si on y revient : omettre, comme
   `line()` le fait déjà pour `null`, et non traduire. Deux lignes, `verdict` exclu.
3. **`parseDotNetDate` lève un `RangeError`** au-delà de ±8,64 × 10^15 millisecondes. Rattrapé par le
   `catch` du CLI (code 1, sans trace ni fuite) et exige un horodatage de cent mille ans.
4. **Branche morte** `USER_PROJECT_DENIED` sans projet posé : inatteignable, l'en-tête n'existe que si la
   variable l'est.
5. Reportés depuis les revues de tâche : le test d'encodage du `siteUrl` ne couvre que la forme
   `sc-domain:` (la forme préfixe est prouvée en production ce soir sur lebonpote) ; `resolveProperty`
   reparse une URL une fois de trop ; aucun test sur le `JSON.parse` invalide de `bing.ts`.
6. Parqué avec ruling : le `keyFilePath` dans un message d'erreur divulgue une arborescence locale. Il
   reste, c'est l'information nécessaire pour corriger, sur la machine de Romain.

## Ce qui reste ouvert pour la suite

- **Incertitude 2** : la forme d'une entrée non vide de `GetCrawlStats` ou `GetCrawlIssues`. Les deux sites
  viennent d'être ajoutés et n'ont pas d'historique. À reprendre quand ils en auront.
- **Sonde du 1er septembre** : survie de l'endpoint JSON Bing après le retrait SOAP et POX du 31 août, à
  étendre à `GetUrlInfo`, `GetFeeds`, `GetCrawlStats` et `GetCrawlIssues`, désormais tous utilisés.
- **Permission minimale pour l'inspection d'URL** : toutes les sondes ont été faites en rôle propriétaire.
- **Chico** n'a de propriété ni chez Google ni chez Bing. Le jour où il en aura une, la même recette s'y
  rejoue sans changement.
- **Étape 2 du chantier 5** : l'audit niveau 1 (`collect.ts --level 1`, LVL1-01 à LVL1-05, AI-03, imports
  CSV des rapports IA), qui réutilisera les cinq briques de cette étape.
