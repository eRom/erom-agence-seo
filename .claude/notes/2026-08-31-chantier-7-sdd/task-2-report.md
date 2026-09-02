# Rapport tâche 2 : l'écriture Google, seule de son espèce

Statut : DONE.

## Ce qui a été fait

Ajout de `sitemaps.submit` (Search Console) dans `plugin/lib/gsc.ts`, seule écriture que le plugin fera jamais côté Google (D51). Trois fichiers touchés, exactement ceux du brief, aucun autre.

1. **`plugin/lib/auth-google.ts`**
   - `FetchInit.method` élargi à `"GET" | "POST" | "PUT"`.
   - `Fetcher` gagne un champ `final?: string` dans son retour (URL après redirection, D53, non consommé par cette tâche).
   - `SCOPE_WRITE` = `https://www.googleapis.com/auth/webmasters` (couvre `webmasters.readonly`, donc aucune perte de lecture).
   - `SUBMIT_HINT` : message de refus de scope qui pointe vers `SCOPE_WRITE`, distinct de `LOGIN_HINT` qui pointe vers le scope lecture.

2. **`plugin/lib/gsc.ts`**
   - `FetchInit`/`Fetcher` locaux répercutent la même forme (`PUT` + `final?`).
   - Import de `SUBMIT_HINT` ajouté.
   - `fail()` gagne un cinquième paramètre `ecriture = false` :
     - branche `ACCESS_TOKEN_SCOPE_INSUFFICIENT` : `ecriture ? SUBMIT_HINT : LOGIN_HINT`.
     - branche 403 générique : message distinct côté écriture (rôle Owner probable, repli robots.txt), inchangé côté lecture.
   - `submitSitemap(f, auth, siteUrl, feedUrl)` ajoutée en fin de fichier : construit l'URL `PUT {WMX_BASE}/sites/{siteUrl encodé}/sitemaps/{feedUrl encodé}`, appelle `f` directement (pas `call()`, qui exige un 200 et parse du JSON alors que le PUT rend un corps vide), accepte 200 et 204 comme succès, appelle `fail(..., true)` sinon.
   - Commentaire de tête corrigé : ne dit plus « aucune écriture », nomme les trois écritures refusées (`sitemaps.delete`, `sites.add`, `sites.delete`) et pourquoi.

