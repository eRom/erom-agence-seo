# Recette du chantier 4 : `checklist` sur chico

Cobaye : `/Users/recarnot/dev/chico-happiness` (commentchercherbonheur.org, déployé sur Vercel, build fusionné et poussé le 29/08, clé IndexNow `bf498d4959b94b88aa7bb3902433735f` servie en 200, sitemap de prod de 10 URL, compte Bing Webmaster Tools de Romain vide au 29/08). Plugin chargé depuis le worktree : `claude --plugin-dir /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin`. Tests et sources : AC-7 d'abord, puis AC-1 à AC-6 dans l'ordre. Chaque AC : la commande ou le clic, la sortie collée telle quelle, OK ou KO.

## AC-7 : suite et sources
`cd /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin && bun test && bun skills/audit/scripts/check-sources.ts | tail -3`
Attendu : 0 fail ; « 0 en échec ».

## AC-1 : premier passage, pas déployé, aucune écriture
Dans chico, sur `main`, arbre propre : `/erom-seo:checklist`, répondre « non » à « c'est déployé ? ». Puis `cat seo/checklist.md`.
Attendu : lignes 1 et 2 cochées (n2 du 29/08 vert, commit `seo(…)` sur main), 3 et 4 vides avec leur consigne, 5 vide « absent du compte Bing de l'agence » (clé présente, compte vide), 6 « sans objet », toute la moitié « Après » vide. Aucune requête sortante autre que `GetUserSites` : relancer le script à la main avec `BING_WMT_API_KEY=""` et comparer, seule la ligne 5 change.

## AC-2 : une case main survit
Remplacer `- [ ] Search Console : propriété créée` par `- [x] …` dans `seo/checklist.md`, relancer `/erom-seo:checklist`. `grep "Search Console : propriété créée" seo/checklist.md` : cochée avant et après.

## AC-3 : déployé, la prod est auditée, les jalons sont datés
Relancer, répondre « oui », date `2026-08-29`, « pas d'ancien site ». Attendu : `ls seo/audits/` montre un n0 du jour ; « Prod verte » suit ce rapport ; J+1 = 2026-08-30, J+3 = 2026-09-01, J+7 = 2026-09-05, J+30 = 2026-09-28, J+90 = 2026-11-27 ; sous J+3, les 10 pages sur www.
Note : si le n0 du jour n'est pas vert, la case reste vide avec « En bref » : c'est le comportement attendu, noter les trouvailles.

## AC-4 : le ping, avec accord
La skill propose « ping IndexNow : 10 URL de www.commentchercherbonheur.org, clé bf49… ». Romain dit OK. Attendu : la ligne « Ping IndexNow » cochée, `2026-08-29 · 200, 10 URL` ou `202`. Coller la réponse réelle (code) ici : c'est l'échantillon manquant de la recherche (incertitude 1). Relancer la skill : le ping n'est pas reproposé. Vérifier ensuite dans Bing Webmaster Tools, IndexNow, si le site y est un jour ajouté.
« Sitemap soumis à Bing » reste « en attente » tant que le compte Bing est vide : attendu.

## AC-5 : la prod qui régresse (test)
`cd /Users/recarnot/dev/erom-agence-seo-chantier-4/plugin && bun test skills/checklist/scripts/tests/checklist.test.ts -t "régresse"` : pass. Sur chico, facultatif : copier le dernier n0 en `seo/audits/<date>-n0-2/`, y remplacer le rapport par un rapport avec une trouvaille Critique (fixture `report.md` de chico), relancer le script à la main : « Prod verte » vide avec « En bref ». Puis supprimer ce dossier (`trash`).

## AC-6 : ancien sitemap (test)
`bun test skills/checklist/scripts/tests/ancien-sitemap.test.ts skills/checklist/scripts/tests/checklist-cli.test.ts -t "ancien"` : pass. Sur chico, facultatif : `--ancien-sitemap` avec un fichier XML de deux URL inventées sur un autre domaine ; « Redirections » vide avec les deux URL et leur code ; puis `trash seo/checklist/`.

## Bilan
(à remplir en tâche 7 : OK/KO par AC, réponse réelle d'IndexNow, écarts, correctifs)
