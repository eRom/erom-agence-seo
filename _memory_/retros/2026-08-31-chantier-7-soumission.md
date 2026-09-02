# Rétrospective du chantier 7 : la soumission aux moteurs (31/08)

Rétro déroulée le 31/08 au soir, session ff47c87b. Périmètre : l'arc complet du chantier 7, du prompt de lancement (16:13:55) à la clôture (20:49), heure de Paris. Sources : digests des 4 sessions de la fenêtre + 26 transcripts de subagents + rapports source des 4 lecteurs (lots, git, réceptacles) + volet Linear fait par l'orchestrateur. Rapports sources dans le scratchpad de la session de rétro, non versionnés.

Les deux questions de Romain, en tête de rapport parce qu'elles ont piloté la rétro :

1. **Pourquoi « 6h27 » pour un prompt simple ?** Le chiffre est faux : la session a duré **4h35** (16:14 → 20:49). Le « 14h13 » de départ est un timestamp UTC (14:13Z) lu comme heure locale, puis recopié tel quel dans la mémoire de session et dans le message de 20:44. Le prompt de départ n'était pas le chantier : il posait une question IndexNow ; le chantier complet (spec, plan, revue adversariale, 7 tâches de code, revue de branche) est ce que la session en a construit.
2. **Pourquoi plus de 560K de contexte principal en SDD ?** Les subagents n'ont rien mis dans le contexte principal : 24 rapports d'Agent totalisent 26 Ko (1 Ko max chacun), 240 tool_results totalisent 276 Ko (24 Ko max). Le contexte s'est rempli de la **propre sortie de l'orchestrateur** : 658K tokens générés sur 476 tours en effort xhigh, dont la moitié pendant les 56 minutes de conception seule, rejoués dans la fenêtre à chaque tour. Pic mesuré : 595K tokens. L'isolation SDD a tenu côté entrées ; c'est le prix du xhigh maintenu sur 4h35 de conduite.

## 1. Fiche du chantier

