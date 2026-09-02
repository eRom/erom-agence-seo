## Task 8: La recette sur CHICO

**Files:** aucun fichier du plugin. Produit `docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-recette.md`.

**Interfaces:** aucune. Cette tâche exécute les huit critères d'acceptation de la spec et consigne les réponses réelles.

Cette tâche **ne peut pas être déléguée à un sous-agent** : elle demande le OK de Romain avant chaque écriture réelle, et un élargissement de scope qu'il est le seul à pouvoir faire.

**Deux dépôts, et il faut les deux.** Le dossier client `clients/commentchercherbonheur.org/` est ignoré par git : il n'existe **que** dans le checkout principal `/Users/recarnot/dev/erom-agence-seo`. Le code du chantier, lui, n'existe que dans le worktree. Chaque commande de recette se lance donc depuis le dossier client du checkout principal, en pointant le script du worktree par son chemin absolu. Le raccourci `.../console.ts` n'est jamais écrit tel quel : il se développe en entier à chaque fois.

```bash
CONSOLE=/Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts
CLIENT=/Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org
```

- [ ] **Step 1: Relever l'état avant, pour pouvoir prouver l'après**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts sites
```

Coller la sortie dans la recette : c'est la date de soumission du sitemap **avant**, la seule preuve que le PUT a fait quelque chose.

- [ ] **Step 2: AC-3, capturer le refus de scope, sans `--dry-run`**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update ; echo "code $?"
```

**Sans `--dry-run`, et c'est délibéré.** Le mode simulation fabrique le résultat Google au lieu d'appeler l'API : il ne peut donc pas produire le refus de scope, qui est exactement ce que ce critère doit capturer. L'appel réel est sans risque ici : le jeton n'a pas le scope d'écriture, Google refuse avant tout effet, et le refus est l'observation recherchée.

Attendu : la ligne `google` porte le refus de scope et la commande `gcloud` complète ; les lignes `bing` et `indexnow`, elles, vont réellement partir. **Ce cas ne se rejoue plus après l'étape 3 : c'est maintenant ou jamais.**

- [ ] **Step 3: Demander à Romain d'élargir le scope**

Lui donner la commande et attendre qu'il l'ait lancée lui-même. Un `gcloud auth application-default login` ouvre un navigateur et demande un compte : ce n'est pas une commande à lancer à sa place.

```bash
gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
```

Cette commande est identique, au caractère près, à celle de `SUBMIT_HINT` (T2) et à celle d'`ACC-07` (T6). Les trois doivent le rester : c'est la commande que le message d'erreur donne à l'utilisateur, et une variante qui traîne dans la documentation est une variante que quelqu'un finira par coller.

Vérifier ensuite, sans jamais afficher le jeton :

```bash
source ~/.zshenv && T=$(gcloud auth application-default print-access-token) && \
  curl -s "https://oauth2.googleapis.com/tokeninfo?access_token=$T" | python3 -c "import sys,json; print(json.load(sys.stdin).get('scope'))"
```

Attendu : la chaîne contient `auth/webmasters` sans le suffixe `.readonly`.

- [ ] **Step 4: AC-1 et AC-5, le dry-run**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --dry-run ; echo "code $?"
BING_WMT_API_KEY= bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --dry-run ; echo "code $?"
```

Attendu : la première sortie annonce les trois envois au futur ; la seconde dit `non interrogé (clé absente)` sur la ligne Bing et sort quand même en 0. Relancer `console sites` pour confirmer que la date de soumission du sitemap n'a pas bougé depuis l'étape 2.

- [ ] **Step 5: AC-2, l'envoi réel, après le OK de Romain**

Montrer la sortie du dry-run, demander le OK, puis :

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update ; echo "code $?"
```

Coller les trois réponses réelles dans la recette. Deux n'ont jamais été observées : le succès du PUT Google, et le comportement de `SubmitFeed` quand le compte Bing connaît le site en apex (`https://commentchercherbonheur.org/`) alors que le sitemap est sur le www. C'est l'incertitude 1 de la spec, et c'est ici qu'elle se lève.

**Consigner le corps brut de la réponse Bing, pas seulement la ligne rendue.** `bingSubmitFeed` traite tout HTTP 200 comme un succès sans regarder le champ `ErrorCode`, alors que `lib/bing.ts` teste `ErrorCode` avant le code HTTP, ce qui atteste que Bing sait renvoyer un refus dans un corps en 200. Si Bing refuse ainsi, la commande dira « soumis » et l'incertitude 1 serait close à tort. Capturer le corps par un curl direct en parallèle :

```bash
source ~/.zshenv && curl -s -X POST -H "content-type: application/json; charset=utf-8" \
  -d '{"siteUrl":"https://commentchercherbonheur.org/","feedUrl":"https://www.commentchercherbonheur.org/sitemap.xml"}' \
  "https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=$BING_WMT_API_KEY" \
  | sed "s/$BING_WMT_API_KEY/[CLE]/g" ; echo
```

