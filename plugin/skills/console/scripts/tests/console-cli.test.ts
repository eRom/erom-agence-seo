import { describe, test, expect } from "bun:test";
import { runConsole } from "../console";

// Clé de test volontairement non hexadécimale : sur cette machine, l'outil de lecture masque toute
// chaîne de 32 caractères hexadécimaux (la forme d'une vraie clé Bing), et le masque finirait recopié
// dans le source. `redact` n'exige qu'une longueur d'au moins 8 caractères (même valeur que bing.test.ts).
const KEY = "cle-de-test-bing-jamais-reelle";
const SITES = '{"siteEntry":[{"siteUrl":"sc-domain:romain-ecarnot.com","permissionLevel":"siteOwner"}]}';
const INSPECT = '{"inspectionResult":{"inspectionResultLink":"https://search.google.com/x","indexStatusResult":{"verdict":"NEUTRAL","coverageState":"Page with redirect","googleCanonical":"https://www.romain-ecarnot.com/","userCanonical":"https://romain-ecarnot.com/"}}}';
// La fixture porte une vraie clé de 32 caractères hexadécimaux, que la machine masque à la lecture.
// On ne la lit jamais : on la remplace par une valeur reconnaissable, valide au regard du lint
// (8 à 128 caractères, lettres, chiffres, tirets).
const STRAT = (await Bun.file(`${import.meta.dir}/../../../checklist/scripts/tests/fixtures/chico/strategy.md`).text())
  .replace(/^IndexNow : .*$/m, "IndexNow : clepublique");
/** Même fixture, sans clé IndexNow déclarée : un des trois cas non applicables de D57. */
const STRAT_SANS_INDEXNOW = STRAT.replace(/^IndexNow : .*$/m, "IndexNow : non");

