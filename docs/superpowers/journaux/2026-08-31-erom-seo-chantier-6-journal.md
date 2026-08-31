# SDD ledger — plan: docs/superpowers/plans/2026-08-31-erom-seo-chantier-6-rapport-client.md

Spec : docs/superpowers/specs/2026-08-31-erom-seo-rapport-client-design.md (D42 à D49, AC-1 à AC-8)
Worktree : /Users/recarnot/dev/erom-seo-chantier-6, branche chantier-6, base bd7024d
Baseline : 434 pass, 0 fail (bun test, 31/08)
Périmètre de ce run : tâches 1 à 6. La tâche 7 (recette) se fait dans le checkout principal, hors worktree.

## Pre-flight, table des interfaces

| Paire | Produit contre consommé | Trouvé |
|---|---|---|
| T1 → T2 | `parseRapportClient`, `RapportClientError`, `idsVisibles`, `lignesEmDash` | accord ; le code a été exécuté le 31/08 avant d'entrer dans le plan |
| T1 → T4 | `RapportClient`, `SectionClient {titre, couvre, corps}` | accord, exécuté |
| T3 → T4 | `Theme = {tokens, fontes}` | accord après correction : le bloc Interfaces disait `fonts`, le code `fontes`. Corrigé avant ce run |
| T1,T2,T3,T4 → T5 | `lintDossier`, `chargerTheme`, `rendre`, `parseRapportClient` | accord |
| T5 → T6 | `--preparer`, `--rendre`, `--rendre-seul` | accord |

## Pre-flight, cohérence interne des tâches

| Tâche | Vérifié | Trouvé |
|---|---|---|
| T1 | chemins d'import des tests (`../lib/contrat`) contre l'arborescence créée | accord |
| T2 | `../../../../lib/report` depuis `scripts/lib/verifier.ts` : lib→scripts→rapport→skills→plugin | accord, 4 niveaux |
| T3 | `RACINE = import.meta.dir/../../references/theme` depuis `scripts/lib/` | accord |
| T5 | `../../../lib/report` depuis `scripts/rapport.ts` : scripts→rapport→skills→plugin | accord, 3 niveaux |
| T2, T4 | tests annoncés contre tests écrits | 11 et 7, comptes corrigés avant ce run |

## Pre-flight, faits périssables du plan contre l'arbre

| Assertion du plan | L'arbre au 31/08 | Accord |
|---|---|---|
| 434 tests avant le chantier | `bun test` dans le worktree : 434 pass, 0 fail | oui |
| dix préfixes de catalogue | `AI FRESH IDX PERF REND ROBOTS SD SNIP STRAT TAG` | oui |
| woff2 de 21 696 / 22 936 / 22 712 octets | 21.2K / 22.4K / 22.2K | oui |
| `fonts/OFL.txt` dans le repo du DS | présent, 4.6K | oui |
| `plugin/lib/tests/fixtures/report-chico-n0.md` | présent, 15.2K, versionné | oui |
| audit du 31/08 sans trouvaille grave | 0 Critique, 0 Important, 1 Mineur, 2 Info | oui |
| `plugin/lib/report.ts` expose `parseReport`, `latestAuditDir` | vérifié à la lecture | oui |

## Rulings du pre-flight

**Ruling 1 : les commandes des tâches 1 à 6 ciblent le worktree, pas le checkout principal.**
Quatorze `cd /Users/recarnot/dev/erom-agence-seo` dans le plan. Dix d'entre eux encadrent des `git add` et `git commit` : suivis à la lettre depuis ce worktree, ils auraient commité sur `main` dans le checkout principal, exactement l'incident que le worktree existe pour éviter. Remplacés par `cd "$(git rev-parse --show-toplevel)"`, qui résout correctement dans les deux contextes.
Coût si faux : nul, la forme est portable et vérifiée dans le worktree.

**Ruling 2 : la fixture du site sain se copie depuis le checkout principal, par chemin absolu.**
`clients/commentchercherbonheur.org/` est gitignoré, donc ce dossier n'existe dans aucun worktree ; la Task 2 Step 1 aurait échoué au premier `cp`. Le chemin devient absolu vers `/Users/recarnot/dev/erom-agence-seo/...`. Une fois copiée, la fixture est versionnée sous `plugin/` et plus rien ne dépend du checkout principal.
Coût si faux : la fixture manque et la tâche 2 échoue bruyamment au premier test, pas silencieusement.

**Ruling 3 : les quatre `cd` de la tâche 7 restent sur le checkout principal.**
La recette a besoin des dossiers clients, gitignorés donc absents du worktree. Elle se fera après le merge, dans le checkout principal. Non modifiés à dessein.
Coût si faux : la recette se lance au mauvais endroit et ne trouve pas les audits ; visible immédiatement.

## Revue adversariale du plan (Opus, 31/08)

Le reviewer a reconstruit le plan dans un bac à sable avec le vrai `plugin/lib/report.ts` et les vraies fixtures, puis exécuté les quatre fichiers de test et le CLI. Douze défauts, dont trois graves. Tous rulés avant le dispatch de la tâche 1, et chaque correctif de code réexécuté.

