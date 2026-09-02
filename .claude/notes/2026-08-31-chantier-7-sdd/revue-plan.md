---
title: "Revue du plan chantier 7 (soumission), avant exécution"
date: 2026-08-31
cible: docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-soumission.md
spec: docs/superpowers/specs/2026-08-31-erom-seo-soumission-design.md
depot: /Users/recarnot/dev/erom-seo-chantier-7 (worktree, branche chantier-7-soumission, 506 tests verts)
---

# Revue du plan chantier 7 : soumettre aux moteurs

Méthode : les fichiers réels du worktree ont été ouverts et confrontés ligne à ligne aux blocs du plan. Cinq défauts sont reproduits par un script ou une commande exécutée ici ; ils sont marqués **[reproduit]**. Les autres portent une confiance explicite. La documentation des trois API a été relue sur le web aujourd'hui.

**Compte : 8 bloquants, 7 graves, 11 mineurs.**

Un mot avant la liste. Le plan est bon là où il est difficile : les profondeurs d'import sont toutes justes (`../../../../lib/soumission` depuis `checklist/scripts/lib/`, `../../../lib/soumission` depuis `console/scripts/`, `../../../../lib/sitemap` depuis `audit/scripts/lib/`), la copie de `lib/sitemap.ts` est identique caractère pour caractère à l'original, `sitemapsFromRobots` passe ses 7 cas, l'URL Google du test T2 est exactement celle que produit `encodeURIComponent`, et les faits de mémoire cités en T9 sont vrais. Ce qui casse casse ailleurs : dans l'environnement d'exécution, dans les tests existants que le plan n'a pas lus, et dans quatre affirmations documentaires qui deviennent fausses sans que personne ne les corrige.

---

## Bloquants

### B1. Les 32 `cd` du plan pointent sur le mauvais dépôt

**Où** : plan ligne 20 (Global Constraints), puis 32 blocs `bash` : lignes 154, 162, 252, 345, 353, 361, 481, 620, 628, 636, 707, 863, 871, 938, 998, 1006, 1041, 1089, 1097, 1141, 1164, 1184, 1192, 1235, 1289, 1297, 1318, 1326, 1352, 1363 et deux autres.

**Ce qui casse.** `git worktree list` donne deux checkouts :

```
/Users/recarnot/dev/erom-agence-seo      9a9a366 [main]
/Users/recarnot/dev/erom-seo-chantier-7  9a9a366 [chantier-7-soumission]
```

Le chantier vit dans le second. Toutes les commandes du plan entrent dans le premier. Trois conséquences, dans l'ordre de gravité :

1. `cd /Users/recarnot/dev/erom-agence-seo/plugin && bun test` lance la suite sur `main`, qui n'a aucun des fichiers créés. Elle sort verte à 506 tests, et l'implémenteur lit « tout vert » alors qu'il n'a rien vérifié. C'est un faux positif systématique sur chacune des 12 étapes de vérification du plan.
2. `cd /Users/recarnot/dev/erom-agence-seo && git add plugin/lib/soumission.ts` échoue en `pathspec did not match any files` : le fichier n'existe pas là. C'est exactement la famille d'incidents déjà consignée en mémoire (`git add ... could not open directory`, 4 échecs en dix minutes le 27/07).
3. Si l'implémenteur « corrige » en créant les fichiers depuis ce cwd, il écrit et commite le chantier 7 sur `main`, dans le checkout partagé. C'est précisément l'incident du 28/08 que la note `erom-seo-delegation-worktree` interdit de rejouer.

T9 est atteinte aussi, et différemment : `bun /Users/recarnot/dev/erom-agence-seo/plugin/skills/console/scripts/console.ts update` (ligne 1326) exécuterait le `console.ts` de `main`, qui n'a pas de commande `update`. La recette recetterait le mauvais binaire.

**Correction.** Remplacer partout `/Users/recarnot/dev/erom-agence-seo` par `/Users/recarnot/dev/erom-seo-chantier-7`, y compris dans la contrainte globale ligne 20. Une exception à traiter à la main : `clients/commentchercherbonheur.org` (T9 étapes 1, 2, 4, 5) n'existe que dans le checkout principal, qui l'ignore par `.gitignore` ; garder ce `cd` mais pointer le script sur le worktree, soit `cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts …`.

---

### B2. T4 introduit un import dupliqué de `bingUserSites`, et bun le résout en silence

**Où** : plan ligne 834 (T4, étape 4, bloc « Ajouter en tête de fichier les imports »).

**Ce qui casse.** `console.ts:6` importe déjà ce nom :

```ts
import { bingUserSites, bingFeeds, bingUrlInfo, bingCrawlStats, bingCrawlIssues, redact } from "../../../lib/bing";
```

Le plan ajoute :

```ts
import { trouverSitemap, urlsOnOrigin, verifierCleServie, submitSitemapGoogle, pingIndexNow, bingUserSites, bingSubmitFeed, type ActionResult } from "../../../lib/soumission";
```

Deux liaisons du même identifiant au niveau module. **[reproduit]** : bun ne lève rien, ne prévient de rien, et lie tout le module au **dernier** import :

```
lit()  -> B      // fonction écrite AVANT le second import
ecrit()-> B
exit=0
```

