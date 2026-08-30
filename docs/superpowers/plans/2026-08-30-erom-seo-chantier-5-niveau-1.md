# Audit niveau 1 (chantier 5 étape 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ajouter le niveau 1 à l'audit `erom-seo` : quatre vérifications qui lisent Search Console et Bing Webmaster Tools, dans la collecte datée existante, et solder la dette de mutualisation D34 au passage.

**Architecture:** les briques d'accès (jeton Google, transport Bing, résolution de propriété) montent de `skills/console/scripts/lib/` vers `plugin/lib/`, où elles deviennent communes aux quatre skills. Un nouveau module pur, `skills/audit/scripts/lib/level1.ts`, fait la collecte et les dérivés du niveau 1 sans toucher au disque ni à `process.env` ; `collect.ts` reste seul maître du réseau et des écritures (D4). Les quatre vérifications rejoignent le catalogue Markdown existant, lu par le modèle, comme toutes les autres.

**Tech Stack:** TypeScript, Bun (runtime, `bun test`), zéro dépendance nouvelle. APIs : Google Search Console v3 et v1 (`sites.list`, `sitemaps.list`, `urlInspection.index.inspect`, `searchAnalytics.query`), Bing Webmaster Tools JSON (`GetUserSites`, `GetFeeds`, `GetUrlInfo`).

**Spec:** `docs/superpowers/specs/2026-08-30-erom-seo-niveau-1-design.md`

## Global Constraints

- **Zéro dépendance nouvelle.** Ni `npm`, ni `npx`, ni `pip`. `bun` seul. Le garde-fou local bloque les trois premiers.
- **`collect.ts` est seul au réseau et seul à écrire sur disque** (D4). Tout module de collecte reçoit son `Fetcher` en paramètre et rend des données ; il n'ouvre ni socket ni fichier.
- **Aucun secret sur disque ni à l'écran** : ni jeton, ni `apikey`, ni chemin de clé de compte de service, dans `raw/`, `derived/`, le manifeste, le rapport ou stderr. `assertNoSecret` est le filet de dernier recours, `redact` la mesure normale.
- **Aucune écriture sortante.** Ni `sitemaps.submit`, ni `SubmitFeed`, ni `SubmitUrlBatch`, ni ping IndexNow. Le niveau 1 lit (D30, D26 inchangées).
- **Pas de tiret cadratin** dans une chaîne destinée à l'écran ou au rapport. Le filet du repo couvre les sorties ; les nouvelles chaînes y entrent.
- **Français** pour tout ce qui s'affiche ; anglais pour les identifiants de code.
- **Deux antipatrons de test bannis** : geler un compte de vérifications ou un instantané de catalogue ; affirmer sur le texte source plutôt que sur le comportement.
- **Commandes de vérification** : depuis `plugin/`, `bun test`. Sur les comptes réels, `source ~/.zshenv` d'abord, jamais d'affichage de la variable.

---

## Structure des fichiers

**Créés**

| Fichier | Responsabilité |
|---|---|
| `plugin/lib/url.ts` | primitives d'URL partagées : `sameSite`, `pageKey`, `rewriteToOrigin`, plus `bareHost` et `comparableHost` qui restent privés |
| `plugin/lib/tests/url.test.ts` | leurs tests, repris de `sitemap.test.ts` |
| `plugin/skills/audit/scripts/lib/level1.ts` | collecte et dérivés du niveau 1, pur |
| `plugin/skills/audit/scripts/tests/level1.test.ts` | ses tests |

**Déplacés** (de `plugin/skills/console/scripts/lib/` vers `plugin/lib/`, tests compris)

`auth-google.ts`, `gsc.ts`, `bing.ts`, `resolve.ts` et leurs quatre fichiers de test vers `plugin/lib/tests/`.

**Modifiés**

| Fichier | Changement |
|---|---|
| `plugin/skills/audit/scripts/lib/sitemap.ts` | perd les trois primitives, les importe de `plugin/lib/url` |
| `plugin/skills/audit/scripts/collect.ts` | `level` accepte 1 ; branche de collecte niveau 1 ; écritures `raw/gsc/`, `raw/bing/`, `derived/console.json` |
| `plugin/skills/audit/scripts/lib/types.ts` | `Manifest` porte `level1` |
| `plugin/skills/console/scripts/console.ts` | imports recâblés |
| `plugin/skills/strategy/scripts/keywords.ts` | transport Bing commun |
| `plugin/skills/checklist/scripts/lib/actions.ts` | transport Bing commun |
| `plugin/skills/checklist/scripts/lib/ancien-sitemap.ts`, `checklist.ts` | imports recâblés |
| `plugin/skills/audit/references/checks/indexability.md` | IDX-06, IDX-07 |
| `plugin/skills/audit/references/checks/strategy.md` | STRAT-05 |
| `plugin/skills/audit/references/checks/ai-presence.md` | AI-03 |
| `plugin/skills/audit/references/levels.md` | niveau 1 livré |
| `plugin/skills/audit/SKILL.md` | `--level 1`, lecture de `derived/console.json` |

