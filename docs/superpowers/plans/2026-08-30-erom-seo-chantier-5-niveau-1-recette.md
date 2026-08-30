# Recette niveau 1 — chantier 5, étape 2

Recette jouée le 30/08/2026 sur les comptes réels de Romain, depuis des dossiers jetables sous `/tmp` (jamais dans le dépôt ni dans un dossier client). Onze critères d'acceptation, définis en section 9 de `docs/superpowers/specs/2026-08-30-erom-seo-niveau-1-design.md`. Aucune modification de code : ce document mesure et rapporte, il ne corrige rien.

Deux révisions du jour intégrées : AC-7 recentré sur `console sites` (healthincloud.app hors ligne) et AC-8 porteur de la garantie « l'audit ne meurt jamais ».

## Environnement

```
$ source ~/.zshenv && [ -n "$BING_WMT_API_KEY" ] && echo "clé Bing présente" && [ -n "$GSC_QUOTA_PROJECT" ] && echo "projet de quota présent"
clé Bing présente
projet de quota présent
```

Les deux variables sont là ; leur valeur n'a jamais été affichée. Toutes les collectes ci-dessous ont tourné depuis des sous-dossiers de `/tmp/recette-n1*`, avec le chemin absolu vers `collect.ts` du worktree `/Users/recarnot/dev/erom-agence-seo-chantier-5-n1`.

**Incident mineur, corrigé en cours de route** : la commande `keywords.ts "bon pote"` a d'abord été lancée par erreur depuis le worktree du plugin (au lieu d'un dossier `/tmp`), ce qui a créé `seo/strategy/2026-08-30/` dans le dépôt. Détecté par `git status --short` juste après, supprimé avec `trash` (jamais `rm`), dépôt revérifié propre, puis la commande rejouée depuis `/tmp/recette-n1-ac11`. Aucune trace n'est restée dans le worktree.

---

## AC-1. Le niveau 1 produit une collecte complète

**Commande** (depuis `/tmp/recette-n1`) :
```
$ bun .../collect.ts https://www.romain-ecarnot.com/ --level 1
dossier : seo/audits/2026-08-30-n1
collecte terminée : 1 pages, robots.txt 200, 1 sitemap(s), llms.txt 404, PageSpeed ok
consoles : Google ok, Bing ok
CODE DE SORTIE: 0
```

**Structure produite** (`find seo/audits/2026-08-30-n1/ | sort`) :
```
seo/audits/2026-08-30-n1/
seo/audits/2026-08-30-n1/derived
seo/audits/2026-08-30-n1/derived/console.json
seo/audits/2026-08-30-n1/derived/pages.json
seo/audits/2026-08-30-n1/derived/psi.json
seo/audits/2026-08-30-n1/derived/robots-eval.json
seo/audits/2026-08-30-n1/raw
seo/audits/2026-08-30-n1/raw/bing
seo/audits/2026-08-30-n1/raw/bing/urlinfo
seo/audits/2026-08-30-n1/raw/bing/urlinfo/index.json
seo/audits/2026-08-30-n1/raw/bing/usersites.json
seo/audits/2026-08-30-n1/raw/gsc
seo/audits/2026-08-30-n1/raw/gsc/inspect
seo/audits/2026-08-30-n1/raw/gsc/inspect/index.json
seo/audits/2026-08-30-n1/raw/gsc/searchanalytics-date.json
seo/audits/2026-08-30-n1/raw/gsc/searchanalytics-page-query.json
seo/audits/2026-08-30-n1/raw/gsc/sitemaps.json
seo/audits/2026-08-30-n1/raw/gsc/sites.json
seo/audits/2026-08-30-n1/raw/manifest.json
seo/audits/2026-08-30-n1/raw/pages
seo/audits/2026-08-30-n1/raw/pages/index.headers.json
seo/audits/2026-08-30-n1/raw/pages/index.html
seo/audits/2026-08-30-n1/raw/robots.txt
seo/audits/2026-08-30-n1/raw/sitemap-0.xml
```

```
$ jq .level seo/audits/2026-08-30-n1/raw/manifest.json
1
```

Tout ce que produit le niveau 0 est présent (`raw/robots.txt`, `raw/sitemap-0.xml`, `raw/pages/`, `derived/pages.json`, `derived/psi.json`, `derived/robots-eval.json`), plus `raw/gsc/`, `raw/bing/` et `derived/console.json`. Le manifeste porte `level: 1`.