Il n'y a ni `tsconfig.json`, ni script `tsc`, ni CI dans le dépôt : rien ne verra la duplication. La conséquence n'est donc pas une erreur, c'est une régression silencieuse : `console sites`, `console inspect` et `console crawl` basculent tous les trois sur le `bingUserSites` de `checklist/scripts/lib/actions.ts:70` au lieu de celui de `lib/bing.ts:62`. Les deux ne sont pas équivalents.

| | `lib/bing.ts:62` (celui d'aujourd'hui) | `actions.ts:70` (celui que T4 impose) |
|---|---|---|
| HTTP 200 avec `{"ErrorCode":3}` | lève `BingError` « InvalidApiKey », avec `hint` | ne regarde pas `ErrorCode`, lève `Error("réponse sans tableau d")` |
| type de l'erreur | `BingError` (code + hint, rendu indenté par `reason()`) | `Error` nu, aucun hint |

Le test existant `console-cli.test.ts:68` (« un ErrorCode Bing sur GetUserSites ») continue de passer, parce qu'il n'assère que le code 0 et la présence de la propriété Google. La régression traverse donc la suite sans être vue, et l'utilisateur perd le message « la clé de ~/.zshenv n'est plus acceptée par Bing », qui est la seule consigne actionnable de ce refus.

**Correction.** Ne pas importer `bingUserSites` ni `bingSubmitFeed` depuis `lib/soumission` dans `console.ts` : garder `bingUserSites` de `lib/bing` (déjà là) et n'ajouter que `bingSubmitFeed`. L'import devient :

```ts
import { trouverSitemap, urlsOnOrigin, verifierCleServie, submitSitemapGoogle, pingIndexNow, bingSubmitFeed, type ActionResult } from "../../../lib/soumission";
```

Et il faut trancher le fond, que le plan ne voit pas : `bingUserSites` existe **deux fois** dans le dépôt, avec deux comportements. Le plan affirme réunir les soumissions en un seul endroit tout en dupliquant une troisième fois `BingSite` (`lib/resolve.ts:7`, `checklist/scripts/lib/checklist.ts:112`, et le nouveau `lib/soumission.ts`). Soit `lib/soumission.ts` réexporte le `bingUserSites` de `lib/bing.ts` au lieu d'en copier une variante, soit le plan assume la duplication et l'écrit noir sur blanc, comme il a assumé l'écart de nommage en tête.

---

### B3. T7 casse `plan.test.ts:130` : un id de catalogue sans genre

**Où** : plan T7 étape 5 (ligne 1184, « Attendu : tout vert ») et le graphe de dépendances en fin de plan (`T7 └─> T8`).

**Ce qui casse.** `skills/build/scripts/tests/plan.test.ts:125-130` :

```ts
test("tout id du catalogue de vérifications a un genre explicite", async () => {
  …
  for (const id of ids) expect(id in KINDS, `${id} sans genre dans KINDS`).toBe(true);
});
```

T7 ajoute `TAG-05` au catalogue. T8, qui l'ajoute à `KINDS`, est une tâche séparée que le plan autorise à partir plus tard. Entre les deux, ce test est rouge, et T7 étape 6 committe un arbre rouge. La justification écrite en tête de T8 (« un identifiant absent de cette table tombe sur le genre par défaut ») décrit le comportement mais rate le fait qu'un test l'interdit déjà.

Même famille, à l'intérieur de T8 : `recipes.test.ts:56` exige qu'un id de `KINDS` de genre `code` ou `texte` ait sa recette dans `nextjs.md`. L'étape 3 (KINDS) laisse donc la suite rouge jusqu'à l'étape 5 (l'en-tête de recette). T8 finit verte, mais l'ordre interne compte et le plan ne le dit pas.

**Correction.** Fusionner T7 et T8 en une seule tâche, ou déplacer l'ajout au catalogue (T7 étape 1) en dernière position, après `KINDS` et après l'en-tête de `nextjs.md`. À défaut, remplacer les deux « Attendu : tout vert » par la liste exacte des assertions attendues rouges et l'étape qui les referme.

---

### B4. T7 casse `lint-report.test.ts:114` : le compte de vérifications passe de 26 à 27 **[reproduit]**

