---
title: "Chantier 5 étape 2, l'audit niveau 1 : bilan et décisions prises"
date: 2026-08-30
status: implemented
project: erom-agence-seo
branche: chantier-5-niveau-1
spec: docs/superpowers/specs/2026-08-30-erom-seo-niveau-1-design.md
plan: docs/superpowers/plans/2026-08-30-erom-seo-chantier-5-niveau-1.md
recette: docs/superpowers/plans/2026-08-30-erom-seo-chantier-5-niveau-1-recette.md
---

# Chantier 5 étape 2 : bilan

## Ce qui est livré

`/erom-seo:audit <url> --level 1` interroge Search Console et Bing Webmaster Tools pendant un audit et en tire quatre vérifications, qui rejoignent le rapport à côté des 27 du niveau 0.

| Id | Ce qu'elle dit au client | Sévérité |
|---|---|---|
| IDX-06 | combien de ses pages Google a réellement indexées | Critique |
| IDX-07 | Google a retenu une autre adresse canonique que celle déclarée | Important |
| STRAT-05 | sur quels mots il ressort vraiment, contre ceux qu'il visait | Important |
| AI-03 | lesquelles de ses pages Bing connaît, donc Copilot | Mineur |

Le code d'accès à Google et à Bing a quitté la skill `console` pour le dossier commun : il n'existe plus qu'en un exemplaire, partagé par les cinq verbes.

## Les chiffres

| | Départ | Arrivée |
|---|---|---|
| Tests | 375 | **434**, 0 échec |
| Citations officielles vérifiées | 115 | **119**, 0 en échec |
| Entrées de catalogue | 31 | **35** |
| Modules dans le commun | 2 | **7** |

Branche : 29 commits, 46 fichiers, +2400 environ, -300 environ. Recette sur les comptes réels : **10 critères OK, 0 KO, 1 partiellement joué**.

## Ce que le chantier a appris, mesuré sur du réel

- **Google ment sur les pages indexées.** Le champ `indexed` de `sitemaps.list` vaut `"0"` sur des pages qui sont indexées et reçoivent des impressions. Vu deux fois le matin, puis reproduit par la recette dans un même audit : `"0"` d'un côté, `1` de l'autre, sur la même page. Le compte du niveau 1 ne s'en sert jamais.
- **La visibilité IA n'est dans aucune API.** `type: GENERATIVE_AI` rend `HTTP 400`. Le rapport Generative AI n'est ouvert qu'à une partie des propriétés, et pas à celles de Romain. Les deux vérifications correspondantes sont hors périmètre, avec le format des exports relevé pour la reprise.
- **Les données de Google ont trois jours de retard**, mesuré. Le rapport le dit, sans quoi un lecteur croit à un trou dans son site.
- **Une propriété Search Console survit au site.** `healthincloud.app` ne répond plus (HTTP 000) et sa propriété répond toujours. Utile pour une agence : les données de console restent lisibles après une mise hors ligne.

## Les décisions prises sans toi

Vingt-deux, dans l'ordre. Chacune est détaillée dans le registre d'exécution avec ce qu'elle coûte si elle est fausse. Les six qui changent quelque chose pour toi sont marquées d'une étoile.

**Sur le plan, avant d'écrire une ligne de code**

1. Les primitives d'URL déplacées sont cinq et non trois : deux aides privées les accompagnent, sans quoi rien ne compile.
2. Le faux serveur d'un test ordonne ses conditions pour ne pas servir la réponse d'un appel à un autre.
3. Le critère du catalogue devient « zéro citation en échec plus quatre de plus qu'avant », jamais un nombre figé.

**Après la revue adversariale du plan**

4. ★ **Les trois vérifications sont renommées** `IDX-06`, `IDX-07`, `STRAT-05` au lieu de `LVL1-03` à `LVL1-05`. Le lecteur de catalogue rejette un chiffre dans le préfixe, en silence : trois vérifications sur quatre n'auraient pas existé et la voisine aurait été corrompue, avec une suite verte. Renommer ne touche aucun code ; l'alternative demandait de modifier sept expressions dans quatre fichiers dont deux chantiers déjà recettés.
5. Une couture de test est ajoutée pour rendre observable la garantie « aucune requête ne part sans le drapeau ».
6. La règle de reconnaissance Bing remonte auprès de son seul appelant.
7. La fonction qui produit le fichier lu par le rapport est écrite et testée au lieu d'être décrite en une phrase.
8. Toute la branche du niveau 1 passe sous protection : une panne ne peut plus tuer l'audit.
9. Un refus de lire les sitemaps reçoit son propre emplacement, pour ne jamais être confondu avec « aucun sitemap ».
10. ★ **Sur l'appariement des pages, la revue avait raison sur le fond et tort sur le remède.** Sa proposition confondait deux sous-domaines d'un même site, ce que j'ai mesuré. J'ai pris une autre règle. Elle s'est révélée fausse aussi (voir la décision 22), et la revue finale l'a rattrapée.
11. Les deux blocs de résultat ne sont plus optionnels : une panne se dit par un champ, jamais par une absence.
12. Les totaux de tests absolus sortent du plan.