**Ordre des tâches.** 1 à 3 sont le déménagement (aucun comportement ne change, la suite doit rester verte à l'identique). 4 à 7 construisent le niveau 1. 8 l'expose au modèle. 9 le recette sur les vrais comptes.

---

### Task 1: `plugin/lib/url.ts`, les primitives d'URL

Sans cette tâche, `resolve.ts` monté dans `plugin/lib/` importerait une skill, et le commun dépendrait de l'audit.

**Files:**
- Create: `plugin/lib/url.ts`
- Create: `plugin/lib/tests/url.test.ts`
- Modify: `plugin/skills/audit/scripts/lib/sitemap.ts:42-58` (retrait des trois fonctions, ajout d'un import)
- Modify: `plugin/skills/audit/scripts/collect.ts:6` (scission de l'import)
- Modify: `plugin/skills/checklist/scripts/lib/actions.ts:4`, `plugin/skills/checklist/scripts/lib/ancien-sitemap.ts:4`, `plugin/skills/checklist/scripts/checklist.ts:10`, `plugin/skills/console/scripts/lib/resolve.ts:4`
- Test: `plugin/lib/tests/url.test.ts`, plus la suite entière

**Interfaces:**
- Consumes: rien.
- Produces: `sameSite(u: string, origin: string): boolean`, `pageKey(u: string): string`, `rewriteToOrigin(u: string, origin: string): string | null`, exportées par `plugin/lib/url.ts`. Signatures identiques à celles d'aujourd'hui : c'est un déménagement, pas une réécriture. `bareHost` et `comparableHost` descendent avec elles et restent non exportés.

- [ ] **Step 1: lire les CINQ fonctions à déplacer**

```bash
cd plugin && sed -n '26,60p' skills/audit/scripts/lib/sitemap.ts
```

**Cinq, pas trois.** `sameSite` appelle `comparableHost`, et `pageKey` appelle `bareHost` : ces deux helpers sont privés à `sitemap.ts` (non exportés) et ne servent qu'à ces deux fonctions. Déplacer les trois publiques sans eux ne compile pas. Ils descendent dans `url.ts` et **y restent privés** : rien d'autre dans le repo ne les utilise (vérifié le 30/08 par grep sur `skills` et `lib`).

Les recopier **à l'octet près**, commentaires compris. Toute reformulation ici est une régression silencieuse : ces fonctions décident quelles URL entrent dans une collecte.

`sitemap.ts` garde `collectSitemapUrls`, qui appelle les trois publiques aux lignes 90, 101 et 102 : d'où l'import de l'étape 4.

- [ ] **Step 2: créer `plugin/lib/url.ts`**

En-tête du fichier, puis les trois fonctions copiées telles quelles :

```typescript
// Primitives d'URL partagées par les skills. Extraites de skills/audit/scripts/lib/sitemap.ts le 30/08
// (D40) : `plugin/lib/` ne doit dépendre d'aucune skill, et resolve.ts avait besoin de sameSite.
// Aucune logique n'a changé pendant le déplacement.
```

- [ ] **Step 3: déplacer les tests existants**

Repérer dans `skills/audit/scripts/tests/sitemap.test.ts` les cas qui portent sur ces trois fonctions et les déplacer dans `plugin/lib/tests/url.test.ts`, sans en changer une assertion :

```bash
cd plugin && command grep -n "sameSite\|pageKey\|rewriteToOrigin" skills/audit/scripts/tests/sitemap.test.ts
```

Import du nouveau fichier de test : `import { sameSite, pageKey, rewriteToOrigin } from "../url";`

- [ ] **Step 4: vider `sitemap.ts` des trois fonctions et les réimporter**

Retirer les définitions, ajouter en tête :

```typescript
import { sameSite, pageKey, rewriteToOrigin } from "../../../../lib/url";
```

`sitemap.ts` les utilise en interne (`collectSitemapUrls`). Ne pas les ré-exporter : les consommateurs sont recâblés à l'étape suivante, et deux chemins pour une même fonction est exactement la dette qu'on solde.

- [ ] **Step 5: recâbler les cinq consommateurs**

`collect.ts:6` devient deux imports :

```typescript
import { collectSitemapUrls, formatSkippedWarning, sitemapCandidates } from "./lib/sitemap";
import { pageKey, rewriteToOrigin, sameSite } from "../../../lib/url";
```

Les quatre autres, chemins relatifs à respecter selon la profondeur :

```typescript
// skills/checklist/scripts/lib/actions.ts et ancien-sitemap.ts
import { rewriteToOrigin } from "../../../../lib/url";
import { sameSite } from "../../../../lib/url";
// skills/checklist/scripts/checklist.ts  (garde decodeSitemapBody et parseSitemap chez sitemap.ts)
import { decodeSitemapBody, parseSitemap } from "../../../skills/audit/scripts/lib/sitemap";
import { sameSite } from "../../../lib/url";
// skills/console/scripts/lib/resolve.ts
import { sameSite } from "../../../../lib/url";
```

- [ ] **Step 6: vérifier que rien n'a bougé**

```bash
cd plugin && bun test
```

Attendu : **375 tests, 0 échec**, exactement comme avant la tâche. Un seul test qui change de résultat signifie que le déplacement a modifié un comportement : revenir en arrière et recommencer, ne pas ajuster le test.

- [ ] **Step 7: commit**

```bash
git add plugin/lib/url.ts plugin/lib/tests/url.test.ts plugin/skills
git commit -m "refactor(lib): les primitives d'URL montent dans le commun

Prépare D40 : resolve.ts va monter dans plugin/lib/ et ne peut plus
importer skills/audit. Déplacement pur, aucune logique touchée, 375 tests
inchangés."
```

---

### Task 2: monter les quatre briques d'accès dans `plugin/lib/`

**Files:**
- Move: `plugin/skills/console/scripts/lib/{auth-google,gsc,bing,resolve}.ts` → `plugin/lib/`
- Move: `plugin/skills/console/scripts/tests/{auth-google,gsc,bing,resolve}.test.ts` → `plugin/lib/tests/`
- Modify: `plugin/skills/console/scripts/console.ts` (imports), `plugin/skills/console/scripts/tests/console-cli.test.ts` (imports)
- Test: la suite entière

**Interfaces:**
- Consumes: `plugin/lib/url.ts` de la tâche 1.
- Produces: tout ce qu'exportent aujourd'hui les quatre modules, aux mêmes noms, depuis `plugin/lib/`. Notamment, pour les tâches suivantes : `getAccessToken`, `defaultGcloud`, `serviceAccountToken`, `GoogleAuth`, `AuthError`, `LOGIN_HINT`, `QUOTA_HINT` ; `listProperties`, `listSitemaps`, `inspectUrl`, `canonicalMismatch`, `GscError`, `Fetcher`, `Inspection`, `IndexStatus`, `SitemapInfo` ; `bingUserSites`, `bingFeeds`, `bingUrlInfo`, `bingCrawlStats`, `bingCrawlIssues`, `parseDotNetDate`, `DATE_JAMAIS`, `redact`, `BingError`, `BING_API_BASE`, `BING_ERROR_CODES` ; `resolveProperty`, `resolveBingSite`, `Property`, `BingSite`.

- [ ] **Step 1: déplacer les huit fichiers avec git**

```bash
cd plugin
for f in auth-google gsc bing resolve; do
  git mv skills/console/scripts/lib/$f.ts lib/$f.ts
  git mv skills/console/scripts/tests/$f.test.ts lib/tests/$f.test.ts
done
git status --short
```

`git mv` plutôt qu'une copie : l'historique de chaque fichier suit, et la revue voit un déplacement au lieu d'une réécriture.

- [ ] **Step 2: corriger les imports internes aux modules déplacés**

Chaque module descend d'un niveau de profondeur. Dans `plugin/lib/resolve.ts`, la ligne posée en tâche 1 devient :

```typescript
import { sameSite } from "./url";
```

Dans `plugin/lib/gsc.ts`, les deux imports relatifs restent valides tels quels (`./resolve`, `./auth-google`) : les quatre fichiers voyagent ensemble. Vérifier qu'aucun `../../..` ne subsiste :

```bash
cd plugin && command grep -n "\.\./" lib/auth-google.ts lib/gsc.ts lib/bing.ts lib/resolve.ts
```

Attendu : aucune ligne. Toute ligne restante est un import à corriger.

- [ ] **Step 3: corriger les imports des quatre fichiers de test**

Ils passent de `../lib/<module>` à `../<module>` :

```bash
cd plugin && sed -i '' 's#from "\.\./lib/#from "../#g' lib/tests/auth-google.test.ts lib/tests/gsc.test.ts lib/tests/bing.test.ts lib/tests/resolve.test.ts
command grep -n "^import" lib/tests/gsc.test.ts
```

Relire le résultat : si un test importait autre chose que les quatre modules (une fixture, un helper), le `sed` a pu le casser.

- [ ] **Step 4: recâbler `console.ts` et son test**

Les six imports de `console.ts` (lignes 3 à 9) deviennent :

```typescript
import { resolveProperty, resolveBingSite, type Property } from "../../../lib/resolve";
import { getAccessToken, defaultGcloud, serviceAccountToken, type GoogleAuth } from "../../../lib/auth-google";
import { listProperties, listSitemaps, inspectUrl, type Fetcher } from "../../../lib/gsc";
import { bingUserSites, bingFeeds, bingUrlInfo, bingCrawlStats, bingCrawlIssues, redact } from "../../../lib/bing";
import { renderSites, renderInspect, renderCrawl, type SitesView, type InspectView, type CrawlView } from "./lib/render";
import { parseStrategy } from "../../../lib/strategy";
import { assertNoSecret } from "../../strategy/scripts/lib/keywords";
```

`render.ts` reste dans la skill : c'est de l'affichage propre à `console`, pas du transport. S'il importe des types des modules déplacés, corriger ses imports vers `../../../../lib/<module>`.

- [ ] **Step 5: chercher les imports oubliés dans tout le plugin**

```bash
cd plugin && command grep -rn "console/scripts/lib/\(auth-google\|gsc\|bing\|resolve\)" --include="*.ts" . | command grep -v node_modules
```

Attendu : aucune ligne.

- [ ] **Step 6: vérifier**

```bash
cd plugin && bun test
```

Attendu : **375 tests, 0 échec**. Puis, sur les comptes réels, que le verbe marche toujours :

```bash
source ~/.zshenv && cd plugin && bun skills/console/scripts/console.ts sites
```

Attendu : les trois propriétés Google et les deux sites Bing, comme avant le déplacement.

- [ ] **Step 7: commit**

```bash
git add -A plugin
git commit -m "refactor(lib): les briques Google et Bing montent dans le commun

D40, solde de la dette datée par D34. auth-google, gsc, bing et resolve
quittent skills/console pour plugin/lib, avec leurs tests. Déplacement pur,
375 tests inchangés, console sites vérifié sur les comptes réels."
```

---

### Task 3: un seul transport Bing

Trois copies de `BING_API_BASE` et de la table d'erreurs deviennent une. C'est ce qui fait qu'un changement d'endpoint Bing (échéance du 31 août) se corrige à un seul endroit.

**Files:**
- Modify: `plugin/skills/strategy/scripts/keywords.ts:6` et sa table d'erreurs
- Modify: `plugin/skills/checklist/scripts/lib/actions.ts:10` et sa table d'erreurs
- Test: `plugin/skills/strategy/scripts/tests/keywords.test.ts`, `plugin/skills/checklist/scripts/tests/actions.test.ts`, plus la suite

**Interfaces:**
- Consumes: `BING_API_BASE`, `BING_ERROR_CODES`, `BingError`, `redact`, `parseDotNetDate` depuis `plugin/lib/bing.ts` (tâche 2).
- Produces: rien de nouveau. `keywords.ts` et `actions.ts` gardent toutes leurs exports actuelles, y compris `assertNoSecret`, que `console.ts` importe.

- [ ] **Step 1: relever ce qui est vraiment identique**

```bash
cd plugin
command grep -n "BING_API_BASE\|BING_ERROR_CODES\|InvalidApiKey\|export function redact\|parseDotNetDate" \
  skills/strategy/scripts/keywords.ts skills/checklist/scripts/lib/actions.ts lib/bing.ts
```

Comparer les trois tables d'erreurs **avant** de supprimer quoi que ce soit. Si l'une diverge (un code de plus, un libellé différent), la version de `lib/bing.ts` fait foi : elle est la plus récente et vient de l'enum officielle. Noter la divergence dans le message de commit plutôt que de la faire disparaître en silence.

- [ ] **Step 2: retirer les doublons de `keywords.ts`**

Supprimer sa définition de `BING_API_BASE`, sa table de codes et son `redact` s'il en a un ; ajouter en tête :

```typescript
import { BING_API_BASE, BING_ERROR_CODES, BingError } from "../../../lib/bing";
```

**Ne pas toucher** à sa fonction d'appel ni à sa logique de mots-clés : `keywords.ts` interroge des méthodes que `lib/bing.ts` ne connaît pas. Seul le transport est commun.

Si `keywords.ts` exporte `BING_API_BASE` et qu'un test l'importe de là, le ré-exporter explicitement plutôt que de casser le test :

```typescript
export { BING_API_BASE } from "../../../lib/bing";
```

- [ ] **Step 3: même opération sur `actions.ts`**

```typescript
import { BING_API_BASE, BING_ERROR_CODES, BingError, redact } from "../../../../lib/bing";
```

Les écritures (`SubmitFeed`, ping IndexNow) restent intégralement dans `actions.ts` : c'est le seul endroit du plugin qui écrit vers l'extérieur (D26), et cette frontière ne bouge pas.

- [ ] **Step 4: vérifier**

```bash
cd plugin && bun test
```

Attendu : **375 tests, 0 échec**. Puis :

```bash
cd plugin && command grep -rn "ssl.bing.com" --include="*.ts" lib skills | command grep -v "/tests/"
```

Attendu : **une seule ligne**, dans `lib/bing.ts`.

- [ ] **Step 5: vérifier sur les comptes réels**

```bash
source ~/.zshenv && cd plugin && bun skills/strategy/scripts/keywords.ts "bon pote"
```

Attendu : des volumes, pas une erreur de clé. Si la réponse est « clé refusée par Bing (InvalidApiKey) », le problème est dans `~/.zshenv`, pas dans cette tâche (voir la note de reprise, incident du 28/08).

- [ ] **Step 6: commit**

```bash
git add -A plugin
git commit -m "refactor(bing): un seul transport pour les trois skills

D40. BING_API_BASE et la table ApiErrorCode existaient en trois exemplaires
(strategy, checklist, console). Une seule reste, dans plugin/lib/bing.ts.
Les méthodes métier et les écritures de checklist ne bougent pas."
```

---

### Task 4: `searchAnalytics()` dans `plugin/lib/gsc.ts`

**Files:**
- Modify: `plugin/lib/gsc.ts` (ajout en fin de fichier)
- Test: `plugin/lib/tests/gsc.test.ts`

**Interfaces:**
- Consumes: `call()`, `GoogleAuth`, `Fetcher`, `GscError`, déjà dans le fichier.
- Produces:

```typescript
export type SearchRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
export type SearchQuery = { startDate: string; endDate: string; dimensions: string[]; rowLimit: number; type: string };
export type SearchResult = { query: SearchQuery; rows: SearchRow[]; truncated: boolean };
export function searchAnalytics(f: Fetcher, auth: GoogleAuth, siteUrl: string, q: SearchQuery): Promise<SearchResult>;
```

**Code exécuté.** Le bloc de l'étape 3 a été lancé le 30/08 contre un `call` simulé : ses neuf assertions passent, y compris la réponse sans clé `rows`.

**Convention externe, échantillon capturé.** La forme de la réponse vient d'un appel réel du 30/08 sur `sc-domain:romain-ecarnot.com`, spec section 11.2. `keys` suit l'ordre des dimensions demandées ; `ctr` est une **fraction** entre 0 et 1, pas un pourcentage (l'export CSV, lui, écrit `33.33%` : ne pas confondre les deux). `responseAggregationType` est ignoré.

- [ ] **Step 1: écrire le test qui échoue**

Dans `plugin/lib/tests/gsc.test.ts`, avec la réponse réelle du 30/08 :

```typescript
test("searchAnalytics rend les lignes et recopie la requête", async () => {
  let seen: { url: string; body: string } | null = null;
  const f: Fetcher = async (url, init) => {
    seen = { url, body: init?.body ?? "" };
    return { status: 200, text: JSON.stringify({
      rows: [
        { keys: ["https://www.romain-ecarnot.com/", "ecarnot"], clicks: 0, impressions: 2, ctr: 0, position: 10 },
        { keys: ["https://lebonpote.romain-ecarnot.com/", "bon pote nantes"], clicks: 0, impressions: 1, ctr: 0, position: 7 },
      ],
      responseAggregationType: "byPage",
    }) };
  };
  const q = { startDate: "2026-06-01", endDate: "2026-08-30", dimensions: ["page", "query"], rowLimit: 1000, type: "web" };
  const r = await searchAnalytics(f, { token: "t", quotaProject: "p", provider: "gcloud" }, "sc-domain:romain-ecarnot.com", q);

  expect(r.rows).toHaveLength(2);
  expect(r.rows[0].keys).toEqual(["https://www.romain-ecarnot.com/", "ecarnot"]);
  expect(r.rows[0].impressions).toBe(2);
  expect(r.truncated).toBe(false);
  expect(r.query).toEqual(q);
  expect(seen!.url).toContain("/searchAnalytics/query");
  expect(seen!.url).toContain(encodeURIComponent("sc-domain:romain-ecarnot.com"));
  expect(JSON.parse(seen!.body)).toEqual(q);
});

test("searchAnalytics signale une réponse au plafond", async () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ keys: [`q${i}`], clicks: 0, impressions: 1, ctr: 0, position: 1 }));
  const f: Fetcher = async () => ({ status: 200, text: JSON.stringify({ rows }) });
  const r = await searchAnalytics(f, { token: "t", quotaProject: null, provider: "gcloud" }, "s", { startDate: "a", endDate: "b", dimensions: ["query"], rowLimit: 5, type: "web" });
  expect(r.truncated).toBe(true);
});

test("searchAnalytics rend zéro ligne quand la propriété n'a pas de données", async () => {
  const f: Fetcher = async () => ({ status: 200, text: JSON.stringify({ responseAggregationType: "byProperty" }) });
  const r = await searchAnalytics(f, { token: "t", quotaProject: null, provider: "gcloud" }, "s", { startDate: "a", endDate: "b", dimensions: ["date"], rowLimit: 1000, type: "web" });
  expect(r.rows).toEqual([]);
  expect(r.truncated).toBe(false);
});
```

Le troisième cas n'est pas théorique : une réponse sans clé `rows` est ce que Google rend sur une propriété sans données, et un `.map` direct sur `undefined` planterait la collecte entière.

- [ ] **Step 2: lancer, vérifier l'échec**

```bash
cd plugin && bun test lib/tests/gsc.test.ts
```

Attendu : échec, `searchAnalytics is not a function` ou équivalent.

- [ ] **Step 3: implémenter**

À la suite de `inspectUrl` dans `plugin/lib/gsc.ts` :

```typescript
export type SearchRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
/** La requête est conservée telle quelle dans raw/ : sans elle, la réponse n'est pas rejouable. */
export type SearchQuery = { startDate: string; endDate: string; dimensions: string[]; rowLimit: number; type: string };
export type SearchResult = { query: SearchQuery; rows: SearchRow[]; truncated: boolean };

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * searchAnalytics.query. `ctr` est une fraction (0 à 1), pas un pourcentage : capture du 30/08.
 * Pas de pagination : au plafond, `truncated` le dit et le rapport ne conclut pas sur l'exhaustivité.
 */
export async function searchAnalytics(f: Fetcher, auth: GoogleAuth, siteUrl: string, q: SearchQuery): Promise<SearchResult> {
  const d = (await call(f, `${WMX_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, auth, {
    method: "POST",
    body: JSON.stringify(q),
  })) as { rows?: Record<string, unknown>[] };
  const rows = (d.rows ?? []).map((r) => ({
    keys: Array.isArray(r.keys) ? r.keys.map(String) : [],
    clicks: num(r.clicks), impressions: num(r.impressions), ctr: num(r.ctr), position: num(r.position),
  }));
  return { query: q, rows, truncated: rows.length >= q.rowLimit };
}
```

- [ ] **Step 4: vérifier**

```bash
cd plugin && bun test lib/tests/gsc.test.ts && bun test
```

Attendu : les trois nouveaux tests passent, **aucun échec**, et le total a augmenté de trois exactement par rapport au relevé d'avant la tâche. Ne pas figer un total absolu : il bouge à chaque chantier, et un plan qui l'écrit en dur devient faux au suivant.

- [ ] **Step 5: vérifier sur le compte réel**

Sonde jetable, sous `/tmp`, jamais commitée :

```bash
source ~/.zshenv && cd plugin && bun -e '
import { getAccessToken, defaultGcloud, serviceAccountToken } from "./lib/auth-google";
import { searchAnalytics } from "./lib/gsc";
const f = async (u,i) => { const r = await fetch(u,i); return { status: r.status, text: await r.text() }; };
const a = await getAccessToken(process.env, { gcloud: () => defaultGcloud(), serviceAccount: (p) => serviceAccountToken(p, f) });
const r = await searchAnalytics(f, a, "sc-domain:romain-ecarnot.com", { startDate: "2026-06-01", endDate: "2026-08-30", dimensions: ["page","query"], rowLimit: 1000, type: "web" });
console.log(r.rows.length, "lignes, tronqué:", r.truncated); console.log(r.rows[0]);
'
```

Attendu : environ 4 lignes, `tronqué: false`, et une première ligne dont `keys` porte une URL puis une requête.

- [ ] **Step 6: commit**

```bash
git add plugin/lib/gsc.ts plugin/lib/tests/gsc.test.ts
git commit -m "feat(gsc): searchAnalytics.query, la lecture des requêtes réelles

Forme figée sur un appel réel du 30/08 (spec 11.2) : keys suit l'ordre des
dimensions, ctr est une fraction et non un pourcentage. Une réponse sans
rows (propriété sans données) rend une liste vide au lieu de planter."
```

---

### Task 5: `level1.ts`, la collecte

**Files:**
- Create: `plugin/skills/audit/scripts/lib/level1.ts`
- Create: `plugin/skills/audit/scripts/tests/level1.test.ts`
- Test: `plugin/skills/audit/scripts/tests/level1.test.ts`

**Interfaces:**
- Consumes: de `plugin/lib/` (tâches 2 et 4) : `Fetcher`, `GoogleAuth`, `listProperties`, `listSitemaps`, `inspectUrl`, `searchAnalytics`, `resolveProperty`, `resolveBingSite`, `bingUserSites`, `bingUrlInfo`.
- Produces:

```typescript
export type Level1Deps = {
  fetcher: Fetcher;
  auth: GoogleAuth | null;      // null = pas de jeton, la moitié Google est non vue
  authError: string | null;     // la raison, déjà mise en forme par collect.ts
  bingKey: string | null;
};
export type Level1Options = {
  origin: string;
  pages: { url: string; slug: string }[];   // les pages déjà retenues par collect.ts, dans l'ordre
  today: string;                             // AAAA-MM-JJ, injecté pour que les tests soient stables
  days?: number;                             // fenêtre searchAnalytics, défaut 90
  delayMs?: number;                          // défaut 250, comme la collecte de pages
};
export type Level1Raw = { path: string; body: string };   // à écrire sous raw/, chemin relatif à raw/
/** Les deux blocs sont toujours présents : une panne se dit par leur champ `error`, jamais par leur
 *  absence. Deux façons d'exprimer « pas de données » en est une de trop, et `deriveConsole` n'a
 *  alors aucune décharge de nullité à faire. */
export type Level1Result = { google: GoogleBlock; bing: BingBlock; raw: Level1Raw[] };
export function collectLevel1(deps: Level1Deps, o: Level1Options): Promise<Level1Result>;
```

Les blocs, définis dans le même fichier :

```typescript
export type InspectedPage = {
  url: string; slug: string;
  verdict: string; coverageState: string;
  googleCanonical: string | null; userCanonical: string | null;
  lastCrawlTime: string | null; error: string | null;
};
export type GoogleBlock = {
  property: { siteUrl: string; permissionLevel: string } | null;
  error: string | null;
  pages: InspectedPage[];
  sitemaps: SitemapInfo[];
  /** Un refus de lecture des sitemaps a son propre emplacement : sans lui, « je n'ai pas le droit de
   *  les lire » deviendrait « aucun sitemap déclaré », ce que le rapport n'a pas le droit de confondre.
   *  Cas réel disponible : sc-domain:healthincloud.app, rôle siteUnverifiedUser (spec 11.5). */
  sitemapsError: string | null;
  search: { lastDataDate: string | null; rows: SearchRow[]; truncated: boolean; error: string | null } | null;
};
export type BingPage = { url: string; slug: string; known: boolean; lastCrawled: string | null; error: string | null };
export type BingBlock = { site: string | null; error: string | null; pages: BingPage[] };

/** AI-03. Bing rend une sentinelle DateTime.MinValue pour « jamais crawlée » (capture du 29/08), pas null.
 *  Vit ici et non en tâche 6 : c'est `collectBing` qui remplit `known`, et une règle définie ailleurs
 *  laisserait passer un `known: info !== null` qui satisfait tous les tests en mentant. */
export function bingKnows(info: Record<string, unknown> | null): boolean;
```

- [ ] **Step 1: écrire les tests de dégradation d'abord**

Ce sont eux qui portent la garantie « le niveau 1 ne fait jamais échouer l'audit ». Dans `plugin/skills/audit/scripts/tests/level1.test.ts` :

```typescript
import { test, expect } from "bun:test";
import { collectLevel1 } from "../lib/level1";

const NOFETCH: any = async () => { throw new Error("aucune requête ne doit partir"); };
const PAGES = [{ url: "https://x.test/", slug: "index" }];
const OPT = { origin: "https://x.test", pages: PAGES, today: "2026-08-30" };

test("sans jeton Google, la moitié Google est non vue et Bing continue", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://x.test/", IsVerified: true }] }) };
    if (url.includes("GetUrlInfo")) return { status: 200, text: JSON.stringify({ d: { LastCrawledDate: "/Date(1785610378000)/" } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: null, authError: "aucun jeton Google", bingKey: "k" }, OPT);
  expect(r.google.error).toBe("aucun jeton Google");
  expect(r.google.pages).toEqual([]);
  expect(r.bing.pages[0].known).toBe(true);
});

test("sans clé Bing, aucune requête Bing ne part", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("bing.com")) throw new Error("la clé est absente, rien ne doit partir vers Bing");
    // searchAnalytics AVANT /sites/ : son URL est .../sites/<propriété>/searchAnalytics/query et
    // matcherait la branche sitemaps, qui rendrait un corps sans `rows`. Le test passerait quand même,
    // en n'exerçant pas ce qu'il prétend exercer.
    if (url.includes("searchAnalytics")) return { status: 200, text: JSON.stringify({ rows: [] }) };
    if (url.includes("/sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null }, OPT);
  expect(r.bing.error).toBe("clé Bing absente");
  expect(r.bing.pages).toEqual([]);
  expect(r.google.pages).toHaveLength(1);
});

test("aucune propriété ne couvre l'URL : Google non vu, sans requête d'inspection", async () => {
  const fetcher: any = async (url: string) => {
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:autre.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("inspect")) throw new Error("aucune inspection ne doit partir sans propriété");
    return { status: 200, text: JSON.stringify({}) };
  };
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null }, OPT);
  expect(r.google.property).toBeNull();
  expect(r.google.error).toContain("aucune propriété");
});