**Où** : plan T7 étape 1 (l'entrée TAG-05) et étape 5 (« Attendu : tout vert »). La spec en parle en §5, mais avec le mauvais nombre.

**Ce qui casse.** `lint-report.ts:80` compare le compte annoncé dans l'en-tête d'un rapport à `expectedIds(checks, niveau, couche).length`, calculé dynamiquement depuis le catalogue. Le test `lint-report.test.ts:114-118` fige ce compte à 26 dans son en-tête et assère `toEqual([])` :

```ts
const head = "2026-08-28 · Niveau 2 (site en local) · Couche stratégique : non · 10 pages collectées · 26 vérifications";
…
expect(await lintReport(md, checksDir)).toEqual([]);
```

Reproduction exécutée ici, catalogue réel contre catalogue + TAG-05 :

```
catalogue avant: 35 absolute0: 26
catalogue apres: 36 absolute0: 27
AVANT -> erreurs: []
APRES -> erreurs: ["en-tête : 26 vérifications annoncées, 27 attendues (niveau 2, couche stratégique non)"]
```

Au passage, la spec §5 se trompe de nombre : « Le compte de vérifications de l'en-tête de rapport passe de 35 à 36 » confond la taille du catalogue (35 → 36, exact) avec le compte que porte l'en-tête d'un rapport, qui est le sous-ensemble absolu du niveau : **26 → 27**. Le plan ne reprend ni l'un ni l'autre.

**Correction.** Trois éditions, à ajouter à T7 :
1. `lint-report.test.ts:114` : remplacer `26 vérifications` par `${absolute0.length} vérifications`, comme le font déjà les lignes 18, 100 et 104 du même fichier. C'est un test détecteur de changement au sens de la doctrine du dépôt ; le convertir est la bonne réparation, pas un contournement.
2. `skills/audit/references/report-template.md:3` : le commentaire `nb_checks = … (26 au niveau 0 et au niveau 2)` devient 27.
3. Corriger la spec §5, ou consigner l'écart.

La ligne 83 du même fichier, qui fige aussi `26 vérifications`, n'assère que la présence de l'erreur « Couche stratégique » : elle survit.

---

### B5. T7 casse `checks-format.test.ts:34` : la citation Bing fait exactement 15 caractères **[reproduit]**

**Où** : plan ligne 1149 (T7 étape 1), et spec §5 (même ligne).

```markdown
Source     : https://www.bing.com/webmasters/sitescan « Titre trop long » [manuel]
```

**Ce qui casse.** `checks-format.test.ts:34` applique le seuil à **toutes** les sources, sans exempter les `[manuel]` :

```ts
for (const s of c.sources) {
  …
  expect(s.quote.length, `${c.id} citation`).toBeGreaterThan(15);
}
```

Passage de l'entrée TAG-05 du plan dans le vrai `parseChecks` :

```
quote: "Also avoid unnecessarily long or verbose text in your <title> elements." len: 71 manual: false -> >15 ? true
quote: "Titre trop long" len: 15 manual: true -> >15 ? false
```

15 n'est pas strictement supérieur à 15. Le test échoue, et T7 étape 2 annonce « test vert ». Un implémenteur qui n'a que sa tâche sous les yeux verra une assertion à un caractère près et sera tenté de toucher au test, ce que la contrainte globale interdit.

Le domaine, lui, passe : `OFFICIAL_DOMAINS` (`checks.ts:10`) contient `bing.com`, et `www.bing.com` matche par le suffixe. Le régime `[manuel]` est bien celui de `consoles.md:27-28`, mais les deux citations Bing existantes font 19 et 36 caractères : le précédent invoqué ne couvre pas ce cas.

**Correction.** Deux options, dans cet ordre de préférence.
1. Supprimer cette ligne `Source` et déplacer l'incident dans `Comment`, où il est déjà à moitié. TAG-05 garde la source Google, et `checks-format.test.ts:30` (`sources.length > 0`) est satisfait. C'est le choix honnête tant que le verbatim Bing n'a pas été capturé (incertitude 4 de la spec).
2. Si Romain tient à la trace Bing, capturer le libellé complet à l'écran et le citer en entier ; « Titre trop long » seul est trop court pour le contrat du dépôt.

---

### B6. Les tests normatifs de T4 et T5 appellent un helper `deps()` qui n'existe pas, et n'injectent aucune stratégie

**Où** : plan lignes 677, 898, 912, 927 (les quatre appels `deps(f, {…})`).

**Ce qui casse, deux fois.**

*Signature.* Le helper réel, `console-cli.test.ts:12-39`, prend **un seul argument objet** et rend un couple :

```ts
function deps(opts: { key?: string | null; bingSites?: string; … }) {
  …
  return { calls, deps: { fetcher, env: {…}, gcloud, serviceAccount, readStrategy: async () => null } };
}
```

Les tests existants l'utilisent ainsi : `const { deps: d, calls } = deps({}); await runConsole(["sites"], d);`. Le plan écrit `runConsole([…], deps(f, {BING_WMT_API_KEY: …, GSC_QUOTA_PROJECT: "p"}))`, c'est-à-dire deux arguments positionnels et le couple passé tel quel comme `Deps`. Le test « normatif », que le plan demande de « transcrire tel quel », ne peut pas tourner. Pire pour la boucle TDD : l'échec obtenu ne sera pas celui que le plan annonce (« `update` tombe sur le message d'usage ») mais un `d.fetcher is not a function`, ce qui envoie l'implémenteur déboguer le mauvais problème.

*Stratégie.* Le défaut survit à la correction de la signature. La branche `update` du plan (ligne 809-812) lit la clé IndexNow ainsi :

```ts
const md = await d.readStrategy();
if (md) { try { cle = parseStrategy(md).indexnow; } catch { } }
if (!cle) indexnowRaison = "pas de clé IndexNow dans seo/strategy.md (…)";
```

Le helper existant rend `readStrategy: async () => null`, et le plan n'injecte jamais de `seo/strategy.md`. `cle` reste nulle, aucun POST IndexNow ne part, et trois assertions tombent : ligne 683 (`toHaveLength(1)` sur l'endpoint IndexNow), ligne 917-918 (`--url` : le corps du POST) et l'esprit de AC-4. Le test `expect(out).toContain("indexnow")` passerait quand même, parce que `renderUpdate` écrit le nom de la ligne avant la raison : un vert trompeur juste à côté du rouge.

`parseStrategy(md).indexnow` existe bien (`lib/strategy.ts:32`, `string | null`) : l'appel est correct, c'est la fixture qui manque.

