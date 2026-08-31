---
title: "erom-seo, chantier 6 : le rapport client"
date: 2026-08-31
status: proposed
project: erom-agence-seo
spec_mere: docs/superpowers/specs/2026-08-27-erom-seo-design.md
notes_liees:
  - docs/superpowers/specs/2026-08-30-erom-seo-niveau-1-design.md
  - docs/superpowers/specs/2026-08-29-erom-seo-checklist-design.md
  - .claude/notes/2026-08-27-reprise-2120.md
design_system: institut (tokens seulement, figés dans le plugin)
origine: >
  Veille du 31/08 sur https://github.com/every-app/open-seo (15,3 k étoiles, MIT).
  Leur plugin est une vitrine pour un SaaS : leur mcp.json fait sept lignes et pointe
  vers https://app.openseo.so/mcp, dont les outils tapent DataForSEO, payant à la
  requête. Leurs neuf skills sont mortes sans compte. Rien à reprendre côté moteur.
  Trois idées de méthode sont reprises ici et une seule est structurante : le rapport
  d'audit destiné au client, construit autour d'une action unique.
---

# erom-seo, chantier 6 : le rapport client

Les cinq verbes produisent aujourd'hui des artefacts justes et illisibles pour un client. `report.md` est un document de praticien : identifiants de vérification, citations verbatim de la documentation Google, chemins de preuve dans `raw/`. C'est exactement ce qu'il doit être, et ce n'est pas ce qu'on envoie à un dirigeant de PME.

Ce chantier ajoute un sixième verbe qui ne collecte rien, ne vérifie rien et ne corrige rien. Il prend un audit déjà sur disque et en tire un document que le client lit seul, sans nous au téléphone, et sur lequel il agit.

## 1. But

Un fichier HTML autonome, envoyé en pièce jointe, ouvert d'un double-clic, imprimable en PDF propre. Il porte **une** action à faire cette semaine, puis les trouvailles Critique et Important reformulées sans jargon.

Ce que ce verbe apporte que les cinq autres ne donnent pas :

- **Le client ne lit pas `report.md`.** Vingt-six vérifications avec leurs identifiants et leurs citations officielles prouvent notre sérieux et n'appellent aucune action.
- **Un client à qui on donne douze tâches n'en fait aucune.** Une action nommée, datée, avec le geste exact, se fait.
- **Le livrable est le produit de l'agence.** L'audit est le travail ; le rapport est ce qui se facture, se présente et se garde.

Non-but explicite : ce verbe n'est pas une seconde source de vérité. Il ne peut rien affirmer qui ne soit pas déjà dans `report.md`, et le lint le vérifie mécaniquement.

## 2. Décisions

### D42. Le rapport client est un verbe à part, qui lit un audit déjà sur disque

`/erom-seo:rapport` ne lance aucune collecte. Il résout le dernier audit avec `latestAuditDir()` (ou prend un dossier en argument), lit son `report.md` avec `parseReport()`, et écrit deux fichiers à côté.

Trois raisons. Le rapport se refait sans réauditer, quand le client veut un autre ton ou qu'une phrase est fausse. Il se lance sur un vieil audit, pour retrouver ce qu'on avait dit en mars. Et `build` relance des audits niveau 2 en boucle jusqu'au vert : générer un livrable client à chaque tour serait absurde et coûteux.

C'est aussi le pattern déjà en place : `checklist` et `build` lisent les audits sans jamais collecter.

**Battu :** une option `--client` sur `audit`. Elle économise un verbe et coûte un audit complet à chaque correction de virgule ; elle oblige `build` à la désactiver explicitement dans sa boucle, un cas particulier de plus dans un endroit qui n'en a pas besoin.

**Battu :** un dossier `seo/rapports/` hors des audits. Il coupe le lien entre le rapport et la collecte qui le prouve, alors que tout le plugin repose sur la preuve datée.

### D43. Claude écrit un Markdown, un script rend le HTML

