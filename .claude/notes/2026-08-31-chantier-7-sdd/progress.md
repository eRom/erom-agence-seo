# SDD ledger — plan: docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-soumission.md

Worktree : /Users/recarnot/dev/erom-seo-chantier-7, branche chantier-7-soumission, base 9a9a366.
Suite de depart : 506 pass, 0 fail, 38 fichiers.

## Scan pre-vol

### Paires de taches qui partagent un fichier ou une interface

| Paire | Produit -> consomme | Constat |
|---|---|---|
| T1 -> T3 | `parseSitemap`, `sitemapCandidates` (lib/sitemap.ts) | coherent, ordre respecte |
| T1 -> checklist.ts | import corrige ligne 10 | verifie dans l arbre : la ligne 10 pointe bien vers skills/audit |
| T2 -> T3 | `submitSitemap`, type `Fetcher` avec `final?` | coherent |
| T2 -> T4 | `final?: string` consomme par la sonde de redirection | dependance reelle, T2 avant T4 |
| T3 -> T4 | les cinq fonctions de soumission | coherent |
| T4 -> T5 | meme fichier console.ts, T5 amende la branche de T4 | ordre respecte |
| T4 -> T6 | render.ts contre SKILL.md | aucun fichier commun |
| T2 -> T6 | la commande gcloud de SUBMIT_HINT contre celle d ACC-07 | **conflit trouve, voir ruling 1** |
| T7 -> T8 | TAG-05 au catalogue contre TAG-05 dans KINDS | T8 apres T7, coherent |
| T3 -> checklist | actions.ts reduit a un reexport | AC-6 verifie a T3 etape 5 |

### Coherence interne de chaque tache

T1, T2, T3, T6, T7, T8, T9 : le texte s accorde avec lui-meme, tests contre code, fichiers crees contre fichiers touches.
T4 : deux appels a `d.readStrategy()` dans la meme branche (un dans le bloc `if (!site)`, un pour la cle IndexNow). Correct mais redondant, voir ruling 2.
T5 : l etape 4 renvoie a « le bloc de sortie de T4, inchange » plutot que de le repeter. Assume comme non normatif, l implementeur a le bloc sous les yeux dans le fichier qu il vient d ecrire.

### Faits perissables verifies contre l arbre le 31/08 a 17 h

| Affirmation du plan | Etat de l arbre | Accord |
|---|---|---|
| 506 tests, 38 fichiers | `bun test` : 506 pass, 0 fail, 38 fichiers | oui |
| 44 tests dans skills/checklist | `bun test skills/checklist` : 44 pass, 5 fichiers, 279 assertions | oui |
| 6 entrees ACC dans acces.md | `grep -c '^### .*(ACC-'` : 6, donc ACC-07 libre | oui |
| 35 checks au catalogue | `grep -c '^### [A-Z]+-[0-9]{2}'` : 35, donc 36 apres TAG-05 | oui |
| checklist.ts:10 importe sitemap depuis la skill audit | ligne 10 : `from "../../../skills/audit/scripts/lib/sitemap"` | oui |
| plan.ts:19-20 porte KINDS, TAG-03 en texte | verifie, TAG-05 absent de la table | oui |
| plan.ts:121 pousse `title` sur TAG-01 | verifie | oui |
| nextjs.md:215 = recette Title et description (TAG-01, TAG-02) | verifie | oui |
| plusieurs `Piege` par recette est le format normal | 31 dans le fichier, plusieurs recettes en ont 2+ | oui |
| `Bun.gzipSync` existe et produit 1f 8b | verifie par execution | oui |
| chemin encode du PUT Google | compare caractere par caractere au curl du 31/08 qui a atteint SitemapsService.Submit | oui |
| `parseChecks` accepte `URL « citation » [manuel]` | regex lue dans checks.ts, forme confirmee par consoles.md | oui |
| `check-sources.ts` saute les sources `manual` | ligne 37 : `if (s.manual) { manual++; ...; continue; }` | oui |

### Rulings avant execution

Ruling 1 : la commande `gcloud` de T9 etape 3 divergeait des deux autres (`email` au lieu de `https://www.googleapis.com/auth/userinfo.email`). Uniformisee sur la forme longue, celle de `LOGIN_HINT` deja dans le depot. Pourquoi : c est la commande qu un message d erreur donne a l utilisateur, une variante dans la doc est une variante que quelqu un collera. Cout si faux : nul, les deux formes sont acceptees par gcloud, seule la coherence est en jeu.

