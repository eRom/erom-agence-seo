# Plan d'implémentation : erom-seo, chantier 1, audit niveau 0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer `/erom-seo:audit <url>` au niveau 0 : un script de collecte reproductible, une liste de vérifications ancrées sur la documentation officielle, un rapport Markdown structuré dans `seo/audits/<date>-n0/`.

**Architecture:** Un script `bun` collecte les octets bruts (robots.txt, sitemaps, llms.txt, pages, headers, sondes) dans `raw/` et en dérive des faits mécaniques en JSON dans `derived/` (verdicts robots par bot, faits par page, PageSpeed). Claude, guidé par `SKILL.md`, déroule les vérifications de `references/checks/*.md` sur ces JSON et écrit `report.md` selon le gabarit. Un second script vérifie que chaque citation des références existe encore mot pour mot sur sa page officielle.

**Tech Stack:** Bun 1.4.0, TypeScript, `robots-parser` 3.0.1, `node-html-parser` 9.0.1, `bun:test`, `Bun.serve` pour les tests d'intégration sans réseau.

**Spec:** `docs/superpowers/specs/2026-08-27-erom-seo-design.md`
**Brief pré-plan:** `docs/recherches/2026-08-27-audit-niveau-0.md` (sources vérifiées, citations verbatim, échantillons réels, incertitudes). Les exécutants lisent les deux avant de commencer ; toute citation copiée dans une référence vient du brief, section 3 ou 8.

## Contraintes globales

- Runtime `bun` uniquement. Jamais `npm`, `npx`, `node` : un garde-fou local les bloque.
- Aucun service payant. La clé PageSpeed est gratuite ; elle vit dans la variable d'environnement `PSI_API_KEY`, jamais dans un fichier commité.
- Rapports en français. Citations de documentation en anglais, verbatim, entre guillemets « ».
- D5 de la spec : une vérification sans `Source` officielle ne se livre pas. Domaines admis : `developers.google.com`, `support.google.com`, `web.dev`, `developers.openai.com`, `support.claude.com`, `docs.perplexity.ai`, `support.apple.com`, `blogs.bing.com`, `bing.com`, `indexnow.org`, `sitemaps.org`, `rfc-editor.org`, `schema.org`, `w3.org`.
- Le dossier d'audit est `seo/audits/<YYYY-MM-DD>-n0/` sous le répertoire courant. Jamais écrasé : si le dossier existe, suffixe `-2`, `-3`.
- `inspiration/` reste hors git. Attribution MIT Corey Haines dans `plugin/README.md` pour toute matière dérivée.
- Pas d'em dash dans le rapport ni dans les références : ces textes partent chez des tiers.
- User-agent de toutes les sondes : `erom-seo-audit/0.1`. Pause de 250 ms entre deux pages.
- Branche de travail `chantier-1-audit-n0`, créée depuis `main` à la tâche 1. Un commit par tâche, message en français, préfixe `feat(audit):`, `test(audit):` ou `docs(audit):`.
- Toute commande de ce plan se lance depuis `plugin/` sauf mention contraire.

## Structure des fichiers

```
plugin/
  .claude-plugin/plugin.json                 modifier : description, keywords
  package.json                               créer : deps, scripts
  .gitignore                                 créer : node_modules
  README.md                                  modifier : usage, attribution
  skills/audit/
    SKILL.md                                 créer : la procédure que Claude suit
    scripts/
      collect.ts                             CLI de collecte (runCollect)
      check-sources.ts                       CLI de contrôle des citations
      lint-report.ts                         CLI de contrôle d'un report.md (AC-5)
      lib/
        types.ts                             types partagés + constantes de bots
        fetch.ts                             fetchChain : redirections, timeout, UA
        robots.ts                            evaluateRobots
        sitemap.ts                           parseSitemap, collectSitemapUrls
        page.ts                              extractPageFacts, slugFor
        psi.ts                               parsePsi, fetchPsi
        normalize.ts                         normalizePage, normalizeQuote
        checks.ts                            parseChecks : lit references/checks/*.md
      tests/
        fetch.test.ts
        robots.test.ts
        sitemap.test.ts
        page.test.ts
        psi.test.ts
        normalize.test.ts
        checks-format.test.ts
        collect.test.ts
        fixtures/
          robots/www.lemonde.fr.txt          copies des échantillons réels
          robots/www.lefigaro.fr.txt
          robots/www.leboncoin.fr.txt
          robots/www.nytimes.com.txt
          psi/psi-sans-cle-429.json          échantillon réel
          psi/psi-ok-sample.json             construit d'après le discovery doc
          site.ts                            site de test servi par Bun.serve
    references/
      levels.md                              les 3 niveaux et ce que chacun voit
      report-template.md                     gabarit du rapport
      checks/
        robots.md
        snippets.md
        indexability.md
        structured-data.md
        tags.md
        freshness.md
        rendering.md
        performance.md
        ai-presence.md
```

Sortie d'un audit :

```
seo/audits/2026-09-03-n0/
  raw/
    manifest.json
    robots.txt                 si 200
    sitemap-0.xml, sitemap-1.xml…   décodés (gzip retiré)
    llms.txt                   si 200
    pages/<slug>.html
    pages/<slug>.headers.json
  derived/
    robots-eval.json
    pages.json
    psi.json
  report.md                    écrit par Claude
```

Écart assumé avec la spec 3.2 : `derived/` s'ajoute à `raw/`. `raw/` reste la preuve (octets exacts), `derived/` rend le jugement déterministe (le parseur robots applique la précédence, pas Claude). `raw/manifest.json` reste là où la spec et l'AC-1 l'attendent.

---

### Task 1 : Squelette du plugin et types partagés

**Files:**
- Create: `plugin/package.json`
- Create: `plugin/.gitignore`
- Modify: `plugin/.claude-plugin/plugin.json`
- Create: `plugin/skills/audit/scripts/lib/types.ts`
- Create: `plugin/skills/audit/scripts/tests/types.test.ts`

**Interfaces:**
- Produces : tout `lib/types.ts` ci-dessous. Chaque tâche suivante importe ces noms tels quels.

- [ ] **Step 1 : Branche de travail**

Depuis la racine du repo :

```bash
git checkout -b chantier-1-audit-n0
```

- [ ] **Step 2 : package.json et dépendances**

```bash
cd plugin
printf '%s\n' '{' '  "name": "erom-seo",' '  "private": true,' '  "type": "module",' '  "scripts": {' '    "test": "bun test skills",' '    "collect": "bun skills/audit/scripts/collect.ts",' '    "check-sources": "bun skills/audit/scripts/check-sources.ts",' '    "lint-report": "bun skills/audit/scripts/lint-report.ts"' '  }' '}' > package.json
printf 'node_modules/\n' > .gitignore
bun add robots-parser@3.0.1 node-html-parser@9.0.1
```

Attendu : `package.json` contient `"dependencies"` avec les deux versions exactes, `bun.lock` créé.

- [ ] **Step 3 : Manifeste du plugin**

Remplacer le contenu de `plugin/.claude-plugin/plugin.json` :

```json
{
  "$schema": "https://www.schemastore.org/claude-code-plugin-manifest.json",
  "name": "erom-seo",
  "description": "Audit, stratégie, build et lancement SEO/GEO sans abonnement tiers : vérifications ancrées sur la documentation officielle des moteurs, rapport Markdown daté par site.",
  "version": "0.1.0",
  "author": {
    "name": "Romain Ecarnot",
    "url": "https://github.com/eRom"
  },
  "repository": "https://github.com/eRom/erom-agence-seo",
  "license": "MIT",
  "keywords": ["seo", "geo", "audit", "robots.txt", "ai-overviews", "structured-data"],
  "skills": "./skills/",
  "agents": []
}
```

- [ ] **Step 4 : Types partagés**

Créer `plugin/skills/audit/scripts/lib/types.ts` :

```ts
// Bots de récupération : vont chercher la page au moment de la question. Les bloquer retire des citations.
export const RETRIEVAL_BOTS = ["OAI-SearchBot", "ChatGPT-User", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User"] as const;
// Bots d'entraînement et tokens de contrôle : bloquables sans perte de visibilité.
export const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended", "Applebot-Extended"] as const;
// Moteurs classiques.
export const SEARCH_BOTS = ["Googlebot", "bingbot"] as const;
export const ALL_BOTS: string[] = [...RETRIEVAL_BOTS, ...TRAINING_BOTS, ...SEARCH_BOTS];

export const USER_AGENT = "erom-seo-audit/0.1";

export type Hop = { url: string; status: number; location?: string };

export type FetchResult = {
  requested: string;
  final: string;
  status: number;            // 0 = erreur réseau ou timeout, voir error
  chain: Hop[];
  headers: Record<string, string>;
  body: Uint8Array;
  error?: string;
  ms: number;
};

export type FetchRecord = {
  requested: string;
  final: string;
  status: number;
  chain: Hop[];
  contentType?: string;
  bytes: number;
  fetchedAt: string;
  error?: string;
  file?: string;             // chemin relatif à raw/ si le corps a été sauvegardé
  ms: number;
};

export type RobotsSemantics = "rules" | "allow-all-4xx" | "disallow-all-5xx" | "rate-limited-429" | "unreachable";

export type RobotsEval = {
  status: number;
  semantics: RobotsSemantics;
  parseable: boolean;
  sitemaps: string[];
  bots: Record<string, { root: boolean | null; pages: Record<string, boolean | null> }>;
};

export type JsonLdBlock = { valid: boolean; hasContext: boolean; types: string[] };

export type PageFacts = {
  url: string;
  slug: string;
  status: number;
  title: string | null;
  lang: string | null;
  description: string | null;
  robotsMeta: string | null;
  xRobotsTag: string | null;
  canonical: string | null;
  h1: string[];
  jsonld: JsonLdBlock[];
  datePublished: string | null;
  dateModified: string | null;
  lastModified: string | null;
  visibleDates: string[];
  textChars: number;
  htmlBytes: number;
  generator: string | null;
  challenge: boolean;        // page de protection anti-bot servie à la place du contenu (title connu ou statut 403/429/503)
};

export type PsiFacts = {
  ok: boolean;
  error?: string;
  strategy: "MOBILE" | "DESKTOP";
  field?: {
    originFallback: boolean;
    overall: string | null;
    metrics: Record<string, { percentile: number; category: string }>;
  };
  lab?: { performance: number | null; seo: number | null };
};

export type Manifest = {
  site: string;
  startedAt: string;
  finishedAt: string;
  level: 0 | 1 | 2;
  userAgent: string;
  maxPages: number;
  robots: FetchRecord;
  sitemaps: FetchRecord[];
  llms: FetchRecord;
  pages: FetchRecord[];
  probes: { httpToHttps: FetchRecord; hostVariant: FetchRecord; notFound: FetchRecord };
  stack: { generator: string | null; server: string | null; poweredBy: string | null };
  psi: { attempted: boolean; ok: boolean; error?: string };
};
```

- [ ] **Step 5 : Test d'invariant sur les constantes**

Créer `plugin/skills/audit/scripts/tests/types.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { ALL_BOTS, RETRIEVAL_BOTS, TRAINING_BOTS, SEARCH_BOTS, USER_AGENT } from "../lib/types";

describe("constantes de bots", () => {
  test("aucun bot n'est à la fois récupération et entraînement", () => {
    for (const b of RETRIEVAL_BOTS) expect(TRAINING_BOTS as readonly string[]).not.toContain(b);
  });
  test("ALL_BOTS est l'union sans doublon", () => {
    expect(new Set(ALL_BOTS).size).toBe(ALL_BOTS.length);
    for (const b of [...RETRIEVAL_BOTS, ...TRAINING_BOTS, ...SEARCH_BOTS]) expect(ALL_BOTS).toContain(b);
  });
  test("les tokens respectent l'alphabet de la RFC 9309 (lettres, _ et -)", () => {
    for (const b of ALL_BOTS) expect(b).toMatch(/^[A-Za-z_-]+$/);
  });
  test("le user-agent identifie l'outil", () => {
    expect(USER_AGENT).toMatch(/^erom-seo-audit\/\d+\.\d+$/);
  });
});
```

- [ ] **Step 6 : Lancer les tests**

Run: `bun test skills`
Expected: 4 pass, 0 fail.

- [ ] **Step 7 : Commit**

```bash
git add package.json bun.lock .gitignore .claude-plugin/plugin.json skills/audit/scripts/lib/types.ts skills/audit/scripts/tests/types.test.ts
git commit -m "feat(audit): squelette du plugin erom-seo, types et constantes de bots"
```

---

### Task 2 : `lib/fetch.ts`, récupération avec chaîne de redirections

**Files:**
- Create: `plugin/skills/audit/scripts/lib/fetch.ts`
- Test: `plugin/skills/audit/scripts/tests/fetch.test.ts`

**Interfaces:**
- Consumes : `USER_AGENT`, `FetchResult`, `Hop` de `lib/types.ts`.
- Produces : `fetchChain(url: string, opts?: { timeoutMs?: number; maxHops?: number; userAgent?: string }): Promise<FetchResult>` et `text(r: FetchResult): string`.

Convention externe : `fetch` avec `redirect: "manual"` renvoie le 3xx et son header `location` sans le suivre ; vérifié en direct sur `http://lemonde.fr/` (brief, section 5 : `301 http://lemonde.fr/ → 200 https://www.lemonde.fr/`).

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `plugin/skills/audit/scripts/tests/fetch.test.ts` :

```ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { fetchChain, text } from "../lib/fetch";

let server: ReturnType<typeof Bun.serve>;
let base = "";

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const p = new URL(req.url).pathname;
      if (p === "/old") return new Response(null, { status: 301, headers: { location: "/new" } });
      if (p === "/new") return new Response("<html><title>ok</title></html>", { headers: { "content-type": "text/html", "last-modified": "Wed, 26 Aug 2026 20:49:21 GMT" } });
      if (p === "/loop") return new Response(null, { status: 302, headers: { location: "/loop" } });
      if (p === "/slow") return new Promise((r) => setTimeout(() => r(new Response("late")), 1500));
      if (p === "/ua") return new Response(req.headers.get("user-agent") ?? "");
      return new Response("nope", { status: 404 });
    },
  });
  base = `http://localhost:${server.port}`;
});
afterAll(() => server.stop(true));