Le partage script / modèle du plugin s'applique sans exception ici.

- **Claude écrit `rapport-client.md`.** Choisir l'action prioritaire, reformuler une trouvaille sans jargon, gloser « canonique » en une demi-phrase : c'est du jugement, un script produirait de la bouillie générique.
- **`render-client.ts` rend `rapport-client.html`.** Le squelette, les tokens, les fonts, la feuille d'impression sont figés dans le script. Le design ne dérive pas d'un audit à l'autre, et il se teste.

Le Markdown reste sur disque : c'est la trace du jugement, et il s'édite à la main. `--rendre-seul` re-rend le HTML depuis un Markdown corrigé sans repasser par Claude.

**Battu :** Claude écrit le HTML directement depuis un gabarit, la méthode d'OpenSEO (`skills/seo-audit/template.html`, avec la consigne « keep the CSS and structure as they are »). Une consigne en prose ne tient pas un design : le CSS dérive, Claude improvise une couleur ou une marge, et le rendu n'est jamais deux fois le même. Invérifiable par un test.

**Battu :** un script qui génère tout depuis `derived/`, sans jugement. Impossible : le registre client est du jugement pur.

### D44. Une action en tête, puis Critique et Important seulement

Le document s'ouvre sur une seule action, faisable dans la semaine par une personne non technique, avec le geste exact et, quand c'est possible, le texte prêt à coller.

Dessous, uniquement les trouvailles Critique et Important. Les Mineur et Info ne sont pas dans le document ; leur nombre y est, en une ligne : « N points mineurs figurent dans le rapport technique complet, disponible sur demande. »

L'honnêteté est préservée par ce compte, qui est vérifié par le lint : on ne peut pas taire douze mineurs en écrivant « trois ».

**Battu :** tout le rapport reformulé, les vingt-six vérifications comprises. Le document passe à cinq ou six pages, l'action principale se noie, et on retombe sur le défaut de `report.md` avec une typographie plus jolie. La justification du travail facturé passe par la section « Ce qui marche déjà » et par le pied de méthode, pas par un mur de mineurs.

**Amendée par D49** le 31/08 : la restriction aux Critique et Important vaut pour les sections d'inventaire, pas pour l'action de la semaine.

### D45. Profil visuel institut, tokens figés dans le plugin

Le routage d'`erom-design` donne **perso** par défaut, faute de signal `erom-institut` dans le repo (vérifié le 31/08, zéro fichier). Ce défaut est écarté pour cet artefact précis, sur décision de Romain.

Motif : perso est dark-first, et un fond sombre imprimé chez le client est disqualifiant ; sa stack est Tailwind, shadcn et React, inapplicable à un fichier HTML autonome ; Inter en corps de texte sur trois pages fatigue plus qu'un serif. Institut est light, papier chaud et encre, Spectral, filets plutôt qu'ombres, rien ne bouge au survol : le registre d'un rapport d'expertise qu'on imprime et qu'on pose sur une table.

On reprend les **tokens visuels et les règles**, pas les composants React. Les valeurs se copient depuis `/Users/recarnot/dev/erom-design-system-institutionnel/src/styles/tokens.css` au moment de l'implémentation et se figent dans `references/theme/tokens.css`. Elles ne s'inventent pas et ne se déduisent pas du digest : seul `--papier-fond` `#FAF8F5`, `--encre` `#1C1A19` et le bleu Souverain ancre 700 `#122B78` sont connus à ce stade.

Le plugin ne dépend jamais du repo institut à l'exécution : la copie est faite une fois, versionnée, et le digest utilisé est daté dans un commentaire en tête du fichier.

**Battu :** perso forcé en clair, pour suivre le routage. Ses tokens sont calibrés sur du dense et du sombre ; le rendre clair donne un outil éclairci, pas un document.

**Battu :** une dépendance npm à `erom-institut`. Elle apporte vingt-quatre composants React dont zéro ne sert ici, et casse la règle du plugin : aucune dépendance au-delà de `node-html-parser` et `robots-parser`.

