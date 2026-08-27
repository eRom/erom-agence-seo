---
title: Revue avant fusion, chantier 1, audit niveau 0
date: 2026-08-27
status: proposed
branche: chantier-1-audit-n0
commit_revu: 011f2fa
revieweur: session Fable (claude-mars-feb8)
---

# Revue avant fusion : chantier 1, audit niveau 0

## Ce que j'ai vérifié moi-même

- `bun test` depuis `plugin/` : 53 pass, 0 fail, 562 assertions.
- `check-sources.ts` en réseau : 50 citations retrouvées, 0 en échec, code 0.
- Diff entre le code du plan (extrait mécaniquement) et le code livré : **vide** sur `lib/`, `scripts/`, `references/`. Le code livré est le code qui avait tourné à blanc avant le plan.
- `SKILL.md` relu en entier : conforme au plan, paragraphe « challenge » présent.
- Deux rapports réels lus en entier : lemonde.fr (`clients/_smoke_ac7/`) et le site jouet (`clients/_smoke_local/`).
- Recette AC-1 à AC-7 relue : commandes et sorties collées, incident AC-7 documenté honnêtement, rejoué isolé avec MD5.
- Ledger SDD : onze tâches, chacune revue par un agent frais qui a rejoué tests et AC lui-même ; deux Important levés en cours de route (accents perdus puis restaurés, commentaire psi.ts), aucun Critical.
- Secrets dans le diff de la branche : zéro occurrence (motifs de clés Google et Bing).
- `.gitignore` : `clients/_smoke*/` ignorés, `inspiration/` ignoré.

## Verdict

**Fusionnable après deux correctifs Important**, qui tiennent dans une heure de Sonnet. Le code est sain ; les trous sont dans le contrat entre `SKILL.md` et le rapport, là où c'est le modèle qui décide et pas un test.

## Trouvailles, par sévérité

### [Important] R-1 : le rapport ne rend pas compte de toutes les vérifications

Preuve : rapport lemonde, 26 vérifications de niveau 0. Trouvailles 4 (ROBOTS-02, ROBOTS-04, IDX-05, AI-01) + passées 18 + PERF-01 non vue = 23. **SD-03, FRESH-01 et FRESH-02 n'apparaissent dans aucune des trois sections.** Elles ne figurent que dans la phrase qui exclut les pages challenge ; or la home a été auditée, et pour elle ces trois checks sont « non applicables » sans que le rapport le dise.