| Mesure | Valeur |
|---|---|
| Fenêtre réelle | 31/08 16:13:55 → 20:49 (Paris), soit **4h35** |
| Sessions | c89f327a (46 s, lancement avorté puis relancé), 1c6d49e9 (4h35, principale), 26 subagents |
| Interactions humaines | 8 messages : /effort, lancement IndexNow, seuil de 60, ping IndexNow, « go spec », « go plan », « 1 » (17:08), message final 20:44. Après 17:08 : plus rien jusqu'à 20:44 |
| Phases | conception 56 min (dont ~18 min d'attente Romain), revue du plan + intégration 31 min, exécution SDD 2h56, clôture 12 min |
| Dispatches | **24** Agent (26 spawns avec les 2 imbriqués : vérifs web de currency), 6 injections de fix par SendMessage, 0 agent muet, 0 coupure quota, 0 compact |
| Erreurs d'outils | 3 côté orchestrateur (cwd/chemins relatifs, toutes en conception), 34 côté subagents (17 refus `rm`, 8 exit 1 bénins, 9 vraies erreurs, ~4 min au total) |
| Tokens | orchestrateur : 658K générés (329K conception, 293K exécution, 36K clôture), contexte final 595K ; subagents : ~90K enregistrés (champ non fiable, texte visible cumulé 216 Ko) |
| Commits | 2 sur main (spec 16:47, plan 16:58) + **16 sur la branche** `chantier-7-soumission` (17:40 → 20:30) : 1 correction de plan, 7 implémentations, 6 fixes de revue, 2 vague finale. 0 merge, 0 revert |
| Tests | 506 → **547 verts** (+41), suite verte constatée à chaque commit, rejouée ce jour : 547 pass / 0 fail, 5,14 s |
| Modèles | orchestrateur opus xhigh ; implémenteurs sonnet ; relecteurs sonnet sauf T2 et T4 escaladés opus ; revue finale fable |
| Livrable | `console update` (PUT Google sitemap, SubmitFeed Bing, POST IndexNow), code fini et relu, verdict « GO pour la recette », recette T8 en attente de Romain |
| Linear | projet `erom-agence-seo` : **0 issue, à aucun statut, jamais**. Pilotage 100 % dans le repo (spec, plan, registre SDD, note de reprise) |

## 2. Résumé exécutif

Le chantier a livré ce qu'il devait, prouvé par 16 commits et 547 tests verts rejoués, et le protocole SDD a tenu toutes ses promesses de qualité : revue adversariale du plan rentable au-delà de tout (26 défauts dont le bloquant B1 qui aurait fait tourner tout le chantier sur le mauvais arbre), relecture par mutation exécutée littéralement, revue finale fable qui a trouvé 3 mutants survivants sur les jonctions d'écriture. La friction n'est pas dans la méthode, elle est dans la mesure : la clôture a gravé **5 chiffres faux** dans les réceptacles durables (durée gonflée de +43 %, découpage conception/exécution faux ×3, dispatches, coût du gaspillage, attribution des méthodes), recopiés depuis la perception de fin de journée sans une seule lecture du transcript. Les gaspillages réels sont mesurables et modestes : ~30 min sur 4h35 (~11 %). Le contexte principal à 595K n'est pas une fuite de subagents (preuve mécanique) mais le prix de l'effort xhigh maintenu sur 4h35 de conduite. Deux risques structurels attendent la recette : le registre SDD (26 rulings) mourra avec le worktree s'il n'est pas copié, et 76 insertions de mémoire plus la note de reprise ne vivent que dans l'arbre de travail non commité du checkout partagé.

## 3. Ce qui a marché, à répliquer

- **La revue adversariale du plan, rendue avant toute ligne de code.** 26 défauts (8 bloquants, 7 graves, 11 mineurs), 5 reproduits par exécution, tous acceptés ; intégrés en un seul commit (e63a575, +601/-277, 17:40) deux minutes avant le premier commit de code ; le plan passe de 9 à 8 tâches et de 1437 à 1761 lignes. Le seul B1 (« les 32 `cd` du plan pointent sur main et non sur le worktree, où `bun test` sort vert à 506 et masque tout le reste ») justifiait à lui seul le geste : 31 minutes pour éviter un chantier entier validé sur le mauvais arbre. Le rendement chiffré manquait au playbook, il est là.
- **La relecture par mutation, exécutée littéralement.** Clones en scratchpad, mutants un à un, restauration vérifiée par diff, chaque mutation tuée par son propre test : 6 défauts invisibles à la lecture, fermement prouvés (2 sur T2 dont un PUT sans headers, 1 sur T5 : `--dry-run --url` déclenche un vrai POST IndexNow avec 43 tests verts, 3 sur les jonctions d'écriture en revue finale à 545 verts).
- **La trouvaille emblématique, `--dry-run` qui écrivait quand même, est venue par reproduction d'exécution** (Relire T4, opus : « 3 ecritures reelles » sous le drapeau qui promet de ne rien écrire), avant toute mutation. Deux méthodes, même propriété visée : les écritures irréversibles chez des tiers.
- **La revue finale de branche (fable) et son vérificateur web imbriqué.** Brief : « ce qu'aucune revue de tâche ne pouvait voir ». Livré : 3 mutations survivantes sur les jonctions, dont le risque `bingUserSites` prédit en prose au Ruling 4 et mesuré ici ; et le bandeau de retrait SOAP/POX Bing daté du jour même vérifié à la source (« il ne concerne QUE SOAP et POX, pas le protocole JSON utilisé par le code »). Vague finale : les 3 jonctions pinnées, 545 → 547 tests.
- **Le routage de modèles au cordeau.** Sonnet partout, escalades opus ciblées sur les deux revues à plus fort enjeu (T2 : auth/scopes OAuth ; T4 : câblage CLI de toutes les écritures), fable réservée au gate pré-fusion. Les 3 revues hors sonnet sont les 3 plus rentables de la session. Étalonnage consigné dans le registre.
- **L'implémenteur maintenu vivant.** 6 injections de fix par SendMessage, 12 à 34 s après la fin du relecteur, avec repro, correctif proposé et contre-vérification exigée ; fixes chirurgicaux en retour. Signe de santé : l'implémenteur T4 a signalé lui-même que sa consigne ne couvrait qu'un des trois try/catch.
- **Le registre `progress.md`** : 26 rulings datés avec leur coût-si-faux, ~24 appends au fil de l'eau, réutilisé tel quel par le résumé final et la note de reprise. C'est lui qui a rendu la clôture propre en 12 minutes, et lui qui a permis à cette rétro de tout recouper.
- **La discipline subagents à l'échelle** : 26 agents, 0 muet (le gotcha du 28/08 n'a pas rechuté), bornes tenues de fait (aucun implémenteur au-delà de 10,8 min par passe), suite verte comptée à chaque rendu, ratchet 506 → 547 traçable de rapport en rapport.
- **La sécurité des secrets** : clé IndexNow présente dans le prompt de lancement, jamais recopiée dans le code (grep du worktree : 0), valeurs de test non-hex volontaires, revue finale vérifiant « zéro masque transcrit ». Un seul Bash du transcript l'a manipulée, pour vérifier qu'elle est servie en prod.
- **Les re-revues scopées ne sont pas du décor** : 2 trouvailles réelles sur 7 (le catch IndexNow mutant survivant, le trou de fixture D53/GetUserSites). Rendement à citer avant de les supprimer.

## 4. Ce qui a coûté, frictions chiffrées

- **Le finding majeur : cinq chiffres faux gravés en clôture, dans un réceptacle durable.** La mémoire `sdd-cout-reel-chantier.md` et la réponse de 20:45 portent : « 6h27 » (réel : 4h35, +43 %), « environ 3h15 de conception / 3h15 d'exécution » (réel : 56 min / 3h39), « 29 dispatches » (réel : 24 ; le compte venait d'un grep du mot « dispatchée » dans le registre), « environ une heure » de gaspillage (réel : ~30 min), et « 5 défauts par mutation, dont --dry-run » (réel : 6 par mutation, le `--dry-run` par reproduction, 1 trouvaille de la liste par simple lecture de la revue de plan). Paradoxe : une session qui a tout compté pendant 4h35 (547 tests, mutants tués, rulings datés) a clos sur des perceptions recopiées depuis le message de Romain de 20:44, lui-même né d'un mélange UTC/local. Ces chiffres calibreront les annonces de durée des prochaines sessions s'ils ne sont pas corrigés.
- **La boucle T4 : 53 minutes, 30 % du temps d'exécution pour 1 tâche sur 7.** Décomposition : 23,7 min de travail actif, 26,4 min d'attente entre rounds. La consigne de fix du round 1 ne couvrait qu'un des trois try/catch signalés (le contrôleur l'a demandée ainsi, l'implémenteur l'a dit) ; rounds 2 et 3 pour la même famille, dont un round entier pour une ligne de fixture. Surcoût horloge : ~13-15 min. Racine mesurée : D53 n'était rejoué que sous le mutant Google, jamais sous Bing.
- **Cinq re-revues scopées stériles sur sept, ~15 min cumulées.** Le verdict n'est pas « supprimer la re-revue scopée » (elle a trouvé du réel 2 fois sur 7, et prouve la clôture à bas prix quand elle ne trouve rien) : c'est « auto-vérifier le round d'une ligne, réserver la re-revue aux rounds qui touchent du comportement », déjà écrit en mémoire.
- **L'orchestrateur xhigh pendant la logistique pure.** Pendant les 2h56 d'exécution : ~44 Bash, quasi 100 % de packaging de revues et d'appends au registre, zéro test lancé, zéro fichier de code lu, mais 293K tokens générés pour les trier et les consigner. S'y ajoutent 14 min d'idle en attente du rapport de revue de plan, et une exécution strictement séquentielle alors que T5/T6/T7 étaient partiellement parallélisables (dépendances réelles pourtant : T4 → T5 sur le même fichier ; jamais tenté).
- **17 refus instantanés de `rm` (0,3 s chacun), la moitié des erreurs d'outils du lot subagents.** Motif récurrent des relecteurs : `rm -rf clone; trash clone`, rm d'abord, trash en secours, l'inverse exact de la règle maison. Chaque agent a redécouvert le bon geste seul (~4 % des 891 Bash du lot). 9 autres erreurs d'exécution vraies mais récupérées en moins d'une minute (la plus chère : un `cat >` sans stdin, timeout 2 min).
- **Le piège du double-arbre, 3 erreurs en conception, ×5 sur deux sessions consécutives.** `cd plugin` échoue alors que `plugin/` existe et que les chemins relatifs marchaient la minute d'avant (cause exacte non tranchable : le cwd n'est pas journalisé ; soupçon rtk/harness). Bascule aux chemins absolus dès la 3e commande, puis plus aucune erreur sur ~150 commandes. Même famille dans 7e3f7b52 à 15:29. La règle CLAUDE.md globale ne couvre que les commandes qui écrivent ; ici des lectures ont cassé.
- **Le journal SDD du chantier n'a pas été copié vers `docs/superpowers/journaux/`.** La pratique existe (chantiers 5 et 6), le gotcha existe (`gotchas.md:69`), et l'oubli est là : `progress.md` (26 rulings), `revue-plan.md` (38 Ko) et 15 diffs de revue ne vivent que dans le worktree et suivront `git worktree remove` à la corbeille. Cinq chantiers sur sept ont déjà perdu leur ledger ainsi (2 survivants mesurés au 31/08).
- **76 insertions de `_memory_/` + la note de reprise laissées non commitées dans le checkout partagé**, horodatées 20:45, une nuit entière avant une recette qui dépend d'elles. Le repo porte lui-même le gotcha (« jamais git switch dans le checkout partagé ») : ce contenu n'existe que dans l'arbre de travail.
- **Traçabilité et cohérences en attente de fusion** : 6 commits sur 16 sans trailer `Claude-Session` (37 %, tous committés par des subagents) ; main garde le plan pré-revue avec le bloquant B1 et l'intitulé « 9 tâches » jusqu'à la fusion ; `gotchas.md:55` (« l'agence ne le fera jamais par API », « Owner (pas Full) ») est contredit point par point par le chantier et par le Ruling 8 ; commentaire périmé dans `console-cli.test.ts:10` du worktree (revendique une clé hex32 que grep prouve absente) ; la note de reprise (20:40) demande une mise à jour mémoire que la session a déjà écrite à 20:45.
- **Volet Linear** : aucune issue jamais dans le projet Linear `erom-agence-seo`, ni avant, ni pendant, ni après. La trace vit intégralement dans le repo, ce qui est bon pour l'agent qui y vit et fermé pour quiconque regarde Linear ou Slack. L'information critique du jour (« la recette ne peut pas se faire sans Romain ») vit dans une note non versionnée, pas dans le canal dédié. Slack non exploré (hors périmètre de la rétro).

## 5. Leçons proposées

Chaque leçon est pré-formée pour sa destination. Sont exclues d'office celles déjà gravées (les 9 gotchas, 6 patterns et 2 sections d'état écrits par la session à 20:45, les 4 leçons de `sdd-cout-reel-chantier.md`, les lignes 23/45/131 du playbook : revue qui exécute le plan, frontière nommée dans le brief de revue, casting par niveau de tâche).