**Ruling 4 (S1, grave) : corrigé.** `blocs()` matchait `COUVRE_RE` sur la ligne brute quand `idsVisibles()` le testait sur la ligne trimmée. Un commentaire `couvre:` indenté n'était donc pas parsé mais restait exclu du détecteur de fuite : le lint passait et les identifiants de catalogue partaient dans le HTML du client. Correctif `l.trim().match(...)` plus un test qui verrouille les deux côtés. Reproduit avant, vérifié mort après.
Coût si faux : nul, le correctif est plus strict que l'original dans tous les cas.

**Ruling 5 (S2, grave) : corrigé.** Le `git add` de la tâche 2 oubliait `client-sain.md` et `report-chico-sain.md`, que `verifier.test.ts` charge à l'import : la suite cassait sur tout clone frais, et l'une des deux fixtures venait d'un chemin absent du dépôt. Ajout des deux, plus un `git status --short` de contrôle dans le step.

**Ruling 6 (S3, grave pour la recette) : précondition écrite, chemins inchangés.** La tâche 7 lance ses commandes dans le checkout principal, qui ne porte le verbe `rapport` qu'après le merge. Plutôt que de réécrire ses chemins, la tâche gagne une précondition explicite (fusionner d'abord, recetter ensuite) et deux commandes de contrôle. C'est aussi ce qui rend son `git commit` correct plutôt qu'échappé.
Coût si faux : la recette échoue bruyamment sur « fichier introuvable », jamais silencieusement.

**Ruling 7 (S4, moyen) : corrigé.** `expect(sortie).toContain("7")` passait sur du code muté, le chemin `mkdtemp` contenant presque toujours un 7 (mesuré 200 fois sur 200 par le reviewer). Ancré sur son libellé : `toContain("points mineurs à annoncer : 7")`.

**Ruling 8 (S5, moyen) : corrigé.** `verifier` laissait remonter `ReportError` en stack trace alors que `checklist.ts` et `plan.ts` la nomment déjà. Attrapée et rendue en refus lisible ; un test la couvre.

**Ruling 9 (S6, moyen) : lint plutôt que rendu.** Le rendu ne connaît que le paragraphe et la liste numérotée ; un gras ou un accent grave partait en clair chez le client, alors que la spec promet un texte prêt à coller. Deux voies possibles : étendre `rendu.ts`, ou refuser le balisage à l'écriture. Refus retenu, trois lignes de lint et deux tests, contre un parseur Markdown à maintenir pour un document de deux pages.
Coût si faux : Claude se fait refuser une mise en forme légitime et doit la reformuler ; visible et sans conséquence.

**Ruling 10 (S7, moyen-faible) : deux corrigés, un retiré de la spec.** `<h2>Méthode</h2>` ajouté, `--rayon-champ` enfin appliqué aux deux blocs encadrés. En revanche l'URL du site en pied d'impression est **retirée de la spec** : `RapportClient` ne porte que le nom du site, et faire traverser tout le flux à une donnée du rapport technique ne valait pas ce gain. Amendement écrit dans la spec, section 6.
Coût si faux : un rapport imprimé n'identifie le site que par son nom ; si un client multi-domaines rend ça ambigu, on le nommera dans le titre.

**Ruling 11 (S8, faible) : corrigé.** Trois comptes de tests faux dans le plan (8 annoncés contre 11 mesurés, total 464 contre 467). Recalculés après mes ajouts : 12, 15, 7, 4, soit environ 472. Formulés désormais comme indicatifs, le critère étant zéro échec et aucun test sauté, pour qu'un exécutant ne lise pas une suite saine comme un échec.

**Ruling 12 (S9, faible) : corrigé.** Deux mentions de « cinq skills » subsistaient hors du step, dont la description publique du manifeste. Les trois endroits sont maintenant dans un tableau, avec un `grep` de contrôle.

**Ruling 13 (S10, faible) : corrigé.** `lintDossier` n'avait aucun test et AC-5 nommait une fixture inexistante. Trois tests ajoutés sur fichiers réels, dont celui qu'AC-5 exige.

**Ruling 14 (S11, faible) : corrigé.** En-tête du plan remis à D42-D49 et AC-1-AC-8 ; justification du `.gitignore` réécrite sur la vraie règle ; écart volontaire de `--serif` documenté dans le fichier lui-même ; l'abandon de `render-client.ts` au profit de `rendu.ts` plus `rapport.ts --rendre` est désormais énoncé en tête de plan.

**Ruling 15 (S12, hypothèse) : corrigé.** Le CLI résolvait le dossier avant de valider le geste, donc `--bidon` répondait « aucun audit trouvé ». Geste validé d'abord, et ENOENT nommé plutôt que remonté brut.

**Non retenu.** Aucun. Les douze findings ont été soit corrigés, soit convertis en précondition écrite.

**Risque résiduel nommé par le reviewer, non couvert ici :** aucun rendu visuel n'a été jugé (AC-6, sauts de page, taste-gate), et il n'a pas pu trancher si `/erom-seo:rapport` chargera la skill depuis le worktree ou depuis `main` à la recette. Les deux se règlent en tâche 7, hors de ce run.