**Pendant l'exécution**

13. La spec est corrigée : elle annonçait trois copies d'une table, il y en avait deux.
14. Deux lignes déplacées pour qu'aucune exception ne puisse sortir du module, malgré un classement en mineur.
15. Un point de sécurité n'est **pas** corrigé : vérifié que le moteur ne place jamais la clé dans ses messages d'erreur.
16. Un trou de couverture entre en correction malgré la règle, parce qu'il coûte trois lignes.
17. Un tour de correction est clos sur ma seule vérification, sans relecteur, parce que le remède tenait en un test.
18. ★ **Le critère AC-7 est révisé** parce que tu as mis `healthincloud.app` hors ligne : il exigeait un audit complet sur un domaine qui ne répond plus. Le refus de droits s'observe désormais autrement, et la garantie « l'audit ne meurt jamais » passe sur chico.
19. ★ **La protection contre les fuites est étendue aux fichiers de collecte brute**, qui n'avaient qu'un test là où les autres avaient un test et une garde.
20. Un défaut de produit est corrigé dans une tâche déjà close, parce qu'il faisait mentir le rapport.
21. Un comportement signalé par la recette n'est pas un défaut : ta stratégie prime délibérément sur le plafond de pages, pour qu'aucune page prévue ne soit oubliée.
22. ★ **Une dernière ligne corrigée après la clôture de la vague finale** : un en-tête annonçait cinq vérifications au lieu de six, ce qui faisait disparaître STRAT-05 du rapport de tout client sans stratégie écrite.

## Ce que la revue finale a évité

Trois défauts que ni les revues tâche par tâche ni la recette ne pouvaient voir, parce que ce sont des désaccords entre pièces, chacune correcte isolément.

1. **STRAT-05 ne pouvait jamais trouver d'impression.** Le format de stratégie impose un chemin nu (`/methode`), Google rend une adresse complète : ils ne s'appariaient jamais. Sur le premier client ayant une stratégie et une propriété, le rapport aurait annoncé « aucune de vos pages ne reçoit d'impression en 90 jours », daté et faux. Les tests ne l'ont pas vu parce qu'ils utilisaient une forme de page que le format refuse : le filet vérifiait un cas qui n'existe pas. Le correctif ferme aussi le piège de la barre finale, qui aurait ramené le même mensonge sur tout site en WordPress ou Next.
2. **Une page dont l'appel échoue était comptée « non indexée ».** Sur un simple dépassement de quota, une vérification de sévérité Critique aurait accusé un site à tort. Le compte a désormais trois catégories, avec un invariant testé.
3. **Le chemin d'un fichier de clé client atteignait le disque.** Un message d'erreur le recopiait jusque dans les fichiers d'audit.

## Ce qui reste à trancher, par toi

**Une seule question.** Le rapport en prose n'a pas été rédigé pendant la recette : elle a vérifié les données qui l'alimentent, pas le texte final produit par la skill. Les deux défauts ci-dessus montrent que c'est là que les mensonges se matérialisent.

- **Option A** : considérer que la vérification sur les données suffit. C'est ce que la recette recommande, la partie mécanique étant celle qui peut casser.
- **Option B** : une recette complémentaire qui fait tourner la skill `audit` de bout en bout sur un vrai site et lit le rapport produit.

Je prendrais B, mais plus tard, et pas dans ce chantier : le premier vrai audit client la fera de toute façon, et il vaut mieux la jouer sur un site qui a une stratégie **et** une propriété, ce qu'aucun de tes sites n'a aujourd'hui.

## Les points mineurs différés

Dix, tous consignés dans le registre avec leur raison. La revue finale les a triés : deux méritaient d'entrer dans la vague de correction, ils y sont entrés. Les huit autres sont sans effet sur ce que lit un client :

- des tests manquants sur des chemins déjà couverts ailleurs ;
- cinq fichiers d'échantillon en double, identiques, conséquence d'un module resté dans sa skill ;
- l'ancien nommage cité en prose dans trois fichiers de test que le modèle ne lit jamais ;
- une valeur de test dont le nom prête à confusion sans conséquence ;
- un commentaire de gabarit qui sous-compte, sans effet sur le comportement.

## Ce qui n'a pas été couvert

- Le flux d'authentification par compte de service n'est exercé que sur son chemin d'échec. L'usage courant reste `gcloud`.
- La survie de l'endpoint Bing après son échéance du 31 août n'est pas testable avant demain. Une mesure de référence a été prise aujourd'hui : les appels répondent normalement. Si quelque chose casse, la correction tient désormais dans un seul fichier.
- Les valeurs de STRAT-05 n'ont pas pu être vérifiées sur du réel : aucun de tes sites n'a à la fois une stratégie écrite et une propriété console.
