# Recette du chantier 6, le rapport client

Recette de la tâche 7 du plan `2026-08-31-erom-seo-chantier-6-rapport-client.md`, passée le 31 août 2026 dans le checkout principal `/Users/recarnot/dev/erom-agence-seo`, sur `main` après fusion.

Précondition vérifiée avant de commencer : branche `main`, `plugin/skills/rapport/` présent.

## Les cobayes réellement utilisés

Le plan désigne trois dossiers. L'un des trois n'est pas exploitable, un substitut a été retenu.

| Dossier | Ce qu'il éprouve | Utilisé |
|---|---|---|
| `clients/commentchercherbonheur.org/seo/audits/2026-08-31-n1-2` | 1 Critique, 0 Important, cas nominal du suivi | oui |
| `clients/commentchercherbonheur.org/seo/audits/2026-08-31-n0` | 0 grave, cas D49, site sain | oui |
| `clients/commentchercherbonheur.org/seo/audits/2026-08-28-n0-3` | 6 Important annoncés | non, aucun `report.md` (R-2) |
| copie de `2026-08-28-n0-2` dans le scratchpad, en-tête complété | 5 Important, cas riche, trois sections | oui, substitut |

Le substitut est une copie de travail. Les dossiers d'archive du client n'ont pas été modifiés.

## Procédure et résultats du 2026-08-31

### AC-1, les deux fichiers sont produits

```bash
ls $D/rapport-client.md $D/rapport-client.html
```

**OK** sur les trois cobayes. `--rendre` affiche le chemin du HTML et rien d'autre.

### AC-2, le HTML est autonome

```bash
grep -cE '(src|href)="https?://' $D/rapport-client.html
```

**OK**, sortie `0` sur les trois. Trois `@font-face` en `data:font`, aucune requête sortante. Le HTML du cas nominal pèse 96 Ko, polices comprises.

### AC-3, le lint accepte un rapport conforme

```bash
bun plugin/skills/rapport/scripts/lint-client.ts $D
```

**OK**, `rapport client conforme` et code de sortie 0 sur les trois.

### AC-4, aucun identifiant de catalogue n'atteint le client

```bash
grep -cE '\b(AI|FRESH|IDX|PERF|REND|ROBOTS|SD|SNIP|STRAT|TAG)-[0-9]{2}\b' $D/rapport-client.html
```

**OK**, sortie `0` sur les trois. Un seul commentaire HTML subsiste dans le rendu, l'avis de licence OFL de Spectral en tête de fichier, qui est voulu et ne porte aucun identifiant.

### AC-5, le lint refuse un tiret cadratin

Tiret injecté dans le corps de l'action du cas nominal, puis lint :

```
rapport client refusé, 1 point(s) :
  - ligne 18 : tiret cadratin interdit dans un document remis à un tiers
code de sortie : 1
```

**OK**. La ligne nommée est la bonne. Fichier restauré ensuite, `grep -c` de tiret cadratin à 0.

Note de méthode : la première tentative d'injection a visé une ligne vide et le lint est ressorti vert. Le test ne prouvait alors rien. Un test négatif ne vaut que si l'on vérifie d'abord que le défaut a bien été introduit.

### AC-6, l'impression A4

Impression par Chrome sans toucher aux options, sur les deux rapports.

Résultat en l'état du code : **format Letter**, pas A4 (R-1).

```
Page size: 612 x 792 pts (letter)
```

En forçant A4, la pagination est correcte :

| Rapport | Pages A4 | Trouvaille coupée | Fond papier |
|---|---|---|---|
| cas nominal `2026-08-31-n1-2` | 2 | aucune | conservé |
| cas riche, 3 sections | 3 | aucune | conservé |

Le bloc d'impression fait son travail : `break-inside:avoid` sur l'en-tête, l'action, chaque trouvaille, la méthode et les points forts ; `orphans:3` et `widows:3` sur les paragraphes ; `break-after:avoid` sur les titres ; `print-color-adjust:exact` qui préserve les fonds crème, bleu et vert à l'impression. Rien n'a été coupé sur cinq pages produites.

**Partiel** : la pagination est bonne, le format ne l'est pas sans réglage.

