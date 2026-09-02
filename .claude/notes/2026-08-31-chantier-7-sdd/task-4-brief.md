## Task 4: La commande `console update`, chemin nominal

**Files:**
- Modify: `plugin/skills/console/scripts/console.ts` (branche `update`, `defaultFetcher` qui rend `final`)
- Modify: `plugin/skills/console/scripts/lib/render.ts` (`renderUpdate`, `UpdateView`)
- Test: `plugin/skills/console/scripts/tests/console-cli.test.ts`, `plugin/skills/console/scripts/tests/render.test.ts`

**Interfaces:**
- Consumes: tout T3, plus `listProperties` et `resolveProperty` et `resolveBingSite` déjà utilisés par les autres commandes.
- Produces: `type UpdateView`, `renderUpdate(v: UpdateView): string`.

- [ ] **Step 1: Étendre le helper `deps()` des tests, sans toucher à ses lignes existantes**

`console-cli.test.ts:12` porte déjà un helper `deps()`. Il prend **un seul argument objet** et rend `{ calls, deps }`, pas un objet `Deps` directement. Les tests neufs l'utilisent donc comme les anciens : `const { deps: d, calls } = deps({…}); await runConsole([…], d);`.

Il lui manque deux choses pour `update` : injecter un fetcher complet, et injecter une `seo/strategy.md` (il rend `readStrategy: async () => null` en dur, ce qui laisserait la clé IndexNow toujours nulle et ferait taire tous les tests de POST).

Trois ajouts, aucune ligne existante modifiée :

```ts
type Call = { url: string; method: string; body?: string };
```

Puis deux champs dans `opts` :

```ts
  fetcher?: (url: string, init?: { method?: string; body?: string }) => Promise<{ status: number; text: string; final?: string }>;
  strategy?: string | null;
```

Puis, dans l'objet rendu, le fetcher injecté reste enregistré dans `calls` et la stratégie devient injectable :

```ts
  return {
    calls,
    deps: {
      fetcher: opts.fetcher
        ? async (url: string, init: { method?: string; body?: string } = {}) => {
            calls.push({ url, method: init.method ?? "GET", body: init.body });
            return opts.fetcher!(url, init);
          }
        : fetcher,
      env: { /* inchangé */ },
      gcloud: async () => "ya29.JETON-SECRET",
      serviceAccount: async () => "sa.FAUX",
      readStrategy: async () => opts.strategy ?? null,
    },
  };
```

**Ne pas recopier la ligne `env:` ni la constante `KEY` à la main.** Le fichier porte une clé de test dont la valeur est masquée à l'affichage par la machine : ce qui s'affiche est `[REDACTED:env_secret]`, et le recopier écrirait le masque dans le source. Laisser ces lignes exactement où elles sont.

La stratégie de test se dérive d'une fixture réelle, jamais écrite à la main, en y remplaçant la clé par une valeur non hexadécimale :

```ts
// La fixture porte une vraie clé de 32 caractères hexadécimaux, que la machine masque à la lecture.
// On ne la lit jamais : on la remplace par une valeur reconnaissable, valide au regard du lint
// (8 à 128 caractères, lettres, chiffres, tirets).
const STRAT = (await Bun.file(`${import.meta.dir}/../../../../checklist/scripts/tests/fixtures/chico/strategy.md`).text())
  .replace(/^IndexNow : .*$/m, "IndexNow : clepublique");
```

- [ ] **Step 2: Écrire les tests qui échouent**

Ajouter à `plugin/skills/console/scripts/tests/console-cli.test.ts`, dans le style des tests existants :

Le faux serveur est écrit une fois et paramétré, plutôt que recopié quatre fois. `calls` vient du helper : il enregistre déjà url, méthode et corps, il n'y a pas de second journal à tenir.

