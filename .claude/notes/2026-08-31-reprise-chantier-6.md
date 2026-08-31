# Reprise (dernière mise à jour : 2026-08-31, 13 h 45)

## L'état en trois lignes

Six verbes, **506 tests, 0 échec**. Chantier 6 fusionné dans `main` (`da4008f`) et poussé. Worktree et branche supprimés. `main` et `origin/main` alignés.

Une seule chose reste ouverte : **la recette du chantier 6**.

## Ce qui reste à faire

### La recette du verbe `rapport` (tâche 7 du plan)

Le plan : `docs/superpowers/plans/2026-08-31-erom-seo-chantier-6-rapport-client.md`, tâche 7. Elle porte sa propre précondition et ses commandes.

**Pourquoi elle n'est pas faite** : elle couvre AC-6 (impression PDF A4 sans réglage) et le taste-gate visuel, les deux seuls critères qu'aucun test ne peut juger. Il faut un œil et une imprimante.

**Où la lancer** : dans le checkout principal `/Users/recarnot/dev/erom-agence-seo`, **jamais dans un worktree**, parce que `clients/` est gitignoré et n'existe donc que là. La précondition est déjà remplie : le plugin est dans `main`.

**Les trois cobayes**, tous réels, dans `clients/commentchercherbonheur.org/seo/audits/` :

| Dossier | Ce qu'il éprouve | Attendu |
|---|---|---|
| `2026-08-31-n1-2` | 1 Critique, 0 Important | « Ce qui bloque » présent, « Ce qui freine » absent |
| `2026-08-31-n0` | aucune trouvaille grave | ni l'un ni l'autre, l'action porte une mineure |
| `2026-08-28-n0-3` | 6 Important | le plus fourni des trois |

**Le piège de registre à surveiller sur le n1-2** : son unique Critique est `IDX-06`, la page `/telekinesie` inconnue de Google, relevée le jour même où la propriété Search Console a été vérifiée. Le rapport client doit écrire « pas encore explorée, probablement un délai, à revérifier au prochain point », jamais « votre page est invisible ». Aucun lint n'attrape ça.

**Aucun des trois ne dépasse une page et demie** : pour éprouver les sauts de page à l'impression, étoffer un Markdown à la main le temps du test.

**Les commandes de vérification** sont dans la tâche 7 du plan, steps 2 et 2 bis, avec les valeurs attendues.

### Deux points cosmétiques reportés à la recette

- `SKILL.md` décrit la sortie de `--preparer` comme donnant les points mineurs « à annoncer », alors que le code dit « disponibles » depuis D49. Voir si le mot trouble en conditions réelles.
- Dans « Ce qui freine », les amorces `Constaté :`, `Effet :`, `À faire :` sont rendues en texte plat. Lisible, mais elles gagneraient à être distinguées. Ça se traiterait dans le rendu, pas dans le texte : le gras Markdown est refusé par le lint.

## Deux dettes assumées

**La couverture est un pointage d'identifiant.** Le lint vérifie qu'aucune trouvaille grave n'est absente de la déclaration ; il ne peut pas vérifier que le texte en parle vraiment. Un rapport peut donc déclarer traiter `STRAT-01` sans en dire un mot. Seule protection : le premier des cinq défauts que la relecture du temps 3 doit chercher. À rouvrir si un premier rapport réel montre la triche.

**Le nettoyage des commentaires CSS est fragile.** `chargerTheme()` retire les commentaires de `tokens.css` par expression régulière. Sur un fichier malformé (commentaire non fermé, valeur texte contenant les délimiteurs), il peut couper des déclarations valides. Sans effet sur le fichier réel, bien formé et rarement touché. À durcir le jour où `tokens.css` gagnerait une valeur de type chaîne.

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

## Deux pièges de harness, corroborés deux fois chacun

- **`ls` sans `RTK_DISABLED=1 command` peut avaler une ligne.** Deux `ls plugin/skills/` ont rendu cinq dossiers au lieu de six ; j'ai cru une skill disparue. Même déformation sur `od -c`. Toute sortie qui porte une décision passe par ce préfixe.
- **Le garde-fou d'isolation worktree refuse les commandes Bash composées.** `cd … && git add … && git commit …` est rejeté. Quatre implémenteurs l'ont redécouvert chacun de leur côté : à écrire dans chaque brief.

## Une branche qui traîne

`chantier-1-audit-n0` existe encore, depuis le premier chantier. Je ne sais pas si elle est fusionnée ou gardée exprès. `git branch -d chantier-1-audit-n0` refusera si elle porte du travail non fusionné.
