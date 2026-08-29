import { describe, test, expect } from "bun:test";
import { runConsole } from "../console";

// Clé de test volontairement non hexadécimale : sur cette machine, l'outil de lecture masque toute
// chaîne de 32 caractères hexadécimaux (la forme d'une vraie clé Bing), et le masque finirait recopié
// dans le source. `redact` n'exige qu'une longueur d'au moins 8 caractères (même valeur que bing.test.ts).
const KEY = "cle-de-test-bing-jamais-reelle";
const SITES = '{"siteEntry":[{"siteUrl":"sc-domain:romain-ecarnot.com","permissionLevel":"siteOwner"}]}';
const INSPECT = '{"inspectionResult":{"inspectionResultLink":"https://search.google.com/x","indexStatusResult":{"verdict":"NEUTRAL","coverageState":"Page with redirect","googleCanonical":"https://www.romain-ecarnot.com/","userCanonical":"https://romain-ecarnot.com/"}}}';

type Call = { url: string; method: string };
function deps(opts: { key?: string | null; bingSites?: string; inspectStatus?: number }) {
  const calls: Call[] = [];
  const fetcher = async (url: string, init: { method?: string } = {}) => {
    const c = { url, method: init.method ?? "GET" };
    calls.push(c);
    if (url.includes("/webmasters/v3/sites/")) return { status: 200, text: '{"sitemap":[]}' };
    if (url.includes("/webmasters/v3/sites")) return { status: 200, text: SITES };
    if (url.includes("index:inspect")) return { status: opts.inspectStatus ?? 200, text: opts.inspectStatus ? "{}" : INSPECT };
    if (url.includes("GetUserSites")) return { status: 200, text: opts.bingSites ?? '{"d":[]}' };
    return { status: 200, text: '{"d":null}' };
  };
  return {
    calls,
    deps: {
      fetcher,
      env: { GSC_QUOTA_PROJECT: "p-123", BING_WMT_API_KEY: (opts.key === undefined ? KEY : opts.key ?? undefined) },
      // Un jeton reconnaissable : les tests de fuite cherchent ce préfixe dans les sorties.
      gcloud: async () => "ya29.JETON-SECRET",
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
  // Le compte Bing de Romain est vide aujourd'hui : sans ce cas, la branche reste intestée
  // et le défaut se réveillerait le jour où un site entre dans le compte.
  test("hors de toute propriété mais site présent chez Bing : toujours 1 (AC-4)", async () => {
    const { deps: d, calls } = deps({ bingSites: '{"d":[{"Url":"https://example.com","IsVerified":true}]}' });
    const r = await runConsole(["inspect", "https://example.com/"], d);
    expect(r.code).toBe(1);
    expect(calls.some((c) => c.url.includes("index:inspect"))).toBe(false);
  });
  test("sur un 403 de Google, le rôle observé apparaît dans la sortie", async () => {
    const { deps: d } = deps({ inspectStatus: 403 });
    const r = await runConsole(["inspect", "https://romain-ecarnot.com/"], d);
    expect(r.out).toContain("siteOwner");
  });
});

describe("console crawl", () => {
  test("rien lu chez Bing : code 1, et Google est dit sans API", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["crawl", "--site", "https://romain-ecarnot.com"], d);
    expect(r.code).toBe(1);
    expect(r.out).toContain("pas de statistiques de crawl en API");
    expect(r.out).toContain("aucun site dans ce compte Bing");
  });
  test("Bing lu : code 0", async () => {
    const { deps: d } = deps({ bingSites: '{"d":[{"Url":"https://romain-ecarnot.com","IsVerified":true}]}' });
    expect((await runConsole(["crawl", "--site", "https://romain-ecarnot.com"], d)).code).toBe(0);
  });
  test("compte non vide mais hôte absent : la phrase le dit, sans prétendre que le compte est vide", async () => {
    const { deps: d } = deps({ bingSites: '{"d":[{"Url":"https://autre.com","IsVerified":true}]}' });
    const r = await runConsole(["crawl", "--site", "https://romain-ecarnot.com"], d);
    expect(r.out).toContain("ce site n'est pas dans le compte Bing");
    expect(r.out).not.toContain("aucun site dans ce compte Bing");
  });
});

describe("aucun secret ne sort", () => {
  test("ni la clé Bing ni le jeton Google, sur les trois commandes, en texte comme en JSON", async () => {
    for (const args of [["sites"], ["inspect", "https://romain-ecarnot.com/"], ["crawl", "--site", "https://romain-ecarnot.com"]]) {
      for (const variante of [args, [...args, "--json"]]) {
        const { deps: d } = deps({});
        const r = await runConsole(variante, d);
        expect(r.out).not.toContain(KEY);
        expect(r.out).not.toContain("ya29.");
      }
    }
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
