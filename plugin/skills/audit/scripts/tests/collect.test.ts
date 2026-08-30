import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFixtureSite } from "./fixtures/site";
import { detectLevel, runCollect, wantedPages } from "../collect";
import type { Manifest, PageFacts, RobotsEval } from "../lib/types";
import { VALID } from "../../../../lib/tests/fixtures/strategy-valide";

let server: ReturnType<typeof startFixtureSite>;
let base = "";
let out = "";
let manifest: Manifest;

beforeAll(async () => {
  server = startFixtureSite(0);
  base = `http://localhost:${server.port}`;
  out = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
  manifest = await runCollect({ url: base, out, maxPages: 5, delayMs: 0, psiKey: null, level: 0, strategyPath: null });
});
afterAll(() => server.stop(true));

const exists = (p: string) => Bun.file(join(out, p)).exists();

describe("wantedPages", () => {
  test("la home d'abord, puis les URLs explicites, puis celles du sitemap", () => {
    expect(wantedPages("https://acme.fr", ["https://acme.fr/x"], ["https://acme.fr/y"])).toEqual(["https://acme.fr/", "https://acme.fr/x", "https://acme.fr/y"]);
  });
  test("une URL de sitemap listée en apex est gardée sur un site servi en www", () => {
    expect(wantedPages("https://www.acme.fr", [], ["https://acme.fr/a"])).toEqual(["https://www.acme.fr/", "https://acme.fr/a"]);
  });
  test("la home listée en apex ne fait pas collecter la home deux fois", () => {
    expect(wantedPages("https://www.acme.fr", [], ["https://acme.fr/", "https://acme.fr/a"])).toEqual(["https://www.acme.fr/", "https://acme.fr/a"]);
  });
  test("une URL hors site est écartée", () => {
    expect(wantedPages("https://acme.fr", [], ["https://autre.fr/x"])).toEqual(["https://acme.fr/"]);
  });
  test("une URL explicite relative est résolue sur l'origine", () => {
    expect(wantedPages("https://acme.fr", ["/contact"], [])).toEqual(["https://acme.fr/", "https://acme.fr/contact"]);
  });
  test("une URL invalide est ignorée sans faire tomber le reste", () => {
    expect(wantedPages("https://acme.fr", [], ["http://", "https://acme.fr/a"])).toEqual(["https://acme.fr/", "https://acme.fr/a"]);
  });
});

test("detectLevel", () => {
  expect(detectLevel("http://localhost:3000")).toBe(2);
  expect(detectLevel("http://127.0.0.1:8787/")).toBe(2);
  expect(detectLevel("https://www.commentchercherbonheur.org/")).toBe(0);
  expect(detectLevel("https://localhost.evil.com/")).toBe(0);
});