test("une page en échec n'empêche pas les autres", async () => {
  let n = 0;
  const fetcher: any = async (url: string) => {
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }] }) };
    if (url.includes("sitemaps")) return { status: 200, text: JSON.stringify({ sitemap: [] }) };
    if (url.includes("inspect")) {
      n++;
      if (n === 1) return { status: 500, text: "{}" };
      return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    }
    return { status: 200, text: JSON.stringify({ rows: [] }) };
  };
  const deux = [{ url: "https://x.test/", slug: "index" }, { url: "https://x.test/b", slug: "b" }];
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null },
    { ...OPT, pages: deux, delayMs: 0 });
  expect(r.google.pages).toHaveLength(2);
  expect(r.google.pages[0].error).not.toBeNull();
  expect(r.google.pages[1].verdict).toBe("PASS");
});

test("sans jeton ni clé, aucune requête ne part du tout", async () => {
  const r = await collectLevel1({ fetcher: NOFETCH, auth: null, authError: "aucun jeton Google", bingKey: null }, OPT);
  expect(r.google.error).toBe("aucun jeton Google");
  expect(r.bing.error).toBe("clé Bing absente");
  expect(r.raw).toEqual([]);
});

// Ces deux-là ferment les deux trous que la revue du plan a démontrés le 30/08.