### D46. Un seul fichier, zéro requête réseau, fonts embarquées

Le HTML produit ne fait aucune requête sortante. CSS dans un `<style>`, fonts en base64 dans des `@font-face`, aucune image distante.

Trois graisses Spectral (regular, 600, italic), reprises des woff2 latin déjà sous-ensemblées du repo institut, 21 à 22 Ko pièce, mesurées le 31/08. En base64 le HTML pèse environ 150 Ko, taille normale pour une pièce jointe.

Motif : le fichier doit s'ouvrir hors ligne, chez un client dont on ne connaît ni le réseau ni le navigateur, et rester lisible dans cinq ans. Une font appelée sur un CDN casse les trois, et pose une question RGPD que le DS institut a déjà tranchée en auto-hébergeant.

Courier Prime n'est pas embarqué : le rapport client ne montre pas de code. Si une URL doit être citée, elle l'est dans la pile serif.

**Battu :** une pile serif système (Charter, Georgia, Times), la solution d'OpenSEO. Elle pèse zéro et rend un document différent sur chaque machine, ce qui est exactement ce qu'un livrable de marque ne doit pas faire.

### D47. Le lint mécanise le registre, y compris la règle des em dashes

`lint-client.ts` sort 1 et nomme la ligne fautive si :

1. la section « À faire cette semaine » manque ou est vide ;
2. une trouvaille Critique ou Important de `report.md` n'est couverte ni par l'action ni par une section d'inventaire (correspondance par identifiant, porté en commentaire HTML invisible côté client) ;
3. une trouvaille Mineur ou Info apparaît dans une section d'inventaire (D49 : l'action, elle, peut la porter) ;
4. le compte de mineurs annoncé diffère du nombre de Mineur et Info **non remontées dans l'action** (D49) ;
5. un identifiant technique (`IDX-03`, `SNIP-02`, …) apparaît dans le texte visible ;
6. le document contient un em dash.

Le point 6 n'est pas une coquetterie : c'est un document lu par un tiers, la règle de Romain s'y applique pleinement, et une règle qu'aucune commande ne vérifie est une règle qui se perd. Le hook `guard-emdash` couvre l'écriture des fichiers du dépôt, pas le contenu d'un livrable généré.

**Battu :** un lint qui vérifie aussi l'absence de jargon, par liste de mots. Une liste noire de termes attrape « canonique » dans « nous avons corrigé la canonique » où la glose est deux lignes plus haut, et rate « votre maillage interne est déséquilibré » qui n'est dans aucune liste. Le registre est tenu par `references/registre.md` et par la relecture, pas par un grep. Le lint tient ce qui est mécanisable sans faux positif.

### D48. Le nom français désigne le client, le nom anglais désigne la technique

Le verbe est `/erom-seo:rapport`. Il écrit `rapport-client.md` et `rapport-client.html` dans le dossier de l'audit, à côté de `report.md` qui garde son nom.

La proximité `rapport` / `report` a été pesée. Elle est retenue parce qu'elle porte la distinction plutôt que de la brouiller : dans ce dépôt, l'anglais nomme l'artefact technique interne (`report.md`, `build-plan.json`, `console.json`) et le français nomme ce qui sort vers un humain (`strategy.md` est l'exception héritée, `checklist.md` et maintenant `rapport-client`). Le suffixe `-client` lève toute ambiguïté résiduelle à la lecture d'un `ls`.

**Battu :** `/erom-seo:livrable`. Exact mais jargonneux, et Romain ne le taperait pas spontanément.

**Battu :** `/erom-seo:client`. Ambigu : le mot désigne déjà les dossiers de `clients/`.

### D49. Le site sain a droit à un rapport, et l'action peut s'appuyer sur une trouvaille mineure