**Correction.** Étendre le helper `deps()` plutôt que d'en inventer un second, et le dire dans le plan comme une étape à part entière :
1. ajouter à `opts` un champ `fetcher?` qui remplace le fetcher par défaut, et un champ `strategy?: string | null` câblé sur `readStrategy` ;
2. fournir dans T4 le contenu minimal de `seo/strategy.md` qui donne `indexnow = "clepublique"`, en le reprenant d'une fixture existante de `skills/checklist/scripts/tests/fixtures/` plutôt qu'en l'inventant ;
3. réécrire les quatre appels sous la forme `const { deps: d, calls } = deps({ fetcher: f, key: KEY, strategy: STRAT }); await runConsole([…], d);`.

---

### B7. La vérification AC-8 de T2 est rendue fausse par T2 elle-même

**Où** : plan ligne 353 (T2 étape 6), et spec AC-8.

```bash
command grep -rnE 'method: "DELETE"|sites\.delete|sitemaps\.delete' plugin/ ; echo "exit $?"
```
> Attendu : aucune ligne, `exit 1` (grep ne trouve rien).

**Ce qui casse.** Deux étapes plus haut, T2 étape 4 fait écrire dans `gsc.ts` le commentaire de tête :

```ts
// Refusées explicitement, bien que le scope les autorise : sitemaps.delete, sites.add, sites.delete.
```

`sitemaps\.delete` et `sites\.delete` y matchent tous les deux. Le grep sortira deux lignes et `exit 0`. T6 ajoute la même phrase dans ACC-07 (`acces.md`), ce qui en fait trois. La vérification qui doit prouver le refus d'écrire est déclenchée par la phrase qui documente ce refus.

**Correction.** Cibler l'appel et non le mot. Par exemple :

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && command grep -rnE 'method: "DELETE"|f\([^)]*, *\{ *method: "DELETE"' plugin/lib plugin/skills --include='*.ts' | command grep -vE '^\S+: *(//|\*)' ; echo "exit $?"
```

et rendre à AC-8 sa seconde moitié, qui elle est vraie et vérifiable : le commentaire de tête de `gsc.ts` nomme les trois écritures refusées. Corriger aussi la commande de AC-8 dans la spec, qui souffre du même défaut.

---

### B8. T9 étape 2 rend AC-3 inobservable : le dry-run court-circuite précisément le refus qu'il doit capturer

**Où** : plan ligne 1326 (T9 étape 2) contre plan ligne 1015-1020 (T5 étape 5).

**Ce qui casse.** T5 étape 5 remplace l'appel réel par une valeur fabriquée quand `simule` est vrai :

```ts
google = simule
  ? { ok: true, status: 0, message: `sitemap ${sitemapUrl} soumis à ${p.siteUrl}` }
  : await submitSitemapGoogle(d.fetcher, a, p.siteUrl, sitemapUrl);
