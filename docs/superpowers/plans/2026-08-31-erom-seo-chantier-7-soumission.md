# Chantier 7, soumettre aux moteurs : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `console update` soumet le sitemap à Google et à Bing et poste les URL à IndexNow en une commande, et `TAG-05` signale les titres de plus de 65 caractères.

**Architecture:** Les trois écritures se réunissent dans `plugin/lib/soumission.ts`, avec deux appelants et deux seulement, `console update` et `checklist --agir`. L'écriture Google est nouvelle et vit dans `plugin/lib/gsc.ts`, seule de son espèce. `checklist/scripts/lib/actions.ts` devient un fichier de réexport, ce qui laisse ses 44 tests intacts.

**Tech Stack:** Bun 1.4.0, TypeScript, `bun:test`. Aucune dépendance nouvelle.

**Spec:** `docs/superpowers/specs/2026-08-31-erom-seo-soumission-design.md`

## Global Constraints

- **Bun 1.4.0**, aucune dépendance ajoutée à `plugin/package.json`.
- **`plugin/lib/` ne dépend d'aucune skill.** Un module commun qui importe depuis `skills/` est une erreur de conception, pas un détail.
- **Aucun secret affiché.** La clé Bing passe par `redact`, le jeton Google par `assertNoSecret`. La clé IndexNow est publique par construction et s'affiche.
- **Aucun tiret cadratin** dans le code, les commentaires, les messages ou la documentation. Le lint du dépôt le refuse.
- **Tests par invariant.** Interdits : figer un compte d'entrées de catalogue, asserter sur le texte du source, calibrer un mock sur une convention non capturée.
- **Toute commande de test se lance depuis `/Users/recarnot/dev/erom-seo-chantier-7/plugin`.** Un `cd` absolu ouvre chaque commande qui écrit ou versionne.
- **Nommage.** Le code du dépôt est en français pour les identifiants métier (`verifierCleServie`, `soumissions`) et garde l'anglais pour ce qui reprend un nom d'API (`submitSitemap`, `pingIndexNow`).

## Écart assumé avec la section 3 de la spec

La spec nomme les fonctions du module commun `submitSitemapGoogle, submitFeedBing, postIndexNow, verifierCleServie`. Le plan garde les noms **existants** `pingIndexNow` et `bingSubmitFeed` pour les deux fonctions déménagées.

Raison : AC-6 exige que les 44 tests de `checklist` passent sans qu'une seule assertion change. Les renommer forcerait à toucher `actions.test.ts`, et la non-régression du déménagement ne serait plus démontrable. Le nom neuf, `submitSitemapGoogle`, suit la spec.

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `plugin/lib/sitemap.ts` | **Créé.** Les trois primitives pures de sitemap, remontées de la skill audit | T1 |
| `plugin/lib/auth-google.ts` | `SCOPE_WRITE` et `SUBMIT_HINT` à côté de `SCOPE` et `LOGIN_HINT` | T2 |
| `plugin/lib/gsc.ts` | `submitSitemap`, la seule écriture. `PUT` dans `FetchInit`, `final` dans le retour du `Fetcher` | T2 |
| `plugin/lib/soumission.ts` | **Créé.** Les trois soumissions, `sitemapsFromRobots`, `verifierCleServie`, `trouverSitemap` | T3 |
| `plugin/lib/bing.ts` | Son commentaire de tête, qui dit l'inverse de D52 | T3 |
| `plugin/skills/checklist/scripts/lib/actions.ts` | Réduit à un fichier de réexport | T3 |
| `plugin/skills/console/scripts/console.ts` | La branche `update` | T4, T5 |
| `plugin/skills/console/scripts/lib/render.ts` | `renderUpdate`, pur, et son entrée au filet anti tiret cadratin | T4 |
| `plugin/skills/console/scripts/tests/console-cli.test.ts` | Helper `deps()` étendu, faux serveur partagé, neuf tests | T4, T5 |
| `plugin/skills/console/SKILL.md` | Cinquième temps, la discipline du dry-run, et le frontmatter | T6 |
| `plugin/skills/console/references/acces.md` | `ACC-07` neuf, `ACC-03` corrigé | T6 |
| `plugin/skills/build/scripts/lib/plan.ts` | `TAG-05` dans `KINDS`, et la réécriture du titre | T7 |
| `plugin/skills/build/references/nextjs.md` | La recette rattachée à `TAG-05`, la contrainte des 60 caractères | T7 |
| `plugin/skills/audit/scripts/tests/lint-report.test.ts` | Le compte figé à 26, converti en invariant | T7 |
| `plugin/skills/audit/references/report-template.md` | Le compte du gabarit, 26 vers 27 | T7 |
| `plugin/skills/audit/scripts/tests/fixtures/site.ts` | Option `longTitle`, page servie **et** listée au sitemap | T7 |
| `plugin/skills/audit/references/checks/tags.md` | `TAG-05`, écrit **en dernier** | T7 |

---

## Task 1: Remonter les primitives de sitemap dans le commun