```ts
/** Faux serveur des quatre tests d'update. Chaque option force un refus, le reste répond juste. */
function serveur(o: { putStatus?: number; robots?: string; sitemapStatus?: number; cleServie?: string } = {}) {
  return async (url: string, init: { method?: string; body?: string } = {}) => {
    if (url.endsWith("/robots.txt")) return { status: 200, text: o.robots ?? "Sitemap: https://www.a.fr/sitemap.xml", final: "https://www.a.fr/robots.txt" };
    if (url === "https://www.a.fr/sitemap.xml") return { status: o.sitemapStatus ?? 200, text: o.sitemapStatus ? "" : '<urlset><url><loc>https://www.a.fr/</loc></url></urlset>' };
    if (url.includes("/sitemaps/")) return { status: o.putStatus ?? 204, text: o.putStatus ? '{"error":{"details":[{"reason":"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}]}}' : "" };
    if (url.includes("/webmasters/v3/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "https://www.a.fr/", permissionLevel: "siteOwner" }] }) };
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://www.a.fr/", IsVerified: true }] }) };
    if (url.includes("SubmitFeed")) return { status: 200, text: '{"d":null}' };
    if (url === "https://api.indexnow.org/indexnow") return { status: 202, text: "" };
    if (url.endsWith(".txt")) return { status: 200, text: o.cleServie ?? "clepublique" };
    return { status: 404, text: "" };
  };
}

test("update soumet aux deux moteurs et poste les URL", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur(), strategy: STRAT });
  const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
  expect(code).toBe(0);
  expect(calls.filter((a) => a.method === "PUT")).toHaveLength(1);
  expect(calls.filter((a) => a.url === "https://api.indexnow.org/indexnow")).toHaveLength(1);
  expect(calls.filter((a) => a.url.includes("SubmitFeed"))).toHaveLength(1);
});

test("un échec Google n'empêche ni Bing ni IndexNow, et vaut 1", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur({ putStatus: 403 }), strategy: STRAT });
  const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
  expect(code).toBe(1);
  expect(out).toContain("gcloud auth application-default login");
  expect(calls.filter((a) => a.url.includes("SubmitFeed"))).toHaveLength(1);
  expect(calls.filter((a) => a.url === "https://api.indexnow.org/indexnow")).toHaveLength(1);
});

test("sans clé Bing, la ligne bing dit sa raison et le code reste 0", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur(), strategy: STRAT, key: null });
  const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
  expect(code).toBe(0);
  expect(out).toContain("non interrogé");
  expect(calls.filter((a) => a.url.includes("SubmitFeed"))).toHaveLength(0);
});

test("une clé IndexNow différente de celle servie est un échec, pas un non applicable", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur({ cleServie: "uneautrecle" }), strategy: STRAT });
  const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
  expect(code).toBe(1);
  expect(out).toContain("uneautrecle");
  expect(calls.filter((a) => a.url === "https://api.indexnow.org/indexnow")).toHaveLength(0);
});

test("aucun sitemap trouvé : rien n'est soumis, code 1", async () => {
  const { deps: d, calls } = deps({ fetcher: serveur({ robots: "User-agent: *", sitemapStatus: 404 }), strategy: STRAT });
  const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
  expect(code).toBe(1);
  expect(out).toContain("aucun sitemap");
  expect(calls.filter((a) => a.method === "PUT" || a.method === "POST")).toHaveLength(0);
});
```

Ces cinq tests sont normatifs et se transcrivent tels quels. Le quatrième couvre D57 sur le point que la spec crée exprès : une clé IndexNow servie mais différente de celle déclarée est un **échec**, pas un cas non applicable.

- [ ] **Step 3: Vérifier que les tests échouent**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console
```

Attendu : ÉCHEC, `update` tombe sur le message d'usage.

- [ ] **Step 4: Ajouter la vue et son rendu**

Dans `plugin/skills/console/scripts/lib/render.ts`, ajouter le type et la fonction. `renderUpdate` est **pur** et suit les règles du fichier : une ligne par fait, jamais de tableau, un champ absent ne s'affiche pas.

```ts
export type UpdateView = {
  site: string; origine: string; sitemap: string | null; nbUrls: number; deplacees: number;
  raisonSitemap: string | null;
  google: ActionResult | null; googleRaison: string | null;
  bing: ActionResult | null; bingRaison: string | null;
  indexnow: ActionResult | null; indexnowRaison: string | null;
  simule: boolean;
};