describe("niveau 2", () => {
  test("sur localhost : niveau 2 détecté, sitemap de prod ramené en local, PageSpeed et sondes d'hôte non applicables", async () => {
    const s = startFixtureSite(0, { prodHost: "acme.fr" });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 10, delayMs: 0, psiKey: "cle-factice" });
      expect(m.level).toBe(2);
      expect(m.pages.map((p) => p.final)).toEqual([`http://localhost:${s.port}/`, `http://localhost:${s.port}/a`, `http://localhost:${s.port}/b`, `http://localhost:${s.port}/c`, `http://localhost:${s.port}/hors-site`]);
      expect(m.sitemapUrls.rewrittenFrom).toEqual(["acme.fr", "autre.fr"]);
      expect(m.sitemapUrls.skipped).toEqual([]);
      expect(m.psi).toEqual({ attempted: false, ok: false, error: "non applicable en local" });
      expect(m.probes.httpToHttps).toMatchObject({ status: 0, error: "non applicable en local" });
      expect(m.probes.hostVariant).toMatchObject({ status: 0, error: "non applicable en local" });
      expect(m.probes.notFound.status).toBe(200);
      expect(JSON.parse(await Bun.file(join(o, "derived/psi.json")).text()).error).toBe("non applicable en local");
    } finally { s.stop(true); }
  });
  test("sitemap déclaré sur l'hôte de prod ramené en local au niveau 2", async () => {
    const s = startFixtureSite(0, { prodHost: "prod.invalid", prodSitemaps: true });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 10, delayMs: 0, psiKey: null });
      expect(m.level).toBe(2);
      expect(m.sitemaps.map((sm) => sm.requested)).toEqual([`http://localhost:${s.port}/sitemap.xml`, `http://localhost:${s.port}/sitemap-pages.xml`]);
      expect(m.sitemaps.every((sm) => sm.status === 200)).toBe(true);
      expect(m.sitemapUrls.rewrittenFrom).toEqual(["prod.invalid", "autre.fr"]);
      expect(m.pages.map((p) => p.final)).toEqual([`http://localhost:${s.port}/`, `http://localhost:${s.port}/a`, `http://localhost:${s.port}/b`, `http://localhost:${s.port}/c`, `http://localhost:${s.port}/hors-site`]);
    } finally { s.stop(true); }
  });
  test("niveau 0 forcé sur le même site : rien n'est réécrit, les locs de prod sont écartées et comptées", async () => {
    const s = startFixtureSite(0, { prodHost: "acme.fr" });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 10, delayMs: 0, psiKey: null, level: 0 });
      expect(m.level).toBe(0);
      expect(m.pages).toHaveLength(1);
      expect(m.sitemapUrls.rewrittenFrom).toBeUndefined();
      expect(m.sitemapUrls.skipped).toEqual([{ host: "acme.fr", count: 3 }, { host: "autre.fr", count: 1 }]);
    } finally { s.stop(true); }
  });
  test("--no-psi : PageSpeed non tenté même avec une clé", async () => {
    const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const m = await runCollect({ url: base, out: o, maxPages: 2, delayMs: 0, psiKey: "cle-factice", noPsi: true, level: 0 });
    expect(m.psi).toEqual({ attempted: false, ok: false, error: "PageSpeed non demandé (--no-psi)" });
  });
});

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
  test("le manifeste consigne l'URL de sitemap hors site au lieu de l'écarter en silence", () => {
    expect(manifest.sitemapUrls.skipped).toEqual([{ host: "autre.fr", count: 1 }]);
    // tout ce que le sitemap a gardé a bien été collecté, la home en plus
    expect(manifest.sitemapUrls.kept).toBe(manifest.pages.length - 1);
    expect(manifest.sitemapUrls.listed).toBeGreaterThan(manifest.sitemapUrls.kept);
  });
  test("--max-pages 3 donne 3 pages quand la home est listée dans le sitemap", async () => {
    const s = startFixtureSite(0, { homeInSitemap: true });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 3, delayMs: 0, psiKey: null, level: 0 });
      expect(m.pages).toHaveLength(3);
      expect(new Set(m.pages.map((p) => p.final)).size).toBe(3);
    } finally {
      s.stop(true);
    }
  });
  test("--max-pages 3 donne 3 pages quand la home n'est pas listée dans le sitemap", async () => {
    const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const m = await runCollect({ url: base, out: o, maxPages: 3, delayMs: 0, psiKey: null, level: 0 });
    expect(m.pages).toHaveLength(3);
    expect(new Set(m.pages.map((p) => p.final)).size).toBe(3);
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
    const m = await runCollect({ url: base, out: out2, maxPages: 2, pages: [`${base}/c`], delayMs: 0, psiKey: null, level: 0 });
    expect(m.pages.map((p) => p.final)).toEqual([`${base}/`, `${base}/c`]);
  });

  test("sans --out : deux appels successifs réservent deux dossiers distincts, le premier reste inchangé au bit près", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "erom-seo-autodir-"));
    const prevCwd = process.cwd();
    process.chdir(cwd);
    try {
      const m1 = await runCollect({ url: base, maxPages: 1, delayMs: 0, psiKey: null, level: 0 });
      expect(m1.out).toMatch(/^seo\/audits\/\d{4}-\d{2}-\d{2}-n0$/);
      const manifest1Before = await Bun.file(join(cwd, m1.out, "raw/manifest.json")).text();

      const m2 = await runCollect({ url: base, maxPages: 1, delayMs: 0, psiKey: null, level: 0 });
      expect(m2.out).not.toBe(m1.out);
      expect(m2.out).toBe(`${m1.out}-2`);

      const manifest1After = await Bun.file(join(cwd, m1.out, "raw/manifest.json")).text();
      expect(manifest1After).toBe(manifest1Before);
    } finally {
      process.chdir(prevCwd);
    }
  });
});