test("une page que Bing n'a jamais crawlée est rapportée inconnue, à travers collectBing", async () => {
  // Sans ce test, un `known: info !== null` satisfait tous les autres tout en mentant : la sentinelle
  // DateTime.MinValue est un objet non nul. Reproduit par la revue du plan, 10 tests verts et AC-6 faux.
  const fetcher: any = async (url: string) => {
    if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://x.test/", IsVerified: true }] }) };
    if (url.includes("GetUrlInfo")) return { status: 200, text: JSON.stringify({ d: { Url: "https://x.test/", LastCrawledDate: "/Date(-62135568000000)/" } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: null, authError: "aucun jeton Google", bingKey: "k" }, OPT);
  expect(r.bing.pages[0].known).toBe(false);
});

test("un refus de lecture des sitemaps est dit, jamais confondu avec « aucun sitemap »", async () => {
  const fetcher: any = async (url: string) => {
    if (url.includes("searchAnalytics")) return { status: 200, text: JSON.stringify({ rows: [] }) };
    if (url.includes("/sitemaps")) return { status: 403, text: JSON.stringify({ error: { message: "insufficient permission" } }) };
    if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:x.test", permissionLevel: "siteUnverifiedUser" }] }) };
    if (url.includes("inspect")) return { status: 200, text: JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }) };
    throw new Error(`appel inattendu : ${url}`);
  };
  const r = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: null }, OPT);
  expect(r.google.sitemaps).toEqual([]);
  expect(r.google.sitemapsError).not.toBeNull();
  expect(r.google.pages).toHaveLength(1);   // le refus sur les sitemaps n'empêche pas l'inspection
});

// Les quatre cas unitaires de bingKnows, exécutés le 30/08 et verts. Ils vivent ici, avec leur appelant.

test("AI-03 reconnaît une page connue de Bing, capture du 30/08", () => {
  expect(bingKnows({ LastCrawledDate: "/Date(1785610378000)/" })).toBe(true);
});

test("AI-03 lit la sentinelle DateTime.MinValue comme jamais crawlée", () => {
  expect(bingKnows({ LastCrawledDate: "/Date(-62135568000000)/" })).toBe(false);
});

test("AI-03 accepte un décalage horaire dans la date .NET", () => {
  expect(bingKnows({ LastCrawledDate: "/Date(1760511600000-0700)/" })).toBe(true);
});

test("AI-03 sur une réponse nulle ou sans date", () => {
  expect(bingKnows(null)).toBe(false);
  expect(bingKnows({ Url: "https://x/" })).toBe(false);
});
```

- [ ] **Step 2: lancer, vérifier l'échec**

```bash
cd plugin && bun test skills/audit/scripts/tests/level1.test.ts
```

Attendu : échec à l'import, `level1` n'existe pas.

- [ ] **Step 3: implémenter la collecte**

`plugin/skills/audit/scripts/lib/level1.ts`. Le contrat, à respecter à la lettre : **aucun accès disque, aucun `process.env`, aucun `fetch` global**. Tout passe par `deps`.

```typescript
// Collecte du niveau 1 : Search Console et Bing Webmaster Tools. Pure au sens du repo (D4) :
// le Fetcher, le jeton et la clé entrent en paramètre, rien n'est écrit ici. collect.ts pose les fichiers.
import { listProperties, listSitemaps, inspectUrl, searchAnalytics, type Fetcher, type SitemapInfo, type SearchRow } from "../../../../lib/gsc";
import { type GoogleAuth } from "../../../../lib/auth-google";
import { resolveProperty, resolveBingSite } from "../../../../lib/resolve";
import { bingUserSites, bingUrlInfo, parseDotNetDate, DATE_JAMAIS } from "../../../../lib/bing";
```

**Ce bloc est non normatif** : il n'a pas pu être exécuté à l'écriture du plan (il orchestre des appels réseau). Le contrat qui fait foi est la signature de la section « Interfaces », les cinq tests de l'étape 1, et l'enchaînement en six points ci-dessous. L'implémenteur possède le code ; il doit satisfaire les tests, pas recopier ce squelette.

```typescript
const AUCUNE_PROPRIETE = "aucune propriété Search Console ne couvre cette URL";
const CLE_BING_ABSENTE = "clé Bing absente";
const SITE_HORS_COMPTE = "ce site n'est pas dans le compte Bing";

/**
 * Un refus devient une phrase. Jamais une trace, jamais un corps de réponse brut.
 * Le `hint` est joint quand il existe : GscError, BingError et AuthError portent toutes deux champs, et
 * c'est le hint qui dit quoi faire (« active l'API sur ce projet », « la clé n'est plus acceptée »).
 * Le jeter laisserait dans le rapport un « droits insuffisants » sans la moindre issue.
 */
function why(e: unknown): string {
  const hint = (e as { hint?: string })?.hint;
  const msg = e instanceof Error ? e.message : String(e);
  return hint ? `${msg} : ${hint}` : msg;
}

export async function collectLevel1(deps: Level1Deps, o: Level1Options): Promise<Level1Result> {
  const raw: Level1Raw[] = [];
  const google = await collectGoogle(deps, o, raw);
  const bing = await collectBing(deps, o, raw);
  return { google, bing, raw };
}
```

`collectGoogle` enchaîne, chaque étape protégée par son `try` :

1. si `deps.auth` est `null`, rendre `{ property: null, error: deps.authError, pages: [], sitemaps: [], search: null }` **sans aucun appel** ;
2. `listProperties` puis `resolveProperty(o.origin + "/", props)` ; si `null`, rendre l'erreur `AUCUNE_PROPRIETE` sans inspecter ;
3. `listSitemaps` ; un échec ici ne bloque pas la suite : `sitemaps: []` **et le message dans `sitemapsError`**. Ne jamais l'avaler : sur une propriété en lecture restreinte, un tableau vide sans message ferait écrire « aucun sitemap déclaré » là où la vérité est « je n'ai pas le droit de les lire ». Le décodage du 403 est déjà écrit et recetté dans `gsc.ts` ;
4. `inspectUrl` par page de `o.pages`, dans l'ordre, avec `await Bun.sleep(o.delayMs ?? 250)` entre deux appels ; chaque échec devient le champ `error` de **cette** page, les autres continuent ;
5. deux `searchAnalytics` : `dimensions: ["date"]` puis `["page","query"]`, `rowLimit: 1000`, `type: "web"`, sur `o.days ?? 90` jours finissant à `o.today`.

   **`lastDataDate` est la plus grande date parmi les lignes à `impressions > 0`**, et `null` s'il n'y en a aucune. Ne jamais prendre « la dernière ligne rendue » : Google documente que les jours sans donnée sont omis, l'ordre des lignes n'est pas garanti par contrat, et une propriété sans trafic rendrait une date fausse plutôt qu'un honnête `null`. C'est l'unique contenu d'AC-9, il lui faut son test :

   ```typescript
   test("lastDataDate est le dernier jour AVEC des impressions, quel que soit l'ordre des lignes", async () => {
     const rows = [
       { keys: ["2026-08-27"], clicks: 0, impressions: 1, ctr: 0, position: 7 },
       { keys: ["2026-08-29"], clicks: 0, impressions: 0, ctr: 0, position: 0 },
       { keys: ["2026-08-20"], clicks: 0, impressions: 3, ctr: 0, position: 9 },
     ];
     // rendu volontairement dans le désordre, avec un jour à zéro impression après le dernier jour utile
     const r = await collectLevel1(depsAvec(rows), OPT);
     expect(r.google.search!.lastDataDate).toBe("2026-08-27");
   });

   test("aucune impression sur la période rend null, pas une date inventée", async () => {
     const r = await collectLevel1(depsAvec([{ keys: ["2026-08-29"], clicks: 0, impressions: 0, ctr: 0, position: 0 }]), OPT);
     expect(r.google.search!.lastDataDate).toBeNull();
   });
   ```
6. pousser dans `raw` : `gsc/sites.json`, `gsc/sitemaps.json`, `gsc/inspect/<slug>.json` par page, `gsc/searchanalytics-date.json`, `gsc/searchanalytics-page-query.json`. Chaque entrée porte la **requête et la réponse** ; jamais l'en-tête d'autorisation.

`collectBing` suit la même forme : sans clé, `{ site: null, error: CLE_BING_ABSENTE, pages: [] }` sans appel ; sinon `bingUserSites` puis `resolveBingSite(new URL(o.origin).hostname, sites)`, `SITE_HORS_COMPTE` si absent, puis `bingUrlInfo` par page. `raw` reçoit `bing/usersites.json` et `bing/urlinfo/<slug>.json`.

`known` de chaque `BingPage` vaut `bingKnows(info)` et **rien d'autre** : ni `info !== null`, ni un test sur `HttpStatus`, qui vaut 0 même sur une page indexée. Le corps de `bingKnows` :

```typescript
import { parseDotNetDate, DATE_JAMAIS } from "../../../../lib/bing";

