## Task 7: TAG-05, du câblage au catalogue

**Files:**
- Modify: `plugin/skills/build/scripts/lib/plan.ts:20` (table `KINDS`) et `:120` (choix des textes à réécrire)
- Modify: `plugin/skills/build/references/nextjs.md:215` (en-tête de la recette et un `Piège`)
- Modify: `plugin/skills/build/SKILL.md` (étape 3, validation des textes)
- Modify: `plugin/skills/audit/scripts/tests/lint-report.test.ts:114` (compte figé converti en invariant)
- Modify: `plugin/skills/audit/references/report-template.md:3` (le commentaire du gabarit)
- Modify: `plugin/skills/audit/scripts/tests/fixtures/site.ts` (option `longTitle`)
- Modify: `plugin/skills/audit/references/checks/tags.md` (l'entrée TAG-05, **en dernier**)
- Test: `plugin/skills/build/scripts/tests/plan.test.ts`, `plugin/skills/audit/scripts/tests/collect.test.ts`

**Interfaces:** aucune signature nouvelle. Le catalogue est déclaratif, lu par `parseChecks`.

**L'ordre des étapes est le cœur de cette tâche.** Trois tests existants se déclenchent sur le contenu du catalogue, et ajouter `TAG-05` en premier les fait rougir tous les trois :

| Test | Ce qu'il exige | Refermé par |
|---|---|---|
| `plan.test.ts:130` | tout id du catalogue est dans `KINDS` | l'étape 3 |
| `recipes.test.ts:56` | tout id de `KINDS` en genre `code` ou `texte` a sa recette dans `nextjs.md` | l'étape 5 |
| `lint-report.test.ts:114` | l'en-tête d'un rapport annonce le bon compte de vérifications absolues | l'étape 7 |

D'où la règle : **le catalogue s'écrit en dernier, quand tout ce qui le lit est prêt.** C'est aussi pourquoi ce chantier a une tâche et non deux : entre les deux, la suite est rouge et un commit intermédiaire fige un arbre cassé.

**Pourquoi c'est du code et pas seulement de la documentation.** `buildPlan` classe chaque trouvaille par `KINDS[id]`, et un identifiant absent de cette table tombe sur le genre par défaut. Une trouvaille `TAG-05` arriverait dans le plan de build sans genre juste et sans déclencher la réécriture du titre : l'audit signalerait un défaut que le verbe suivant ne saurait pas corriger.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `plugin/skills/build/scripts/tests/plan.test.ts`, dans le style des tests voisins (fixtures `chico`, `buildPlan` appelé directement) :

```ts
test("TAG-05 ouverte classe le titre en texte à réécrire", () => {
  // Reprendre le montage du test voisin qui construit un plan depuis les fixtures chico,
  // en ajoutant au rapport une trouvaille TAG-05 ouverte sur la page /ascension.
  const plan = buildPlan(/* … mêmes arguments que le test voisin … */);
  const page = plan.pages.find((p) => p.page === "/ascension")!;
  expect(page.textes).toContain("title");
  expect(kindOf("TAG-05").kind).toBe("texte");
});
```

Le corps exact des arguments se recopie du test voisin : ce test n'introduit aucun montage nouveau, seulement une trouvaille de plus.

- [ ] **Step 2: Vérifier que le test échoue**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/build/scripts/tests/plan.test.ts
```

Attendu : ÉCHEC sur les deux assertions. `kindOf("TAG-05")` rend le genre par défaut, et `textes` ne contient pas `title`.

- [ ] **Step 3: Déclarer le genre de TAG-05**

Dans `plugin/skills/build/scripts/lib/plan.ts`, ligne 20, à côté de `TAG-03` qui est déjà du texte :

```ts
  "TAG-03": { kind: "texte" }, "TAG-05": { kind: "texte" },
```

Un titre trop long se répare en réécrivant une phrase, pas en changeant du code : même genre que `TAG-03`, ce qui le fait passer par la validation de Romain à l'étape 3 du build.

- [ ] **Step 4: Déclencher la réécriture du titre**

Ligne **120** du même fichier (pas 121), ajouter la condition :

```ts
    if (missing?.title || p.title === null || open.has("TAG-01") || open.has("TAG-05")) textes.push("title");
```

- [ ] **Step 5: Rattacher la recette**

Dans `plugin/skills/build/references/nextjs.md`, ligne 215, l'en-tête de la recette passe de :

```markdown
### Title et description (TAG-01, TAG-02)
```

à :

```markdown
### Title et description (TAG-01, TAG-02, TAG-05)
```

Sans cet ajout, `recipes.test.ts:56` échoue : il exige qu'un id de `KINDS` en genre `texte` ait sa recette.

La recette gagne un `Piège` de plus (plusieurs `Piège` par recette est le format normal, 31 dans le fichier) :

```markdown
Piège    : un title proposé fait 60 caractères ou moins, nom de marque compris. TAG-05 le signalera au-dessus de 65 ; 60 est la marge, pour qu'une retouche de texte ne rouvre pas la trouvaille au prochain audit. L'information distinctive va en premier et la marque en dernier : c'est la fin qui est coupée.
```

- [ ] **Step 6: Afficher la longueur à la validation**

Dans `plugin/skills/build/SKILL.md`, à l'étape 3 (validation des textes par Romain), ajouter :

```markdown
Chaque `title` proposé est affiché avec sa longueur entre parenthèses, par exemple `Audit Karmique Gratuit : votre Trajectoire | C.H.I.C.O. (55)`. Au-dessus de 60, le raccourcir avant de le proposer plutôt que de demander à Romain d'arbitrer une longueur.
```

- [ ] **Step 7: Convertir le compte figé de `lint-report.test.ts` en invariant**

`lint-report.ts:80` compare le compte annoncé dans l'en-tête d'un rapport à `expectedIds(...).length`, calculé **dynamiquement** depuis le catalogue. Or `lint-report.test.ts:114` fige ce compte à 26 dans son en-tête, et attend zéro erreur. Ajouter une vérification au catalogue le fait passer à 27 et le test rougit.

C'est un test détecteur de changement au sens de la doctrine du dépôt : il casse à chaque addition légitime et ne prouve rien de plus que la version dynamique. Le convertir est la réparation juste, pas un contournement. Le fichier le fait déjà à ses lignes 18, 100 et 104.

Ligne 114, remplacer :

```ts
    const head = "2026-08-28 · Niveau 2 (site en local) · Couche stratégique : non · 10 pages collectées · 26 vérifications";
```

par :

```ts
    const head = `2026-08-28 · Niveau 2 (site en local) · Couche stratégique : non · 10 pages collectées · ${absolute0.length} vérifications`;
```

`absolute0` est déjà défini ligne 10 du même fichier. **Ne pas toucher à la ligne 83**, qui fige aussi `26 vérifications` mais n'assère que la présence d'une autre erreur : elle survit à l'ajout, et la modifier serait sortir du périmètre.

- [ ] **Step 8: Corriger le commentaire du gabarit de rapport**

`plugin/skills/audit/references/report-template.md:3` porte :

```
<!-- nb_checks = vérifications absolues de niveau inférieur ou égal au niveau exécuté (26 au niveau 0 et au niveau 2), plus 5 si la couche stratégique est active. -->
```

Le nombre devient **27**. C'est le compte des vérifications absolues de niveau 0, pas la taille du catalogue : le catalogue passe de 35 à 36 entrées, dont 27 absolues de niveau 0. La spec §5 confond les deux, la corriger en même temps que la recette (T8 étape 9).

- [ ] **Step 9: Donner un titre long au site jouet, et le rendre collectable**

Dans `plugin/skills/audit/scripts/tests/fixtures/site.ts`, ajouter une option au serveur, sur le modèle des options existantes (`homeInSitemap`, `prodHost`, …) :

```ts
  /** Sert une page /long dont le <title> dépasse le seuil de TAG-05. La home garde un titre court. */
  longTitle?: boolean;
```

Deux endroits à toucher, et le second est celui qu'on oublie :

1. Un `case "/long":` qui sert la page avec son titre long.
2. **`/long` doit entrer dans le sitemap du site jouet.** `collect.ts` construit sa liste de pages à collecter depuis l'origine, les pages explicites et le sitemap : une page servie mais absente du sitemap n'est jamais visitée, et le test de l'étape suivante échouerait sans que la cause soit visible. Ajouter `/long` aux `<loc>` quand `opts.longTitle` est vrai.

Le titre doit dépasser 65 caractères. Ne pas figer un nombre dans le commentaire sans l'avoir mesuré :

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && bun -e 'const t = "…le titre choisi…"; console.log(t.length)'
```

Écrire dans le JSDoc « dépasse le seuil de TAG-05 », pas une longueur précise : la valeur mesurée n'a pas à devenir une constante que quelqu'un devra maintenir.

- [ ] **Step 10: Vérifier que la page longue est collectée entière**

`derived/pages.json` porte déjà `title` par page ; TAG-05 se juge sur ce champ, aucun code de collecte n'est à écrire. Ajouter à `collect.test.ts` :

```ts
test("le titre long du site jouet arrive entier dans pages.json", async () => {
  // Lancer le site jouet avec { longTitle: true }, collecter, lire derived/pages.json,
  // et asserter que la page /long a un title de plus de 65 caractères.
  // Invariant, jamais un nombre figé.
});
```

- [ ] **Step 11: Ajouter l'entrée au catalogue, en dernier**

Maintenant seulement, à la fin de `plugin/skills/audit/references/checks/tags.md` :

```markdown
### TAG-05 : title trop long
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : aucun <title> ne dépasse 65 caractères.
Comment    : derived/pages.json → title.length > 65 = trouvaille (citer le slug et la longueur).
             Le seuil de 65 est une convention d'agence : aucun moteur n'en publie. Google écrit
             qu'il n'y a pas de limite et que le titre est tronqué à la largeur de l'écran ; Bing
             signale « Titre trop long » dans le Site Scan de Webmaster Tools sans publier son
             seuil (relevé le 31/08/2026 sur commentchercherbonheur.org : 3 pages sur 10).
Source     : https://developers.google.com/search/docs/appearance/title-link « Also avoid unnecessarily long or verbose text in your <title> elements. »
Correctif  : viser 60 caractères, l'information distinctive en premier, le nom de marque en dernier.
Effort     : rapide
```

**Une seule source, et c'est délibéré.** Le plan portait d'abord une seconde ligne `Source` citant Bing (`« Titre trop long » [manuel]`). Elle est retirée : `checks-format.test.ts:34` exige que toute citation dépasse 15 caractères, sans exempter les `[manuel]`, et « Titre trop long » en fait exactement 15. Les deux citations `[manuel]` déjà présentes dans le dépôt font 19 et 36 caractères : le précédent invoqué ne couvrait pas ce cas.

L'incident Bing reste dans `Comment`, où il porte sa date et son compte. C'est plus honnête tant que le libellé complet du Site Scan n'a pas été capturé à l'écran : c'est l'incertitude 4 de la spec, et le jour où le verbatim existe, il devient une vraie ligne `Source`.

- [ ] **Step 12: Vérifier l'ensemble**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test && bun skills/audit/scripts/check-sources.ts
```

Attendu : tout vert, les deux nouveaux tests compris ; la citation Google retrouvée en `OK`, aucun `ÉCHEC` neuf.

- [ ] **Step 13: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/skills/audit/ plugin/skills/build/
git commit -m "feat: TAG-05, title trop long, du cablage au catalogue

Detection a 65, correctif a 60. Aucun moteur ne publie de seuil : Google dit
qu il n y en a pas, Bing signale sans dire le sien. Le 65 est une convention
d agence, ecrite comme telle, ancree sur l export Site Scan du 31/08.

Le catalogue s ecrit en dernier : trois tests existants lisent son contenu
et exigent que KINDS, la recette nextjs et le compte de l en-tete soient
prets avant lui. lint-report.test.ts figeait 26 verifications en dur, un
detecteur de changement converti en invariant."
```

---

