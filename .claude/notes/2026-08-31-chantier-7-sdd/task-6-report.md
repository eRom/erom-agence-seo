# Rapport Tâche 6 : la procédure et la référence d'accès

## Ce qui a été fait

Les sept étapes du brief, dans l'ordre, sans reformulation du texte fourni.

1. **ACC-07 ajoutée** dans `plugin/skills/console/references/acces.md`, transcrite mot pour mot depuis le brief (deux `Piège`, deux `Source`).
2. **ACC-03 corrigée** : l'ancienne phrase (« `console` demande toujours `webmasters.readonly`, donc une soumission de sitemap lui est refusée par construction ») est devenue fausse avec `update`. Remplacée par le texte du brief qui renvoie à ACC-07.
3. **Citations vérifiées en ligne** via `check-sources.ts` (sortie complète plus bas) : les deux citations ACC-07 passent en `OK`.
4. **Paragraphe d'ouverture de `SKILL.md` réécrit** (« lit, il n'agit pas » devient « lit, et il agit sur une seule commande, `update` ») et **section « 5. Soumettre » ajoutée** après la section 4, texte transcrit tel quel.
5. **Frontmatter mis à jour** : `description` porte maintenant les déclencheurs de soumission (« soumets le sitemap », « préviens les moteurs », « on vient de déployer », « signale cette page aux moteurs ») et ne dit plus « sans rien écrire ». `argument-hint` ajoute `update`, `--url <u>` et `--dry-run`, aligné sur la constante `USAGE` de `plugin/skills/console/scripts/console.ts` (vérifié par lecture directe).
6. **Test de format relancé** : vert.
7. **Commit** `217a452`, message exact du brief.

## Sortie réelle de `check-sources.ts`

Lancé depuis `plugin/` : `bun skills/audit/scripts/check-sources.ts`.

Extrait pertinent (les entrées `console:*`, fin de la sortie complète qui couvre aussi `audit`, `build` et `checklist`) :

```
OK       console:ACC-01  Open the Users and permissions page in property settings
OK       console:ACC-01  Owner: Has full control over properties in Search Console.
OK       console:ACC-02  For TXT records, a Search Console verification record looks something
OK       console:ACC-03  Your application must use OAuth 2.0 to authorize requests. No other au
OK       console:ACC-04  RSA using SHA-256 hashing algorithm. This is expressed as RS256 in the
OK       console:ACC-04  a maximum of 1 hour after the issued time
OK       console:ACC-05  the API key is generated for a user and not a site
OK       console:ACC-06  Delegate site access to user
OK       console:ACC-07  Submits a sitemap for a site.
OK       console:ACC-07  You must have appropriate access (owner, full, read) to any Google Sea

121 citations retrouvées, 0 en échec, 2 à vérifier à la main
```

Les « 2 à vérifier à la main » sont les deux pages Bing de `checklist.md` (ACC-06 les cite en clair sans ligne `Source:`, pré-existantes), pas des entrées de cette tâche. Aucun échec neuf, aucun régression sur les entrées existantes.