/** AI-03. Bing rend une sentinelle DateTime.MinValue pour « jamais crawlée » (capture du 29/08), pas null. */
export function bingKnows(info: Record<string, unknown> | null): boolean {
  if (!info) return false;
  const ms = parseDotNetDate(info.LastCrawledDate);
  return ms !== null && ms !== DATE_JAMAIS;
}
```

Ce bloc a été exécuté le 30/08 : quatre cas verts (page connue, sentinelle, date avec décalage horaire, réponse nulle ou sans date).

**L'URL appelée n'entre jamais dans `raw`** : elle porte `apikey`. On y met le nom de la méthode et le corps de la réponse.

- [ ] **Step 4: vérifier**

```bash
cd plugin && bun test skills/audit/scripts/tests/level1.test.ts
```

Attendu : les cinq tests passent.

- [ ] **Step 5: commit**

```bash
git add plugin/skills/audit/scripts/lib/level1.ts plugin/skills/audit/scripts/tests/level1.test.ts
git commit -m "feat(audit): collecte du niveau 1, avec sa dégradation

Pure au sens de D4 : Fetcher, jeton et clé en paramètre, aucune écriture.
Cinq tests couvrent les chemins de panne : pas de jeton, pas de clé, aucune
propriété, une page en échec, et le cas où rien ne doit partir du tout."
```

---

### Task 6: `level1.ts`, les dérivés des quatre vérifications

Le code de cette tâche a été exécuté le 30/08 avant l'écriture du plan : les onze cas ci-dessous passent tels quels.

**Files:**
- Modify: `plugin/skills/audit/scripts/lib/level1.ts` (ajout)
- Modify: `plugin/skills/audit/scripts/tests/level1.test.ts` (ajout)

**Interfaces:**
- Consumes: `Level1Result` de la tâche 5 ; `keywordMatches` de `plugin/lib/strategy.ts` ; `normalizeUrl` de `./strategy-eval`.
- Produces:

```typescript
export type IndexSummary = { total: number; indexed: number; notIndexed: { url: string; coverageState: string }[] };
export type CanonicalFinding = { url: string; googleCanonical: string; userCanonical: string };
export type KeywordCheck = { page: string; keyword: string; hasImpressions: boolean; keywordFound: boolean | null; topQueries: string[] };
export type ConsoleDerived = {
  level: 1;
  google: {
    property: string | null;
    /** Le rôle est conservé : c'est lui qui explique un refus (AC-7), le perdre rendrait le rapport muet sur la cause. */
    permissionLevel: string | null;
    error: string | null;
    sitemapsError: string | null;
    index: IndexSummary;
    canonical: CanonicalFinding[];
    lastDataDate: string | null;
    truncated: boolean;
  };
  bing: { site: string | null; error: string | null; known: number; total: number; unknown: string[] };
  strategy: KeywordCheck[] | null;
};
export function indexSummary(pages: InspectedPage[]): IndexSummary;
export function canonicalFindings(pages: InspectedPage[]): CanonicalFinding[];
export function keywordChecks(rows: SearchRow[], planned: { page: string; motCle: string }[]): KeywordCheck[];
export function deriveConsole(r: Level1Result, planned: { page: string; motCle: string }[] | null): ConsoleDerived;
```

- [ ] **Step 1: écrire les tests, avec les captures réelles**

Ces onze cas ont été exécutés le 30/08 et passent. Les recopier tels quels.

```typescript
import { indexSummary, canonicalFindings, bingKnows, keywordChecks } from "../lib/level1";

const page = (url: string, verdict: string, coverageState: string, g: string | null = null, u: string | null = null) =>
  ({ url, slug: "s", verdict, coverageState, googleCanonical: g, userCanonical: u, lastCrawlTime: null, error: null });

test("IDX-06 compte les pages indexées et nomme les autres", () => {
  const r = indexSummary([
    page("https://www.romain-ecarnot.com/", "PASS", "Submitted and indexed"),
    page("https://www.romain-ecarnot.com/absente", "FAIL", "Crawled - currently not indexed"),
  ]);
  expect(r.total).toBe(2);
  expect(r.indexed).toBe(1);
  expect(r.notIndexed).toEqual([{ url: "https://www.romain-ecarnot.com/absente", coverageState: "Crawled - currently not indexed" }]);
});

test("IDX-06 sur zéro page inspectée", () => {
  expect(indexSummary([])).toEqual({ total: 0, indexed: 0, notIndexed: [] });
});

test("IDX-07 signale une divergence de canonical", () => {
  const r = canonicalFindings([page("https://x/a", "PASS", "ok", "https://x/b", "https://x/a")]);
  expect(r).toEqual([{ url: "https://x/a", googleCanonical: "https://x/b", userCanonical: "https://x/a" }]);
});

test("IDX-07 ne dit rien quand les deux canonicals sont égaux, capture du 30/08", () => {
  expect(canonicalFindings([page("https://www.romain-ecarnot.com/", "PASS", "Submitted and indexed",
    "https://www.romain-ecarnot.com/", "https://www.romain-ecarnot.com/")])).toEqual([]);
});

test("IDX-07 laisse le canonical absent à TAG-03", () => {
  expect(canonicalFindings([page("https://x/a", "PASS", "ok", "https://x/a", null)])).toEqual([]);
});

// AI-03 n'est pas ici : `bingKnows` et ses quatre cas vivent en tâche 5, avec `collectBing` qui les
// consomme. Une règle testée loin de son seul appelant laisse passer une implémentation qui ment.

test("STRAT-05 retrouve le mot visé dans une requête plus longue, requêtes réelles du 30/08", () => {
  const rows = [
    { keys: ["https://lebonpote.romain-ecarnot.com/", "bon pote nantes"], clicks: 0, impressions: 1, ctr: 0, position: 7 },
  ];
  const r = keywordChecks(rows, [{ page: "https://lebonpote.romain-ecarnot.com/", motCle: "bon pote" }]);
  expect(r[0].hasImpressions).toBe(true);
  expect(r[0].keywordFound).toBe(true);
  expect(r[0].topQueries).toEqual(["bon pote nantes"]);
});

test("STRAT-05 distingue le mot raté de la page sans impression", () => {
  const rows = [{ keys: ["https://x/a", "autre chose"], clicks: 0, impressions: 3, ctr: 0, position: 9 }];
  const r = keywordChecks(rows, [{ page: "https://x/a", motCle: "agence seo" }, { page: "https://x/b", motCle: "quoi que ce soit" }]);
  expect(r[0]).toMatchObject({ hasImpressions: true, keywordFound: false, topQueries: ["autre chose"] });
  expect(r[1]).toMatchObject({ hasImpressions: false, keywordFound: null, topQueries: [] });
});
```

Le dernier cas porte la distinction qui compte : une page qui rate son mot-clé est une trouvaille, une page sans aucune impression est une information différente et ne doit pas être comptée comme un échec.

- [ ] **Step 2: lancer, vérifier l'échec**

```bash
cd plugin && bun test skills/audit/scripts/tests/level1.test.ts
```

- [ ] **Step 3: implémenter**

Code exécuté le 30/08, à recopier :

```typescript
import { keywordMatches } from "../../../../lib/strategy";
import { pageKey } from "../../../../lib/url";

/** IDX-06. Le verdict fait foi, pas coverageState : PASS est la seule valeur qui dise « indexée ». */
export function indexSummary(pages: InspectedPage[]): IndexSummary {
  const ok = pages.filter((p) => p.verdict === "PASS");
  return {
    total: pages.length,
    indexed: ok.length,
    notIndexed: pages.filter((p) => p.verdict !== "PASS").map((p) => ({ url: p.url, coverageState: p.coverageState })),
  };
}

/** IDX-07. Un userCanonical absent n'est pas une divergence : c'est le domaine de TAG-03 au niveau 0. */
export function canonicalFindings(pages: InspectedPage[]): CanonicalFinding[] {
  return pages
    .filter((p) => p.googleCanonical && p.userCanonical && p.googleCanonical !== p.userCanonical)
    .map((p) => ({ url: p.url, googleCanonical: p.googleCanonical!, userCanonical: p.userCanonical! }));
}

/**
 * STRAT-05. Trois états et non deux : le mot visé est trouvé, il est raté, ou la page n'a aucune
 * impression sur la période (keywordFound null), ce qui n'est pas un échec de stratégie.
 * Les lignes viennent de dimensions ["page","query"] : keys[0] est la page, keys[1] la requête.
 */