**Verdict : OK.**

---

## AC-2. Sans `--level 1`, aucune requête ne part vers les consoles

**Test unitaire** (`collect.test.ts`, décrit « sans --level 1, aucune requête ne part vers les consoles », fetcher espion qui lève à tout appel) :
```
$ bun test plugin/skills/audit/scripts/tests/collect.test.ts -t "sans --level 1"
bun test v1.4.0 (34cbb9a40)

 1 pass
 31 filtered out
 0 fail
 3 expect() calls
Ran 1 test across 1 file. [50.00ms]
```

**Audit réel sans le drapeau** (depuis `/tmp/recette-n1-ac2`) :
```
$ bun .../collect.ts https://www.romain-ecarnot.com/ --max-pages 3 --no-psi
dossier : seo/audits/2026-08-30-n0
collecte terminée : 1 pages, robots.txt 200, 1 sitemap(s), llms.txt 404, PageSpeed PageSpeed non demandé (--no-psi)
code de sortie : 0
```

```
$ find seo/audits/2026-08-30-n0/ | sort
seo/audits/2026-08-30-n0/
seo/audits/2026-08-30-n0/derived
seo/audits/2026-08-30-n0/derived/pages.json
seo/audits/2026-08-30-n0/derived/psi.json
seo/audits/2026-08-30-n0/derived/robots-eval.json
seo/audits/2026-08-30-n0/raw
seo/audits/2026-08-30-n0/raw/manifest.json
seo/audits/2026-08-30-n0/raw/pages
seo/audits/2026-08-30-n0/raw/pages/index.headers.json
seo/audits/2026-08-30-n0/raw/pages/index.html
seo/audits/2026-08-30-n0/raw/robots.txt
seo/audits/2026-08-30-n0/raw/sitemap-0.xml
```
`raw/gsc/`, `raw/bing/` et `derived/console.json` sont bien absents.

**Point non couvert par cette recette** : la partie « le rapport nomme les quatre vérifications parmi celles qu'il n'a pas pu voir » porte sur le rapport en prose écrit par la compétence audit (un artefact rédigé par un agent à partir des données, pas produit par `collect.ts`). Cette recette, sur instruction du brief, s'est arrêtée à l'inspection directe du dossier et de `derived/console.json` — elle n'a pas fait tourner l'écriture du rapport. La ligne « Vérifié par » d'AC-2 dans la spec ne réclame elle-même que le test unitaire et l'absence des trois artefacts, ce qui est couvert intégralement ci-dessus.

**Verdict : OK** (sur le périmètre mécanique vérifié : appel espion + absence des trois artefacts).

---

## AC-3. IDX-06 compte les pages réellement indexées

**Donnée réelle**, `derived/console.json` de la collecte AC-1 :
```json
"index": { "total": 1, "indexed": 1, "notIndexed": [] }
```
1 page inspectée, 1 indexée, aucune non-indexée à nommer (cohérent : la seule page du site est « Submitted and indexed »).

**Preuve que ce compte ne vient pas du champ `indexed` de `sitemaps.list`** — `raw/gsc/sitemaps.json` de la même collecte :
```json
{
  "contents": [{ "type": "web", "submitted": "1", "indexed": "0" }]
}
```
Le champ `sitemaps.list.contents[].indexed` vaut `"0"` alors que `derived/console.json.google.index.indexed` vaut `1` : la valeur vient bien de l'inspection (`coverageState`), pas de ce champ non alimenté par Google (capture identique à l'échantillon 11.3 de la spec).

**Tests unitaires IDX-06** :
```
$ bun test plugin/skills/audit/scripts/tests/level1.test.ts -t "IDX-06"
bun test v1.4.0 (34cbb9a40)

 4 pass
 34 filtered out
 0 fail
 8 expect() calls
Ran 4 tests across 1 file. [17.00ms]
```

**Limite assumée** : comme pour AC-2, le rapport en prose (celui qui « nomme celles qui ne le sont pas avec leur état ») n'a pas été rédigé dans cette recette — vérifié ici sur les données qui l'alimenteraient (`derived/console.json`, `raw/gsc/inspect/*.json`), conformément au périmètre donné par le brief.

