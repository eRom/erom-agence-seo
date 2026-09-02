## Task 3: Le module commun des trois soumissions

**Files:**
- Create: `plugin/lib/soumission.ts`
- Modify: `plugin/skills/checklist/scripts/lib/actions.ts` (réduit à un réexport)
- Modify: `plugin/skills/checklist/scripts/lib/checklist.ts` (importer `ActionResult` du commun)
- Test: `plugin/lib/tests/soumission.test.ts`

**Interfaces:**
- Consumes: `submitSitemap` et `Fetcher` de T2, `parseSitemap` et `sitemapCandidates` de T1, `rewriteToOrigin` de `lib/url.ts`, `BING_API_BASE`, `BING_ERROR_CODES`, `redact` de `lib/bing.ts`.
- Produces:
  - `type ActionResult = { ok: boolean; status: number; message: string; urls?: number }`
  - `sitemapsFromRobots(txt: string): string[]`
  - `urlsOnOrigin(urls: string[], origin: string): { urls: string[]; moved: number }` (déménagé, signature inchangée)
  - `pingIndexNow(f, p: { host: string; key: string; urls: string[] }): Promise<ActionResult>` (déménagé, signature inchangée)
  - `bingUserSites(f, key: string): Promise<BingSite[]>` (déménagé, signature inchangée)
  - `bingSubmitFeed(f, key: string, siteUrl: string, feedUrl: string): Promise<ActionResult>` (déménagé, signature inchangée)
  - `bingError(status: number, text: string, key: string): string` (déménagé, signature inchangée)
  - `submitSitemapGoogle(f, auth: GoogleAuth, siteUrl: string, feedUrl: string): Promise<ActionResult>`
  - `verifierCleServie(f, origin: string, key: string): Promise<ActionResult>`
  - `trouverSitemap(f, origine: string): Promise<{ url: string; urls: string[] } | { url: null; raison: string }>`
  - `defaultFetcher`, `INDEXNOW_ENDPOINT`, `INDEXNOW_MESSAGES`, `redact` (réexportés)

**Convention externe, échantillon.** Le corps IndexNow et celui de `SubmitFeed` sont repris **tels quels** du code existant, lui-même figé sur les exemples officiels capturés par curl le 29/08 (`docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md`, sections 3.1 et 3.2) et confirmé en production le 29/08 (HTTP 202, 10 URL sur `www.commentchercherbonheur.org`). Aucun octet n'est réécrit de mémoire.

**Une duplication assumée, à écrire noir sur blanc.** `bingUserSites` existe déjà dans `plugin/lib/bing.ts:62`, et la version d'`actions.ts` que cette tâche déménage n'est pas la même :

| | `lib/bing.ts:62` | `actions.ts:70`, déménagé ici |
|---|---|---|
| HTTP 200 portant `{"ErrorCode":3}` | lève une `BingError` nommée, avec sa consigne | ne lit pas `ErrorCode`, lève « réponse sans tableau d » |
| type de l'erreur | `BingError` (code et `hint`) | `Error` nu, sans consigne |

Le déménagement les laisse toutes les deux, et c'est délibéré : les fusionner changerait le comportement de `checklist`, dont les 44 tests doivent passer sans qu'une assertion bouge (AC-6). Deux conséquences à tenir dans les tâches suivantes :

- **T4 n'importe jamais `bingUserSites` depuis `lib/soumission`.** `console.ts:6` l'importe déjà de `lib/bing`, et un second import du même nom au niveau module ne produit **aucune erreur** sous bun : il relie silencieusement tout le fichier au dernier import. Les trois commandes déjà recettées basculeraient sur l'autre implémentation et perdraient le message « la clé de ~/.zshenv n'est plus acceptée par Bing », sans qu'un seul test rougisse.
- La convergence des deux fonctions est une dette, consignée en T8 étape 9 dans `_memory_/gotchas.md`, à traiter dans un chantier qui pourra toucher aux tests de `checklist`.

- [ ] **Step 1: Écrire les tests des fonctions neuves**

Créer `plugin/lib/tests/soumission.test.ts` :