export function renderUpdate(v: UpdateView): string {
  const out: string[] = [];
  out.push(`site      : ${v.origine}${v.origine !== v.site ? ` (demandé : ${v.site})` : ""}`);
  // La simulation se dit une fois, en tête. Le temps du verbe vit dans le message de chaque soumission :
  // un préfixe « partirait » collé devant un message au passé donnerait « partirait : sitemap soumis ».
  if (v.simule) out.push("mode      : simulation, aucune écriture ne part");
  if (v.sitemap) {
    const bouge = v.deplacees > 0 ? `, ${v.deplacees} ramenée(s) sur l'origine servie` : "";
    out.push(`sitemap   : ${v.sitemap} (${v.nbUrls} URL${bouge})`);
  } else if (v.raisonSitemap) out.push(`sitemap   : ${v.raisonSitemap}`);
  const ligne = (nom: string, r: ActionResult | null, raison: string | null) => {
    if (raison) return `${nom} : ${raison}`;
    if (!r) return null;
    return `${nom} : ${r.message}`;
  };
  for (const [nom, r, raison] of [
    ["google  ", v.google, v.googleRaison],
    ["bing    ", v.bing, v.bingRaison],
    ["indexnow", v.indexnow, v.indexnowRaison],
  ] as const) {
    const l = ligne(nom, r, raison);
    if (l) out.push(l);
  }
  return out.join("\n");
}
```

`ActionResult` s'importe depuis `../../../../lib/soumission`.

- [ ] **Step 5: Tester `renderUpdate` et l'inscrire au filet anti tiret cadratin**

`renderUpdate` est une fonction pure exportée à sept branches. Les tests CLI ne l'exercent qu'indirectement, et `render.test.ts:245` porte un filet dont le commentaire dit pourquoi il est manuel : « Le filet doit voir chaque chaîne littérale de `render.ts` au moins une fois : sinon un tiret injecté dans une branche non exercée passerait la suite sans être vu. » Un quatrième renderer qui n'entre pas dans le tableau `sorties` sort du filet.

Ajouter à `plugin/skills/console/scripts/tests/render.test.ts` :

```ts
const vueMinimale = {
  site: "https://a.fr", origine: "https://www.a.fr", sitemap: null, nbUrls: 0, deplacees: 0,
  raisonSitemap: null, google: null, googleRaison: null, bing: null, bingRaison: null,
  indexnow: null, indexnowRaison: null, simule: false,
};
const ok = (message: string) => ({ ok: true, status: 200, message });

test("renderUpdate : une ligne par soumission, aucune ligne vide", () => {
  const out = renderUpdate({
    ...vueMinimale, sitemap: "https://www.a.fr/sitemap.xml", nbUrls: 10, deplacees: 2,
    google: ok("sitemap soumis à sc-domain:a.fr"), bing: ok("sitemap soumis pour https://a.fr/"),
    indexnow: { ok: true, status: 202, message: "Accepted", urls: 10 },
  });
  expect(out).toContain("sitemap   : https://www.a.fr/sitemap.xml (10 URL, 2 ramenée(s)");
  expect(out).toContain("(demandé : https://a.fr)");
  expect(out.split("\n").filter((l) => l.trim().endsWith(":"))).toHaveLength(0);
});

test("renderUpdate : un moteur muet écrit sa raison, jamais un blanc", () => {
  const out = renderUpdate({ ...vueMinimale, sitemap: "https://www.a.fr/sitemap.xml", nbUrls: 1,
    google: ok("soumis"), bingRaison: "non interrogé (clé absente)" });
  expect(out).toContain("non interrogé (clé absente)");
  expect(out).not.toContain("indexnow");
});

test("renderUpdate : sans sitemap, la raison remplace la ligne et aucun moteur n'apparaît", () => {
  const out = renderUpdate({ ...vueMinimale, raisonSitemap: "aucun sitemap trouvé : ni déclaré dans …" });
  expect(out).toContain("aucun sitemap trouvé");
  expect(out).not.toContain("google");
});

