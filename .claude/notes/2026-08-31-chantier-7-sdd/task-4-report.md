# Rapport, tâche 4 : `console update`

## Ce qui a été fait

Ajout de la quatrième commande de `console`, la première qui écrit : soumission du sitemap à Google
(PUT) et Bing (SubmitFeed), POST groupé à IndexNow, avec vérification préalable que la clé IndexNow
est bien servie. Neuf étapes du brief suivies dans l'ordre.

1. Helper `deps()` des tests étendu (`fetcher`, `strategy` en option), sans toucher aux lignes `KEY` et
   `env:` qui portent la valeur masquée par la machine.
2. Cinq tests d'intégration ajoutés dans `describe("console update", ...)`, transcrits tels quels depuis
   le brief.
3. Rouge constaté (voir plus bas).
4. `UpdateView` et `renderUpdate` ajoutés à `lib/render.ts`, purs, une ligne par fait.
5. Quatre tests `renderUpdate` ajoutés dans leur propre `describe`, et les quatre sorties inscrites au
   filet anti tiret cadratin de `render.test.ts`.
6. Branche `update` écrite dans `console.ts` : lecture unique de `seo/strategy.md` en tête, sonde du
   robots.txt pour l'origine réellement servie (D53), recherche du sitemap, trois soumissions
   indépendantes (une panne n'arrête pas les autres), code de sortie piloté par `echecs` qui ne compte
   que les vraies erreurs (jamais les trois cas non applicables).
7. `defaultFetcher` du bloc `import.meta.main` complété avec `final: res.url`.
8. Suite complète verte : 530 tests, 0 échec.
9. Commit `61cf2e3`.

## Preuve TDD

Rouge, avant l'implémentation de la branche `update` (étape 3) :

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console
...
 55 pass
 5 fail
 241 expect() calls
Ran 60 tests across 3 files. [28.00ms]
```

Les 5 échecs étaient les 5 tests neufs, tous retombés sur le message d'usage (`update` inconnu de
`runConsole`) :

```
error: expect(received).toBe(expected)
Expected: 0
Received: 1
(fail) console update > update soumet aux deux moteurs et poste les URL
...
Expected to contain: "gcloud auth application-default login"
Received: "usage : console sites | console inspect <url> | console crawl [--site <url>]   [--json]"
(fail) console update > un échec Google n'empêche ni Bing ni IndexNow, et vaut 1
```

Vert, après l'étape 6 (branche `update`) et l'étape 7 (fetcher réel) :

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
bun test v1.4.0 (34cbb9a40)
 530 pass
 0 fail
 2260 expect() calls
Ran 530 tests across 40 files. [5.15s]
```

Vérification de l'import unique de `bingUserSites` (point de rupture n°1 du brief) :

```
$ command grep -n "^import" skills/console/scripts/console.ts | command grep -c "bingUserSites"
1
```

## Fichiers touchés

- `plugin/skills/console/scripts/console.ts` : branche `update`, import de `lib/soumission` (sans
  `bingUserSites`), `USAGE`, commentaire de tête, `final` sur `defaultFetcher`.
- `plugin/skills/console/scripts/lib/render.ts` : `UpdateView`, `renderUpdate`.
- `plugin/skills/console/scripts/tests/console-cli.test.ts` : helper `deps()` étendu, `describe("console
  update", ...)` (5 tests).
- `plugin/skills/console/scripts/tests/render.test.ts` : `describe("renderUpdate", ...)` (4 tests),
  filet anti tiret cadratin étendu à 4 sorties `update`.

## Ce que ma relecture a trouvé

**Une erreur de chemin dans le brief, corrigée.** L'étape 1 donne le chemin de la fixture strategy.md
comme `${import.meta.dir}/../../../../checklist/scripts/tests/fixtures/chico/strategy.md` (4 niveaux).
Vérifié empiriquement (`import.meta.dir` sous Bun ne porte pas de slash final, comme le shell) : depuis
`plugin/skills/console/scripts/tests`, il faut remonter à `plugin/skills` puis redescendre dans
`checklist/...`, soit **3** niveaux, pas 4. Avec 4 niveaux le fichier n'existe pas
(`ls` confirmé en échec avant correction). Corrigé à 3 `../` ; sans quoi le module aurait planté au
chargement (Bun.file sur un chemin absent lève à l'`await` du top-level), ce qui aurait fait échouer
les 5 tests `update` avec une erreur de fichier, pas une erreur de logique.

**Écart mineur assumé face au brief : renommage de deux variables.** La « note pour l'implémenteur »
utilise `const r = urlsOnOrigin(...)` puis, plus loin, un paramètre de filtre lui aussi nommé `r`
(`.filter((r) => r !== null && !r.ok)`). Le second masque le premier : valide en JS/TS, sans risque
fonctionnel puisque chaque `r` reste dans sa propre portée, mais source de confusion à la lecture.
Renommé en `ramenees` (résultat de `urlsOnOrigin`) et `res`/`rai` (paramètres des deux `.filter`).
Comportement strictement identique, testé vert.

## Doutes, pour la revue

1. **Stratégie invalide + `--site` explicite : le POST IndexNow devient silencieusement « non
   applicable », sans jamais nommer le vrai problème.** Si `seo/strategy.md` existe mais ne s'analyse
   pas (erreur de parsing) et que l'appelant passe `--site` explicitement, `raisonStrategie` est bien
   calculé mais n'est surfacé nulle part : `strategie` reste `null`, donc `cle` reste `null`, et la
   ligne `indexnow` affiche « pas de clé IndexNow dans seo/strategy.md (Cadence de fraîcheur, IndexNow :
   non) » comme si le fichier n'avait jamais existé, sans mentionner l'échec d'analyse. Ce comportement
   reproduit exactement le code donné par le brief (étape 6), donc transcrit tel quel plutôt que corrigé
   d'initiative (hors périmètre du chemin nominal de cette tâche). Je le signale sans y toucher.
2. **Le mécanisme `declares` (sitemap déclaré via robots.txt) et la dérivation de `origine` via
   `sonde.final` ne sont pas indépendamment vérifiés par les 5 tests.** Dans le faux serveur fourni par
   le brief, l'origine demandée (`https://www.a.fr`) et l'origine finale du `robots.txt`
   (`final: "https://www.a.fr/robots.txt"`) coïncident toujours, et le sitemap déclaré coïncide avec le
   chemin par défaut `/sitemap.xml` : un mutant qui neutraliserait la lecture de `sonde.final` ou le
   passage de `declares` à `trouverSitemap` passerait ces 5 tests sans être détecté. C'est une propriété
   du jeu de tests normatif du brief (transcrit tel quel), pas une lacune que j'ai introduite ; je n'ai
   pas ajouté de test au delà du périmètre demandé.
3. La chaîne USAGE porte déjà les indicateurs `--url` et `--dry-run` de T5, non encore implémentés
   (comme demandé explicitement par le brief pour préparer T5).

## Vérification finale

- `bun test` (racine `plugin/`) : 530 pass, 0 fail, 2260 assertions.
- `command grep -n "—"` sur les 4 fichiers touchés : seule occurrence, l'assertion `.not.toContain("—")`
  elle-même (attendu).
- Diff relu intégralement avant ce rapport.

---

# Correction de revue

Neuf corrections demandées par le relecteur, toutes appliquées. Deux bloquants, quatre trous de
couverture (mutation testing manuel), trois mineurs. Commit `b2a38d9`.

## Bloquants

**Critique 1, `--dry-run`/`--url` annoncés mais non gardés.** Garde-fou ajouté en tête de branche
`update`, avant toute lecture de stratégie ou tout appel réseau :
```ts
if (rest.includes("--dry-run") || rest.includes("--url")) {
  return { out: "--dry-run et --url arrivent à la tâche suivante. Sans eux, update soumet pour de vrai.", code: 1 };
}
```
Deux tests ajoutés (`--dry-run`, `--url`), chacun vérifie code 1 et `calls` vide (aucune requête n'est
partie). T5 remplacera ce refus par la vraie implémentation.

**Critique 2, stratégie illisible + `--site` explicite mentait sur IndexNow.** `raisonStrategie` était
calculé puis mort dès que `--site` était fourni : la ligne IndexNow affichait « pas de clé IndexNow »
comme si le fichier n'avait jamais existé. Correction, avant le `if (!cle)` :
```ts
if (raisonStrategie) indexnowRaison = raisonStrategie;
else if (!cle) indexnowNonApplicable = "pas de clé IndexNow dans seo/strategy.md (Cadence de fraîcheur, IndexNow : non)";
```
Test ajouté : stratégie injectée invalide (`"markdown invalide sans titre"`) avec `--site` explicite,
la sortie contient « ne s'analyse pas », ne contient jamais « pas de clé IndexNow dans seo/strategy.md »,
code 1, aucun appel IndexNow.

## Trous de couverture (Important 1 à 4)

**Important 1, D53 sans assertion.** Un test dédié monte le cas complet : `--site https://a.fr` (apex),
robots.txt qui répond avec `final: "https://www.a.fr/robots.txt"` et déclare un sitemap à un chemin non
standard (`sitemap-articles.xml`, jamais `/sitemap.xml`). Trois assertions simultanées : la ligne site
porte `(demandé : https://a.fr)` avec l'origine www servie, le sitemap retenu est celui du robots (pas
le chemin par défaut), et `/robots.txt` n'est appelé qu'une fois.

**Important 2, deux non-applicables de D57 non pinnés.** Deux tests ajoutés : compte Bing qui ne connaît
pas le site (code 0, raison affichée), stratégie lisible mais sans clé IndexNow (fixture dérivée avec
`IndexNow : non`, code 0, raison affichée). Le faux serveur `serveur()` a gagné une option
`bingHoteAbsent` pour le premier cas.

**Important 3, try/catch d'isolation jamais exercés par un vrai throw.** Un test fait lever le fetcher
sur l'appel Bing (`GetUserSites`) avec une vraie exception. Vérifie que Google (PUT) et IndexNow (POST)
sont quand même partis, que la sortie porte le message de l'exception, et que le code vaut 1.

**Important 4, `update` absente du filet anti-fuite.** `["update", "--site", "https://www.a.fr"]` ajouté
à la boucle de `describe("aucun secret ne sort")`. Titre du test mis à jour (« quatre commandes »).

## Mineurs (5 à 8)

- **5** : les trois libellés moteur (`google`, `bing`, `indexnow`) élargis de 8 à 9 caractères dans
  `render.ts` pour que leurs deux-points tombent à la même colonne que ceux de `site`/`mode`/`sitemap`
  (colonne 11, vérifié par script avant et après).
- **6** : le test de simulation renommé et enrichi de `expect(out).toContain("simulation")`, pour ne
  plus dépendre uniquement d'une fixture qu'il a lui-même écrite.
- **7** : `simule: false` remplacé par `simule` (la variable) dans la vue construite quand aucun sitemap
  n'est trouvé. Sans effet observable tant que `--dry-run` reste bloqué par le garde-fou de la Critique 1,
  documenté comme tel.
- **8** : commentaire du faux serveur généralisé (« Faux serveur des tests d'update, paramétré ») plutôt
  que de fixer un nouveau compte qui red serait périmé dès le prochain test ajouté.

## Mutants rejoués à la main

Chaque correction a été vérifiée en appliquant le mutant inverse sur une copie de travail, en confirmant
que le test neuf tombe en rouge, puis en restaurant le fichier corrigé et en confirmant le retour au
vert. Neuf mutants, neuf morts :

| Mutant | Test tueur | Résultat avant restauration |
|---|---|---|
| Garde `--dry-run`/`--url` supprimé | `--dry-run est refusé…`, `--url est refusé…` | `code` attendu 1, reçu 0 sur les deux |
| `if (raisonStrategie) indexnowRaison = …` retiré | `stratégie illisible avec --site explicite…` | `code` attendu 1, reçu 0 |
| `sonde.final` ignoré (origine jamais réassignée) | `D53 : origine servie via redirection…` | ligne site sans `(demandé : …)`, sortie complètement différente |
| `declares` non transmis à `trouverSitemap` (undefined) | `D53 : …` | `/robots.txt` appelé 2 fois au lieu d'1 |
| `declares` remplacé par `[]` au site d'appel | `D53 : …` | sitemap non trouvé (« aucun sitemap trouvé ») |
| `declares` vidé en amont (ternaire toujours `[]`) | `D53 : …` | même échec, sitemap non trouvé |
| `indexnowNonApplicable` ajouté au calcul d'`echecs` | `D57 : pas de clé IndexNow…` | `code` attendu 0, reçu 1 |
| `bingNonApplicable` (hôte absent) ajouté au calcul d'`echecs` | `D57 : site absent du compte Bing…` | `code` attendu 0, reçu 1 |
| `catch (e) { bingRaison = reason(e); }` → `catch (e) { throw e; }` | `un transport qui lève sur l'appel Bing…` | exception non interceptée, test en échec avec la stack de l'erreur |
| Ligne `mode : simulation…` supprimée de `renderUpdate` | `en simulation, la ligne mode le dit…` | `toContain("simulation")` ne trouve rien |

Commandes réelles (extrait, le motif complet : mutation Python ciblée, `bun test … -t "<motif>"`,
constat du rouge, restauration depuis une copie sauvegardée, retour au vert) :

```
$ bun test skills/console/scripts/tests/console-cli.test.ts -t "dry-run|--url est refusé"
 0 pass / 2 fail   (avant restauration)
 2 pass / 0 fail   (après restauration)

$ bun test skills/console/scripts/tests/console-cli.test.ts -t "D53"
 0 pass / 1 fail   (à chacune des quatre variantes)
 1 pass / 0 fail   (après restauration)

$ bun test skills/console/scripts/tests/console-cli.test.ts -t "lève sur l'appel Bing"
 0 pass / 1 fail   (exception non catchée : "service injoignable : connexion refusée")
 1 pass / 0 fail   (après restauration)
```

## Vérification finale

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console
 71 pass
 0 fail
 289 expect() calls
Ran 71 tests across 3 files. [26.00ms]

$ bun test
 537 pass
 0 fail
 2286 expect() calls
Ran 537 tests across 40 files. [4.91s]
```

`command grep -n "—"` sur les quatre fichiers touchés : seule occurrence, l'assertion
`.not.toContain("—")` elle-même.

## Doutes résiduels, pour la prochaine relecture

1. **Mineur 7 est sans preuve possible aujourd'hui.** Le garde-fou de la Critique 1 bloque toute entrée
   dans la branche `update` dès que `--dry-run` est présent : le chemin « aucun sitemap trouvé en
   simulation » que corrige `simule` (au lieu de `simule: false`) est donc inatteignable par un test
   avant T5. Corrigé par anticipation, non testé, comme demandé.
2. Les try/catch d'isolation de Google et d'IndexNow (les deux autres tiers de l'Important 3) restent
   formellement non exercés par un test qui lève vraiment : seul celui de Bing l'est, conformément à la
   correction demandée (« un test »). Si une couverture complète des trois est voulue, deux tests
   analogues au même gabarit suffiraient.

---

# Deuxième correction de revue : couverture réelle des trois `catch` d'isolation

Le re-relecteur a mesuré empiriquement ce que je n'avais fait que soupçonner : la similarité textuelle
des trois `catch` (google/bing/indexnow) ne garantit rien sur l'équivalence de leur couverture, parce que
ce qui varie n'est pas le corps du `catch` mais tout ce qui l'entoure (mocks, ordre des appels, dépendance
à `auth()`). Mesure faite en rejouant `catch (e) → throw e` sur les trois branches :

- **Bing** : tué par le test dédié `console-cli.test.ts:294`, comme prévu.
- **IndexNow** : **non tué**. Aucun test ne faisait lever le transport sur l'appel IndexNow ; la suite
  restait à 71 pass avec le catch remplacé par une relance.
- **Google** : tué, mais **par accident**. Le test D53 crashait parce que son faux serveur ne répondait
  pas à `/webmasters/v3/sites`, faisant lever `listProperties` pour de vrai hors de tout scénario voulu
  par ce test. Compléter cette fixture (une amélioration normale) aurait fait disparaître ce filet sans
  que personne ne s'en aperçoive.

Commit `b334d18`.

## Corrections

**Fixture D53 complétée.** Ajout d'une réponse à `/webmasters/v3/sites` (`{"siteEntry":[]}`) dans le faux
serveur du test D53, pour qu'il ne teste plus par accident un crash de fixture mais uniquement ce qu'il
prétend tester (origine servie, sitemap au bon chemin, un seul GET robots.txt).

**Deux tests ajoutés**, sur le gabarit du test Bing (`console-cli.test.ts:294`), chacun sur le point
d'entrée équivalent de son moteur (la résolution avant soumission, symétrique du choix déjà fait pour
Bing sur `GetUserSites` plutôt que `SubmitFeed`) :

- Google : lève sur `GET https://www.googleapis.com/webmasters/v3/sites` (l'appel `listProperties`).
  Vérifie que Bing (`SubmitFeed`) et IndexNow (`api.indexnow.org`) partent quand même, code 1, message
  affiché.
- IndexNow : lève sur le GET de vérification de clé (`.txt` autre que `/robots.txt`, l'appel
  `verifierCleServie`). Vérifie que Google (`PUT`) et Bing (`SubmitFeed`) partent quand même, code 1,
  message affiché.

## Mutants rejoués après correction

Les trois mutations `catch → throw e` rejouées une par une sur une copie de travail restaurée entre
chaque essai :

```
$ bun test skills/console/scripts/tests/console-cli.test.ts -t "lève sur l'appel Google"
 0 pass / 1 fail  (avant restauration : exception non catchée, stack jusqu'à listProperties)
$ bun test skills/console/scripts/tests/console-cli.test.ts -t "D53"
 1 pass / 0 fail  (sous ce même mutant : la fixture complétée ne réagit plus par accident)

$ bun test skills/console/scripts/tests/console-cli.test.ts -t "lève sur l'appel IndexNow"
 0 pass / 1 fail  (avant restauration : exception non catchée, stack jusqu'à verifierCleServie)

$ bun test skills/console/scripts/tests/console-cli.test.ts -t "lève sur l'appel Bing"
 0 pass / 1 fail  (rejoué une troisième fois pour la série complète, stack jusqu'à bingUserSites)
```

Chaque mutant tue son propre test dédié, et le test D53 (rejoué sous le mutant Google) confirme qu'il ne
tue plus rien par accident : le filet Google est désormais porté par son propre test.

## Vérification finale

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console
 73 pass
 0 fail
 297 expect() calls
Ran 73 tests across 3 files. [23.00ms]

$ bun test
 539 pass
 0 fail
 2294 expect() calls
Ran 539 tests across 40 files. [5.21s]
```

`command grep -n "—"` sur les fichiers touchés : aucune occurrence.

Les trois `catch` d'isolation d'`update` sont maintenant chacun couvert par un test qui lève réellement,
au point d'entrée équivalent de son moteur. Plus de doute résiduel sur ce point.

---

# Troisième correction de revue : le même trou côté Bing dans D53

Ma vérification précédente n'avait rejoué D53 que sous le mutant Google, jamais sous les deux autres.
Sous le mutant Bing (`catch (e) { bingRaison = reason(e); }` → `catch (e) { throw e; }`), D53 rougissait
encore, avec `BingError: réponse illisible de Bing (GetUserSites, HTTP 404)` : sa fixture ne mockait
jamais `GetUserSites`, exactement le même défaut que celui bouché pour `/webmasters/v3/sites`, resté
ouvert côté Bing. Commit `357ab37`.

## Correction

Ajout d'une réponse vide à `GetUserSites` dans le faux serveur de D53, sur le même modèle que
`/webmasters/v3/sites` :
```ts
if (url.includes("/webmasters/v3/sites")) return { status: 200, text: '{"siteEntry":[]}' };
if (url.includes("GetUserSites")) return { status: 200, text: '{"d":[]}' };
```

## Rejeu des trois mutations, sur le fichier entier (pas filtré par nom)

Cette fois la vérification porte sur **quels** tests rougissent, pas seulement qu'un test rougit :
`bun test skills/console/scripts/tests/console-cli.test.ts` (sans `-t`) après chaque mutation, lu en
entier.

```
$ # mutant bing catch -> throw e
(fail) console update > un transport qui lève sur l'appel Bing n'empêche ni Google ni IndexNow, et vaut 1
 40 pass
 1 fail

$ # mutant google catch -> throw e
(fail) console update > un transport qui lève sur l'appel Google n'empêche ni Bing ni IndexNow, et vaut 1
 40 pass
 1 fail

$ # mutant indexnow catch -> throw e
(fail) console update > un transport qui lève sur l'appel IndexNow n'empêche ni Google ni Bing, et vaut 1
 40 pass
 1 fail
```

Chaque mutation ne fait tomber que son propre test dédié, une seule ligne `(fail)` à chaque fois, jamais
D53. Restauration confirmée identique au fichier corrigé entre chaque essai (`diff` vide).

## Vérification finale

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console
 73 pass
 0 fail
 297 expect() calls
Ran 73 tests across 3 files. [27.00ms]

$ bun test
 539 pass
 0 fail
 2294 expect() calls
Ran 539 tests across 40 files. [5.07s]
```

`command grep -n "—"` sur le fichier touché : aucune occurrence.

Les trois `catch` d'isolation d'`update` sont désormais chacun couvert par un test qui lève réellement et
par lui seul ; D53 est débiaisé sur les trois moteurs, pas seulement Google. Plus de défaut structurel
résiduel identifié sur ce point.