```

En dry-run, aucun PUT ne part, donc aucun 403 ne revient, donc `SUBMIT_HINT` n'est jamais rendu. Or T9 étape 2 lance `console update --dry-run` et attend « la ligne `google` porte le refus de scope et la commande `gcloud` complète », en ajoutant « Ce cas ne se rejoue plus après l'étape 3 : c'est maintenant ou jamais ». Il ne se joue pas du tout. `listProperties` réussit (le jeton a `webmasters.readonly`), la ligne google affichera au contraire un faux succès simulé.

La spec, elle, a raison : AC-3 dit « lancer `console update` avant de refaire le login ». C'est le plan qui a ajouté le `--dry-run`.

**Correction.** T9 étape 2 lance `console update` **sans** `--dry-run`. C'est sans risque : le jeton n'a pas le scope d'écriture, le PUT est refusé par Google avant tout effet, et c'est exactement l'observation recherchée. Ajouter la phrase qui l'explique, sinon la consigne « toujours dry-run d'abord » du SKILL.md donnera l'impression que la recette se contredit.

---

## Graves

### G1. D57 : trois échecs réels sortent en code 0

**Où** : plan lignes 826-827 (T4 étape 4).

```ts
const echecs = [google, bing, indexnow].filter((r) => r !== null && !r.ok).length;
return done(view, renderUpdate(view), echecs > 0 ? 1 : 0);
```

Seuls les `ActionResult` comptent. Or la branche `update` route vers une `raison` (donc hors comptage) trois situations que la spec D57 ne classe pas en « non applicable ». D57 énumère exactement : « clé Bing absente, site hors du compte Bing, pas de clé IndexNow dans la stratégie ». Le plan y ajoute en silence :

| Situation | Variable | Comptée ? | Classée non applicable par D57 ? |
|---|---|---|---|
| clé IndexNow servie mais différente de `strategy.md` (D54) | `indexnowRaison` | non | **non** |
| aucune propriété Search Console ne couvre le site | `googleRaison` | non | **non** |
| aucun jeton Google du tout (`auth()` échoue) | `googleRaison` | non | **non** |

Le cas de la clé est le plus net : la spec D54 le crée pour attraper un incident réel (« la clé de CHICO a changé entre le 29/08 et le 31/08 »), et le plan le fait sortir en 0. La commande dira « clé IndexNow différente » et rendra succès. Le troisième cas est une divergence de comportement avec les trois commandes voisines : `console sites` rend 1 quand aucun moteur n'a répondu (`console.ts:81`), `console crawl` rend 1 quand Bing n'a rien pu lire (`console.ts:160`).

**Correction.** Distinguer explicitement, dans la branche `update`, la raison « non applicable » de la raison « échec », par exemple deux variables (`bingNonApplicable` contre `bingRaison`), et compter les secondes. Nommer dans le commentaire les trois seuls cas non applicables, en reprenant la liste de D57 mot pour mot.

---

### G2. T5 : avec `--url` et sans clé Bing, une ligne `bing` apparaît quand même

**Où** : plan ligne 1000 (T5 étape 4, « Puis englober les deux blocs Google et Bing dans `if (sitemapUrl) { … }` »).

L'instruction est ambiguë sur la frontière. Dans le code de T4, la déclaration et l'initialisation sont sur la même ligne :

```ts
let bing: ActionResult | null = null, bingRaison: string | null = key ? null : NOKEY;
if (key) { … }
```

Si l'implémenteur n'englobe que le `if (key) { … }` (lecture la plus naturelle de « les blocs »), alors en mode `--url` sans clé Bing, `bingRaison` vaut `NOKEY` et `renderUpdate` écrit `bing     : non interrogé (clé absente)`. D55 dit que `--url` ne touche pas aux sitemaps ; AC-4 dit que « la sortie ne porte pas de ligne `google` ni `bing` ». Le test T5 correspondant n'assère que `not.toContain("google")` : la faute passerait.

**Correction.** Écrire l'instruction sans ambiguïté : déclaration **et** initialisation à l'intérieur du `if (sitemapUrl)`, `let bing = null, bingRaison = null` au-dessus. Et ajouter `expect(out).not.toContain("bing")` au test `--url`, en le lançant sans clé Bing pour couvrir le cas.

---

### G3. ACC-07 : la citation Google est tronquée d'une manière qui change son sens

**Où** : plan ligne 1067 (T6 étape 1).

```markdown
Source   : https://support.google.com/webmasters/answer/7451001 « You must have owner permissions on a property to submit a sitemap »
```

Vérifié sur la page aujourd'hui, la phrase entière est :

> « You must have owner permissions on a property to submit a sitemap **using the Sitemaps report**. If you don't have owner permissions, you can list the sitemap in your robots.txt file instead of submitting it with this report. »

« using the Sitemaps report » désigne l'interface web, pas l'API. Aucune page de la documentation API ne pose Owner comme prérequis de `sitemaps.submit` ; `developers.google.com/webmaster-tools/about` dit seulement « You must have appropriate access (**owner, full, read**) to any Google Search Console account that you wish to access using the API ». Le plan tronque donc une phrase pour lui faire dire le contraire de ce qu'elle dit du cas visé, et s'en sert pour justifier le `Piège` « il faut aussi le rôle Owner sur la propriété » et le message de refus de `gsc.ts` (« soumettre un sitemap demande le rôle Owner »).

Mécaniquement, `check-sources.ts` passera : `normalizePage` retire les balises et décode les entités, donc le fragment `owner permissions` enveloppé dans un `<a>` est bien reconstitué. C'est le fond qui est faux, pas la vérification.

Bonne nouvelle sur les deux autres citations : « Submits a sitemap for a site. » et « Also avoid unnecessarily long or verbose text in your `<title>` elements. » sont présentes mot pour mot, aux deux URL indiquées, sans redirection, et le `<title>` encodé en `&lt;title&gt;` dans un `<code>` est correctement remonté par `normalize.ts:15-18`. La bascule `[manuel]` prévue en T6 étape 2 n'est pas nécessaire.

**Correction.** Remplacer la source par la phrase de `webmaster-tools/about` (« appropriate access (owner, full, read) »), et reformuler le `Piège` en hypothèse : le prérequis Owner côté API n'est pas documenté, c'est l'incertitude 3 de la spec. Le message de `gsc.ts` peut rester prudent, mais il doit dire « selon toute vraisemblance » et non affirmer une règle que Google n'écrit pas. Un appel réel avec un compte en rôle Full trancherait en une commande.

---

### G4. Le frontmatter du `SKILL.md` de `console` n'est jamais mis à jour

**Où** : T6 étape 3 réécrit le paragraphe d'ouverture (`SKILL.md:9`) et ne touche ni la ligne 3 ni la ligne 4.

```yaml
description: Lit l'état des consoles … depuis le terminal, sans ouvrir un onglet, et sans rien écrire : … Triggers : '/erom-seo:console', 'est-ce que cette page est indexée', …
argument-hint: "[sites | inspect <url> | crawl] [--site <url>] [--json]"
```

`description` est la surface de déclenchement de la skill. Après le chantier elle affirme « **sans rien écrire** », ce qui est faux, et ne porte aucun trigger de soumission : « soumets le sitemap », « préviens les moteurs », « on vient de déployer » ne matcheront rien. `argument-hint` ignore `update`, `--url` et `--dry-run`, alors que T4 prend soin de mettre à jour la constante `USAGE` du script. Aucun test ne couvre le frontmatter (`acces.test.ts:36` ne lit `SKILL.md` que pour le tiret cadratin), donc rien ne le rattrapera.

**Correction.** Ajouter une étape à T6 : réécrire `description` (retirer « et sans rien écrire », ajouter la quatrième commande et trois triggers de soumission) et `argument-hint` (`"[sites | inspect <url> | crawl | update] [--site <url>] [--url <u>] [--dry-run] [--json]"`).

---

### G5. Deux autres affirmations deviennent fausses et ne sont pas corrigées

Le plan repère et corrige trois commentaires qui « affirment aujourd'hui le contraire » : `gsc.ts:1`, `console.ts:1`, `SKILL.md:9`. Il en manque deux, de la même famille exactement.

- **`plugin/lib/bing.ts:2-3`** : « Aucune écriture (D30) : SubmitFeed et SubmitUrlBatch ne sont pas ici, elles restent dans `skills/checklist/scripts/lib/actions.ts`, **seul endroit du plugin qui écrit vers l'extérieur**. » Après T3, `actions.ts` n'est plus qu'un réexport et le seul endroit est `lib/soumission.ts`. C'est la phrase même que D52 remplace.
- **`plugin/skills/console/references/acces.md:17`** (ACC-03) : « `console` demande toujours `webmasters.readonly`, donc **une soumission de sitemap lui est refusée par construction** ». T6 modifie ce fichier pour y ajouter ACC-07 sans corriger la ligne d'à côté, qui dit l'inverse de ce que ACC-07 explique.

**Correction.** Deux éditions à ajouter, en T3 pour `lib/bing.ts` et en T6 pour ACC-03.

---

### G6. `renderUpdate` : aucun test unitaire, et hors du filet anti tiret cadratin

**Où** : plan lignes 652 et 714-751 (T4).

T4 déclare `plugin/skills/console/scripts/tests/render.test.ts` dans ses `Files`, mais aucune de ses sept étapes n'y écrit une ligne. `renderUpdate` est une fonction pure exportée, avec sept branches (origine différente du site, sitemap présent ou absent, `deplacees > 0`, raison, `simule`, chaque ligne moteur nulle ou non), et elle ne sera exercée qu'indirectement par quatre tests CLI dont trois sont laissés à l'implémenteur.

Plus grave, `render.test.ts:189-251` porte un filet explicite et son commentaire dit pourquoi :

```ts
// Le filet doit voir chaque chaîne littérale de render.ts au moins une fois : sinon un tiret injecté
// dans une branche non exercée passerait la suite sans être vu (trouvaille de la revue du 29/08).
…
const sorties = [ sitesPleine, …, crawlAvecErreurs ];
for (const o of sorties) expect(o).not.toContain("—");
```

C'est une énumération manuelle. Le plan ajoute un quatrième renderer et n'y ajoute rien : la contrainte globale ligne 18 (« Aucun tiret cadratin … Le lint du dépôt le refuse ») cesse d'être vraie pour le code neuf. Au passage, la formule « le lint du dépôt » est trompeuse : il n'y a pas de linter, l'interdiction est portée par sept assertions dispersées, chacune sur son fichier.

**Correction.** Ajouter à T4 une étape : quatre à six cas `renderUpdate` dans `render.test.ts` (sitemap trouvé, sitemap absent avec raison, dry-run, un moteur en raison et deux en résultat), et pousser leurs sorties dans le tableau `sorties` de la ligne 246.

---

### G7. `bingSubmitFeed` compte un 200 porteur d'`ErrorCode` comme un succès, et c'est l'incertitude que T9 doit lever

**Où** : `actions.ts:80-84`, copié tel quel dans `lib/soumission.ts` par T3 étape 3.

```ts
if (r.status === 200) return { ok: true, status: 200, message: `sitemap ${feedUrl} soumis pour ${siteUrl}` };
```

Aucune lecture d'`ErrorCode`. Or `lib/bing.ts:54` teste `ErrorCode !== 0` **avant** le code HTTP, ce qui atteste que Bing renvoie des refus dans le corps avec un 200. La documentation confirme la forme de succès (`HTTP/1.1 200 OK`, corps `{"d":null}`) sans exclure un corps d'erreur en 200.

Conséquence directe sur T9 étape 5, qui doit lever l'incertitude 1 de la spec : « si Bing refuse (`InvalidUrl` 7), la ligne Bing devra dire au propriétaire d'ajouter la variante www ». Si Bing renvoie ce refus en 200 avec `ErrorCode: 7`, la commande affichera « sitemap … soumis pour … » et la recette conclura à un succès. L'incertitude serait close à tort.

Confiance : le comportement de `SubmitFeed` en 200 + `ErrorCode` n'est pas documenté, donc **hypothèse, confiance moyenne**. L'asymétrie entre `lib/bing.ts:54` et `actions.ts:82`, elle, est un fait, et elle est déjà dans le dépôt.

**Correction.** Le plan copie « sans une modification », ce qui est la bonne discipline pour AC-6 : ne pas y toucher pendant T3. Mais T9 étape 5 doit consigner le corps brut de la réponse Bing et non seulement la ligne rendue, et ouvrir une ligne de suite si `ErrorCode` y est non nul. Une phrase suffit, à ajouter à T9 étape 5.

---

## Mineurs

**M1. `plan.ts:121` n'existe pas, c'est la ligne 120.** Plan T8 en-tête et étape 4. La ligne visée est bien `if (missing?.title || p.title === null || open.has("TAG-01")) textes.push("title");`, mais elle est en 120. La ligne 20 citée pour `KINDS` est juste, elle.

**M2. Le titre du site jouet ne fait pas 80 caractères, il en fait 76.** Plan T7 étape 3, deux mentions dans la prose, une dans le JSDoc à transcrire, plus AC-7 dans la spec. Mesuré : `"Un titre delibererement tres long pour la verification TAG cinq du catalogue".length` = **76**. Le plan demande ensuite de compter et d'ajuster, donc il se rattrape, mais le commentaire à recopier porterait un chiffre faux dans le dépôt. Écrire « plus de 65 » et laisser l'implémenteur consigner la valeur mesurée.

**M3. La page `/long` ne sera pas collectée.** Plan T7 étapes 3 et 4. `collect.ts:69` et `wantedPages` (`collect.ts:66-79`) construisent la liste à collecter à partir de `${origin}/`, des pages explicites et du sitemap. Le sitemap du site jouet (`fixtures/site.ts:28`) liste `/a`, `/b`, `/c` et une URL hors site, jamais `/long`. Le test de l'étape 4 (« le titre long arrive entier dans pages.json ») échouera. Ajouter `/long` aux `locs` de `sitemap-pages.xml` quand `opts.longTitle` est vrai, en plus du `case "/long":`.

**M4. AC-7 n'est vérifiable par aucun code, et le plan ne le dit pas.** Aucun moteur ne calcule les trouvailles : le catalogue est déclaratif et c'est Claude qui juge (`checks.ts` ne fait que parser, `lint-report.ts` ne fait que vérifier la forme du rapport). « produit exactement une trouvaille » ne peut donc être établi ni par `bun test skills/audit` (T9 étape 8) ni par autre chose. Le test de T7 étape 4 est honnête sur ce qu'il fait (le titre est collecté entier) ; c'est l'AC qui promet plus. Reformuler AC-7 sur ce qui est observable, ou consigner en T9 que le critère est vérifié à la main sur une exécution d'audit réelle.

**M5. Double GET du `robots.txt`.** Plan lignes 774 (la sonde de redirection) et 539 (`trouverSitemap` refait `f(\`${origine}/robots.txt\`)`). D53 vend « deux bénéfices pour le prix d'une requête », le plan en dépense deux. Sans gravité, mais `trouverSitemap` pourrait accepter les directives déjà lues en paramètre optionnel.