3. **`plugin/lib/tests/gsc.test.ts`**
   - Import mis à jour : `submitSitemap` ajouté depuis `../gsc`, `SUBMIT_HINT` ajouté depuis `../auth-google` (fusionné dans la ligne d'import existante plutôt que dupliqué, par cohérence avec le style du fichier voisin `auth-google.test.ts` qui mélange déjà valeurs et `type X` inline).
   - 4 tests ajoutés, verbatim du brief : chemin/encodage exact, 200 accepté comme 204, `SUBMIT_HINT` sur scope insuffisant, message « propriétaire » sur 403 générique.

## Preuve de la boucle TDD

**Avant (échec attendu) :**

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test lib/tests/gsc.test.ts
bun test v1.4.0 (34cbb9a40)

lib/tests/gsc.test.ts:

# Unhandled error between tests
-------------------------------
SyntaxError: Export named 'submitSitemap' not found in module '/Users/recarnot/dev/erom-seo-chantier-7/plugin/lib/gsc.ts'.
-------------------------------

 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [13.00ms]
```

**Après implémentation (succès) :**

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test lib/tests/gsc.test.ts
bun test v1.4.0 (34cbb9a40)

 26 pass
 0 fail
 74 expect() calls
Ran 26 tests across 1 file. [20.00ms]
```

**Suite complète du dépôt :**

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
bun test v1.4.0 (34cbb9a40)

 513 pass
 0 fail
 2203 expect() calls
Ran 513 tests across 39 files. [4.93s]
```

Sortie propre, aucun avertissement résiduel.

## Vérification AC-8 (aucune autre écriture)

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7 && command grep -rnE 'method: *"DELETE"' plugin/lib plugin/skills --include='*.ts' ; echo "exit $?"
exit 1

$ head -3 plugin/lib/gsc.ts
// Les lectures Search Console, plus une écriture et une seule : sitemaps.submit (D51, chantier 7).
// Refusées explicitement, bien que le scope les autorise : sitemaps.delete, sites.add, sites.delete.
// Conventions capturées en vrai le 29/08 et le 31/08 sur les propriétés de Romain.
```

Aucune ligne `method: "DELETE"` dans le code (le grep ne retrouve que sa propre documentation dans les commentaires, ce qui est attendu et sans risque de faux négatif puisqu'il cible l'appel, pas le mot). Le commentaire de tête nomme bien les trois écritures refusées et pourquoi.

## Autres vérifications faites

- `command grep -c` sur les trois fichiers pour toute chaîne hex32 : 0 partout. Aucun secret, aucune valeur de test masquable.
- `command grep -n "—"` sur le diff complet : aucun tiret cadratin.
- Aucune assertion existante modifiée : les 22 tests préexistants de `gsc.test.ts` (et les 509 autres du dépôt) passent tels quels.
- `plugin/lib/` ne dépend toujours d'aucune skill (rien touché hors `lib/` et ses tests).

## Relecture de mon propre diff

Diff relu ligne à ligne (`git diff` sur les trois fichiers avant commit). Conforme au brief :
- `fail()` : la branche de scope insuffisant et la branche 403 générique passent bien `ecriture` au bon endroit ; les cinq autres branches de `fail()` (SERVICE_DISABLED, USER_PROJECT_DENIED, 401, 404, statut générique) sont inchangées, comme attendu puisque seul l'appel écriture-lecture est concerné.
- `submitSitemap` n'appelle jamais `call()`, construit sa requête à la main comme demandé, et transmet `true` à `fail()`.
- Les deux paires `FetchInit`/`Fetcher` (`auth-google.ts` et `gsc.ts`) sont maintenant identiques en forme ; `gsc.ts` garde sa propre déclaration locale plutôt que d'importer celle d'`auth-google.ts`, ce que je pense correct : le brief demandait explicitement de « répercuter » (dupliquer) la forme, pas de faire dépendre `gsc.ts` du type d'`auth-google.ts`, et c'est aussi ce que dit déjà le commentaire voisin (« auth-google déclare son propre Fetcher »).
- Le commit ne touche que les trois fichiers listés (`git add` explicite des trois chemins, pas de `git add -A`).

## Doutes

- Un seul point mineur, sans impact fonctionnel : dans `gsc.test.ts`, j'ai fusionné l'import de `SUBMIT_HINT` avec celui de `GoogleAuth` (`import { SUBMIT_HINT, type GoogleAuth } from "../auth-google";`) plutôt que d'ajouter une seconde ligne `import { SUBMIT_HINT } from "../auth-google";` comme l'écrit littéralement le brief. Comportement strictement identique, choix fait pour suivre le motif déjà présent dans `auth-google.test.ts` (mélange valeur + `type X` inline) et éviter un import dupliqué du même module. Signalé au cas où la lettre du brief était voulue.
- Le champ `final?: string` ajouté au retour du `Fetcher` n'est consommé par rien dans cette tâche (le brief le dit : « seul console update s'en sert », hors périmètre). Normal, pas une dérive.

---

# Rapport de correction (relecture)

Statut : DONE.

## Ce qui a été changé

Six corrections demandées par la relecture, toutes appliquées.

**Important 1 (test faible, mutation vérifiée).** `plugin/lib/tests/gsc.test.ts:44` et `:94` : les deux tests de scope/401 en lecture asséraient `toContain("gcloud auth application-default login")`, chaîne présente dans `LOGIN_HINT` comme dans `SUBMIT_HINT`. Remplacé par `toBe(LOGIN_HINT)` aux deux endroits (import de `LOGIN_HINT` ajouté). Mutation rejouée (`SUBMIT_HINT` sans condition sur la branche scope) : échoue maintenant sur `listProperties > un 403 de scope donne la commande de connexion`.

**Important 2 (headers non couverts, mutation vérifiée).** Le premier test `submitSitemap` utilisait un faux fetcher écrit à la main qui ne capturait ni `init.headers`. Réécrit avec le helper `fake()` déjà présent dans le fichier ; ajout de deux assertions : `authorization` = `Bearer ${auth.token}`, `x-goog-user-project` = `auth.quotaProject`. Mutation rejouée (`{ method: "PUT" }` sans `headers: headers(auth)`) : échoue maintenant sur `expect(calls[0].headers?.["authorization"]).toBe(...)` avec `Received: undefined`.