Ruling 2 : la branche `update` de T4 lira `seo/strategy.md` une seule fois, en tete de branche, et reutilisera le resultat pour le site et pour la cle IndexNow. Le plan en fait deux lectures. Pourquoi : un seul acces disque, et la raison d un fichier illisible se dit une fois. Cout si faux : nul, c est une simplification sans effet observable.

## Revue adversariale du plan, et rulings

26 defauts rendus (8 bloquants, 7 graves, 11 mineurs), rapport dans revue-plan.md. **Tous acceptes**, aucun ecarte. Le plan passe de 9 taches a 8 et de 1437 a 1761 lignes.

Ruling 3 : les 33 chemins du plan pointaient sur le checkout principal, pas sur le worktree. Corriges par remplacement global, sauf les 8 du dossier client de T8 qui n existe que la (gitignore). Pourquoi : dans le mauvais arbre, `bun test` sort vert a 506 tests et cache tous les autres defauts au lieu de les reveler. Cout si faux : nul, verifie par `git worktree list`.

Ruling 4 : T4 n importe pas `bingUserSites` depuis lib/soumission, seulement `bingSubmitFeed`. La duplication des deux implementations reste en place, documentee en tete de T3 et consignee en gotcha. Pourquoi : les fusionner changerait le comportement de checklist, dont les 44 tests doivent passer sans qu une assertion bouge (AC-6) ; un double import au niveau module ne leve rien sous bun et relie tout le fichier au dernier. Cout si faux : une dette de plus dans le depot, visible et nommee, contre une regression silencieuse sur trois commandes deja recettees.

Ruling 5 : T7 et T8 fusionnees en une seule tache, et le catalogue s ecrit en DERNIER. Pourquoi : trois tests existants lisent le catalogue (`plan.test.ts:130`, `recipes.test.ts:56`, `lint-report.test.ts:114`) et le scinder laissait la suite rouge entre les deux moities, avec un commit intermediaire figeant un arbre casse. Cout si faux : une tache plus grosse a relire d un coup.

Ruling 6 : `lint-report.test.ts:114` figeait « 26 verifications » en dur ; converti en `${absolute0.length}`. Pourquoi : c est un detecteur de changement au sens de la doctrine, il casse a chaque ajout legitime au catalogue et ne prouve rien de plus que la version dynamique, que le meme fichier utilise deja lignes 18, 100 et 104. La ligne 83, qui fige aussi 26 mais assere une autre erreur, n est pas touchee. Cout si faux : une assertion existante modifiee, ce que la contrainte globale interdit ; assume ici parce que c est la reparation et non un contournement.

Ruling 7 : la source Bing de TAG-05 est retiree, l incident reste dans le champ Comment. Pourquoi : `checks-format.test.ts:34` exige une citation de plus de 15 caracteres et « Titre trop long » en fait exactement 15 ; le verbatim complet du Site Scan n a pas ete capture (incertitude 4 de la spec). Cout si faux : TAG-05 n a qu une source au lieu de deux, et Romain tenait a la trace Bing. A rouvrir des que le libelle complet est capture a l ecran.

Ruling 8 : la citation « You must have owner permissions on a property to submit a sitemap » est remplacee par celle de webmaster-tools/about, verifiee en live. Pourquoi : la phrase originale continue par « using the Sitemaps report », donc elle parle de l interface web et non de l API ; la tronquer lui faisait dire le contraire de ce qu elle dit du cas vise, et `check-sources.ts` l aurait validee. Le message de refus de gsc.ts devient prudent au lieu d affirmer une regle que Google n ecrit pas. Cout si faux : un message d erreur moins categorique. Un appel reel avec un compte en role Full tranchera.

Ruling 9 : T8 etape 2 lance `console update` SANS `--dry-run`. Pourquoi : le mode simulation court-circuite l appel Google, donc il ne peut pas produire le refus de scope que AC-3 doit capturer ; l appel reel est sans risque, le jeton n ayant pas le scope d ecriture. Cout si faux : nul, Google refuse avant tout effet.