**M6. Une directive `Sitemap:` suivie d'un commentaire est perdue.** `sitemapsFromRobots` ancre sur `\s*$` après `(\S+)`. Vérifié : `sitemapsFromRobots("Sitemap: https://a.fr/s.xml # le sitemap")` rend `[]`. Le protocole robots.txt admet un `#` en fin de ligne. Les 7 cas du plan passent tous, mais celui-là n'y est pas. Confiance : le comportement est **reproduit** ; sa fréquence réelle est inconnue. Une ligne de plus dans la regex (`(?:\s+#.*)?`) et un huitième cas de test.

**M7. `update` avale une `seo/strategy.md` invalide, `crawl` la nomme.** Plan ligne 764, `catch { /* traité comme absent, message ci-dessous */ }`. `console.ts:134-138` fait délibérément l'inverse, avec son commentaire : « Une stratégie présente mais invalide n'est pas une stratégie absente : le dire évite à l'utilisateur de chercher un fichier qui existe déjà. » Deux commandes voisines, deux comportements, dans le même fichier. Reprendre le motif de `crawl`.

**M8. Le dry-run écrit « partirait : … soumis à … ».** Plan lignes 728-737 et 1017. La valeur fabriquée porte un message au passé (`sitemap … soumis à …`) que `renderUpdate` préfixe de « partirait : ». La spec §4 promet « les mêmes lignes au futur ». Formuler le message simulé au futur et laisser `renderUpdate` ne préfixer que le nom du moteur, ou l'inverse, mais pas les deux.