```ts
import { test, expect } from "bun:test";
import { sitemapsFromRobots, verifierCleServie, submitSitemapGoogle, trouverSitemap } from "../soumission";

const auth = { token: "jeton-de-test-non-hex", quotaProject: "projet-test", provider: "gcloud" as const };

test("sitemapsFromRobots lit les directives, ignore le reste", () => {
  expect(sitemapsFromRobots("Sitemap: https://a.fr/sitemap.xml")).toEqual(["https://a.fr/sitemap.xml"]);
  expect(sitemapsFromRobots("  SITEMAP :  https://a.fr/s.xml  ")).toEqual(["https://a.fr/s.xml"]);
  expect(sitemapsFromRobots("User-agent: *\nDisallow: /x\n\nSitemap: https://a.fr/1.xml\nSitemap: https://a.fr/2.xml"))
    .toEqual(["https://a.fr/1.xml", "https://a.fr/2.xml"]);
  expect(sitemapsFromRobots("Sitemap: https://a.fr/s.xml\nSitemap: https://a.fr/s.xml")).toEqual(["https://a.fr/s.xml"]);
  expect(sitemapsFromRobots("Sitemap: /relatif.xml")).toEqual([]);
  expect(sitemapsFromRobots("# Sitemap: https://a.fr/commente.xml")).toEqual([]);
  expect(sitemapsFromRobots("User-agent: *\nDisallow:")).toEqual([]);
  // Le protocole robots.txt admet un commentaire en fin de ligne : sans la clause (?:#.*)? de la
  // regex, l'ancre \s*$ ne matche plus et la directive est perdue en silence.
  expect(sitemapsFromRobots("Sitemap: https://a.fr/s.xml # le sitemap")).toEqual(["https://a.fr/s.xml"]);
});

test("verifierCleServie accepte la clé servie et nomme l'écart sinon", async () => {
  const servie = async () => ({ status: 200, text: "lacle\n" });
  expect((await verifierCleServie(servie, "https://a.fr", "lacle")).ok).toBe(true);

  const absente = async () => ({ status: 404, text: "" });
  const r404 = await verifierCleServie(absente, "https://a.fr", "lacle");
  expect(r404.ok).toBe(false);
  expect(r404.message).toContain("404");

  const autre = async () => ({ status: 200, text: "uneautrecle" });
  const rdiff = await verifierCleServie(autre, "https://a.fr", "lacle");
  expect(rdiff.ok).toBe(false);
  expect(rdiff.message).toContain("lacle");
  expect(rdiff.message).toContain("uneautrecle");
});

test("verifierCleServie interroge la clé à la racine de l'origine servie", async () => {
  let vue = "";
  const f = async (url: string) => { vue = url; return { status: 200, text: "lacle" }; };
  await verifierCleServie(f, "https://www.a.fr", "lacle");
  expect(vue).toBe("https://www.a.fr/lacle.txt");
});

test("submitSitemapGoogle traduit un refus en ActionResult au lieu de lever", async () => {
  const f = async () => ({ status: 403, text: JSON.stringify({ error: { details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } }) });
  const r = await submitSitemapGoogle(f, auth, "https://a.fr/", "https://a.fr/sitemap.xml");
  expect(r.ok).toBe(false);
  expect(r.message).toContain("gcloud auth application-default login");
});

test("trouverSitemap prend le robots d'abord, retombe sur /sitemap.xml", async () => {
  const xml = '<urlset><url><loc>https://a.fr/</loc></url><url><loc>https://a.fr/b</loc></url></urlset>';
  const avecRobots = async (url: string) =>
    url.endsWith("/robots.txt") ? { status: 200, text: "Sitemap: https://a.fr/perso.xml" }
    : url === "https://a.fr/perso.xml" ? { status: 200, text: xml }
    : { status: 404, text: "" };
  const r1 = await trouverSitemap(avecRobots, "https://a.fr");
  expect(r1.url).toBe("https://a.fr/perso.xml");
  expect((r1 as { urls: string[] }).urls).toEqual(["https://a.fr/", "https://a.fr/b"]);

  const sansRobots = async (url: string) =>
    url.endsWith("/sitemap.xml") ? { status: 200, text: xml } : { status: 404, text: "" };
  expect((await trouverSitemap(sansRobots, "https://a.fr")).url).toBe("https://a.fr/sitemap.xml");
});

test("trouverSitemap dit sa raison quand rien ne répond, sans inventer d'URL", async () => {
  const rien = async () => ({ status: 404, text: "" });
  const r = await trouverSitemap(rien, "https://a.fr");
  expect(r.url).toBeNull();
  expect((r as { raison: string }).raison).toContain("aucun sitemap");
});

test("trouverSitemap signale un 200 illisible plutôt que de le traiter comme vide", async () => {
  const html = async (url: string) => url.endsWith("/sitemap.xml") ? { status: 200, text: "<html>oups</html>" } : { status: 404, text: "" };
  const r = await trouverSitemap(html, "https://a.fr");
  expect(r.url).toBeNull();
  expect((r as { raison: string }).raison).toContain("illisible");
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test lib/tests/soumission.test.ts
```

Attendu : ÉCHEC, le module `../soumission` n'existe pas.

- [ ] **Step 3: Créer le module commun**