Découverte le 31/08, sur le premier site réel. L'audit frais de CHICO donne **zéro Critique et zéro Important**, une Mineur et deux Info : en trois jours le site avait corrigé ses cinq Important du 28/08. Sous D44 seule, son rapport client serait vide, et le lint exigerait une action de la semaine qui ne s'appuie sur rien.

Ce n'est pas un cas limite. C'est l'état de tout site suivi qui va bien, donc la moitié des rapports d'une agence en régime récurrent. Un livrable incapable de dire « rien ne bloque, voici la suite » ne sert qu'une fois, au premier audit.

La règle se sépare donc en deux :

- **L'action de la semaine** peut s'appuyer sur n'importe quelle trouvaille du rapport technique, Mineur et Info comprises. Sur CHICO, elle porte `AI-01` (pas de `llms.txt`) et devient « ajouter un fichier qui présente votre site aux assistants IA ».
- **Les sections d'inventaire** (« Ce qui bloque », « Ce qui freine ») ne portent que du Critique et de l'Important, comme D44 le pose. Une Mineur qui s'y glisse est refusée.

Conséquence sur le compte : **les points mineurs annoncés excluent ceux déjà remontés dans l'action**. Sur CHICO, trois mineures moins celle portée par l'action font deux. Annoncer trois serait mentir au client sur ce qu'il ne voit pas, puisqu'il en voit une.

L'asymétrie a une raison : l'action est un choix éditorial, l'inventaire est un constat. Autoriser une mineure dans l'inventaire noierait le rapport, ce que D44 refuse ; l'interdire dans l'action rendrait le rapport de suivi impossible.

**Battu :** la règle stricte, où un site sans trouvaille grave n'a pas de rapport client et où le verbe répond « rien à signaler ». Plus simple à tenir, et elle supprime exactement le livrable mensuel qui fait vivre un suivi.

**Battu :** remonter les Mineur dans une troisième section d'inventaire, « Points de détail ». C'est le mur de vingt trouvailles que D44 a déjà écarté, réintroduit par une autre porte.

## 3. Composants

```
plugin/skills/rapport/
  SKILL.md                     la procédure, quatre temps
  scripts/
    rapport.ts                 CLI à deux gestes : --preparer puis --rendre
    render-client.ts           Markdown client -> HTML autonome
    lint-client.ts             le contrat de D47
    lib/
      contrat.ts               parseur du Markdown client (pur, sans disque ni réseau)
      rendu.ts                 Markdown client -> chaîne HTML (pur)
    tests/
      fixtures/                un audit complet, un rapport conforme, cinq fautifs
  references/
    registre.md                les règles de langue face au client
    gabarit.md                 le squelette du Markdown client
    theme/
      tokens.css               tokens institut figés, digest daté en commentaire
      spectral-regular.woff2   21,2 Ko
      spectral-600.woff2       22,4 Ko
      spectral-italic.woff2    22,2 Ko
```

Réutilisé sans modification : `plugin/lib/report.ts` (`parseReport`, `Finding`, `Severity`, `latestAuditDir`, `sortAuditDirs`). Rien n'est ajouté à `plugin/lib/` : ce chantier ne produit aucune brique dont un autre verbe ait besoin.

La logique pure vit dans `scripts/lib/` (`contrat.ts`, `rendu.ts`), les CLI dans `scripts/` avec `import.meta.main`, comme les cinq autres verbes.

### 3.1 Le flux, en quatre temps

Claude écrit au milieu du flux, donc le CLI ne peut pas tout faire d'un appel. Deux gestes l'encadrent.

1. **`rapport.ts --preparer [dossier]`** résout l'audit (`latestAuditDir()` sans argument), le parse (`parseReport()`) et imprime sur stdout la matière du jugement : les trouvailles Critique et Important avec leur `pourquoi`, `preuve`, `correctif` et `effort`, la liste des vérifications passées, le compte de Mineur et Info, et le chemin du dossier retenu. Il n'écrit aucun fichier.
2. **Claude écrit `rapport-client.md`** d'après `references/gabarit.md` et `references/registre.md`, à partir de cette sortie. C'est le seul temps de jugement : choisir l'action, regrouper, reformuler, gloser.
3. **Claude relit** son texte contre les quatre défauts de la section 5, et corrige.
4. **`rapport.ts --rendre <dossier>`** lint le Markdown puis, seulement s'il sort 0, écrit `rapport-client.html`. Un lint qui échoue n'écrit rien : on ne produit jamais un HTML dont le Markdown est refusé.

