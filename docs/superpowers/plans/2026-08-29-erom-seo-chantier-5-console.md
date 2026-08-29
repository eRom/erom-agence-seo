# Verbe `console` (chantier 5, étape 1) : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer `/erom-seo:console`, une lentille en lecture seule sur Google Search Console et Bing Webmaster Tools : `sites`, `inspect <url>`, `crawl`.

**Architecture:** Une skill de plus dans `plugin/skills/`, même patron que les quatre existantes : un CLI bun, de la logique pure dans `scripts/lib/`, un `fetch` injecté pour rendre testable « aucune écriture ne part ». Le jeton Google vient de deux fournisseurs derrière une seule fonction (gcloud aujourd'hui, compte de service demain). Aucun fichier n'est écrit, aucune API d'écriture n'est appelée.

**Tech Stack:** Bun 1.4, TypeScript, `bun:test`, `fetch` natif, `crypto.subtle` (compte de service). Aucune dépendance nouvelle.

**Spec:** `docs/superpowers/specs/2026-08-29-erom-seo-console-design.md`

**Code exécuté avant l'écriture de ce plan.** Toute la logique pure des tâches 1 à 6 a été lancée par la session mère le 29/08 dans un bac à sable, contre les échantillons réels ci-dessous : 7 assertions sur `resolve`, 17 sur `auth-google` et le décodage `gsc`, 19 sur `bing` et `render`, 10 sur l'orchestration `runConsole`. Toutes vertes. Les blocs de code de ce plan sont ceux qui ont tourné, à la mise en forme près. Deux exceptions marquées non normatives : `serviceAccountToken` (tâche 2, aucun compte de service n'existe encore) et le décodage détaillé des méthodes Bing jamais capturées (tâche 4).

## Global Constraints

- Bun 1.4, TypeScript, `bun:test`. **Aucune dépendance ajoutée à `plugin/package.json`.**
- La logique pure vit dans `scripts/lib/`, sans réseau ni disque. Les CLI vivent dans `scripts/` avec `import.meta.main`.
- Tout appel réseau passe par un `Fetcher` injecté. Type repris tel quel de `skills/checklist/scripts/lib/actions.ts` : `type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string }` et `type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>`.
- **Aucun secret affiché**, jamais : ni `BING_WMT_API_KEY`, ni un jeton porteur, ni une URL qui contient la clé. Toute sortie passe par `redact`.
- **Aucune écriture** : aucun appel à `SubmitFeed`, `SubmitUrlBatch`, `sitemaps.submit` ni `api.indexnow.org`. Un test le prouve avec un faux `fetch`.
- **Pas de tiret cadratin** dans les chaînes affichées à l'écran ni dans les fichiers Markdown de la skill. Hyphens ou reformulation.
- Les tests portent sur des comportements. Interdits : figer un compte de lignes, un nombre d'entrées, ou lire le texte du source depuis un test.
- `siteEntry` de `sites.list` **n'a pas d'ordre garanti** (deux appels successifs le 29/08 ont rendu un ordre différent). Aucun test, aucun rendu ne suppose un ordre.
- Variables d'environnement : `GSC_QUOTA_PROJECT` (obligatoire avec gcloud), `GSC_SA_KEY_FILE` (bascule vers compte de service), `BING_WMT_API_KEY` (Bing).

## Structure des fichiers

```
plugin/skills/console/
  SKILL.md                        Tâche 7
  scripts/
    console.ts                    Tâche 6, CLI : sites | inspect <url> | crawl
    lib/
      resolve.ts                  Tâche 1, pure : URL -> propriété, hôte -> site Bing
      auth-google.ts              Tâche 2 : getAccessToken, deux fournisseurs
      gsc.ts                      Tâche 3 : sites.list, sitemaps.list, urlInspection
      bing.ts                     Tâche 4 : GetUserSites, GetFeeds, GetUrlInfo, GetCrawlStats, GetCrawlIssues
      render.ts                   Tâche 5, pure : texte et JSON
    tests/
      resolve.test.ts             Tâche 1
      auth-google.test.ts         Tâche 2
      gsc.test.ts                 Tâche 3
      bing.test.ts                Tâche 4
      render.test.ts              Tâche 5
      console-cli.test.ts         Tâche 6
      fixtures/gsc/               Tâche 3 : réponses réelles capturées le 29/08
  references/
    acces.md                      Tâche 7
plugin/skills/audit/scripts/check-sources.ts   Tâche 7, étendu à acces.md
plugin/README.md                               Tâche 7
```

## Échantillons réels, capturés le 29/08 par la session mère

Ces quatre réponses sont les fixtures. Elles viennent d'appels réels sur les propriétés de Romain, jeton ADC, jamais reprises d'un résumé. Origine : spec section 12, plus deux captures ajoutées à l'écriture du plan.

**A. `GET https://www.googleapis.com/webmasters/v3/sites`, HTTP 200**

```json
{"siteEntry":[{"siteUrl":"sc-domain:healthincloud.app","permissionLevel":"siteUnverifiedUser"},{"siteUrl":"sc-domain:romain-ecarnot.com","permissionLevel":"siteOwner"},{"siteUrl":"https://lebonpote.romain-ecarnot.com/","permissionLevel":"siteOwner"}]}
```

**B. `GET .../sites/https%3A%2F%2Flebonpote.romain-ecarnot.com%2F/sitemaps`, HTTP 200**

```json
{"sitemap":[{"path":"https://lebonpote.romain-ecarnot.com/sitemap.xml","lastSubmitted":"2026-04-30T16:13:26.601Z","isPending":false,"isSitemapsIndex":false,"type":"sitemap","lastDownloaded":"2026-05-01T18:06:47.626Z","warnings":"0","errors":"0","contents":[{"type":"web","submitted":"1","indexed":"0"}]}]}
```

**C. `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` sur une page connue, HTTP 200**

```json
{"inspectionResult":{"inspectionResultLink":"https://search.google.com/search-console/inspect?resource_id=sc-domain:romain-ecarnot.com&id=0cCUNIQT5xs0RmdklDR0eA","indexStatusResult":{"verdict":"NEUTRAL","coverageState":"Page with redirect","robotsTxtState":"ALLOWED","indexingState":"INDEXING_ALLOWED","lastCrawlTime":"2026-08-21T08:31:23Z","pageFetchState":"SUCCESSFUL","googleCanonical":"https://www.romain-ecarnot.com/","userCanonical":"https://www.romain-ecarnot.com/","referringUrls":["https://www.romain-ecarnot.com/","http://romain-ecarnot.com/"],"crawledAs":"MOBILE"},"mobileUsabilityResult":{"verdict":"VERDICT_UNSPECIFIED"}}}
```

**D. Le même appel sur une URL inconnue, HTTP 200** (capturé le 29/08 à 19 h 00)

```json
{"inspectionResult":{"inspectionResultLink":"https://search.google.com/search-console/inspect?resource_id=sc-domain:romain-ecarnot.com&id=Irulr4888TayQ1HjO_76FA","indexStatusResult":{"verdict":"NEUTRAL","coverageState":"URL is unknown to Google","robotsTxtState":"ROBOTS_TXT_STATE_UNSPECIFIED","indexingState":"INDEXING_STATE_UNSPECIFIED","pageFetchState":"PAGE_FETCH_STATE_UNSPECIFIED"},"mobileUsabilityResult":{"verdict":"VERDICT_UNSPECIFIED"}}}
```

Noter : ni `lastCrawlTime`, ni `googleCanonical`, ni `userCanonical` sur une URL inconnue. Le décodage doit les traiter comme absents, pas comme vides.

**E. `GET .../GetUserSites?apikey=<clé>`, HTTP 200** (capturé le 29/08 pendant le chantier 4)

```json
{"d":[]}
```

**F. Erreur Bing, clé refusée, HTTP 400** (capturé le 27/08 et le 29/08)

```json
{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}
```

**G. Le 403 sans projet de quota** (capturé le 29/08) : `sites.list` avec un jeton gcloud valide mais sans en-tête `x-goog-user-project` rend HTTP 403, corps contenant `"reason": "SERVICE_DISABLED"` et le message « The searchconsole.googleapis.com API requires a quota project, which is not set by default. »

Formes de `GetUrlInfo`, `GetCrawlStats`, `GetFeeds` et `GetCrawlIssues` : **non capturées**, le compte Bing de Romain est vide. Écrites d'après `IWebmasterApi` et la classe `UrlInfo` (Microsoft Learn), enveloppe `{"d": …}` comme toutes les méthodes JSON de Bing. Incertitudes 1 et 2 de la spec ; sonde à la recette dès qu'un site entre dans le compte.

---

### Task 1: `resolve.ts`, résolution d'une propriété (logique pure)

**Files:**
- Create: `plugin/skills/console/scripts/lib/resolve.ts`
- Test: `plugin/skills/console/scripts/tests/resolve.test.ts`

**Interfaces:**
- Consumes: `sameSite` de `plugin/skills/audit/scripts/lib/sitemap.ts`, signature `sameSite(u: string, origin: string): boolean`.
- Produces: `type Property = { siteUrl: string; permissionLevel: string }` ; `resolveProperty(url: string, properties: Property[]): Property | null` ; `type BingSite = { Url: string; IsVerified: boolean }` ; `resolveBingSite(host: string, sites: BingSite[]): BingSite | null`.

- [ ] **Step 1: Write the failing test**

```ts
// plugin/skills/console/scripts/tests/resolve.test.ts
import { describe, test, expect } from "bun:test";
import { resolveProperty, resolveBingSite, type Property } from "../lib/resolve";

// Les trois propriétés réelles du compte de Romain, capture du 29/08 (échantillon A du plan).
const PROPS: Property[] = [
  { siteUrl: "sc-domain:healthincloud.app", permissionLevel: "siteUnverifiedUser" },
  { siteUrl: "sc-domain:romain-ecarnot.com", permissionLevel: "siteOwner" },
  { siteUrl: "https://lebonpote.romain-ecarnot.com/", permissionLevel: "siteOwner" },
];

describe("resolveProperty", () => {
  test("une propriété Domaine couvre son hôte et ses sous-domaines", () => {
    expect(resolveProperty("https://romain-ecarnot.com/", PROPS)?.siteUrl).toBe("sc-domain:romain-ecarnot.com");
    expect(resolveProperty("https://www.romain-ecarnot.com/methode", PROPS)?.siteUrl).toBe("sc-domain:romain-ecarnot.com");
    expect(resolveProperty("https://healthincloud.app/x", PROPS)?.siteUrl).toBe("sc-domain:healthincloud.app");
  });
  test("une propriété préfixe d'URL bat la propriété Domaine qui la contient", () => {
    expect(resolveProperty("https://lebonpote.romain-ecarnot.com/article", PROPS)?.siteUrl).toBe("https://lebonpote.romain-ecarnot.com/");
  });
  test("entre deux préfixes candidats, le plus long gagne", () => {
    const p: Property[] = [
      { siteUrl: "https://a.example.com/", permissionLevel: "siteOwner" },
      { siteUrl: "https://a.example.com/blog/", permissionLevel: "siteFullUser" },
    ];
    expect(resolveProperty("https://a.example.com/blog/x", p)?.siteUrl).toBe("https://a.example.com/blog/");
  });
  test("un domaine qui se termine pareil sans être un sous-domaine ne compte pas", () => {
    expect(resolveProperty("https://notromain-ecarnot.com/", PROPS)).toBeNull();
  });
  test("hors de toute propriété, ou pas une URL, rend null", () => {
    expect(resolveProperty("https://example.com/", PROPS)).toBeNull();
    expect(resolveProperty("pas une url", PROPS)).toBeNull();
  });
});

describe("resolveBingSite", () => {
  test("apparie l'hôte au site du compte, apex et www confondus, et garde IsVerified", () => {
    const sites = [{ Url: "https://www.chico.org", IsVerified: true }];
    expect(resolveBingSite("chico.org", sites)).toEqual({ Url: "https://www.chico.org", IsVerified: true });
  });
  test("un compte vide ou un hôte inconnu rend null", () => {
    expect(resolveBingSite("chico.org", [])).toBeNull();
    expect(resolveBingSite("autre.org", [{ Url: "https://www.chico.org", IsVerified: true }])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugin && bun test skills/console/scripts/tests/resolve.test.ts`
Expected: FAIL, module `../lib/resolve` introuvable.

- [ ] **Step 3: Write the implementation**

Ce bloc a été exécuté par la session mère le 29/08 contre les trois propriétés réelles : sept cas, tous verts. Le transcrire tel quel.

```ts
// plugin/skills/console/scripts/lib/resolve.ts
// Search Console a deux sortes de propriété et l'API exige le nom exact (D33) : on choisit dans ce que
// sites.list a rendu, on ne fabrique jamais un siteUrl à partir d'un hôte.
import { sameSite } from "../../../audit/scripts/lib/sitemap";

export type Property = { siteUrl: string; permissionLevel: string };
export type BingSite = { Url: string; IsVerified: boolean };

const DOMAIN_PREFIX = "sc-domain:";

/**
 * La propriété qui couvre cette URL, ou null.
 * 1. Les propriétés en préfixe d'URL qui préfixent l'URL ; la plus longue gagne.
 * 2. Sinon les propriétés Domaine dont le domaine est l'hôte ou son suffixe ; la plus spécifique gagne.
 */
export function resolveProperty(url: string, properties: Property[]): Property | null {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  const prefixes = properties
    .filter((p) => !p.siteUrl.startsWith(DOMAIN_PREFIX) && url.toLowerCase().startsWith(p.siteUrl.toLowerCase()))
    .sort((a, b) => b.siteUrl.length - a.siteUrl.length);
  if (prefixes.length > 0) return prefixes[0];
  const domains = properties
    .filter((p) => p.siteUrl.startsWith(DOMAIN_PREFIX))
    .map((p) => ({ p, d: p.siteUrl.slice(DOMAIN_PREFIX.length).toLowerCase() }))
    .filter(({ d }) => host === d || host.endsWith(`.${d}`))
    .sort((a, b) => b.d.length - a.d.length);
  return domains.length > 0 ? domains[0].p : null;
}

/** Le site du compte Bing qui correspond à cet hôte, apex et www confondus (sameSite). */
export function resolveBingSite(host: string, sites: BingSite[]): BingSite | null {
  return sites.find((s) => sameSite(s.Url, `https://${host}`)) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugin && bun test skills/console/scripts/tests/resolve.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the whole suite**

Run: `cd plugin && bun test`
Expected: PASS, 260 tests existants plus les nouveaux.

- [ ] **Step 6: Commit**

```bash
git add plugin/skills/console/scripts/lib/resolve.ts plugin/skills/console/scripts/tests/resolve.test.ts
git commit -m "feat(console): résolution d'une propriété Search Console et d'un site Bing (D33)"
```

---

### Task 2: `auth-google.ts`, le jeton à deux fournisseurs

**Files:**
- Create: `plugin/skills/console/scripts/lib/auth-google.ts`
- Test: `plugin/skills/console/scripts/tests/auth-google.test.ts`

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces:
  - `type GoogleAuth = { token: string; quotaProject: string | null; provider: "gcloud" | "service-account" }`
  - `type Env = { GSC_SA_KEY_FILE?: string; GSC_QUOTA_PROJECT?: string }`
  - `type GcloudRunner = () => Promise<string | null>` (rend le jeton, ou null si `gcloud` est absent ou échoue)
  - `class AuthError extends Error` avec `readonly hint: string`
  - `SCOPE`, `LOGIN_HINT`, `QUOTA_HINT` (chaînes exportées ; `gsc.ts` les réutilise pour ses propres refus)
  - `chooseProvider(env: Env): "gcloud" | "service-account"`
  - `getAccessToken(env: Env, deps: { gcloud: GcloudRunner; serviceAccount: (path: string) => Promise<string> }): Promise<GoogleAuth>`
  - `defaultGcloud: GcloudRunner` (appelle le binaire ; jamais journalisé)
  - `type FetchInit` et `type Fetcher` (auth-google déclare les siens : la tâche 3 n'existe pas encore quand celle-ci s'écrit, et `gsc.ts` déclarera les mêmes ; formes identiques, TypeScript les accepte structurellement)
  - `serviceAccountToken(keyFilePath: string, fetcher: Fetcher): Promise<string>` **non normatif**, voir Step 5.

- [ ] **Step 1: Write the failing test**

```ts
// plugin/skills/console/scripts/tests/auth-google.test.ts
import { describe, test, expect } from "bun:test";
import { chooseProvider, getAccessToken, AuthError } from "../lib/auth-google";

const gcloudOk = async () => "ya29.FAUX-JETON";
const gcloudKo = async () => null;
const saOk = async () => "sa.FAUX-JETON";

describe("choix du fournisseur (D32)", () => {
  test("GSC_SA_KEY_FILE défini gagne, sinon gcloud", () => {
    expect(chooseProvider({ GSC_SA_KEY_FILE: "/hors/depot/sa.json" })).toBe("service-account");
    expect(chooseProvider({})).toBe("gcloud");
  });
});

describe("getAccessToken", () => {
  test("gcloud : le jeton part avec le projet de quota", async () => {
    const a = await getAccessToken({ GSC_QUOTA_PROJECT: "p-123" }, { gcloud: gcloudOk, serviceAccount: saOk });
    expect(a).toEqual({ token: "ya29.FAUX-JETON", quotaProject: "p-123", provider: "gcloud" });
  });
  test("gcloud sans GSC_QUOTA_PROJECT : erreur qui nomme la variable et la commande d'activation, avant tout appel", async () => {
    const p = getAccessToken({}, { gcloud: gcloudOk, serviceAccount: saOk });
    await expect(p).rejects.toBeInstanceOf(AuthError);
    await p.catch((e: AuthError) => {
      expect(e.hint).toContain("GSC_QUOTA_PROJECT");
      expect(e.hint).toContain("gcloud services enable searchconsole.googleapis.com");
    });
  });
  test("compte de service : pas de projet de quota, et GSC_QUOTA_PROJECT est ignoré", async () => {
    const a = await getAccessToken({ GSC_SA_KEY_FILE: "/hors/depot/sa.json", GSC_QUOTA_PROJECT: "p-123" }, { gcloud: gcloudOk, serviceAccount: saOk });
    expect(a).toEqual({ token: "sa.FAUX-JETON", quotaProject: null, provider: "service-account" });
  });
  test("aucun jeton disponible : erreur avec la commande de connexion et son scope, sans jeton dedans", async () => {
    const p = getAccessToken({ GSC_QUOTA_PROJECT: "p-123" }, { gcloud: gcloudKo, serviceAccount: saOk });
    await expect(p).rejects.toBeInstanceOf(AuthError);
    await p.catch((e: AuthError) => {
      expect(e.hint).toContain("gcloud auth application-default login");
      expect(e.hint).toContain("https://www.googleapis.com/auth/webmasters.readonly");
      expect(`${e.message}${e.hint}`).not.toContain("ya29.");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugin && bun test skills/console/scripts/tests/auth-google.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Write the implementation, partie normative**

```ts
// plugin/skills/console/scripts/lib/auth-google.ts
// Un jeton, deux fournisseurs derrière une seule fonction (D32) : gcloud aujourd'hui, compte de service demain.
// La bascule coûte une variable d'environnement et rien dans les appels.
export type Provider = "gcloud" | "service-account";
export type GoogleAuth = { token: string; quotaProject: string | null; provider: Provider };
export type Env = { GSC_SA_KEY_FILE?: string; GSC_QUOTA_PROJECT?: string };
export type GcloudRunner = () => Promise<string | null>;
// auth-google déclare son propre Fetcher : gsc.ts (tâche 3) n'existe pas encore, et déclarera la même forme.
export type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string };
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>;

export const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export const LOGIN_HINT =
  `aucun jeton Google. Lance :\n` +
  `  gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,${SCOPE}\n` +
  `ou pose GSC_SA_KEY_FILE vers la clé JSON d'un compte de service (voir references/acces.md).`;

export const QUOTA_HINT =
  `GSC_QUOTA_PROJECT absente. Avec le fournisseur gcloud, l'API Search Console exige un projet de quota. Pose :\n` +
  `  export GSC_QUOTA_PROJECT="<projet>"\n` +
  `et active l'API dessus une fois :\n` +
  `  gcloud services enable searchconsole.googleapis.com --project=<projet>\n` +
  `Un compte de service (GSC_SA_KEY_FILE) n'en a pas besoin.`;

export class AuthError extends Error {
  constructor(message: string, readonly hint: string) { super(message); this.name = "AuthError"; }
}

export function chooseProvider(env: Env): Provider {
  return env.GSC_SA_KEY_FILE ? "service-account" : "gcloud";
}

export async function getAccessToken(
  env: Env,
  deps: { gcloud: GcloudRunner; serviceAccount: (path: string) => Promise<string> },
): Promise<GoogleAuth> {
  if (chooseProvider(env) === "service-account") {
    const token = await deps.serviceAccount(env.GSC_SA_KEY_FILE!);
    return { token, quotaProject: null, provider: "service-account" };
  }
  const quotaProject = env.GSC_QUOTA_PROJECT ?? null;
  if (!quotaProject) throw new AuthError("projet de quota absent", QUOTA_HINT);
  const token = await deps.gcloud();
  if (!token) throw new AuthError("jeton indisponible", LOGIN_HINT);
  return { token, quotaProject, provider: "gcloud" };
}

/** Appelle le binaire gcloud. Sa sortie n'est jamais journalisée : c'est un jeton porteur. */
export const defaultGcloud: GcloudRunner = async () => {
  try {
    const p = Bun.spawn(["gcloud", "auth", "application-default", "print-access-token"], { stdout: "pipe", stderr: "ignore" });
    const out = (await new Response(p.stdout).text()).trim();
    return (await p.exited) === 0 && out.length > 0 ? out : null;
  } catch {
    return null;
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugin && bun test skills/console/scripts/tests/auth-google.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Ajouter `serviceAccountToken` (étape NON NORMATIVE)**

Ce code ne peut pas être exécuté ici : il n'existe aucun compte de service à ce jour, et un JWT signé pour de faux ne prouve rien. **Contrat à respecter**, l'implémenteur écrit le corps :

- Signature : `export async function serviceAccountToken(keyFilePath: string, fetcher: Fetcher): Promise<string>`.
- Lire le JSON du chemin (hors dépôt). Champs utilisés : `client_email`, `private_key`.
- Construire l'en-tête `{"alg":"RS256","typ":"JWT"}` et les claims `{ iss: client_email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now }`.
- Encoder en base64url (sans `=` de remplissage, `+` en `-`, `/` en `_`).
- Importer la clé : `crypto.subtle.importKey("pkcs8", <corps PEM décodé>, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])`, puis signer `header.payload`.
- Échanger : `POST https://oauth2.googleapis.com/token`, `content-type: application/x-www-form-urlencoded`, corps `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<jwt>`. Rendre `access_token` de la réponse.
- En cas d'échec, lever `new AuthError("compte de service refusé", ...)` avec un renvoi à `references/acces.md`. **Ne jamais** mettre le contenu de la clé, le JWT ou le jeton dans le message.
- Test à écrire : un faux `fetcher` qui rend `{"access_token":"sa.FAUX"}` ; vérifier que le corps envoyé porte `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, que la fonction rend `sa.FAUX`, et qu'une réponse en 400 lève une `AuthError` dont le message ne contient ni la clé privée ni le JWT. Une clé RSA de test se génère avec `crypto.subtle.generateKey` puis `exportKey("pkcs8")`, dans le test lui-même.

Références officielles pour ce contrat : `https://developers.google.com/identity/protocols/oauth2/service-account` (signature « RSA using SHA-256 hashing algorithm, expressed as `RS256` », claims `iss`, `scope`, `aud`, `exp`, `iat`, `exp` « a maximum of 1 hour after the issued time »).

- [ ] **Step 6: Run the whole suite**

Run: `cd plugin && bun test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add plugin/skills/console/scripts/lib/auth-google.ts plugin/skills/console/scripts/tests/auth-google.test.ts
git commit -m "feat(console): jeton Google à deux fournisseurs, gcloud et compte de service (D32)"
```

---

### Task 3: `gsc.ts`, les trois appels Search Console

**Files:**
- Create: `plugin/skills/console/scripts/lib/gsc.ts`
- Create: `plugin/skills/console/scripts/tests/fixtures/gsc/sites.json`, `sitemaps.json`, `inspect-known.json`, `inspect-unknown.json`
- Test: `plugin/skills/console/scripts/tests/gsc.test.ts`

**Interfaces:**
- Consumes: `Property` de `./resolve` ; `GoogleAuth` de `./auth-google` ; `Fetcher` et `FetchInit` (voir Global Constraints, à redéclarer localement dans `gsc.ts`).
- Produces:
  - `type SitemapContents = { type: string; submitted: string | null; indexed: string | null }`
  - `type SitemapInfo = { path: string; lastSubmitted: string | null; lastDownloaded: string | null; warnings: string | null; errors: string | null; isPending: boolean; contents: SitemapContents[] }`
  - `type IndexStatus = { verdict: string; coverageState: string; robotsTxtState: string | null; indexingState: string | null; lastCrawlTime: string | null; pageFetchState: string | null; googleCanonical: string | null; userCanonical: string | null; crawledAs: string | null }`
  - `type Inspection = { link: string | null; status: IndexStatus | null }`
  - `class GscError extends Error` avec `readonly status: number` et `readonly hint: string`
  - `listProperties(f, auth): Promise<Property[]>`
  - `listSitemaps(f, auth, siteUrl): Promise<SitemapInfo[]>`
  - `inspectUrl(f, auth, siteUrl, url): Promise<Inspection>`
  - `canonicalMismatch(s: IndexStatus | null): boolean`

- [ ] **Step 1: Créer les quatre fixtures**

Copier verbatim les échantillons A, B, C, D de la section « Échantillons réels » de ce plan dans, respectivement :
`tests/fixtures/gsc/sites.json`, `tests/fixtures/gsc/sitemaps.json`, `tests/fixtures/gsc/inspect-known.json`, `tests/fixtures/gsc/inspect-unknown.json`.

- [ ] **Step 2: Write the failing test**

```ts
// plugin/skills/console/scripts/tests/gsc.test.ts
import { describe, test, expect } from "bun:test";
import { listProperties, listSitemaps, inspectUrl, canonicalMismatch, GscError, type Fetcher } from "../lib/gsc";
import type { GoogleAuth } from "../lib/auth-google";

const AUTH: GoogleAuth = { token: "ya29.FAUX", quotaProject: "p-123", provider: "gcloud" };
const SA: GoogleAuth = { token: "sa.FAUX", quotaProject: null, provider: "service-account" };
const fx = (n: string) => Bun.file(new URL(`./fixtures/gsc/${n}.json`, import.meta.url).pathname).text();

type Call = { url: string; method: string; headers?: Record<string, string>; body?: string };
function fake(reply: (c: Call) => { status: number; text: string }): { f: Fetcher; calls: Call[] } {
  const calls: Call[] = [];
  const f: Fetcher = async (url, init = {}) => {
    const c = { url, method: init.method ?? "GET", headers: init.headers, body: init.body };
    calls.push(c); return reply(c);
  };
  return { f, calls };
}

describe("listProperties", () => {
  test("rend les propriétés de la réponse réelle, sans supposer d'ordre, avec le jeton et le projet de quota en en-tête", async () => {
    const body = await fx("sites");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    const props = await listProperties(f, AUTH);
    expect(props.map((p) => p.siteUrl).sort()).toEqual([
      "https://lebonpote.romain-ecarnot.com/", "sc-domain:healthincloud.app", "sc-domain:romain-ecarnot.com",
    ]);
    expect(props.find((p) => p.siteUrl === "sc-domain:romain-ecarnot.com")?.permissionLevel).toBe("siteOwner");
    expect(calls[0].headers?.["authorization"]).toBe("Bearer ya29.FAUX");
    expect(calls[0].headers?.["x-goog-user-project"]).toBe("p-123");
  });
  test("un compte de service n'envoie pas d'en-tête de projet de quota", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"siteEntry":[]}' }));
    await listProperties(f, SA);
    expect(calls[0].headers?.["x-goog-user-project"]).toBeUndefined();
  });
  test("une réponse sans siteEntry rend une liste vide et ne plante pas", async () => {
    const { f } = fake(() => ({ status: 200, text: "{}" }));
    expect(await listProperties(f, AUTH)).toEqual([]);
  });
  test("un 403 SERVICE_DISABLED donne une consigne qui nomme GSC_QUOTA_PROJECT", async () => {
    const { f } = fake(() => ({ status: 403, text: '{"error":{"code":403,"details":[{"reason":"SERVICE_DISABLED"}],"message":"requires a quota project"}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.hint).toContain("GSC_QUOTA_PROJECT"));
  });
  test("un 403 de scope donne la commande de connexion", async () => {
    const { f } = fake(() => ({ status: 403, text: '{"error":{"code":403,"details":[{"reason":"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}],"message":"Request had insufficient authentication scopes."}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.hint).toContain("gcloud auth application-default login"));
  });
});

describe("listSitemaps", () => {
  test("encode le siteUrl dans le chemin et décode soumis et indexé", async () => {
    const body = await fx("sitemaps");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    const s = await listSitemaps(f, AUTH, "sc-domain:romain-ecarnot.com");
    expect(calls[0].url).toContain("/sites/sc-domain%3Aromain-ecarnot.com/sitemaps");
    expect(s[0].path).toBe("https://lebonpote.romain-ecarnot.com/sitemap.xml");
    expect(s[0].contents[0]).toEqual({ type: "web", submitted: "1", indexed: "0" });
    expect(s[0].errors).toBe("0");
  });
  test("une propriété sans sitemap rend une liste vide", async () => {
    const { f } = fake(() => ({ status: 200, text: "{}" }));
    expect(await listSitemaps(f, AUTH, "sc-domain:x.com")).toEqual([]);
  });
});

describe("inspectUrl", () => {
  test("page connue : les champs d'état et les deux canonicals sortent de la réponse réelle", async () => {
    const body = await fx("inspect-known");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    const r = await inspectUrl(f, AUTH, "sc-domain:romain-ecarnot.com", "https://romain-ecarnot.com/");
    expect(calls[0].method).toBe("POST");
    expect(JSON.parse(calls[0].body!)).toEqual({ inspectionUrl: "https://romain-ecarnot.com/", siteUrl: "sc-domain:romain-ecarnot.com" });
    expect(r.status?.coverageState).toBe("Page with redirect");
    expect(r.status?.lastCrawlTime).toBe("2026-08-21T08:31:23Z");
    expect(r.status?.googleCanonical).toBe("https://www.romain-ecarnot.com/");
    expect(r.link).toContain("search.google.com");
    expect(canonicalMismatch(r.status)).toBe(false);
  });
  test("URL inconnue : les champs absents sont null, pas des chaînes vides", async () => {
    const body = await fx("inspect-unknown");
    const { f } = fake(() => ({ status: 200, text: body }));
    const r = await inspectUrl(f, AUTH, "sc-domain:romain-ecarnot.com", "https://romain-ecarnot.com/page-qui-nexiste-pas");
    expect(r.status?.coverageState).toBe("URL is unknown to Google");
    expect(r.status?.lastCrawlTime).toBeNull();
    expect(r.status?.googleCanonical).toBeNull();
    expect(canonicalMismatch(r.status)).toBe(false);
  });
  test("canonicalMismatch ne dit oui que si les deux sont là et diffèrent", () => {
    const base = { verdict: "PASS", coverageState: "x", robotsTxtState: null, indexingState: null, lastCrawlTime: null, pageFetchState: null, crawledAs: null };
    expect(canonicalMismatch({ ...base, googleCanonical: "https://a/", userCanonical: "https://b/" })).toBe(true);
    expect(canonicalMismatch({ ...base, googleCanonical: "https://a/", userCanonical: null })).toBe(false);
    expect(canonicalMismatch(null)).toBe(false);
  });
});

describe("aucune écriture", () => {
  test("aucun appel ne vise sitemaps.submit ni une méthode PUT", async () => {
    const body = await fx("sites");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    await listProperties(f, AUTH);
    await listSitemaps(f, AUTH, "sc-domain:romain-ecarnot.com").catch(() => {});
    expect(calls.every((c) => c.method === "GET" || c.method === "POST")).toBe(true);
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd plugin && bun test skills/console/scripts/tests/gsc.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 4: Write the implementation**

```ts
// plugin/skills/console/scripts/lib/gsc.ts
// Les trois lectures Search Console. Aucune écriture (D30) : sitemaps.submit n'est pas ici et n'y sera pas.
// Conventions capturées en vrai le 29/08 sur les propriétés de Romain (échantillons A à D du plan).
import type { Property } from "./resolve";
import type { GoogleAuth } from "./auth-google";
import { LOGIN_HINT, QUOTA_HINT } from "./auth-google";

export type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string };
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>;

export const WMX_BASE = "https://www.googleapis.com/webmasters/v3";
export const INSPECT_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

export type SitemapContents = { type: string; submitted: string | null; indexed: string | null };
export type SitemapInfo = {
  path: string; lastSubmitted: string | null; lastDownloaded: string | null;
  warnings: string | null; errors: string | null; isPending: boolean; contents: SitemapContents[];
};
export type IndexStatus = {
  verdict: string; coverageState: string;
  robotsTxtState: string | null; indexingState: string | null; lastCrawlTime: string | null;
  pageFetchState: string | null; googleCanonical: string | null; userCanonical: string | null; crawledAs: string | null;
};
export type Inspection = { link: string | null; status: IndexStatus | null };

export class GscError extends Error {
  constructor(message: string, readonly status: number, readonly hint: string) { super(message); this.name = "GscError"; }
}

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

function headers(auth: GoogleAuth, json = false): Record<string, string> {
  const h: Record<string, string> = { authorization: `Bearer ${auth.token}` };
  if (auth.quotaProject) h["x-goog-user-project"] = auth.quotaProject;
  if (json) h["content-type"] = "application/json; charset=utf-8";
  return h;
}

/** Un refus se lit sur `reason` quand il est là, sur le message sinon. Le corps n'est jamais renvoyé tel quel. */
function fail(status: number, text: string): never {
  let reason = "", message = "";
  try {
    const e = (JSON.parse(text) as { error?: { message?: string; details?: { reason?: string }[] } }).error ?? {};
    message = e.message ?? "";
    reason = e.details?.map((d) => d.reason ?? "").find(Boolean) ?? "";
  } catch { /* corps non JSON : on garde le code seul */ }
  if (reason === "SERVICE_DISABLED" || /quota project/i.test(message)) throw new GscError("Search Console a refusé, projet de quota", status, QUOTA_HINT);
  if (reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT" || /insufficient authentication scopes/i.test(message)) throw new GscError("Search Console a refusé, scope insuffisant", status, LOGIN_HINT);
  if (status === 401) throw new GscError("jeton refusé ou expiré", status, LOGIN_HINT);
  if (status === 403) throw new GscError("droits insuffisants sur cette propriété", status, "le rôle de ce compte ne permet pas cette lecture. Voir references/acces.md, rôles Search Console.");
  if (status === 404) throw new GscError("propriété inconnue", status, "cette propriété n'existe pas ou n'est pas partagée avec ce compte. Lance `console sites`.");
  throw new GscError(`Search Console a répondu ${status}`, status, "réessayer ; si ça persiste, lance `console sites` pour vérifier l'accès.");
}

async function call(f: Fetcher, url: string, auth: GoogleAuth, init?: FetchInit): Promise<unknown> {
  const r = await f(url, { ...init, headers: headers(auth, Boolean(init?.body)) });
  if (r.status !== 200) fail(r.status, r.text);
  try { return JSON.parse(r.text); } catch { throw new GscError("réponse illisible de Search Console", r.status, "réessayer."); }
}

export async function listProperties(f: Fetcher, auth: GoogleAuth): Promise<Property[]> {
  const d = (await call(f, `${WMX_BASE}/sites`, auth)) as { siteEntry?: { siteUrl?: string; permissionLevel?: string }[] };
  return (d.siteEntry ?? [])
    .filter((e) => typeof e.siteUrl === "string")
    .map((e) => ({ siteUrl: e.siteUrl as string, permissionLevel: e.permissionLevel ?? "inconnu" }));
}

export async function listSitemaps(f: Fetcher, auth: GoogleAuth, siteUrl: string): Promise<SitemapInfo[]> {
  const d = (await call(f, `${WMX_BASE}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, auth)) as { sitemap?: Record<string, unknown>[] };
  return (d.sitemap ?? []).map((s) => ({
    path: str(s.path) ?? "",
    lastSubmitted: str(s.lastSubmitted), lastDownloaded: str(s.lastDownloaded),
    warnings: str(s.warnings), errors: str(s.errors), isPending: s.isPending === true,
    contents: ((s.contents as Record<string, unknown>[] | undefined) ?? []).map((c) => ({
      type: str(c.type) ?? "", submitted: str(c.submitted), indexed: str(c.indexed),
    })),
  }));
}

export async function inspectUrl(f: Fetcher, auth: GoogleAuth, siteUrl: string, url: string): Promise<Inspection> {
  const d = (await call(f, INSPECT_ENDPOINT, auth, { method: "POST", body: JSON.stringify({ inspectionUrl: url, siteUrl }) })) as {
    inspectionResult?: { inspectionResultLink?: string; indexStatusResult?: Record<string, unknown> };
  };
  const r = d.inspectionResult;
  const i = r?.indexStatusResult;
  return {
    link: str(r?.inspectionResultLink),
    status: i
      ? {
          verdict: str(i.verdict) ?? "VERDICT_UNSPECIFIED",
          coverageState: str(i.coverageState) ?? "inconnu",
          robotsTxtState: str(i.robotsTxtState), indexingState: str(i.indexingState),
          lastCrawlTime: str(i.lastCrawlTime), pageFetchState: str(i.pageFetchState),
          googleCanonical: str(i.googleCanonical), userCanonical: str(i.userCanonical), crawledAs: str(i.crawledAs),
        }
      : null,
  };
}

/** Le seul constat que Search Console donne et qu'aucun audit local ne peut produire. */
export function canonicalMismatch(s: IndexStatus | null): boolean {
  return Boolean(s?.googleCanonical && s.userCanonical && s.googleCanonical !== s.userCanonical);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd plugin && bun test skills/console/scripts/tests/gsc.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the whole suite, then commit**

```bash
cd plugin && bun test
git add plugin/skills/console/scripts/lib/gsc.ts plugin/skills/console/scripts/tests/gsc.test.ts plugin/skills/console/scripts/tests/fixtures/gsc/
git commit -m "feat(console): lectures Search Console, sites, sitemaps et inspection d'URL"
```

---

### Task 4: `bing.ts`, les cinq lectures Bing

**Files:**
- Create: `plugin/skills/console/scripts/lib/bing.ts`
- Test: `plugin/skills/console/scripts/tests/bing.test.ts`

**Interfaces:**
- Consumes: `BingSite` de `./resolve`.
- Produces:
  - `BING_API_BASE` (copie assumée, D34), `BING_ERROR_CODES`
  - `class BingError extends Error` avec `readonly code: number | null` et `readonly hint: string`
  - `redact(text: string, key: string | null): string`
  - `bingUserSites(f, key): Promise<BingSite[]>`
  - `bingFeeds(f, key, siteUrl): Promise<unknown[]>`
  - `bingUrlInfo(f, key, siteUrl, url): Promise<Record<string, unknown> | null>`
  - `bingCrawlStats(f, key, siteUrl): Promise<unknown[]>`
  - `bingCrawlIssues(f, key, siteUrl): Promise<unknown[]>`

**Note sur les formes non capturées :** seules `GetUserSites` (échantillon E) et l'erreur (échantillon F) ont un échantillon réel. `GetFeeds`, `GetUrlInfo`, `GetCrawlStats` et `GetCrawlIssues` renvoient toutes l'enveloppe `{"d": …}` selon `api-protocols` (Microsoft Learn, mis à jour 2026-08-10), mais leur contenu n'a jamais été vu : le compte Bing est vide. **Le décodage s'arrête donc à l'enveloppe** et rend la charge telle quelle ; c'est `render.ts` qui la met en forme. Ne pas inventer de champs au-delà de ceux documentés par la classe `UrlInfo` (`DiscoveryDate`, `LastCrawledDate`, `HttpStatus`, `DocumentSize`, `AnchorCount`, `TotalChildUrlCount`, `IsPage`, `Url`).

- [ ] **Step 1: Write the failing test**

```ts
// plugin/skills/console/scripts/tests/bing.test.ts
import { describe, test, expect } from "bun:test";
import { bingUserSites, bingUrlInfo, bingCrawlStats, redact, BingError, BING_API_BASE, type Fetcher } from "../lib/bing";

const KEY = "aaaabbbbccccddddeeeeffff00001111";
type Call = { url: string; method: string };
function fake(reply: (c: Call) => { status: number; text: string }): { f: Fetcher; calls: Call[] } {
  const calls: Call[] = [];
  const f: Fetcher = async (url, init = {}) => { const c = { url, method: init.method ?? "GET" }; calls.push(c); return reply(c); };
  return { f, calls };
}

describe("bingUserSites", () => {
  test("un compte vide rend une liste vide, ce n'est pas une erreur (capture du 29/08)", async () => {
    const { f } = fake(() => ({ status: 200, text: '{"d":[]}' }));
    expect(await bingUserSites(f, KEY)).toEqual([]);
  });
  test("un site du compte rend Url et IsVerified, et la clé part en paramètre", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"d":[{"__type":"Site:#Microsoft.Bing.Webmaster.Api","AuthenticationCode":"X","DnsVerificationCode":"y.example.com","IsVerified":false,"Url":"http://example.com"}]}' }));
    expect(await bingUserSites(f, KEY)).toEqual([{ Url: "http://example.com", IsVerified: false }]);
    expect(calls[0].url.startsWith(`${BING_API_BASE}/GetUserSites?`)).toBe(true);
  });
  test("clé refusée : le message nomme la cause et ne contient jamais la clé", async () => {
    const { f } = fake(() => ({ status: 400, text: '{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}' }));
    const p = bingUserSites(f, KEY);
    await expect(p).rejects.toBeInstanceOf(BingError);
    await p.catch((e: BingError) => {
      expect(e.code).toBe(3);
      expect(`${e.message}${e.hint}`).toContain("InvalidApiKey");
      expect(`${e.message}${e.hint}`).not.toContain(KEY);
    });
  });
  test("throttle : consigne de réessayer plus tard", async () => {
    const { f } = fake(() => ({ status: 400, text: '{"ErrorCode":4,"Message":"ERROR!!! ThrottleUser"}' }));
    const p = bingUserSites(f, KEY);
    await expect(p).rejects.toBeInstanceOf(BingError);
    await p.catch((e: BingError) => expect(e.hint).toContain("plus tard"));
  });
  test("droits ou site inconnu : 11, 13 et 14 mènent à la même consigne", async () => {
    for (const code of [11, 13, 14]) {
      const { f } = fake(() => ({ status: 400, text: `{"ErrorCode":${code},"Message":"x"}` }));
      const p = bingUserSites(f, KEY);
      await expect(p).rejects.toBeInstanceOf(BingError);
      await p.catch((e: BingError) => expect(e.hint).toContain("acces.md"));
    }
  });
});

describe("bingUrlInfo et bingCrawlStats", () => {
  test("rendent la charge de l'enveloppe d telle quelle, sans inventer de champ", async () => {
    const { f, calls } = fake(() => ({ status: 200, text: '{"d":{"Url":"https://x/","HttpStatus":200,"IsPage":true}}' }));
    expect(await bingUrlInfo(f, KEY, "https://x", "https://x/")).toEqual({ Url: "https://x/", HttpStatus: 200, IsPage: true });
    expect(calls[0].url).toContain("GetUrlInfo?");
    const { f: f2 } = fake(() => ({ status: 200, text: '{"d":[]}' }));
    expect(await bingCrawlStats(f2, KEY, "https://x")).toEqual([]);
  });
  test("une URL inconnue de Bing rend null sans planter (incertitude 1)", async () => {
    const { f } = fake(() => ({ status: 200, text: '{"d":null}' }));
    expect(await bingUrlInfo(f, KEY, "https://x", "https://x/absente")).toBeNull();
  });
});

describe("redact", () => {
  test("retire la clé d'un texte destiné à l'écran", () => {
    expect(redact(`erreur sur ${BING_API_BASE}/GetUserSites?apikey=${KEY}`, KEY)).not.toContain(KEY);
    expect(redact("rien à cacher", null)).toBe("rien à cacher");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugin && bun test skills/console/scripts/tests/bing.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Write the implementation**

```ts
// plugin/skills/console/scripts/lib/bing.ts
// Lectures Bing Webmaster Tools. Aucune écriture (D30) : SubmitFeed et SubmitUrlBatch ne sont pas ici.
// BING_API_BASE et le décodage d'erreur sont recopiés depuis skills/checklist/scripts/lib/actions.ts (D34,
// décision de Romain le 29/08) : la mise en commun se fera après un inventaire de ce qui se répète vraiment.
import type { BingSite } from "./resolve";

export type FetchInit = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string };
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string }>;

export const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

/** Enum ApiErrorCode de Bing Webmaster Tools (learn.microsoft.com, 2019-04-26). */
export const BING_ERROR_CODES: Record<number, string> = {
  0: "None", 1: "InternalError", 2: "UnknownError", 3: "InvalidApiKey", 4: "ThrottleUser", 5: "ThrottleHost",
  6: "UserBlocked", 7: "InvalidUrl", 8: "InvalidParameter", 9: "TooManySites", 10: "UserNotFound", 11: "NotFound",
  12: "AlreadyExists", 13: "NotAllowed", 14: "NotAuthorized", 15: "UnexpectedState", 16: "Deprecated",
};

export class BingError extends Error {
  constructor(message: string, readonly code: number | null, readonly hint: string) { super(message); this.name = "BingError"; }
}

/** Retire la clé d'un texte destiné à l'écran. Reprise de actions.ts. */
export function redact(text: string, key: string | null): string {
  return key && key.length >= 8 ? text.split(key).join("[clé]") : text;
}

function hintFor(code: number | null): string {
  if (code === 3) return "la clé de ~/.zshenv n'est plus acceptée par Bing. Une seule clé existe par compte : la régénérer dans Bing Webmaster Tools, Settings, API Access, puis mettre ~/.zshenv à jour.";
  if (code === 4 || code === 5) return "Bing limite les appels, réessayer plus tard.";
  if (code === 11 || code === 13 || code === 14) return "site hors du compte ou droits insuffisants. Voir references/acces.md, Bing.";
  return "réessayer ; si ça persiste, lance `console sites` pour vérifier l'accès.";
}

/** Un appel JSON Bing. La clé voyage en paramètre : rien de ce qui sort d'ici ne la contient. */
async function call(f: Fetcher, key: string, method: string, params: Record<string, string>): Promise<unknown> {
  const q = new URLSearchParams({ ...params, apikey: key });
  const r = await f(`${BING_API_BASE}/${method}?${q}`);
  let parsed: unknown;
  try { parsed = JSON.parse(r.text); } catch { throw new BingError(`réponse illisible de Bing (${method}, HTTP ${r.status})`, null, hintFor(null)); }
  const e = parsed as { ErrorCode?: number; Message?: string };
  if (typeof e.ErrorCode === "number") {
    const name = BING_ERROR_CODES[e.ErrorCode] ?? String(e.ErrorCode);
    throw new BingError(redact(`Bing a refusé ${method} : ${name}`, key), e.ErrorCode, hintFor(e.ErrorCode));
  }
  if (r.status !== 200) throw new BingError(`Bing a répondu ${r.status} sur ${method}`, null, hintFor(null));
  return (parsed as { d?: unknown }).d ?? null;
}

export async function bingUserSites(f: Fetcher, key: string): Promise<BingSite[]> {
  const d = (await call(f, key, "GetUserSites", {})) as { Url?: string; IsVerified?: boolean }[] | null;
  return (d ?? []).filter((s) => typeof s.Url === "string").map((s) => ({ Url: s.Url as string, IsVerified: s.IsVerified === true }));
}

export async function bingFeeds(f: Fetcher, key: string, siteUrl: string): Promise<unknown[]> {
  return ((await call(f, key, "GetFeeds", { siteUrl })) as unknown[] | null) ?? [];
}

export async function bingUrlInfo(f: Fetcher, key: string, siteUrl: string, url: string): Promise<Record<string, unknown> | null> {
  return ((await call(f, key, "GetUrlInfo", { siteUrl, url })) as Record<string, unknown> | null) ?? null;
}

export async function bingCrawlStats(f: Fetcher, key: string, siteUrl: string): Promise<unknown[]> {
  const d = await call(f, key, "GetCrawlStats", { siteUrl });
  return Array.isArray(d) ? d : d === null ? [] : [d];
}

export async function bingCrawlIssues(f: Fetcher, key: string, siteUrl: string): Promise<unknown[]> {
  const d = await call(f, key, "GetCrawlIssues", { siteUrl });
  return Array.isArray(d) ? d : d === null ? [] : [d];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugin && bun test skills/console/scripts/tests/bing.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
cd plugin && bun test
git add plugin/skills/console/scripts/lib/bing.ts plugin/skills/console/scripts/tests/bing.test.ts
git commit -m "feat(console): lectures Bing Webmaster Tools, sites, feeds, url info, crawl"
```

---

### Task 5: `render.ts`, la mise en forme

**Files:**
- Create: `plugin/skills/console/scripts/lib/render.ts`
- Test: `plugin/skills/console/scripts/tests/render.test.ts`

**Interfaces:**
- Consumes: `Property`, `BingSite` de `./resolve` ; `SitemapInfo`, `IndexStatus`, `Inspection`, `canonicalMismatch` de `./gsc`.
- Produces:
  - `type SitesView = { google: { property: Property; sitemaps: SitemapInfo[] }[] | null; googleError: string | null; bing: { site: BingSite; feeds: unknown[] }[] | null; bingError: string | null }`
  - `type InspectView = { url: string; property: Property | null; google: Inspection | null; googleError: string | null; bing: Record<string, unknown> | null; bingError: string | null }`
  - `type CrawlView = { site: string; bing: { stats: unknown[]; issues: unknown[] } | null; bingError: string | null }`
  - `renderSites(v: SitesView): string`, `renderInspect(v: InspectView): string`, `renderCrawl(v: CrawlView): string`

**Règles de rendu, valables pour les trois :**
- Une ligne par fait, `clé : valeur`. Pas de tableau (lecture sur mobile), pas de tiret cadratin.
- Un moteur qui n'a pas pu répondre écrit une ligne `Bing : <raison>` ou `Google : <raison>`, jamais un blanc.
- Un compte Bing vide écrit exactement `Bing : aucun site dans ce compte Bing`.
- `crawl` écrit toujours `Google : pas de statistiques de crawl en API`.
- Quand `canonicalMismatch` est vrai, une ligne en clair : `attention : Google a retenu un autre canonical que celui déclaré`.

- [ ] **Step 1: Write the failing test**

```ts
// plugin/skills/console/scripts/tests/render.test.ts
import { describe, test, expect } from "bun:test";
import { renderSites, renderInspect, renderCrawl } from "../lib/render";

const prop = { siteUrl: "sc-domain:romain-ecarnot.com", permissionLevel: "siteOwner" };
const sitemap = {
  path: "https://lebonpote.romain-ecarnot.com/sitemap.xml", lastSubmitted: "2026-04-30T16:13:26.601Z",
  lastDownloaded: "2026-05-01T18:06:47.626Z", warnings: "0", errors: "0", isPending: false,
  contents: [{ type: "web", submitted: "1", indexed: "0" }],
};
const known = {
  verdict: "NEUTRAL", coverageState: "Page with redirect", robotsTxtState: "ALLOWED", indexingState: "INDEXING_ALLOWED",
  lastCrawlTime: "2026-08-21T08:31:23Z", pageFetchState: "SUCCESSFUL",
  googleCanonical: "https://www.romain-ecarnot.com/", userCanonical: "https://www.romain-ecarnot.com/", crawledAs: "MOBILE",
};

describe("renderSites", () => {
  test("nomme la propriété, son rôle, et le couple soumis / indexé de chaque sitemap", () => {
    const out = renderSites({ google: [{ property: prop, sitemaps: [sitemap] }], googleError: null, bing: [], bingError: null });
    expect(out).toContain("sc-domain:romain-ecarnot.com");
    expect(out).toContain("siteOwner");
    expect(out).toContain("sitemap.xml");
    expect(out).toContain("soumis 1");
    expect(out).toContain("indexé 0");
  });
  test("un compte Bing vide se dit en clair et n'est pas une erreur", () => {
    const out = renderSites({ google: [], googleError: null, bing: [], bingError: null });
    expect(out).toContain("aucun site dans ce compte Bing");
  });
  test("un moteur en erreur écrit sa raison, l'autre répond quand même", () => {
    const out = renderSites({ google: [{ property: prop, sitemaps: [] }], googleError: null, bing: null, bingError: "clé absente" });
    expect(out).toContain("sc-domain:romain-ecarnot.com");
    expect(out).toContain("clé absente");
  });
});

describe("renderInspect", () => {
  test("porte les six champs d'état, les deux canonicals et le lien", () => {
    const out = renderInspect({
      url: "https://romain-ecarnot.com/", property: prop,
      google: { link: "https://search.google.com/x", status: known }, googleError: null, bing: null, bingError: "clé absente",
    });
    for (const s of ["NEUTRAL", "Page with redirect", "ALLOWED", "INDEXING_ALLOWED", "2026-08-21T08:31:23Z", "SUCCESSFUL", "https://search.google.com/x"]) {
      expect(out).toContain(s);
    }
    expect(out).not.toContain("autre canonical");
  });
  test("deux canonicals différents déclenchent la phrase d'alerte", () => {
    const out = renderInspect({
      url: "https://a/", property: prop,
      google: { link: null, status: { ...known, userCanonical: "https://a/" } }, googleError: null, bing: null, bingError: null,
    });
    expect(out).toContain("autre canonical");
  });
  test("URL inconnue : les champs absents ne s'affichent pas comme vides", () => {
    const out = renderInspect({
      url: "https://a/absente", property: prop,
      google: { link: null, status: { ...known, coverageState: "URL is unknown to Google", lastCrawlTime: null, googleCanonical: null, userCanonical: null } },
      googleError: null, bing: null, bingError: null,
    });
    expect(out).toContain("URL is unknown to Google");
    expect(out).not.toMatch(/dernier crawl\s*:\s*$/m);
  });
  test("aucune propriété ne couvre l'URL : la sortie le dit", () => {
    const out = renderInspect({ url: "https://example.com/", property: null, google: null, googleError: "aucune propriété ne couvre cette URL", bing: null, bingError: null });
    expect(out).toContain("aucune propriété");
  });
});

describe("renderCrawl", () => {
  test("dit toujours que Google n'expose pas ses statistiques de crawl", () => {
    const out = renderCrawl({ site: "https://romain-ecarnot.com", bing: null, bingError: "aucun site dans ce compte Bing" });
    expect(out).toContain("pas de statistiques de crawl en API");
    expect(out).toContain("aucun site dans ce compte Bing");
  });
});

describe("pas de tiret cadratin", () => {
  test("aucune sortie n'en contient", () => {
    const outs = [
      renderSites({ google: [{ property: prop, sitemaps: [sitemap] }], googleError: null, bing: [], bingError: null }),
      renderInspect({ url: "https://a/", property: prop, google: { link: null, status: known }, googleError: null, bing: null, bingError: null }),
      renderCrawl({ site: "https://a", bing: null, bingError: null }),
    ];
    for (const o of outs) expect(o).not.toContain("—");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugin && bun test skills/console/scripts/tests/render.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Write the implementation**

Code exécuté par la session mère contre les attentes du test ci-dessus, 19 assertions vertes. Le transcrire tel quel.

```ts
// plugin/skills/console/scripts/lib/render.ts
// Une ligne par fait, jamais un tableau (lecture sur mobile), jamais un tiret cadratin.
// Un moteur qui n'a pas répondu écrit sa raison ; il ne laisse jamais un blanc.
import type { Property, BingSite } from "./resolve";
import { canonicalMismatch, type Inspection, type SitemapInfo } from "./gsc";

export type SitesView = {
  google: { property: Property; sitemaps: SitemapInfo[] }[] | null; googleError: string | null;
  bing: { site: BingSite; feeds: unknown[] }[] | null; bingError: string | null;
};
export type InspectView = {
  url: string; property: Property | null;
  google: Inspection | null; googleError: string | null;
  bing: Record<string, unknown> | null; bingError: string | null;
};
export type CrawlView = { site: string; bing: { stats: unknown[]; issues: unknown[] } | null; bingError: string | null };

/** Une ligne seulement si la valeur est là : un champ absent ne s'affiche pas comme vide. */
const line = (k: string, v: string | null): string[] => (v ? [`  ${k} : ${v}`] : []);

export function renderSites(v: SitesView): string {
  const out: string[] = ["Google Search Console"];
  if (v.googleError) out.push(`  ${v.googleError}`);
  else if (!v.google || v.google.length === 0) out.push("  aucune propriété visible par ce compte");
  else for (const g of v.google) {
    out.push(`  ${g.property.siteUrl} (${g.property.permissionLevel})`);
    if (g.sitemaps.length === 0) out.push("    aucun sitemap déclaré");
    for (const s of g.sitemaps) {
      const c = s.contents[0];
      const chiffres = c ? `soumis ${c.submitted ?? "?"}, indexé ${c.indexed ?? "?"}` : "sans détail";
      out.push(`    ${s.path} : ${chiffres}, ${s.errors ?? "?"} erreurs, ${s.warnings ?? "?"} avertissements`);
      out.push(...line("  soumis le", s.lastSubmitted), ...line("  lu le", s.lastDownloaded));
    }
  }
  out.push("", "Bing Webmaster Tools");
  if (v.bingError) out.push(`  ${v.bingError}`);
  else if (!v.bing || v.bing.length === 0) out.push("  aucun site dans ce compte Bing");
  else for (const b of v.bing) {
    out.push(`  ${b.site.Url} (${b.site.IsVerified ? "vérifié" : "non vérifié"})`);
    out.push(`    ${b.feeds.length} flux déclaré(s)`);
  }
  return out.join("\n");
}

export function renderInspect(v: InspectView): string {
  const out: string[] = [`URL : ${v.url}`, "", "Google Search Console"];
  if (v.googleError) out.push(`  ${v.googleError}`);
  else if (!v.google?.status) out.push("  aucun état renvoyé par Google");
  else {
    const s = v.google.status;
    if (v.property) out.push(`  propriété : ${v.property.siteUrl} (${v.property.permissionLevel})`);
    out.push(`  verdict : ${s.verdict}`, `  couverture : ${s.coverageState}`);
    out.push(
      ...line("robots.txt", s.robotsTxtState), ...line("indexation", s.indexingState),
      ...line("dernier crawl", s.lastCrawlTime), ...line("récupération", s.pageFetchState),
      ...line("exploré en", s.crawledAs),
      ...line("canonical retenu par Google", s.googleCanonical), ...line("canonical déclaré", s.userCanonical),
    );
    if (canonicalMismatch(s)) out.push("  attention : Google a retenu un autre canonical que celui déclaré");
    out.push(...line("voir", v.google.link));
  }
  out.push("", "Bing Webmaster Tools");
  if (v.bingError) out.push(`  ${v.bingError}`);
  else if (!v.bing) out.push("  pas dans l'index Bing, ou site hors du compte");
  // Les champs d'UrlInfo n'ont jamais été capturés (incertitude 1) : on affiche ce que Bing envoie,
  // sans en inventer. Le `__type` de l'enveloppe .NET ne sert à rien à l'écran.
  else for (const [k, val] of Object.entries(v.bing)) if (!k.startsWith("__")) out.push(`  ${k} : ${String(val)}`);
  return out.join("\n");
}

export function renderCrawl(v: CrawlView): string {
  const out: string[] = [
    `Site : ${v.site}`, "",
    "Google Search Console", "  Google : pas de statistiques de crawl en API", "",
    "Bing Webmaster Tools",
  ];
  if (v.bingError) out.push(`  ${v.bingError}`);
  else if (!v.bing) out.push("  aucun site dans ce compte Bing");
  else {
    out.push(`  ${v.bing.stats.length} entrée(s) de statistiques`);
    out.push(v.bing.issues.length === 0 ? "  aucune erreur de crawl remontée par Bing" : `  ${v.bing.issues.length} erreur(s) de crawl`);
  }
  return out.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugin && bun test skills/console/scripts/tests/render.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite, then commit**

```bash
cd plugin && bun test
git add plugin/skills/console/scripts/lib/render.ts plugin/skills/console/scripts/tests/render.test.ts
git commit -m "feat(console): mise en forme texte des trois commandes"
```

---

### Task 6: `console.ts`, le CLI

**Files:**
- Create: `plugin/skills/console/scripts/console.ts`
- Test: `plugin/skills/console/scripts/tests/console-cli.test.ts`
- Modify: `plugin/package.json` (ajouter le script `console`)

**Interfaces:**
- Consumes: tout ce qui précède, plus `parseStrategy` de `plugin/lib/strategy.ts` (signature `parseStrategy(md: string): Strategy`, `Strategy.site` est l'hôte de prod) et `defaultFetcher` (à redéclarer localement, même corps que `skills/checklist/scripts/lib/actions.ts`).
- Produces: `runConsole(args: string[], deps): Promise<{ out: string; code: 0 | 1 }>` exporté pour les tests ; un bloc `import.meta.main` qui écrit et sort.

**Contrat du CLI :**

```
console sites                     [--json]
console inspect <url>             [--json]
console crawl [--site <url>]      [--json]
```

- `sites` : `listProperties`, puis `listSitemaps` par propriété ; `bingUserSites`, puis `bingFeeds` par site.
- `inspect <url>` : `listProperties`, `resolveProperty` ; si null, sortie 1 avec la liste des propriétés vues. Sinon `inspectUrl`. Côté Bing : `bingUserSites`, `resolveBingSite` sur l'hôte de l'URL, puis `bingUrlInfo`.
- `crawl` : site depuis `--site`, sinon `seo/strategy.md` du répertoire courant (`parseStrategy(...).site`), sinon sortie 1 avec la consigne. Puis `bingUserSites`, `resolveBingSite`, `bingCrawlStats`, `bingCrawlIssues`.
- Sans `BING_WMT_API_KEY` : aucun appel Bing ne part, `bingError` vaut `non interrogé (clé absente)`, Google répond quand même, code 0.
- Une `AuthError` ou une `GscError` remplit `googleError` avec `message` puis `hint` ; elle n'interrompt pas Bing.
- Code 0 dès qu'un moteur a répondu ; code 1 si aucun n'a pu l'être, ou si l'URL ne résout aucune propriété, ou si `crawl` n'a pas de site.
- `--json` : `JSON.stringify(view, null, 2)` de la vue correspondante, passée par `redact`.

- [ ] **Step 1: Write the failing test**

```ts
// plugin/skills/console/scripts/tests/console-cli.test.ts
import { describe, test, expect } from "bun:test";
import { runConsole } from "../console";

const KEY = "aaaabbbbccccddddeeeeffff00001111";
const SITES = '{"siteEntry":[{"siteUrl":"sc-domain:romain-ecarnot.com","permissionLevel":"siteOwner"}]}';
const INSPECT = '{"inspectionResult":{"inspectionResultLink":"https://search.google.com/x","indexStatusResult":{"verdict":"NEUTRAL","coverageState":"Page with redirect","googleCanonical":"https://www.romain-ecarnot.com/","userCanonical":"https://romain-ecarnot.com/"}}}';

type Call = { url: string; method: string };
function deps(opts: { key?: string | null; reply?: (c: Call) => { status: number; text: string } }) {
  const calls: Call[] = [];
  const fetcher = async (url: string, init: { method?: string } = {}) => {
    const c = { url, method: init.method ?? "GET" };
    calls.push(c);
    if (opts.reply) return opts.reply(c);
    if (url.includes("/webmasters/v3/sites/")) return { status: 200, text: '{"sitemap":[]}' };
    if (url.includes("/webmasters/v3/sites")) return { status: 200, text: SITES };
    if (url.includes("index:inspect")) return { status: 200, text: INSPECT };
    if (url.includes("GetUserSites")) return { status: 200, text: '{"d":[]}' };
    return { status: 200, text: '{"d":null}' };
  };
  return {
    calls,
    deps: {
      fetcher,
      env: { GSC_QUOTA_PROJECT: "p-123", BING_WMT_API_KEY: opts.key === undefined ? KEY : (opts.key ?? undefined) },
      gcloud: async () => "ya29.FAUX",
      serviceAccount: async () => "sa.FAUX",
      readStrategy: async () => null,
    },
  };
}

describe("console sites", () => {
  test("code 0, Google listé, compte Bing vide dit en clair", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["sites"], d);
    expect(r.code).toBe(0);
    expect(r.out).toContain("sc-domain:romain-ecarnot.com");
    expect(r.out).toContain("aucun site dans ce compte Bing");
  });
  test("sans clé Bing, aucun appel Bing ne part et Google répond quand même", async () => {
    const { deps: d, calls } = deps({ key: null });
    const r = await runConsole(["sites"], d);
    expect(r.code).toBe(0);
    expect(r.out).toContain("non interrogé (clé absente)");
    expect(calls.some((c) => c.url.includes("ssl.bing.com"))).toBe(false);
  });
  test("--json s'analyse et ne contient jamais la clé", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["sites", "--json"], d);
    expect(() => JSON.parse(r.out)).not.toThrow();
    expect(r.out).not.toContain(KEY);
  });
});

describe("console inspect", () => {
  test("résout la propriété et signale un canonical différent", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["inspect", "https://romain-ecarnot.com/"], d);
    expect(r.code).toBe(0);
    expect(r.out).toContain("autre canonical");
  });
  test("une URL hors de toute propriété sort en 1 sans appeler l'inspection", async () => {
    const { deps: d, calls } = deps({});
    const r = await runConsole(["inspect", "https://example.com/"], d);
    expect(r.code).toBe(1);
    expect(r.out).toContain("aucune propriété");
    expect(calls.some((c) => c.url.includes("index:inspect"))).toBe(false);
  });
});

describe("aucune écriture", () => {
  test("aucun appel ne vise SubmitFeed, SubmitUrlBatch ni IndexNow", async () => {
    const { deps: d, calls } = deps({});
    await runConsole(["sites"], d);
    await runConsole(["inspect", "https://romain-ecarnot.com/"], d);
    await runConsole(["crawl", "--site", "https://romain-ecarnot.com"], d);
    const interdits = ["SubmitFeed", "SubmitUrlBatch", "indexnow", "/sitemaps/"];
    for (const c of calls) for (const i of interdits) expect(c.url.includes(i)).toBe(false);
  });
});

describe("erreurs de mise en route", () => {
  test("sans GSC_QUOTA_PROJECT, la consigne nomme la variable et la commande d'activation", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["sites"], { ...d, env: { BING_WMT_API_KEY: KEY } });
    expect(r.out).toContain("GSC_QUOTA_PROJECT");
    expect(r.out).toContain("gcloud services enable searchconsole.googleapis.com");
  });
  test("sans jeton du tout, la consigne donne la commande de connexion et son scope", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["sites"], { ...d, gcloud: async () => null });
    expect(r.out).toContain("gcloud auth application-default login");
    expect(r.out).toContain("webmasters.readonly");
  });
  test("crawl sans site et sans strategy.md sort en 1 avec la consigne", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["crawl"], d);
    expect(r.code).toBe(1);
    expect(r.out).toContain("--site");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugin && bun test skills/console/scripts/tests/console-cli.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3: Write the implementation**

Code exécuté par la session mère contre les attentes du test ci-dessus, 10 assertions vertes. Le transcrire tel quel.
Point de conception à ne pas perdre : chaque moteur est isolé. Un échec Google remplit `googleError` et laisse Bing répondre,
et l'inverse. Le code de sortie ne vaut 1 que si aucun des deux n'a pu répondre.

```ts
// plugin/skills/console/scripts/console.ts
// Le verbe console : trois lectures, aucune écriture (D30). Toutes les dépendances entrent en paramètre,
// jamais depuis process.env directement : c'est ce qui rend « aucune requête ne part » testable.
import { resolveProperty, resolveBingSite, type Property } from "./lib/resolve";
import { getAccessToken, defaultGcloud, serviceAccountToken, type GoogleAuth } from "./lib/auth-google";
import { listProperties, listSitemaps, inspectUrl, type Fetcher } from "./lib/gsc";
import { bingUserSites, bingFeeds, bingUrlInfo, bingCrawlStats, bingCrawlIssues, redact } from "./lib/bing";
import { renderSites, renderInspect, renderCrawl, type SitesView, type InspectView, type CrawlView } from "./lib/render";
import { parseStrategy } from "../../../lib/strategy";

export type Deps = {
  fetcher: Fetcher;
  env: { GSC_QUOTA_PROJECT?: string; GSC_SA_KEY_FILE?: string; BING_WMT_API_KEY?: string };
  gcloud: () => Promise<string | null>;
  serviceAccount: (path: string) => Promise<string>;
  /** Le contenu de seo/strategy.md du répertoire courant, ou null. */
  readStrategy: () => Promise<string | null>;
};

const NOKEY = "non interrogé (clé absente)";
const USAGE = "usage : console sites | console inspect <url> | console crawl [--site <url>]   [--json]";

/** Un refus devient une raison lisible : le message, puis la consigne indentée. Jamais une trace. */
function reason(e: unknown): string {
  const hint = (e as { hint?: string })?.hint;
  if (e instanceof Error) return hint ? `${e.message}\n  ${hint.split("\n").join("\n  ")}` : e.message;
  return String(e);
}

export async function runConsole(args: string[], d: Deps): Promise<{ out: string; code: 0 | 1 }> {
  const json = args.includes("--json");
  const rest = args.filter((a) => a !== "--json");
  const cmd = rest[0] ?? "";
  const key = d.env.BING_WMT_API_KEY ?? null;
  const done = (view: unknown, text: string, code: 0 | 1) => ({ out: redact(json ? JSON.stringify(view, null, 2) : text, key), code });

  const auth = async (): Promise<[GoogleAuth | null, string | null]> => {
    try { return [await getAccessToken(d.env, { gcloud: d.gcloud, serviceAccount: d.serviceAccount }), null]; }
    catch (e) { return [null, reason(e)]; }
  };

  if (cmd === "sites") {
    const [a, authErr] = await auth();
    let google: SitesView["google"] = null;
    let googleError = authErr;
    if (a) {
      try {
        const props = await listProperties(d.fetcher, a);
        google = [];
        // Un sitemap illisible sur une propriété ne doit pas emporter les autres propriétés.
        for (const p of props) google.push({ property: p, sitemaps: await listSitemaps(d.fetcher, a, p.siteUrl).catch(() => []) });
      } catch (e) { googleError = reason(e); }
    }
    let bing: SitesView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const sites = await bingUserSites(d.fetcher, key);
        bing = [];
        for (const s of sites) bing.push({ site: s, feeds: await bingFeeds(d.fetcher, key, s.Url).catch(() => []) });
      } catch (e) { bingError = reason(e); }
    }
    const view: SitesView = { google, googleError, bing, bingError };
    return done(view, renderSites(view), google || bing ? 0 : 1);
  }

  if (cmd === "inspect") {
    const url = rest[1];
    if (!url) return { out: USAGE, code: 1 };
    const [a, authErr] = await auth();
    let property: Property | null = null;
    let google: InspectView["google"] = null;
    let googleError = authErr;
    if (a) {
      try {
        const props = await listProperties(d.fetcher, a);
        property = resolveProperty(url, props);
        if (!property) {
          // D33 : on ne fabrique jamais un siteUrl. Sans propriété, aucune inspection ne part.
          googleError = `aucune propriété Search Console ne couvre cette URL. Vues : ${props.map((p) => p.siteUrl).join(", ") || "aucune"}. Voir references/acces.md.`;
        } else {
          google = await inspectUrl(d.fetcher, a, property.siteUrl, url);
        }
      } catch (e) { googleError = reason(e); }
    }
    let bing: InspectView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const host = new URL(url).hostname;
        const site = resolveBingSite(host, await bingUserSites(d.fetcher, key));
        if (!site) bingError = "aucun site dans ce compte Bing";
        else bing = await bingUrlInfo(d.fetcher, key, site.Url, url);
      } catch (e) { bingError = reason(e); }
    }
    const view: InspectView = { url, property, google, googleError, bing, bingError };
    return done(view, renderInspect(view), google || bing ? 0 : 1);
  }

  if (cmd === "crawl") {
    const i = rest.indexOf("--site");
    let site = i >= 0 ? rest[i + 1] : undefined;
    if (!site) {
      const md = await d.readStrategy();
      if (md) { try { site = parseStrategy(md).site; } catch { /* stratégie inanalysable : on demande --site */ } }
    }
    if (!site) return { out: "aucun site : lance depuis un dossier qui a seo/strategy.md, ou passe --site <url>", code: 1 };
    let bing: CrawlView["bing"] = null;
    let bingError: string | null = key ? null : NOKEY;
    if (key) {
      try {
        const host = new URL(site.startsWith("http") ? site : `https://${site}`).hostname;
        const s = resolveBingSite(host, await bingUserSites(d.fetcher, key));
        if (!s) bingError = "aucun site dans ce compte Bing";
        else bing = { stats: await bingCrawlStats(d.fetcher, key, s.Url), issues: await bingCrawlIssues(d.fetcher, key, s.Url) };
      } catch (e) { bingError = reason(e); }
    }
    const view: CrawlView = { site, bing, bingError };
    // Google n'expose pas ses statistiques de crawl : la commande aboutit quand même, le rendu le dit.
    return done(view, renderCrawl(view), 0);
  }

  return { out: USAGE, code: 1 };
}

if (import.meta.main) {
  const defaultFetcher: Fetcher = async (url, init = {}) => {
    try {
      const res = await fetch(url, { method: init.method ?? "GET", headers: init.headers, body: init.body, signal: AbortSignal.timeout(30000) });
      return { status: res.status, text: await res.text() };
    } catch (e) {
      // Jamais l'objet Error brut : sur un échec réseau il peut porter l'URL complète, donc la clé (leçon de keywords.ts).
      throw new Error(`service injoignable : ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const { out, code } = await runConsole(process.argv.slice(2), {
    fetcher: defaultFetcher,
    env: process.env,
    gcloud: defaultGcloud,
    serviceAccount: (path) => serviceAccountToken(path, defaultFetcher),
    readStrategy: async () => {
      const f = Bun.file("seo/strategy.md");
      return (await f.exists()) ? f.text() : null;
    },
  });
  console.log(out);
  process.exit(code);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugin && bun test skills/console/scripts/tests/console-cli.test.ts`
Expected: PASS.

- [ ] **Step 5: Ajouter le script dans `package.json`**

```json
"console": "bun skills/console/scripts/console.ts"
```

- [ ] **Step 6: Run the whole suite, then commit**

```bash
cd plugin && bun test
git add plugin/skills/console/scripts/console.ts plugin/skills/console/scripts/tests/console-cli.test.ts plugin/package.json
git commit -m "feat(console): CLI sites, inspect et crawl, sans aucune écriture"
```

---

### Task 7: `SKILL.md`, `references/acces.md`, `check-sources.ts`, README

**Files:**
- Create: `plugin/skills/console/SKILL.md`
- Create: `plugin/skills/console/references/acces.md`
- Modify: `plugin/skills/audit/scripts/check-sources.ts`
- Modify: `plugin/README.md`
- Test: `plugin/skills/console/scripts/tests/acces.test.ts`

**Interfaces:**
- Consumes: `parseRecipes` de `plugin/skills/build/scripts/lib/recipes.ts`, signature `parseRecipes(md: string): Recipe[]`. Format attendu par ce parseur, à respecter à la lettre dans `acces.md` :
  - un titre `### Titre (ACC-01)`, l'id en majuscules puis deux chiffres ;
  - des lignes `Fichiers: …`, `Piège: …`, `Source: <url> « citation »`.

- [ ] **Step 1: Écrire `references/acces.md`**

Entrées obligatoires, une par geste, avec au moins une `Source:` officielle et sa citation mot pour mot :

- `ACC-01` Google, ajouter un utilisateur à une propriété et choisir son rôle. Source : `https://support.google.com/webmasters/answer/7687615`, citations déjà relevées le 29/08 : « Open the Users and permissions page in property settings (Settings > Users and permissions). », « Owner: Has full control over properties in Search Console. »
- `ACC-02` Google, les deux sortes de propriété et la vérification DNS TXT. Source : `https://support.google.com/webmasters/answer/9008080`, citation : « For TXT records, a Search Console verification record looks something like `google-site-verification=_<<some number>>_`. » Piège : l'API exige le nom exact rendu par `sites.list` (`sc-domain:…` ou le préfixe d'URL), on ne le fabrique jamais.
- `ACC-03` Google, autorisation de l'API et scope de lecture. Source : `https://developers.google.com/webmaster-tools/v1/how-tos/authorizing`, citation : « Your application must use OAuth 2.0 to authorize requests. No other authorization protocols are supported. »
- `ACC-04` Google, bascule vers un compte de service : créer le projet, activer l'API, créer le compte, ranger la clé JSON hors dépôt, poser `GSC_SA_KEY_FILE`, faire ajouter l'adresse du compte par le client. Source : `https://developers.google.com/identity/protocols/oauth2/service-account`, citation : « RSA using SHA-256 hashing algorithm, expressed as `RS256` ». Piège : `GSC_QUOTA_PROJECT` devient inutile avec un compte de service ; avec gcloud, sans elle, l'API répond 403 `SERVICE_DISABLED`.
- `ACC-05` Bing, une clé par utilisateur et pas par site. Source : `https://learn.microsoft.com/en-us/bingwebmaster/getting-access`, citation : « the API key is generated for a user and not a site ». Piège : ne jamais demander la clé d'un client, elle ouvre tous ses sites en écriture.
- `ACC-06` Bing, déléguer un site en lecture seule au compte de l'agence. Source : `https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.addsiteroles`, citation : « Delegate site access to user ».

Pages d'aide `bing.com/webmasters/help/*` : applications JavaScript, nommées sans `Source:` (gotcha du 27/08). `support.google.com` répond 404 à un HEAD et 200 à un GET : `check-sources.ts` est déjà en GET.

- [ ] **Step 2: Écrire le test de format**

```ts
// plugin/skills/console/scripts/tests/acces.test.ts
import { describe, test, expect } from "bun:test";
import { parseRecipes } from "../../../build/scripts/lib/recipes";

const md = await Bun.file(new URL("../../references/acces.md", import.meta.url).pathname).text();

describe("references/acces.md", () => {
  test("chaque entrée s'analyse, porte un id ACC-nn et au moins une source citée", () => {
    const entries = parseRecipes(md);
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.ids[0]).toMatch(/^ACC-\d{2}$/);
      expect(e.sources.length).toBeGreaterThan(0);
      for (const s of e.sources) expect(s.url).toMatch(/^https:\/\//);
    }
  });
  test("les deux gestes qui commandent tout sont couverts : bascule compte de service, délégation Bing", () => {
    const ids = parseRecipes(md).flatMap((e) => e.ids);
    expect(ids).toContain("ACC-04");
    expect(ids).toContain("ACC-06");
  });
  test("aucun tiret cadratin", () => {
    expect(md).not.toContain("—");
  });
});
```

- [ ] **Step 3: Étendre `check-sources.ts`**

Ajouter, sur le modèle exact des trois lignes existantes (`checksDir`, `recipesDir`, `consolesDir`) :

```ts
const accesDir = new URL("../../console/references/", import.meta.url).pathname;
```

et, à côté de la boucle `consolesDir` :

```ts
for (const f of (await readdir(accesDir)).filter((f) => f.endsWith(".md"))) for (const r of parseRecipes(await Bun.file(accesDir + f).text())) entries.push({ label: `console:${r.ids[0]}`, ids: r.ids, sources: r.sources });
```

Mettre à jour le commentaire d'en-tête du fichier pour nommer `skills/console/references/`.

- [ ] **Step 4: Écrire `SKILL.md`**

Frontmatter sur le modèle de `skills/checklist/SKILL.md` :

```yaml
---
name: console
description: Lit l'état des consoles Google Search Console et Bing Webmaster Tools depuis le terminal, sans ouvrir un onglet, et sans rien écrire : quelles propriétés et quels accès, quel sitemap est arrivé et ce qu'il en dit, si une URL est indexée et sous quel canonical Google l'a retenue, ce que Bing voit passer. Triggers : '/erom-seo:console', 'est-ce que cette page est indexée', 'quel canonical Google a retenu', 'j'ai bien accès à la Search Console de ce client', 'mon sitemap est-il arrivé', 'qu'est-ce que Bing voit'.
argument-hint: "[sites | inspect <url> | crawl] [--site <url>] [--json]"
---
```

Corps en quatre temps (spec section 7) : Situer, Vérifier l'accès, Lire, Restituer. Points à écrire noir sur blanc :

- Le verbe ne fait rien : aucune écriture, aucun fichier. Pour agir, c'est `/erom-seo:checklist --agir`.
- Ce n'est pas un audit : pas de `raw/`, pas de rapport. Pour une preuve datée sur disque, c'est `/erom-seo:audit`.
- `console sites` en premier quand une commande échoue : c'est elle qui explique les autres.
- Les trois variables d'environnement et ce que chacune débloque, avec renvoi à `references/acces.md`.
- Quand `googleCanonical` diffère de `userCanonical`, dire ce que ça veut dire pour le site et renvoyer à IDX-04 de l'audit.

- [ ] **Step 5: Mettre `plugin/README.md` à jour**

Ajouter `console` à la liste des verbes, avec sa phrase et ses trois commandes. Ne pas toucher au reste.

- [ ] **Step 6: Lancer les vérifications**

```bash
cd plugin && bun test
cd plugin && bun skills/audit/scripts/check-sources.ts
```

Expected: tests verts ; `check-sources.ts` retrouve les 107 citations existantes plus celles de `acces.md`, et sort en 0.

- [ ] **Step 7: Commit**

```bash
git add plugin/skills/console/SKILL.md plugin/skills/console/references/acces.md plugin/skills/console/scripts/tests/acces.test.ts plugin/skills/audit/scripts/check-sources.ts plugin/README.md
git commit -m "feat(console): la skill, la référence acces.md et le contrôle des sources"
```

---

### Task 8: Recette sur les vraies API

**Files:**
- Create: `docs/superpowers/plans/2026-08-29-erom-seo-chantier-5-recette.md`

Cette tâche se joue **dans la session mère**, pas en sous-agent : elle appelle les vraies API avec le jeton de Romain.

**Préalable :** `source ~/.zshenv`, puis vérifier sans afficher de valeur :

```bash
for v in GSC_QUOTA_PROJECT BING_WMT_API_KEY; do [ -n "${!v}" ] && echo "$v présente" || echo "$v ABSENTE"; done
```

- [ ] **Step 1: AC-1, `console sites`**

```bash
cd plugin && bun skills/console/scripts/console.ts sites
```
Attendu : les trois propriétés (`sc-domain:romain-ecarnot.com` propriétaire, `https://lebonpote.romain-ecarnot.com/` propriétaire, `sc-domain:healthincloud.app` utilisateur non vérifié), le sitemap de lebonpote avec soumis 1 et indexé 0, et `aucun site dans ce compte Bing`. Coller la sortie dans la recette.

- [ ] **Step 2: AC-2, `console inspect` sur une page connue**

```bash
cd plugin && bun skills/console/scripts/console.ts inspect https://romain-ecarnot.com/
```
Attendu : propriété `sc-domain:romain-ecarnot.com`, verdict, `Page with redirect`, `ALLOWED`, `INDEXING_ALLOWED`, une date de dernier crawl, `SUCCESSFUL`, les deux canonicals sur `https://www.romain-ecarnot.com/`, et le lien d'inspection. Ouvrir le lien une fois pour contrôle visuel.

- [ ] **Step 3: AC-3, URL inconnue**

```bash
cd plugin && bun skills/console/scripts/console.ts inspect https://romain-ecarnot.com/page-qui-nexiste-pas
```
Attendu : `URL is unknown to Google`, aucune date de crawl, aucun canonical, code de sortie 0.

- [ ] **Step 4: AC-4, URL hors de toute propriété**

```bash
cd plugin && bun skills/console/scripts/console.ts inspect https://example.com/ ; echo "code=$?"
```
Attendu : `aucune propriété`, la liste des propriétés vues, `code=1`.

- [ ] **Step 5: AC-5 et AC-6, les deux erreurs de mise en route**

```bash
cd plugin && env -u GSC_SA_KEY_FILE PATH=/usr/bin bun skills/console/scripts/console.ts sites ; echo "code=$?"
cd plugin && env -u GSC_QUOTA_PROJECT bun skills/console/scripts/console.ts sites ; echo "code=$?"
```
Attendu : la première donne la commande `gcloud auth application-default login` avec le scope `webmasters.readonly` ; la seconde nomme `GSC_QUOTA_PROJECT` et la commande `gcloud services enable searchconsole.googleapis.com`. Aucune ne montre de jeton.

- [ ] **Step 6: AC-7, sans clé Bing**

```bash
cd plugin && env -u BING_WMT_API_KEY bun skills/console/scripts/console.ts sites ; echo "code=$?"
```
Attendu : Google répond, Bing dit `non interrogé (clé absente)`, `code=0`.

- [ ] **Step 7: AC-8, `console crawl`**

```bash
cd plugin && bun skills/console/scripts/console.ts crawl --site https://romain-ecarnot.com
```
Attendu : `Google : pas de statistiques de crawl en API` et `aucun site dans ce compte Bing`.

- [ ] **Step 8: AC-9, `--json` sans secret**

```bash
cd plugin && bun skills/console/scripts/console.ts sites --json | python3 -m json.tool > /dev/null && echo "json valide"
cd plugin && bun skills/console/scripts/console.ts sites --json | grep -c "$BING_WMT_API_KEY" || echo "clé absente de la sortie"
```
Attendu : `json valide`, puis `clé absente de la sortie` (le `grep -c` rend 0 correspondance donc un code non nul).

- [ ] **Step 9: AC-10, tests et sources**

```bash
cd plugin && bun test
cd plugin && bun skills/audit/scripts/check-sources.ts
```

- [ ] **Step 10: Écrire la recette et commiter**

Écrire `docs/superpowers/plans/2026-08-29-erom-seo-chantier-5-recette.md` : un bloc par AC, la commande, la sortie réelle collée (clé et jeton expurgés), le verdict OK ou KO, et les correctifs si KO. Noter en fin de recette :
- les incertitudes 1 et 2 de la spec restent ouvertes tant que le compte Bing est vide ;
- ce que la sonde du 1er septembre devra couvrir (survie de l'endpoint JSON Bing après le retrait SOAP et POX du 31 août, étendue à `GetUrlInfo`, `GetFeeds`, `GetCrawlStats`).

```bash
git add docs/superpowers/plans/2026-08-29-erom-seo-chantier-5-recette.md
git commit -m "docs(recette): chantier 5 étape 1, console recetté sur les vraies API"
```