Ruling 10 : D57 est implementee par deux variables distinctes par moteur, raison d echec contre raison de non-applicabilite, et seule la premiere compte dans le code de sortie. Pourquoi : le plan faisait sortir en 0 une cle IndexNow servie mais differente, cas que D54 cree expres pour attraper un incident reel du 29/08. Cout si faux : un code de sortie plus severe que la spec ne l exige sur deux cas de bord.

Ruling 11 : les messages de simulation sont au futur et `renderUpdate` ne prefixe rien, il ecrit « mode : simulation » en tete. Pourquoi : un prefixe « partirait » colle devant un message au passe donne « partirait : sitemap soumis ». Cout si faux : cosmetique.

Ruling 12 : mineurs acceptes sans debat, chacun corrige dans le plan. Ligne 120 et non 121 dans plan.ts ; le titre du site jouet fait 76 caracteres et non 80, donc le JSDoc dit « depasse le seuil » sans chiffre ; /long doit entrer dans le sitemap du site jouet sinon collect ne le visite jamais ; AC-7 n est verifiable par aucun code et se consigne comme non verifie sur cible reelle ; le robots.txt n est lu qu une fois et ses directives passent en parametre a trouverSitemap ; la regex accepte un commentaire de fin de ligne (10 cas testes au lieu de 8) ; une strategy.md invalide est nommee comme le fait `crawl` et non avalee ; le code de sortie 2 de la spec est inatteignable, ecart declare ; le commentaire de gsc.ts dit que le code de succes n est documente nulle part.

## Execution

Plan corrige commite : e63a575. BASE de T1 : e63a5758c0fd9ac67159c116e8cd3f54bbaff703.
T1 dispatchee (sonnet) : remonter parseSitemap, decodeSitemapBody, sitemapCandidates dans plugin/lib/sitemap.ts.
T1 : implementee, commit 09ab9bb, 509 pass 0 fail (506 + 3). Relecteur dispatche (sonnet) sur review-e63a575..09ab9bb.diff.
Task 1: complete (commits e63a575..09ab9bb, review clean, 0 trouvaille). Copie verifiee identique a l octet pres, reexport et import nomme tous deux presents, aucune assertion existante touchee.
T2 dispatchee (sonnet). BASE : 09ab9bb.
T2 : implementee, commit 368a81c, 513 pass 0 fail (39 fichiers). Relecteur dispatche (opus, escalade : le diff touche auth et scopes OAuth).
T2 : revue rendue. Verdict spec conforme, qualite approuvee, mais 2 Important reproduits par mutation sur copie (513 tests restent verts dans les deux cas) :
  I-1 le test du refus de scope en lecture assere une chaine que les DEUX hints contiennent, donc une inversion passerait.
  I-2 aucun test n inspecte les en-tetes du PUT, donc la seule ecriture du plugin peut partir sans jeton.