describe("fetchChain", () => {
  test("suit une redirection et garde la chaîne", async () => {
    const r = await fetchChain(`${base}/old`);
    expect(r.status).toBe(200);
    expect(r.final).toBe(`${base}/new`);
    expect(r.chain.map((h) => h.status)).toEqual([301, 200]);
    expect(r.chain[0].location).toBe("/new");
    expect(r.headers["last-modified"]).toBe("Wed, 26 Aug 2026 20:49:21 GMT");
    expect(text(r)).toContain("<title>ok</title>");
    expect(r.ms).toBeGreaterThanOrEqual(0);
  });
  test("rend le 404 tel quel", async () => {
    const r = await fetchChain(`${base}/absent`);
    expect(r.status).toBe(404);
    expect(r.chain).toHaveLength(1);
  });
  test("s'arrête sur une boucle de redirections", async () => {
    const r = await fetchChain(`${base}/loop`, { maxHops: 3 });
    expect(r.status).toBe(0);
    expect(r.error).toContain("redirections");
    expect(r.chain).toHaveLength(4);
  });
  test("expire sans planter", async () => {
    const r = await fetchChain(`${base}/slow`, { timeoutMs: 200 });
    expect(r.status).toBe(0);
    expect(r.error).toMatch(/timeout|abort/i);
  });
  test("envoie le user-agent de l'outil", async () => {
    const r = await fetchChain(`${base}/ua`);
    expect(text(r)).toBe("erom-seo-audit/0.1");
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `bun test skills/audit/scripts/tests/fetch.test.ts`
Expected: FAIL, `Cannot find module "../lib/fetch"`.

- [ ] **Step 3 : Implémenter**

Créer `plugin/skills/audit/scripts/lib/fetch.ts` :

```ts
import { USER_AGENT, type FetchResult, type Hop } from "./types";

export type FetchOptions = { timeoutMs?: number; maxHops?: number; userAgent?: string };

/** Récupère une URL en suivant les redirections une par une, pour garder la chaîne complète. Ne lève jamais : les erreurs vont dans `error`, status 0. */
export async function fetchChain(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const { timeoutMs = 15000, maxHops = 5, userAgent = USER_AGENT } = opts;
  const chain: Hop[] = [];
  let current = url;
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  try {
    for (let i = 0; i <= maxHops; i++) {
      const res = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": userAgent, accept: "text/html,application/xml,text/xml,text/plain,*/*" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const location = res.headers.get("location") ?? undefined;
      chain.push({ url: current, status: res.status, location });
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }
      return { requested: url, final: current, status: res.status, chain, headers: Object.fromEntries(res.headers), body: new Uint8Array(await res.arrayBuffer()), ms: ms() };
    }
    return { requested: url, final: current, status: 0, chain, headers: {}, body: new Uint8Array(), error: `plus de ${maxHops} redirections`, ms: ms() };
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return { requested: url, final: current, status: 0, chain, headers: {}, body: new Uint8Array(), error, ms: ms() };
  }
}

export const text = (r: FetchResult): string => new TextDecoder().decode(r.body);
```

- [ ] **Step 4 : Vérifier le succès**

Run: `bun test skills/audit/scripts/tests/fetch.test.ts`
Expected: 5 pass.

- [ ] **Step 5 : Commit**

```bash
git add skills/audit/scripts/lib/fetch.ts skills/audit/scripts/tests/fetch.test.ts
git commit -m "feat(audit): fetchChain avec chaîne de redirections, timeout et user-agent"
```

---

### Task 3 : `lib/robots.ts`, verdicts par bot

**Files:**
- Create: `plugin/skills/audit/scripts/lib/robots.ts`
- Create: `plugin/skills/audit/scripts/tests/fixtures/robots/` (4 fichiers copiés)
- Test: `plugin/skills/audit/scripts/tests/robots.test.ts`

**Interfaces:**
- Consumes : `RobotsEval`, `RobotsSemantics` de `lib/types.ts` ; `robots-parser`.
- Produces : `evaluateRobots(robotsUrl: string, status: number, txt: string | null, bots: string[], pageUrls: string[]): RobotsEval`.

Convention externe : précédence robots.txt selon G-ROBOTS et RFC 9309 (brief, section 3, « Précédence robots.txt »). `robots-parser` 3.0.1 validé sur les quatre échantillons réels (brief, section 5, tableau des verdicts).

- [ ] **Step 1 : Copier les échantillons réels en fixtures**

Depuis la racine du repo :

```bash
mkdir -p plugin/skills/audit/scripts/tests/fixtures/robots
cp docs/recherches/echantillons/robots/www.lemonde.fr.txt docs/recherches/echantillons/robots/www.lefigaro.fr.txt docs/recherches/echantillons/robots/www.leboncoin.fr.txt docs/recherches/echantillons/robots/www.nytimes.com.txt plugin/skills/audit/scripts/tests/fixtures/robots/
```

- [ ] **Step 2 : Écrire le test qui échoue**

Créer `plugin/skills/audit/scripts/tests/robots.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { evaluateRobots } from "../lib/robots";

const fixture = (host: string) => Bun.file(`${import.meta.dir}/fixtures/robots/${host}.txt`).text();
const BOTS = ["OAI-SearchBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "GPTBot", "Googlebot", "bingbot", "Google-Extended"];

describe("evaluateRobots", () => {
  test("lemonde.fr bloque Claude-User et Claude-SearchBot, laisse OAI-SearchBot", async () => {
    const e = evaluateRobots("https://www.lemonde.fr/robots.txt", 200, await fixture("www.lemonde.fr"), BOTS, ["https://www.lemonde.fr/politique/"]);
    expect(e.semantics).toBe("rules");
    expect(e.parseable).toBe(true);
    expect(e.bots["Claude-User"].root).toBe(false);
    expect(e.bots["Claude-SearchBot"].root).toBe(false);
    expect(e.bots["OAI-SearchBot"].root).toBe(true);
    expect(e.bots["Googlebot"].root).toBe(true);
    expect(e.bots["Claude-User"].pages["https://www.lemonde.fr/politique/"]).toBe(false);
    expect(e.sitemaps.length).toBeGreaterThan(0);
  });
  test("lefigaro.fr : Disallow / battu par Allow /voyages (règle la plus longue)", async () => {
    const e = evaluateRobots("https://www.lefigaro.fr/robots.txt", 200, await fixture("www.lefigaro.fr"), BOTS, ["https://www.lefigaro.fr/voyages/paris", "https://www.lefigaro.fr/politique/x"]);
    expect(e.bots["OAI-SearchBot"].root).toBe(false);
    expect(e.bots["OAI-SearchBot"].pages["https://www.lefigaro.fr/voyages/paris"]).toBe(true);
    expect(e.bots["OAI-SearchBot"].pages["https://www.lefigaro.fr/politique/x"]).toBe(false);
  });
  test("leboncoin.fr laisse passer tout le monde à la racine", async () => {
    const e = evaluateRobots("https://www.leboncoin.fr/robots.txt", 200, await fixture("www.leboncoin.fr"), BOTS, []);
    for (const b of BOTS) expect(e.bots[b].root).toBe(true);
  });
  test("nytimes.com bloque toute récupération IA mais pas Googlebot", async () => {
    const e = evaluateRobots("https://www.nytimes.com/robots.txt", 200, await fixture("www.nytimes.com"), BOTS, []);
    for (const b of ["OAI-SearchBot", "Claude-User", "Claude-SearchBot", "PerplexityBot"]) expect(e.bots[b].root).toBe(false);
    expect(e.bots["Googlebot"].root).toBe(true);
  });
  test("404 : aucune restriction, verdicts null, sémantique allow-all-4xx", () => {
    const e = evaluateRobots("https://x.fr/robots.txt", 404, null, BOTS, ["https://x.fr/a"]);
    expect(e.semantics).toBe("allow-all-4xx");
    expect(e.parseable).toBe(false);
    expect(e.bots["Claude-User"].root).toBeNull();
    expect(e.bots["Claude-User"].pages["https://x.fr/a"]).toBeNull();
  });
  test("503 : disallow-all-5xx ; 429 : rate-limited-429 ; 0 : unreachable", () => {
    expect(evaluateRobots("https://x.fr/robots.txt", 503, null, BOTS, []).semantics).toBe("disallow-all-5xx");
    expect(evaluateRobots("https://x.fr/robots.txt", 429, null, BOTS, []).semantics).toBe("rate-limited-429");
    expect(evaluateRobots("https://x.fr/robots.txt", 0, null, BOTS, []).semantics).toBe("unreachable");
  });
  test("le groupe est trouvé sans tenir compte de la casse", () => {
    const txt = "User-agent: claude-user\nDisallow: /\n\nUser-agent: *\nAllow: /\n";
    const e = evaluateRobots("https://x.fr/robots.txt", 200, txt, ["Claude-User", "Googlebot"], []);
    expect(e.bots["Claude-User"].root).toBe(false);
    expect(e.bots["Googlebot"].root).toBe(true);
  });
});
```

- [ ] **Step 3 : Vérifier l'échec**

Run: `bun test skills/audit/scripts/tests/robots.test.ts`
Expected: FAIL, module `../lib/robots` introuvable.

- [ ] **Step 4 : Implémenter**

Créer `plugin/skills/audit/scripts/lib/robots.ts` :

```ts
import robotsParser from "robots-parser";
import type { RobotsEval, RobotsSemantics } from "./types";

function semanticsFor(status: number): RobotsSemantics {
  if (status === 0) return "unreachable";
  if (status === 429) return "rate-limited-429";
  if (status >= 500) return "disallow-all-5xx";
  if (status >= 400) return "allow-all-4xx";
  return "rules";
}

/**
 * Applique robots.txt pour chaque bot, sur la racine et sur chaque page collectée.
 * Sémantique hors 200 : G-ROBOTS (4xx sauf 429 = aucune restriction ; 5xx = Google arrête de crawler) et RFC 9309.
 * `null` = aucun verdict possible (fichier absent, en erreur, ou URL hors hôte).
 */
export function evaluateRobots(robotsUrl: string, status: number, txt: string | null, bots: string[], pageUrls: string[]): RobotsEval {
  const origin = new URL(robotsUrl).origin;
  const semantics = semanticsFor(status);
  const nullVerdicts = () => Object.fromEntries(bots.map((b) => [b, { root: null, pages: Object.fromEntries(pageUrls.map((p) => [p, null])) }]));
  if (semantics !== "rules" || txt === null) {
    return { status, semantics, parseable: false, sitemaps: [], bots: nullVerdicts() };
  }
  const parser = robotsParser(robotsUrl, txt);
  const verdict = (u: string, b: string): boolean | null => {
    const v = parser.isAllowed(u, b);
    return v === undefined ? null : v;
  };
  return {
    status,
    semantics,
    parseable: true,
    sitemaps: parser.getSitemaps(),
    bots: Object.fromEntries(bots.map((b) => [b, { root: verdict(`${origin}/`, b), pages: Object.fromEntries(pageUrls.map((p) => [p, verdict(p, b)])) }])),
  };
}
```

- [ ] **Step 5 : Vérifier le succès**

Run: `bun test skills/audit/scripts/tests/robots.test.ts`
Expected: 7 pass. Si le test de casse échoue, `robots-parser` ne normalise pas les user-agents : abaisser le texte en minuscules avant parsing (`txt.replace(/^(user-agent:\s*)(.+)$/gim, (_, k, v) => k + v.toLowerCase())`) et interroger avec `b.toLowerCase()`. Documenter le contournement en commentaire.

- [ ] **Step 6 : Commit**

```bash
git add skills/audit/scripts/lib/robots.ts skills/audit/scripts/tests/robots.test.ts skills/audit/scripts/tests/fixtures/robots
git commit -m "feat(audit): verdicts robots.txt par bot avec sémantique 4xx/5xx"
```

---

### Task 4 : `lib/sitemap.ts`, découverte et lecture des sitemaps

**Files:**
- Create: `plugin/skills/audit/scripts/lib/sitemap.ts`
- Test: `plugin/skills/audit/scripts/tests/sitemap.test.ts`

**Interfaces:**
- Consumes : `FetchResult` de `lib/types.ts`.
- Produces :
  - `parseSitemap(xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] }`
  - `decodeSitemapBody(body: Uint8Array, url: string, contentType: string | null): string`
  - `sitemapCandidates(fromRobots: string[], origin: string): string[]`
  - `type Fetcher = (url: string) => Promise<FetchResult>`
  - `collectSitemapUrls(candidates: string[], fetcher: Fetcher, opts: { maxUrls: number; origin: string; maxChildren?: number }): Promise<{ fetched: { url: string; result: FetchResult; kind: string; text: string }[]; urls: string[] }>`

Conventions externes : format `<sitemapindex>` / `<urlset>` et `<loc>` (SITEMAPS, brief section 3) ; déclaration `Sitemap:` dans robots.txt (G-SITEMAP) ; échantillons réels : lefigaro.fr sert 404 sur `/sitemap.xml` et déclare ses sitemaps sur un autre hôte dans robots.txt ; lemonde.fr sert un index de 3 264 enfants (brief, section 5). D'où : les sitemaps déclarés dans robots.txt passent en premier, un index n'est lu que sur ses 3 premiers enfants.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `plugin/skills/audit/scripts/tests/sitemap.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { parseSitemap, decodeSitemapBody, sitemapCandidates, collectSitemapUrls, type Fetcher } from "../lib/sitemap";
import type { FetchResult } from "../lib/types";

const INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <sitemap><loc>https://a.fr/s1.xml</loc><lastmod>2004-10-01T18:23:17+00:00</lastmod></sitemap>
   <sitemap><loc>https://a.fr/s2.xml</loc></sitemap>
   <sitemap><loc>https://a.fr/s3.xml</loc></sitemap>
   <sitemap><loc>https://a.fr/s4.xml</loc></sitemap>
</sitemapindex>`;
const urlset = (...locs: string[]) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`;

function fakeFetcher(map: Record<string, { status: number; body: string | Uint8Array; contentType?: string }>): Fetcher {
  return async (url) => {
    const e = map[url];
    const body = e ? (typeof e.body === "string" ? new TextEncoder().encode(e.body) : e.body) : new Uint8Array();
    return { requested: url, final: url, status: e?.status ?? 404, chain: [{ url, status: e?.status ?? 404 }], headers: e?.contentType ? { "content-type": e.contentType } : {}, body, ms: 1 };
  };
}

describe("parseSitemap", () => {
  test("reconnaît un index et ses loc", () => {
    const p = parseSitemap(INDEX);
    expect(p.kind).toBe("index");
    expect(p.locs).toEqual(["https://a.fr/s1.xml", "https://a.fr/s2.xml", "https://a.fr/s3.xml", "https://a.fr/s4.xml"]);
  });
  test("reconnaît un urlset", () => {
    const p = parseSitemap(urlset("https://a.fr/", "https://a.fr/b"));
    expect(p.kind).toBe("urlset");
    expect(p.locs).toEqual(["https://a.fr/", "https://a.fr/b"]);
  });
  test("HTML ou vide : unknown, zéro loc", () => {
    expect(parseSitemap("<!DOCTYPE html><html><body>404</body></html>")).toEqual({ kind: "unknown", locs: [] });
    expect(parseSitemap("")).toEqual({ kind: "unknown", locs: [] });
  });
});

describe("decodeSitemapBody", () => {
  test("décompresse un .gz (aller-retour Bun.gzipSync)", () => {
    const xml = urlset("https://a.fr/z");
    const gz = Bun.gzipSync(new TextEncoder().encode(xml));
    expect(decodeSitemapBody(gz, "https://a.fr/s.xml.gz", "application/gzip")).toBe(xml);
    expect(decodeSitemapBody(gz, "https://a.fr/s.xml", "text/xml")).toBe(xml); // détection par octets magiques
  });
  test("laisse le texte clair tel quel", () => {
    expect(decodeSitemapBody(new TextEncoder().encode("<urlset/>"), "https://a.fr/s.xml", "text/xml")).toBe("<urlset/>");
  });
});

describe("sitemapCandidates", () => {
  test("robots.txt d'abord, puis les emplacements classiques, sans doublon", () => {
    expect(sitemapCandidates(["https://sm.a.fr/x.xml", "https://a.fr/sitemap.xml"], "https://a.fr")).toEqual(["https://sm.a.fr/x.xml", "https://a.fr/sitemap.xml", "https://a.fr/sitemap_index.xml"]);
  });
});

describe("collectSitemapUrls", () => {
  test("lit un index sur 3 enfants maximum et plafonne les URLs", async () => {
    const f = fakeFetcher({
      "https://a.fr/sitemap.xml": { status: 200, body: INDEX, contentType: "text/xml" },
      "https://a.fr/s1.xml": { status: 200, body: urlset("https://a.fr/1", "https://a.fr/2") },
      "https://a.fr/s2.xml": { status: 200, body: urlset("https://a.fr/3", "https://autre.fr/x") },
      "https://a.fr/s3.xml": { status: 200, body: urlset("https://a.fr/4", "https://a.fr/5") },
      "https://a.fr/s4.xml": { status: 200, body: urlset("https://a.fr/6") },
    });
    const r = await collectSitemapUrls(["https://a.fr/sitemap.xml"], f, { maxUrls: 4, origin: "https://a.fr" });
    expect(r.urls).toEqual(["https://a.fr/1", "https://a.fr/2", "https://a.fr/3", "https://a.fr/4"]);
    expect(r.fetched.map((x) => x.url)).not.toContain("https://a.fr/s4.xml");
    expect(r.fetched[0].kind).toBe("index");
    expect(r.fetched[0].text).toContain("<sitemapindex");
  });
  test("saute un candidat en 404 et prend le suivant", async () => {
    const f = fakeFetcher({ "https://a.fr/sitemap_index.xml": { status: 200, body: urlset("https://a.fr/ok") } });
    const r = await collectSitemapUrls(sitemapCandidates([], "https://a.fr"), f, { maxUrls: 10, origin: "https://a.fr" });
    expect(r.urls).toEqual(["https://a.fr/ok"]);
    expect(r.fetched[0].result.status).toBe(404);
    expect(r.fetched[1].kind).toBe("urlset");
  });
  test("aucun sitemap : liste vide, tentatives consignées", async () => {
    const r = await collectSitemapUrls(sitemapCandidates([], "https://a.fr"), fakeFetcher({}), { maxUrls: 10, origin: "https://a.fr" });
    expect(r.urls).toEqual([]);
    expect(r.fetched).toHaveLength(2);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `bun test skills/audit/scripts/tests/sitemap.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Implémenter**

Créer `plugin/skills/audit/scripts/lib/sitemap.ts` :

```ts
import type { FetchResult } from "./types";

export type Fetcher = (url: string) => Promise<FetchResult>;
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

export async function collectSitemapUrls(
  candidates: string[],
  fetcher: Fetcher,
  opts: { maxUrls: number; origin: string; maxChildren?: number },
): Promise<{ fetched: { url: string; result: FetchResult; kind: SitemapKind; text: string }[]; urls: string[] }> {
  const maxChildren = opts.maxChildren ?? 3;
  const fetched: { url: string; result: FetchResult; kind: SitemapKind; text: string }[] = [];
  const urls: string[] = [];
  const sameOrigin = (u: string) => { try { return new URL(u).origin === opts.origin; } catch { return false; } };
  const take = (locs: string[]) => { for (const u of locs) if (sameOrigin(u) && !urls.includes(u) && urls.length < opts.maxUrls) urls.push(u); };
  const read = async (url: string) => {
    const result = await fetcher(url);
    const text = result.status === 200 ? decodeSitemapBody(result.body, result.final, result.headers["content-type"] ?? null) : "";
    const parsed = result.status === 200 ? parseSitemap(text) : { kind: "unknown" as SitemapKind, locs: [] };
    fetched.push({ url, result, kind: parsed.kind, text });
    return parsed;
  };
  for (const cand of candidates) {
    const parsed = await read(cand);
    if (parsed.kind === "urlset") { take(parsed.locs); return { fetched, urls }; }
    if (parsed.kind === "index") {
      for (const child of parsed.locs.slice(0, maxChildren)) {
        if (urls.length >= opts.maxUrls) break;
        take((await read(child)).locs);
      }
      return { fetched, urls };
    }
  }
  return { fetched, urls };
}
```

- [ ] **Step 4 : Vérifier le succès**

Run: `bun test skills/audit/scripts/tests/sitemap.test.ts`
Expected: 9 pass.

- [ ] **Step 5 : Commit**

```bash
git add skills/audit/scripts/lib/sitemap.ts skills/audit/scripts/tests/sitemap.test.ts
git commit -m "feat(audit): découverte des sitemaps via robots.txt, index plafonné, gzip"
```

---

### Task 5 : `lib/page.ts`, faits par page

**Files:**
- Create: `plugin/skills/audit/scripts/lib/page.ts`
- Test: `plugin/skills/audit/scripts/tests/page.test.ts`

**Interfaces:**
- Consumes : `PageFacts`, `JsonLdBlock` de `lib/types.ts` ; `node-html-parser`.
- Produces : `extractPageFacts(html: string, url: string, status: number, headers: Record<string, string>, slug: string): PageFacts` et `slugFor(url: string): string`.

Convention externe : extraction validée sur la home du Monde (brief, section 5 : title, `lang`, meta robots, canonical, h1, JSON-LD `NewsMediaOrganization`, 41 211 caractères de texte). Dates : G-DATES recommande `datePublished` et `dateModified` sur un sous-type de `CreativeWork` et une date visible étiquetée.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `plugin/skills/audit/scripts/tests/page.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { extractPageFacts, slugFor } from "../lib/page";

const HTML = `<!DOCTYPE html><html lang="fr"><head>
<title>Acme, cabinet de conseil à Nantes</title>
<meta name="description" content="Acme accompagne les PME.">
<meta name="robots" content="max-snippet:0, noindex">
<meta name="generator" content="WordPress 6.6">
<link rel="canonical" href="https://acme.fr/">
<meta property="og:title" content="Acme">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Acme","sameAs":["https://www.linkedin.com/company/acme"]},{"@type":"Article","datePublished":"2026-06-01","dateModified":"2026-06-12"}]}</script>
<script type="application/ld+json">{pas du json</script>
<style>.x{}</style>
</head><body>
<h1>Acme</h1><h1>Deuxième h1</h1>
<p>Mis à jour le 12 juin 2026. <time datetime="2026-06-12T09:00:00+02:00">12/06/2026</time></p>
<p>${"Texte utile. ".repeat(50)}</p>
<script>console.log("pas du texte")</script>
</body></html>`;

describe("extractPageFacts", () => {
  const f = extractPageFacts(HTML, "https://acme.fr/", 200, { "last-modified": "Fri, 12 Jun 2026 07:00:00 GMT", "x-robots-tag": "noarchive" }, "index");
  test("balises de tête", () => {
    expect(f.title).toBe("Acme, cabinet de conseil à Nantes");
    expect(f.lang).toBe("fr");
    expect(f.description).toBe("Acme accompagne les PME.");
    expect(f.robotsMeta).toBe("max-snippet:0, noindex");
    expect(f.xRobotsTag).toBe("noarchive");
    expect(f.canonical).toBe("https://acme.fr/");
    expect(f.generator).toBe("WordPress 6.6");
    expect(f.h1).toEqual(["Acme", "Deuxième h1"]);
  });
  test("JSON-LD : types aplatis, bloc invalide signalé", () => {
    expect(f.jsonld).toHaveLength(2);
    expect(f.jsonld[0]).toEqual({ valid: true, hasContext: true, types: ["Organization", "Article"] });
    expect(f.jsonld[1].valid).toBe(false);
  });
  test("dates : structurées, header, visibles", () => {
    expect(f.datePublished).toBe("2026-06-01");
    expect(f.dateModified).toBe("2026-06-12");
    expect(f.lastModified).toBe("Fri, 12 Jun 2026 07:00:00 GMT");
    expect(f.visibleDates).toContain("2026-06-12T09:00:00+02:00");
    expect(f.visibleDates).toContain("12 juin 2026");
    expect(f.visibleDates).toContain("12/06/2026");
  });
  test("texte : les scripts et styles ne comptent pas", () => {
    expect(f.textChars).toBeGreaterThan(600);
    expect(f.textChars).toBeLessThan(800);
    expect(f.htmlBytes).toBe(new TextEncoder().encode(HTML).length);
    expect(f.url).toBe("https://acme.fr/");
    expect(f.slug).toBe("index");
    expect(f.status).toBe(200);
  });
  test("coquille SPA : presque pas de texte", () => {
    const spa = extractPageFacts(`<html><head><title>App</title></head><body><div id="root"></div><script src="/app.js"></script></body></html>`, "https://spa.fr/", 200, {}, "index");
    expect(spa.textChars).toBeLessThan(10);
    expect(spa.h1).toEqual([]);
    expect(spa.jsonld).toEqual([]);
    expect(spa.canonical).toBeNull();
    expect(spa.challenge).toBe(false);
  });
  test("page de challenge anti-bot reconnue au title ou au statut", () => {
    const c = extractPageFacts(`<html><head><title>Client Challenge</title></head><body><p>JavaScript is required.</p></body></html>`, "https://x.fr/a", 200, {}, "a");
    expect(c.challenge).toBe(true);
    expect(extractPageFacts("<html><title>Ok</title><body>texte</body></html>", "https://x.fr/b", 403, {}, "b").challenge).toBe(true);
    expect(f.challenge).toBe(false);
  });
});

describe("slugFor", () => {
  test("racine, chemins, accents, longueur", () => {
    expect(slugFor("https://a.fr/")).toBe("index");
    expect(slugFor("https://a.fr/voyages/paris/")).toBe("voyages_paris");
    expect(slugFor("https://a.fr/blog/%C3%A9t%C3%A9-2026?x=1#h")).toBe("blog_été-2026");
    const long = slugFor("https://a.fr/" + "x".repeat(200));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long).toMatch(/-[0-9a-f]{6}$/);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `bun test skills/audit/scripts/tests/page.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 3 : Implémenter**

Créer `plugin/skills/audit/scripts/lib/page.ts` :

```ts
import { parse, type HTMLElement } from "node-html-parser";
import type { JsonLdBlock, PageFacts } from "./types";

export function slugFor(url: string): string {
  const u = new URL(url);
  const path = decodeURIComponent(u.pathname).replace(/\/+$/, "");
  if (!path) return "index";
  let s = path.replace(/^\//, "").replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/_+/g, "_");
  if (s.length > 80) s = s.slice(0, 72) + "-" + Bun.hash(url).toString(16).slice(0, 6);
  return s;
}

function collectTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) { for (const n of node) collectTypes(n, out); return; }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.push(x);
    if (o["@graph"]) collectTypes(o["@graph"], out);
  }
}

function findKey(node: unknown, key: string): string | null {
  if (Array.isArray(node)) { for (const n of node) { const v = findKey(n, key); if (v) return v; } return null; }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o[key] === "string") return o[key] as string;
    for (const v of Object.values(o)) { const r = findKey(v, key); if (r) return r; }
  }
  return null;
}

const FR_MONTHS = "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";
const DATE_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}(?:T[\d:+\-.]+Z?)?\b/g,
  new RegExp(`\\b\\d{1,2}(?:er)?\\s(?:${FR_MONTHS})\\s\\d{4}\\b`, "gi"),
  /\b\d{2}\/\d{2}\/\d{4}\b/g,
];

/** Pages de protection anti-bot servies à la place du contenu, parfois en 200 (lemonde.fr, 2026-08-27 : « Client Challenge », 3 038 octets). */
const CHALLENGE = /client challenge|just a moment|attention required|access denied|are you a human|verify you are human|un instant/i;

export function extractPageFacts(html: string, url: string, status: number, headers: Record<string, string>, slug: string): PageFacts {
  const doc = parse(html);
  const attr = (sel: string, a: string) => doc.querySelector(sel)?.getAttribute(a) ?? null;
  const jsonld: JsonLdBlock[] = [];
  let datePublished: string | null = null;
  let dateModified: string | null = null;
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.text);
      const types: string[] = [];
      collectTypes(j, types);
      jsonld.push({ valid: true, hasContext: findKey(j, "@context") !== null, types });
      datePublished ??= findKey(j, "datePublished");
      dateModified ??= findKey(j, "dateModified");
    } catch {
      jsonld.push({ valid: false, hasContext: false, types: [] });
    }
  }
  const visibleDates = new Set<string>();
  for (const t of doc.querySelectorAll("time")) { const d = t.getAttribute("datetime"); if (d) visibleDates.add(d); }
  for (const el of doc.querySelectorAll("script, style, noscript, template")) (el as HTMLElement).remove();
  const bodyText = (doc.querySelector("body")?.text ?? "").replace(/\s+/g, " ").trim();
  for (const re of DATE_PATTERNS) for (const m of bodyText.matchAll(re)) { if (visibleDates.size < 10) visibleDates.add(m[0]); }
  const title = doc.querySelector("title")?.text.trim() || null;
  return {
    url,
    slug,
    status,
    title,
    lang: attr("html", "lang"),
    description: attr('meta[name="description"]', "content"),
    robotsMeta: attr('meta[name="robots"]', "content"),
    xRobotsTag: headers["x-robots-tag"] ?? null,
    canonical: attr('link[rel="canonical"]', "href"),
    h1: doc.querySelectorAll("h1").map((h) => h.text.replace(/\s+/g, " ").trim()),
    jsonld,
    datePublished,
    dateModified,
    lastModified: headers["last-modified"] ?? null,
    visibleDates: [...visibleDates],
    textChars: bodyText.length,
    htmlBytes: new TextEncoder().encode(html).length,
    generator: attr('meta[name="generator"]', "content"),
    challenge: CHALLENGE.test(title ?? "") || [403, 429, 503].includes(status),
  };
}
```

- [ ] **Step 4 : Vérifier le succès**

Run: `bun test skills/audit/scripts/tests/page.test.ts`
Expected: 7 pass. Si `textChars` sort de la fourchette 600 à 800, imprimer `bodyText` et ajuster l'attente sur la valeur réelle en expliquant l'écart en commentaire : le test fixe une fourchette, pas un nombre magique.

- [ ] **Step 5 : Commit**

```bash
git add skills/audit/scripts/lib/page.ts skills/audit/scripts/tests/page.test.ts
git commit -m "feat(audit): extraction des faits par page (balises, JSON-LD, dates, texte)"
```

---

### Task 6 : `lib/psi.ts`, PageSpeed Insights

**Files:**
- Create: `plugin/skills/audit/scripts/lib/psi.ts`
- Create: `plugin/skills/audit/scripts/tests/fixtures/psi/psi-sans-cle-429.json` (copie de l'échantillon réel)
- Create: `plugin/skills/audit/scripts/tests/fixtures/psi/psi-ok-sample.json`
- Test: `plugin/skills/audit/scripts/tests/psi.test.ts`

**Interfaces:**
- Consumes : `PsiFacts` de `lib/types.ts`.
- Produces : `parsePsi(json: unknown, strategy: "MOBILE" | "DESKTOP"): PsiFacts` et `fetchPsi(url: string, key: string, strategy: "MOBILE" | "DESKTOP"): Promise<PsiFacts>`.

Conventions externes : endpoint et forme de réponse d'après le discovery doc officiel révision 20260825 et le codelab CrUX (brief, section 3, « Performance ») ; échantillon réel du 429 sans clé (brief, section 5). Quota avec clé non documenté (incertitude 1) : un appel par audit, jamais de rafale.

- [ ] **Step 1 : Fixtures**

Depuis la racine du repo :

```bash
mkdir -p plugin/skills/audit/scripts/tests/fixtures/psi
cp docs/recherches/echantillons/psi-sans-cle-429.json plugin/skills/audit/scripts/tests/fixtures/psi/
```

Créer `plugin/skills/audit/scripts/tests/fixtures/psi/psi-ok-sample.json`, construit d'après le discovery doc et l'extrait du codelab (les proportions et valeurs sont celles de l'exemple officiel pour LCP, les autres métriques suivent la même forme) :

```json
{
  "id": "https://developers.google.com/",
  "loadingExperience": {
    "id": "https://developers.google.com/",
    "metrics": {
      "LARGEST_CONTENTFUL_PAINT_MS": { "percentile": 1714, "distributions": [{ "min": 0, "max": 2500, "proportion": 0.8977 }, { "min": 2500, "max": 4000, "proportion": 0.0743 }, { "min": 4000, "proportion": 0.028 }], "category": "FAST" },
      "INTERACTION_TO_NEXT_PAINT": { "percentile": 231, "distributions": [{ "min": 0, "max": 200, "proportion": 0.70 }, { "min": 200, "max": 500, "proportion": 0.22 }, { "min": 500, "proportion": 0.08 }], "category": "AVERAGE" },
      "CUMULATIVE_LAYOUT_SHIFT_SCORE": { "percentile": 2, "distributions": [{ "min": 0, "max": 10, "proportion": 0.95 }, { "min": 10, "max": 25, "proportion": 0.03 }, { "min": 25, "proportion": 0.02 }], "category": "FAST" }
    },
    "overall_category": "AVERAGE",
    "initial_url": "https://developers.google.com/",
    "origin_fallback": true
  },
  "lighthouseResult": {
    "requestedUrl": "https://developers.google.com/",
    "lighthouseVersion": "12.6.0",
    "categories": { "performance": { "id": "performance", "score": 0.86 }, "seo": { "id": "seo", "score": 0.92 } }
  },
  "analysisUTCTimestamp": "2026-08-27T15:00:00.000Z"
}
```

- [ ] **Step 2 : Écrire le test qui échoue**

Créer `plugin/skills/audit/scripts/tests/psi.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { parsePsi } from "../lib/psi";

const load = (n: string) => Bun.file(`${import.meta.dir}/fixtures/psi/${n}`).json();

describe("parsePsi", () => {
  test("réponse complète : terrain et labo", async () => {
    const p = parsePsi(await load("psi-ok-sample.json"), "MOBILE");
    expect(p.ok).toBe(true);
    expect(p.strategy).toBe("MOBILE");
    expect(p.field?.overall).toBe("AVERAGE");
    expect(p.field?.originFallback).toBe(true);
    expect(p.field?.metrics["LARGEST_CONTENTFUL_PAINT_MS"]).toEqual({ percentile: 1714, category: "FAST" });
    expect(p.field?.metrics["INTERACTION_TO_NEXT_PAINT"].category).toBe("AVERAGE");
    expect(p.lab?.performance).toBe(0.86);
    expect(p.lab?.seo).toBe(0.92);
  });
  test("429 réel sans clé : ok false, message conservé", async () => {
    const p = parsePsi(await load("psi-sans-cle-429.json"), "MOBILE");
    expect(p.ok).toBe(false);
    expect(p.error).toContain("Quota exceeded");
    expect(p.field).toBeUndefined();
  });
  test("labo seul (pas de données CrUX) : field absent, lab présent", () => {
    const p = parsePsi({ lighthouseResult: { categories: { performance: { score: 0.5 } } } }, "DESKTOP");
    expect(p.ok).toBe(true);
    expect(p.field).toBeUndefined();
    expect(p.lab?.performance).toBe(0.5);
    expect(p.lab?.seo).toBeNull();
  });
  test("metrics vide : traité comme absence de données terrain", () => {
    const p = parsePsi({ loadingExperience: { metrics: {} }, lighthouseResult: { categories: {} } }, "MOBILE");
    expect(p.field).toBeUndefined();
  });
});
```

- [ ] **Step 3 : Vérifier l'échec**

Run: `bun test skills/audit/scripts/tests/psi.test.ts`
Expected: FAIL, module introuvable.

- [ ] **Step 4 : Implémenter**

Créer `plugin/skills/audit/scripts/lib/psi.ts` :

```ts
import type { PsiFacts } from "./types";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export function parsePsi(json: unknown, strategy: "MOBILE" | "DESKTOP"): PsiFacts {
  const j = (json ?? {}) as Record<string, any>;
  if (j.error) return { ok: false, strategy, error: `${j.error.code ?? "?"} ${j.error.message ?? ""}`.trim() };
  const le = j.loadingExperience as Record<string, any> | undefined;
  const metricsRaw = (le?.metrics ?? {}) as Record<string, any>;
  const metrics: Record<string, { percentile: number; category: string }> = {};
  for (const [k, v] of Object.entries(metricsRaw)) if (v && typeof v.percentile === "number") metrics[k] = { percentile: v.percentile, category: String(v.category ?? "") };
  const field = Object.keys(metrics).length ? { originFallback: Boolean(le?.origin_fallback), overall: (le?.overall_category as string | undefined) ?? null, metrics } : undefined;
  const cats = (j.lighthouseResult?.categories ?? {}) as Record<string, any>;
  const score = (c: string) => (typeof cats[c]?.score === "number" ? cats[c].score : null);
  const lab = j.lighthouseResult ? { performance: score("performance"), seo: score("seo") } : undefined;
  return { ok: true, strategy, field, lab };
}

/** Un seul appel par audit. Le quota avec clé n'est pas documenté : on journalise le code HTTP et on n'insiste jamais. */
export async function fetchPsi(url: string, key: string, strategy: "MOBILE" | "DESKTOP"): Promise<PsiFacts> {
  const q = new URLSearchParams({ url, strategy, key });
  q.append("category", "PERFORMANCE");
  q.append("category", "SEO");
  try {
    const res = await fetch(`${ENDPOINT}?${q}`, { signal: AbortSignal.timeout(90000) });
    const json = await res.json().catch(() => ({}));
    const parsed = parsePsi(json, strategy);
    if (!res.ok && parsed.ok) return { ok: false, strategy, error: `HTTP ${res.status}` };
    return parsed;
  } catch (e) {
    return { ok: false, strategy, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}
```

- [ ] **Step 5 : Vérifier le succès**

Run: `bun test skills/audit/scripts/tests/psi.test.ts`
Expected: 4 pass.

- [ ] **Step 6 : Sonde réseau manuelle, non normative**

Si une clé est disponible : `PSI_API_KEY=... bun -e 'import {fetchPsi} from "./skills/audit/scripts/lib/psi"; console.log(JSON.stringify(await fetchPsi("https://www.lemonde.fr/", process.env.PSI_API_KEY!, "MOBILE"), null, 1))'`. Attendu : `ok: true`, `field.metrics` avec les trois clés. Sans clé, passer : l'absence de clé est le cas nominal jusqu'à ce que Romain en crée une (procédure dans `references/checks/performance.md`).

- [ ] **Step 7 : Commit**

```bash
git add skills/audit/scripts/lib/psi.ts skills/audit/scripts/tests/psi.test.ts skills/audit/scripts/tests/fixtures/psi
git commit -m "feat(audit): lecture PageSpeed Insights, terrain CrUX et labo, erreurs conservées"
```

---

### Task 7 : `collect.ts`, la collecte de bout en bout

**Files:**
- Create: `plugin/skills/audit/scripts/collect.ts`
- Create: `plugin/skills/audit/scripts/tests/fixtures/site.ts`
- Test: `plugin/skills/audit/scripts/tests/collect.test.ts`

**Interfaces:**
- Consumes : tout ce qui précède.
- Produces : `runCollect(o: CollectOptions): Promise<Manifest>` avec `CollectOptions = { url: string; out: string; maxPages?: number; pages?: string[]; level?: 0 | 2; psiKey?: string | null; delayMs?: number }` ; CLI `bun collect.ts <url> --out <dossier> [--max-pages 10] [--page <url>]... [--level 0|2]`.
- Le site de test `startFixtureSite(port?: number)` sert aussi à la recette AC-3 (tâche 11).

Conventions externes : sondes validées en direct (brief, section 5) : apex vers www en 301, 200 sur une URL inexistante chez lemonde.fr (qui s'est révélé être une page de challenge anti-bot, d'où la sauvegarde de `raw/probe-notfound.html`), 403 anti-bot sur leboncoin.fr, `last-modified` présent ou absent selon l'hôte.

- [ ] **Step 1 : Site de test**

Créer `plugin/skills/audit/scripts/tests/fixtures/site.ts` :

```ts
/** Site jouet pour les tests d'intégration et la recette AC-3. `bun tests/fixtures/site.ts` le sert sur le port 8787. */
const page = (title: string, extraHead: string, body: string) =>
  `<!DOCTYPE html><html lang="fr"><head><title>${title}</title><meta name="description" content="${title} - description">${extraHead}</head><body><h1>${title}</h1><p>${"Contenu réel visible sans JavaScript. ".repeat(20)}</p></body></html>`;

export function startFixtureSite(port = 0) {
  const server = Bun.serve({
    port,
    fetch(req) {
      const u = new URL(req.url);
      const origin = `${u.protocol}//${u.host}`;
      switch (u.pathname) {
        case "/robots.txt":
          return new Response(`User-agent: Claude-User\nDisallow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
        case "/sitemap.xml":
          return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${origin}/sitemap-pages.xml</loc></sitemap></sitemapindex>`, { headers: { "content-type": "application/xml" } });
        case "/sitemap-pages.xml":
          return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/a</loc></url><url><loc>${origin}/b</loc></url><url><loc>${origin}/c</loc></url></urlset>`, { headers: { "content-type": "application/xml" } });
        case "/llms.txt":
          return new Response("# Site jouet\n", { headers: { "content-type": "text/plain" } });
        case "/":
          return new Response(page("Accueil", `<link rel="canonical" href="${origin}/"><meta name="generator" content="Jouet 1.0"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Jouet","sameAs":["https://www.linkedin.com/company/jouet"]}</script>`, ""), { headers: { "content-type": "text/html", server: "jouet" } });
        case "/a":
          return new Response(page("Page A", `<meta name="robots" content="max-snippet:0">`, ""), { headers: { "content-type": "text/html" } });
        case "/b":
          return new Response(page("Page B", `<link rel="canonical" href="${origin}/b"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","datePublished":"2026-06-01","dateModified":"2026-06-12"}</script>`, ""), { headers: { "content-type": "text/html", "last-modified": "Fri, 12 Jun 2026 07:00:00 GMT" } });
        case "/c":
          return new Response(page("Page C", `<meta name="robots" content="noindex">`, ""), { headers: { "content-type": "text/html" } });
        default:
          // soft 404 volontaire : une page « introuvable » servie en 200
          return new Response(page("Page introuvable", "", ""), { status: 200, headers: { "content-type": "text/html" } });
      }
    },
  });
  return server;
}

if (import.meta.main) {
  const s = startFixtureSite(8787);
  console.log(`site jouet : http://localhost:${s.port}`);
}
```

- [ ] **Step 2 : Écrire le test d'intégration qui échoue**

Créer `plugin/skills/audit/scripts/tests/collect.test.ts` :

```ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFixtureSite } from "./fixtures/site";
import { runCollect } from "../collect";
import type { Manifest, PageFacts, RobotsEval } from "../lib/types";

let server: ReturnType<typeof startFixtureSite>;
let base = "";
let out = "";
let manifest: Manifest;

beforeAll(async () => {
  server = startFixtureSite(0);
  base = `http://localhost:${server.port}`;
  out = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
  manifest = await runCollect({ url: base, out, maxPages: 5, delayMs: 0, psiKey: null });
});
afterAll(() => server.stop(true));

const exists = (p: string) => Bun.file(join(out, p)).exists();

describe("runCollect", () => {
  test("écrit raw/ et derived/", async () => {
    for (const p of ["raw/manifest.json", "raw/robots.txt", "raw/sitemap-0.xml", "raw/sitemap-1.xml", "raw/llms.txt", "raw/pages/index.html", "raw/pages/index.headers.json", "raw/pages/a.html", "raw/probe-notfound.html", "derived/robots-eval.json", "derived/pages.json", "derived/psi.json"]) {
      expect(await exists(p), p).toBe(true);
    }
  });
  test("manifeste : pages, sondes, stack", () => {
    expect(manifest.site).toBe(base);
    expect(manifest.level).toBe(0);
    expect(manifest.robots.status).toBe(200);
    expect(manifest.sitemaps.map((s) => s.status)).toEqual([200, 200]);
    expect(manifest.pages.map((p) => p.final)).toEqual([`${base}/`, `${base}/a`, `${base}/b`, `${base}/c`]);
    expect(manifest.probes.notFound.status).toBe(200);
    expect(manifest.probes.hostVariant.requested).toMatch(/^http:\/\/www\.localhost:/);
    expect(manifest.stack.generator).toBe("Jouet 1.0");
    expect(manifest.stack.server).toBe("jouet");
    expect(manifest.psi.attempted).toBe(false);
  });
  test("verdicts robots sur les pages collectées", async () => {
    const e = (await Bun.file(join(out, "derived/robots-eval.json")).json()) as RobotsEval;
    expect(e.semantics).toBe("rules");
    expect(e.bots["Claude-User"].root).toBe(false);
    expect(e.bots["Claude-User"].pages[`${base}/a`]).toBe(false);
    expect(e.bots["Googlebot"].root).toBe(true);
    expect(e.sitemaps).toEqual([`${base}/sitemap.xml`]);
  });
  test("faits par page", async () => {
    const pages = (await Bun.file(join(out, "derived/pages.json")).json()) as PageFacts[];
    const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
    expect(bySlug["index"].jsonld[0].types).toEqual(["Organization"]);
    expect(bySlug["a"].robotsMeta).toBe("max-snippet:0");
    expect(bySlug["b"].dateModified).toBe("2026-06-12");
    expect(bySlug["b"].lastModified).toBe("Fri, 12 Jun 2026 07:00:00 GMT");
    expect(bySlug["c"].robotsMeta).toBe("noindex");
    expect(bySlug["index"].textChars).toBeGreaterThan(500);
  });
  test("sans clé PSI : psi.json explique l'absence", async () => {
    const psi = await Bun.file(join(out, "derived/psi.json")).json();
    expect(psi.ok).toBe(false);
    expect(psi.error).toContain("PSI_API_KEY");
  });
  test("--page ajoute une URL explicite en tête de liste après la home", async () => {
    const out2 = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const m = await runCollect({ url: base, out: out2, maxPages: 2, pages: [`${base}/c`], delayMs: 0, psiKey: null });
    expect(m.pages.map((p) => p.final)).toEqual([`${base}/`, `${base}/c`]);
  });
});
```

- [ ] **Step 3 : Vérifier l'échec**

Run: `bun test skills/audit/scripts/tests/collect.test.ts`
Expected: FAIL, module `../collect` introuvable.

- [ ] **Step 4 : Implémenter**

Créer `plugin/skills/audit/scripts/collect.ts` :

```ts
#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fetchChain, text } from "./lib/fetch";
import { evaluateRobots } from "./lib/robots";
import { collectSitemapUrls, sitemapCandidates } from "./lib/sitemap";
import { extractPageFacts, slugFor } from "./lib/page";
import { fetchPsi } from "./lib/psi";
import { ALL_BOTS, USER_AGENT, type FetchRecord, type FetchResult, type Manifest, type PageFacts } from "./lib/types";

export type CollectOptions = {
  url: string;
  out: string;
  maxPages?: number;
  pages?: string[];
  level?: 0 | 2;
  psiKey?: string | null;
  delayMs?: number;
};

function toRecord(r: FetchResult, file?: string): FetchRecord {
  return { requested: r.requested, final: r.final, status: r.status, chain: r.chain, contentType: r.headers["content-type"], bytes: r.body.length, fetchedAt: new Date().toISOString(), error: r.error, file, ms: r.ms };
}

export async function runCollect(o: CollectOptions): Promise<Manifest> {
  const site = new URL(o.url);
  const origin = site.origin;
  const maxPages = o.maxPages ?? 10;
  const delay = o.delayMs ?? 250;
  const raw = join(o.out, "raw");
  const derived = join(o.out, "derived");
  await mkdir(join(raw, "pages"), { recursive: true });
  await mkdir(derived, { recursive: true });
  const startedAt = new Date().toISOString();
  const save = async (name: string, data: string | Uint8Array) => { await Bun.write(join(raw, name), data); return name; };

  // 1. robots.txt
  const robotsRes = await fetchChain(`${origin}/robots.txt`);
  const robotsTxt = robotsRes.status === 200 ? text(robotsRes) : null;
  const robots = toRecord(robotsRes, robotsTxt !== null ? await save("robots.txt", robotsTxt) : undefined);
  const declared = robotsTxt ? [...robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];

  // 2. sitemaps
  const sm = await collectSitemapUrls(sitemapCandidates(declared, origin), (u) => fetchChain(u), { maxUrls: Math.max(0, maxPages - 1), origin });
  const sitemaps: FetchRecord[] = [];
  let n = 0;
  for (const f of sm.fetched) sitemaps.push(toRecord(f.result, f.result.status === 200 ? await save(`sitemap-${n++}.xml`, f.text) : undefined));

  // 3. llms.txt
  const llmsRes = await fetchChain(`${origin}/llms.txt`);
  const llms = toRecord(llmsRes, llmsRes.status === 200 ? await save("llms.txt", text(llmsRes)) : undefined);

  // 4. pages : home, puis les --page, puis le sitemap ; même origine, sans doublon
  const wanted: string[] = [];
  for (const u of [`${origin}/`, ...(o.pages ?? []), ...sm.urls]) {
    try { const abs = new URL(u, origin).toString(); if (new URL(abs).origin === origin && !wanted.includes(abs)) wanted.push(abs); } catch { /* URL invalide ignorée */ }
  }
  const pages: FetchRecord[] = [];
  const facts: PageFacts[] = [];
  let homeHeaders: Record<string, string> = {};
  for (const u of wanted.slice(0, maxPages)) {
    const r = await fetchChain(u);
    const slug = slugFor(u);
    let file: string | undefined;
    if (r.status > 0) {
      const html = text(r);
      file = await save(`pages/${slug}.html`, html);
      await save(`pages/${slug}.headers.json`, JSON.stringify({ status: r.status, final: r.final, headers: r.headers }, null, 2));
      facts.push(extractPageFacts(html, r.final, r.status, r.headers, slug));
      if (u === `${origin}/`) homeHeaders = r.headers;
    }
    pages.push(toRecord(r, file));
    if (delay > 0) await Bun.sleep(delay);
  }
  await Bun.write(join(derived, "pages.json"), JSON.stringify(facts, null, 2));

  // 5. verdicts robots sur les URL finales des pages
  const robotsEval = evaluateRobots(`${origin}/robots.txt`, robotsRes.status, robotsTxt, ALL_BOTS, facts.map((f) => f.url));
  await Bun.write(join(derived, "robots-eval.json"), JSON.stringify(robotsEval, null, 2));

  // 6. sondes : http vers https, autre hôte (www ou apex), URL inexistante
  const httpUrl = site.protocol === "https:" ? `http://${site.host}/` : `${origin}/`;
  const altHost = site.hostname.startsWith("www.") ? site.hostname.slice(4) : `www.${site.hostname}`;
  const altPort = site.port ? `:${site.port}` : "";
  const notFoundRes = await fetchChain(`${origin}/erom-seo-probe-${crypto.randomUUID().slice(0, 8)}`);
  const probes = {
    httpToHttps: toRecord(await fetchChain(httpUrl)),
    hostVariant: toRecord(await fetchChain(`${site.protocol}//${altHost}${altPort}/`)),
    // le corps est gardé : un 200 peut être un vrai soft 404 ou une page de challenge anti-bot, seul le contenu le dit
    notFound: toRecord(notFoundRes, notFoundRes.status === 200 ? await save("probe-notfound.html", text(notFoundRes)) : undefined),
  };

  // 7. PageSpeed, un seul appel, mobile
  let psi: Manifest["psi"] = { attempted: false, ok: false, error: "PSI_API_KEY absent : PERF-01 non exécutable" };
  if (o.psiKey) {
    const p = await fetchPsi(`${origin}/`, o.psiKey, "MOBILE");
    await Bun.write(join(derived, "psi.json"), JSON.stringify(p, null, 2));
    psi = { attempted: true, ok: p.ok, error: p.error };
  } else {
    await Bun.write(join(derived, "psi.json"), JSON.stringify({ ok: false, strategy: "MOBILE", error: psi.error }, null, 2));
  }

  // 8. manifeste
  const home = facts.find((f) => f.slug === "index");
  const manifest: Manifest = {
    site: origin,
    startedAt,
    finishedAt: new Date().toISOString(),
    level: o.level ?? 0,
    userAgent: USER_AGENT,
    maxPages,
    robots,
    sitemaps,
    llms,
    pages,
    probes,
    stack: { generator: home?.generator ?? null, server: homeHeaders["server"] ?? null, poweredBy: homeHeaders["x-powered-by"] ?? null },
    psi,
  };
  await Bun.write(join(raw, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const url = args[0];
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const pages = args.flatMap((a, i) => (a === "--page" && args[i + 1] ? [args[i + 1]] : []));
  const out = opt("--out");
  if (!url || url.startsWith("--") || !out) {
    console.error("usage : bun collect.ts <url> --out <dossier> [--max-pages 10] [--page <url>]... [--level 0|2]");
    process.exit(2);
  }
  const m = await runCollect({ url, out, maxPages: Number(opt("--max-pages") ?? 10), pages, level: Number(opt("--level") ?? 0) === 2 ? 2 : 0, psiKey: process.env.PSI_API_KEY ?? null });
  console.log(`collecte terminée : ${m.pages.length} pages, robots.txt ${m.robots.status}, ${m.sitemaps.filter((s) => s.status === 200).length} sitemap(s), llms.txt ${m.llms.status}, PageSpeed ${m.psi.ok ? "ok" : m.psi.error}`);
  console.log(`dossier : ${out}`);
}
```

- [ ] **Step 5 : Vérifier le succès**

Run: `bun test skills/audit/scripts/tests/collect.test.ts`
Expected: 6 pass. Si `hostVariant` sur `www.localhost` fait échouer par lenteur de résolution DNS, ce n'est pas un bug : la sonde renvoie status 0 avec `error`, ce que le test ne contraint pas.

- [ ] **Step 6 : Sonde réelle, non normative**

Depuis `plugin/` : `bun skills/audit/scripts/collect.ts https://www.lemonde.fr --out /tmp/erom-seo-lemonde --max-pages 4`. Attendu sur la sortie standard : `4 pages, robots.txt 200`, et dans `/tmp/erom-seo-lemonde/derived/robots-eval.json`, `bots["Claude-User"].root === false`. Sauver ce constat dans la recette (tâche 11).

- [ ] **Step 7 : Commit**

```bash
git add skills/audit/scripts/collect.ts skills/audit/scripts/tests/collect.test.ts skills/audit/scripts/tests/fixtures/site.ts
git commit -m "feat(audit): collecte de bout en bout, raw/ et derived/, sondes, site jouet"
```

---

### Task 8 : Les vérifications, `references/checks/*.md`

**Files:**
- Create: `plugin/skills/audit/scripts/lib/checks.ts`
- Create: `plugin/skills/audit/references/checks/robots.md`, `snippets.md`, `indexability.md`, `structured-data.md`, `tags.md`, `freshness.md`, `rendering.md`, `performance.md`, `ai-presence.md`
- Test: `plugin/skills/audit/scripts/tests/checks-format.test.ts`

**Interfaces:**
- Produces : `parseChecks(md: string): Check[]` avec `Check = { id: string; title: string; couche: string; niveau: number; severite: string; verifie: string; comment: string; sources: { url: string; quote: string; manual: boolean }[]; etudes: string[]; correctif: string; effort: string }` et `OFFICIAL_DOMAINS: string[]`.
- Format d'un bloc, figé ici et lu par `parseChecks`, `check-sources.ts` (tâche 9) et Claude (`SKILL.md`, tâche 10) :

```
### ID-NN : titre
Couche     : absolue | stratégique
Niveau     : 0 | 1 | 2
Sévérité   : Critique | Important | Mineur | Info
Vérifie    : une phrase
Comment    : où regarder dans derived/ ou raw/, et la règle de décision
Source     : <URL> « citation verbatim »          (répétable ; suffixe [manuel] si la page est une SPA invérifiable par script)
Étude      : <URL> texte libre                      (optionnel, jamais une source officielle, affiché comme étude)
Correctif  : ce qu'on propose
Effort     : rapide | moyen | lourd
```

Toutes les citations viennent du brief (sections 3 et 8). Ne pas en reformuler une seule : `check-sources.ts` les compare mot pour mot à la page.

- [ ] **Step 1 : Écrire le test de format qui échoue**

Créer `plugin/skills/audit/scripts/tests/checks-format.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { readdir } from "node:fs/promises";
import { parseChecks, OFFICIAL_DOMAINS } from "../lib/checks";

const dir = `${import.meta.dir}/../../references/checks`;
const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
const all = [];
for (const f of files) all.push(...parseChecks(await Bun.file(`${dir}/${f}`).text()).map((c) => ({ ...c, file: f })));

describe("format des vérifications", () => {
  test("au moins une vérification par fichier", () => {
    for (const f of files) expect(all.some((c) => c.file === f), f).toBe(true);
  });
  test("identifiants uniques et bien formés", () => {
    const ids = all.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Z]+-\d{2}$/);
  });
  test("chaque vérification a tous ses champs et des valeurs admises", () => {
    for (const c of all) {
      expect(["absolue", "stratégique"], c.id).toContain(c.couche);
      expect([0, 1, 2], c.id).toContain(c.niveau);
      expect(["Critique", "Important", "Mineur", "Info"], c.id).toContain(c.severite);
      expect(["rapide", "moyen", "lourd"], c.id).toContain(c.effort);
      for (const k of ["verifie", "comment", "correctif"] as const) expect(c[k].length, `${c.id} ${k}`).toBeGreaterThan(10);
    }
  });
  test("règle D5 : au moins une source officielle avec citation, domaine admis", () => {
    for (const c of all) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      for (const s of c.sources) {
        const host = new URL(s.url).hostname;
        expect(OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)), `${c.id} ${s.url}`).toBe(true);
        expect(s.quote.length, `${c.id} citation`).toBeGreaterThan(15);
      }
    }
  });
  test("aucun em dash dans les références", async () => {
    for (const f of files) expect(await Bun.file(`${dir}/${f}`).text(), f).not.toContain("—");
  });
});
```

- [ ] **Step 2 : Implémenter le parseur**

Créer `plugin/skills/audit/scripts/lib/checks.ts` :

```ts
export type CheckSource = { url: string; quote: string; manual: boolean };
export type Check = {
  id: string; title: string; couche: string; niveau: number; severite: string;
  verifie: string; comment: string; sources: CheckSource[]; etudes: string[]; correctif: string; effort: string;
};

export const OFFICIAL_DOMAINS = [
  "developers.google.com", "support.google.com", "web.dev",
  "developers.openai.com", "support.claude.com", "docs.perplexity.ai", "support.apple.com",
  "blogs.bing.com", "bing.com", "indexnow.org", "sitemaps.org", "rfc-editor.org", "schema.org", "w3.org",
];

const FIELD = /^([A-Za-zÉé]+)\s*:\s*(.*)$/;

/** Lit un fichier de références et rend une entrée par bloc `### ID : titre`. Les lignes de continuation (indentées) prolongent le champ courant. */
export function parseChecks(md: string): Check[] {
  const out: Check[] = [];
  let cur: (Partial<Check> & { sources: CheckSource[]; etudes: string[] }) | null = null;
  let field: string | null = null;
  const flush = () => { if (cur?.id) out.push({ couche: "", niveau: NaN, severite: "", verifie: "", comment: "", correctif: "", effort: "", title: "", ...cur } as Check); cur = null; field = null; };
  for (const raw of md.split("\n")) {
    const h = raw.match(/^###\s+([A-Z]+-\d{2})\s*:\s*(.+)$/);
    if (h) { flush(); cur = { id: h[1], title: h[2].trim(), sources: [], etudes: [] }; continue; }
    if (!cur) continue;
    if (/^\s+\S/.test(raw) && field) { // continuation
      const v = raw.trim();
      if (field === "source") { const last = cur.sources[cur.sources.length - 1]; if (last) last.quote = `${last.quote} ${v}`.trim(); }
      else if (field === "etude") cur.etudes[cur.etudes.length - 1] += ` ${v}`;
      else (cur as any)[field] = `${(cur as any)[field]} ${v}`.trim();
      continue;
    }
    const m = raw.match(FIELD);
    if (!m) { if (raw.trim() === "") field = null; continue; }
    const key = m[1].toLowerCase().replace(/é/g, "e");
    const val = m[2].trim();
    switch (key) {
      case "couche": cur.couche = val; field = "couche"; break;
      case "niveau": cur.niveau = Number(val); field = "niveau"; break;
      case "severite": cur.severite = val; field = "severite"; break;
      case "verifie": cur.verifie = val; field = "verifie"; break;
      case "comment": cur.comment = val; field = "comment"; break;
      case "correctif": cur.correctif = val; field = "correctif"; break;
      case "effort": cur.effort = val; field = "effort"; break;
      case "source": {
        const s = val.match(/^(\S+)\s+«\s*(.*?)\s*»\s*(\[manuel\])?\s*$/);
        cur.sources.push(s ? { url: s[1], quote: s[2], manual: Boolean(s[3]) } : { url: val, quote: "", manual: false });
        field = "source"; break;
      }
      case "etude": cur.etudes.push(val); field = "etude"; break;
      default: field = null;
    }
  }
  flush();
  return out;
}
```

- [ ] **Step 3 : Écrire les neuf fichiers de vérifications**

Créer `plugin/skills/audit/references/checks/robots.md` :

```markdown
# Bots et robots.txt

Contexte pour Claude : chaque moteur sépare un bot d'entraînement d'un ou plusieurs bots de récupération. Bloquer un bot de récupération retire le site des réponses IA de ce moteur. `derived/robots-eval.json` donne, pour chaque bot, `root` (verdict sur `/`) et `pages` (verdict par page collectée) ; `null` = pas de verdict possible. `semantics` dit comment robots.txt a été servi.

### ROBOTS-01 : robots.txt présent et lisible
Couche     : absolue
Niveau     : 0
Sévérité   : Info
Vérifie    : robots.txt répond 200 et se parse ; s'il est absent (4xx), aucune restriction ne s'applique.
Comment    : raw/manifest.json → robots.status ; derived/robots-eval.json → semantics. 200 et parseable : passé. allow-all-4xx : Info « aucun robots.txt, tout est autorisé ». 5xx ou 429 : voir ROBOTS-06.
Source     : https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec « Google's crawlers treat all 4xx errors, except 429, as if a valid robots.txt file didn't exist. This means that Google assumes that there are no crawl restrictions. »
Correctif  : si absent et que le site veut piloter les bots IA, créer /robots.txt avec des groupes explicites par bot (voir ROBOTS-02).
Effort     : rapide

### ROBOTS-02 : bloque un bot de récupération
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucun bot de récupération (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User) n'est interdit sur la racine ni sur une page clé.
Comment    : derived/robots-eval.json → bots[<bot>].root === false, ou bots[<bot>].pages[<page>] === false pour une page collectée. Preuve : le groupe User-agent et la ligne Disallow dans raw/robots.txt (numéros de ligne). Nuance à écrire dans le rapport : ChatGPT-User et Perplexity-User peuvent ignorer robots.txt ; les bloquer n'a pas d'effet garanti mais reste un signal d'intention à corriger.
Source     : https://developers.openai.com/api/docs/bots « Sites that are opted out of OAI-SearchBot will not be shown in ChatGPT search answers, though can still appear as navigational links. »
Source     : https://developers.openai.com/api/docs/bots « a webmaster can allow OAI-SearchBot in order to appear in search results while disallowing GPTBot to indicate that crawled content should not be used for training OpenAI's generative AI foundation models. »
Source     : https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler « Claude-User supports Claude AI users. When individuals ask questions to Claude, it may access websites using a Claude-User agent. »
Source     : https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler « Claude-SearchBot navigates the web to improve search result quality for users. »
Source     : https://docs.perplexity.ai/docs/resources/perplexity-crawlers « designed to surface and link websites in search results on Perplexity. It is not used to crawl content for AI foundation models. »
Source     : https://developers.openai.com/api/docs/bots « Because these actions are initiated by a user, robots.txt rules may not apply. »
Correctif  : séparer entraînement et récupération. Exemple à adapter :
             User-agent: GPTBot
             Disallow: /
             User-agent: ClaudeBot
             Disallow: /
             User-agent: OAI-SearchBot
             Allow: /
             User-agent: ChatGPT-User
             Allow: /
             User-agent: Claude-User
             Allow: /
             User-agent: Claude-SearchBot
             Allow: /
             User-agent: PerplexityBot
             Allow: /
Effort     : rapide

### ROBOTS-03 : bloque Googlebot ou bingbot
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : Googlebot et bingbot sont autorisés sur la racine et sur les pages clés.
Comment    : derived/robots-eval.json → bots["Googlebot"].root et bots["bingbot"].root, puis pages. Un false = trouvaille. Googlebot alimente Search et donc l'éligibilité aux AI Overviews ; bingbot alimente l'index Bing dont dépend Copilot.
Source     : https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers « Crawling preferences addressed to the Googlebot user agent affect Google Search (including Discover and all Google Search features) »
Source     : https://developers.google.com/search/docs/appearance/ai-features « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
Source     : https://blogs.bing.com/webmaster/april-2022/Announcing-user-agent-change-for-Bing-crawler-bingbot « compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm »
Correctif  : retirer le Disallow visé ou ajouter un groupe Allow explicite pour le bot concerné.
Effort     : rapide

### ROBOTS-04 : Google-Extended bloqué, sans effet sur les AI Overviews
Couche     : absolue
Niveau     : 0
Sévérité   : Info
Vérifie    : si Google-Extended est bloqué, le rapport rappelle que cela ne retire pas des AI Overviews ; si le site croyait s'en exclure ainsi, le vrai levier est SNIP-01, SNIP-02 ou SNIP-03.
Comment    : derived/robots-eval.json → bots["Google-Extended"].root === false. Toujours Info : c'est un choix légitime (refus de l'entraînement Gemini), mais souvent mal compris.
Source     : https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers « Google-Extended is a standalone product token that web publishers can use to manage whether content Google crawls from their sites may be used for training future generations of Gemini models »
Source     : https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers « Google-Extended does not impact a site's inclusion in Google Search nor is it used as a ranking signal in Google Search. »
Correctif  : aucun si le blocage est voulu. Sinon, expliquer la distinction au client.
Effort     : rapide

### ROBOTS-05 : sitemap déclaré dans robots.txt
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : au moins une ligne Sitemap: pointe vers un sitemap qui répond 200.
Comment    : derived/robots-eval.json → sitemaps non vide, et raw/manifest.json → sitemaps[].status contient un 200 pour une URL déclarée.
Source     : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « Sitemap: https://example.com/my_sitemap.xml »
Correctif  : ajouter la ligne Sitemap: <URL absolue> dans robots.txt.
Effort     : rapide

### ROBOTS-06 : robots.txt en erreur serveur
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : robots.txt ne répond ni 5xx ni 429 ni timeout.
Comment    : derived/robots-eval.json → semantics vaut disallow-all-5xx, rate-limited-429 ou unreachable. Preuve : raw/manifest.json → robots.status et robots.error.
Source     : https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec « For the first 12 hours, Google stops crawling the site but keeps trying to fetch the robots.txt file. »
Source     : https://www.rfc-editor.org/rfc/rfc9309.txt « If the robots.txt file is unreachable due to server or network errors, this means the robots.txt file is undefined and the crawler MUST assume complete disallow. »
Correctif  : faire répondre /robots.txt en 200 (même vide) ou en 404, jamais en 5xx.
Effort     : moyen
```

Créer `plugin/skills/audit/references/checks/snippets.md` :

```markdown
# Snippets et éligibilité aux AI Overviews

Contexte pour Claude : une page n'est citée dans les AI Overviews ou l'AI Mode que si elle est indexée et éligible à un extrait. `nosnippet`, `max-snippet:0` et `noindex` sortent donc la page de ces surfaces, parfois sans que personne ne l'ait décidé. `derived/pages.json` donne `robotsMeta` (balise meta) et `xRobotsTag` (header) par page.

### SNIP-01 : nosnippet sur une page clé
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucune page collectée ne porte nosnippet, en meta robots ou en X-Robots-Tag.
Comment    : derived/pages.json → robotsMeta ou xRobotsTag contient « nosnippet » (insensible à la casse). Preuve : la balise dans raw/pages/<slug>.html ou le header dans raw/pages/<slug>.headers.json.
Source     : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag « This applies to all forms of search results (at Google: web search, Google Images, Discover, AI Overviews, AI Mode) and will also prevent the content from being used as a direct input for AI Overviews and AI Mode. »
Source     : https://developers.google.com/search/docs/appearance/ai-features « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
Correctif  : retirer nosnippet de la page, ou le limiter à un fragment avec data-nosnippet si seul un passage doit rester hors extrait.
Effort     : rapide

### SNIP-02 : max-snippet à zéro ou très bas
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucune page ne porte max-snippet:0 ; toute autre valeur de max-snippet est signalée en Important, sans seuil chiffré car la documentation n'en fixe aucun.
Comment    : derived/pages.json → robotsMeta ou xRobotsTag contient « max-snippet: » ; valeur 0 = Critique ; autre valeur = Important, en citant la valeur.
Source     : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag « This applies to all forms of search results (such as Google web search, Google Images, Discover, Assistant, AI Overviews, AI Mode) and will also limit how much of the content may be used as a direct input for AI Overviews and AI Mode. »
Correctif  : retirer la directive, ou remonter la valeur si une limite est réellement voulue.
Effort     : rapide

### SNIP-03 : noindex sur une page clé
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : aucune page collectée depuis le sitemap ni la home ne porte noindex ou none.
Comment    : derived/pages.json → robotsMeta ou xRobotsTag contient « noindex » ou vaut « none ». Une page en noindex présente dans le sitemap est une contradiction à signaler en plus.
Source     : https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag « Do not show this page, media, or resource in search results. »
Source     : https://developers.google.com/search/docs/appearance/ai-features « To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet, fulfilling the Search technical requirements. »
Correctif  : retirer noindex des pages qui doivent être trouvées ; retirer du sitemap celles qui doivent rester hors index.
Effort     : rapide
```

Créer `plugin/skills/audit/references/checks/indexability.md` :

```markdown
# Indexabilité

Contexte pour Claude : `raw/manifest.json` porte les sondes (`probes.httpToHttps`, `probes.hostVariant`, `probes.notFound`) et les sitemaps ; `derived/pages.json` porte `canonical` par page.

### IDX-01 : sitemap présent, valide, avec des URL qui répondent
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : un sitemap répond 200 et se parse (index ou urlset) ; les pages collectées depuis ce sitemap répondent 200.
Comment    : raw/manifest.json → sitemaps[] : au moins un status 200 avec file ; raw/sitemap-*.xml contient <urlset> ou <sitemapindex>. Puis pages[] issues du sitemap : status différent de 200 = trouvaille (citer l'URL et le code).
Source     : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « All formats limit a single sitemap to 50MB (uncompressed) or 50,000 URLs. »
Source     : https://www.sitemaps.org/protocol.html « The file itself must be UTF-8 encoded »
Correctif  : générer un sitemap XML à jour, le servir en 200, le déclarer dans robots.txt (ROBOTS-05), retirer les URL en erreur.
Effort     : moyen

### IDX-02 : canonical présent, absolu et cohérent
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque page collectée porte un rel=canonical absolu, qui pointe vers elle-même ou vers une URL de même origine.
Comment    : derived/pages.json → canonical null = trouvaille ; canonical relatif (ne commence pas par http) = trouvaille ; canonical vers une autre origine = trouvaille à examiner (peut être voulu pour une syndication).
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « Use absolute paths rather than relative paths with the rel="canonical" link element. »
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « We recommend adding this same self-referential rel="canonical" link element to the canonical page itself as well. »
Correctif  : ajouter <link rel="canonical" href="https://…"> absolu sur chaque page, auto-référent par défaut.
Effort     : rapide

### IDX-03 : HTTPS servi et HTTP redirigé
Couche     : absolue
Niveau     : 0
Sévérité   : Critique
Vérifie    : le site répond en HTTPS et http:// redirige en 301 ou 308 vers https://.
Comment    : raw/manifest.json → site commence par https ; probes.httpToHttps.chain : premier saut 301 ou 308 vers une URL https. Un 200 direct en http, ou une absence de redirection, = trouvaille.
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « Google prefers HTTPS pages over equivalent HTTP pages as canonical, except when there are issues or conflicting signals »
Source     : https://web.dev/enable-https/ « Google uses HTTPS as a positive search quality indicator. »
Correctif  : certificat TLS et redirection permanente de tout http:// vers https://.
Effort     : moyen

### IDX-04 : une seule version d'hôte, www ou apex
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : l'autre variante d'hôte (www si le site est en apex, apex si le site est en www) redirige en permanent vers le site ; elle ne sert pas de 200.
Comment    : raw/manifest.json → probes.hostVariant : status 200 sans redirection = deux versions servies, trouvaille ; 301 ou 308 vers l'origine du site = passé ; status 0 ou erreur DNS = Info « variante non résolue ».
Source     : https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls « Use this method when you want to get rid of existing duplicate pages. All permanent redirection methods have the same effect on Google Search »
Source     : https://developers.google.com/search/docs/crawling-indexing/canonicalization « a canonical URL is the URL of a page that Google chose as the most representative from a set of duplicate pages. »
Correctif  : rediriger en 301 la variante non retenue vers la version canonique, sur toutes les URL.
Effort     : rapide

### IDX-05 : soft 404
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : une URL inexistante répond 404 ou 410, pas 200.
Comment    : raw/manifest.json → probes.notFound.status === 200 : ouvrir raw/probe-notfound.html ; si son title est une page de challenge (Client Challenge, Just a moment, Access denied), Info « protection anti-bot » ; sinon trouvaille. 403 ou 429 = Info « protection anti-bot, à vérifier depuis un navigateur » ; 404 ou 410 = passé.
Source     : https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors « A soft 404 error is when a URL that returns a page telling the user that the page does not exist and also a 200 (success) status code. »
Source     : https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors « Such pages are excluded from Search. »
Correctif  : renvoyer un vrai code 404 (ou 410) sur les pages introuvables.
Effort     : moyen
```

Créer `plugin/skills/audit/references/checks/structured-data.md` :

```markdown
# Données structurées

Contexte pour Claude : `derived/pages.json` → `jsonld[]` par page, avec `valid`, `hasContext`, `types`. Aucune API publique ne valide les rich results : le rapport renvoie vers https://search.google.com/test/rich-results pour la validation manuelle.

### SD-01 : JSON-LD présent et parsable
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque page collectée porte au moins un bloc JSON-LD valide, avec @context et @type.
Comment    : derived/pages.json → jsonld vide = trouvaille ; un bloc valid false = trouvaille (citer le slug) ; hasContext false = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data « In general, Google recommends using JSON-LD for structured data if your site's setup allows it, as it's the easiest solution for website owners to implement and maintain at scale (in other words, less prone to user errors). »
Correctif  : ajouter un bloc <script type="application/ld+json"> valide par page, tester sur le Rich Results Test.
Effort     : moyen

### SD-02 : Organization avec sameAs sur la home
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : la home porte un type Organization (ou un sous-type : LocalBusiness, NewsMediaOrganization, Corporation…) et une propriété sameAs non vide.
Comment    : derived/pages.json → page slug index → jsonld[].types contient Organization ou un type finissant par Organization ou Business ; puis raw/pages/index.html → chercher "sameAs" dans le bloc. Absence du type = trouvaille ; type présent sans sameAs = trouvaille Mineur.
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »
Correctif  : Organization avec name, url, logo et sameAs vers LinkedIn, annuaires et plateformes d'avis ; Wikidata si l'entité y existe.
Effort     : rapide

### SD-03 : type de page adapté au contenu
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : les pages de contenu (articles, fiches, FAQ) portent un type adapté (Article, BlogPosting, Product, FAQPage…), pas seulement WebPage ou rien.
Comment    : derived/pages.json → pour chaque page hors home : jsonld[].types ne contient aucun type de contenu = trouvaille. Juger le type attendu d'après le title et le h1.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Specify dates with structured data. We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif  : ajouter le type adapté avec ses propriétés requises, selon la doc Google du type.
Effort     : moyen
```

Créer `plugin/skills/audit/references/checks/tags.md` :

```markdown
# Balises de page

Contexte pour Claude : `derived/pages.json` → `title`, `description`, `h1`, `lang` par page.

### TAG-01 : title présent et distinct par page
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque page a un <title> non vide, et deux pages n'ont pas le même title.
Comment    : derived/pages.json → title null ou vide = trouvaille ; titles identiques sur deux slugs = trouvaille (citer les slugs).
Source     : https://developers.google.com/search/docs/appearance/title-link « Make sure every page on your site has a title specified in the <title> element. »
Source     : https://developers.google.com/search/docs/appearance/title-link « It's important to have distinct text that describes the content of the page in the <title> element for each page on your site. »
Correctif  : un title descriptif et unique par page.
Effort     : rapide

### TAG-02 : meta description présente et distincte
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : chaque page a une meta description, et deux pages n'ont pas la même.
Comment    : derived/pages.json → description null = trouvaille ; descriptions identiques = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/snippet « Create unique descriptions for each page on your site »
Source     : https://developers.google.com/search/docs/appearance/snippet « Identical or similar descriptions on every page of a site aren't helpful when individual pages appear in search results. »
Correctif  : une description propre à chaque page.
Effort     : rapide

### TAG-03 : un h1 présent
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : chaque page a au moins un h1 ; plusieurs h1 ne sont pas une faute (aucune doc ne l'exige) mais sont signalés en Info.
Comment    : derived/pages.json → h1 vide = trouvaille Mineur ; h1.length > 1 = Info.
Source     : https://developers.google.com/search/docs/appearance/title-link « Heading elements, such as <h1> elements »
Correctif  : un h1 qui reprend le sujet de la page.
Effort     : rapide

### TAG-04 : langue déclarée
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : l'élément html porte un attribut lang.
Comment    : derived/pages.json → lang null = trouvaille.
Source     : https://www.w3.org/International/questions/qa-html-language-declarations « Always use a language attribute on the html tag to declare the default language of the text in the page. »
Correctif  : <html lang="fr">.
Effort     : rapide
```

Créer `plugin/skills/audit/references/checks/freshness.md` :

```markdown
# Fraîcheur

Contexte pour Claude : `derived/pages.json` → `datePublished`, `dateModified` (JSON-LD), `lastModified` (header HTTP), `visibleDates` (texte et <time>). Ces vérifications portent sur les pages de contenu, pas sur la home ni les pages de service.

### FRESH-01 : date visible et date structurée sur les pages de contenu
Couche     : absolue
Niveau     : 0
Sévérité   : Mineur
Vérifie    : une page de contenu affiche une date étiquetée et porte datePublished ou dateModified en JSON-LD.
Comment    : derived/pages.json → pages dont jsonld[].types contient Article, BlogPosting, NewsArticle ou dont le title suggère un article : visibleDates vide = trouvaille ; datePublished et dateModified tous deux null = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Label your dates appropriately with text like "Publish" or "Last updated". »
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Specify dates with structured data. We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif  : afficher « Publié le » et « Mis à jour le », et renseigner datePublished / dateModified.
Effort     : rapide

### FRESH-02 : dates cohérentes entre visible, JSON-LD et header
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : quand dateModified existe, le même jour apparaît dans visibleDates ; quand Last-Modified existe, il n'est pas antérieur à dateModified.
Comment    : derived/pages.json → comparer le jour (AAAA-MM-JJ) de dateModified avec les visibleDates converties ; écart = trouvaille (citer les trois valeurs). Last-Modified antérieur à dateModified = trouvaille.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « Ensure that the date (and optional time and timezone) match between the equivalent user-visible and structured values. »
Correctif  : une seule source de vérité pour la date de mise à jour, propagée à la fois dans le texte, le JSON-LD et le header.
Effort     : moyen
```

Créer `plugin/skills/audit/references/checks/rendering.md` :

```markdown
# Rendu

Contexte pour Claude : `derived/pages.json` → `textChars` (texte visible hors scripts) et `htmlBytes`. Les bots de récupération IA lisent le HTML brut ; Google recommande le rendu serveur parce que tous les bots n'exécutent pas JavaScript.

### REND-01 : contenu principal présent sans JavaScript
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : le HTML brut de chaque page contient son contenu ; une coquille vide remplie par JavaScript est une trouvaille.
Comment    : derived/pages.json → ignorer les pages challenge === true (protection anti-bot : à signaler en Info « collecte bloquée », jamais en REND-01). Sur les autres : textChars < 200 avec htmlBytes > 5000, ou h1 vide et title générique (« App », « Loading ») = trouvaille. Preuve : raw/pages/<slug>.html.
Source     : https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics « server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and not all bots can run JavaScript. »
Étude      : https://vercel.com/blog/the-rise-of-the-ai-crawler « The results consistently show that none of the major AI crawlers currently render JavaScript. » (Vercel, 17 décembre 2024, étude et non documentation officielle)
Correctif  : rendu serveur ou pré-rendu des pages qui doivent être citées.
Effort     : lourd
```

Créer `plugin/skills/audit/references/checks/performance.md` :

```markdown
# Performance

Contexte pour Claude : `derived/psi.json`. Sans clé PSI_API_KEY, `ok` vaut false et la vérification va dans « Ce que je n'ai pas pu voir » avec la procédure ci-dessous. Clé gratuite : créer un projet sur console.cloud.google.com, activer l'API PageSpeed Insights, créer une clé API, l'exporter dans l'environnement avant de lancer l'audit (`export PSI_API_KEY=...`). Sans clé, l'API répond 429 avec un quota journalier à zéro (échantillon du 2026-08-27).

### PERF-01 : Core Web Vitals sur données de terrain
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : la home passe les seuils CrUX au 75e percentile : LCP 2,5 s, INP 200 ms, CLS 0,1.
Comment    : derived/psi.json → ok false = non vu (expliquer la clé). field absent = Info « pas assez de trafic réel, score labo : lab.performance ». field.overall SLOW = Important ; AVERAGE = Mineur ; FAST = passé. Citer les trois métriques (percentile, category) et field.originFallback.
Source     : https://web.dev/articles/vitals « LCP should occur within 2.5 seconds of when the page first starts loading »
Source     : https://web.dev/articles/vitals « pages should have a INP of 200 milliseconds or less »
Source     : https://web.dev/articles/vitals « pages should maintain a CLS of 0.1. or less »
Source     : https://web.dev/articles/vitals « a good threshold to measure is the 75th percentile of page loads »
Source     : https://developers.google.com/speed/docs/insights/v5/about « PSI will fall back to origin-level granularity »
Correctif  : selon la métrique en cause : images et LCP, scripts tiers et INP, dimensions réservées et CLS.
Effort     : lourd
```

Créer `plugin/skills/audit/references/checks/ai-presence.md` :

```markdown
# Présence IA

Contexte pour Claude : `raw/manifest.json` → `llms.status`. Google écrit qu'il ignore les fichiers IA type llms.txt : leur présence n'est ni une faute ni un mérite, c'est du contexte.

### AI-01 : llms.txt, présent ou absent, sans effet sur Google
Couche     : absolue
Niveau     : 0
Sévérité   : Info
Vérifie    : signaler si /llms.txt existe, et rappeler qu'il n'a d'usage avéré que pour les agents de code et les plateformes de documentation.
Comment    : raw/manifest.json → llms.status === 200 : Info « présent » ; sinon Info « absent ». Jamais une trouvaille.
Source     : https://developers.google.com/search/docs/fundamentals/ai-optimization-guide « Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them. »
Correctif  : aucun. Pour un site à destination des développeurs, un llms.txt reste utile aux outils de code.
Effort     : rapide

### AI-02 : clé IndexNow déposée
Couche     : absolue
Niveau     : 2
Sévérité   : Mineur
Vérifie    : un fichier clé IndexNow est servi à la racine et son contenu correspond à la clé connue du projet.
Comment    : niveau 2 seulement : la clé est lue dans le repo, puis GET https://<hôte>/<clé>.txt doit répondre 200 avec la clé en contenu. Au niveau 0 : non vérifiable, le nom du fichier est la clé elle-même.
Source     : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Correctif  : générer une clé (8 à 128 caractères), la servir en /<clé>.txt, la soumettre à Bing.
Effort     : rapide
```

- [ ] **Step 4 : Vérifier le succès**

Run: `bun test skills/audit/scripts/tests/checks-format.test.ts`
Expected: 5 pass, sur 27 vérifications (6 ROBOTS, 3 SNIP, 5 IDX, 3 SD, 4 TAG, 2 FRESH, 1 REND, 1 PERF, 2 AI). Si `parseChecks` rate un champ, corriger le parseur, pas le format.

- [ ] **Step 5 : Commit**

```bash
git add skills/audit/scripts/lib/checks.ts skills/audit/scripts/tests/checks-format.test.ts skills/audit/references/checks
git commit -m "feat(audit): 27 vérifications de niveau 0 ancrées sur la documentation officielle"
```

---

### Task 9 : `check-sources.ts`, l'anti-folklore

**Files:**
- Create: `plugin/skills/audit/scripts/lib/normalize.ts`
- Create: `plugin/skills/audit/scripts/check-sources.ts`
- Test: `plugin/skills/audit/scripts/tests/normalize.test.ts`

**Interfaces:**
- Consumes : `parseChecks`, `Check` de `lib/checks.ts` ; `fetchChain`, `text` de `lib/fetch.ts`.
- Produces : `normalizePage(html: string): string`, `normalizeQuote(q: string): string` ; CLI `bun check-sources.ts [--only ROBOTS-02]` qui sort 0 si chaque citation est retrouvée, 1 sinon.

Convention externe : logique de normalisation validée initialement par la sonde `docs/recherches/echantillons/sonde-normalize.ts` (23 citations sur 23 retrouvées) ; l'ensemble des 50 citations finales des 9 fichiers de références a été revérifié en réseau via `check-sources.ts` avant livraison (brief, section 9). Piège documenté : une citation peut contenir `<title>` ; la page l'encode `&lt;title&gt;`. On retire les balises de la page puis on décode les entités ; on ne retire jamais de balises dans la citation.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `plugin/skills/audit/scripts/tests/normalize.test.ts` :

```ts
import { describe, test, expect } from "bun:test";
import { normalizePage, normalizeQuote } from "../lib/normalize";

describe("normalizePage / normalizeQuote", () => {
  test("entité encodée dans la page, balise littérale dans la citation", () => {
    const page = "<p>Make sure every page has a title in the &lt;title&gt; element.</p>";
    expect(normalizePage(page)).toContain(normalizeQuote("a title in the <title> element"));
  });
  test("balise <code> au milieu d'une phrase", () => {
    const page = "<p>You can provide multiple <code>sameAs</code> URLs.</p>";
    expect(normalizePage(page)).toContain(normalizeQuote("You can provide multiple sameAs URLs"));
  });
  test("retour à la ligne dans un texte brut (RFC)", () => {
    const page = "the crawler MUST assume complete\n   disallow.";
    expect(normalizePage(page)).toContain(normalizeQuote("the crawler MUST assume complete disallow"));
  });
  test("espace avant la virgule après une balise", () => {
    const page = "treat all 4xx errors, except <code>429</code>, as if";
    expect(normalizePage(page)).toContain(normalizeQuote("except 429, as if"));
  });
  test("apostrophes typographiques et scripts ignorés", () => {
    const page = "<script>var x = 'didn’t';</script><p>file didn’t exist</p>";
    expect(normalizePage(page)).toContain(normalizeQuote("file didn't exist"));
    expect(normalizePage(page)).not.toContain("var x");
  });
});
```

- [ ] **Step 2 : Implémenter la normalisation**

Créer `plugin/skills/audit/scripts/lib/normalize.ts` :

```ts
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

function tidy(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").replace(/\s+([,.;:)\]])/g, "$1").trim();
}

/** Page HTML : scripts et styles retirés, balises retirées, puis entités décodées (le texte visible peut contenir « <title> » encodé). */
export function normalizePage(html: string): string {
  const noTags = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  return tidy(decodeEntities(noTags));
}

/** Citation : jamais de retrait de balises, une citation peut contenir « <title> » littéralement. */
export function normalizeQuote(q: string): string {
  return tidy(decodeEntities(q));
}
```

- [ ] **Step 3 : Vérifier le succès du test unitaire**

Run: `bun test skills/audit/scripts/tests/normalize.test.ts`
Expected: 5 pass.

- [ ] **Step 4 : Le script de contrôle**

Créer `plugin/skills/audit/scripts/check-sources.ts` :

```ts
#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { fetchChain, text } from "./lib/fetch";
import { parseChecks } from "./lib/checks";
import { normalizePage, normalizeQuote } from "./lib/normalize";

const dir = new URL("../references/checks/", import.meta.url).pathname;
const only = Bun.argv.includes("--only") ? Bun.argv[Bun.argv.indexOf("--only") + 1] : null;

const checks = [];
for (const f of (await readdir(dir)).filter((f) => f.endsWith(".md"))) checks.push(...parseChecks(await Bun.file(dir + f).text()));

const pages = new Map<string, { status: number; norm: string }>();
async function page(url: string) {
  if (!pages.has(url)) {
    const r = await fetchChain(url, { timeoutMs: 30000, userAgent: "Mozilla/5.0 (compatible; erom-seo-audit/0.1)" });
    pages.set(url, { status: r.status, norm: r.status === 200 ? normalizePage(text(r)) : "" });
  }
  return pages.get(url)!;
}

let fails = 0, manual = 0, ok = 0;
for (const c of checks) {
  if (only && c.id !== only) continue;
  for (const s of c.sources) {
    if (s.manual) { manual++; console.log(`MANUEL   ${c.id}  ${s.url}`); continue; }
    const p = await page(s.url);
    if (p.status !== 200) { fails++; console.log(`HTTP ${p.status}  ${c.id}  ${s.url}`); continue; }
    if (p.norm.includes(normalizeQuote(s.quote))) { ok++; console.log(`OK       ${c.id}  ${s.quote.slice(0, 70)}`); }
    else { fails++; console.log(`ABSENTE  ${c.id}  ${s.url}\n         « ${s.quote} »`); }
  }
}
console.log(`\n${ok} citations retrouvées, ${fails} en échec, ${manual} à vérifier à la main`);
process.exit(fails ? 1 : 0);
```

- [ ] **Step 5 : Lancer le contrôle réel (réseau, AC-6)**

Run: `bun skills/audit/scripts/check-sources.ts`
Expected: la dernière ligne indique `0 en échec`, code de sortie 0. Une citation ABSENTE se corrige en la recopiant depuis la page (le script affiche l'URL), jamais en l'assouplissant. Une page en HTTP autre que 200 se remplace par son URL finale (les anciennes URL Google redirigent vers `developers.google.com/crawling/...`).

- [ ] **Step 6 : Commit**

```bash
git add skills/audit/scripts/lib/normalize.ts skills/audit/scripts/check-sources.ts skills/audit/scripts/tests/normalize.test.ts
git commit -m "feat(audit): check-sources, chaque citation retrouvée mot pour mot sur sa page officielle"
```

---

### Task 10 : `SKILL.md`, niveaux, gabarit, lint du rapport, README

**Files:**
- Create: `plugin/skills/audit/references/levels.md`
- Create: `plugin/skills/audit/references/report-template.md`
- Create: `plugin/skills/audit/SKILL.md`
- Create: `plugin/skills/audit/scripts/lint-report.ts`
- Modify: `plugin/README.md`

**Interfaces:**
- Consumes : tout ce qui précède.
- Produces : la skill invocable `/erom-seo:audit` ; `bun lint-report.ts <report.md>` sort 0 si chaque trouvaille a ses cinq champs et une source admise (AC-5).

- [ ] **Step 1 : levels.md**

Créer `plugin/skills/audit/references/levels.md` :

```markdown
# Les trois niveaux d'audit

| Niveau | Entrée | Ce qu'on voit | Ce qu'on ne voit pas |
|---|---|---|---|
| 0 | L'URL seule | robots.txt, sitemaps, llms.txt, pages et headers, sondes (http, www, 404), PageSpeed si clé | données réelles de trafic et de citation, indexation effective, conformité à une stratégie |
| 1 | URL + accès Search Console et Bing Webmaster Tools | impressions dans les fonctionnalités IA (rapport Generative AI performance), citations et Citation Share (rapport AI Performance de Bing), état d'indexation, requêtes | conformité à une stratégie |
| 2 | Le code, lancé en local, + seo/strategy.md | tout le niveau 0 sur localhost, plus les vérifications stratégiques et AI-02 | le trafic réel (niveau 1) |

## Vérifications par niveau

Niveau 0 : ROBOTS-01 à ROBOTS-06, SNIP-01 à SNIP-03, IDX-01 à IDX-05, SD-01 à SD-03, TAG-01 à TAG-04, FRESH-01, FRESH-02, REND-01, PERF-01 (avec clé), AI-01.

Niveau 1, à livrer au chantier 5 :
- LVL1-01 impressions dans les AI Overviews et l'AI Mode (Search Console, rapport Generative AI performance)
- LVL1-02 citations et part de citation dans Copilot et Bing (Bing Webmaster Tools, rapport AI Performance)
- LVL1-03 pages indexées contre pages du sitemap (Search Console)
- AI-03 présence dans l'index Bing

Niveau 2, à livrer au chantier 2 :
- STRAT-01 chaque page de strategy.md existe et vise son mot-clé (title, h1, ouverture)
- STRAT-02 la phrase d'identité est sur la home et dans Organization
- STRAT-03 les sameAs prévus sont en place
- STRAT-04 la cadence de fraîcheur est respectée par type de page
- AI-02 clé IndexNow déposée

## Ce que le rapport écrit dans « Ce que je n'ai pas pu voir »

Au niveau 0 : la liste ci-dessus des niveaux 1 et 2, chaque ligne avec son id et son nom, plus PERF-01 si la clé PageSpeed manque.
```

- [ ] **Step 2 : report-template.md**

Créer `plugin/skills/audit/references/report-template.md` :

```markdown
# Audit SEO/GEO : {{site}}
{{date}} · Niveau {{niveau}} ({{entree}}) · {{nb_pages}} pages collectées · {{nb_checks}} vérifications
Stack détecté : {{stack}} (Info)

## En bref
{{n_critique}} Critique · {{n_important}} Important · {{n_mineur}} Mineur · {{n_info}} Info
Les trois choses à dire en RDV :
1. {{phrase_1}}
2. {{phrase_2}}
3. {{phrase_3}}

## Trouvailles

### [{{severite}}] {{id}} : {{titre}}
Preuve    : {{fichier et lignes dans raw/ ou champ dans derived/}}
Pourquoi  : {{une ou deux phrases, en français, pour un client}}
Source    : {{URL}} « {{citation verbatim}} »
Correctif : {{ce qu'on propose, prêt à coller si possible}}
Effort    : {{rapide | moyen | lourd}}

## Ce que je n'ai pas pu voir
Niveau 1, avec les accès : {{liste id + nom}}
Niveau 2, avec le code et la stratégie : {{liste id + nom}}
{{PERF-01 si clé absente, avec la procédure}}

## Vérifications passées
{{id}} {{nom}}
…

## Annexe : collecte
| Ressource | URL | Statut | Octets | Fichier |
|---|---|---|---|---|
{{une ligne par entrée de raw/manifest.json : robots, sitemaps, llms, pages, sondes}}
```

Règles d'écriture, à respecter par Claude :
- Trouvailles par sévérité décroissante ; à sévérité égale, dans l'ordre des fichiers de référence.
- Une trouvaille = un id, jamais deux trouvailles pour le même id ; plusieurs pages concernées se listent dans Preuve.
- Une citation par trouvaille au minimum, copiée depuis la référence, jamais reformulée.
- « Pourquoi » s'adresse au client : pas de jargon sans explication.
- « Les trois choses à dire en RDV » sont des phrases complètes, choisies parmi les Critique puis les Important.
- Pas d'em dash.

- [ ] **Step 3 : SKILL.md**

Créer `plugin/skills/audit/SKILL.md` :

```markdown
---
name: audit
description: Audit SEO et GEO d'un site à partir de son URL (niveau 0) ou de son code lancé en local (niveau 2). Collecte reproductible dans seo/audits/<date>-n<niveau>/, vérifications ancrées sur la documentation officielle des moteurs, rapport Markdown en français. Triggers : '/erom-seo:audit <url>', 'audite le SEO de', 'audit GEO', 'est-ce que ce site est visible dans ChatGPT / les AI Overviews', 'vérifie le robots.txt de'.
argument-hint: "<url> [--max-pages N] [--page <url>]..."
---

# Audit SEO/GEO, niveau 0 et 2

Tu produis un audit défendable : chaque trouvaille cite une preuve dans la collecte et une source officielle. Tu n'inventes jamais une trouvaille sans preuve dans `raw/` ou `derived/`, et tu ne modifies jamais `raw/`.

## 0. Préparer

1. URL de base : l'argument, ou demander. Ajouter `https://` s'il manque.
2. Niveau : 2 si l'URL est `localhost` ou `127.0.0.1` et que `seo/strategy.md` existe ; sinon 0.
3. Dossier : `seo/audits/<YYYY-MM-DD>-n<niveau>/` sous le répertoire courant. S'il existe déjà, suffixe `-2`, `-3`. Ne jamais écraser.
4. Scripts : ils sont dans le dossier `scripts/` à côté de ce fichier (`${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/`). Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
5. Clé PageSpeed : si `PSI_API_KEY` est absente de l'environnement, le dire une fois à l'utilisateur ; l'audit continue sans PERF-01.

## 1. Collecter

```bash
bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/collect.ts <url> --out <dossier> --max-pages 10 [--page <url>]... [--level 0|2]
```

Sortie attendue : `collecte terminée : N pages, robots.txt <code>, ...`. Si la collecte échoue (site injoignable, 403 partout), écrire un `report.md` court qui le dit, avec `raw/manifest.json` en annexe, et s'arrêter : pas de trouvailles inventées.

## 2. Vérifier

Lire dans l'ordre : `raw/manifest.json`, `derived/robots-eval.json`, `derived/pages.json`, `derived/psi.json`. Ouvrir `raw/robots.txt` et `raw/pages/*.html` seulement pour citer une preuve avec ses lignes.

Pages avec `challenge: true` dans `derived/pages.json` : les exclure des vérifications par page, et écrire une ligne Info dans le rapport : « N pages servies derrière une protection anti-bot au user-agent erom-seo-audit ; ce que voit un bot inconnu est probablement ce que voient les bots IA ». Jamais une trouvaille REND-01 sur ces pages.

Puis parcourir chaque fichier de `references/checks/` (robots, snippets, indexability, structured-data, tags, freshness, rendering, performance, ai-presence). Pour chaque bloc `### ID : titre` :
- Niveau du bloc supérieur au niveau exécuté : le noter dans « Ce que je n'ai pas pu voir » avec son id et son titre.
- Sinon, appliquer `Comment` sur les JSON : passé, ou trouvaille avec la sévérité indiquée (SNIP-02 et TAG-03 ont deux sévérités possibles, `Comment` dit laquelle).
- Une trouvaille reprend `Source` telle quelle (URL et citation), `Correctif`, `Effort`, et une `Preuve` précise.

## 3. Rapporter

Écrire `<dossier>/report.md` d'après `references/report-template.md`, en respectant ses règles d'écriture. Le tableau d'annexe se construit depuis `raw/manifest.json`. La liste des vérifications non vues vient de `references/levels.md`.

Contrôle avant de rendre : `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/lint-report.ts <dossier>/report.md` doit sortir 0. Sinon corriger le rapport.

## 4. Restituer

Afficher le chemin du rapport, le compte par sévérité, et « Les trois choses à dire en RDV ». Proposer le niveau suivant : les accès Search Console et Bing (niveau 1) ou le code (niveau 2).
```

- [ ] **Step 4 : lint-report.ts**

Créer `plugin/skills/audit/scripts/lint-report.ts` :

```ts
#!/usr/bin/env bun
import { OFFICIAL_DOMAINS } from "./lib/checks";

const path = Bun.argv[2];
if (!path) { console.error("usage : bun lint-report.ts <report.md>"); process.exit(2); }
const md = await Bun.file(path).text();
const errors: string[] = [];

if (md.includes("—")) errors.push("em dash présent");
for (const h of ["## En bref", "## Trouvailles", "## Ce que je n'ai pas pu voir", "## Vérifications passées", "## Annexe : collecte"]) if (!md.includes(h)) errors.push(`section manquante : ${h}`);

const blocks = md.split(/^### \[/m).slice(1);
for (const b of blocks) {
  const head = b.split("\n")[0];
  const m = head.match(/^(Critique|Important|Mineur|Info)\]\s+([A-Z]+-\d{2})\s*:/);
  if (!m) { errors.push(`en-tête de trouvaille mal formé : ${head}`); continue; }
  const id = m[2];
  for (const f of ["Preuve", "Pourquoi", "Source", "Correctif", "Effort"]) if (!new RegExp(`^${f}\\s*:`, "m").test(b)) errors.push(`${id} : champ ${f} manquant`);
  const src = b.match(/^Source\s*:\s*(\S+)\s+«/m);
  if (!src) errors.push(`${id} : Source sans URL ou sans citation`);
  else {
    const host = new URL(src[1]).hostname;
    if (!OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) errors.push(`${id} : source hors domaines admis : ${src[1]}`);
  }
  if (!/^Effort\s*:\s*(rapide|moyen|lourd)\s*$/m.test(b)) errors.push(`${id} : Effort doit valoir rapide, moyen ou lourd`);
}
const ids = blocks.map((b) => b.split("\n")[0].match(/([A-Z]+-\d{2})/)?.[1]).filter(Boolean);
if (new Set(ids).size !== ids.length) errors.push("un id apparaît deux fois dans les trouvailles");

if (errors.length) { console.log(errors.map((e) => `ERREUR  ${e}`).join("\n")); process.exit(1); }
console.log(`rapport conforme : ${blocks.length} trouvailles`);
```

- [ ] **Step 5 : README**

Remplacer `plugin/README.md` :

```markdown
# erom-seo

Plugin Claude Code de l'agence : audit, stratégie, build et lancement SEO/GEO sans abonnement tiers. Chaque vérification cite la documentation officielle du moteur concerné, avec sa citation mot pour mot.

## Charger le plugin en local

```bash
claude --plugin-dir /chemin/vers/erom-agence-seo/plugin
```

Première fois : `cd plugin && bun install`.

## Auditer un site

Depuis le dossier du client (S1) ou le repo du site (S2) :

```
/erom-seo:audit https://acme.fr
```

Sortie : `seo/audits/<date>-n0/report.md`, avec la collecte brute dans `raw/` et les faits dérivés dans `derived/`.

Clé PageSpeed (gratuite, facultative) : `export PSI_API_KEY=...` avant de lancer Claude. Sans elle, la vérification PERF-01 est reportée.

## Vérifier que les références n'ont pas dérivé

```bash
cd plugin && bun skills/audit/scripts/check-sources.ts
```

Chaque citation des références doit être retrouvée sur sa page officielle. Une citation absente se corrige depuis la page, jamais en l'assouplissant.

## Tests

```bash
cd plugin && bun test
```

## Attribution

La matière de départ de plusieurs références vient du dépôt [marketingskills](https://github.com/coreyhaines31/marketingskills) de Corey Haines, sous licence MIT, Copyright (c) 2025 Corey Haines. Les vérifications de ce plugin en diffèrent : chacune est réécrite et ancrée sur une source officielle, et une erreur connue de l'amont (Google-Extended présenté comme le bot des AI Overviews) y est corrigée.

## Licence

MIT.
```

- [ ] **Step 6 : Chargement et lancement réels**

Depuis la racine du repo, sur un dossier vide :

```bash
mkdir -p clients/_smoke && cd clients/_smoke && claude --plugin-dir ../../plugin
```

Dans la session : `/erom-seo:audit https://www.lemonde.fr --max-pages 4`. Attendu : `seo/audits/<date>-n0/report.md` écrit, `bun ../../plugin/skills/audit/scripts/lint-report.ts seo/audits/<date>-n0/report.md` sort 0, et le rapport contient une trouvaille `ROBOTS-02` citant `Claude-User`. Si `${CLAUDE_PLUGIN_ROOT}` n'est pas résolu dans la session, remplacer dans `SKILL.md` par le chemin relatif au fichier de la skill, décrit à l'étape 0.4, et noter le comportement observé dans la recette.

`clients/_smoke/` n'est pas commité : l'ajouter à `.gitignore` racine (`clients/_smoke/`).

- [ ] **Step 7 : Commit**

```bash
git add skills/audit/SKILL.md skills/audit/references/levels.md skills/audit/references/report-template.md skills/audit/scripts/lint-report.ts README.md ../.gitignore
git commit -m "feat(audit): skill /erom-seo:audit, niveaux, gabarit de rapport, lint, README"
```

---

### Task 11 : Recette, AC-1 à AC-7

**Files:**
- Create: `docs/superpowers/plans/2026-08-27-erom-seo-audit-niveau-0-recette.md`

Chaque critère est coché avec la commande réellement lancée et sa sortie collée. Un critère non couru est écrit tel quel, jamais arrondi.

- [ ] **Step 1 : AC-1, dossier vide, site réel**

```bash
mkdir -p clients/_smoke && cd clients/_smoke && claude --plugin-dir ../../plugin
```
Dans la session : `/erom-seo:audit https://www.lemonde.fr --max-pages 4`. Puis :
```bash
ls -R seo/audits/ && test -f seo/audits/*-n0/raw/manifest.json && test -f seo/audits/*-n0/raw/pages/index.html && echo AC-1 OK
```

- [ ] **Step 2 : AC-2, site réel qui bloque un bot de récupération**

Sur le rapport lemonde.fr :
```bash
grep -A6 "ROBOTS-02" seo/audits/*-n0/report.md
```
Attendu : sévérité Critique, Preuve citant `raw/robots.txt` avec des lignes, Source sur `support.claude.com`, et `Claude-User` ou `Claude-SearchBot` nommé. Si lemonde.fr a changé son robots.txt entre-temps, utiliser `https://www.nytimes.com` (bloque tous les bots de récupération au 2026-08-27).

- [ ] **Step 3 : AC-3, page de test portant max-snippet:0**

Deux terminaux. Terminal 1 : `cd plugin && bun skills/audit/scripts/tests/fixtures/site.ts` (sert `http://localhost:8787`, la page `/a` porte `max-snippet:0`, la page `/c` porte `noindex`). Terminal 2 : `mkdir -p clients/_smoke_local && cd clients/_smoke_local && claude --plugin-dir ../../plugin`, puis `/erom-seo:audit http://localhost:8787`. Ensuite :
```bash
grep -A6 "SNIP-0" seo/audits/*-n0/report.md
```
Attendu : `SNIP-02` Critique citant `/a`, `SNIP-03` Critique citant `/c`, Source sur `developers.google.com/search/docs/crawling-indexing/robots-meta-tag`. Ce site est servi par Romain sur sa machine : c'est la « page de test à Romain » de la spec.

- [ ] **Step 4 : AC-4, « Ce que je n'ai pas pu voir »**

```bash
sed -n '/## Ce que je n.ai pas pu voir/,/## Vérifications passées/p' seo/audits/*-n0/report.md
```
Attendu : LVL1-01, LVL1-02, LVL1-03, AI-03, STRAT-01 à STRAT-04, AI-02 nommés avec leur titre ; PERF-01 si la clé manque. Comparer à `references/levels.md`.

- [ ] **Step 5 : AC-5, cinq champs et source admise**

```bash
bun ../../plugin/skills/audit/scripts/lint-report.ts seo/audits/*-n0/report.md
```
Attendu : `rapport conforme : N trouvailles`, code 0. À lancer sur les deux rapports (lemonde et local).

- [ ] **Step 6 : AC-6, citations retrouvées**

```bash
cd plugin && bun skills/audit/scripts/check-sources.ts; echo "code $?"
```
Attendu : `0 en échec`, `code 0`.

- [ ] **Step 7 : AC-7, relance sans écrasement**

Relancer `/erom-seo:audit https://www.lemonde.fr --max-pages 4` dans `clients/_smoke` le lendemain, ou le même jour (suffixe `-2` attendu) :
```bash
ls seo/audits/ && diff -r seo/audits/<premier> seo/audits/<premier> && echo "ancien intact"
```
Attendu : deux dossiers, l'ancien inchangé (comparer son `raw/manifest.json` à une copie prise avant la relance).

- [ ] **Step 8 : Suite complète et écriture de la recette**

```bash
cd plugin && bun test
```
Attendu : tous les tests passent. Écrire `docs/superpowers/plans/2026-08-27-erom-seo-audit-niveau-0-recette.md` avec, pour chaque AC, la commande, la sortie collée, et OK ou NON. Y noter aussi les constats des sondes réelles (tâche 6 étape 6, tâche 7 étape 6) et tout écart de comportement (résolution de `${CLAUDE_PLUGIN_ROOT}`, lenteur DNS sur `www.localhost`).

- [ ] **Step 9 : Commit et fin de branche**

```bash
git add docs/superpowers/plans/2026-08-27-erom-seo-audit-niveau-0-recette.md
git commit -m "docs(audit): recette AC-1 à AC-7 du chantier 1"
```

Puis suivre la skill `superpowers:finishing-a-development-branch` pour la revue finale et la fusion dans `main`.

---

## Auto-revue du plan

**Couverture de la spec** : D1 à D8 respectées ; section 4 (pipeline, format de vérification, familles, erreurs) couverte par les tâches 7, 8, 10 ; section 5 (rapport) par la tâche 10 ; AC-1 à AC-7 par la tâche 11. Écart déclaré : `derived/` en plus de `raw/`. Vérifications retirées ou déplacées par la recherche, avec leur raison dans le brief : TAG-05 (Open Graph, pas de source admise), AI-02 (niveau 2), AI-03 (niveau 1), REND-01 en Important plutôt que Critique.

**Placeholders** : aucun « à compléter » ; les `{{…}}` de `report-template.md` sont des gabarits que Claude remplit, pas des trous du plan.

**Cohérence des noms** : `fetchChain`, `text`, `evaluateRobots`, `parseSitemap`, `decodeSitemapBody`, `sitemapCandidates`, `collectSitemapUrls`, `extractPageFacts`, `slugFor`, `parsePsi`, `fetchPsi`, `runCollect`, `parseChecks`, `OFFICIAL_DOMAINS`, `normalizePage`, `normalizeQuote`, `startFixtureSite` : mêmes signatures dans les tâches qui les définissent et celles qui les consomment. `FetchRecord.ms` et `PageFacts.slug` présents dans `types.ts` et utilisés par `collect.ts`.

**Code non testé** : logique pure exécutée avant écriture du plan (robots-parser sur 4 échantillons, extraction HTML sur la home du Monde, normalisation sur 23 citations, parseSitemap sur l'exemple officiel et un index réel, slugFor). Non exécutés avant le plan et donc à traiter comme contrat : les tests `Bun.serve` (tâches 2 et 7), `parseChecks` (tâche 8), `lint-report.ts` (tâche 10). Leurs attentes sont écrites ; si une attente échoue pour une raison de forme (fourchette de `textChars`, résolution DNS de `www.localhost`), corriger l'attente en expliquant, jamais la logique pour faire passer.

**Conventions externes** : chacune cite son échantillon dans le brief (redirections, soft 404, robots.txt réels, PSI 429, sitemaps déclarés hors hôte, index à milliers d'enfants, entités HTML dans les pages Google).