Attendu si tout va bien : `{"d":null}`. Tout autre corps, en particulier un `ErrorCode` non nul, ouvre une ligne de suite : soit `bingSubmitFeed` doit lire `ErrorCode` comme le fait `lib/bing.ts` (correctif hors de ce chantier, la copie devait rester à l'identique pour AC-6), soit la variante www est à ajouter dans le compte Bing, ce qui est un geste de compte.

- [ ] **Step 6: AC-2 suite, la preuve côté consoles**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts sites
```

Attendu : la date de soumission du sitemap chez Google a changé par rapport à l'étape 1.

- [ ] **Step 7: AC-4, le ping d'une page seule**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --url https://www.commentchercherbonheur.org/methode ; echo "code $?"
bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --url https://exemple.fr/x ; echo "code $?"
```

Attendu : la première ne porte aucune ligne `google` ni `bing` et rend 202 chez IndexNow ; la seconde refuse en nommant `exemple.fr` et sort en 1 sans requête.

- [ ] **Step 8: AC-7, TAG-05, et ce que les tests ne prouvent pas**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/audit
```

**Ce que ce test prouve, et ce qu'il ne prouve pas.** Aucun code du dépôt ne calcule les trouvailles : le catalogue est déclaratif, `parseChecks` ne fait que le lire et `lint-report.ts` ne vérifie que la forme du rapport. C'est Claude qui juge, en lisant `references/checks/`. Le test prouve donc que le titre long du site jouet est collecté entier dans `derived/pages.json`, ce qui est la condition pour que TAG-05 soit jugeable. Il ne prouve pas qu'une trouvaille sort.

La vérification du critère se fait à la main, sur une exécution d'audit réelle : lancer `/erom-seo:audit` sur un site portant un titre de plus de 65 caractères et lire le rapport. Aucun site du portefeuille n'en porte au 31/08, mesuré ce jour-là : CHICO au plus long 58 caractères (`/institut`), `romain-ecarnot.com` 58, `lebonpote.romain-ecarnot.com` 55. Consigner AC-7 comme **non vérifié sur cible réelle**, avec cette raison, plutôt que de l'arrondir au vert du test unitaire.

- [ ] **Step 9: Écrire la recette et mettre à jour la mémoire du dépôt**

Créer `docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-recette.md` avec, par critère, la commande lancée et sa sortie réelle. Un critère non atteint s'écrit tel quel, jamais arrondi.

Puis mettre à jour :
- `_memory_/architecture.md` : la section du verbe `console` dit aujourd'hui « lentille **en lecture seule** » et « les deux écritures du plugin restent dans `checklist --agir` (D30) ». Les deux phrases sont fausses après ce chantier.
- `_memory_/key-files.md` : `lib/soumission.ts`, `lib/sitemap.ts`, et la ligne de `gsc.ts` qui dit « Aucune écriture, et il n'y en aura pas ».
- `_memory_/gotchas.md` : trois entrées. Le jeton gcloud par défaut ne porte que `webmasters.readonly`, et un `application-default login` qui omet un scope le retire. `bingUserSites` existe en deux exemplaires au comportement différent (`lib/bing.ts` lit `ErrorCode` avant le code HTTP, `lib/soumission.ts` non), donc un import qui mélange les deux change silencieusement le comportement de trois commandes. Le rôle Owner pour `sitemaps.submit` par API n'est documenté nulle part : la page d'aide qui l'affirme parle du rapport Sitemaps de l'interface web.

- [ ] **Step 10: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add docs/ _memory_/
git commit -m "docs(recette): chantier 7, la soumission recettee sur CHICO"
```

---
## Ordre et dépendances

```
T1 (sitemap commun)
 └─> T2 (ecriture Google)
      └─> T3 (module commun)
           └─> T4 (console update)
                └─> T5 (--url, --dry-run)
                     └─> T6 (SKILL.md, acces.md)

T7 (TAG-05, du cablage au catalogue)   en parallele, des le depart

                                       └─> T8 (recette, apres T6 et T7)
```

T7 ne touche aucun fichier de T1 à T6 : elle peut partir en parallèle de l'autre branche dès le début. Elle est indivisible : trois tests existants lisent le catalogue, et le scinder laisserait la suite rouge entre les deux moitiés.

## Auto-revue du plan

**Couverture de la spec.** D50 est portée par T4 (branche `update`), T6 (le paragraphe de tête et le frontmatter du SKILL.md, qui affirment aujourd'hui le contraire) et T3 (le commentaire de `lib/bing.ts`). D51 par T2, y compris son commentaire de tête et sa vérification par grep en AC-8. D52 par T3. D53 par `trouverSitemap` en T3 et la sonde de redirection en T4. D54 par `verifierCleServie` en T3, et par le test de T4 qui vérifie qu'une clé différente est un échec. D55 par T5. D56 par T5 (le drapeau) et T6 (la discipline). D57 par le partage explicite entre raison d'échec et raison de non-applicabilité en T4. D58 par T7. Les huit critères d'acceptation sont exécutés en T8, sauf AC-6 (T3, étape 6) et AC-8 (T2, étape 6), qui se jouent au moment où le risque existe plutôt qu'à la fin.

**Ce que la revue adversariale a changé, avant qu'une ligne de code soit écrite.** Un relecteur sur modèle capable a passé le plan au crible, avec pour consigne de ne faire confiance à aucun de ses résumés et d'aller relire la documentation des trois API. Il a rendu 26 défauts, dont 8 bloquants, cinq reproduits par exécution. Les huit bloquants sont corrigés ici :

1. **Les 32 chemins pointaient sur le checkout principal**, pas sur le worktree. Dans le mauvais arbre, `bun test` sort vert à 506 tests et **cache** tous les autres défauts au lieu de les révéler, et `git add` échoue en pathspec. Corrigé partout, avec l'exception documentée du dossier client de T8, qui n'existe que dans le checkout principal.
2. **T4 importait `bingUserSites` en double.** `console.ts:6` l'importe déjà de `lib/bing`, et bun ne lève rien : il relie tout le module au dernier import. Les trois commandes déjà recettées auraient basculé en silence sur une implémentation qui ne lit pas `ErrorCode`, perdant le message « la clé n'est plus acceptée par Bing ». Aucun test n'aurait rougi.
3, 4, 5. **Trois tests existants que T7 faisait rougir** : `plan.test.ts:130` (tout id du catalogue a un genre), `lint-report.test.ts:114` (compte figé à 26), `checks-format.test.ts:34` (citation d'au moins 15 caractères, et « Titre trop long » en fait exactement 15). D'où la fusion des deux tâches TAG-05 et l'ordre inversé : le catalogue s'écrit en dernier.
6. **Les tests de T4 et T5 appelaient un helper `deps()` à la mauvaise signature** et n'injectaient aucune stratégie, donc aucun POST IndexNow n'aurait pu partir.
7. **Le grep d'AC-8 se déclenchait sur sa propre documentation** : il cherchait `sitemaps.delete`, mot que T2 venait d'écrire dans un commentaire.
8. **Le dry-run rendait AC-3 inobservable** : il court-circuite l'appel Google, donc il ne peut pas produire le refus de scope que ce critère doit capturer.

Un neuvième, non bloquant mais que rien n'aurait rattrapé : **la citation Owner était tronquée d'une manière qui la retournait**. « You must have owner permissions on a property to submit a sitemap » s'arrête en réalité sur « **using the Sitemaps report** », c'est-à-dire l'interface web. Aucune page ne pose Owner comme prérequis de l'API, qui demande seulement « appropriate access (owner, full, read) ». Une citation tronquée passe `check-sources.ts`, passe les tests, et s'installe comme une source vérifiée.

**Code exécuté avant d'être écrit ici.** `sitemapsFromRobots` a passé 10 cas dans un scratch, dont le commentaire de fin de ligne que la première version perdait. La construction du chemin Google a été comparée caractère par caractère au chemin d'un `curl` réel qui a atteint `SitemapsService.Submit`, et son refus 403 est l'échantillon littéral reproduit en T2. Le corps IndexNow et celui de `SubmitFeed` sont copiés d'un code en production, figé sur les exemples officiels du 29/08 et reconfirmés sur la documentation le 31/08.

**Blocs non normatifs, assumés comme tels.** Deux seulement : le montage du test de T7 étape 1, qui recopie celui d'un test voisin, et le corps du test de T7 étape 10, décrit par son invariant. Tous les autres blocs de test sont normatifs et se transcrivent tels quels, le faux serveur de T4 étant paramétré une fois puis réutilisé par les neuf tests de T4 et T5.

**Cohérence des noms.** `ActionResult` est défini une fois en T3 et réexporté par `checklist.ts` et `actions.ts`. `Fetcher` a un seul retour, `{ status, text, final? }`, aligné en T2 dans `auth-google.ts` et `gsc.ts`. `submitSitemap` (gsc, lève) et `submitSitemapGoogle` (soumission, rend un `ActionResult`) sont deux noms pour deux couches, jamais confondus. `pingIndexNow` et `bingSubmitFeed` gardent leurs noms d'origine, écart avec la section 3 de la spec assumé et justifié en tête de plan. La commande `gcloud` est identique au caractère près à ses trois occurrences (T2, T6, T8).

**Une dette laissée en place, et nommée.** `bingUserSites` existe en deux exemplaires au comportement différent, et ce chantier n'y touche pas : les fusionner changerait le comportement de `checklist`, dont les 44 tests doivent passer sans qu'une assertion bouge. La table est en tête de T3, l'entrée de gotcha en T8 étape 9.
