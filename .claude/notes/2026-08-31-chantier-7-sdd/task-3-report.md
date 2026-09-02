# Rapport tâche 3 : le module commun des trois soumissions

## Ce qui a été fait

Réuni les trois écritures vers les moteurs (IndexNow, Bing SubmitFeed, Google sitemaps.submit) dans `plugin/lib/soumission.ts`, avec les quatre fonctions neuves annoncées par le brief. `actions.ts` est réduit à un réexport pour que les appelants et les 44 tests de `checklist` gardent leur import inchangé.

### Fichiers touchés

- **Créé** `plugin/lib/soumission.ts` : module commun (208 lignes). Contient les cinq fonctions/constantes déménagées à l'identique (`INDEXNOW_MESSAGES`, `defaultFetcher`, `urlsOnOrigin`, `pingIndexNow`, `bingError`, `bingUserSites`, `bingSubmitFeed`) et les quatre fonctions neuves (`sitemapsFromRobots`, `trouverSitemap`, `verifierCleServie`, `submitSitemapGoogle`).
- **Créé** `plugin/lib/tests/soumission.test.ts` : 7 tests, 24 assertions, repris tels quels du brief.
- **Modifié** `plugin/skills/checklist/scripts/lib/actions.ts` : réduit de 84 à 8 lignes, un pur réexport depuis `../../../../lib/soumission`.
- **Modifié** `plugin/skills/checklist/scripts/lib/checklist.ts` : `ActionResult` remplacé par un `import type` depuis le commun, `BingSite` inchangé.
- **Modifié** `plugin/lib/bing.ts` : commentaire d'en-tête (lignes 2-3) corrigé pour refléter le déménagement de l'écriture vers `lib/soumission.ts`. Le `bingUserSites` de ce fichier (ligne 62, comportement différent) n'a pas été touché, conformément à la dette assumée du brief.

## Boucle TDD

**Étape 1** : tests écrits dans `plugin/lib/tests/soumission.test.ts` (contenu du brief, verbatim), module `soumission.ts` volontairement absent au moment de l'écriture des tests (créé après, cf. étape 2 pour la preuve du rouge).

**Étape 2, rouge confirmé** — le module a été déplacé hors du répertoire (`mv lib/soumission.ts /tmp/.../soumission.ts.tmp`) pour rejouer honnêtement l'état « module absent » :

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test lib/tests/soumission.test.ts

bun test v1.4.0 (34cbb9a40)

lib/tests/soumission.test.ts:

# Unhandled error between tests
-------------------------------
error: Cannot find module '../soumission' from '/Users/recarnot/dev/erom-seo-chantier-7/plugin/lib/tests/soumission.test.ts'
-------------------------------

 0 pass
 1 fail
 1 error
Ran 1 test across 1 file. [13.00ms]
```

**Étape 3, module restauré, vert** :

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test lib/tests/soumission.test.ts

bun test v1.4.0 (34cbb9a40)

 7 pass
 0 fail
 24 expect() calls
Ran 7 tests across 1 file. [13.00ms]
```

## AC-6 : les 44 tests de `checklist` passent sans qu'une assertion change

Baseline (avant toute modification, HEAD = `d28a5e7`) :

```
$ bun test skills/checklist
 44 pass
 0 fail
 279 expect() calls
Ran 44 tests across 5 files. [1.92s]
```

Après le déménagement :

```
$ bun test skills/checklist
 44 pass
 0 fail
 279 expect() calls
Ran 44 tests across 5 files. [1.97s]
```

Même nombre de tests, même nombre d'assertions (279). Vérification que les fichiers de tests n'ont pas été touchés :

```
$ git diff --stat -- plugin/skills/checklist/scripts/tests/
(vide)
```

**Comparaison caractère pour caractère du bloc déménagé contre l'original** (`git show d28a5e7:plugin/skills/checklist/scripts/lib/actions.ts`), du début d'`INDEXNOW_MESSAGES` à la fin de `bingSubmitFeed` :

```
$ diff original-block.ts new-block.ts && echo "IDENTIQUE, caractere pour caractere"
IDENTIQUE, caractere pour caractere
```

## Suite complète

Baseline avant la tâche : 514 pass, 0 fail, 39 fichiers.
Après la tâche :

```
$ cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
bun test v1.4.0 (34cbb9a40)

 521 pass
 0 fail
 2230 expect() calls
Ran 521 tests across 40 files. [5.05s]
```