**Files:**
- Create: `plugin/lib/sitemap.ts`
- Modify: `plugin/skills/audit/scripts/lib/sitemap.ts` (retirer trois fonctions, les réimporter)
- Modify: `plugin/skills/checklist/scripts/checklist.ts:10` (import corrigé)
- Test: `plugin/lib/tests/sitemap.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `parseSitemap(xml: string): { kind: SitemapKind; locs: string[] }`, `decodeSitemapBody(body: Uint8Array, url: string, contentType: string | null): string`, `sitemapCandidates(fromRobots: string[], origin: string): string[]`, `type SitemapKind = "index" | "urlset" | "unknown"`.

Contexte : `checklist/scripts/checklist.ts:10` importe déjà ces fonctions depuis `skills/audit/`, ce qui viole la règle du commun. Ce déménagement corrige une dette existante en même temps qu'il sert T3.

- [ ] **Step 1: Créer le fichier commun avec les trois fonctions**

Créer `plugin/lib/sitemap.ts` avec le contenu exact ci-dessous, copié sans modification depuis `skills/audit/scripts/lib/sitemap.ts` :

```ts
// Primitives de sitemap partagées. Remontées de skills/audit/scripts/lib/sitemap.ts le 31/08 (chantier 7) :
// checklist les importait déjà à travers la skill audit, et lib/soumission.ts en a besoin à son tour.
// collectSitemapUrls reste dans l'audit : il dépend de ses types (FetchResult, SitemapUrlStats) et de lui seul.

export type SitemapKind = "index" | "urlset" | "unknown";