**Important 3 (branche 401 pas câblée sur `ecriture`).** `plugin/lib/gsc.ts:72` : `if (status === 401) throw new GscError(..., LOGIN_HINT)` devient `..., ecriture ? SUBMIT_HINT : LOGIN_HINT)`. Test ajouté : `un 401 pendant une écriture renvoie SUBMIT_HINT, jamais LOGIN_HINT` (appelle `submitSitemap` avec un 401, vérifie `SUBMIT_HINT`). Le test 401 en lecture existant (`fail() : les six branches`) est renforcé au même titre que l'important 1 (`toBe(LOGIN_HINT)`), donc les deux sens sont maintenant couverts par des tests distincts et non ambigus. Mutation rejouée (retrait du `ecriture ?`) : échoue sur le nouveau test.

**Mineur 4 (commentaire périmé).** `plugin/lib/auth-google.ts:7` : « gsc.ts (tâche 3) n'existe pas encore » remplacé par l'explication réelle de la duplication de forme (`Fetcher` sert deux appels différents, jeton OAuth d'un côté, Search Console de l'autre, sans dépendance croisée entre les deux modules).

**Mineur 5 (titre de describe trompeur).** `plugin/lib/tests/gsc.test.ts:223` : `describe("aucune écriture", ...)` renommé `describe("les lectures ne visent aucune URL de soumission", ...)`.

**Mineur 6 (variante de commande gcloud).** `docs/superpowers/specs/2026-08-31-erom-seo-soumission-design.md:179` : `--scopes=openid,email,...` aligné sur la forme canonique `--scopes=openid,https://www.googleapis.com/auth/userinfo.email,...`, identique aux trois autres occurrences du dépôt (vérifié par grep avant correction : une seule variante déviante trouvée).

## Tests lancés

**Ciblé, après corrections :**

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test lib/tests/gsc.test.ts
bun test v1.4.0 (34cbb9a40)

 27 pass
 0 fail
 77 expect() calls
Ran 27 tests across 1 file. [18.00ms]
```

**Preuve que les deux mutations signalées sont maintenant tuées** (rejouées une par une sur une copie de `gsc.ts`, puis restaurées) :

- Mutation « `SUBMIT_HINT` sans condition sur la branche scope » : `1 fail`, `listProperties > un 403 de scope donne la commande de connexion`.
- Mutation « PUT sans `headers` » : `1 fail`, sur l'assertion `authorization` (`Received: undefined`).
- Mutation « 401 sans `ecriture ?` » : `1 fail`, sur le nouveau test `un 401 pendant une écriture renvoie SUBMIT_HINT, jamais LOGIN_HINT`.

Fichier restauré après chaque essai (`git diff lib/gsc.ts` confirmé identique à la version corrigée, hors la ligne réelle du fix 401).

**Suite complète :**

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
bun test v1.4.0 (34cbb9a40)

 514 pass
 0 fail
 2206 expect() calls
Ran 514 tests across 39 files. [4.94s]
```

514 = 513 (commit précédent) + 1 (nouveau test 401 côté écriture).

**AC-8 revérifié :**

```
$ command grep -rnE 'method: *"DELETE"' plugin/lib plugin/skills --include='*.ts' ; echo "exit $?"
exit 1
```

**Hygiène du diff :** aucun tiret cadratin (`grep -n "—"` sur le diff complet, exit 1), aucune chaîne hex32 dans les trois fichiers `lib/` (`grep -cE '[0-9a-fA-F]{32}'` = 0 partout).

## Commit

`d28a5e7` fix(gsc): fermer les deux trous mutants sur l ecriture, corriger 4 details (4 fichiers, +32/-12).

## Doutes

Aucun nouveau. Le point mineur déjà signalé dans le rapport initial (fusion de l'import `SUBMIT_HINT`/`LOGIN_HINT` avec `GoogleAuth` plutôt que des lignes séparées) reste inchangé et sans impact.