**Verdict : OK** (sur les données ; la rédaction du rapport prose n'a pas été jouée, voir bilan).

---

## AC-4. IDX-07 voit une divergence de canonical, ou dit qu'il n'y en a pas

**Donnée réelle**, `derived/console.json` :
```json
"canonical": []
```
`raw/gsc/inspect/index.json` :
```json
"googleCanonical": "https://www.romain-ecarnot.com/",
"userCanonical": "https://www.romain-ecarnot.com/"
```
Les deux canonicals sont égaux ce jour sur `romain-ecarnot.com` : `canonical: []` est le résultat attendu (« vérification passée »), exactement la prédiction de la spec section 9 et de l'échantillon 11.1.

**Tests unitaires** (divergence forgée, égalité, `userCanonical` absent) :
```
$ bun test plugin/skills/audit/scripts/tests/level1.test.ts -t "IDX-07"
bun test v1.4.0 (34cbb9a40)

 3 pass
 35 filtered out
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [13.00ms]
```
Les trois tests couvrent bien les trois branches : `IDX-07 signale une divergence de canonical`, `IDX-07 ne dit rien quand les deux canonicals sont égaux`, `IDX-07 laisse le canonical absent à TAG-03`.

**Verdict : OK.**

---

## AC-5. STRAT-05 confronte les mots réels aux mots visés, et seulement avec une stratégie

Chico n'a de propriété chez aucune console (voir AC-8) : ce critère ne peut donc se lire ici que sur la **présence ou l'absence du bloc `strategy`**, jamais sur ses valeurs (`hasImpressions`/`keywordFound` resteront `false`/`null` faute de données console réelles sur ce domaine). C'est noté comme tel, pas déclaré OK sur les valeurs.

**Avec stratégie** (depuis `/tmp/recette-n1-ac5`, `--strategy-path` pointé sur le vrai `seo/strategy.md` de chico-happiness sans écrire dedans) :
```
$ bun .../collect.ts https://commentchercherbonheur.org/ --level 1 --max-pages 5 --no-psi --strategy-path /Users/recarnot/dev/chico-happiness/seo/strategy.md
dossier : seo/audits/2026-08-30-n1
collecte terminée : 10 pages, ...
code de sortie : 0
```
```
$ jq '.strategy' seo/audits/2026-08-30-n1/derived/console.json
[
  { "page": "/", "keyword": "institut chico", "hasImpressions": false, "keywordFound": null, "topQueries": [] },
  { "page": "/methode", "keyword": "méthode quantique chico", "hasImpressions": false, "keywordFound": null, "topQueries": [] },
  ... (8 pages au total, toutes avec keywordFound: null, hasImpressions: false)
]
```
Bloc `strategy` peuplé, une entrée par page prévue de la stratégie chico.

**Sans stratégie** (depuis `/tmp/recette-n1-ac5-none`) :
```
$ bun .../collect.ts https://commentchercherbonheur.org/ --level 1 --max-pages 5 --no-psi --strategy-path none
dossier : seo/audits/2026-08-30-n1
collecte terminée : 5 pages, ...
code de sortie : 0
```
```
$ jq '.strategy' seo/audits/2026-08-30-n1/derived/console.json
null
```

**Observation annexe (hors critère)** : avec stratégie, la collecte a ramené 10 pages malgré `--max-pages 5` (les pages nommées dans la stratégie semblent prioritaires sur le plafond de pages) ; sans stratégie, le plafond de 5 a été respecté. Ce n'est couvert par aucun des onze critères, signalé au bilan par simple prudence.

**Verdict : OK sur la présence/absence du bloc** ; **non joué sur la justesse des valeurs** (`keywordFound`), faute de propriété console sur ce domaine — comme prévenu par le brief.

---

## AC-6. AI-03 dit quelles pages Bing connaît

**Donnée réelle**, `derived/console.json` (collecte AC-1 sur `www.romain-ecarnot.com/`) :
```json
"bing": { "site": "https://romain-ecarnot.com/", "error": null, "known": 1, "total": 1, "unknown": [] }
```
`raw/bing/urlinfo/index.json` :
```json
{
  "response": {
    "HttpStatus": 0,
    "LastCrawledDate": "/Date(1785610378000)/",
    "Url": "https://www.romain-ecarnot.com/"
  }
}
```
La page est dite connue via `LastCrawledDate` (une date non nulle), alors que `HttpStatus` vaut `0` — si le code avait lu `HttpStatus`, il l'aurait déclarée inconnue par erreur. C'est exactement la sentinelle que le critère exige, et le piège qu'il interdit.

**Écart avec la spec section 9** : la ligne « Vérifié par » d'AC-6 nomme `lebonpote.romain-ecarnot.com` ; le brief de cette tâche a dirigé la collecte sur `www.romain-ecarnot.com/` (propriété domaine `sc-domain:romain-ecarnot.com`, qui couvre les deux sous-domaines). Le mécanisme exercé — sentinelle `LastCrawledDate`, jamais `HttpStatus` — est le même sur les deux ; la mesure ci-dessus le couvre, mais pas littéralement sur l'URL nommée par la spec.

**Test unitaire dédié** (sentinelle `DateTime.MinValue`, commentaire du fichier de test : « sans ce test, un `known: info !== null` satisfait tous les autres tout en mentant ») :
```
$ bun test plugin/skills/audit/scripts/tests/level1.test.ts -t "Bing"
bun test v1.4.0 (34cbb9a40)

 7 pass
 31 filtered out
 0 fail
 13 expect() calls
Ran 7 tests across 1 file. [13.00ms]
```

**Verdict : OK** (mécanisme vérifié sur le compte réel et par test unitaire ; l'URL exacte nommée par la spec pour la vérification n'a pas été rejouée séparément, écart noté).

---

## AC-7. Un accès refusé est nommé, jamais confondu avec une absence

Critère révisé le 30/08 : `healthincloud.app` est hors ligne, confirmé ici de nouveau :
```
$ curl -s -o /dev/null -w "HTTP %{http_code}\n" https://healthincloud.app/ --max-time 8
HTTP 000
```
Aucun audit ne peut donc plus s'y dérouler ; le refus de droits s'observe par la lentille de consultation.

**`console sites`** :
```
$ source ~/.zshenv && bun plugin/skills/console/scripts/console.ts sites
Google Search Console
  sc-domain:romain-ecarnot.com (siteOwner)
    https://lebonpote.romain-ecarnot.com/sitemap.xml : soumis 1, indexé 0, 0 erreurs, 0 avertissements
    soumis le : 2026-04-30T16:13:26.601Z
    lu le : 2026-05-01T18:06:47.626Z
  https://lebonpote.romain-ecarnot.com/ (siteOwner)
    https://lebonpote.romain-ecarnot.com/sitemap.xml : soumis 1, indexé 0, 0 erreurs, 0 avertissements
    soumis le : 2026-04-30T16:13:26.601Z
    lu le : 2026-05-01T18:06:47.626Z
  sc-domain:healthincloud.app (siteUnverifiedUser)
    sitemaps non lisibles pour cette propriété

Bing Webmaster Tools
  https://lebonpote.romain-ecarnot.com/ (vérifié)
    https://lebonpote.romain-ecarnot.com/sitemap.xml
    statut : Success
    soumis le : 2026-08-29T16:36:21.496Z
    dernier crawl : 2026-08-29T16:36:22.000Z
    URLs : 1
  https://romain-ecarnot.com/ (vérifié)
    aucun flux déclaré
```
La ligne attendue est là au mot près : `sc-domain:healthincloud.app (siteUnverifiedUser)` suivie de « sitemaps non lisibles pour cette propriété ».

**Test unitaire de `level1.ts`** (force `listSitemaps` à rendre 403, exige le message dans `sitemapsError`), nommé `« un refus de lecture des sitemaps est dit, jamais confondu avec « aucun sitemap » »` :
```
$ bun test plugin/skills/audit/scripts/tests/level1.test.ts -t "un refus de lecture"
bun test v1.4.0 (34cbb9a40)

 1 pass
 37 filtered out
 0 fail
 3 expect() calls
Ran 1 test across 1 file. [18.00ms]
```

**Verdict : OK.**

---

## AC-8. Un site hors des deux comptes dégrade proprement, et l'audit se termine

`commentchercherbonheur.org` est le seul site en ligne et absent des deux comptes (confirmé : `curl` rend `HTTP 308` sur ce domaine, contre `HTTP 000` sur healthincloud.app).

**Commande** (depuis `/tmp/recette-n1`) :
```
$ bun .../collect.ts https://commentchercherbonheur.org/ --level 1 --max-pages 5 --no-psi
dossier : seo/audits/2026-08-30-n1-2
collecte terminée : 5 pages, robots.txt 200, 1 sitemap(s), llms.txt 404, PageSpeed PageSpeed non demandé (--no-psi)
consoles : Google aucune propriété Search Console ne couvre cette URL, Bing ce site n'est pas dans le compte Bing
code de sortie : 0
```

`derived/console.json` :
```json
{
  "level": 1,
  "google": {
    "property": null, "error": "aucune propriété Search Console ne couvre cette URL",
    "index": { "total": 0, "indexed": 0, "notIndexed": [] }, "canonical": [], "lastDataDate": null
  },
  "bing": { "site": null, "error": "ce site n'est pas dans le compte Bing", "known": 0, "total": 0, "unknown": [] },
  "strategy": null
}
```
Code de sortie **0**, 5 pages collectées (niveau 0 complet), les deux raisons distinctes présentes au mot près.

**Verdict : OK.**

---

## AC-9. La fraîcheur des données est écrite

`derived/console.json` (collecte AC-1) :
```json
"lastDataDate": "2026-08-27"
```
`raw/gsc/searchanalytics-date.json`, trois dernières lignes :
```
$ jq -c '.response[-3:]' seo/audits/2026-08-30-n1/raw/gsc/searchanalytics-date.json
[{"keys":["2026-08-25"],...},{"keys":["2026-08-26"],...},{"keys":["2026-08-27"],...}]
```
Le dernier jour couvert par `searchanalytics-date.json` (2026-08-27) correspond bien à `lastDataDate`. Écart mesuré avec la date de l'audit (30/08) : **3 jours**, conforme à l'attendu (« environ trois jours »).

**Verdict : OK.**

---

## AC-10. Aucun secret sur le disque

Recherche menée sur les six dossiers produits pendant la recette : `/tmp/recette-n1`, `/tmp/recette-n1-ac2`, `/tmp/recette-n1-ac5`, `/tmp/recette-n1-ac5-none`, `/tmp/recette-n1-ac11`, `/tmp/recette-n1-ac11-checklist`.

**Recherche gardée de la clé Bing** :
```
$ source ~/.zshenv
$ [ -n "$BING_WMT_API_KEY" ] && command grep -rl "$BING_WMT_API_KEY" /tmp/recette-n1* 2>&1
(rien)
code $? -> 1
```
La garde `[ -n ]` a été respectée : la clé est présente en variable (confirmé au démarrage) mais absente de tout fichier produit.

**Recherche des motifs `ya29.`, `authorization`, `apikey=`** sur tous les dossiers :
```
$ command grep -rli "ya29\." /tmp/recette-n1* 2>&1     -> code 1 (aucun résultat)
$ command grep -rli "authorization" /tmp/recette-n1* 2>&1 -> code 1 (aucun résultat)
$ command grep -rli "apikey=" /tmp/recette-n1* 2>&1     -> code 1 (aucun résultat)
```
Aucun des quatre motifs n'apparaît dans aucun fichier produit pendant la recette.

**Verdict : OK.**

---

## AC-11. La mise en commun ne casse rien

**Suite de tests complète** :
```
$ bun test
bun test v1.4.0 (34cbb9a40)

 421 pass
 0 fail
 2012 expect() calls
Ran 421 tests across 32 files. [5.18s]
```
421 tests verts, au-dessus des « au moins 375 tests actuels » attendus par la spec.

**`console sites`** : rejoué ci-dessus (AC-7), sortie identique en structure à ce qu'elle rendait avant le déménagement dans `plugin/lib/` (propriétés Google et Bing listées, refus nommé sur healthincloud.app).

**`keywords.ts "bon pote"`** (depuis `/tmp/recette-n1-ac11`) :
```
$ bun plugin/skills/strategy/scripts/keywords.ts "bon pote"
dossier : seo/strategy/2026-08-30
bon pote : mesuré, Bing 61 / semaine, 1760 sur 24 semaines
```

**`checklist` sans `--agir`** — la spec (section 9, « Vérifié par » d'AC-11) nomme un troisième verbe que le brief de cette tâche ne listait pas explicitement dans sa commande d'exemple ; joué en plus, par fidélité à la spec qui fait autorité. Depuis `/tmp/recette-n1-ac11-checklist`, avec une copie du `seo/strategy.md` réel de chico-happiness (copie, jamais d'écriture dans le dossier client) :
```
$ bun plugin/skills/checklist/scripts/checklist.ts
fichier : seo/checklist.md
checklist : 1/15 cochées · mise en ligne : non · dû aujourd'hui : rien
```
Le verbe tourne sans erreur, sans `--agir`, écrit uniquement en local (`seo/checklist.md` dans le dossier jetable), sans requête sortante. Le contenu diverge de celui du vrai `checklist.md` de chico-happiness parce que la copie ne portait que `strategy.md` (ni historique git, ni audits, ni `checklist.md` précédent) — divergence attendue, pas un défaut : aucun état préalable n'a été fourni. Il n'existait pas de sortie de référence capturée avant le déménagement dans `plugin/lib/` pour un diff strict ; ce qui est vérifié ici est l'absence de régression fonctionnelle (le verbe tourne, produit une checklist structurée, respecte `--agir`), pas une identité octet à octet avec un état antérieur.

**Verdict : OK.**

---

## Bilan

**Décompte : 10 OK, 0 KO, 1 partiellement joué (AC-5)** sur onze — AC-5 est OK sur la présence/absence du bloc `strategy`, non joué sur la justesse de ses valeurs, faute de propriété console sur `commentchercherbonheur.org` (situation connue et annoncée par le brief avant la recette, pas une surprise).

### Résidus

1. **AC-2, AC-3 : le rapport en prose n'a pas été rédigé.** Le brief a scopé la vérification à `derived/console.json` et aux fichiers `raw/`, pas à l'écriture du rapport markdown de la compétence audit (un artefact rédigé par un agent, pas produit par `collect.ts`). Les données qui alimenteraient ce rapport sont vérifiées et correctes. **À trancher par Romain** : soit la ligne « Vérifié par » de la spec est considérée comme couverte par cette vérification sur les données (ce que je recommande, la partie mécanique est ce qui peut casser), soit une recette complémentaire fait tourner la compétence audit pour produire et lire un vrai rapport.

2. **AC-6 : mesuré sur `www.romain-ecarnot.com/`, pas sur `lebonpote.romain-ecarnot.com` comme le nomme la ligne « Vérifié par » de la spec.** Le brief de cette tâche dirigeait explicitement la collecte sur `www.romain-ecarnot.com/` ; la propriété domaine couvre les deux sous-domaines et le même mécanisme (sentinelle `LastCrawledDate`) est exercé sur les deux. **Proposition : parqué** — l'écart est cosmétique (même mécanisme, autre URL), sans signe de défaut réel.

3. **AC-5 : valeurs `keywordFound`/`hasImpressions` non vérifiables sur chico**, faute de propriété console sur ce domaine. Annoncé par le brief avant la recette. **Proposition : parqué**, jusqu'à ce que chico ait une propriété Search Console ou Bing (hors périmètre de ce chantier).

4. **AC-5, observation annexe : avec `--strategy-path`, `--max-pages` semble ignoré** (10 pages collectées contre un plafond de 5, alors que sans stratégie le plafond de 5 est respecté). Aucun des onze critères ne couvre ce comportement, donc ce n'est pas noté KO ici — mais c'est un comportement réel observé, pas construit. **À trancher par Romain** : creuser si c'est voulu (la stratégie prime sur le plafond) ou un bug de priorité d'options dans `collect.ts`.

5. **AC-11, `checklist` : pas de sortie de référence antérieure au déménagement pour un diff strict.** Le verbe a été rejoué avec un état minimal (copie de `strategy.md` seule) et fonctionne sans erreur, dans le respect de `--agir`. **Proposition : parqué** — la non-régression fonctionnelle est démontrée (421 tests verts incluant ceux de `checklist.ts`, plus cette exécution réelle sans erreur) ; un diff octet à octet contre un état pré-déménagement n'a jamais existé à capturer.

6. **Incident mineur déjà corrigé** : une commande lancée par erreur depuis le worktree du plugin a créé `seo/strategy/2026-08-30/` dans le dépôt ; détecté par `git status --short`, supprimé avec `trash`, dépôt reconfirmé propre avant la suite. Rien à trancher, signalé pour la traçabilité.

Aucun correctif de code n'a été appliqué : tout résidu ci-dessus reste une observation ou une proposition, à valider par Romain.