Ruling 13 : M-1 (401 en ecriture rend LOGIN_HINT, qui retrograde l utilisateur en lecture seule) monte de Mineur a Important et entre dans la boucle. Pourquoi : c est exactement le raisonnement du brief applique a la branche qu il avait oubliee, et le cout est de deux lignes. Cout si faux : une correction hors periemetre litteral de T2.
Ruling 14 : M-2 (bing.ts:3 devenu faux) n entre pas dans la boucle, sa reecriture est deja l etape 5 de T3. Cout si faux : la phrase reste fausse une tache de plus.
Ruling 15 : M-6 (faute « reparait » dans le corps du commit 368a81c) parked. Pourquoi : la corriger demande de reecrire l historique d une branche pour une coquille de commentaire. Cout si faux : une coquille a demeure dans le journal.
T2 : fix round 1/5 dispatche (6 corrections : I-1, I-2, M-1 monte, plus 3 mineurs dont la 4e variante de la commande gcloud dans la spec).
T2 : fix round 1/5 rendu, commit d28a5e7, 514 pass 0 fail. Les 3 mutations rejouees une a une par l implementeur et declarees tuees. Re-revue scopee dispatchee (sonnet) avec consigne de rejouer les mutations elle-meme plutot que de lire les tests ajoutes.
T2 : fix round 1/5 re-revu, 6 ADDRESSED sur 6, les 3 mutations rejouees independamment sur clone isole et tuees. Aucune assertion existante affaiblie (deux toContain devenus toBe, plus stricts).
Task 2: complete (commits 09ab9bb..d28a5e7, review clean apres 1 round).
Task 2: minor (deferred): import SUBMIT_HINT fusionne avec GoogleAuth au lieu de deux lignes, sans impact.
Task 2: minor (deferred): LOGIN_HINT dit « aucun jeton Google » alors que la branche 401 couvre aussi un jeton expire. Wording pre-existant.
T3 dispatchee (sonnet). BASE : d28a5e7.
T3 : implementee, commit 1382fde, 521 pass 0 fail (40 fichiers). AC-6 verifie par l implementeur : 44/44 checklist, 279 assertions, git diff vide sur le dossier de tests. Relecteur dispatche (sonnet) avec 4 mutations imposees sur les fonctions neuves.
Task 3: minor (deferred): commentaires de provenance citant « skills/ » dans report.ts, sitemap.ts, url.ts. Faux positif du grep, dette anterieure au chantier.
T3 : revue rendue. Spec conforme, qualite approuvee, 0 Critique 0 Important. Les 4 mutations imposees sont chacune tuee par le test dedie, pas par effet de bord. Copie verifiee identique a l octet, AC-6 revverifie en direct, le second GET du robots.txt est bien evite.
Task 3: minor (deferred): trouverSitemap melange des URL de sitemap aux pages si un enfant d index est lui-meme un index (deux niveaux). Le relecteur argumente lui-meme contre : aucun echantillon observe ne porte ce motif, et le corriger serait de la defense sur un etat que rien ne demande de gerer. A rouvrir si un site sert ce motif.
Task 3: complete (commits d28a5e7..1382fde, review clean, 1 mineur defere).
T4 dispatchee (sonnet). BASE : 1382fde.
T4 : implementee, commit 61cf2e3, 530 pass 0 fail (2260 assertions). Trois reserves de l implementeur, transmises au relecteur pour qu il statue lui-meme : (a) strategie illisible plus --site explicite laisse la ligne IndexNow en « non applicable » sans nommer l echec ; (b) le mecanisme de l origine servie (sonde du robots.txt, URL finale, directives passees) n est pas couvert independamment ; (c) il a corrige un chemin de fixture du brief, 3 niveaux au lieu de 4. Relecteur dispatche (opus, tache centrale du chantier).
T4 : revue rendue. Spec conforme exactement, mais qualite NON APPROUVEE : 2 Critiques, 4 Importants, 6 Mineurs. Tous nes du brief, executes fidelement.
  C1 --dry-run annonce dans USAGE et jamais lu : le drapeau cense empecher les ecritures les declenche. Reproduit, 3 ecritures reelles.
  C2 strategie illisible plus --site explicite : la ligne IndexNow affirme faussement que le fichier declare « IndexNow : non », classe le cas en non applicable, code 0. Sortie identique a l octet a celle d un site sans strategie. Reproduit.
  I1 D53 (origine servie) : 4 mutants survivent. I2 deux des trois cas non applicables de D57 : 2 mutants survivent. I3 les trois try/catch d isolation : 3 mutants survivent. I4 update absent du filet anti-fuite.