## Gotcha du harness numéro 2, découvert le 31/08 à la tâche 6

`ls` sans `RTK_DISABLED=1 command` peut **avaler une ligne** de sa sortie. Deux `ls plugin/skills/` successifs ont rendu cinq dossiers au lieu de six, `build` manquant, alors que `git ls-files` en indexait quinze fichiers et que `git status` était vide. J'ai cru une skill entière disparue du worktree et j'allais enquêter sur une base fausse ; `test -d` puis `RTK_DISABLED=1 command ls -1` ont rendu les six.

La règle du CLAUDE.md le disait déjà pour les sorties qui portent une décision. Elle vaut aussi pour un `ls` d'apparence anodine : toute sortie sur laquelle je m'apprête à conclure passe par `RTK_DISABLED=1 command`. Coût de l'oubli mesuré ici : une fausse alerte et six appels d'outil.

## Gotcha du harness, à répéter dans chaque brief

Dans une session isolée en worktree, le garde-fou refuse toute commande Bash composée qu'il ne peut pas prouver interne au worktree : un `cd … && git add … && git commit …` en une ligne est rejeté comme « trop complexe à vérifier ». Rencontré par moi puis par l'implémenteur de la tâche 1, indépendamment. Les commandes git se lancent une par une. Ce n'est pas un échec de l'agent, et ça ne change rien au résultat.

## Journal