test("renderUpdate : en simulation, rien n'est annoncé au passé", () => {
  const out = renderUpdate({ ...vueMinimale, simule: true, sitemap: "https://www.a.fr/sitemap.xml", nbUrls: 1,
    google: ok("le sitemap https://www.a.fr/sitemap.xml partira vers sc-domain:a.fr") });
  expect(out).toContain("partira");
  expect(out).not.toContain("soumis");
});
```

Puis inscrire ces quatre sorties dans le filet, en les nommant et en les poussant dans le tableau `sorties` de `render.test.ts:245`. Sans cette inscription, la contrainte anti tiret cadratin cesse de couvrir le code neuf : il n'y a pas de linter dans ce dépôt, l'interdiction est portée par des assertions dispersées, chacune sur son fichier.

- [ ] **Step 6: Écrire la branche `update`**

Dans `plugin/skills/console/scripts/console.ts`, ajouter avant le `return { out: USAGE, code: 1 }` final. Le bloc réutilise le `reason()`, le `done()` et le `auth()` déjà en place dans `runConsole` :

```ts
  if (cmd === "update") {
    const i = rest.indexOf("--site");
    if (i >= 0 && !rest[i + 1]) return { out: "--site attend une URL en argument", code: 1 };
    let site = i >= 0 ? rest[i + 1] : undefined;

    // La stratégie se lit une fois : elle donne le site et la clé IndexNow. Une stratégie présente mais
    // invalide n'est pas une stratégie absente, et le dire évite de chercher un fichier qui existe déjà :
    // c'est le motif de `crawl` (console.ts:134), on ne le contredit pas d'une commande à l'autre.
    const md = await d.readStrategy();
    let strategie: ReturnType<typeof parseStrategy> | null = null;
    let raisonStrategie: string | null = null;
    if (md) {
      try { strategie = parseStrategy(md); }
      catch (e) { raisonStrategie = `seo/strategy.md est présent mais ne s'analyse pas :\n  ${reason(e)}`; }
    }
    if (!site) site = strategie?.site;
    if (!site) return { out: raisonStrategie ?? "aucun site : lance depuis un dossier qui a seo/strategy.md, ou passe --site <url>", code: 1 };

    let demandee: string;
    try { demandee = new URL(site.startsWith("http") ? site : `https://${site}`).origin; }
    catch { return { out: `« ${site} » n'est pas une URL valide. Exemple : console update --site https://exemple.fr`, code: 1 }; }

    // L'origine réellement servie vient de la chaîne de redirections du robots.txt (D53) : un site peut
    // déclarer l'apex partout et servir le www, et c'est l'origine finale qui vaut pour IndexNow.
    // Le même GET donne les directives Sitemap: ; elles sont passées à trouverSitemap, qui ne relit rien.
    const sonde = await d.fetcher(`${demandee}/robots.txt`);
    let origine = demandee;
    if (sonde.final) { try { origine = new URL(sonde.final).origin; } catch { /* on garde l'origine demandée */ } }
    const declares = sonde.status === 200 ? sitemapsFromRobots(sonde.text) : [];

    const trouve = await trouverSitemap(d.fetcher, origine, declares);
    if (trouve.url === null) {
      const view: UpdateView = { site, origine, sitemap: null, nbUrls: 0, deplacees: 0, raisonSitemap: trouve.raison,
        google: null, googleRaison: null, bing: null, bingRaison: null, indexnow: null, indexnowRaison: null, simule: false };
      return done(view, renderUpdate(view), 1);
    }
    const ramenees = urlsOnOrigin(trouve.urls, origine);

    // D57 distingue deux sortes de silence, et le code de sortie ne compte que la seconde.
    // « Non applicable » est une liste fermée de trois cas, reprise mot pour mot de la spec : clé Bing
    // absente, site hors du compte Bing, pas de clé IndexNow dans la stratégie. Tout le reste est un
    // échec, y compris une clé IndexNow servie mais différente (D54 existe pour attraper ce cas précis)
    // et l'absence de propriété Search Console. `console sites` et `console crawl` rendent déjà 1
    // quand le moteur visé n'a rien pu dire : cette commande ne se comporte pas autrement.
    let google: ActionResult | null = null, googleRaison: string | null = null;
    const [a, authErr] = await auth();
    if (!a) googleRaison = authErr;
    else {
      try {
        const props = await listProperties(d.fetcher, a);
        const p = resolveProperty(origine, props);
        if (!p) googleRaison = "aucune propriété Search Console ne couvre ce site. Lance `console sites`.";
        else google = await submitSitemapGoogle(d.fetcher, a, p.siteUrl, sitemapUrl);
      } catch (e) { googleRaison = reason(e); }
    }

    let bing: ActionResult | null = null, bingRaison: string | null = null, bingNonApplicable: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const sites = await bingUserSites(d.fetcher, key);
        const s = resolveBingSite(new URL(origine).hostname, sites);
        if (!s) bingNonApplicable = sites.length === 0 ? COMPTE_VIDE : HOTE_ABSENT;
        else bing = await bingSubmitFeed(d.fetcher, key, s.Url, sitemapUrl);
      } catch (e) { bingRaison = reason(e); }
    }

    let indexnow: ActionResult | null = null, indexnowRaison: string | null = null, indexnowNonApplicable: string | null = null;
    const cle = strategie?.indexnow ?? null;
    if (!cle) indexnowNonApplicable = "pas de clé IndexNow dans seo/strategy.md (Cadence de fraîcheur, IndexNow : non)";
    else {
      try {
        const servie = await verifierCleServie(d.fetcher, origine, cle);
        if (!servie.ok) indexnowRaison = servie.message;
        else indexnow = await pingIndexNow(d.fetcher, { host: new URL(origine).host, key: cle, urls: urlsAPoster });
      } catch (e) { indexnowRaison = reason(e); }
    }

    const view: UpdateView = {
      site, origine, sitemap: sitemapUrl, nbUrls: urlsAPoster.length, deplacees, raisonSitemap,
      google, googleRaison,
      bing, bingRaison: bingRaison ?? bingNonApplicable,
      indexnow, indexnowRaison: indexnowRaison ?? indexnowNonApplicable,
      simule,
    };
    const echecs =
      [google, bing, indexnow].filter((r) => r !== null && !r.ok).length +
      [googleRaison, bingRaison, indexnowRaison].filter((r) => r !== null).length;
    return done(view, renderUpdate(view), echecs > 0 ? 1 : 0);
  }
