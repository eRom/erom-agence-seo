# Reprise (dernière mise à jour : 2026-08-31, 16 h 10, après recette)

## L'état en trois lignes

Six verbes, **506 tests, 0 échec**. Chantier 6 fusionné, **recetté et clos**. `main` et `origin/main` alignés sur `3a5d09a`.

**Rien n'est ouvert.** La recette est passée le 31/08 après-midi : `docs/superpowers/plans/2026-08-31-erom-seo-chantier-6-recette.md`.

## Ce que la recette a donné

Les huit AC passent. Un seul défaut du livrable trouvé, et corrigé dans la foulée.

**R-1, corrigé.** `@page` ne déclarait que la marge, jamais le format : l'impression suivait le défaut du navigateur et Chrome sortait du **Letter** alors qu'AC-6 promet de l'A4 sans réglage. Une ligne dans `plugin/skills/rapport/scripts/lib/rendu.ts:71`, `@page{size:A4;margin:18mm}`. Pagination inchangée, 506 tests toujours verts. Se revérifie en une commande :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --print-to-pdf=/tmp/t.pdf "file://<chemin>/rapport-client.html" && pdfinfo /tmp/t.pdf | grep "Page size"
```

**R-5, assumé.** Le taste-gate n'a jamais tourné : le plugin `erom-devil` n'est pas actif dans ce répertoire, et Romain a tranché le 31/08 qu'il jugeait le rendu lui-même sur son Mac. Le verdict visuel du chantier est le sien. Si un futur chantier veut le juge automatique ici, il faut passer par `/session-profile`.

**Deux écarts étaient des erreurs du plan, pas du code** : le cobaye `2026-08-28-n0-3` que la tâche 7 désigne n'a jamais eu de `report.md` (audit non finalisé, seuls `raw/` et `derived/` existent), et l'attendu « Ce qui bloque présent » sur le cas nominal contredit D49, puisque l'action porte la seule Critique et qu'une section vide s'omet.

## Deux gotchas du verbe `rapport`, à ne pas redécouvrir

**Un audit d'avant la couche stratégique est refusé par `--preparer`.** Les deux audits CHICO du 28/08 portent un en-tête antérieur à l'ajout du champ « Couche stratégique ». Le message d'erreur énumère les champs attendus sans dire que le format est ancien, ce qui envoie chercher un défaut dans l'audit récent au lieu du bon endroit. Pour s'en servir quand même, compléter l'en-tête à la main sur une copie. Correctif possible un jour : nommer ce cas explicitement.

**Les espaces insécables sortent fautives du premier jet.** Les trois rapports de la recette ont été écrits avec des espaces normales devant les deux-points, et le lint est resté vert : c'est la seule des neuf règles du registre qu'aucun outil ne rattrape. Le geste qui corrige et le geste qui vérifie :

```bash
perl -CSD -i -pe 's/ :/\x{00A0}:/g' rapport-client.md
sed -n '<ligne>p' rapport-client.md | od -An -tx1 -c   # chercher c2 a0 3a
```

## Trois points cosmétiques, sans effet sur le client

- Le temps 1 du `SKILL.md` dit « points mineurs à annoncer », la sortie réelle dit « disponibles ». Le mot du code est le bon (le nombre imprimé exclut la trouvaille que l'action retient) ; c'est le `SKILL.md` qui reste à aligner.
- Dans « Ce qui freine », les amorces `Constaté :`, `Effet :`, `À faire :` se suivent en texte plat, sans respiration. Confirmé à l'impression sur le cas riche : trois sections d'affilée font un pavé dense. À traiter dans le rendu, le gras Markdown étant refusé par le lint.
- L'avis de licence OFL en tête du HTML écrit « Distribuee » sans accent.

## Deux dettes assumées, inchangées

**La couverture est un pointage d'identifiant.** Le lint vérifie qu'aucune trouvaille grave n'est absente de la déclaration ; il ne peut pas vérifier que le texte en parle vraiment. Seule protection : le premier des cinq défauts que la relecture du temps 3 doit chercher. À rouvrir si un premier rapport réel montre la triche.

**Le nettoyage des commentaires CSS est fragile.** `chargerTheme()` retire les commentaires de `tokens.css` par expression régulière. Sur un fichier malformé, il peut couper des déclarations valides. Sans effet sur le fichier réel. À durcir le jour où `tokens.css` gagnerait une valeur de type chaîne.

## Un défaut hors de ce dépôt

`erom-design-system-institutionnel/fonts/OFL.txt` porte encore les jetons de gabarit `<dates>`, `<Copyright Holder>`, `<Reserved Font Name>`, et annonce Spectral et Courier Prime ensemble. L'OFL 1.1 exige l'avis réel sur chaque copie redistribuée. L'avis officiel de Spectral, vérifié sur `google/fonts` le 31/08 :

```
Copyright 2017 The Spectral Project Authors (https://github.com/productiontype/Spectral)
```

Sans clause de nom réservé. Corrigé dans `erom-seo` seulement ; **tout projet qui reprend ce design system hérite du fichier vide**.

## Ce que ce chantier a appris, et qui resservira

Le détail est dans `docs/superpowers/journaux/2026-08-31-erom-seo-chantier-6-journal.md`, 26 arbitrages avec leur coût si faux. Les trois qui valent au-delà de ce chantier :

1. **Une garantie formulée sur un format ne protège pas d'un autre format.** Trois fuites d'identifiants vers le client, par trois portes : l'indentation d'un commentaire, son emplacement hors bloc, puis un commentaire **CSS** que deux campagnes de chasse ont manqué parce qu'elles regardaient le Markdown. La bonne question n'est pas « ce format est-il filtré » mais « quels chemins atteignent la sortie ».
2. **Une garantie que personne ne peut faire tomber est imaginaire.** Un `@import` distant et une balise de script injectés laissaient 495 tests au vert. La mutation reste le seul vrai gate.
3. **Quand une décision amende une règle, la propager là où la règle est énoncée.** D49 a vécu dans la spec et dans le lint pendant tout le chantier, mais le `SKILL.md` que le modèle lit à chaque exécution portait encore la formulation d'avant.

Un quatrième, ajouté par la recette : **un test négatif ne vaut que si l'on vérifie d'abord que le défaut a bien été introduit.** La première injection de tiret cadratin a visé une ligne vide ; le lint est ressorti vert et le test ne prouvait rien.

## Deux pièges de harness, corroborés deux fois chacun

- **`ls` sans `RTK_DISABLED=1 command` peut avaler une ligne.** Deux `ls plugin/skills/` ont rendu cinq dossiers au lieu de six. Même déformation sur `od -c`. Toute sortie qui porte une décision passe par ce préfixe.
- **Le garde-fou d'isolation worktree refuse les commandes Bash composées.** `cd … && git add … && git commit …` est rejeté. Quatre implémenteurs l'ont redécouvert chacun de leur côté : à écrire dans chaque brief.

Un troisième, vu pendant la recette : **le cwd d'un Bash survit d'un appel à l'autre**. Trois commandes de suite ont échoué en `No such file or directory` parce qu'un appel précédent avait laissé le shell dans `clients/commentchercherbonheur.org/`. Chaque commande part de `cd /Users/recarnot/dev/erom-agence-seo &&`.

## Une branche qui traîne

`chantier-1-audit-n0` existe encore, depuis le premier chantier. Je ne sais pas si elle est fusionnée ou gardée exprès. `git branch -d chantier-1-audit-n0` refusera si elle porte du travail non fusionné.
