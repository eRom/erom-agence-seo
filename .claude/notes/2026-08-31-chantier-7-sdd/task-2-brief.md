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