```

Note pour l'implémenteur : `sitemapUrl`, `urlsAPoster`, `deplacees`, `raisonSitemap` et `simule` sont introduits par T5. En T4, les poser juste après `trouverSitemap` suffit :

```ts
    const simule = false; // T5 le branche sur --dry-run
    const trouve = await trouverSitemap(d.fetcher, origine, declares);
    if (trouve.url === null) { /* le bloc de sortie ci-dessus */ }
    const sitemapUrl = trouve.url;
    const r = urlsOnOrigin(trouve.urls, origine);
    const urlsAPoster = r.urls, deplacees = r.moved;
    const raisonSitemap: string | null = null;
```

Ajouter en tête de fichier les imports. **`bingUserSites` n'y est pas, et ce n'est pas un oubli** : `console.ts:6` l'importe déjà depuis `lib/bing`, et un second import du même nom au niveau module relierait silencieusement tout le fichier à l'autre implémentation, changeant le comportement des trois commandes déjà recettées sans qu'aucun test ne rougisse (voir la table en tête de T3).

```ts
import { trouverSitemap, sitemapsFromRobots, urlsOnOrigin, verifierCleServie, submitSitemapGoogle, pingIndexNow, bingSubmitFeed, type ActionResult } from "../../../lib/soumission";
import { renderUpdate, type UpdateView } from "./lib/render";
```

Vérification après écriture, un identifiant ne doit être importé qu'une fois :

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && command grep -n "^import" skills/console/scripts/console.ts | command grep -c "bingUserSites"
```

Attendu : `1`.

Mettre à jour `USAGE` :

```ts
const USAGE = "usage : console sites | console inspect <url> | console crawl [--site <url>] | console update [--site <url>] [--url <u>]... [--dry-run]   [--json]";
```

Et corriger le commentaire de tête, qui affirme aujourd'hui le contraire :

```ts
// Le verbe console : trois lectures et une écriture, update (D50, chantier 7 ; D30 est remplacée).
```

- [ ] **Step 7: Faire remonter l'URL finale au fetcher réel**

Dans le bloc `import.meta.main` de `console.ts`, ajouter `final` au retour du `defaultFetcher` :

```ts
      return { status: res.status, text: await res.text(), final: res.url };
```

`res.url` porte l'URL après redirections : c'est ce qui donne l'origine réellement servie sans requête supplémentaire.

- [ ] **Step 8: Vérifier que les tests passent**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
```

Attendu : tout vert.

- [ ] **Step 9: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/skills/console/
git commit -m "feat(console): la commande update, sitemap aux deux moteurs et POST IndexNow

D50 : console n est plus en lecture seule. L origine servie vient de la chaine
de redirections du robots.txt (D53), la cle IndexNow est verifiee servie avant
tout envoi (D54). Un moteur en panne n arrete pas les autres, et un non
applicable ne teinte pas le code de sortie (D57)."
```

---

