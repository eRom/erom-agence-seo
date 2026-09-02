# Rapport — Tâche 1 : remonter les primitives de sitemap dans le commun

## Ce qui a été fait

Exécution des 6 étapes du brief, sans écart :

1. **`plugin/lib/sitemap.ts` créé** avec les trois fonctions (`parseSitemap`, `decodeSitemapBody`, `sitemapCandidates`) et le type `SitemapKind`, copiés à l'identique depuis `skills/audit/scripts/lib/sitemap.ts`.
2. **`plugin/skills/audit/scripts/lib/sitemap.ts` allégé** : les corps des trois fonctions et le type `SitemapKind` supprimés, remplacés par un import nommé (`parseSitemap`, `decodeSitemapBody`, `SitemapKind` — nécessaires au corps de `collectSitemapUrls`) et un réexport des trois fonctions + du type (pour que les appelants existants de l'audit gardent leur import inchangé). `Fetcher`, `formatSkippedWarning` et `collectSitemapUrls` n'ont pas bougé.
3. **`plugin/skills/checklist/scripts/checklist.ts:10` corrigé** : l'import pointe maintenant vers `../../../lib/sitemap` au lieu de traverser la skill audit.
4. **`plugin/lib/tests/sitemap.test.ts` créé**, contenu exact du brief.
5. Suite complète lancée une fois.
6. Commit unique avec les 4 fichiers attendus, message donné par le brief.

## Ce qui a été testé

```
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
```
Sortie réelle :
```
bun test v1.4.0 (34cbb9a40)

 509 pass
 0 fail
 2196 expect() calls
Ran 509 tests across 39 files. [5.08s]
```
506 tests préexistants + 3 nouveaux = 509. Aucun échec, aucun avertissement résiduel. `skills/audit/scripts/tests/sitemap.test.ts` (qui importe `collectSitemapUrls`, `formatSkippedWarning` en plus des trois fonctions déplacées depuis `../lib/sitemap`) passe toujours : le réexport couvre bien tous ses besoins.

Vérification de la règle d'architecture du commun :
```
cd /Users/recarnot/dev/erom-seo-chantier-7 && command grep -rn 'skills/' plugin/lib/*.ts
```
4 occurrences, toutes dans des commentaires (`plugin/lib/bing.ts`, `plugin/lib/report.ts`, `plugin/lib/sitemap.ts`, `plugin/lib/url.ts` — celui-ci préexistant, motif similaire de déménagement le 30/08). Aucun `import` réel depuis `skills/` dans `plugin/lib/`.

## Fichiers touchés

- `plugin/lib/sitemap.ts` (créé)
- `plugin/lib/tests/sitemap.test.ts` (créé)
- `plugin/skills/audit/scripts/lib/sitemap.ts` (modifié)
- `plugin/skills/checklist/scripts/checklist.ts` (modifié, une ligne)

## Relecture du diff

`git show --stat` confirme les 4 fichiers exactement attendus, rien d'autre entraîné. `git show` sur les deux fichiers modifiés :
- `skills/audit/scripts/lib/sitemap.ts` : le remplacement des deux premières lignes par le bloc à 5 lignes du brief est fidèle ; `Fetcher`, `formatSkippedWarning`, `collectSitemapUrls` inchangés au caractère près (diff ne montre aucune modification sur ces blocs).
- `checklist.ts` : une seule ligne changée, le reste du fichier intact.

Aucune assertion de test existante n'a été touchée — seul un ajout de fichier de test.

## Doutes

Aucun. Le brief donnait le code exact à écrire pour les 4 étapes de modification et le point de rupture annoncé (réexport seul insuffisant) était déjà anticipé dans le code fourni ; je n'ai eu qu'à le transcrire et vérifier. Rien vu ailleurs dans les fichiers touchés qui appelle un signalement.