type Call = { url: string; method: string; body?: string };
function deps(opts: {
  key?: string | null; bingSites?: string; inspectStatus?: number; urlInfo?: string; sitesStatus?: number;
  sitemapsStatus?: number; feedsError?: string;
  fetcher?: (url: string, init?: { method?: string; body?: string }) => Promise<{ status: number; text: string; final?: string }>;
  strategy?: string | null;
}) {
  const calls: Call[] = [];
  const fetcher = async (url: string, init: { method?: string } = {}) => {
    const c = { url, method: init.method ?? "GET" };
    calls.push(c);
    if (url.includes("/webmasters/v3/sites/")) return { status: opts.sitemapsStatus ?? 200, text: opts.sitemapsStatus ? "{}" : '{"sitemap":[]}' };
    if (url.includes("/webmasters/v3/sites")) return { status: opts.sitesStatus ?? 200, text: opts.sitesStatus ? "{}" : SITES };
    if (url.includes("index:inspect")) return { status: opts.inspectStatus ?? 200, text: opts.inspectStatus ? "{}" : INSPECT };
    if (url.includes("GetUrlInfo")) return { status: 200, text: opts.urlInfo ?? '{"d":null}' };
    if (url.includes("GetFeeds")) return { status: 200, text: opts.feedsError ?? '{"d":[]}' };
    if (url.includes("GetUserSites")) return { status: 200, text: opts.bingSites ?? '{"d":[]}' };
    return { status: 200, text: '{"d":null}' };
  };
  return {
    calls,
    deps: {
      fetcher: opts.fetcher
        ? async (url: string, init: { method?: string; body?: string } = {}) => {
            calls.push({ url, method: init.method ?? "GET", body: init.body });
            return opts.fetcher!(url, init);
          }
        : fetcher,
      env: { GSC_QUOTA_PROJECT: "p-123", BING_WMT_API_KEY: (opts.key === undefined ? KEY : opts.key ?? undefined) },
      // Un jeton reconnaissable : les tests de fuite cherchent ce préfixe dans les sorties.
      gcloud: async () => "ya29.JETON-SECRET",
      serviceAccount: async () => "sa.FAUX",
      readStrategy: async () => opts.strategy ?? null,
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
  test("un 500 sur la liste des propriétés Google : Bing répond quand même, code 0", async () => {
    const { deps: d } = deps({ sitesStatus: 500, bingSites: '{"d":[{"Url":"https://x.com","IsVerified":true}]}' });
    const r = await runConsole(["sites"], d);
    expect(r.code).toBe(0);
    expect(r.out).toContain("https://x.com");
  });
  test("un ErrorCode Bing sur GetUserSites : Google répond quand même, code 0", async () => {
    const { deps: d } = deps({ bingSites: '{"ErrorCode":3,"Message":"InvalidApiKey"}' });
    const r = await runConsole(["sites"], d);
    expect(r.code).toBe(0);
    expect(r.out).toContain("sc-domain:romain-ecarnot.com");
  });
  test("aucun moteur n'a répondu : code 1", async () => {
    const { deps: d } = deps({ key: null });
    const r = await runConsole(["sites"], { ...d, gcloud: async () => null });
    expect(r.code).toBe(1);
  });
  test("sitemaps illisibles sur une propriété : la sortie le dit, sans prétendre à zéro sitemap, code 0", async () => {
    const { deps: d } = deps({ sitemapsStatus: 403 });
    const r = await runConsole(["sites"], d);
    expect(r.code).toBe(0);
    expect(r.out).toContain("sitemaps non lisibles");
    expect(r.out).not.toContain("aucun sitemap déclaré");
  });
  test("flux Bing illisibles sur un site : la sortie le dit, sans prétendre à zéro flux, le site reste nommé", async () => {
    const { deps: d } = deps({
      bingSites: '{"d":[{"Url":"https://x.com","IsVerified":true}]}',
      feedsError: '{"ErrorCode":2,"Message":"UnknownError"}',
    });
    const r = await runConsole(["sites"], d);
    expect(r.out).toContain("https://x.com");
    expect(r.out).toContain("flux non lisibles");
    expect(r.out).not.toContain("0 flux déclaré(s)");
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
  // et le défaut se réveillerait le jour où un site entre dans le compte. Bing doit vraiment
  // répondre (urlInfo non vide), sinon le test ne prouve rien : `bing` resterait null de toute
  // façon et le code 1 ne devrait rien à la garde qu'il prétend couvrir.
  test("hors de toute propriété mais site présent chez Bing, qui répond : toujours 1 (AC-4)", async () => {
    const { deps: d, calls } = deps({
      bingSites: '{"d":[{"Url":"https://example.com","IsVerified":true}]}',
      urlInfo: '{"d":{"Url":"https://example.com/"}}',
    });
    const r = await runConsole(["inspect", "https://example.com/"], d);
    expect(r.code).toBe(1);
    expect(calls.some((c) => c.url.includes("GetUrlInfo"))).toBe(true);
    expect(calls.some((c) => c.url.includes("index:inspect"))).toBe(false);
  });
  test("sur un 403 de Google, le rôle observé apparaît dans la sortie", async () => {
    const { deps: d } = deps({ inspectStatus: 403 });
    const r = await runConsole(["inspect", "https://romain-ecarnot.com/"], d);
    expect(r.out).toContain("siteOwner");
  });
  test("compte Bing vide, sur une URL couverte par une propriété : le dit en clair", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["inspect", "https://romain-ecarnot.com/"], d);
    expect(r.out).toContain("aucun site dans ce compte Bing");
  });
  test("compte Bing non vide mais hôte absent, sur inspect : la phrase le dit, sans prétendre que le compte est vide", async () => {
    const { deps: d } = deps({ bingSites: '{"d":[{"Url":"https://autre.com","IsVerified":true}]}' });
    const r = await runConsole(["inspect", "https://romain-ecarnot.com/"], d);
    expect(r.out).toContain("ce site n'est pas dans le compte Bing");
    expect(r.out).not.toContain("aucun site dans ce compte Bing");
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

describe("console update", () => {
  /** Faux serveur des tests d'update, paramétré : chaque option force un refus (ou un site Bing différent), le reste répond juste. */
  function serveur(o: { putStatus?: number; robots?: string; sitemapStatus?: number; cleServie?: string; bingHoteAbsent?: boolean } = {}) {
    return async (url: string, init: { method?: string; body?: string } = {}) => {
      if (url.endsWith("/robots.txt")) return { status: 200, text: o.robots ?? "Sitemap: https://www.a.fr/sitemap.xml", final: "https://www.a.fr/robots.txt" };
      if (url === "https://www.a.fr/sitemap.xml") return { status: o.sitemapStatus ?? 200, text: o.sitemapStatus ? "" : '<urlset><url><loc>https://www.a.fr/</loc></url></urlset>' };
      if (url.includes("/sitemaps/")) return { status: o.putStatus ?? 204, text: o.putStatus ? '{"error":{"details":[{"reason":"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}]}}' : "" };
      if (url.includes("/webmasters/v3/sites")) return { status: 200, text: JSON.stringify({ siteEntry: [{ siteUrl: "https://www.a.fr/", permissionLevel: "siteOwner" }] }) };
      if (url.includes("GetUserSites")) {
        const site = o.bingHoteAbsent ? { Url: "https://autre-site.fr/", IsVerified: true } : { Url: "https://www.a.fr/", IsVerified: true };
        return { status: 200, text: JSON.stringify({ d: [site] }) };
      }
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

  test("--dry-run est refusé, aucune écriture ne part avant que T5 le câble", async () => {
    const { deps: d, calls } = deps({ fetcher: serveur(), strategy: STRAT });
    const { out, code } = await runConsole(["update", "--site", "https://www.a.fr", "--dry-run"], d);
    expect(code).toBe(1);
    expect(out).toContain("arrivent à la tâche suivante");
    expect(calls).toHaveLength(0);
  });

  test("--url est refusé au même titre que --dry-run, aucune écriture ne part", async () => {
    const { deps: d, calls } = deps({ fetcher: serveur(), strategy: STRAT });
    const { out, code } = await runConsole(["update", "--site", "https://www.a.fr", "--url", "https://www.a.fr/page"], d);
    expect(code).toBe(1);
    expect(out).toContain("arrivent à la tâche suivante");
    expect(calls).toHaveLength(0);
  });

  test("stratégie illisible avec --site explicite : IndexNow nomme l'échec d'analyse, pas « non »", async () => {
    const { deps: d, calls } = deps({ fetcher: serveur(), strategy: "markdown invalide sans titre" });
    const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
    expect(code).toBe(1);
    expect(out).toContain("ne s'analyse pas");
    expect(out).not.toContain("pas de clé IndexNow dans seo/strategy.md");
    expect(calls.filter((a) => a.url === "https://api.indexnow.org/indexnow")).toHaveLength(0);
  });

  // D53 : la même requête donne l'origine réellement servie (via la redirection portée par `final`)
  // et les directives Sitemap: du robots.txt. Un mutant qui ignore `final`, ou qui ne transmet pas
  // (ou vide) les sitemaps déclarés, laisserait ce test rouge sur les trois assertions à la fois.
  test("D53 : origine servie via redirection, sitemap au chemin déclaré par robots.txt, un seul GET robots.txt", async () => {
    const fetcher = async (url: string) => {
      if (url.endsWith("/robots.txt")) return { status: 200, text: "Sitemap: https://www.a.fr/sitemap-articles.xml", final: "https://www.a.fr/robots.txt" };
      if (url === "https://www.a.fr/sitemap-articles.xml") return { status: 200, text: '<urlset><url><loc>https://www.a.fr/</loc></url></urlset>' };
      return { status: 404, text: "" };
    };
    const { deps: d, calls } = deps({ fetcher });
    const { out } = await runConsole(["update", "--site", "https://a.fr"], d);
    expect(out).toContain("site      : https://www.a.fr (demandé : https://a.fr)");
    expect(out).toContain("sitemap   : https://www.a.fr/sitemap-articles.xml (1 URL)");
    expect(calls.filter((a) => a.url.endsWith("/robots.txt"))).toHaveLength(1);
  });

  test("D57 : site absent du compte Bing, non applicable, code 0", async () => {
    const { deps: d } = deps({ fetcher: serveur({ bingHoteAbsent: true }), strategy: STRAT });
    const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
    expect(code).toBe(0);
    expect(out).toContain("ce site n'est pas dans le compte Bing");
  });

  test("D57 : pas de clé IndexNow dans une stratégie par ailleurs lisible, non applicable, code 0", async () => {
    const { deps: d } = deps({ fetcher: serveur(), strategy: STRAT_SANS_INDEXNOW });
    const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
    expect(code).toBe(0);
    expect(out).toContain("pas de clé IndexNow dans seo/strategy.md");
  });

  test("un transport qui lève sur l'appel Bing n'empêche ni Google ni IndexNow, et vaut 1", async () => {
    const base = serveur();
    const fetcherQuiLeve = async (url: string, init: { method?: string; body?: string } = {}) => {
      if (url.includes("GetUserSites")) throw new Error("service injoignable : connexion refusée");
      return base(url, init);
    };
    const { deps: d, calls } = deps({ fetcher: fetcherQuiLeve, strategy: STRAT });
    const { out, code } = await runConsole(["update", "--site", "https://www.a.fr"], d);
    expect(code).toBe(1);
    expect(out).toContain("service injoignable");
    expect(calls.filter((a) => a.method === "PUT")).toHaveLength(1);
    expect(calls.filter((a) => a.url === "https://api.indexnow.org/indexnow")).toHaveLength(1);
  });
});

describe("aucun secret ne sort", () => {
  test("ni la clé Bing ni le jeton Google, sur les quatre commandes, en texte comme en JSON", async () => {
    for (const args of [
      ["sites"], ["inspect", "https://romain-ecarnot.com/"], ["crawl", "--site", "https://romain-ecarnot.com"],
      ["update", "--site", "https://www.a.fr"],
    ]) {
      for (const variante of [args, [...args, "--json"]]) {
        const { deps: d } = deps({});
        const r = await runConsole(variante, d);
        expect(r.out).not.toContain(KEY);
        expect(r.out).not.toContain("ya29.");
      }
    }
  });
});

describe("redact protège les erreurs réseau", () => {
  test("une erreur qui porte l'URL complète, donc la clé, ne fuite jamais dans la sortie", async () => {
    const { deps: d } = deps({});
    const fetcherQuiFuit = async (url: string, init: { method?: string } = {}) => {
      if (url.includes("GetUserSites")) throw new Error(`connexion refusée sur ${url}`);
      return d.fetcher(url, init);
    };
    const r = await runConsole(["sites"], { ...d, fetcher: fetcherQuiFuit });
    expect(r.out).not.toContain(KEY);
    expect(r.out).toContain("[clé]");
  });
});

describe("aucune écriture", () => {
  test("aucun appel ne vise SubmitFeed, SubmitUrlBatch ni IndexNow, et tout appel hors inspection est un GET", async () => {
    const { deps: d, calls } = deps({});
    await runConsole(["sites"], d);
    await runConsole(["inspect", "https://romain-ecarnot.com/"], d);
    await runConsole(["crawl", "--site", "https://romain-ecarnot.com"], d);
    const interdits = ["SubmitFeed", "SubmitUrlBatch", "indexnow", "/sitemaps/"];
    for (const c of calls) {
      for (const i of interdits) expect(c.url.includes(i)).toBe(false);
      // index:inspect est le seul appel en écriture de flux HTTP (POST) : une lecture (D30, D34).
      if (!c.url.includes("index:inspect")) expect(c.method).toBe("GET");
    }
  });
});

describe("erreurs de mise en route", () => {
  test("sans GSC_QUOTA_PROJECT, la consigne nomme la variable et la commande d'activation, et Bing répond quand même", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["sites"], { ...d, env: { BING_WMT_API_KEY: KEY } });
    expect(r.out).toContain("GSC_QUOTA_PROJECT");
    expect(r.out).toContain("gcloud services enable searchconsole.googleapis.com");
    expect(r.code).toBe(0);
    expect(r.out).toContain("aucun site dans ce compte Bing");
  });
  test("sans jeton du tout, la consigne donne la commande de connexion et son scope, et Bing répond quand même", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["sites"], { ...d, gcloud: async () => null });
    expect(r.out).toContain("gcloud auth application-default login");
    expect(r.out).toContain("webmasters.readonly");
    expect(r.code).toBe(0);
    expect(r.out).toContain("aucun site dans ce compte Bing");
  });
  test("crawl sans site et sans strategy.md sort en 1 avec la consigne", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["crawl"], d);
    expect(r.code).toBe(1);
    expect(r.out).toContain("--site");
  });
  test("crawl --site sans valeur le dit, sans retomber en silence sur strategy.md", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["crawl", "--site"], { ...d, readStrategy: async () => "# Stratégie SEO/GEO : example.com" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("--site");
    expect(r.out).toContain("attend une URL");
  });
  test("une strategy.md présente mais invalide le dit, pas la consigne de dossier", async () => {
    const { deps: d } = deps({});
    const r = await runConsole(["crawl"], { ...d, readStrategy: async () => "markdown invalide sans titre" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("ne s'analyse pas");
    expect(r.out).not.toContain("lance depuis un dossier");
  });
  test("console inspect sur une URL malformée rend une phrase française, pas Invalid URL", async () => {
    const { deps: d, calls } = deps({});
    const r = await runConsole(["inspect", "pas-une-url"], d);
    expect(r.code).toBe(1);
    expect(r.out).toContain("n'est pas une URL valide");
    expect(r.out).not.toContain("Invalid URL");
    expect(calls.length).toBe(0);
  });
  // "pas-une-url" seul ne suffit pas à reproduire : préfixé en https://pas-une-url, c'est un
  // hôte à un seul label, valide pour l'analyseur d'URL. Un espace, lui, casse le préfixage (vérifié
  // sur le vrai binaire avant correctif : « Invalid URL » sortait tel quel sous Bing Webmaster Tools).
  test("console crawl --site sur une URL malformée rend une phrase française, pas Invalid URL", async () => {
    const { deps: d, calls } = deps({});
    const r = await runConsole(["crawl", "--site", "pas une url"], d);
    expect(r.code).toBe(1);
    expect(r.out).toContain("n'est pas une URL valide");
    expect(r.out).not.toContain("Invalid URL");
    expect(calls.length).toBe(0);
  });
});