**Pour le playbook (`~/.claude/erom-playbook.md`, format « **leçon.** justification (source) ») :**

1. **Aucune durée ne se grave en mémoire sans avoir été mesurée dans le transcript.** (Chantier 7 : 6h27 perçus recopiés depuis le message de Romain, réel 4h35, faux de +43 %, propagé en 3 réceptacles ; le timestamp de départ UTC lu comme heure locale. Une ligne « démarré à HH:MM locale » en tête de registre SDD élimine la classe entière.)
2. **Un résumé de fin de session étiquette chaque trouvaille par sa méthode réelle : mutation, reproduction ou lecture.** (Chantier 7 : « 5 défauts par mutation, dont --dry-run » ; réel : 6 par mutation, le `--dry-run` emblème par reproduction, 1 par lecture de revue de plan. La session suivante copie la méthode étiquetée, pas celle qui a eu lieu.)
3. **Le relecteur rejoue une mutation sous tous les contextes voisins, pas seulement le sien.** (Chantier 7, T4 : le trou D53/GetUserSites n'existait que parce que D53 n'était rejoué que sous le mutant Google ; deux rounds de correction pour une fixture.)
4. **Les bornes d'attente (10 min reviewer, 20 min implémenteur) s'écrivent dans le brief, pas dans la mémoire du contrôleur.** (Chantier 7 : tenues de fait sur 26 agents, zéro muet, mais zéro borne écrite dans zéro brief ; un seul agent bavard suffirait à rechuter le 28/08.)
5. **Le nettoyage de clones d'une relecture par mutation passe par `trash` seul.** (Chantier 7 : 17 refus instantanés de `rm -rf X; trash X`, un par agent, l'inverse de la règle maison redécouverte 17 fois.)
6. **Le champ `usage.output_tokens` des transcripts de subagents est non fiable pour les comparaisons de coût** (agents entiers sous-comptés : 1 528 tokens enregistrés pour 21 757 caractères de rapport) ; toute métrique rétro recoupe tokens et caractères de texte visible.