`--rendre-seul <dossier>` est l'alias du temps 4 employé après une correction manuelle du Markdown (D43, AC-7). Il fait exactement la même chose ; le nom distinct existe pour que le `SKILL.md` puisse le proposer sans rejouer les temps 1 à 3.

## 4. Le contrat du Markdown client

`rapport-client.md` est du Markdown strict, parsé par `contrat.ts`. Le gabarit vit dans `references/gabarit.md`.

```markdown
# {{nom du site tel que le client l'appelle}}
Revue du {{date en toutes lettres}}

{{deux ou trois phrases : l'état général, le manque principal, ce que couvre ce document}}

## À faire cette semaine
### {{l'action, en une phrase qui commence par un verbe}}
<!-- couvre: IDX-01, IDX-03 -->
{{pourquoi ça compte pour son activité, une ou deux phrases sans jargon}}

{{le geste exact, numéroté si plusieurs étapes, avec le texte prêt à coller si possible}}

## Ce qui bloque
### {{titre en clair}}
<!-- couvre: SNIP-01 -->
Constaté : {{la preuve, en français lisible, avec la valeur vue}}
Effet : {{ce que ça coûte au client, concret}}
À faire : {{le correctif, sans nous}}

## Ce qui freine
{{même forme}}

## Ce qui marche déjà
- {{une ligne par point fort, tiré des vérifications passées}}

## Méthode
{{ce qui a été regardé, à quelle date, avec quoi}}
{{N}} points mineurs figurent dans le rapport technique complet, disponible sur demande.
```

Le commentaire `<!-- couvre: ID, ID -->` est la seule trace des identifiants. Il est invisible pour le client, et il donne au lint sa correspondance avec `report.md`. Une trouvaille peut être couverte par une section qui en regroupe plusieurs, ce qui est souhaitable : trois trouvailles de balises se disent en un paragraphe.

## 5. Le registre de langue

`references/registre.md` porte les règles que Claude applique en écrivant. Elles sont reprises pour partie des garde-fous d'OpenSEO, qui sont bons et gratuits, et complétées.

- **Gloser chaque terme technique à sa première apparition**, en une demi-phrase dans la phrase même. « L'adresse canonique, celle que vous désignez à Google comme la version officielle d'une page, pointe aujourd'hui vers … »
- **Aucun identifiant de vérification** dans le texte visible.
- **Pas de mots dramatiques.** Les mots de gravité seulement là où ils sont littéralement vrais : un site hors ligne est critique, un title de soixante-cinq caractères ne l'est pas.
- **Pas d'em dash**, pas de construction « Pas X. Y. », pas de point d'exclamation.
- **Deux-points français précédés d'une espace insécable**, comme le DS institut l'impose.
- **Toute affirmation vient d'une preuve dans la collecte.** Le rapport client ne peut rien dire de plus que `report.md` ; il le dit autrement.
- **Une donnée absente se dit « non mesuré »**, jamais « aucun résultat ». L'écart entre « Google n'a pas répondu » et « votre site n'a pas de trafic » est celui d'un client qui panique pour rien.
- **Une mesure prise sur un accès tout neuf se date au lieu de s'affirmer.** Une page inconnue de Google le jour où la propriété Search Console est vérifiée n'est pas une page rejetée, c'est une page pas encore vue. Le rapport client écrit « à revérifier au prochain point », pas « votre page est invisible ». La sévérité du rapport technique est une convention de catalogue, pas une traduction directe en inquiétude client.
- **Le client n'est jamais mis en cause.** On décrit l'état du site, pas les erreurs de son prestataire précédent.