export function keywordChecks(rows: SearchRow[], planned: { page: string; motCle: string }[]): KeywordCheck[] {
  const byPage = new Map<string, SearchRow[]>();
  for (const r of rows) {
    if (r.keys.length < 2) continue;
    const k = pageKey(r.keys[0]);
    byPage.set(k, [...(byPage.get(k) ?? []), r]);
  }
  return planned.map((p) => {
    const found = (byPage.get(pageKey(p.page)) ?? []).slice().sort((a, b) => b.impressions - a.impressions);
    const queries = found.map((r) => r.keys[1]);
    return {
      page: p.page, keyword: p.motCle,
      hasImpressions: queries.length > 0,
      keywordFound: queries.length > 0 ? queries.some((q) => keywordMatches(p.motCle, q)) : null,
      topQueries: queries.slice(0, 3),
    };
  });
}
```

Puis `deriveConsole`, la seule fonction que `collect.ts` appelle et la seule productrice de `derived/console.json`, c'est-à-dire du fichier que les quatre entrées du catalogue lisent. Code exécuté le 30/08, 15 assertions vertes :

```typescript
/**
 * Assemble le dérivé que le rapport lit. Ne juge rien et n'invente rien : les raisons de panne sont
 * recopiées telles quelles, et une absence de donnée reste une absence.
 * `permissionLevel` est conservé parce que c'est lui qui explique un refus (AC-7) ; le perdre rendrait
 * le rapport muet sur la cause.
 */
export function deriveConsole(r: Level1Result, planned: { page: string; motCle: string }[] | null): ConsoleDerived {
  const g = r.google;
  const b = r.bing;
  const unknown = b.pages.filter((p) => !p.known).map((p) => p.url);
  return {
    level: 1,
    google: {
      property: g.property?.siteUrl ?? null,
      permissionLevel: g.property?.permissionLevel ?? null,
      error: g.error,
      sitemapsError: g.sitemapsError,
      index: indexSummary(g.pages),
      canonical: canonicalFindings(g.pages),
      lastDataDate: g.search?.lastDataDate ?? null,
      truncated: g.search?.truncated ?? false,
    },
    bing: { site: b.site, error: b.error, known: b.pages.length - unknown.length, total: b.pages.length, unknown },
    strategy: planned === null ? null : keywordChecks(g.search?.rows ?? [], planned),
  };
}
```

Trois tests obligatoires, qui ferment la moitié d'AC-5 et la lisibilité d'AC-7 :

```typescript
const bloc = (over: any = {}) => ({
  google: { property: { siteUrl: "sc-domain:x.test", permissionLevel: "siteOwner" }, error: null,
    pages: [page("https://x.test/", "PASS", "ok"), page("https://x.test/b", "FAIL", "Crawled - currently not indexed")],
    sitemaps: [], sitemapsError: null,
    search: { lastDataDate: "2026-08-27", rows: [], truncated: false, error: null }, ...over.google },
  bing: { site: "https://x.test/", error: null, pages: [
    { url: "https://x.test/", slug: "index", known: true, lastCrawled: "2026-08-29", error: null },
    { url: "https://x.test/b", slug: "b", known: false, lastCrawled: null, error: null }], ...over.bing },
  raw: [],
});

test("deriveConsole projette un bloc complet", () => {
  const d = deriveConsole(bloc() as any, null);
  expect(d.google.property).toBe("sc-domain:x.test");
  expect(d.google.permissionLevel).toBe("siteOwner");
  expect(d.google.index).toMatchObject({ total: 2, indexed: 1 });
  expect(d.google.lastDataDate).toBe("2026-08-27");
  expect(d.bing).toMatchObject({ known: 1, total: 2, unknown: ["https://x.test/b"] });
});

test("deriveConsole recopie les raisons de panne sans rien inventer", () => {
  const vide = { google: { property: null, error: "aucun jeton Google", pages: [], sitemaps: [], sitemapsError: null, search: null },
                 bing: { site: null, error: "clé Bing absente", pages: [] }, raw: [] };
  const d = deriveConsole(vide as any, null);
  expect(d.google.error).toBe("aucun jeton Google");
  expect(d.bing.error).toBe("clé Bing absente");
  expect(d.google.index).toEqual({ total: 0, indexed: 0, notIndexed: [] });
  expect(d.google.lastDataDate).toBeNull();       // search null ne doit pas lever
  expect(d.google.truncated).toBe(false);
});

test("sans stratégie strategy vaut null, avec stratégie c'est une liste", () => {
  expect(deriveConsole(bloc() as any, null).strategy).toBeNull();
  expect(deriveConsole(bloc() as any, [{ page: "https://x.test/", motCle: "x" }]).strategy).toHaveLength(1);
});
```

Le deuxième test porte une garantie que rien d'autre ne porte : `search` vaut `null` dès que `searchAnalytics` a échoué, et une déréférence directe ferait mourir la collecte au moment précis où elle doit se dégrader proprement.

- [ ] **Step 4: poser le filet anti-tiret cadratin sur les nouvelles sorties**

Le filet du repo est une liste explicite de sorties à exercer, par skill (voir `skills/console/scripts/tests/render.test.ts`, bloc « pas de tiret cadratin »). Il ne couvre pas ce nouveau module : sans cette étape, un tiret injecté dans une des trois constantes de message passerait la suite sans être vu.

```typescript
describe("pas de tiret cadratin", () => {
  // Chaque chaîne littérale destinée à l'écran doit être vue au moins une fois par le filet.
  test("aucun message de dégradation n'en contient", async () => {
    const NOFETCH: any = async () => { throw new Error("aucune requête"); };
    const sansRien = await collectLevel1({ fetcher: NOFETCH, auth: null, authError: "aucun jeton Google", bingKey: null }, OPT);
    const fetcher: any = async (url: string) => {
      if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:autre.test", permissionLevel: "siteOwner" }] }) };
      if (url.includes("GetUserSites")) return { status: 200, text: JSON.stringify({ d: [{ Url: "https://autre.test/", IsVerified: true }] }) };
      return { status: 200, text: JSON.stringify({}) };
    };
    const horsCompte = await collectLevel1({ fetcher, auth: { token: "t", quotaProject: "p", provider: "gcloud" }, authError: null, bingKey: "k" }, OPT);
    const tout = JSON.stringify([sansRien, horsCompte]);
    expect(tout).not.toContain("—");
  });
});
```

Le second cas est indispensable : il est le seul à produire `AUCUNE_PROPRIETE` et `SITE_HORS_COMPTE`, que le premier n'atteint jamais.

- [ ] **Step 5: vérifier**

```bash
cd plugin && bun test
```

Attendu : les onze nouveaux de cette tâche passent (huit fonctions pures, le filet anti-tiret, trois pour `deriveConsole`), **aucun échec**, et aucun test existant n'a disparu.

- [ ] **Step 6: commit**

```bash
git add plugin/skills/audit/scripts
git commit -m "feat(audit): les dérivés des quatre vérifications du niveau 1

IDX-06 compte sur le verdict et non sur coverageState. IDX-07 laisse le
canonical absent à TAG-03. AI-03 lit la sentinelle .NET. STRAT-05 distingue
le mot raté de la page sans impression, et réutilise keywordMatches plutôt
que d'ouvrir une seconde normalisation."
```

---

### Task 7: brancher le niveau 1 dans `collect.ts`

**Files:**
- Modify: `plugin/skills/audit/scripts/collect.ts` (type des options, branche, usage CLI)
- Modify: `plugin/skills/audit/scripts/lib/types.ts` (champ `level1` du manifeste)
- Test: `plugin/skills/audit/scripts/tests/collect.test.ts`

**Interfaces:**
- Consumes: `collectLevel1`, `deriveConsole`, `Level1Result`, `ConsoleDerived` de `./lib/level1` ; `getAccessToken`, `defaultGcloud`, `serviceAccountToken`, `AuthError` de `../../../lib/auth-google`.
- Produces: `Manifest.level1: { attempted: boolean; googleError: string | null; bingError: string | null } | null` ; `CollectOptions.consoleFetcher?: Fetcher`, la couture qui rend D37 observable ; et les fichiers de la section « Ce qui est écrit ».

- [ ] **Step 1: créer la couture qui rend D37 observable, puis écrire les deux tests**

C'est le cœur de la tâche. Sans couture, aucun test ne peut prouver qu'aucune requête ne part : `runCollect` construit son `Fetcher` sur le `fetch` global, et `collect.test.ts` n'a **aucune** simulation réseau (il démarre un vrai serveur local, `startFixtureSite`). Un test qui se contente d'observer une variable qu'il déclare lui-même passerait quel que soit le comportement de `collect.ts`.

`CollectOptions` gagne donc :

```typescript
  /** Injecté par les tests pour observer, ou ne pas observer, les appels aux consoles. En usage réel,
   *  absent : la branche niveau 1 construit son fetcher sur le fetch global. C'est le même motif que
   *  console.ts, où toutes les dépendances entrent en paramètre pour rendre « aucune requête ne part » testable. */
  consoleFetcher?: Fetcher;
```

Les deux tests, à ajouter dans `collect.test.ts` (le harnais du fichier fournit `base` et `out` ; créer un dossier de sortie propre par test avec `mkdtemp`, comme le `beforeAll`) :

```typescript
describe("niveau 1", () => {
  test("sans --level 1, aucune requête ne part vers les consoles", async () => {
    // Le fetcher lève à tout appel : si la branche niveau 1 s'exécutait, runCollect rejetterait.
    const espion: any = async (url: string) => { throw new Error(`requête interdite : ${url}`); };
    const dir = await mkdtemp(join(tmpdir(), "erom-seo-n0-"));
    const m = await runCollect({ url: base, out: dir, maxPages: 2, delayMs: 0, psiKey: null, level: 0, strategyPath: null, consoleFetcher: espion });
    expect(m.level).toBe(0);
    expect(m.level1).toBeNull();
    expect(await Bun.file(join(dir, "derived/console.json")).exists()).toBe(false);
  });

  test("avec --level 1, la branche s'exécute et écrit son dérivé", async () => {
    // Le pendant du test précédent : sans lui, un `if (false)` passerait aussi le premier.
    const vus: string[] = [];
    const espion: any = async (url: string) => {
      vus.push(url);
      if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [] }) };
      return { status: 200, text: JSON.stringify({}) };
    };
    const dir = await mkdtemp(join(tmpdir(), "erom-seo-n1-"));
    const m = await runCollect({ url: base, out: dir, maxPages: 2, delayMs: 0, psiKey: null, level: 1, strategyPath: null, consoleFetcher: espion });
    expect(m.level).toBe(1);
    expect(m.level1?.attempted).toBe(true);
    expect(vus.some((u) => u.includes("googleapis"))).toBe(true);
    expect(await Bun.file(join(dir, "derived/console.json")).exists()).toBe(true);
  });

  test("une panne du niveau 1 ne fait pas échouer l'audit", async () => {
    // AC-7 : code de sortie 0 et rapport complet. assertNoSecret lève par conception, deriveConsole,
    // mkdir et Bun.write aussi : une seule exception non rattrapée tuerait l'audit APRÈS avoir écrit
    // raw/ et AVANT le manifeste, laissant un dossier inexploitable.
    const espion: any = async () => { throw new Error("panne simulée du niveau 1"); };
    const dir = await mkdtemp(join(tmpdir(), "erom-seo-n1-ko-"));
    const m = await runCollect({ url: base, out: dir, maxPages: 2, delayMs: 0, psiKey: null, level: 1, strategyPath: null, consoleFetcher: espion });
    expect(m.level1?.attempted).toBe(true);
    expect(m.level1?.googleError).not.toBeNull();
    expect(await Bun.file(join(dir, "raw/manifest.json")).exists()).toBe(true);   // le manifeste existe quand même
    expect(m.pages.length).toBeGreaterThan(0);                                    // le niveau 0 est intact
  });
});
```

Le troisième test est celui qui ferme AC-8 côté code (le critère a changé de numéro le 30/08, voir la spec). Le rejouer sur un site en ligne hors des deux consoles en tâche 9 le confirme sur du réel, mais un test qui ne dépend d'aucun compte doit garder la propriété.

- [ ] **Step 2: lancer, vérifier l'échec**

```bash
cd plugin && bun test skills/audit/scripts/tests/collect.test.ts
```

Attendu : échec sur `m.level1` qui n'existe pas.

- [ ] **Step 3: étendre les types**

Dans `lib/types.ts`, ajouter au type `Manifest` :

```typescript
  /** Niveau 1 seulement. `null` aux niveaux 0 et 2 : la collecte des consoles n'a pas été tentée. */
  level1: { attempted: boolean; googleError: string | null; bingError: string | null } | null;
