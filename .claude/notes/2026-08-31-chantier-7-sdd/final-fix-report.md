# Rapport de correction, revue finale du chantier 7

Vague de correction appliquée en un seul lot sur la branche `chantier-7-soumission`, worktree
`/Users/recarnot/dev/erom-seo-chantier-7`. Départ : 545 tests verts. Arrivée : 547 tests verts,
deux commits.

## Commits

- `e9587bc` `test(console): pin les trois jonctions d'ecriture, corrige deux libelles` — points a à e.
- `67945ce` `docs: corrige les references D30, un libelle SKILL.md, et la spec de soumission` — points f à j.

## Point par point

### a. Arguments permutables des deux soumissions de sitemap

Fichier : `plugin/skills/console/scripts/tests/console-cli.test.ts`, test « update soumet aux
deux moteurs et poste les URL ».

Le test comptait les appels PUT et SubmitFeed sans jamais regarder leur contenu. Ajout de deux
assertions :
- l'URL du PUT est comparée à sa valeur exacte, propriété et sitemap encodés dans le chemin ;
- le corps JSON du POST SubmitFeed est comparé à `{ siteUrl, feedUrl }`.

Aucun changement de code de production : la permutation décrite n'existait pas dans le livré,
c'était un trou de test.

**Mutation rejouée** : permutation de `p.siteUrl`/`sitemapUrl` (ligne de l'appel Google) et de
`s.Url`/`sitemapUrl` (ligne de l'appel Bing) dans `console.ts`. Résultat : 78 pass, 1 fail — le
test modifié, et lui seul. Sortie observée :

```
Expected: "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fwww.a.fr%2F/sitemaps/https%3A%2F%2Fwww.a.fr%2Fsitemap.xml"
Received: "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fwww.a.fr%2Fsitemap.xml/sitemaps/https%3A%2F%2Fwww.a.fr%2F"
(fail) console update > update soumet aux deux moteurs et poste les URL [1.65ms]
 78 pass / 1 fail
```

Mutation revertée, `bun test` full repassé vert (547/547) avant de continuer.

### b. Origine servie remplaçable par l'origine demandée sur IndexNow

Fichier : même fichier, test « D53 : origine servie via redirection, sitemap au chemin déclaré
par robots.txt, un seul GET robots.txt ».

Cause du trou confirmée : le test n'injectait aucune stratégie (`deps({ fetcher })` sans
`strategy`), donc `cle` restait `null` et toute la branche IndexNow (contrôle de clé, POST) ne
tournait jamais. Ajout de `strategy: STRAT` (la fixture chico avec `IndexNow : clepublique`), de
deux réponses fetcher pour le contrôle de clé (`https://www.a.fr/clepublique.txt`) et le POST
IndexNow, et de deux assertions : le contrôle de clé a bien touché l'hôte servi, et le champ
`host` du corps IndexNow vaut `www.a.fr` (pas `a.fr`, l'hôte demandé).

Aucun changement de code de production : `console.ts` utilisait déjà `origine` aux deux endroits.

**Mutation rejouée** : remplacement de `origine` par `demandee` dans l'appel à
`verifierCleServie` et dans `host: new URL(origine).host`. Résultat : 78 pass, 1 fail —
uniquement le test D53. Sortie observée :

```
Expected: true
Received: false
(fail) console update > D53 : origine servie via redirection, ... [0.62ms]
 78 pass / 1 fail
```

Mutation revertée, suite complète repassée verte avant de continuer.

### c. Discipline d'import de `bingUserSites`

Fichier : même fichier, nouveau test « Bing répond 200 avec un ErrorCode dans le corps : refus
nommé, pas une réponse illisible », ajouté dans `describe("console update")`.

Le test fait répondre `GetUserSites` en HTTP 200 avec un corps `{"ErrorCode":3,"Message":"InvalidApiKey"}`
et vérifie que la sortie nomme le refus (`InvalidApiKey`) sans jamais dire « sans tableau d ».
Aucun changement de code de production : `console.ts` importait déjà `bingUserSites` depuis
`lib/bing` (celle qui lit l'ErrorCode dans le corps), pas depuis `lib/soumission` (celle qui ne
regarde que le statut HTTP).

**Mutation rejouée** : rebranchement de l'import de `bingUserSites` sur `lib/soumission` au lieu
de `lib/bing`. Résultat : 78 pass, 1 fail — uniquement le nouveau test, avec la sortie réelle de
l'implémentation fautive capturée dans l'échec :

```
Expected to contain: "InvalidApiKey"
Received: "site      : https://www.a.fr\nsitemap   : https://www.a.fr/sitemap.xml (1 URL)\n
google    : sitemap https://www.a.fr/sitemap.xml soumis à https://www.a.fr/\n
bing      : GetUserSites : réponse sans tableau d\n
indexnow  : 202 Accepted, URL reçues, validation de la clé en attente (1 URL)"
(fail) console update > Bing répond 200 avec un ErrorCode dans le corps ... [0.51ms]
 78 pass / 1 fail
```

Mutation revertée, suite complète repassée verte.

### d. Message faux sur un fichier absent

Fichier : `plugin/skills/console/scripts/console.ts`, branche `update`.

Avant : `!cle` seul déclenchait « pas de clé IndexNow dans seo/strategy.md (Cadence de fraîcheur,
IndexNow : non) », que le fichier soit absent ou présent sans clé. Après : un nouveau cas
`md === null` (fichier absent) est testé en premier et rend « pas de clé IndexNow : seo/strategy.md
est absent » ; le message existant reste pour le cas fichier présent sans clé.

Test ajouté : « D57 : pas de clé IndexNow parce que seo/strategy.md est absent, non applicable,
code 0 », qui vérifie le nouveau libellé et l'absence de « Cadence de fraîcheur » dans la sortie.

### e. Ligne IndexNow sans code ni compte

Fichier : `plugin/skills/console/scripts/lib/render.ts`, `renderUpdate`.

`ligne()` affichait `${nom} : ${r.message}` pour les trois moteurs. Ajout d'une branche
spécifique : quand `r.status` est non nul et `r.urls` défini (le cas réel, non simulé), la ligne
devient `${nom} : ${r.status} ${r.message} (${r.urls} URL)` — même idiome que la ligne sitemap
juste au-dessus (`(${nbUrls} URL${bouge})`). Le statut 0 (sentinelle dry-run / « aucune URL »)
n'est pas préfixé : ces messages portent déjà tout au long, ajouter « 0 » devant serait un bruit
sans sens.

Test complété dans `render.test.ts`, « une ligne par soumission, aucune ligne vide » :
`expect(out).toContain("indexnow  : 202 Accepted (10 URL)")`.

Je n'ai pas reproduit le texte exact de l'exemple de spec (`202 Accepted, 10 URL reçues, ...`)
mot pour mot : j'ai délibérément choisi de ne pas faire de substitution de texte dans le message
généré par `lib/soumission.ts` (« URL reçues » → « 10 URL reçues »), qui aurait couplé render.ts
au phrasé exact du dictionnaire `INDEXNOW_MESSAGES` et rendu le test de rendu dépendant d'un
fixture texte non maîtrisé par render.ts lui-même. Le format retenu porte le code et le compte,
« en suivant la forme de la spec » (code d'abord, compte visible), sans readre la ligne fragile à
un changement de wording ailleurs. Signalé ici en cas de désaccord sur la forme exacte souhaitée.

### f. SKILL.md, « Pas d'écriture, pas de rapport »

`plugin/skills/console/SKILL.md`, section 4 : devenu « Pas d'écriture locale, pas de rapport ».
Documentation seule, pas de test associé (le format de SKILL.md n'est pas couvert par
`bun test`).

### g, h. Références D30 périmées

`plugin/skills/audit/scripts/lib/level1.ts` (commentaire d'en-tête) et
`plugin/skills/console/scripts/tests/console-cli.test.ts` (commentaire dans le test « aucune
écriture ») : `D30` → `D50`. Affirmation inchangée, seul le numéro de décision cité était faux.

### i. Commande de vérification `grep -rn 'skills/'`

Deux occurrences corrigées, toutes deux remontant trois commentaires de provenance (dont
`plugin/lib/sitemap.ts`, créé par ce chantier) au lieu de zéro :

- `.superpowers/sdd/2026-08-31-erom-seo-chantier-7-soumission/contraintes.md` (fichier gitignoré,
  hors commit, mais corrigé sur disque).
- `docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-soumission.md`, Step 7 : l'alternative
  `'from "\.\./skills\|from "\./skills\|skills/'` incluait `skills/` nu comme troisième branche,
  donc strictement équivalente au bug de contraintes.md malgré un texte différent.

Nouvelle commande dans les deux fichiers : `command grep -rn 'from ".*skills/' plugin/lib/*.ts`.
Vérifié à la main :

```
$ command grep -rn 'from ".*skills/' plugin/lib/*.ts; echo "exit $?"
exit 1
```

Zéro ligne, comme attendu (aucun fichier de `plugin/lib/` n'importe depuis `skills/`).

### j. Code de sortie 2 vs 1 dans la spec

`docs/superpowers/specs/2026-08-31-erom-seo-soumission-design.md`, sections 3.1 et 4 : les deux
occurrences de « code 2 » pour une erreur d'usage corrigées en « code 1 », avec l'incise « la
signature du CLI ne rend que 0 ou 1, motif antérieur à ce chantier et suivi délibérément ». Le
type de retour de `runConsole` (`Promise<{ out: string; code: 0 | 1 }>`) confirme qu'aucun 2 n'est
possible.

## Commandes lancées et sorties réelles

```
$ cd plugin && bun test
547 pass / 0 fail / 2351 expect() calls / Ran 547 tests across 40 files. [~5s]
```
(reproduit quatre fois pendant la session : baseline avant travail à 545, une fois après
implémentation à 547, une fois après chaque revert de mutation à 547, une fois en clôture à 547.)

```
$ bun skills/audit/scripts/check-sources.ts
122 citations retrouvées, 0 en échec, 2 à vérifier à la main
```
(inchangé par rapport à l'état avant ce lot, aucune citation touchée par les corrections.)

```
$ git diff | grep -n "—"
(aucune sortie, exit 1)
```
Aucun tiret cadratin introduit.

## Doutes et réserves

1. **Forme exacte de la ligne IndexNow (point e)** — voir la note dans la section correspondante :
   j'ai choisi `${status} ${message} (${urls} URL)` plutôt qu'une interpolation dans le texte du
   message pour rester découplé du phrasé de `lib/soumission.ts`. Si Romain veut le texte
   `202 Accepted, 10 URL reçues, ...` au caractère près, il faut soit interpoler le compte dans
   `INDEXNOW_MESSAGES` côté `lib/soumission.ts` (hors du périmètre attribué à ce point par la
   revue), soit accepter la forme actuelle.

2. **`console-cli.test.ts`, ligne du helper `deps()` (préexistante, non touchée)** — en lisant le
   fichier avant modification, la ligne qui construit `BING_WMT_API_KEY` (`(opts.key === undefined
   ? KEY : opts.key ?? undefined)`) et la constante `const KEY = "..."` en tête de fichier se sont
   affichées partiellement masquées par l'outil de lecture (`[REDACTED:env_secret]`), alors que la
   valeur réelle de `KEY` s'est avérée être une chaîne de 30 caractères, non hexadécimale, et
   différente de toute variable d'environnement actuellement chargée dans cette session (vérifié
   par `grep -c -F` contre chaque variable d'env de longueur ≥ 8, aucune correspondance,
   `BING_WMT_API_KEY` incluse). Je n'ai jamais affiché la valeur réelle et je n'ai touché ni cette
   ligne ni cette constante : hors périmètre du lot (aucun des points a-j ne les concerne). Signalé
   par prudence : le mécanisme de masquage de cette machine semble plus large qu'un simple motif
   hex32 (documenté dans la mémoire globale), et mérite un coup d'œil de Romain s'il veut
   comprendre pourquoi cette ligne précise le déclenche.

3. **Réutilisation de la fixture `STRAT`** dans le test D53 modifié (point b) — `STRAT` déclare un
   site (`commentchercherbonheur.org`) différent de celui du test (`https://a.fr` / `www.a.fr`),
   mais cela n'a pas d'incidence : `--site` est toujours passé explicitement dans ce test, et seule
   la clé IndexNow de la stratégie (`clepublique`) est utilisée. Aucun couplage caché constaté à
   l'exécution.

Aucune assertion existante n'a été modifiée (seulement étendue ou ajoutée), conformément à la
contrainte du dépôt.