Basculer `sitemaps/submit` en `[manuel]` (prévu à l'étape 3 si la citation échouait) n'a pas été nécessaire : la page répond en GET et la citation y est retrouvée telle quelle.

## Sortie réelle du test de format

```
cd plugin && bun test skills/console/scripts/tests/acces.test.ts

bun test v1.4.0 (34cbb9a40)

 4 pass
 0 fail
 54 expect() calls
Ran 4 tests across 1 file. [14.00ms]
```

Le test valide la forme (id `ACC-nn`, au moins une source réelle citée mot pour mot, un `Chemin :` par bloc, ACC-04 et ACC-06 présentes, aucun tiret cadratin) sans compter les entrées : ACC-07 passe sans modification du test, conformément au brief.

Vérification complémentaire, non demandée mais utile en filet : `bun test skills/console` complet, 77 pass / 0 fail, 324 assertions. Rien cassé ailleurs dans le verbe.

## Fichiers touchés

- `plugin/skills/console/SKILL.md`
- `plugin/skills/console/references/acces.md`

Aucun autre fichier modifié. Aucune dépendance ajoutée.

## Ce que ma relecture a trouvé

- Le diff (`git diff` avant commit) correspond trait pour trait au texte du brief pour les cinq blocs transcrits (ACC-07, correction ACC-03, paragraphe d'ouverture, section 5, frontmatter). Aucune reformulation introduite.
- Aucun tiret cadratin dans les deux fichiers modifiés (`grep -n "—"` : rien).
- La référence D51 dans le piège ACC-07 (« Le plugin n'implémente aucune des trois, volontairement (D51) ») a été vérifiée contre `docs/superpowers/specs/2026-08-31-erom-seo-soumission-design.md:49`, qui porte exactement cette décision (`sitemaps.delete`, `sites.add`, `sites.delete` non implémentées, scope `webmasters` qui les autorise). La citation du brief est fidèle.
- `argument-hint` a été confronté à la constante `USAGE` de `plugin/skills/console/scripts/console.ts:27` : les deux concordent (`update`, `--site`, `--url`, `--dry-run`, `--json`).
- La citation Owner tronquée que le brief signale comme piège n'a pas été réintroduite : ACC-07 ne cite que les deux fragments retenus (`sitemaps/submit` et `about`), aucune référence à `support.google.com/webmasters/answer/7451001`.

## Doutes

- `checklist:CL-11` (fichier `plugin/skills/checklist/references/consoles.md`, hors périmètre de cette tâche) cite toujours le même fragment tronqué « You must have owner permissions on a property to submit a sitemap » sans la suite « using the Sitemaps report » que le brief identifie comme trompeuse. `check-sources.ts` le valide en `OK` puisque le fragment existe bien sur la page, exactement le piège décrit dans le brief pour ACC-07. Je ne l'ai pas touché : ce n'est pas dans les fichiers listés par la tâche 6, et la consigne est chirurgicale. Signalé ici pour arbitrage, pas corrigé.
- Le paragraphe d'ouverture original renvoyait vers `/erom-seo:checklist --agir` pour agir. Le texte de remplacement fourni par le brief ne porte plus cette référence. J'ai transcrit tel quel sans ajouter de renvoi : possible que `checklist --agir` mérite un mot quelque part si son rôle a changé avec ce chantier, mais ce n'est pas demandé ici et je n'ai pas creusé le verbe `checklist`.

## Corrections post-revue (commit 73909f0)

Quatre corrections demandées par le coordinateur après relecture, dont deux issues de ma propre réserve.

1. **`--url` rattaché au triptyque.** Ajouté à la fin du paragraphe qui présente `console update --url` : « Le même ordre s'y applique : dry-run d'abord, OK de Romain ensuite, envoi enfin. » Coupe court à toute lecture qui limiterait la cérémonie au premier envoi.
2. **Distinction `checklist --agir` / `console update`.** Deux phrases ajoutées après le paragraphe d'ouverture de `SKILL.md` : `checklist --agir` est le rituel de mise en ligne joué une fois, avec état persisté dans `seo/checklist.md` ; `console update` est le geste répétable d'après chaque publication, sans état à tenir. Les deux passent par `plugin/lib/soumission.ts`, vérifié par lecture directe (`skills/checklist/scripts/lib/actions.ts:1` confirme le renvoi vers ce module, D52).
3. **`consoles.md` CL-11 corrigée, pas ma réserve d'origine.** Le relecteur a tranché : la citation Owner de CL-11 n'est pas trompeuse (son `Chemin` décrit explicitement l'interface web, le périmètre exact de la phrase source). Ce qui était faux, c'est la clause « jamais par l'API (jeton en lecture seule par construction, note niveau 1) », devenue fausse depuis ACC-07. Remplacée par la vraie raison (geste de lancement vérifié par un humain) avec renvoi vers `console update` et ACC-07. Rien d'autre touché dans ce fichier.
4. **`argument-hint` aligné sur `USAGE`.** `[--url <u>]` devient `[--url <u>]...` pour refléter la répétabilité que `USAGE` (`console.ts:27`) porte déjà et que le corps du texte annonçait.

### Sortie réelle après corrections

```
bun test skills/console
 77 pass / 0 fail, 324 expect() calls

bun test skills/checklist
 44 pass / 0 fail, 279 expect() calls

bun skills/audit/scripts/check-sources.ts
 console:ACC-07  OK (x2), aucune régression
 121 citations retrouvées, 0 en échec, 2 à vérifier à la main
```

Nombres identiques à la première passe : le point 3 ne touche aucune ligne `Source`, seulement un `Piège`, donc `check-sources.ts` ne pouvait pas bouger. Vérifié quand même en entier comme demandé.

Aucun tiret cadratin introduit (`grep -n "—"` sur les trois fichiers touchés : rien).