```

Dans `collect.ts`, `CollectOptions.level` passe de `0 | 2` à `0 | 1 | 2`, et `reserveOutDir(level: 0 | 1 | 2)`.

- [ ] **Step 4: écrire la branche**

Après les sondes et PageSpeed, avant le manifeste :

```typescript
  // 7b. niveau 1 : les consoles. Jamais atteint sans --level 1 (D37) : les accès de la machine
  // sont permanents, une détection automatique enverrait des requêtes à des tiers sans demande.
  let level1: Manifest["level1"] = null;
  if (level === 1) {
    const bingKey = process.env.BING_WMT_API_KEY ?? null;
    let auth: GoogleAuth | null = null;
    // TOUTE la branche est sous try. La spec ouvre sa section 6 par « le niveau 1 ne fait jamais
    // échouer l'audit », et AC-7 exige un code de sortie 0. Or assertNoSecret lève par conception, et
    // deriveConsole, mkdir et Bun.write peuvent lever : une seule exception qui remonte tuerait la
    // collecte APRÈS l'écriture de raw/gsc/ et AVANT celle du manifeste, laissant un dossier sans
    // manifest.json, donc inexploitable par la skill.
    try {
      const fetcher: Fetcher = o.consoleFetcher ?? (async (url, init) => {
        const r = await fetch(url, init);
        return { status: r.status, text: await r.text() };
      });
      let authError: string | null = null;
      try {
        auth = await getAccessToken(process.env, {
          gcloud: () => defaultGcloud(),
          serviceAccount: (p) => serviceAccountToken(p, fetcher),
        });
      } catch (e) {
        authError = e instanceof AuthError ? `${e.message} : ${e.hint}` : String(e);
      }
      const r = await collectLevel1({ fetcher, auth, authError, bingKey },
        { origin, pages: facts.map((f) => ({ url: f.url, slug: f.slug })), today: new Date().toISOString().slice(0, 10), delayMs: delay });
      for (const f of r.raw) {
        await mkdir(join(raw, dirname(f.path)), { recursive: true });
        await save(f.path, f.body);
      }
      const derivedConsole = deriveConsole(r, strat?.strategy?.pages.map((p) => ({ page: p.page, motCle: p.motCle })) ?? null);
      const text = JSON.stringify(derivedConsole, null, 2);
      assertNoSecret(text, bingKey);
      assertNoSecret(text, auth?.token ?? null);
      await Bun.write(join(derived, "console.json"), text);
      level1 = { attempted: true, googleError: r.google.error, bingError: r.bing.error };
    } catch (e) {
      // Le message d'assertNoSecret ne contient jamais le secret lui-même (il le nomme, sans le citer).
      level1 = { attempted: true, googleError: e instanceof Error ? e.message : String(e), bingError: null };
    }
  }
```

Ajouter `level1` au littéral du manifeste, et `assertNoSecret` sur le manifeste sérialisé avant son écriture, avec la même paire de secrets.

`dirname` vient de `node:path`, à ajouter à l'import existant.

- [ ] **Step 5: ouvrir le drapeau à la CLI**

Dans le bloc `import.meta.main`, remplacer la lecture de `--level` :

```typescript
    level: args.includes("--level") ? (([0, 1, 2] as const).find((n) => n === Number(opt("--level"))) ?? 0) : undefined,
```

Et l'usage :

```typescript
    console.error("usage : bun collect.ts <url> [--out <dossier>] [--max-pages 10] [--page <url>]... [--level 0|1|2] [--no-psi] [--strategy-path <chemin|none>]");
```

Ajouter une ligne à la sortie finale, seulement au niveau 1 :

```typescript
  if (m.level1?.attempted) {
    console.log(`consoles : Google ${m.level1.googleError ?? "ok"}, Bing ${m.level1.bingError ?? "ok"}`);
  }