### Relecture adversariale avant de rendre

Avant d'afficher le chemin du rapport, Claude relit son propre texte en cherchant quatre défauts précis : une affirmation qui va au-delà de la preuve, un terme technique non glosé, un passage qui submerge un débutant, une dramatisation. Cette passe est dans le `SKILL.md`, temps 3.

Elle est faite par le modèle lui-même, sans sous-agent : le document fait deux pages et tient en contexte, et un sous-agent pour relire un texte qu'on vient d'écrire est exactement la délégation que la doctrine interdit.

## 6. Le rendu HTML

`rendu.ts` est pur : Markdown client en entrée, chaîne HTML en sortie, aucun accès disque. Les fonts lui sont passées en paramètre sous forme de chaînes base64, ce qui le laisse testable sans lire 66 Ko de binaire.

Règles de rendu, tirées du DS institut et non négociables :

- Light uniquement. Papier `--papier-fond`, encre `--encre`.
- Spectral porte tout, titres et corps, 15px / 1.65 en base.
- Hiérarchie par **filets**, jamais par ombres. Aucune ombre au repos.
- Angles à 0, sauf 2px sur les blocs encadrés.
- Rien ne bouge : aucun survol, aucune transition, aucun script. Le document est inerte.
- Couleur porteuse de sens : bleu Souverain pour la structure et l'action à faire, garance pour « Ce qui bloque » uniquement, vert officiel pour « Ce qui marche déjà ». Le reste est papier et encre.
- Largeur de ligne bornée autour de 68 caractères.
- **Les commentaires `couvre:` sont retirés**, pas convertis en commentaires HTML. Le fichier remis au client ne porte aucune trace du catalogue, y compris dans sa source, qu'un client curieux peut ouvrir.

Répartition des rôles, pour lever toute ambiguïté : `lint-client.ts` lit le **Markdown**, où les commentaires `couvre:` sont présents et où « texte visible » signifie hors de ces commentaires. `rendu.ts` produit le **HTML**, où ils n'existent plus. AC-3 se vérifie donc sur le Markdown et AC-4 sur le HTML.

Feuille d'impression (`@media print`) : marges de 18 mm, fond papier forcé (`print-color-adjust: exact`), pas de coupure au milieu d'une trouvaille (`break-inside: avoid`), en-tête de section non orphelin. La cible est un PDF A4 propre par Cmd+P, sans réglage.

**Amendement du 31/08, à la revue du plan.** Cette section exigeait aussi « l'URL du site en pied de page ». Retirée : `RapportClient` ne porte que le nom du site tel que le client l'appelle, jamais son URL, et la faire arriver jusqu'au rendu obligerait à traverser tout le flux avec une donnée du rapport technique pour un gain d'impression marginal. Le titre du document nomme le site, la Méthode date le relevé : cela suffit à identifier le document. Si un client à plusieurs domaines rend l'ambiguïté réelle, la réponse sera de le nommer dans le titre, pas d'ajouter un champ.

## 7. Tests

`bun test`, dans la convention du dépôt. Les fixtures vivent dans `scripts/tests/fixtures/`.

Sur `contrat.ts` : un rapport conforme se parse ; un rapport sans « À faire cette semaine » lève ; un commentaire `couvre:` malformé lève ; un identifiant inconnu lève.

Sur `lint-client.ts`, un cas par règle de D47 : Critique manquante, Mineur présente, compte de mineurs faux, identifiant visible, em dash présent. Chacun sort 1 et nomme la ligne.