521 = 514 + 7 (les nouveaux tests de `soumission.test.ts`). 40 = 39 + 1 (le nouveau fichier). Rien n'est cassé ailleurs dans le plugin.

## Le commun ne dépend d'aucune skill

```
$ command grep -rn 'from "\.\./skills\|from "\./skills\|skills/' plugin/lib/*.ts ; echo "exit $?"
plugin/lib/report.ts:1:// Lecture du rapport d'audit (report.md). Le format est tenu par skills/audit/scripts/lint-report.ts ; ce parseur suit
plugin/lib/sitemap.ts:1:// Primitives de sitemap partagées. Remontées de skills/audit/scripts/lib/sitemap.ts le 31/08 (chantier 7) :
plugin/lib/url.ts:1:// Primitives d'URL partagées par les skills. Extraites de skills/audit/scripts/lib/sitemap.ts le 30/08
exit 0
```

Cette commande, prise littéralement, ne rend pas la sortie vide attendue par le brief. **Vérifié que ce n'est pas une régression de cette tâche** : les trois lignes trouvées sont des commentaires de provenance historique (« remonté de skills/audit/... », « le format est tenu par skills/audit/... »), déjà présents à l'identique sur `d28a5e7` (avant toute modification de cette tâche) — confirmé par `git show d28a5e7:plugin/lib/{report,sitemap,url}.ts`. Ce sont des sous-chaînes `skills/` dans du texte, pas des imports. Aucune de ces trois lignes n'est un `import ... from "skills/..."` réel.

Le fichier que j'ai créé, isolé :

```
$ command grep -n 'from "\.\./skills\|from "\./skills\|skills/' plugin/lib/soumission.ts; echo "exit $?"
exit 1
```

`lib/soumission.ts` respecte la règle à la lettre : zéro occurrence. Le faux positif est une dette préexistante du dépôt sur la formulation littérale de la commande de vérification (elle attrape un commentaire de provenance, pas seulement un import), pas quelque chose introduit ici. Signalé, non corrigé, conformément à la discipline « chirurgical : ne toucher que ce que la tâche exige ».

## Vérifications complémentaires

- Aucun tiret cadratin dans les cinq fichiers touchés (`grep` sur `—`, exit 1 sur les cinq).
- Aucune valeur de test en 32 caractères hexadécimaux dans `soumission.test.ts` (`grep -Eo '[0-9a-f]{32}'`, exit 1). Le jeton de test utilisé est `jeton-de-test-non-hex`.
- `git diff` des trois fichiers modifiés relu ligne à ligne : conforme au brief, aucun octet des cinq fonctions déménagées n'a changé, le réexport d'`actions.ts` et l'import dans `checklist.ts` correspondent exactement aux blocs donnés.

## Doutes et points d'attention

- **Import au milieu du fichier dans `checklist.ts`** : le brief demande de remplacer la définition locale d'`ActionResult` (ligne 113, au milieu du fichier) par `import type { ActionResult } from "../../../../lib/soumission"; export type { ActionResult };`, à cet endroit précis plutôt qu'en tête de fichier. C'est ce qui a été fait, tel quel. JS/TS hoiste les imports quelle que soit leur position dans le module donc ça fonctionne (confirmé par les 44 tests verts), mais c'est un style de placement inhabituel qu'un lecteur pourrait trouver surprenant au premier coup d'œil. Je ne l'ai pas déplacé en tête de fichier : ce n'était pas ce que le brief demandait et ce n'est pas dans le périmètre chirurgical de cette tâche.
- **La duplication `bingUserSites`** (dette documentée par le brief lui-même, table en tête de tâche) est intacte : celui de `lib/bing.ts:62` (lit `ErrorCode`, lève `BingError` typée) et celui déménagé dans `lib/soumission.ts` (ne lit pas `ErrorCode`, lève une `Error` nue) coexistent sans fusion ni suppression. Aucun des deux appelants existants (`console.ts` importe celui de `lib/bing`, `checklist.ts` via `actions.ts` importe celui de `lib/soumission`) n'a changé de source.
- **Faux positif du grep de vérification `lib/`** (détaillé ci-dessus) : dette préexistante, pas une régression, signalée sans être corrigée.

Aucun blocage. Toutes les étapes du brief exécutées dans l'ordre, aucun sous-agent utilisé.