```

- [ ] **Step 6: vérifier**

```bash
cd plugin && bun test
```

Attendu : les trois nouveaux de cette tâche passent, **aucun échec**, et le total n'a jamais baissé depuis la baseline de 375 relevée avant la tâche 1. Puis, sur le compte réel, la première collecte de niveau 1 :

```bash
source ~/.zshenv && cd /tmp && mkdir -p n1-essai && cd n1-essai
bun /Users/recarnot/dev/erom-agence-seo/plugin/skills/audit/scripts/collect.ts https://www.romain-ecarnot.com/ --level 1 --max-pages 5 --no-psi
ls -R seo/audits/*/raw/gsc seo/audits/*/raw/bing && cat seo/audits/*/derived/console.json
```

Attendu : un dossier `-n1`, `raw/gsc/inspect/*.json` peuplé, `derived/console.json` lisible.

- [ ] **Step 7: vérifier qu'aucun secret n'est tombé sur le disque**

```bash
cd /tmp/n1-essai && source ~/.zshenv
[ -n "$BING_WMT_API_KEY" ] && command grep -rl "$BING_WMT_API_KEY" seo/ ; echo "clé : $?"
command grep -rl "ya29\.\|authorization\|apikey=" seo/ ; echo "jeton : $?"
```

Attendu : aucun fichier listé dans les deux cas.

- [ ] **Step 8: commit**

```bash
git add plugin/skills/audit/scripts
git commit -m "feat(audit): collect.ts --level 1

Le niveau 1 ne s'allume que sur le drapeau (D37), gardé par un test qui
échoue si une requête part vers googleapis ou bing.com sans lui. Les
réponses brutes vont dans raw/gsc et raw/bing, le dérivé dans
derived/console.json, tous deux passés à assertNoSecret."
```

---

### Task 8: le catalogue et la skill

Sans cette tâche, la collecte existe et le rapport n'en parle pas.

**Files:**
- Modify: `plugin/skills/audit/references/checks/indexability.md` (IDX-06, IDX-07)
- Modify: `plugin/skills/audit/references/checks/strategy.md` (STRAT-05)
- Modify: `plugin/skills/audit/references/checks/ai-presence.md` (AI-03)
- Modify: `plugin/skills/audit/references/levels.md`
- Modify: `plugin/skills/audit/SKILL.md`
- Test: `plugin/skills/audit/scripts/tests/checks-format.test.ts`, `bun skills/audit/scripts/check-sources.ts`

**Interfaces:**
- Consumes: la forme de `derived/console.json` (tâche 6), citée telle quelle dans le champ `Comment` de chaque vérification.
- Produces: quatre entrées lisibles par `parseChecks`.

- [ ] **Step 1: relire le format d'une entrée**

```bash
cd plugin && sed -n '1,30p' skills/audit/references/checks/ai-presence.md
```

Champs obligatoires, dans cet ordre : `Couche`, `Niveau`, `Sévérité`, `Vérifie`, `Comment`, `Source`, `Correctif`, `Effort`. Le titre suit `### ID : titre`. Les sources doivent porter une citation entre guillemets français, retrouvable dans la page : `check-sources.ts` la vérifie pour de vrai.

- [ ] **Step 2: écrire AI-03**

Dans `ai-presence.md`, à la suite d'AI-02 :

```markdown
### AI-03 : présence dans l'index Bing
Couche     : absolue
Niveau     : 1
Sévérité   : Mineur
Vérifie    : chaque page collectée est connue de l'index Bing, qui alimente Copilot.
Comment    : derived/console.json → bing : error non nul = non vue, avec la raison. Sinon known sur total, et unknown liste les pages inconnues. Une page est connue si Bing rend une date de dernier crawl qui n'est pas la sentinelle DateTime.MinValue. Ne jamais citer HttpStatus : il vaut 0 même sur une page indexée (capture du 29/08).
Source     : https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview « shows how publisher content appears across Microsoft Copilot, AI-generated summaries in Bing, and select partner integrations »
Correctif  : ajouter le site dans Bing Webmaster Tools, soumettre le sitemap, et déclarer une clé IndexNow (AI-02) pour accélérer la découverte.
Effort     : rapide
```

Les quatre citations de cette tâche ont été passées au normaliseur du repo le 30/08 et sont retrouvées sur leur page : les recopier **à l'octet près**. Si l'une échoue plus tard, c'est que la page a changé : relever la nouvelle phrase sur la page, jamais retirer la source pour faire passer le contrôle.

- [ ] **Step 3: écrire IDX-06 et IDX-07**

Dans `indexability.md`, avec les mêmes exigences de citation :

```markdown
### IDX-06 : pages indexées par Google
Couche     : absolue
Niveau     : 1
Sévérité   : Critique
Vérifie    : les pages collectées sont dans l'index Google. Une page absente de l'index ne reçoit aucun trafic, quelle que soit sa qualité.
Comment    : derived/console.json → google.index : indexed sur total, et notIndexed liste chaque page avec son coverageState. Dire toujours que le compte porte sur les pages collectées et non sur le site entier (--max-pages plafonne). Ne jamais utiliser le champ indexed de sitemaps.list : il vaut « 0 » même sur des pages indexées (mesure du 30/08).
Source     : https://support.google.com/webmasters/answer/9012289 « The URL Inspection tool provides information about Google's indexed version of a specific page, and also allows you to test whether a URL might be indexable. »
Correctif  : vérifier robots.txt et la balise robots, soumettre la page dans Search Console, et s'assurer qu'elle est atteignable depuis le sitemap et un lien interne.
Effort     : moyen

### IDX-07 : Google a choisi un autre canonical que celui déclaré
Couche     : absolue
Niveau     : 1
Sévérité   : Important
Vérifie    : pour chaque page, le canonical retenu par Google est celui que la page déclare.
Comment    : derived/console.json → google.canonical : une entrée par divergence, avec googleCanonical et userCanonical. Liste vide = passée. Une page sans canonical déclaré n'apparaît pas ici : c'est TAG-03 au niveau 0, ne pas doubler la trouvaille.
Source     : https://support.google.com/webmasters/answer/9012289 « Inspect the indexed version of the page and look at the Page indexing > Google-selected canonical field. »
Correctif  : rapprocher la balise canonique de l'URL réellement servie, vérifier les redirections apex/www et les paramètres d'URL, puis redemander l'indexation.
Effort     : moyen
```

- [ ] **Step 4: écrire STRAT-05**

Dans `strategy.md` :

```markdown
### STRAT-05 : les requêtes réelles contre le mot-clé visé
Couche     : stratégique
Niveau     : 1
Sévérité   : Important
Vérifie    : chaque page de strategy.md ressort sur le mot-clé qu'elle vise, d'après les requêtes réelles des 90 derniers jours.
Comment    : derived/console.json → strategy : par page, hasImpressions, keywordFound et topQueries. keywordFound false avec hasImpressions true = trouvaille, citer les topQueries. keywordFound null = la page n'a aucune impression sur la période : ce n'est pas un échec de stratégie, le dire comme une information distincte. Toujours donner la date de dernier jour de données (google.lastDataDate) : elle a environ trois jours de retard.
Source     : https://developers.google.com/webmaster-tools/v1/searchanalytics/query « The method returns zero or more rows grouped by the row keys (dimensions) that you define. »
Correctif  : soit la page est réécrite vers le mot visé (title, h1, ouverture, voir STRAT-01), soit la stratégie adopte le mot sur lequel la page ressort déjà, si l'intention correspond.
Effort     : long
```

- [ ] **Step 5: mettre `levels.md` à jour**

Remplacer le bloc « Niveau 1, à livrer au chantier 5 » par la liste livrée : IDX-06, IDX-07, AI-03, et STRAT-05 sous la couche stratégique. Ajouter, sous le tableau, la phrase qui explique l'absence :

```markdown
LVL1-01 (impressions dans les fonctionnalités IA) et LVL1-02 (citations Copilot) ne sont pas livrés : ces deux rapports ne sont dans aucune API (l'API Search Console refuse le type `GENERATIVE_AI`, mesuré le 30/08) et leur export n'est ouvert qu'à une partie des propriétés. Ils reviendront en import de fichier quand une propriété cliente les aura. Voir la spec du 30/08, section 11.7.
```

Corriger aussi la ligne du tableau : le niveau 1 voit désormais « état d'indexation, canonical retenu par Google, requêtes réelles, présence dans l'index Bing », et ne voit toujours pas les données IA.

- [ ] **Step 6: mettre `SKILL.md` à jour**

Trois endroits : l'étape 0.2 (le niveau ne se devine pas, `--level 1` est explicite et suppose les accès), l'étape 1 (la commande gagne `--level 1`), et l'étape de lecture, qui doit citer `derived/console.json` comme source des quatre nouvelles vérifications. Ajouter une phrase sur la fraîcheur : le rapport donne toujours `google.lastDataDate`.

- [ ] **Step 7: vérifier**

```bash
cd plugin && bun test skills/audit/scripts/tests/checks-format.test.ts && bun skills/audit/scripts/check-sources.ts
```

Attendu : format valide, **0 citation en échec**, et un compte de citations retrouvées supérieur de quatre à celui d'avant la tâche. Relever le compte de départ AVANT de toucher aux références (`bun skills/audit/scripts/check-sources.ts | tail -1`) plutôt que de le prédire : le nombre bouge à chaque ajout, et un plan qui fige « 119 » devient faux au prochain chantier. Ce qui fait foi est le **0 en échec**.

Une citation non retrouvée est une citation inventée : la corriger sur la page réelle, ne jamais la retirer du fichier pour faire passer le contrôle.

- [ ] **Step 8: commit**

```bash
git add plugin/skills/audit/references plugin/skills/audit/SKILL.md
git commit -m "docs(audit): les quatre vérifications du niveau 1 au catalogue

IDX-06 et IDX-07 dans indexability, STRAT-05 dans strategy, AI-03 dans
ai-presence. levels.md dit ce que le niveau 1 voit désormais et pourquoi
les deux vérifications IA n'y sont pas."
```

---

### Task 9: recette sur les comptes réels

Aucun code. On joue les onze critères de la spec et on écrit ce qu'on a vu, y compris ce qui rate.

**Files:**
- Create: `docs/superpowers/plans/2026-08-30-erom-seo-chantier-5-niveau-1-recette.md`

- [ ] **Step 1: préparer le terrain**

```bash
source ~/.zshenv && [ -n "$BING_WMT_API_KEY" ] && echo "clé Bing présente" && [ -n "$GSC_QUOTA_PROJECT" ] && echo "projet de quota présent"
mkdir -p /tmp/recette-n1 && cd /tmp/recette-n1
```

Ne jamais afficher la valeur d'une des deux variables.

- [ ] **Step 2: AC-1, AC-3, AC-4, AC-6, AC-9**

Une collecte niveau 1 sur `https://www.romain-ecarnot.com/`, puis lecture du dossier et de `derived/console.json`. Noter le compte de pages indexées, la liste des divergences de canonical (attendu : aucune, les deux canonicals sont égaux au 30/08), les pages connues de Bing, et `lastDataDate` (attendu : environ trois jours avant le jour de la recette).

- [ ] **Step 3: AC-7, l'accès refusé est nommé**

Le critère a été révisé le 30/08 : `healthincloud.app` est **hors ligne** par décision de Romain (mesuré : `curl` rend HTTP 000), donc aucun audit ne peut plus s'y dérouler. La **propriété** Search Console, elle, existe toujours et refuse toujours ses sitemaps. Le refus de droits s'observe donc par la lentille de consultation, pas par un audit :

```bash
source ~/.zshenv && cd <plugin> && bun skills/console/scripts/console.ts sites
```

Attendu : la ligne `sc-domain:healthincloud.app (siteUnverifiedUser)` suivie de « sitemaps non lisibles pour cette propriété ». Consigner la sortie réelle.

La partie « le refus n'est jamais confondu avec une absence » est portée par le test unitaire de `level1.ts` qui force `listSitemaps` à rendre 403 et exige le message dans `sitemapsError` : le nommer dans la recette et donner son résultat.

- [ ] **Step 4: AC-8, un site en ligne hors des deux consoles**

C'est ce critère qui porte désormais la garantie « le niveau 1 ne fait jamais échouer l'audit », reprise d'AC-7 après sa révision. `commentchercherbonheur.org` est le seul site à la fois **en ligne** et absent des deux comptes.

```bash
bun <plugin>/skills/audit/scripts/collect.ts https://commentchercherbonheur.org/ --level 1 --max-pages 5 --no-psi ; echo "code de sortie : $?"
```

Attendu : code **0**, collecte niveau 0 complète avec ses pages, et les deux moitiés du niveau 1 non vues avec leurs **deux raisons distinctes** (« aucune propriété Search Console ne couvre cette URL » et « ce site n'est pas dans le compte Bing »). Un code non nul est un échec du critère, à consigner tel quel plutôt qu'à corriger.

- [ ] **Step 5: AC-5, avec et sans stratégie**

Depuis `/Users/recarnot/dev/chico-happiness`, qui a un `seo/strategy.md` : une collecte avec, une avec `--strategy-path none`. Vérifier que `strategy` est peuplé dans un cas, `null` dans l'autre. Chico n'ayant de propriété chez aucune console, ce critère se lit sur la présence du bloc et non sur ses valeurs : le noter comme tel dans la recette plutôt que de le déclarer OK sans preuve.

- [ ] **Step 6: AC-2 et AC-10**

Un audit niveau 0 ordinaire : vérifier l'absence de `raw/gsc/`, `raw/bing/` et `derived/console.json`. Puis la double recherche de secrets de la tâche 7, étape 7, sur tous les dossiers produits pendant la recette.

- [ ] **Step 7: AC-11**

```bash
cd plugin && bun test
source ~/.zshenv && bun skills/console/scripts/console.ts sites
bun skills/strategy/scripts/keywords.ts "bon pote"
```

Attendu : suite verte, et les deux verbes rendent ce qu'ils rendaient avant le déménagement.

- [ ] **Step 8: écrire la recette**

Une section par critère : la commande jouée, la sortie réelle, et OK ou KO. Un critère non joué se dit « non joué » avec sa raison ; il ne se convertit jamais en OK. Terminer par la liste des résidus et, pour chacun, la décision prise (corrigé, parqué, ou à trancher par Romain).

- [ ] **Step 9: commit**

```bash
git add docs/superpowers/plans/2026-08-30-erom-seo-chantier-5-niveau-1-recette.md
git commit -m "docs(recette): chantier 5 étape 2, niveau 1 recetté sur les vrais comptes"
```

---

## Ce que le plan ne fait pas

Repris de la spec, section 10, pour qu'aucune tâche ne dérive : pas de lecteur de CSV IA, pas de recette du compte de service, pas de pagination `searchAnalytics`, pas de méthodes Bing par page ou par requête, pas de verbe comparatif Google contre Bing.

Et la sonde Bing du 1er septembre (survie de l'endpoint JSON après le retrait SOAP et POX du 31 août) est **hors de ce plan** mais tombe pendant sa durée de vie : si elle échoue, la correction se fait dans `plugin/lib/bing.ts` seul, ce que la tâche 3 rend possible.