export function parseSitemap(xml: string): { kind: SitemapKind; locs: string[] } {
  const kind: SitemapKind = /<sitemapindex[\s>]/i.test(xml) ? "index" : /<urlset[\s>]/i.test(xml) ? "urlset" : "unknown";
  const locs = kind === "unknown" ? [] : [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  return { kind, locs };
}

/** Un sitemap peut être servi compressé (.gz, content-type gzip, ou octets magiques 1f 8b). Le protocole impose UTF-8. */
export function decodeSitemapBody(body: Uint8Array, url: string, contentType: string | null): string {
  const magic = body.length > 2 && body[0] === 0x1f && body[1] === 0x8b;
  const gz = magic || url.endsWith(".gz") || /gzip/i.test(contentType ?? "");
  return new TextDecoder().decode(gz ? Bun.gunzipSync(body) : body);
}

/** Ordre de recherche : ce que robots.txt déclare (peut être sur un autre hôte), puis /sitemap.xml, puis /sitemap_index.xml. */
export function sitemapCandidates(fromRobots: string[], origin: string): string[] {
  const out: string[] = [];
  for (const u of [...fromRobots, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]) if (!out.includes(u)) out.push(u);
  return out;
}
```

- [ ] **Step 2: Vider les trois fonctions de la skill audit et les réimporter**

Dans `plugin/skills/audit/scripts/lib/sitemap.ts`, supprimer les corps de `parseSitemap`, `decodeSitemapBody`, `sitemapCandidates` et le type `SitemapKind`, puis remplacer les deux premières lignes du fichier par :

```ts
import type { FetchResult, SitemapUrlStats } from "./types";
import { sameSite, pageKey, rewriteToOrigin } from "../../../../lib/url";
import { parseSitemap, decodeSitemapBody, type SitemapKind } from "../../../../lib/sitemap";

// Réexport : les appelants de l'audit gardent leur import inchangé, la définition a déménagé dans le commun.
export { parseSitemap, decodeSitemapBody, sitemapCandidates } from "../../../../lib/sitemap";
export type { SitemapKind } from "../../../../lib/sitemap";
```

`formatSkippedWarning` et `collectSitemapUrls` restent en place, sans modification. Le `import` nommé en plus du réexport est nécessaire parce que `collectSitemapUrls` appelle `parseSitemap` et `decodeSitemapBody` dans son propre corps.

- [ ] **Step 3: Corriger l'import de la checklist**

Dans `plugin/skills/checklist/scripts/checklist.ts`, remplacer la ligne 10 :

```ts
import { decodeSitemapBody, parseSitemap } from "../../../lib/sitemap";
```

L'ancienne ligne pointait vers `../../../skills/audit/scripts/lib/sitemap`.

- [ ] **Step 4: Écrire le test du commun**

Créer `plugin/lib/tests/sitemap.test.ts` :

```ts
import { test, expect } from "bun:test";
import { parseSitemap, decodeSitemapBody, sitemapCandidates } from "../sitemap";

test("parseSitemap distingue urlset, index et illisible", () => {
  expect(parseSitemap('<urlset><url><loc>https://a.fr/</loc></url></urlset>')).toEqual({ kind: "urlset", locs: ["https://a.fr/"] });
  expect(parseSitemap('<sitemapindex><sitemap><loc>https://a.fr/s1.xml</loc></sitemap></sitemapindex>')).toEqual({ kind: "index", locs: ["https://a.fr/s1.xml"] });
  expect(parseSitemap("<html></html>")).toEqual({ kind: "unknown", locs: [] });
});

test("decodeSitemapBody décompresse un corps gzip reconnu par ses octets magiques", () => {
  const xml = '<urlset><url><loc>https://a.fr/</loc></url></urlset>';
  const gz = Bun.gzipSync(new TextEncoder().encode(xml));
  expect(decodeSitemapBody(gz, "https://a.fr/sitemap.xml", null)).toBe(xml);
  expect(decodeSitemapBody(new TextEncoder().encode(xml), "https://a.fr/sitemap.xml", null)).toBe(xml);
});

test("sitemapCandidates met le robots en tête et ne répète jamais une URL", () => {
  expect(sitemapCandidates(["https://a.fr/s.xml"], "https://a.fr")).toEqual([
    "https://a.fr/s.xml", "https://a.fr/sitemap.xml", "https://a.fr/sitemap_index.xml",
  ]);
  expect(sitemapCandidates(["https://a.fr/sitemap.xml"], "https://a.fr")).toEqual([
    "https://a.fr/sitemap.xml", "https://a.fr/sitemap_index.xml",
  ]);
});
```

- [ ] **Step 5: Lancer la suite entière**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
```

Attendu : tout vert, 506 tests plus les 3 nouveaux. **Aucune assertion existante n'a le droit de changer.** Un échec dans `skills/audit/scripts/tests/sitemap.test.ts` signifie que le réexport de l'étape 2 est incomplet, pas que le test est faux.

- [ ] **Step 6: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/lib/sitemap.ts plugin/lib/tests/sitemap.test.ts plugin/skills/audit/scripts/lib/sitemap.ts plugin/skills/checklist/scripts/checklist.ts
git commit -m "refactor(lib): remonter les primitives de sitemap dans le commun

checklist les importait a travers la skill audit, ce que la regle du commun
interdit. lib/soumission.ts (chantier 7) en a besoin a son tour.
collectSitemapUrls reste dans l audit, seul consommateur de ses types."
```

---

## Task 2: L'écriture Google, seule de son espèce

**Files:**
- Modify: `plugin/lib/auth-google.ts` (ajouter `SCOPE_WRITE`, `SUBMIT_HINT`, `PUT` dans `FetchInit`, `final` dans le retour)
- Modify: `plugin/lib/gsc.ts` (ajouter `submitSitemap`, passer `ecriture` à `fail`)
- Test: `plugin/lib/tests/gsc.test.ts` (compléter)

**Interfaces:**
- Consumes: `GoogleAuth`, `Fetcher` de `auth-google.ts`.
- Produces: `submitSitemap(f: Fetcher, auth: GoogleAuth, siteUrl: string, feedUrl: string): Promise<void>` qui lève `GscError` sur refus. `SCOPE_WRITE: string`, `SUBMIT_HINT: string`.

**Échantillon capturé.** Le refus ci-dessous a été obtenu le 31/08/2026 par un `PUT` réel contre `sc-domain:commentchercherbonheur.org` avec le jeton de la machine, qui n'a que `webmasters.readonly`. C'est la réponse littérale de Google, pas une reconstitution :

```json
{ "error": { "code": 403, "message": "Request had insufficient authentication scopes.",
  "errors": [ { "message": "Insufficient Permission", "domain": "global", "reason": "insufficientPermissions" } ],
  "status": "PERMISSION_DENIED",
  "details": [ { "@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT",
    "domain": "googleapis.com",
    "metadata": { "service": "searchconsole.googleapis.com", "method": "google.searchconsole.v1.SitemapsService.Submit" } } ] } }
```

Deux enseignements qui commandent le code. Le premier : la requête a bien atteint `SitemapsService.Submit`, donc le chemin et son encodage sont validés en vrai. Le second : `fail()` lit `details[].reason`, il trouvera `ACCESS_TOKEN_SCOPE_INSUFFICIENT` et donnera aujourd'hui `LOGIN_HINT`, qui porte le scope **readonly**. Sans le paramètre `ecriture`, le message renverrait l'utilisateur vers la commande qui ne répare rien.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `plugin/lib/tests/gsc.test.ts` :

```ts
import { submitSitemap } from "../gsc";
import { SUBMIT_HINT } from "../auth-google";

const auth = { token: "jeton-de-test-non-hex", quotaProject: "projet-test", provider: "gcloud" as const };

test("submitSitemap construit le chemin exact validé contre l'API le 31/08", async () => {
  let vu = { url: "", method: "" };
  const f = async (url: string, init?: { method?: string }) => { vu = { url, method: init?.method ?? "GET" }; return { status: 204, text: "" }; };
  await submitSitemap(f, auth, "sc-domain:commentchercherbonheur.org", "https://www.commentchercherbonheur.org/sitemap.xml");
  expect(vu.method).toBe("PUT");
  expect(vu.url).toBe(
    "https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Acommentchercherbonheur.org" +
    "/sitemaps/https%3A%2F%2Fwww.commentchercherbonheur.org%2Fsitemap.xml",
  );
});

test("submitSitemap accepte 200 comme 204", async () => {
  const f = async () => ({ status: 200, text: "" });
  expect(await submitSitemap(f, auth, "https://a.fr/", "https://a.fr/sitemap.xml")).toBeUndefined();
});

test("un scope insuffisant donne la commande gcloud du scope d'écriture", async () => {
  const corps = JSON.stringify({ error: { code: 403, message: "Request had insufficient authentication scopes.",
    status: "PERMISSION_DENIED",
    details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } });
  const f = async () => ({ status: 403, text: corps });
  try {
    await submitSitemap(f, auth, "https://a.fr/", "https://a.fr/sitemap.xml");
    throw new Error("aurait dû lever");
  } catch (e) {
    const hint = (e as { hint: string }).hint;
    expect(hint).toBe(SUBMIT_HINT);
    expect(hint).toContain("auth/webmasters");
    expect(hint).not.toContain("webmasters.readonly");
  }
});

test("un 403 sans reason de scope parle du rôle, pas du jeton", async () => {
  const f = async () => ({ status: 403, text: JSON.stringify({ error: { code: 403, message: "User does not have sufficient permission for site" } }) });
  try {
    await submitSitemap(f, auth, "https://a.fr/", "https://a.fr/sitemap.xml");
    throw new Error("aurait dû lever");
  } catch (e) {
    expect((e as { hint: string }).hint).toContain("propriétaire");
  }
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test lib/tests/gsc.test.ts
```

Attendu : ÉCHEC, `submitSitemap` et `SUBMIT_HINT` ne sont pas exportés.

- [ ] **Step 3: Ajouter le scope d'écriture et son hint**

Dans `plugin/lib/auth-google.ts`, après la ligne `export const SCOPE = ...` :

```ts
/** Le scope d'écriture. Il couvre webmasters.readonly : demander celui-ci ne retire aucune lecture. */
export const SCOPE_WRITE = "https://www.googleapis.com/auth/webmasters";
```

Puis, après `LOGIN_HINT` :

```ts
export const SUBMIT_HINT =
  `ce jeton n'a pas le droit d'écrire dans Search Console. Relance :\n` +
  `  gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,${SCOPE_WRITE}\n` +
  `Ce scope couvre aussi toutes les lectures : rien d'autre ne change. Voir references/acces.md, ACC-07.`;
```

Dans le même fichier, élargir `FetchInit` et le retour du `Fetcher` :

```ts
export type FetchInit = { method?: "GET" | "POST" | "PUT"; headers?: Record<string, string>; body?: string };
// `final` porte l'URL après redirections. Optionnel : seul console update s'en sert, pour connaître
// l'origine réellement servie (D53). Les appelants qui l'ignorent ne changent pas.
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string; final?: string }>;
```

- [ ] **Step 4: Répercuter les deux types dans gsc.ts et ajouter l'écriture**

Dans `plugin/lib/gsc.ts`, remplacer la déclaration locale des deux types par la même forme qu'à l'étape 3 (`"GET" | "POST" | "PUT"`, et `final?: string` dans le retour), puis ajouter `SUBMIT_HINT` à l'import depuis `./auth-google`.

Changer la signature de `fail` et sa branche de scope :

```ts
function fail(status: number, text: string, quotaProject: string | null, ecriture = false): never {
```

Dans le corps, remplacer la ligne du scope insuffisant par :

```ts
  if (reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" || /insufficient authentication scopes/i.test(message)) {
    throw new GscError("Search Console a refusé, scope insuffisant", status, ecriture ? SUBMIT_HINT : LOGIN_HINT);
  }
```

et la ligne du 403 générique par :

```ts
  if (status === 403) {
    throw new GscError(
      "droits insuffisants sur cette propriété",
      status,
      ecriture
        ? "le rôle de ce compte ne permet probablement pas de soumettre un sitemap. Google ne documente pas le rôle exigé par l'API, seulement qu'il faut « appropriate access (owner, full, read) » ; le rapport Sitemaps de l'interface web, lui, demande Owner. Repli sûr : le faire faire par le propriétaire du site, ou déclarer le sitemap dans robots.txt."
        : "le rôle de ce compte ne permet pas cette lecture. Voir references/acces.md, rôles Search Console.",
    );
  }
```

Enfin, à la fin du fichier, la seule écriture :

```ts
/**
 * sitemaps.submit, la seule écriture de ce module et la seule du plugin vers Google (D51).
 * Le scope `auth/webmasters` qu'elle réclame autorise aussi sitemaps.delete, sites.add et sites.delete :
 * aucune des trois n'est implémentée, et ce refus est une décision. Un plugin capable de retirer la
 * propriété Search Console d'un client est un plugin qu'on n'ose plus lancer.
 * Chemin et encodage validés contre l'API le 31/08 (la requête atteint SitemapsService.Submit).
 * Le code de succès n'est documenté nulle part : la référence dit seulement « returns an empty response
 * body », le discovery ne déclare aucun schéma de réponse. On accepte donc 200 et 204 sans en attester un.
 * WMX_BASE reste sur www.googleapis.com : le discovery donne searchconsole.googleapis.com en rootUrl
 * préféré, mais les deux hôtes routent ce chemin et le dépôt s'y appuie déjà pour ses quatre lectures.
 */
export async function submitSitemap(f: Fetcher, auth: GoogleAuth, siteUrl: string, feedUrl: string): Promise<void> {
  const url = `${WMX_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedUrl)}`;
  const r = await f(url, { method: "PUT", headers: headers(auth) });
  if (r.status !== 200 && r.status !== 204) fail(r.status, r.text, auth.quotaProject, true);
}
```

Corriger enfin le commentaire de tête du fichier, qui affirme aujourd'hui le contraire :

```ts
// Les lectures Search Console, plus une écriture et une seule : sitemaps.submit (D51, chantier 7).
// Refusées explicitement, bien que le scope les autorise : sitemaps.delete, sites.add, sites.delete.
// Conventions capturées en vrai le 29/08 et le 31/08 sur les propriétés de Romain.
```

- [ ] **Step 5: Vérifier que les tests passent**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test
```

Attendu : tout vert, les 4 nouveaux tests compris.

- [ ] **Step 6: Vérifier qu'aucune autre écriture n'est entrée (AC-8)**

Le grep cible **l'appel**, jamais le mot : l'étape 4 vient d'écrire « sitemaps.delete, sites.add, sites.delete » dans le commentaire de tête de `gsc.ts`, et T6 réécrira la même phrase dans `acces.md`. Une vérification qui matche la phrase documentant le refus se déclenche sur sa propre documentation.

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && command grep -rnE 'method: *"DELETE"' plugin/lib plugin/skills --include='*.ts' ; echo "exit $?"
```

Attendu : aucune ligne, `exit 1` (grep ne trouve rien).

Puis la seconde moitié du critère, qui elle est positive et vérifiable :

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && head -3 plugin/lib/gsc.ts
```

Attendu : le commentaire de tête nomme les trois écritures refusées et pourquoi.

La commande d'AC-8 dans la spec souffre du même défaut de ciblage : la corriger là-bas aussi, en même temps que la recette (T8 étape 9).

- [ ] **Step 7: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/lib/gsc.ts plugin/lib/auth-google.ts plugin/lib/tests/gsc.test.ts
git commit -m "feat(gsc): sitemaps.submit, la seule ecriture Google du plugin

D51 : le scope auth/webmasters autorise aussi delete et sites.add,
aucune n est implementee et ce refus est une decision.
Le refus de scope renvoie SUBMIT_HINT (scope ecriture) et non LOGIN_HINT
(scope lecture), qui ne reparait rien. Echantillon 403 reel du 31/08."
```

---

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
cd /Users/recarnot/dev/erom-seo-chantier-7 && command grep -rn 'from ".*skills/' plugin/lib/*.ts ; echo "exit $?"
```

Attendu : aucune ligne (`exit 1`). Une ligne trouvée casse la règle du commun. (Le troisième motif de l'ancienne
alternative, `skills/` nu, remontait aussi des commentaires de provenance sans rapport avec un import : corrigé
en revue finale du chantier 7.)

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

## Task 6: La procédure et la référence d'accès

**Files:**
- Modify: `plugin/skills/console/SKILL.md`
- Modify: `plugin/skills/console/references/acces.md`
- Test: `plugin/skills/console/scripts/tests/acces.test.ts` (le test de format existant couvre la nouvelle entrée)

**Interfaces:** aucune, ce sont des documents lus par le modèle.

- [ ] **Step 1: Ajouter ACC-07 à la référence d'accès**

Dans `plugin/skills/console/references/acces.md`, ajouter une entrée au format exact des six autres (`### Titre (ACC-nn)` avec `Chemin`, `Piège`, `Source`) :

```markdown
### Obtenir le droit d'écrire dans Search Console (ACC-07)
Chemin   : le jeton par défaut de `gcloud auth application-default login` ne porte que la lecture. Pour que `console update` puisse soumettre un sitemap, relancer une fois : `gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters`. Le scope `webmasters` couvre `webmasters.readonly` : aucune lecture ne se perd.
Piège    : le scope suffit à parler à l'API, pas forcément à soumettre. Le rôle exigé par `sitemaps.submit` n'est écrit nulle part : la documentation API demande seulement « appropriate access (owner, full, read) », et la page d'aide qui exige Owner parle du rapport Sitemaps de l'interface web, pas de l'API. Sur un site client où l'agence est Full user, tester une fois : si Google refuse, le sitemap se déclare dans robots.txt, ou se soumet par le propriétaire.
Piège    : ce même scope autorise `sitemaps.delete`, `sites.add` et `sites.delete`. Le plugin n'implémente aucune des trois, volontairement (D51). Le pouvoir est dans le jeton, pas dans le code.
Source   : https://developers.google.com/webmaster-tools/v1/sitemaps/submit « Submits a sitemap for a site. »
Source   : https://developers.google.com/webmaster-tools/about « You must have appropriate access (owner, full, read) to any Google Search Console account that you wish to access using the API. »
```

**La citation Owner que le plan portait d'abord était tronquée d'une manière qui la retournait.** La phrase entière de `support.google.com/webmasters/answer/7451001` est : « You must have owner permissions on a property to submit a sitemap **using the Sitemaps report**. If you don't have owner permissions, you can list the sitemap in your robots.txt file instead. » Le fragment « using the Sitemaps report » désigne l'interface web. Couper là transformait une règle d'interface en règle d'API, et `check-sources.ts` l'aurait validée sans broncher puisque le fragment existe bel et bien sur la page. C'est le seul défaut de ce plan qu'aucune commande n'aurait attrapé.

- [ ] **Step 2: Corriger ACC-03, qui dit l'inverse**

`references/acces.md:17` (ACC-03) affirme aujourd'hui : « `console` demande toujours `webmasters.readonly`, donc une soumission de sitemap lui est refusée par construction. » Cette phrase devient fausse à l'instant où ACC-07 existe. La remplacer par : « `console` demande `webmasters.readonly` pour ses trois lectures. La commande `update` a besoin du scope d'écriture, voir ACC-07. »

- [ ] **Step 3: Vérifier que les deux citations sont retrouvées**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun skills/audit/scripts/check-sources.ts
```

Attendu : les deux nouvelles citations passent en `OK`, aucun `ÉCHEC` neuf. `support.google.com` répond 404 en HEAD et 200 en GET : le script est déjà en GET, c'est un piège connu du 29/08.

Si la citation `sitemaps/submit` n'est pas retrouvée (la page est rendue en JavaScript), la basculer en `[manuel]` en fin de ligne, comme les deux entrées Bing de `consoles.md` :

```markdown
Source   : https://developers.google.com/webmaster-tools/v1/sitemaps/submit « Submits a sitemap for a site. » [manuel]
```

- [ ] **Step 4: Ajouter le cinquième temps à la skill**

Dans `plugin/skills/console/SKILL.md`, réécrire le paragraphe d'ouverture qui affirme aujourd'hui « Le verbe `console` lit, il n'agit pas », puis ajouter la section. Le paragraphe devient :

```markdown
Le verbe `console` lit, et il agit sur une seule commande, `update`, qui prévient les moteurs qu'un site a bougé. Les trois autres commandes n'écrivent rien : ni fichier posé sur disque, ni requête d'écriture. Ce n'est pas un audit : pas de `raw/`, pas de rapport daté. Pour une preuve datée, c'est `/erom-seo:audit`.
```

Et la section neuve, après le temps 4 :

```markdown
## 5. Soumettre

`console update` fait partir trois choses, chacune indépendante de l'échec des deux autres :

- le sitemap chez Google (`sitemaps.submit`), sur la propriété qui couvre le site, résolue et jamais fabriquée ;
- le sitemap chez Bing (`SubmitFeed`), sur le site tel que le compte Bing le nomme ;
- les URL du sitemap chez IndexNow, qui les relaie aux six autres moteurs participants. **Google n'en fait pas partie** : aucun POST IndexNow ne le prévient, seul le sitemap le fait.

**Toujours dans cet ordre, sans exception :**

1. Lancer `console update --dry-run` et montrer la sortie à Romain.
2. Attendre son OK explicite.
3. Relancer sans `--dry-run`.

Le dry-run joue toutes les lectures, y compris le contrôle de la clé IndexNow servie, et n'émet aucune écriture. Sauter cette étape parce que « ça a marché la dernière fois » est exactement le geste que cette consigne interdit.

Pour signaler une page qui vient de changer sans retoucher les sitemaps : `console update --url https://<site>/la-page`, répétable. C'est le geste courant après le lancement, quand le sitemap ne bouge pas mais qu'une page a été réécrite.

Le premier refus attendu la première fois est le scope : le jeton par défaut de gcloud ne sait que lire. Le message donne la commande exacte à relancer, elle est aussi dans `references/acces.md`, ACC-07.

Ce que `update` ne fait pas : demander l'indexation d'une URL (l'API ne l'expose pas, seule l'interface web le fait, avec un quota quotidien), ajouter une propriété, ni retirer quoi que ce soit.
```

- [ ] **Step 5: Mettre à jour le frontmatter de la skill**

`SKILL.md` lignes 3 et 4 sont la surface de déclenchement de la skill, et aucun test ne les couvre. Après ce chantier, `description` affirme « sans rien écrire », ce qui est faux, et ne porte aucun déclencheur de soumission : « soumets le sitemap », « préviens les moteurs », « on vient de déployer » ne matcheraient rien. `argument-hint` ignore les trois nouveautés alors que la constante `USAGE` du script, elle, a été mise à jour en T4.

```yaml
description: Lit l'état des consoles Google Search Console et Bing Webmaster Tools depuis le terminal, sans ouvrir un onglet, et soumet aux deux moteurs quand on le lui demande : quelles propriétés et quels accès, quel sitemap est arrivé et ce qu'il en dit, si une URL est indexée et sous quel canonical Google l'a retenue, ce que Bing voit passer, et l'envoi du sitemap plus le POST IndexNow après une mise en production. Triggers : '/erom-seo:console', 'est-ce que cette page est indexée', 'quel canonical Google a retenu', 'j'ai bien accès à la Search Console de ce client', 'mon sitemap est-il arrivé', 'qu'est-ce que Bing voit', 'soumets le sitemap', 'préviens les moteurs', 'on vient de déployer', 'signale cette page aux moteurs'.
argument-hint: "[sites | inspect <url> | crawl | update] [--site <url>] [--url <u>] [--dry-run] [--json]"
```

- [ ] **Step 6: Vérifier le format de la référence**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console/scripts/tests/acces.test.ts
```

Attendu : vert. Le test valide la forme de chaque entrée ; il ne compte pas les entrées.

- [ ] **Step 7: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/skills/console/SKILL.md plugin/skills/console/references/acces.md
git commit -m "docs(console): le cinquieme temps, soumettre, et ACC-07

La skill impose dry-run, OK de Romain, puis envoi reel. Elle dit aussi que
Google ne participe pas a IndexNow : seul le sitemap le previent."
```

---

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

## Task 8: La recette sur CHICO

**Files:** aucun fichier du plugin. Produit `docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-recette.md`.

**Interfaces:** aucune. Cette tâche exécute les huit critères d'acceptation de la spec et consigne les réponses réelles.

Cette tâche **ne peut pas être déléguée à un sous-agent** : elle demande le OK de Romain avant chaque écriture réelle, et un élargissement de scope qu'il est le seul à pouvoir faire.

**Deux dépôts, et il faut les deux.** Le dossier client `clients/commentchercherbonheur.org/` est ignoré par git : il n'existe **que** dans le checkout principal `/Users/recarnot/dev/erom-agence-seo`. Le code du chantier, lui, n'existe que dans le worktree. Chaque commande de recette se lance donc depuis le dossier client du checkout principal, en pointant le script du worktree par son chemin absolu. Le raccourci `.../console.ts` n'est jamais écrit tel quel : il se développe en entier à chaque fois.

```bash
CONSOLE=/Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts
CLIENT=/Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org
```

- [ ] **Step 1: Relever l'état avant, pour pouvoir prouver l'après**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts sites
```

Coller la sortie dans la recette : c'est la date de soumission du sitemap **avant**, la seule preuve que le PUT a fait quelque chose.

- [ ] **Step 2: AC-3, capturer le refus de scope, sans `--dry-run`**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update ; echo "code $?"
```

**Sans `--dry-run`, et c'est délibéré.** Le mode simulation fabrique le résultat Google au lieu d'appeler l'API : il ne peut donc pas produire le refus de scope, qui est exactement ce que ce critère doit capturer. L'appel réel est sans risque ici : le jeton n'a pas le scope d'écriture, Google refuse avant tout effet, et le refus est l'observation recherchée.

Attendu : la ligne `google` porte le refus de scope et la commande `gcloud` complète ; les lignes `bing` et `indexnow`, elles, vont réellement partir. **Ce cas ne se rejoue plus après l'étape 3 : c'est maintenant ou jamais.**

- [ ] **Step 3: Demander à Romain d'élargir le scope**

Lui donner la commande et attendre qu'il l'ait lancée lui-même. Un `gcloud auth application-default login` ouvre un navigateur et demande un compte : ce n'est pas une commande à lancer à sa place.

```bash
gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
```

Cette commande est identique, au caractère près, à celle de `SUBMIT_HINT` (T2) et à celle d'`ACC-07` (T6). Les trois doivent le rester : c'est la commande que le message d'erreur donne à l'utilisateur, et une variante qui traîne dans la documentation est une variante que quelqu'un finira par coller.

Vérifier ensuite, sans jamais afficher le jeton :

```bash
source ~/.zshenv && T=$(gcloud auth application-default print-access-token) && \
  curl -s "https://oauth2.googleapis.com/tokeninfo?access_token=$T" | python3 -c "import sys,json; print(json.load(sys.stdin).get('scope'))"
```

Attendu : la chaîne contient `auth/webmasters` sans le suffixe `.readonly`.

- [ ] **Step 4: AC-1 et AC-5, le dry-run**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --dry-run ; echo "code $?"
BING_WMT_API_KEY= bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --dry-run ; echo "code $?"
```

Attendu : la première sortie annonce les trois envois au futur ; la seconde dit `non interrogé (clé absente)` sur la ligne Bing et sort quand même en 0. Relancer `console sites` pour confirmer que la date de soumission du sitemap n'a pas bougé depuis l'étape 2.

- [ ] **Step 5: AC-2, l'envoi réel, après le OK de Romain**

Montrer la sortie du dry-run, demander le OK, puis :

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update ; echo "code $?"
```

Coller les trois réponses réelles dans la recette. Deux n'ont jamais été observées : le succès du PUT Google, et le comportement de `SubmitFeed` quand le compte Bing connaît le site en apex (`https://commentchercherbonheur.org/`) alors que le sitemap est sur le www. C'est l'incertitude 1 de la spec, et c'est ici qu'elle se lève.

**Consigner le corps brut de la réponse Bing, pas seulement la ligne rendue.** `bingSubmitFeed` traite tout HTTP 200 comme un succès sans regarder le champ `ErrorCode`, alors que `lib/bing.ts` teste `ErrorCode` avant le code HTTP, ce qui atteste que Bing sait renvoyer un refus dans un corps en 200. Si Bing refuse ainsi, la commande dira « soumis » et l'incertitude 1 serait close à tort. Capturer le corps par un curl direct en parallèle :

```bash
source ~/.zshenv && curl -s -X POST -H "content-type: application/json; charset=utf-8" \
  -d '{"siteUrl":"https://commentchercherbonheur.org/","feedUrl":"https://www.commentchercherbonheur.org/sitemap.xml"}' \
  "https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=$BING_WMT_API_KEY" \
  | sed "s/$BING_WMT_API_KEY/[CLE]/g" ; echo
```

Attendu si tout va bien : `{"d":null}`. Tout autre corps, en particulier un `ErrorCode` non nul, ouvre une ligne de suite : soit `bingSubmitFeed` doit lire `ErrorCode` comme le fait `lib/bing.ts` (correctif hors de ce chantier, la copie devait rester à l'identique pour AC-6), soit la variante www est à ajouter dans le compte Bing, ce qui est un geste de compte.

- [ ] **Step 6: AC-2 suite, la preuve côté consoles**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts sites
```

Attendu : la date de soumission du sitemap chez Google a changé par rapport à l'étape 1.

- [ ] **Step 7: AC-4, le ping d'une page seule**

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --url https://www.commentchercherbonheur.org/methode ; echo "code $?"
bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update --url https://exemple.fr/x ; echo "code $?"
```

Attendu : la première ne porte aucune ligne `google` ni `bing` et rend 202 chez IndexNow ; la seconde refuse en nommant `exemple.fr` et sort en 1 sans requête.

- [ ] **Step 8: AC-7, TAG-05, et ce que les tests ne prouvent pas**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/audit
```

**Ce que ce test prouve, et ce qu'il ne prouve pas.** Aucun code du dépôt ne calcule les trouvailles : le catalogue est déclaratif, `parseChecks` ne fait que le lire et `lint-report.ts` ne vérifie que la forme du rapport. C'est Claude qui juge, en lisant `references/checks/`. Le test prouve donc que le titre long du site jouet est collecté entier dans `derived/pages.json`, ce qui est la condition pour que TAG-05 soit jugeable. Il ne prouve pas qu'une trouvaille sort.

La vérification du critère se fait à la main, sur une exécution d'audit réelle : lancer `/erom-seo:audit` sur un site portant un titre de plus de 65 caractères et lire le rapport. Aucun site du portefeuille n'en porte au 31/08, mesuré ce jour-là : CHICO au plus long 58 caractères (`/institut`), `romain-ecarnot.com` 58, `lebonpote.romain-ecarnot.com` 55. Consigner AC-7 comme **non vérifié sur cible réelle**, avec cette raison, plutôt que de l'arrondir au vert du test unitaire.

- [ ] **Step 9: Écrire la recette et mettre à jour la mémoire du dépôt**

Créer `docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-recette.md` avec, par critère, la commande lancée et sa sortie réelle. Un critère non atteint s'écrit tel quel, jamais arrondi.

Puis mettre à jour :
- `_memory_/architecture.md` : la section du verbe `console` dit aujourd'hui « lentille **en lecture seule** » et « les deux écritures du plugin restent dans `checklist --agir` (D30) ». Les deux phrases sont fausses après ce chantier.
- `_memory_/key-files.md` : `lib/soumission.ts`, `lib/sitemap.ts`, et la ligne de `gsc.ts` qui dit « Aucune écriture, et il n'y en aura pas ».
- `_memory_/gotchas.md` : trois entrées. Le jeton gcloud par défaut ne porte que `webmasters.readonly`, et un `application-default login` qui omet un scope le retire. `bingUserSites` existe en deux exemplaires au comportement différent (`lib/bing.ts` lit `ErrorCode` avant le code HTTP, `lib/soumission.ts` non), donc un import qui mélange les deux change silencieusement le comportement de trois commandes. Le rôle Owner pour `sitemaps.submit` par API n'est documenté nulle part : la page d'aide qui l'affirme parle du rapport Sitemaps de l'interface web.

- [ ] **Step 10: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add docs/ _memory_/
git commit -m "docs(recette): chantier 7, la soumission recettee sur CHICO"
```

---
## Ordre et dépendances

```
T1 (sitemap commun)
 └─> T2 (ecriture Google)
      └─> T3 (module commun)
           └─> T4 (console update)
                └─> T5 (--url, --dry-run)
                     └─> T6 (SKILL.md, acces.md)

T7 (TAG-05, du cablage au catalogue)   en parallele, des le depart

                                       └─> T8 (recette, apres T6 et T7)
```

T7 ne touche aucun fichier de T1 à T6 : elle peut partir en parallèle de l'autre branche dès le début. Elle est indivisible : trois tests existants lisent le catalogue, et le scinder laisserait la suite rouge entre les deux moitiés.

## Auto-revue du plan

**Couverture de la spec.** D50 est portée par T4 (branche `update`), T6 (le paragraphe de tête et le frontmatter du SKILL.md, qui affirment aujourd'hui le contraire) et T3 (le commentaire de `lib/bing.ts`). D51 par T2, y compris son commentaire de tête et sa vérification par grep en AC-8. D52 par T3. D53 par `trouverSitemap` en T3 et la sonde de redirection en T4. D54 par `verifierCleServie` en T3, et par le test de T4 qui vérifie qu'une clé différente est un échec. D55 par T5. D56 par T5 (le drapeau) et T6 (la discipline). D57 par le partage explicite entre raison d'échec et raison de non-applicabilité en T4. D58 par T7. Les huit critères d'acceptation sont exécutés en T8, sauf AC-6 (T3, étape 6) et AC-8 (T2, étape 6), qui se jouent au moment où le risque existe plutôt qu'à la fin.

**Ce que la revue adversariale a changé, avant qu'une ligne de code soit écrite.** Un relecteur sur modèle capable a passé le plan au crible, avec pour consigne de ne faire confiance à aucun de ses résumés et d'aller relire la documentation des trois API. Il a rendu 26 défauts, dont 8 bloquants, cinq reproduits par exécution. Les huit bloquants sont corrigés ici :

1. **Les 32 chemins pointaient sur le checkout principal**, pas sur le worktree. Dans le mauvais arbre, `bun test` sort vert à 506 tests et **cache** tous les autres défauts au lieu de les révéler, et `git add` échoue en pathspec. Corrigé partout, avec l'exception documentée du dossier client de T8, qui n'existe que dans le checkout principal.
2. **T4 importait `bingUserSites` en double.** `console.ts:6` l'importe déjà de `lib/bing`, et bun ne lève rien : il relie tout le module au dernier import. Les trois commandes déjà recettées auraient basculé en silence sur une implémentation qui ne lit pas `ErrorCode`, perdant le message « la clé n'est plus acceptée par Bing ». Aucun test n'aurait rougi.
3, 4, 5. **Trois tests existants que T7 faisait rougir** : `plan.test.ts:130` (tout id du catalogue a un genre), `lint-report.test.ts:114` (compte figé à 26), `checks-format.test.ts:34` (citation d'au moins 15 caractères, et « Titre trop long » en fait exactement 15). D'où la fusion des deux tâches TAG-05 et l'ordre inversé : le catalogue s'écrit en dernier.
6. **Les tests de T4 et T5 appelaient un helper `deps()` à la mauvaise signature** et n'injectaient aucune stratégie, donc aucun POST IndexNow n'aurait pu partir.
7. **Le grep d'AC-8 se déclenchait sur sa propre documentation** : il cherchait `sitemaps.delete`, mot que T2 venait d'écrire dans un commentaire.
8. **Le dry-run rendait AC-3 inobservable** : il court-circuite l'appel Google, donc il ne peut pas produire le refus de scope que ce critère doit capturer.

Un neuvième, non bloquant mais que rien n'aurait rattrapé : **la citation Owner était tronquée d'une manière qui la retournait**. « You must have owner permissions on a property to submit a sitemap » s'arrête en réalité sur « **using the Sitemaps report** », c'est-à-dire l'interface web. Aucune page ne pose Owner comme prérequis de l'API, qui demande seulement « appropriate access (owner, full, read) ». Une citation tronquée passe `check-sources.ts`, passe les tests, et s'installe comme une source vérifiée.

**Code exécuté avant d'être écrit ici.** `sitemapsFromRobots` a passé 10 cas dans un scratch, dont le commentaire de fin de ligne que la première version perdait. La construction du chemin Google a été comparée caractère par caractère au chemin d'un `curl` réel qui a atteint `SitemapsService.Submit`, et son refus 403 est l'échantillon littéral reproduit en T2. Le corps IndexNow et celui de `SubmitFeed` sont copiés d'un code en production, figé sur les exemples officiels du 29/08 et reconfirmés sur la documentation le 31/08.

**Blocs non normatifs, assumés comme tels.** Deux seulement : le montage du test de T7 étape 1, qui recopie celui d'un test voisin, et le corps du test de T7 étape 10, décrit par son invariant. Tous les autres blocs de test sont normatifs et se transcrivent tels quels, le faux serveur de T4 étant paramétré une fois puis réutilisé par les neuf tests de T4 et T5.

**Cohérence des noms.** `ActionResult` est défini une fois en T3 et réexporté par `checklist.ts` et `actions.ts`. `Fetcher` a un seul retour, `{ status, text, final? }`, aligné en T2 dans `auth-google.ts` et `gsc.ts`. `submitSitemap` (gsc, lève) et `submitSitemapGoogle` (soumission, rend un `ActionResult`) sont deux noms pour deux couches, jamais confondus. `pingIndexNow` et `bingSubmitFeed` gardent leurs noms d'origine, écart avec la section 3 de la spec assumé et justifié en tête de plan. La commande `gcloud` est identique au caractère près à ses trois occurrences (T2, T6, T8).

**Une dette laissée en place, et nommée.** `bingUserSites` existe en deux exemplaires au comportement différent, et ce chantier n'y touche pas : les fusionner changerait le comportement de `checklist`, dont les 44 tests doivent passer sans qu'une assertion bouge. La table est en tête de T3, l'entrée de gotcha en T8 étape 9.