Risque : le « bouclier » de S2 (spec, section 5 : « Vérifications passées n'est pas de la décoration ») a des trous invisibles. Un Romain bis demande « et SD-03 ? » et personne ne sait.

Correctif :
1. `SKILL.md`, étape 3 : « chaque vérification du niveau exécuté apparaît exactement une fois dans le rapport : trouvaille, passée, ou non vue avec sa raison (par exemple : non applicable, aucune page de contenu auditable) ».
2. `lint-report.ts` : invariant mécanique. Charger les ids de niveau 0 via `parseChecks`, exiger que chacun apparaisse exactement une fois dans l'union des sections Trouvailles, Vérifications passées et Ce que je n'ai pas pu voir ; erreur sinon. Test unitaire sur un rapport synthétique complet et sur un rapport à trou. Une vingtaine de lignes.
3. Recette : rejouer AC-5 sur les rapports existants (le rapport lemonde doit échouer au lint avant correction, passer après).

### [Important] R-2 : le nom du dossier d'audit est décidé en langage naturel, sans verrou

Preuve : `SKILL.md` étape 0.3 (suffixe `-2`, `-3` « ne jamais écraser ») ; `collect.ts` exige un `--out` explicite ; incident AC-7 de la recette (deux runs concurrents, `report.md` écrasé).

Risque : deux lancements rapprochés, ou un modèle qui se trompe de suffixe, écrasent un audit. La spec promet « jamais écrasé ».

Correctif : `collect.ts` calcule lui-même le dossier quand `--out` est absent : `seo/audits/<YYYY-MM-DD>-n<niveau>`, puis `-2`, `-3`, avec un `mkdir` non récursif (EEXIST fait passer au suffixe suivant, ce qui rend le choix atomique), et imprime le chemin retenu sur la première ligne de sortie. `SKILL.md` n'a plus qu'à lire ce chemin. Test : deux appels successifs sur le même site rendent deux dossiers distincts, l'ancien intact. Une quinzaine de lignes.

### [Mineur] R-3 : sur localhost, IDX-03 et IDX-04 sont des faux positifs

Preuve : rapport du site jouet : IDX-03 Critique « HTTP pur, sans HTTPS », IDX-04 Important « www.localhost répond 200 ». macOS résout `*.localhost` vers la boucle locale ; aucun site de dev n'a de TLS.

Correctif : dans `indexability.md`, `Comment` d'IDX-03 et d'IDX-04 : « hôte localhost ou 127.0.0.1 : Info, non applicable en local ». Deux lignes. Concerne surtout le niveau 2 (chantier 2), mais le rapport jouet est déjà faux aujourd'hui.

### [Mineur] R-4 : en-tête « N vérifications » incohérent

Preuve : lemonde « 27 vérifications », site jouet « 26 ». Le bon nombre au niveau 0 est 26 (AI-02 est de niveau 2).

Correctif : `report-template.md` : « {{nb_checks}} = nombre de vérifications du niveau exécuté (26 au niveau 0) ».

### [Mineur] R-5 : correctif ROBOTS-02 formulé de travers sur lemonde

Preuve : « ajouter dans robots.txt, avant les blocs génériques qui matchent déjà `Claude-*` ». Il n'y a pas de motif dans les groupes `User-agent` ; lemonde a un groupe explicite `Claude-User` / `Disallow: /`. Le bon correctif : passer ce groupe en `Allow: /`. Ajouter un second groupe marcherait (règles équivalentes, Allow gagne), mais la phrase égare le dev du client.

Correctif : `robots.md`, ROBOTS-02, `Correctif` : « modifier le groupe existant du bot ; n'ajouter un groupe que s'il n'en a pas ».

### [Info] R-6 : commentaire de `psi.ts`

« On journalise le code HTTP » : le code finit dans `PsiFacts.error`, pas dans un log. Relevé par le reviewer de la tâche 6, cosmétique, à corriger au passage.

### [Info] R-7 : seuils heuristiques de REND-01

`textChars < 200` avec `htmlBytes > 5000` : la source officielle ancre la recommandation de rendu serveur, pas le seuil. Le check l'assume. À garder en tête si un client conteste un jour.

## Hors du chantier, à signaler

- **`.claude/skills/plugin-release/`** est apparu dans le repo à 19:28, non suivi, avec un `preflight.py` daté du 11 août. Ce n'est dans aucun plan de ce chantier : c'est un outil de publication de plugins vers erom-marketplace. Réponse de Romain le 27/08 à 21 h 45 : dépôt volontaire, à ignorer ici.
- Fichiers non suivis à moi, à commiter avec la note mots-clés : `docs/recherches/2026-08-27-mots-cles-gratuits.md` et les échantillons Bing, Wikimedia et PSI dans `docs/recherches/echantillons/`.

## Ce que je n'ai pas revu

- Les 27 checks ligne à ligne, à froid : identiques au plan (diff vide) et citations validées par script, mais je n'ai pas relu chaque `Comment` avec un œil neuf.
- Aucun audit lancé par moi sur un site tiers : j'ai lu ceux de la recette.

## Le cas contre mes propres réserves

R-1 et R-2 ne cassent aucun audit séquentiel réel : les deux rapports lus sont justes, et la recette est honnête sur l'incident. On pourrait fusionner tel quel et corriger en 1.1. Je ne le recommande pas, parce que R-1 touche la promesse centrale de la spec (le bouclier complet) et R-2 la phrase « jamais écrasé », deux choses qu'on dira à un client. Une heure de Sonnet contre un rapport à trous chez un prospect.

## Décision demandée

- **A, recommandé** : `quirinus` applique R-1 à R-6 sur la branche en une tâche (tests, lint, recette AC-5 rejouée sur les trois rapports), je revérifie, fusion ce soir.
- **B** : fusion maintenant, R-1 à R-6 en chantier 1.1.
