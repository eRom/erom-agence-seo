## Task 5: `--url` et `--dry-run`

**Files:**
- Modify: `plugin/skills/console/scripts/console.ts`
- Test: `plugin/skills/console/scripts/tests/console-cli.test.ts`

**Interfaces:**
- Consumes: la branche `update` de T4.
- Produces: rien de nouveau à l'extérieur.

- [ ] **Step 1: Écrire les tests qui échouent**

Le faux serveur et la stratégie de test sont ceux de T4 (`serveur()` et `STRAT`), déjà en place dans le fichier.

```ts
test("--dry-run n'émet aucune écriture", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur(), strategy: STRAT });
  const { out, code } = await runConsole(["update", "--site", "https://www.a.fr", "--dry-run"], d);
  expect(code).toBe(0);
  expect(calls.filter((a) => a.method === "PUT" || a.method === "POST")).toHaveLength(0);
  // Les lectures nécessaires au calcul sont parties : sans elles, le dry-run serait décoratif.
  expect(calls.some((a) => a.url.includes("/webmasters/v3/sites"))).toBe(true);
  expect(calls.some((a) => a.url.includes("GetUserSites"))).toBe(true);
  // Le contrôle de la clé IndexNow est une lecture : il se joue aussi en simulation (D54).
  expect(calls.some((a) => a.url.endsWith("/clepublique.txt"))).toBe(true);
  expect(out).toContain("simulation");
});

test("--url pinge ces URL seules et ne soumet aucun sitemap", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur(), strategy: STRAT });
  const { out, code } = await runConsole(
    ["update", "--site", "https://www.a.fr", "--url", "https://www.a.fr/article"], d,
  );
  expect(code).toBe(0);
  expect(calls.filter((a) => a.method === "PUT")).toHaveLength(0);
  expect(calls.filter((a) => a.url.includes("SubmitFeed"))).toHaveLength(0);
  const post = calls.find((a) => a.url === "https://api.indexnow.org/indexnow");
  expect(JSON.parse(post!.body!).urlList).toEqual(["https://www.a.fr/article"]);
  expect(out).not.toContain("google");
});

test("--url sans clé Bing n'écrit aucune ligne bing", async () => {
  // Sans cette variante, une ligne « bing : non interrogé (clé absente) » passerait inaperçue
  // en mode --url, où aucun sitemap n'est soumis et où Bing n'a donc rien à dire (D55, AC-4).
  const { deps: d } = deps({ fetcher: serveur(), strategy: STRAT, key: null });
  const { out } = await runConsole(["update", "--site", "https://www.a.fr", "--url", "https://www.a.fr/x"], d);
  expect(out).not.toContain("bing");
  expect(out).not.toContain("google");
});

test("--url refuse une URL hors origine sans appeler personne", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur(), strategy: STRAT });
  const { out, code } = await runConsole(
    ["update", "--site", "https://www.a.fr", "--url", "https://autre.fr/x"], d,
  );
  expect(code).toBe(1);
  expect(out).toContain("autre.fr");
  expect(calls.some((u) => u.url === "https://api.indexnow.org/indexnow")).toBe(false);
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console
```

Attendu : ÉCHEC. `--dry-run` et `--url` sont ignorés, donc les écritures partent.

- [ ] **Step 3: Extraire les deux drapeaux**

Au début de la branche `update`, avant la résolution du site. Remplacer le `const simule = false;` que T4 avait posé en attendant :

```ts
    const simule = rest.includes("--dry-run");
    const urlsDemandees: string[] = [];
    for (let k = 0; k < rest.length; k++) {
      if (rest[k] !== "--url") continue;
      if (!rest[k + 1]) return { out: "--url attend une URL en argument", code: 1 };
      urlsDemandees.push(rest[k + 1]);
      k++;
    }
```

`--site` étant lu par `rest.indexOf("--site")`, l'ordre des drapeaux reste libre.

- [ ] **Step 4: Court-circuiter le sitemap quand `--url` est là**