### AC-7, la re-génération après correction manuelle

Phrase corrigée à la main dans `rapport-client.md`, puis :

```bash
bun plugin/skills/rapport/scripts/rapport.ts --rendre-seul $D
```

**OK**, la phrase corrigée est dans le HTML, les temps 1 à 3 n'ont pas été rejoués.

### AC-8, le site sain

Cobaye `2026-08-31-n0`, aucune trouvaille grave, cas D49.

```
lint                                      : rapport client conforme
grep -c "Ce qui bloque\|Ce qui freine"    : 0
grep -o "[0-9]* points mineurs"           : 2 points mineurs
```

**OK**. Les deux sections d'inventaire sont absentes, comme prévu par le gabarit. L'action s'appuie sur `SD-03`, seule des trois trouvailles non graves à décrire un manque réel avec un correctif nommé, ce qui laisse bien 2 au compte de la Méthode. Le plan attendait `AI-01` ; ce choix est écarté au motif que le rapport technique dit lui-même de cette trouvaille qu'elle ne pénalise rien et n'appelle aucun correctif : en faire l'action de la semaine aurait demandé d'écrire au client une raison d'agir que la collecte ne porte pas. Le plan prévoyait explicitement ce cas et demande alors de vérifier que l'action s'appuie sur une des trois trouvailles réelles, ce qui est le cas.

### Le piège de registre sur le cas nominal

L'unique Critique du cobaye `2026-08-31-n1-2` est `IDX-06`, la page `/telekinesie` inconnue de Google, relevée le jour de la vérification de la propriété Search Console.

Le rapport client écrit :

> La page Télékinésie ne l'est pas encore : Google répond qu'il ne connaît pas cette adresse.
> La connexion entre votre site et Search Console a été mise en place le jour même de cette revue.
> Il s'agit donc très probablement d'un simple délai de première exploration.

**OK**. La nuance est transmise, le mot « invisible » n'apparaît pas, l'échéance de revérification est nommée. Aucun lint ne couvre ce point : il reste à vérifier à l'œil sur chaque rapport.

### Espaces insécables devant les deux-points

Non couvert par le lint, vérifié aux octets comme le registre le demande.

Les trois rapports ont d'abord été écrits avec des espaces normales, corrigés ensuite, puis contrôlés :

```
sed -n '14p' rapport-client.md | od -An -tx1 -c
  20 70 61 67 65 c2 a0 3a 20 ...
      p  a  g  e     **  :
```

**OK** après correction, `c2 a0` devant chaque deux-points, zéro espace normale restante.

Le fait que les trois rapports soient sortis fautifs du premier jet, sans qu'aucune commande ne le signale, confirme ce que le registre annonce : c'est la seule des neuf règles qu'aucun outil ne rattrape.

### Taste gate

**Non exécuté** (R-5). Le plugin `erom-devil` n'est pas actif dans ce répertoire, le juge vision ne peut pas tourner. Aucun jugement automatique ne couvre le rendu montré à Romain le 31 août.

## Écarts

### R-1, l'impression ne fixe pas le format A4 (moyen)

`@page{margin:18mm}` ne déclare pas `size`. Le format imprimé suit donc le défaut du navigateur ou du système, et non le A4 que promet AC-6. Chrome, sans réglage, produit du Letter.