Créer `plugin/lib/soumission.ts`. Les quatre fonctions déménagées (`urlsOnOrigin`, `pingIndexNow`, `bingUserSites`, `bingSubmitFeed`, `bingError`) sont **copiées sans une modification** depuis `skills/checklist/scripts/lib/actions.ts`, y compris leurs commentaires. Seuls l'en-tête du fichier, les imports et les quatre fonctions neuves sont écrits ici :

```ts
// Les trois soumissions du plugin vers les moteurs, et elles seules (D52). Deux appelants et deux seulement :
// console update (le geste répétable) et checklist --agir (le rituel de lancement).
// Conventions figées sur les exemples officiels : docs/recherches/2026-08-29-checklist-indexnow-bing-gsc.md,
// sections 3.1 et 3.2, plus l'échantillon Google du 31/08 (spec du chantier 7, section 3.2).
import { rewriteToOrigin } from "./url";
import { BING_API_BASE, BING_ERROR_CODES, redact } from "./bing";
import { parseSitemap, sitemapCandidates } from "./sitemap";
import { submitSitemap, type Fetcher, type FetchInit } from "./gsc";
import type { GoogleAuth } from "./auth-google";

export type { Fetcher, FetchInit };
export { redact };

/** Le résultat d'une soumission, lisible sur une ligne. `urls` n'a de sens que pour IndexNow. */
export type ActionResult = { ok: boolean; status: number; message: string; urls?: number };
export type BingSite = { Url: string; IsVerified: boolean };

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const JSON_UTF8 = "application/json; charset=utf-8";

// [ici : INDEXNOW_MESSAGES, defaultFetcher, urlsOnOrigin, pingIndexNow, bingError, bingUserSites,
//  bingSubmitFeed, copiés à l'identique depuis skills/checklist/scripts/lib/actions.ts]

/** Les URL déclarées par `Sitemap:` dans un robots.txt, dans l'ordre du fichier, sans doublon. */
export function sitemapsFromRobots(txt: string): string[] {
  const out: string[] = [];
  for (const raw of txt.split("\n")) {
    const m = raw.match(/^\s*sitemap\s*:\s*(\S+)\s*(?:#.*)?$/i);
    if (!m) continue;
    let u: string;
    // Une directive relative est hors protocole : le sitemap doit être une URL absolue.
    try { u = new URL(m[1]).toString(); } catch { continue; }
    if (!out.includes(u)) out.push(u);
  }
  return out;
}

/**
 * Trouve le sitemap servi et ses URL. Ordre : ce que robots.txt déclare, puis /sitemap.xml,
 * puis /sitemap_index.xml (D53). Un index est suivi d'un niveau, pas plus.
 * Un 200 que parseSitemap ne reconnaît pas est signalé, jamais traité comme un sitemap vide :
 * soumettre un sitemap absent est une erreur qu'on découvre trois jours plus tard dans une console.
 */
export async function trouverSitemap(
  f: Fetcher,
  origine: string,
  declares?: string[],
): Promise<{ url: string; urls: string[] } | { url: null; raison: string }> {
  // `declares` évite un second GET quand l'appelant a déjà lu le robots.txt pour connaître
  // l'origine servie : c'est le cas de console update, qui le sonde pour suivre ses redirections.
  let liste = declares;
  if (liste === undefined) {
    const robots = await f(`${origine}/robots.txt`);
    liste = robots.status === 200 ? sitemapsFromRobots(robots.text) : [];
  }

  let illisible: string | null = null;
  for (const cand of sitemapCandidates(liste, origine)) {
    const r = await f(cand);
    if (r.status !== 200) continue;
    const p = parseSitemap(r.text);
    if (p.kind === "urlset") return { url: cand, urls: p.locs };
    if (p.kind === "index") {
      const urls: string[] = [];
      for (const enfant of p.locs.slice(0, 3)) {
        const c = await f(enfant);
        if (c.status === 200) urls.push(...parseSitemap(c.text).locs);
      }
      if (urls.length > 0) return { url: cand, urls };
    }
    illisible ??= cand;
  }
  return {
    url: null,
    raison: illisible
      ? `sitemap illisible : ${illisible} répond 200 mais n'est ni un urlset ni un index (compressé en .gz ?)`
      : `aucun sitemap trouvé : ni déclaré dans ${origine}/robots.txt, ni servi en /sitemap.xml ou /sitemap_index.xml`,
  };
}

/**
 * La clé IndexNow doit être servie à la racine avant tout envoi (D54), sinon le POST rend 403
 * (« key not found, file found but key not in the file ») après un aller-retour inutile.
 * La clé IndexNow est publique par construction : elle s'affiche, c'est même tout son mécanisme.
 */