Ruling 16 : C1 se ferme par un garde-fou d une ligne refusant --dry-run et --url, que T5 remplacera. Pourquoi : T5 est la tache suivante, mais une ecriture chez Google et Bing est irreversible et le drapeau annonce l inverse de ce qu il fait ; une ligne pour couvrir un commit intermediaire est moins cher qu un pari sur l enchainement. Cout si faux : une ligne ecrite puis retiree.
Ruling 17 : les 4 Importants entrent dans la boucle au lieu d etre deferes. Pourquoi : ce sont exactement les trous qu une recette ne voit pas, sur les deux decisions que le chantier designe comme centrales (D53, D57) ; le code marche, prouve par sonde, mais rien ne le retient. Cout si faux : quelques tests de plus dans une tache deja grosse.
T4 : fix round 1/5 dispatche (9 corrections : 2 Critiques, 4 Importants, 3 Mineurs retenus sur 6).
T4 : fix round 1/5 rendu, commit b2a38d9, 537 pass 0 fail. Les 9 mutants rejoues par l implementeur et declares tues. Reserve de sa part : les try/catch de Google et IndexNow restent non exerces par un throw reel, seul celui de Bing l est (la correction demandee ne portait que sur Bing). Re-revue scopee dispatchee (sonnet) avec cette question a trancher.
T4 : fix round 1/5 re-revu, 8 ADDRESSED sur 9, mutations rejouees independamment. I3 PARTIELLEMENT : le catch IndexNow est un mutant survivant, et le catch Google n est couvert que par accident (le faux serveur du test D53 ne repond pas a /webmasters/v3/sites, donc listProperties leve pour de vrai hors scenario voulu).
Ruling 18 : I3 rouvre pour un round 2 au lieu d etre defere. Pourquoi : la preuve est empirique et non theorique, une branche ne retient rien et l autre tient par un accident qu une amelioration legitime de la fixture ferait disparaitre en silence. La similarite textuelle des trois catch ne vaut pas equivalence de couverture, ce qui varie est ce qui les entoure. Cout si faux : deux tests et une fixture completee.
T4 : fix round 2/5 dispatche (2 tests d isolation, plus la fixture D53 completee pour qu elle teste ce qu elle pretend).
T4 : fix round 2/5 rendu, commit b334d18, 539 pass 0 fail. Deux tests d isolation ajoutes, fixture D53 completee. Re-revue scopee dispatchee (sonnet), consigne centrale : verifier que chaque mutation est tuee par SON test dedie et non par effet de bord, et que D53 ne tue plus rien par accident.
T4 : round 2 re-revu. Google et IndexNow clos proprement (chaque mutation tuee par son seul test dedie). Reste : D53 rougit encore sous le mutant Bing, sa fixture ne mocke pas GetUserSites, meme trou que celui bouche pour /webmasters/v3/sites. L implementeur ne l avait pas vu parce qu il n avait rejoue D53 que sous le mutant Google.
T4 : fix round 3/5 dispatche (une ligne dans la fixture D53, plus la consigne de verifier QUELS tests rougissent et pas seulement qu un test rougit).
T4 : round 3 re-revu. Les 3 mutations tuees, chacune par SON seul test dedie, D53 vert sous les trois et conservant ses 3 assertions d origine.
Task 4: complete (commits 1382fde..357ab37, review clean apres 3 rounds).
Task 4: minor (deferred): --site avale le drapeau suivant (console update --site --dry-run part sur un hote bidon). Motif pre-existant, identique a crawl, hors perimetre.
Task 4: minor (deferred): raisonSitemap toujours nulle sur le chemin nominal, la branche du rendu n est atteignable que par la sortie anticipee. Cable par T5.
T5 dispatchee (sonnet). BASE : 357ab37. Attention : elle doit RETIRER le garde-fou --dry-run/--url pose au round 1 de T4 et le remplacer par la vraie implementation.
T5 : implementee, commit 3abb58d, 541 pass 0 fail. Garde-fou de T4 retire et remplace. 5 mutants rejoues par l implementeur, chacun tue par son test precis. Reserve : --url repete plusieurs fois et --url combine a --dry-run ne sont exerces par aucun test. Relecteur dispatche (sonnet) avec ces deux cas a trancher lui-meme.
T5 : revue rendue. Spec conforme totale, qualite approuvee, comportement correct sur tous les axes verifies. 2 Important et 1 Mineur, tous des trous de couverture demontres par mutation :
  I-1 --dry-run combine a --url : muter `simule` en `includes("--dry-run") && !includes("--url")` laisse la suite verte, et le relecteur a execute la consequence, un vrai POST IndexNow part sans meme la ligne « simulation ».
  I-2 muter les messages simules du futur au passe laisse la suite verte.
  M-3 muter la boucle --url en indexOf fait disparaitre la seconde URL en silence.