Reproduction :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --print-to-pdf=/tmp/t.pdf "file://<chemin>/rapport-client.html"
pdfinfo /tmp/t.pdf | grep "Page size"
# Page size: 612 x 792 pts (letter)
```

Sur un Mac configuré en A4, le Cmd+P de Romain donnera de l'A4 et l'écart ne se verra pas. Il se verra chez un client dont le système est en Letter, ou dans toute impression automatisée. Correctif : `@page{size:A4;margin:18mm}` dans le thème. Vérifié : avec cette seule ligne, les deux rapports sortent en A4 (594,96 x 841,92 pts) sans autre changement, pagination identique.

### R-2, un cobaye du plan n'existe pas (faible)

`clients/commentchercherbonheur.org/seo/audits/2026-08-28-n0-3` ne contient ni `report.md` ni les 6 Important annoncés : l'audit n'a jamais été finalisé, seuls `raw/` et `derived/` existent. La tâche 7 n'est donc pas exécutable telle qu'écrite.

Le script se comporte bien : `fichier attendu introuvable : .../report.md`, code de sortie 1. C'est le plan qui est faux, pas le code.

### R-3, les audits d'avant la couche stratégique sont refusés sans le dire (moyen)

Les deux audits du 28 août portent un en-tête antérieur à l'ajout du champ « Couche stratégique ». `--preparer` les refuse :

```
en-tête : date, Niveau, Couche stratégique, pages collectées ou vérifications manquant dans les trois premières lignes
```

Le message énumère les champs attendus mais ne dit pas que le rapport est d'un format antérieur, ni comment le rattraper. Quelqu'un qui rencontre ce cas cherchera un défaut dans son audit récent avant de comprendre qu'il tient un vieux fichier. Correctif possible : détecter l'absence du seul champ « Couche stratégique » sur un en-tête par ailleurs valide et le nommer comme tel.

### R-4, l'attendu du plan sur le cas nominal contredit D49 (faible)

Le plan attend « Ce qui bloque » présent sur le cobaye `2026-08-31-n1-2`. Or ce cobaye porte une seule trouvaille grave, et D49 veut que l'action de la semaine s'appuie sur une trouvaille grave dès qu'il en existe une. L'action porte donc `IDX-06`, la section d'inventaire est vide, et le gabarit dit qu'une section vide s'omet.

Le rapport produit n'a ni « Ce qui bloque » ni « Ce qui freine ». C'est le comportement juste ; l'attendu du plan est faux. La reproduire aurait demandé de dire deux fois la même chose au client dans un document d'une page.

### R-5, le taste gate n'a pas tourné (à trancher)

Le plugin `erom-devil` n'est pas dans les plugins actifs de ce répertoire. `/session-profile` l'active, puis le gate se relance sur les captures déjà produites. Tant qu'il n'a pas tourné, le verdict visuel sur ce chantier est celui de Romain seul.

### R-6, cosmétique, le SKILL.md et le code ne disent pas la même chose

Le temps 1 du `SKILL.md` annonce « le nombre de points mineurs à annoncer ». La sortie réelle dit « points mineurs et info disponibles ». Vu en conditions réelles, le mot du code est le bon : le nombre imprimé n'est pas celui-là, puisqu'il exclut la trouvaille que l'action retient. Le `SKILL.md` reste à aligner.

### R-7, cosmétique, les amorces des sections d'inventaire sont plates

Confirmé à l'impression sur le cas riche : « Constaté », « Effet », « À faire » se suivent en texte plat, sans respiration entre les trois lignes. Lisible, mais le bloc fait un pavé dense quand trois sections se suivent. À traiter dans le rendu, pas dans le texte, le gras Markdown étant refusé par le lint.

### R-8, cosmétique, un accent manque dans l'avis de licence

L'avis OFL en tête du HTML écrit « Distribuee sous SIL Open Font License 1.1 ». Invisible pour le client, mais c'est du français dans un document français.

## Ce qui a bien tenu, et qui méritait d'être vu

Le rendu réordonne les sections selon le gabarit, quel que soit leur ordre dans le Markdown. Le cas riche a été écrit avec « Ce qui freine » avant « À faire cette semaine » ; le HTML sort dans l'ordre action, freins, points forts, méthode. Le modèle qui écrit n'a donc pas à connaître l'ordre de présentation.

Le bloc d'impression est le vrai gagnant du chantier : cinq pages produites sur deux rapports, aucune trouvaille coupée, aucun titre orphelin en bas de page, tous les fonds de couleur préservés.

## Bilan

Sept des huit critères d'acceptation passent. AC-6 passe sur la pagination et échoue sur le format, pour une ligne de CSS manquante dont le correctif est vérifié.

Deux des quatre écarts numérotés sont des erreurs du plan, pas du code (R-2, R-4). Un seul écart touche le livrable remis au client (R-1). Le taste gate reste à passer (R-5).

Le rapport client se lit. Le registre tient sur le cas qui pouvait le faire tomber. Le chantier est recevable une fois R-1 corrigé.