- **Tâche 1, implémentation** : `fd2e340`, `feat(rapport): contrat.ts, le parseur du Markdown client`. 3 fichiers, 234 insertions. Statut rendu DONE.
- **Tâche 1, vérifications faites par moi** (jamais sur la seule parole de l'agent) : `bun test` complet à 446 pass / 0 fail, contre 434 avant le chantier, soit les 12 tests annoncés et aucune régression. Les deux `trim()` solidaires sont bien présents dans le fichier livré, `contrat.ts:46` et `contrat.ts:107` : le bug du ruling 4 est verrouillé dans le code, pas seulement dans le plan.
- **Tâche 1, revue** : paquet `review-28b0bd0..fd2e340.diff` (12 852 octets), reviewer sur sonnet. Conformité spec ✅, les trois fichiers sont identiques au brief au caractère près, `PREFIXES` vérifié contre les dix fichiers réels du catalogue. Qualité : un Important, trois Mineurs.
- **Tâche 1, minor (deferred)** : `section()` localise par `indexOf('\n## Titre')`, donc un titre voisin commençant par le même texte serait confondu. Non exploitable, les titres sont figés par `TITRES`.
- **Tâche 1, minor (deferred)** : `blocs()` jette silencieusement le texte placé avant le premier `###` d'une section. Non spécifié par le brief ; à traiter si un gabarit futur autorise un chapeau de section.
- **Tâche 1, minor (deferred)** : le contrôle « corps vide » ne porte que sur l'action, pas sur les blocs de `bloque` et `freine`. Asymétrie connue, conforme au brief.
- **Tâche 1, fix round 1/5 (1 adressé, 0 ouvert ; commits fd2e340..19f9206)** : finding Important renvoyé à l'implémenteur d'origine. Le couplage `blocs()`/`idsVisibles()` n'était verrouillé que dans un sens : le reviewer a muté les deux `trim()` et mesuré que retirer celui d'`idsVisibles()` laisse les 12 tests verts. Sens non couvert = faux positif, pas fuite, d'où Important et non Critique. Correctif demandé avec sa preuve par mutation. Re-revue indépendante sur haiku : ADRESSÉ, la mutation refaite par le re-reviewer lui-même donne 11 pass / 1 fail muté puis 12 pass / 0 fail restauré, `git status` propre.
- **Tâche 1 : complete (commits 28b0bd0..19f9206, revue clean)**. La suite passe de 434 à 446 tests.
- **Tâche 1 : released** implémenteur, reviewer, re-reviewer, plus le reviewer adversarial du plan. Les quatre `TaskStop` rendent « no task found » ou « not running » : déjà réclamés par le harness, ce qui vaut libération. Leurs rapports restent sur disque.
- **Tâche 2, implémentation** : `dd0cd48`, `feat(rapport): lint-client, les sept règles du contrat client (D47, D49)`. 6 fichiers, 474 insertions. Statut rendu DONE.
- **Tâche 2, vérifications faites par moi** : `bun test` complet à 461 pass / 0 fail, contre 446 avant, soit les 15 tests annoncés sans régression. Surtout, le ruling 5 a tenu : `git ls-files plugin/skills/rapport/` liste les neuf fichiers dont les **trois** fixtures, et `git status --short` sur la skill est vide. Rien n'est resté hors du dépôt, donc la suite tiendra sur un clone frais.
- **Tâche 2, défaut de mon plan signalé par l'implémenteur** : le `git status --short` de contrôle que j'avais ajouté au step est placé **avant** le `git commit`, où il liste forcément les fichiers en `A` et ne peut donc jamais être littéralement vide. L'implémenteur a compris l'intention (aucun `??` oublié), l'a vérifiée aux deux instants et confirmée après le commit. Formulation à corriger si le step resservait ; sans conséquence ici, la garantie visée est atteinte et je l'ai revérifiée moi-même.
- **Tâche 2, revue** : paquet `review-19f9206..dd0cd48.diff` (37 106 octets), reviewer sur sonnet, avec consigne de chercher activement un rapport qui passerait le lint en trahissant le client. Conformité spec ✅, transcription verbatim vérifiée fichier par fichier. Un Critique, un Important, deux Mineurs. Le reviewer a trouvé ce qu'on lui demandait de chercher, et il l'a exécuté plutôt que supposé.

**Ruling 16 (le Critique de la tâche 2) : limite assumée du contrat, documentée, pas corrigée dans le code.**
Le reviewer démontre qu'ajouter `STRAT-01, STRAT-02` au commentaire `couvre:` d'une action qui parle de titres de pages fait passer le lint, alors que ces deux Important ont disparu du document client. La couverture est un pointage d'identifiant, jamais une correspondance de contenu.
Décidé : ne pas corriger dans `verifier.ts`. Aucun lint ne peut juger qu'un paragraphe français traite bien d'une trouvaille donnée, et toute heuristique de substitution (longueur minimale par identifiant, plafond d'identifiants par section) produirait des refus arbitraires sur des rapports justes. À la place : la limite est nommée noir sur blanc dans D47, et la relecture du temps 3 passe de quatre à **cinq** défauts, le nouveau venant en tête et visant exactement cette triche. Le rapport ne part par ailleurs jamais sans que Romain l'ait lu.
Coût si faux : un rapport peut déclarer traiter une trouvaille dont il ne parle pas, et ni le lint ni la relecture ne l'attrapent. Le client reçoit alors un document incomplet sans le savoir. C'est le trou le plus sérieux du chantier et il est ouvert sciemment, faute de moyen mécanique honnête de le fermer. À rouvrir si un premier rapport réel montre la triche.

- **Tâche 2, fix round 1/5** : quatre corrections renvoyées à l'implémenteur d'origine. La règle 7 ne scannait que trois zones sur cinq (la synthèse et « Ce qui marche déjà » échappaient au contrôle du balisage, démontré par le reviewer) ; une section d'inventaire au corps vide pouvait déclarer couvrir des trouvailles ; le premier `catch` ne testait pas son type, contrairement à son voisin immédiat ; aucune trouvaille Critique n'était exercée par un test, les deux fixtures réelles n'en portant aucune.
- **Tâche 2, fix round 1/5 (4 adressés, 0 ouvert ; commits dd0cd48..4e625cc)** : re-revue indépendante sur sonnet, qui a exécuté ses propres cas plutôt que de lire le diff, depuis un script en scratchpad important `verifier.ts` en lecture seule, sans toucher un fichier du dépôt. Les cinq zones refusent bien le balisage en nommant chacune correctement, la section d'inventaire muette est refusée en nommant l'identifiant qu'elle prétendait couvrir, et aucune des trois zones déjà couvertes n'a perdu en précision après l'extraction du helper.
- **Tâche 2 : complete (commits 19f9206..4e625cc, revue clean)**. La suite passe de 446 à 466 tests.
- **Tâche 2 : released** implémenteur, reviewer, re-reviewer.
- **Ruling 16 documenté** : `a72d3a8`, la limite du contrat de couverture est écrite dans D47 et la relecture du temps 3 passe à cinq défauts, dans la spec comme dans le plan.
- **Tâche 3, implémentation** : `039cfed`, `feat(rapport): thème institut figé, tokens et fontes Spectral sous OFL`. 6 fichiers, dont trois binaires. Dispatchée sur haiku, la tâche étant de la copie fidèle, et le pari tient.
- **Tâche 3, vérifications faites par moi** : les 33 tokens comparés un par un à la source du design system par script, **32 identiques au caractère près**, l'unique écart étant `--serif` documenté comme volontaire. SHA-256 de `spectral-v15-latin-regular.woff2` identique à la source, donc copie bit à bit. Les trois tailles conformes à l'octet. La commande de vérification sort bien `fontes : 3 | base64 total : 88 Ko`.
- **Tâche 3, écart de convention constaté par moi** : le commit `039cfed` ne porte **pas** les pieds `Co-Authored-By:` et `Claude-Session:`, contrairement aux cinq autres commits du chantier et aux 28 commits récents du dépôt. Soumis au reviewer sans l'orienter ; il l'a confirmé indépendamment.
- **Tâche 3, revue** : paquet `review-a72d3a8..039cfed.diff`, reviewer sur sonnet. Conformité ✅ sur `theme.ts`, identique au brief au caractère près, champ `fontes` correctement nommé, base64 décodé et recomparé octet à octet aux `.woff2`, résolution de chemin éprouvée depuis deux répertoires courants différents. Un Important, deux Mineurs.

**Ruling 17 (l'Important de la tâche 3) : la licence des fontes était vide, corrigée avec l'avis officiel vérifié à la source.**
`OFL.txt` a été copié fidèlement d'un fichier source lui-même défectueux : son bloc de copyright est resté le gabarit de l'OFL, `Copyright (c) <dates>, <Copyright Holder> (<URL|email>), with Reserved Font Name <Reserved Font Name>`. L'OFL 1.1 exige que chaque copie redistribuée porte l'avis réel, et ce fichier part chez des clients dans un rapport. Le même fichier annonçait par ailleurs Courier Prime, que nous ne redistribuons pas : les trois `.woff2` embarqués sont tous des Spectral.
Décidé : corriger ici, avec l'avis officiel que j'ai vérifié moi-même sur le dépôt `google/fonts` plutôt que de le reprendre du rapport de revue : `Copyright 2017 The Spectral Project Authors (https://github.com/productiontype/Spectral)`, sans clause de nom réservé, Spectral n'en ayant pas. Le corps de la licence reste intact au caractère près.
**Le défaut préexiste en amont**, dans `erom-design-system-institutionnel/fonts/OFL.txt`, et n'y est pas corrigé : hors périmètre de ce chantier, mais à remonter à Romain, car tout projet qui reprend ce design system hérite du même fichier vide.
Coût si faux : une mention de copyright inexacte sur une police redistribuée. Le risque réel est faible, l'OFL n'ayant pas de mécanisme d'exécution agressif, mais la correction coûte trois lignes.

**Ruling 18 (le trailer manquant) : pas de réécriture d'historique.**
`039cfed` garde son message sans les deux pieds. Amender réécrirait un commit déjà référencé par mes paquets de revue et par ce ledger, pour une ligne de métadonnée. Le commit de correction, lui, les portera.
Coût si faux : un commit du chantier sur sept manque de traçabilité de session. Visible dans `git log`, sans conséquence fonctionnelle.

- **Tâche 3, fix round 1/5** : deux corrections envoyées, la licence et un test de `theme.ts` figeant le nom du champ `fontes` que les tâches 4 et 5 consommeront, avec consigne explicite de n'asserter aucune taille en octets pour ne pas fabriquer un test qui casse à la première mise à jour de fonte.
- **Tâche 3, fix round 1/5 (2 adressés, 0 ouvert ; commits 039cfed..f46ef08)** : re-revue sur haiku. Licence conforme, corps intact au caractère près (checksum vérifié par moi), plus aucune trace de Courier Prime dans le fichier, et les trois tests de `theme.ts` sont bien des invariants, sans taille ni total figés. Suite complète à 469 pass.
- **Tâche 3 : complete (commits a72d3a8..f46ef08, revue clean)**.
- **Tâche 3 : released** implémenteur, reviewer, re-reviewer.

**Ruling 19 (trouvé par moi, hors revue) : l'avis de licence doit voyager dans le HTML, pas seulement dans le dépôt.**
Le reviewer a traité la licence du dépôt, mais personne n'avait vu que le rapport HTML **embarque les fontes en base64** : le document remis au client redistribue donc le logiciel de police, et la condition 2 de l'OFL 1.1 veut que chaque copie porte l'avis de copyright et renvoie à la licence. Un `OFL.txt` resté dans le dépôt ne suit pas la pièce jointe.
Décidé : ajouter à `rendu.ts` un commentaire HTML de trois lignes, portant l'avis Spectral et l'URL de la licence, plus un test qui le verrouille. Fait dans le plan avant le dispatch de la tâche 4, donc sans cycle de correction.
Vérifié par moi sur le prototype avant commit : les deux URL du commentaire ne sont dans aucun attribut `src` ou `href`, donc ni le test d'autonomie du rendu ni le `grep` de recette d'AC-2 ne se déclenchent, et AC-4 reste vert.
Coût si faux : trois lignes de commentaire invisibles à l'écran dans un fichier de 150 Ko.
- **Tâche 4, implémentation** : `ef7121c`, `feat(rapport): rendu.ts, le HTML autonome au profil institut`. Suite à 477 pass.
- **Tâche 4, vérifications faites par moi** sur un rendu réel avec les vraies fontes, pas sur des base64 factices : 94 Ko produits, trois `@font-face`, aucune ressource distante, aucun identifiant de catalogue, aucune balise script, avis de licence présent, et « Ce qui bloque » correctement absent sur un audit sans trouvaille critique. Rendu ouvert dans un navigateur et regardé : registre institut tenu, papier chaud, Spectral, bleu Souverain sur l'action, vert sur les points forts, filets sans ombres. Capture envoyée à Romain.
- **Tâche 4, limite de ma vérification visuelle** : le navigateur a cessé de défiler correctement et tronquait les captures après deux essais. Arrêté là plutôt que d'insister ; l'impression PDF et le taste-gate restent à la tâche 7, hors de ce run.
- **Tâche 4, revue** : paquet `review-1d2c2c4..ef7121c.diff`, reviewer sur sonnet. Conformité ✅, transcription verbatim, suite relancée par lui. Un Critique, un Important, quatre Mineurs.

**Ruling 20 (le Critique de la tâche 4) : le bug de la tâche 1 était revenu par une autre porte, corrigé à la racine.**
Un commentaire `couvre:` placé dans la synthèse d'ouverture ou dans « Méthode » n'est retiré par personne (le parseur ne dépouille que les blocs `###`) et n'est détecté par personne (`idsVisibles` exempte toute ligne qui y ressemble, où qu'elle soit). Il arrive donc **échappé, donc lisible**, dans le HTML remis au client, et le lint dit « conforme ». Démontré par exécution du Markdown jusqu'au HTML.
C'est exactement le défaut du ruling 4 sous un autre angle : là c'était l'indentation qui faisait diverger les deux fonctions, ici c'est l'emplacement. Deux occurrences du même motif valent une correction structurelle, pas une rustine de plus.
Décidé : la règle devient « tout commentaire `couvre:` du document doit être rattaché à un bloc de section parsé ». Trois fichiers touchés, dont deux appartenant à des tâches déjà closes, ce qui est assumé : `contrat.ts` expose les lignes de tous les commentaires du document, `verifier.ts` refuse dès que leur compte diffère de celui des blocs qui en portent, et `rendu.ts` gagne une défense en profondeur qui retire tout commentaire résiduel avant échappement. La dernière porte avant le client se ferme même si le lint est contourné.
Coût si faux : un identifiant technique visible dans un document commercial. C'est le défaut le plus visible du chantier pour un tiers, et le seul que ni le lint ni la relecture n'attrapaient.

- **Tâche 4, minor (deferred)** : `echapper()` n'échappe pas les guillemets. Inoffensif tant qu'aucun texte client n'est injecté en position d'attribut, ce qui est le cas aujourd'hui. Piège dormant, à rouvrir si un attribut interpole un jour du texte client.
- **Tâche 4, minor (deferred)** : une liste numérotée dont un item est replié sur deux lignes se rend en paragraphe avec les numéros en texte brut. Aucun texte perdu, dégradation visuelle seulement.
- **Tâche 4, minor (deferred)** : l'avis de licence embarqué renvoie à l'OFL sans en recopier le texte intégral. Choix assumé du ruling 19.
- **Tâche 4, fix round 1/5** : trois corrections envoyées, la fuite structurelle, la feuille d'impression (quatre manques : `.methode` sans protection de coupure, en-tête non protégé, pas d'`orphans`/`widows`, pas d'alias historiques) et un test qui dupliquait la liste des préfixes au lieu d'importer la constante déjà exportée.
- **Tâche 4, fix round 1/5 (3 adressés, 0 ouvert ; commits ef7121c..49f79c2)** : re-revue sur sonnet. Les trois pièces du correctif structurel sont en place et cohérentes, la feuille d'impression traite bien les quatre manques (l'en-tête est devenu un vrai `<header class="entete">` regroupant titre, date et synthèse, protégé sur le bon sélecteur), et le test importe désormais la constante.
- **Tâche 4, chasse à la quatrième porte : aucune trouvée.** Le re-reviewer a construit neuf cas de contournement et les a tracés jusqu'au HTML : `couvre:` dans « Ce qui marche déjà », en item à tiret, commentaire non-`couvre:` portant un identifiant, identifiant en clair sans commentaire, commentaire partagé avec du texte sur la même ligne, `couvre:` dans un `###` d'une section ignorée, `couvre:` en préambule de section. Tous attrapés, aucune fuite. Le mécanisme tient par construction : `couvreMalPlaces` couvre le commentaire bien formé hors bloc, et tout ce qui dévie de cette forme retombe dans `idsVisibles`, dont l'exemption est scopée sur la même expression. Les deux détecteurs se relaient exactement là où l'autre s'arrête. Information utile en soi, pas un renoncement.

**Ruling 21 (résidu créé par le correctif) : l'amputation silencieuse se refuse à l'écriture.**
La défense du rendu retire tout commentaire HTML, pas seulement les `couvre:`. Un texte client contenant littéralement `<!-- ... -->` est donc amputé sans qu'aucun refus ne le signale. Le cas est improbable dans une prose client, mais le mot qui décide est « silencieusement » : un rendu qui mange du contenu sans le dire est plus grave que le défaut qu'il répare, et ce chantier a déjà vu le même motif entrer par deux portes différentes.
Décidé : ajouter la séquence d'ouverture de commentaire à la liste des balisages refusés à l'écriture, à côté de l'accent grave et du gras. La défense du rendu reste en place : le lint refuse à l'écriture, le rendu protège en dernier recours. Consigne explicite de vérifier par un test que les `couvre:` légitimes ne déclenchent pas ce refus, plutôt que de le supposer.
Coût si faux : un rapport parfaitement valide se ferait refuser pour un commentaire légitime, ce qu'un test de non-régression rend visible immédiatement.
- **Tâche 4, fix round 2/5 (1 adressé, 0 ouvert ; commits 49f79c2..6f431e4)** : re-revue sur haiku, avec exigence d'une raison **structurelle** et pas d'une simple observation. Obtenue : `blocs()` intercepte la ligne qui matche l'expression du commentaire et fait `continue` avant le `corps.push()`, si bien qu'un `couvre:` légitime n'entre jamais dans le corps que `refuserBalisage()` examine. Le faux refus est donc impossible par construction, pas seulement absent aujourd'hui. Vérifié aussi de mon côté sur les deux fixtures réelles.
- **Tâche 4 : complete (commits 1d2c2c4..6f431e4, revue clean)**. La suite passe de 477 à 491 tests.
- **Tâche 4 : released** implémenteur, reviewer, deux re-reviewers.
- **Tâche 5, implémentation** : `93870a8`, `feat(rapport): le CLI à deux gestes, preparer et rendre`. Suite à 495 pass.
- **Tâche 5, vérifications faites par moi, de bout en bout sur un vrai audit** (le niveau 1 du 31/08 de CHICO, celui qui porte une trouvaille critique) : `--preparer` sort le site, la date, la trouvaille grave avec pourquoi, preuve, correctif et effort, le compte de trois points mineurs et les trente et un points forts, sans écrire un fichier. Un Markdown client rédigé à la main passe le lint et produit le HTML. Puis, couverture de la trouvaille retirée, le programme refuse en nommant `IDX-06`, sort en code 1, et **aucun HTML n'est écrit** : la garantie centrale tient sur le vrai flux, pas seulement en test.
- **Tâche 5, observation de terrain** : en rédigeant ce rapport client moi-même, le piège de l'incertitude 5 s'est présenté tel qu'annoncé. La trouvaille dit « page inconnue de Google », la réalité est « la propriété Search Console a été vérifiée le matin même ». Le registre conduit bien à écrire « pas encore explorée, probablement un délai, à revérifier » plutôt que « votre page est invisible ». La règle est donc utilisable, pas seulement écrite.
- **Tâche 5, revue** : paquet `review-6f431e4..93870a8.diff`, reviewer sur sonnet. Conformité ✅, transcription verbatim vérifiée par `diff` mécanique, les deux profondeurs d'import (trois niveaux depuis `scripts/`, quatre depuis `scripts/lib/`) confirmées justes. Qualité approuvée, deux Mineurs, aucun n'entre dans la boucle.
- **Tâche 5, question tranchée** : `--rendre-seul` est réellement accepté et fonctionne de bout en bout, y compris après correction manuelle du Markdown (AC-7). Son absence de branche dédiée n'est pas un raccourci mais l'application de la spec, qui dit qu'il fait exactement la même chose ; sa vérification est assignée à la recette de la tâche 7, pas aux tests unitaires.
- **Tâche 5, minor (deferred)** : deux gestes ou deux dossiers passés ensemble, le second est ignoré sans un mot (`find` retient le premier). Non spécifié par le brief, surface d'erreur silencieuse pour un usage scripté. Risque faible, l'outil étant invoqué par une skill et non composé à la main.
- **Tâche 5, minor (deferred)** : un commentaire du code invoque « la même convention que checklist.ts » pour la traduction d'un fichier absent, alors que `checklist.ts` pré-vérifie l'existence au lieu d'attraper l'erreur. Le mécanisme retenu ici est meilleur que sa référence ; seule la comparaison est inexacte. Cosmétique.
- **Tâche 5 : complete (commits 6f431e4..93870a8, revue clean)**. La suite passe de 491 à 495 tests.
- **Tâche 5 : released** implémenteur, reviewer.
- **Tâche 6, implémentation** : `a5f00ce`, `docs(rapport): la skill, le registre client et le gabarit`. 6 fichiers, 185 insertions.
- **Tâche 6, deux jugements de l'implémenteur, tous deux justes** : il a compté **neuf** règles de langue dans la spec là où mon brief en annonçait huit, et a suivi la spec plutôt que le chiffre, en le signalant au lieu de trancher en silence ; et il a inclus `plugin.json` dans son commit alors que mon `git add` l'omettait, évitant de livrer un manifeste incohérent. Deux fois le bon réflexe sur des défauts de mon brief.
- **Tâche 6, vérifications faites par moi** : zéro tiret cadratin dans les cinq fichiers touchés, plus aucune mention de « cinq skills », six dossiers de skills, suite à 495 pass.
- **Tâche 6, revue** : paquet `review-93870a8..a5f00ce.diff`, reviewer sur sonnet. Conformité ✅, `SKILL.md` et gabarit byte-identiques à leur source. Deux Important, trois Mineurs. Le reviewer a fait ce que je lui demandais de plus utile : écrire un rapport suivant le gabarit à la lettre et le passer au lint. Il sort conforme, le gabarit n'est donc pas un piège.
- **Tâche 6, point 3 vérifié** : le défaut de relecture qui n'a aucun équivalent mécanique est bien présent, bien en **tête** des cinq dans les deux fichiers, et sa consigne est même plus stricte que la spec, qui disait « l'écrire ou retirer l'identifiant » là où le registre impose d'écrire la phrase. L'implémenteur a choisi l'interprétation sûre, alignée sur D47.
- **Tâche 6, minor (deferred)** : l'exemple de la règle sur les tirets cadratins n'illustre que le point d'exclamation, pas la construction « Pas X. Y. » qu'elle nomme. Le tiret est mécanisé par le lint de toute façon.
- **Tâche 6, fix round 1/5** : quatre corrections. Un cinquième endroit annonçait encore cinq verbes (`plugin/README.md:3`), que mon grep de contrôle ne pouvait pas voir puisque la phrase énumère les verbes sans écrire le mot « cinq » ; `--rendre-seul` n'avait aucun aiguillage en tête de procédure, si bien que le modèle pouvait rejouer les temps 1 à 3 et réécrire un Markdown que Romain venait de corriger, exactement ce que ce drapeau évite ; l'exemple de l'espace insécable montrait l'absence d'espace au lieu de l'espace normale, qui est l'erreur réelle et invisible à l'oeil, sur la seule règle qu'aucun lint ne vérifie ; et le temps 4 s'adressait « au client » alors que la skill parle à Romain, le rapport ne partant jamais seul.
- **Tâche 6, fix round 1/5 (4 adressés, 0 ouvert ; commits a5f00ce..29fb885)** : re-revue sur haiku. Les quatre corrections sont en place, et la chasse demandée n'a trouvé **aucune autre énumération des verbes** ailleurs dans la documentation ni dans les `SKILL.md` des cinq autres skills. Vérifié aussi de mon côté, dont l'espace insécable par examen hexadécimal : `Constat c3a9` puis `c2 a0` puis `3a`, le bon caractère est bien devant le deux-points.
- **Tâche 6, minor (deferred)** : le `SKILL.md` ne dit pas explicitement si le modèle doit relayer `--rendre-seul` au script ou appeler `--rendre`. Les deux fonctionnent, le script les traitant à l'identique, donc l'ambiguïté est sans conséquence fonctionnelle.
- **Tâche 6 : complete (commits 93870a8..29fb885, revue clean)**.
- **Tâche 6 : released** implémenteur, reviewer, re-reviewer.

## Revue finale de branche (tier think, 31/08)

Seize commits relus, cinq défauts démontrés par exécution, tous corrigés en une seule vague (`898b48f`), puis re-vérifiés par mutation. Suite de 495 à **506 tests**.

**Ruling 22 (D1, la troisième porte) : trouvée dans un couloir que deux chasses avaient manqué.**
Le commentaire de provenance de `tokens.css`, qui porte le chemin du dépôt du design system, la version du paquet et une note éditoriale, était collé brut dans la balise `<style>` du HTML remis au client. Toutes nos défenses (lint, `couvreMalPlaces`, strip d'`echapper`) surveillaient le Markdown et les commentaires **HTML** ; un commentaire **CSS** les traversait toutes. C'est exactement la classe de fuite que je faisais chercher depuis la tâche 4, et elle est entrée par le seul chemin que personne ne regardait.
Décidé : retirer les commentaires au **chargement**, dans `chargerTheme()`, en gardant le commentaire dans le fichier versionné, que D45 exige. Vérifié par moi sur un rendu réel : zéro occurrence du chemin interne, huit tokens toujours présents.
Leçon pour la suite : une garantie formulée sur un format (« aucun commentaire HTML ») ne protège pas d'un autre format qui atteint la même sortie.

**Ruling 23 (D2) : le mode d'emploi portait la règle d'avant D49.**
`SKILL.md` disait encore « aucune Mineur ni Info ne doit être couverte », et `preparer()` n'affichait aucune mineure quand l'audit n'en portait aucune de grave, privant le modèle de la seule matière dont son action a besoin sur ce chemin, qui est la moitié des rapports en régime récurrent. Une décision prise en cours de chantier avait été écrite dans la spec et dans le lint, mais pas dans le document que le modèle lit à chaque exécution.
Leçon : quand une décision amende une règle, la propager partout où la règle est **énoncée**, pas seulement là où elle est appliquée.

**Ruling 24 (D4) : une garantie que personne ne peut faire tomber est imaginaire.**
Un `@import` distant et une balise de script injectés dans le rendu laissaient les 495 tests au vert : le test d'autonomie ne regardait que les attributs `src` et `href`. Trois assertions ajoutées, chacune vérifiée par mutation, chacune tombe seule.

**Ruling 25 (résidu de la revue finale, parké) : la regex de nettoyage CSS est fragile sur un fichier malformé.**
Le re-reviewer a construit les cas voisins : un commentaire non fermé n'est pas retiré, une valeur de type chaîne contenant les délimiteurs de commentaire est corrompue, et un commentaire non fermé suivi d'une telle chaîne mange les déclarations intermédiaires. Aucun ne se déclenche sur le fichier réel, qui est bien formé, versionné, contrôlé et rarement modifié, et `theme.test.ts` intercepte une partie des corruptions.
Décidé : parké, pas corrigé. Une analyse CSS robuste pour un fichier de tokens de trente lignes est disproportionnée, et la procédure n'accorde pas de seconde vague de correction.
Coût si faux : un futur éditeur ajoute une valeur de type chaîne à `tokens.css` et casse le rendu silencieusement. À durcir ce jour-là, pas avant.

**Ruling 26 (résidu cosmétique, reporté à la recette) : un mot de vocabulaire divergent.**
`SKILL.md` décrit encore la sortie de `--preparer` comme donnant le nombre de points mineurs « à annoncer », alors que le libellé du code dit désormais « disponibles », précisément parce que « à annoncer » était la formulation fautive sous D49. Reporté à la tâche 7, où le mode d'emploi sera de toute façon éprouvé en conditions réelles : c'est là qu'on verra si le mot trouble vraiment.

## Les six tâches sont livrées et la branche est jugée fusionnable. Reste la tâche 7, la recette, hors de ce run.