Ruling 19 : les trois entrent dans la boucle malgre le contre-argument du relecteur (les deux drapeaux n ont aucun etat partage, la mutation est une attaque inventee plutot qu une regression plausible). Pourquoi : I-1 touche la seule propriete de securite de la commande, une ecriture irreversible chez un tiers, et le cout est d un test. Les deux autres suivent parce qu ils sont dans le meme fichier et coutent trois lignes chacun.
T5 : fix round 1/5 dispatche (3 tests).
T5 : fix round 1/5 rendu, commit e422290, 543 pass 0 fail. Code de production inchange (fichier de tests seul, +32 lignes) : c etaient bien des trous de couverture et non des bugs. Re-revue scopee dispatchee (sonnet).
T5 : fix round 1/5 re-revu, 3 ADDRESSED sur 3, chaque mutation tuee par son seul test, aucun ricochet. Code de production inchange.
Task 5: complete (commits 357ab37..e422290, review clean apres 1 round).
T6 dispatchee (sonnet). BASE : e422290.
T6 : implementee, commit 217a452. check-sources : 121 OK, 0 echec, 2 manuel preexistants. acces.test.ts 4 pass, skills/console 77 pass. Reserve de l implementeur : CL-11 de consoles.md cite toujours le fragment Owner tronque.
Observation du controleur en preparant la revue : dans CL-11 la citation est substantiellement juste, l entree decrit l interface web. Mais son Piege dit « et jamais par l API (jeton en lecture seule par construction) », phrase qui devient fausse avec ce chantier. C est la meme famille que bing.ts:3, ACC-03, console.ts:1 et SKILL.md. Passe au relecteur comme point a trancher, sans pre-juger.
T6 : revue rendue. Spec conforme, execution approuvee, mais 1 Critique (confiance moderee, le relecteur defend lui-meme la lecture inverse), 2 Important, 1 Mineur.
Ruling 20 : la trouvaille Critique (--url non rattache explicitement au triptyque dry-run / OK / envoi) est corrigee malgre le contre-argument. Pourquoi : le contre-argument se tient, la phrase sur « ca a marche la derniere fois » ne vaut que pour un usage repete donc couvre deja --url ; mais une ligne explicite contre une ambiguite sur une ecriture irreversible chez un client n est pas de la sur-documentation. Cout si faux : une phrase de plus.
Ruling 21 : le flou entre console update et checklist --agir est comble dans la doc. Pourquoi : mon brief a fait supprimer le renvoi vers checklist sans le remplacer, alors que les deux ecrivent toujours ; D50 dit deux appelants et deux seulement, la doc doit le dire aussi. Cout si faux : deux phrases.
Ruling 22 : dans CL-11, la citation reste et la clause « jamais par l API » est corrigee. Pourquoi : le relecteur a tranche les deux questions separement et confirme que la troncature n induit pas en erreur la ou l entree decrit l interface web ; c est la clause voisine qui est devenue fausse, meme famille que gsc.ts, bing.ts, console.ts, SKILL.md et ACC-03. Cout si faux : une entree de reference d une autre skill touchee par ce chantier.
T6 : fix round 1/5 dispatche (4 corrections).
T6 : fix round 1/5 rendu, commit 73909f0. 4 corrections. skills/console 77/77, skills/checklist 44/44, check-sources 121 OK 0 echec 2 manuel, chiffres identiques a la premiere passe (seule une ligne Piege a change, aucune Source). Re-revue scopee dispatchee (sonnet), consigne : juger sur l effet a la lecture et non sur la presence des mots.
T6 : fix round 1/5 re-revu, 4 ADDRESSED sur 4, juges sur l effet a la lecture. Aucune ligne Source n a bouge, 121 pass sur console plus checklist.
Task 6: complete (commits e422290..73909f0, review clean apres 1 round).
Task 6: minor (deferred): SKILL.md section 4 garde « Pas d ecriture, pas de rapport ». Le relecteur juge que la phrase vise les artefacts locaux (pas de raw/, pas de rapport date) et non les ecritures API de la section 5. A relire au moment de la revue finale.
T7 dispatchee (sonnet). BASE : 73909f0. Tache fusionnee, 13 etapes, l ordre est le coeur : le catalogue s ecrit EN DERNIER.
T7 : implementee, commit 5d7f798, 545 pass 0 fail, check-sources 122 OK 0 echec 2 manuel. Titre du site jouet mesure a 68 caracteres (seuil 65). Reserve de l implementeur : il a trouve un QUATRIEME test a compte fige, non nomme par le brief ni par la revue du plan, et l a converti en invariant comme le troisieme. Relecteur dispatche (sonnet) avec ce point comme coeur de sa revue : juger si la conversion est legitime ou si c est une assertion affaiblie pour faire passer le reste.
T7 : revue rendue. Spec conforme, qualite approuvee, 0 Critique 0 Important, 2 Mineurs cosmetiques. La conversion du 4e compte fige est jugee legitime, preuve par mutation : le relecteur a casse la production de deux facons et montre que le rejet d un compte faux repose sur un test tiers jamais touche, et que le test converti garde son objet reel (l exigence des checks strategiques).
Task 7: complete (commits 73909f0..5d7f798, review clean, 0 round de correction).
Task 7: minor (deferred): message de commit sans portee (feat: au lieu de feat(scope):), dicte verbatim par le brief.
Task 7: minor (deferred): risque partage pre-existant dans lint-report.test.ts, les valeurs attendues sont calculees par parseChecks, la meme fonction que la production ; un bug dans parseChecks passerait inapercu de toute cette famille de tests. Anterieur au chantier, decision de conception pour tout le fichier.
Ruling 23 : la revue finale de branche se joue MAINTENANT, avant T8, alors que le plan la place apres. Pourquoi : les sept taches de code sont closes, T8 est une recette qui envoie des requetes reelles chez Google, Bing et IndexNow et qui reclame la presence de Romain ; faire relire la branche entiere avant de toucher aux vrais moteurs coute une revue et evite de decouvrir un defaut apres une ecriture irreversible. Cout si faux : la revue finale ne verra pas les corrections que la recette pourrait provoquer, et il faudra la rejouer.
## Revue finale de branche (fable, 14 commits, 9a9a366..5d7f798)