**M9. Le code de sortie 2 de la spec est inatteignable.** Spec §3.1 (« Absent des deux : usage, code 2 ») et §4 (« 2 usage »). La signature de `runConsole` est `Promise<{ out: string; code: 0 | 1 }>` (`console.ts:33`) et le plan rend `code: 1` (ligne 766). Le plan a raison de suivre le code existant, mais il déclare un seul écart avec la spec (le nommage). Ajouter celui-ci, ou corriger la spec.

**M10. `www.googleapis.com` est l'hôte historique, le discovery pointe l'autre.** Le directory Google donne `searchconsole:v1` en `preferred` avec `rootUrl: https://searchconsole.googleapis.com/`, tout en gardant le chemin `webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}`. Les deux hôtes routent l'endpoint (401 sur les deux, pas 404), donc `WMX_BASE` reste bon. Aucune dérive fonctionnelle, aucun bandeau de dépréciation sur la page `submit`. À noter seulement dans le commentaire de `gsc.ts` pour que la question ne se repose pas. Le verbe PUT et le scope `https://www.googleapis.com/auth/webmasters` sont confirmés (le discovery ne déclare **pas** `webmasters.readonly` pour `submit`, contrairement à `list` et `get`). Le code de réponse, en revanche, n'est documenté nulle part : ni 204 ni 200, seulement « returns an empty response body ». La prudence du plan est la bonne posture, mais le commentaire de `gsc.ts` doit dire « non documenté » plutôt que de laisser croire à un 204 attesté.

**M11. `raisonSitemap` est une variable morte en T5.** Plan ligne 995 : déclarée, jamais assignée (le seul chemin qui la remplirait est remplacé par le `return` de T4), et pourtant poussée dans la vue. Soit la câbler, soit la retirer de `UpdateView`.

---

## Sur les trois API : rien de bloquant, et le point Bing est rassurant

Documentation relue aujourd'hui, 31/08/2026.