Remplacer le bloc posé en T4 étape 6 (`const trouve = …` jusqu'à `const raisonSitemap`) par :

```ts
    // D55 : avec --url, aucune soumission de sitemap. Une URL hors origine est refusée ici plutôt
    // que d'aller chercher un 422 chez IndexNow.
    let sitemapUrl: string | null = null, urlsAPoster: string[] = [], deplacees = 0, raisonSitemap: string | null = null;
    if (urlsDemandees.length > 0) {
      const hors = urlsDemandees.filter((u) => { try { return new URL(u).origin !== origine; } catch { return true; } });
      if (hors.length > 0) return { out: `hors du site : ${hors.join(", ")}\n  IndexNow n'accepte que des URL sur ${origine}`, code: 1 };
      urlsAPoster = urlsDemandees;
    } else {
      const trouve = await trouverSitemap(d.fetcher, origine, declares);
      if (trouve.url === null) {
        raisonSitemap = trouve.raison;
        const view: UpdateView = { site, origine, sitemap: null, nbUrls: 0, deplacees: 0, raisonSitemap,
          google: null, googleRaison: null, bing: null, bingRaison: null, indexnow: null, indexnowRaison: null, simule };
        return done(view, renderUpdate(view), 1);
      }
      sitemapUrl = trouve.url;
      const r = urlsOnOrigin(trouve.urls, origine);
      urlsAPoster = r.urls;
      deplacees = r.moved;
    }
```

`raisonSitemap` n'est assignée que sur le chemin qui rend immédiatement : elle vaut donc toujours `null` dans la vue finale. C'est voulu et ce n'est pas une variable morte, la vue en a besoin dans les deux cas.

Puis englober les blocs Google et Bing dans `if (sitemapUrl) { … }`. **La déclaration entre dans le `if`, pas seulement l'initialisation** : sinon, en mode `--url` sans clé Bing, `bingNonApplicable` vaudrait `NOKEY` et la sortie porterait une ligne `bing : non interrogé (clé absente)` alors qu'aucun sitemap n'est soumis. Concrètement :

```ts
    let google: ActionResult | null = null, googleRaison: string | null = null;
    let bing: ActionResult | null = null, bingRaison: string | null = null, bingNonApplicable: string | null = null;
    if (sitemapUrl) {
      const [a, authErr] = await auth();
      // … le bloc Google de T4 étape 6, inchangé …
      bingNonApplicable = key ? null : NOKEY;
      if (key) { /* … le bloc Bing de T4 étape 6, inchangé … */ }
    }
```

- [ ] **Step 5: Court-circuiter les trois écritures en simulation**

Chacune des trois soumissions devient, sur le même modèle. Le message simulé est **au futur** : `renderUpdate` ne préfixe rien, il dit seulement « mode : simulation » en tête, et un message au passé y donnerait une sortie qui ment sur ce qui s'est passé.

```ts
        google = simule
          ? { ok: true, status: 0, message: `le sitemap ${sitemapUrl} partira vers ${p.siteUrl}` }
          : await submitSitemapGoogle(d.fetcher, a, p.siteUrl, sitemapUrl);
```

```ts
        bing = simule
          ? { ok: true, status: 0, message: `le sitemap ${sitemapUrl} partira pour ${s.Url}` }
          : await bingSubmitFeed(d.fetcher, key, s.Url, sitemapUrl);
```

```ts
        indexnow = simule
          ? { ok: true, status: 0, message: `${urlsAPoster.length} URL partiront vers IndexNow`, urls: urlsAPoster.length }
          : await pingIndexNow(d.fetcher, { host: new URL(origine).host, key: cle, urls: urlsAPoster });
```

Le contrôle de clé IndexNow (`verifierCleServie`) **reste joué en simulation** : c'est une lecture, et c'est exactement le contrôle qu'un dry-run doit exercer. Les lectures Google (`listProperties`) et Bing (`bingUserSites`) restent jouées pour la même raison : sans elles, le dry-run ne saurait pas dire vers quelle propriété le sitemap partirait, et il serait décoratif.

- [ ] **Step 6: Vérifier que les tests passent**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
```

Attendu : tout vert.

- [ ] **Step 7: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/skills/console/
git commit -m "feat(console): update --url et --dry-run

--url pinge des pages precises sans toucher aux sitemaps (D55), refuse
localement une URL hors origine, et n ecrit aucune ligne google ni bing.
--dry-run joue toutes les lectures, controle de la cle IndexNow compris,
et n emet aucune ecriture (AC-1). Les messages simules sont au futur."
```