Sur `rendu.ts` : le HTML produit ne contient **aucune** occurrence de `http://` ou `https://` en attribut `src` ou `href` de ressource (l'autonomie de D46, vérifiée par assertion et non par lecture du code) ; il contient trois `@font-face` ; un `<h2>` par section du Markdown ; le titre du document est le nom du site.

Antipatterns bannis, conformément à la doctrine : aucun test ne fige un octet-près du HTML produit ni ne compte les tokens CSS. On assère des invariants, jamais un instantané qui casserait à la première virgule de design.

## 8. Critères d'acceptation

**AC-1. Le rapport se produit depuis un audit existant, sans réseau.**
Quand `/erom-seo:rapport` est lancé dans un dossier client portant un audit niveau 0, alors `rapport-client.md` et `rapport-client.html` existent dans le dossier de cet audit.
*Vérifié par* : `/erom-seo:rapport` depuis le dossier du site, puis `ls seo/audits/<dernier>/rapport-client.*` ; les deux fichiers sont listés. Le geste complet passe par la skill parce que le temps 2 est du jugement ; les deux gestes de script se vérifient séparément, `rapport.ts --preparer` sortant les trouvailles graves sur stdout sans rien écrire.

**AC-2. Le fichier est autonome.**
Quand le HTML produit est ouvert dans un navigateur avec le réseau coupé, alors il s'affiche complet, Spectral compris.
*Vérifié par* : `grep -cE '(src|href)="https?://' rapport-client.html` sort `0`, et ouverture réelle du fichier en mode avion.

**AC-3. Aucune trouvaille grave ne disparaît.**
Quand `report.md` porte trois Critique et deux Important, alors les cinq identifiants sont couverts par les commentaires `couvre:` du rapport client.
*Vérifié par* : `bun ${PLUGIN}/skills/rapport/scripts/lint-client.ts <dossier>` sort 0 ; retirer une section Critique du Markdown et relancer sort 1 en nommant l'identifiant absent.

**AC-4. Le client ne voit aucun jargon d'outil.**
Quand le rapport est rendu, alors aucun identifiant de vérification n'est visible dans le texte.
*Vérifié par* : `grep -cE '\b(AI|FRESH|IDX|PERF|REND|ROBOTS|SD|SNIP|STRAT|TAG)-[0-9]{2}\b' rapport-client.html` sort `0`. Les dix préfixes sont ceux du catalogue, relevés le 31/08 sur `references/checks/` (35 identifiants). Le grep porte sur le HTML et non sur le Markdown : les commentaires `couvre:` y ont été retirés par le rendu, pas seulement masqués à l'affichage.

**AC-5. La règle des em dashes est mécanisée.**
Quand un em dash est présent dans le Markdown client, alors le lint refuse et nomme la ligne.
*Vérifié par* : la fixture `em-dash.md` fait sortir `lint-client.ts` en 1 avec le numéro de ligne ; `bun test` couvre le cas.

**AC-6. Le PDF est propre sans réglage.**
Quand le rapport est imprimé en A4 par Cmd+P sans toucher aux options, alors aucune trouvaille n'est coupée entre deux pages et le fond papier est conservé.
*Vérifié par* : impression réelle en PDF du rapport du site cobaye, relecture visuelle des sauts de page, et passage au juge `/erom-taste-gate ds=institut` sur les deux premières pages.

**AC-7. Le rapport se re-rend sans refaire le jugement.**
Quand une phrase de `rapport-client.md` est corrigée à la main, alors `--rendre-seul` produit un HTML à jour sans passer par Claude.
*Vérifié par* : modifier une phrase, lancer `rapport.ts --rendre-seul <dossier>`, `grep` la phrase corrigée dans le HTML.

**AC-8. Un site sans trouvaille grave produit quand même un rapport utile.**
Quand l'audit ne porte ni Critique ni Important, alors le rapport client est produit, son action s'appuie sur une trouvaille mineure, et aucune section d'inventaire vide n'apparaît.
*Vérifié par* : sur `clients/commentchercherbonheur.org/seo/audits/2026-08-31-n0/` (0 Critique, 0 Important, 1 Mineur, 2 Info), `lint-client.ts` sort 0 avec une action portant `AI-01`, et `grep -c "Ce qui bloque\|Ce qui freine" rapport-client.html` sort `0`. Le compte annoncé dans la Méthode vaut alors 2, pas 3.

## 9. Hors périmètre

- **Les huit autres skills d'OpenSEO** (mots-clés, clustering, concurrents, backlinks, prospection de liens, SEO local, coach, setup). Elles reposent toutes sur DataForSEO, payant à la requête. Ce n'est pas un problème de reprise, c'est un problème de source de données, et il se tranche séparément.
- **Le SEO local**, qui est le vrai manque fonctionnel du plugin pour une clientèle française de proximité. Constaté, noté, pas ouvert ici.
- **Le mode coach** d'OpenSEO, une skill qui n'explique que les autres skills. À reconsidérer si six verbes deviennent difficiles à choisir, pas avant.
- **La journalisation des recherches** avec réutilisation à trente jours. Pertinente chez eux parce que chaque appel coûte ; nos quotas gratuits ne créent pas encore de gêne mesurée.
- **Un envoi automatique au client**, par mail ou autre. Le verbe écrit un fichier ; l'envoi reste un geste humain.
- **Le rendu en Artifact.** Écarté avec la livraison par lien : le client n'a pas de compte, et le fichier doit vivre hors ligne.

## 10. Incertitudes

1. **Les valeurs exactes des tokens institut ne sont pas dans le digest.** Seuls `--papier-fond`, `--encre` et le bleu 700 y figurent. Le reste se copie depuis `src/styles/tokens.css` du repo institut à l'implémentation. Rien ne doit être inventé ni déduit ; si un token manque à la copie, il est demandé, pas approximé.
2. **La qualité du saut de page n'est vérifiable qu'à l'impression réelle.** AC-6 l'impose sur le site cobaye avant de déclarer le chantier fini. Un rapport à deux trouvailles ne prouve rien : la vérification se fait sur un rapport à six sections au moins.
3. **Le choix de l'action unique est du jugement non testable.** Le lint garantit qu'il y en a une et une seule, pas que c'est la bonne. C'est le point où ce verbe peut décevoir, et le seul recours est la relecture de Romain sur les premiers rapports réels.
4. **Le site cobaye est CHICO** (`commentchercherbonheur.org`), tranché par Romain le 31/08. Il a été outillé dans la journée : propriété Search Console vérifiée, site ajouté dans Bing, `seo/strategy.md` écrit et validé, clé IndexNow déployée en production. Le niveau 1 lui est donc accessible, contrairement à ce qui était constaté le matin même.

Trois audits réels y coexistent, et ils couvrent trois formes de rapport client. Relevé sur disque le 31/08 :

| Dossier | Niveau | Couche | Critique | Important | Mineur | Info | Ce qu'il éprouve |
|---|---|---|---|---|---|---|---|
| `2026-08-28-n0-3` | 0 | oui | 0 | 6 | 6 | 1 | le rapport fourni, plusieurs sections |
| `2026-08-31-n0` | 0 | non | 0 | 0 | 1 | 2 | le site sain de D49 |
| `2026-08-31-n1-2` | 1 | oui | 1 | 0 | 1 | 2 | « Ce qui bloque » seul, sans « Ce qui freine » |

**AC-6, l'impression, ne se vérifie sur aucun des trois** : le plus fourni tient en une page et demie. Il faut un Markdown étoffé à la main pour éprouver les sauts de page, comme le plan le prévoit.

5. **Une trouvaille peut être grave par convention et anodine en fait.** L'unique Critique du 31/08 (`IDX-06`, `/telekinesie` inconnue de Google) tombe le jour où la propriété Search Console a été vérifiée : c'est très probablement un délai de première exploration, ce que le rapport technique dit déjà dans son correctif. Un rapport client qui traduirait cette ligne en « une de vos pages est invisible sur Google » alarmerait pour rien. Le registre porte la règle ; aucun lint ne peut l'attraper, et c'est le premier endroit où le jugement du modèle sera pris en défaut.