**Bing.** Le bandeau existe et il est daté d'aujourd'hui, verbatim sur `learn.microsoft.com/en-us/bingwebmaster/api-protocols` : « **Legacy SOAP and POX APIs will be retired on August 31, 2026. Migrate to our REST APIs to avoid service disruption.** » Il ne vise que SOAP et POX. Le tableau « POX and JSON protocol URL Format » de la même page documente toujours `JSON POST : https://ssl.bing.com/webmaster/api.svc/json/METHOD_NAME?apikey=API_KEY`, c'est-à-dire exactement le `BING_API_BASE` du dépôt. Aucune date de retrait pour JSON. `SubmitFeed(string siteUrl, string feedUrl)` et `GetUserSites()` sont inchangés, corps JSON en camelCase, `apikey` en query : conforme à `actions.ts:71` et `:81`. Réserve d'honnêteté : Microsoft n'a jamais défini ce que « our REST APIs » désigne, et aucune nouvelle base REST/OAuth n'apparaît dans la documentation. Le lien « Learn More » du bandeau redirige de `…-retirement-s0appox01` vers `…-deprecation-s0appox01` ; si le plan devait le citer, citer l'URL d'arrivée.

**IndexNow.** Conforme sur tout : endpoint `https://api.indexnow.org/indexnow`, `application/json; charset=utf-8`, les quatre champs `host` / `key` / `keyLocation` / `urlList` en camelCase, les six codes (dont le 403 « In case of key not valid (e.g. key not found, file found but key not in the file) », mot pour mot le message que cite D54), et la limite de 10 000 URL par POST, que `pingIndexNow` respecte déjà par son `slice(0, 10000)`. `searchengines.json` donne aujourd'hui exactement les sept participants listés en §8 de la spec, Google absent. Un seul détail : l'endpoint global est documenté sur `/faq`, pas sur `/documentation` ; si une source doit être citée un jour, c'est `/faq`.

**Google.** Voir M10 et G3.

---

## Ce que je n'ai pas couvert

- Aucun appel réseau réel n'a été fait vers Google, Bing ou IndexNow : le comportement du PUT authentifié, le code de succès réel, et la réaction de `SubmitFeed` à un `siteUrl` en apex avec un `feedUrl` en www (incertitude 1) restent non observés. C'est le travail de T9.
- `check-sources.ts` n'a pas été exécuté : il sort du réseau et le plan le lance déjà en T6 et T7. J'ai vérifié à la place, sur les pages elles-mêmes, que les trois citations existent mot pour mot et que `normalize.ts` les retrouvera.
- Je n'ai pas relu `skills/rapport`, `skills/strategy` ni `skills/build/scripts/plan.ts` au-delà des lignes que le plan touche.
- Je n'ai appliqué aucune modification au dépôt. Les reproductions vivent dans le scratchpad ; `git status` est resté propre en dehors du plan lui-même, déjà modifié avant mon arrivée.

---

## Le meilleur argument contre mes propres objections

Trois de mes griefs se défendent mal, et je préfère le dire.

**G7 (Bing 200 + ErrorCode) est un défaut du dépôt, pas du plan.** Le plan fait exactement ce qu'il faut : il copie sans toucher, parce que AC-6 exige que les 44 tests de `checklist` passent sans qu'une assertion bouge. Corriger `bingSubmitFeed` pendant le déménagement rendrait la non-régression indémontrable. Mon reproche porte sur une ligne de recette, pas sur l'architecture.

**M5, M8 et M11 sont du bruit de revue.** Une requête HTTP de plus, une formulation maladroite au futur, une variable morte : aucun n'a d'utilisateur lésé. Les signaler à égalité avec les autres serait exactement le pattern-matching déguisé en rigueur qu'il faut éviter ; ils sont en mineur pour cette raison.

**Et surtout, l'objection la plus sérieuse contre l'ensemble de cette revue.** Sept de mes huit bloquants sont des défauts de transcription, pas de conception : un chemin de dépôt, un identifiant en double, un helper de test à la mauvaise signature, un grep trop large, un ordre de tâches. Un implémenteur compétent lançant `bun test` dans le bon dossier les découvre en quelques minutes chacun, et le plan lui a donné, à chaque tâche, l'ordre de lancer la suite. On peut donc soutenir que le plan est structurellement sain et que je n'ai fait qu'anticiper le travail normal de l'exécution.

Je maintiens quand même, pour trois raisons précises. D'abord, B1 empoisonne le remède : dans le mauvais dépôt, `bun test` sort vert et **cache** les six autres au lieu de les révéler. Ensuite, B2 ne se manifeste par aucune erreur ni aucun test rouge, jamais : il change silencieusement le comportement de trois commandes déjà recettées, et c'est précisément le genre de défaut qu'un implémenteur qui n'a que sa tâche sous les yeux ne peut pas voir. Enfin B3, B4 et B5 font échouer des tests **existants**, dans des tâches dont le plan annonce « tout vert » : l'implémenteur y verra une régression de son propre travail et cherchera la faute au mauvais endroit, ou pire, touchera aux tests, ce que la contrainte globale interdit.

G3 en revanche ne se rattrape pas à l'exécution du tout : une citation tronquée qui change de sens passe `check-sources.ts`, passe les tests, et s'installe dans le dépôt comme une source vérifiée. C'est le seul défaut de cette liste qu'aucune commande n'aurait attrapé.