export async function verifierCleServie(f: Fetcher, origine: string, key: string): Promise<ActionResult> {
  const url = `${origine}/${key}.txt`;
  const r = await f(url);
  if (r.status !== 200) return { ok: false, status: r.status, message: `clé IndexNow non servie : ${url} répond ${r.status}` };
  const servie = r.text.trim();
  if (servie !== key) {
    return { ok: false, status: 200, message: `clé IndexNow différente : ${url} sert « ${servie} », seo/strategy.md déclare « ${key} »` };
  }
  return { ok: true, status: 200, message: `clé IndexNow servie en ${url}` };
}

/** L'écriture Google, traduite en ActionResult comme ses deux voisines : un refus se lit, il n'interrompt pas. */
export async function submitSitemapGoogle(f: Fetcher, auth: GoogleAuth, siteUrl: string, feedUrl: string): Promise<ActionResult> {
  try {
    await submitSitemap(f, auth, siteUrl, feedUrl);
    return { ok: true, status: 204, message: `sitemap ${feedUrl} soumis à ${siteUrl}` };
  } catch (e) {
    const hint = (e as { hint?: string }).hint;
    const status = (e as { status?: number }).status ?? 0;
    return { ok: false, status, message: `${e instanceof Error ? e.message : String(e)}${hint ? `\n  ${hint.split("\n").join("\n  ")}` : ""}` };
  }
}
```

- [ ] **Step 4: Réduire actions.ts à un réexport**

Remplacer **tout** le contenu de `plugin/skills/checklist/scripts/lib/actions.ts` par :

```ts
// Les deux écritures de la checklist ont déménagé dans plugin/lib/soumission.ts (D52, chantier 7) :
// console update les appelle aussi, et un seul endroit du code écrit vers un moteur.
// Ce fichier reste pour que les appelants et les tests de la skill gardent leur import inchangé.
export {
  defaultFetcher, urlsOnOrigin, pingIndexNow, bingError, bingUserSites, bingSubmitFeed, redact,
  INDEXNOW_ENDPOINT, INDEXNOW_MESSAGES,
} from "../../../../lib/soumission";
export type { Fetcher, FetchInit, ActionResult } from "../../../../lib/soumission";
```

Dans `plugin/skills/checklist/scripts/lib/checklist.ts`, remplacer la définition locale de `ActionResult` (ligne 113) par un import, en gardant `BingSite` tel quel :

```ts
import type { ActionResult } from "../../../../lib/soumission";
export type { ActionResult };
```

- [ ] **Step 5: Corriger le commentaire de `lib/bing.ts` qui devient faux**

`plugin/lib/bing.ts`, lignes 2 et 3, affirment aujourd'hui :

```ts
// Aucune écriture (D30) : SubmitFeed et SubmitUrlBatch ne sont pas ici, elles restent dans
// skills/checklist/scripts/lib/actions.ts, seul endroit du plugin qui écrit vers l'extérieur.
```

C'est exactement la phrase que D52 remplace. Elle devient :

```ts
// Aucune écriture ici : SubmitFeed vit dans lib/soumission.ts (D52, chantier 7), seul endroit du
// plugin qui écrit vers un moteur, appelé par console update et par checklist --agir.
// Ce module garde les lectures Bing, le transport et la table des codes d'erreur.
```

Note pour l'implémenteur : ce fichier porte aussi un `bingUserSites` qui n'est **pas** celui déménagé dans `lib/soumission.ts` (voir la table en tête de tâche). Ne pas les fusionner, ne pas en supprimer un.

- [ ] **Step 6: Vérifier que tout passe, tests de la checklist compris**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
```

Attendu : tout vert. **Les 44 tests de `skills/checklist` doivent passer sans qu'une seule de leurs assertions ait été touchée** (AC-6). Si l'un d'eux échoue, la copie de l'étape 3 a dérivé de l'original : la corriger, ne jamais ajuster le test.

- [ ] **Step 7: Vérifier que le commun ne dépend d'aucune skill**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && command grep -rn 'from "\.\./skills\|from "\./skills\|skills/' plugin/lib/*.ts ; echo "exit $?"
```

Attendu : aucune ligne (`exit 1`). Une ligne trouvée casse la règle du commun.

- [ ] **Step 8: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/lib/soumission.ts plugin/lib/tests/soumission.test.ts plugin/lib/bing.ts plugin/skills/checklist/scripts/lib/actions.ts plugin/skills/checklist/scripts/lib/checklist.ts
git commit -m "feat(lib): reunir les trois soumissions dans lib/soumission.ts

D52 : un seul endroit du code ecrit vers un moteur, deux appelants.
actions.ts devient un reexport, les 44 tests de checklist passent sans
qu une assertion change (AC-6). Neuf : sitemapsFromRobots, trouverSitemap,
verifierCleServie, submitSitemapGoogle."
```

---