**Pour les gotchas du projet (`_memory_/gotchas.md`, paragraphe autonome à titre gras, preuve inline) :**

7. **Un plan destiné à un worktree se vérifie contre l'arbre cible avant le scan pre-vol.** (Chantier 7, R3 : 33 chemins pointaient sur le checkout principal, où `bun test` rend 506 verts et valide le plan en masquant tout ; rattrapé avant exécution, leçon écrite nulle part.)
8. **`urlsOnOrigin` réécrit sur l'origine servie même une URL de domaine étranger : dette refusée (R25) et non gardée.** La seule protection est un fait périssable (« aucun site du portefeuille n'en porte », 31/08) que ni un test ni une entrée ne détiennent. À écrire avec sa commande de re-vérification (grep des `<loc>` hors domaine dans les sitemaps du portefeuille).
9. **Dans ce repo à double racine, les chemins relatifs vers `plugin/` cassent sans préavis, même en lecture.** (×5 sur deux sessions consécutives, 3 erreurs dans la seule conception du chantier 7 ; `cd <absolu> &&` en tête de toute commande, lectures comprises.)

**Corrections de réceptacles existants (mises à jour, pas nouvelles notes) :**

10. `sdd-cout-reel-chantier.md` (corps + frontmatter + ligne `MEMORY.md:7`) : 4h35, 56 min / 3h39, 24 dispatches, ~30 min de gaspillage (~11 %), méthodes réelles des défauts.
11. `read-tool-caviarde-hex32.md` : occurrence 4 (31/08) et falsification partielle : le masque s'est déclenché sur le nom `BING_WMT_API_KEY` avec une valeur de 30 caractères non hexa ; le remède « écrire en non-hex » ne suffit pas, il faut un nom de champ neutre.
12. `erom-seo-etat-chantiers.md` : « rien d'ouvert » est périmé, le chantier 7 attend sa recette (branche 16 commits, 547 tests).
13. `gotchas.md:55` : « jamais par API » et « Owner (pas Full) » sont contredits par le chantier (R8 : la citation d'origine était tronquée) ; correction à la recette ou à la fusion.

## 6. Outillage manquant

- **Un garde-fou de fin de session** (hook ou rituel) qui relit le transcript pour dater début/fin et compter les dispatches avant toute écriture mémoire. Justification : 5 chiffres faux gravés en durable sur ce seul chantier, pour un artefact qui pilera les décisions de protocole.
- **Une étape d'archivage du registre SDD** (copie vers `docs/superpowers/journaux/` avant tout `git worktree remove`). Justification : 5 chantiers sur 7 déjà perdus, celui du chantier 7 (26 rulings, 38 Ko de revue de plan) est condamné tant que la copie n'est pas faite.
- **Un hook de trailer `Claude-Session` qui couvre les commits des subagents implémenteurs.** Justification : 6 commits sur 16 (37 %) sans trailer, tous dans les tâches dispatchées ; la traçabilité session → commit des futures rétros en dépend.
- **Un indice dans le refus du guard** (« rm bloqué : utilise trash »). Justification : 17 agents ont payé le même coût de découverte, un par agent.
- **Un bootstrap de scratchpad de mutation** (clone + baseline + convention `.orig` en une commande). Justification : ~13 relectures qui ont réinventé la séquence, ~40 appels de setup dont une douzaine perdus en refus et retries.
- Rien à demander aux scripts du skill SDD eux-mêmes (`task-brief`, `review-package` : ~19 appels sans friction).

## 7. Caveats méthodologiques

- Les durées par subagent dérivent des gaps entre dispatches et événements du registre (±1 min) : le transcript ne journalise pas de retour d'agent horodaté exploitable par jointure.
- `usage.output_tokens` des subagents est fragmentaire : la comparaison 90K / 658K est un ordre de grandeur, pas une mesure.
- Le digest consolidé des subagents n'a couvert qu'1 agent sur 26 (stockage nouveau en sous-dossier) : la cartographie a été reconstruite du brut par le lecteur.
- Le compte « 11 mineurs » de la revue de plan vient du registre, non recompté ligne à ligne ; le total 8 + 7 + 11 = 26 est cohérent avec l'artefact.
- L'ancre initiale de l'orchestrateur de rétro (« aucune interaction humaine après 17:08 ») était fausse : le message de Romain de 20:44 a été raté par une extraction tronquée ; corrigé par le lecteur de sessions. Signalé pour la transparence, puisque la même classe d'erreur (mesure incomplète recopiée) est le finding majeur du chantier.
- La cause exacte du `cd plugin` échoué n'est pas tranchable depuis le transcript (cwd non journalisé) ; soupçon rtk/harness à vérifier par qui a accès au mécanisme.
- Le volet Linear est un constat de vide (0 issue), pas une enquête Slack.
- Deux avertissements de digest : 70 % de base64 dans 7e3f7b52 (captures de la recette chantier 6, hors périmètre) et 7 lignes de type inconnu dans c89f327a : le format des transcripts évolue, `digest.ts` est à surveiller.
- La clé IndexNow (publique par design) est visible en clair dans les deux prompts de lancement (c89f327a et 1c6d49e9) ; jamais recopiée ailleurs, signalée pour mémoire.

## 8. Écritures appliquées

En attente de validation. Propositions soumises à Romain : les 13 items de la section 5 (6 playbook, 3 gotchas projet, 4 corrections de réceptacles), la copie du journal SDD vers `docs/superpowers/journaux/`, et le commit des 76 insertions `_memory_/` + note de reprise sur main. Rien n'a été écrit en dehors du présent rapport.