describe("stratégie présente", () => {
  const strategyWith = (indexnow: string, pages: string) => VALID.replace("IndexNow : non", `IndexNow : ${indexnow}`).replace(
    "| / | navigationnelle | institut chico | bonheur, coaching | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n| /methode | informationnelle | méthode bonheur | bonheur au travail | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |",
    pages,
  );
  test("pages prévues collectées avant le sitemap, plafond relevé, clé IndexNow récupérée, manifeste renseigné", async () => {
    const s = startFixtureSite(0, { indexnowKey: "a1b2c3d4e5f6" });
    try {
      const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
      const sp = join(o, "strategy.md");
      await Bun.write(sp, strategyWith("a1b2c3d4e5f6", "| /c | informationnelle | page c | | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n| /b | informationnelle | page b | | trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |"));
      const m = await runCollect({ url: `http://localhost:${s.port}`, out: o, maxPages: 2, delayMs: 0, psiKey: null, level: 0, strategyPath: sp });
      expect(m.pages.map((p) => p.final)).toEqual([`http://localhost:${s.port}/`, `http://localhost:${s.port}/c`, `http://localhost:${s.port}/b`]);
      expect(m.maxPages).toBe(3);
      expect(m.strategy).toEqual({ path: sp, date: "2026-08-28", statut: "brouillon", pages: 2 });
      expect(m.indexnow?.status).toBe(200);
      expect(await Bun.file(join(o, "raw/indexnow.txt")).text()).toBe("a1b2c3d4e5f6");
    } finally { s.stop(true); }
  });
  test("stratégie inanalysable : manifeste avec l'erreur, collecte normale", async () => {
    const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const sp = join(o, "strategy.md");
    await Bun.write(sp, VALID.replace("IndexNow : non", "IndexNow : abc"));
    const m = await runCollect({ url: base, out: o, maxPages: 2, delayMs: 0, psiKey: null, level: 0, strategyPath: sp });
    expect(m.strategy?.path).toBe(sp);
    expect(m.strategy?.error).toMatch(/clé IndexNow mal formée/);
    expect(m.indexnow).toBeNull();
    expect(m.pages).toHaveLength(2);
  });
  test("--strategy-path vers un fichier absent est une erreur consignée, pas un silence", async () => {
    const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const sp = join(o, "absent.md");
    const m = await runCollect({ url: base, out: o, maxPages: 2, delayMs: 0, psiKey: null, level: 0, strategyPath: sp });
    expect(m.strategy).toEqual({ path: sp, error: "fichier absent" });
    expect(m.indexnow).toBeNull();
    expect(m.pages).toHaveLength(2);
    expect(m.maxPages).toBe(2);
  });
  test("chemin par défaut absent : pas d'erreur, strategy reste null", async () => {
    const o = await mkdtemp(join(tmpdir(), "erom-seo-collect-"));
    const m = await runCollect({ url: base, out: o, maxPages: 2, delayMs: 0, psiKey: null, level: 0, strategyPath: undefined });
    expect(m.strategy).toBeNull();
  });
  test("sans stratégie : strategy null, indexnow null", () => {
    expect(manifest.strategy).toBeNull();
    expect(manifest.indexnow).toBeNull();
  });
  // Trouvaille de revue de branche : collect.ts lancé sur un concurrent depuis le dossier du client lisait par défaut
  // seo/strategy.md du CLIENT (les pages prévues du client polluaient la collecte du concurrent). --strategy-path none
  // doit produire le même comportement que strategyPath: null (test ci-dessus), même avec un seo/strategy.md présent
  // dans le cwd : c'est le chemin CLI réel emprunté par skills/strategy/SKILL.md étape 3.
  test("--strategy-path none : le seo/strategy.md du cwd n'est pas lu même s'il existe", async () => {
    const s = startFixtureSite(0);
    try {
      const cwd = await mkdtemp(join(tmpdir(), "erom-seo-nostrat-cwd-"));
      await mkdir(join(cwd, "seo"), { recursive: true });
      await Bun.write(join(cwd, "seo/strategy.md"), VALID);
      const o = await mkdtemp(join(tmpdir(), "erom-seo-nostrat-out-"));
  // Bun.spawn (async), pas spawnSync : le sous-processus appelle le site jouet servi dans CE process ;
      // spawnSync bloquerait la boucle d'événements et empêcherait Bun.serve de répondre (deadlock observé).
      const proc = Bun.spawn(
        ["bun", `${import.meta.dir}/../collect.ts`, `http://localhost:${s.port}`, "--out", o, "--max-pages", "2", "--no-psi", "--strategy-path", "none"],
        { cwd, stdout: "pipe", stderr: "pipe" },
      );
      const exitCode = await proc.exited;
      expect(exitCode, await new Response(proc.stderr).text()).toBe(0);
      const m = JSON.parse(await Bun.file(join(o, "raw/manifest.json")).text()) as Manifest;
      // strategy.md du cwd déclare 2 pages prévues (/, /methode) : si le flag était ignoré, maxPages passerait à 3 et
      // /methode (absente du site jouet) serait collectée avant le sitemap.
      expect(m.strategy).toBeNull();
      expect(m.indexnow).toBeNull();
      expect(m.maxPages).toBe(2);
      expect(m.pages).toHaveLength(2);
    } finally { s.stop(true); }
  });
});

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

  // Round 1 de revue (team-lead) : les trois tests suivants injectent `consoleAuth` pour ne jamais
  // appeler le vrai gcloud. Sans cette couture, leur résultat dépendait de GSC_QUOTA_PROJECT dans
  // l'environnement qui lance `bun test` — vert avec ~/.zshenv sourcé, faux ou pour la mauvaise raison
  // sans. Un `auth` fictif rend les trois déterministes dans les deux cas, mesuré des deux côtés.
  const fauxAuth = { token: "jeton-de-test-sans-danger", quotaProject: null, provider: "gcloud" as const };

  test("avec --level 1 et un accès fourni, la branche s'exécute et écrit son dérivé", async () => {
    // Le pendant du premier test : sans lui, un `if (false)` passerait aussi celui-là.
    const vus: string[] = [];
    const espion: any = async (url: string) => {
      vus.push(url);
      if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [] }) };
      return { status: 200, text: JSON.stringify({}) };
    };
    const dir = await mkdtemp(join(tmpdir(), "erom-seo-n1-"));
    const m = await runCollect({
      url: base, out: dir, maxPages: 2, delayMs: 0, psiKey: null, level: 1, strategyPath: null,
      consoleFetcher: espion, consoleAuth: { auth: fauxAuth, authError: null },
    });
    expect(m.level).toBe(1);
    expect(m.level1?.attempted).toBe(true);
    expect(vus.some((u) => u.includes("googleapis"))).toBe(true);
    expect(await Bun.file(join(dir, "derived/console.json")).exists()).toBe(true);
  });

  test("une fuite dans le dérivé ne fait pas échouer l'audit (AC-7)", async () => {
    // La panne doit avoir lieu DANS la branche, avec un accès fourni : sans jeton, l'espion n'est jamais
    // appelé et c'est l'absence d'accès qui renseignerait googleError, pas la panne qu'on prétend simuler
    // (trouvaille de revue round 1). La propriété résout normalement ; l'appel sitemaps lève une erreur
    // dont le message EST le jeton (un thrown brut, comme le ferait une erreur réseau qui recopie l'URL
    // appelée) : sitemapsError l'embarque tel quel, assertNoSecret lève pour de vrai sur le dérivé
    // sérialisé, APRÈS l'écriture de raw/gsc et AVANT celle du manifeste — exactement le risque interdit
    // par la spec section 6. La fuite ne doit pas non plus avoir eu le temps d'atteindre raw/ : le seul
    // appel qui embarque le jeton est celui qui échoue avant tout pushRaw.
    const espion: any = async (url: string) => {
      if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: `${base}/`, permissionLevel: "siteOwner" }] }) };
      if (url.includes("/sitemaps")) throw new Error(fauxAuth.token);
      return { status: 200, text: JSON.stringify({}) };
    };
    const dir = await mkdtemp(join(tmpdir(), "erom-seo-n1-fuite-"));
    const m = await runCollect({
      url: base, out: dir, maxPages: 2, delayMs: 0, psiKey: null, level: 1, strategyPath: null,
      consoleFetcher: espion, consoleAuth: { auth: fauxAuth, authError: null },
    });
    expect(m.level1?.attempted).toBe(true);
    expect(m.level1?.googleError).toContain("clé API");
    expect(await Bun.file(join(dir, "raw/gsc/sites.json")).exists()).toBe(true);     // écrit avant la fuite
    expect(await Bun.file(join(dir, "raw/manifest.json")).exists()).toBe(true);      // le manifeste existe quand même
    expect(await Bun.file(join(dir, "derived/console.json")).exists()).toBe(false);  // jamais écrit : le refus a eu lieu avant
    expect(m.pages.length).toBeGreaterThan(0);                                       // le niveau 0 est intact
  });

  test("une fuite dans un corps raw ne fait pas échouer l'audit non plus (round 2)", async () => {
    // Round 2 de revue : raw/ n'avait pas la même garde que derived/ et le manifeste. sites.list rend une
    // propriété dont le siteUrl embarque le jeton — un corps déjà poussé dans raw AVANT toute résolution
    // de propriété (voir collectGoogle), donc le test le plus direct de la garde ajoutée sur la boucle
    // d'écriture de raw/. Elle ne matchera aucune propriété réelle (domaine bidon), sans incidence : ce
    // qui compte ici, c'est le contenu du corps poussé, pas la suite de la collecte.
    const espion: any = async (url: string) => {
      if (url.endsWith("/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: `sc-domain:leak-${fauxAuth.token}.example`, permissionLevel: "inconnu" }] }) };
      return { status: 200, text: JSON.stringify({}) };
    };
    const dir = await mkdtemp(join(tmpdir(), "erom-seo-n1-fuiteraw-"));
    const m = await runCollect({
      url: base, out: dir, maxPages: 2, delayMs: 0, psiKey: null, level: 1, strategyPath: null,
      consoleFetcher: espion, consoleAuth: { auth: fauxAuth, authError: null },
    });
    expect(m.level1?.attempted).toBe(true);
    expect(m.level1?.googleError).toContain("clé API");
    expect(await Bun.file(join(dir, "raw/gsc/sites.json")).exists()).toBe(false);     // jamais écrit : la garde a agi avant
    expect(await Bun.file(join(dir, "raw/manifest.json")).exists()).toBe(true);       // le manifeste existe quand même
    expect(await Bun.file(join(dir, "derived/console.json")).exists()).toBe(false);
    expect(m.pages.length).toBeGreaterThan(0);
  });

  test("sans accès (jeton indisponible), le niveau 1 le dit sans appeler Google", async () => {
    // Comportement légitime, distinct d'une panne : demandé en round 1 pour ne pas confondre les deux.
    // L'espion rend toujours un succès inoffensif : s'il levait, un vrai BING_WMT_API_KEY dans
    // l'environnement se retrouverait dans le message d'erreur (l'URL Bing porte la clé en requête),
    // et assertNoSecret le rattraperait à la place de l'assertion qu'on veut vraiment vérifier ici —
    // exactement le genre de dépendance à l'environnement que ce fix corrige.
    const vus: string[] = [];
    const espion: any = async (url: string) => { vus.push(url); return { status: 200, text: JSON.stringify({}) }; };
    const dir = await mkdtemp(join(tmpdir(), "erom-seo-n1-sansacces-"));
    const m = await runCollect({
      url: base, out: dir, maxPages: 2, delayMs: 0, psiKey: null, level: 1, strategyPath: null,
      consoleFetcher: espion, consoleAuth: { auth: null, authError: "jeton indisponible : test" },
    });
    expect(m.level1?.attempted).toBe(true);
    expect(m.level1?.googleError).toBe("jeton indisponible : test");
    expect(vus.some((u) => u.includes("googleapis"))).toBe(false);
    expect(await Bun.file(join(dir, "raw/manifest.json")).exists()).toBe(true);
  });
});
