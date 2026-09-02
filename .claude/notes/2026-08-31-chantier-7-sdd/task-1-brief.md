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