Verdict : GO pour la recette T8, rien ne bloque la fusion. AC-6 et AC-8 reprouves par le relecteur. Les trois API verifiees a jour au 31/08 : l avis de retrait Microsoft du jour ne vise que SOAP et POX, le protocole JSON utilise par le depot est la cible de migration et n est pas concerne.

1 Important, 6 Mineurs. I-1 est ce qu aucune revue de tache ne pouvait voir : les fonctions sont pinnees a l unite et les appels sont comptes au CLI, mais le CABLAGE entre les deux n est tenu par rien. Trois mutations survivantes, suite verte a 545 dans les trois cas :
  a permuter les arguments des deux soumissions de sitemap ;
  b remplacer l origine servie par l origine demandee sur le chemin IndexNow (exactement la situation du site de recette, apex declare et www servi) ;
  c rebrancher bingUserSites sur l autre implementation, le risque que le Ruling 4 avait predit en prose et qui est maintenant mesure.

Ruling 24 : une seule vague de correction, comme le skill l impose, portant I-1 plus 5 des 6 mineurs. Pourquoi : le relecteur argumente lui-meme que tous les modes d echec de ces jonctions sont bruyants et recuperables, donc c est du durcissement et non de la reduction de risque ; mais deux tests coutent moins qu un mardi perdu a deboguer, et la branche va servir de socle au chantier suivant. Cout si faux : trois tests et six libelles.
Ruling 25 : m-6 (urlsOnOrigin reecrit sur l origine servie meme une URL d un domaine etranger) n entre pas dans la vague. Pourquoi : comportement anterieur au chantier, verifie identique a l octet pres a la version d avant demenagement, partage avec la skill checklist dont les 44 tests ne doivent pas bouger (AC-6). Cout si faux : un sitemap portant une URL etrangere ferait poster une URL fabriquee a IndexNow ; aucun site du portefeuille n en porte.
Vague de correction finale dispatchee (sonnet).
Vague finale : rendue, commits e9587bc et 67945ce, 547 pass 0 fail (545 plus 2), check-sources inchange a 122. Les 3 mutations rejouees par l implementeur, chacune tuee par son test dedie. Reserve soumise a arbitrage : la ligne IndexNow est formatee « code message (n URL) » et non mot pour mot comme l exemple de la spec. Re-revue scopee dispatchee (sonnet), la derniere avant la recette.
Vague finale re-revue : 10 ADDRESSED sur 10. Les 3 mutations tuees chacune par son seul test dedie, aucun ricochet. Le relecteur a verifie que l injection de strategie dans le test D53 est necessaire et non cosmetique. Verdict : la branche est prete pour une recette contre de vrais moteurs.
Ruling 26 : le format de la ligne IndexNow (« code message (n URL) » au lieu du mot pour mot de la spec) est accepte. Pourquoi : les deux informations utiles, code et volume, y sont dans l ordre annonce par la spec, et coller au mot pres exigerait de toucher la table des messages dans lib/soumission.ts, hors perimetre, plus d y gerer l accord singulier pluriel. Cout si faux : une ligne de sortie legerement redondante, a lisser plus tard.
Etat : 7 taches de code closes, revue finale passee, vague de correction close. Reste T8, la recette, non delegable : elle reclame le gcloud login de Romain et son OK avant chaque envoi reel.
