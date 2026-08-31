import { describe, test, expect } from "bun:test";
import { listProperties, listSitemaps, inspectUrl, canonicalMismatch, searchAnalytics, submitSitemap, GscError, type Fetcher } from "../gsc";
import { SUBMIT_HINT, type GoogleAuth } from "../auth-google";

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
  test("un 403 de scope donne la commande de connexion", async () => {
    const { f } = fake(() => ({ status: 403, text: '{"error":{"code":403,"details":[{"reason":"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}],"message":"Request had insufficient authentication scopes."}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.hint).toContain("gcloud auth application-default login"));
  });
});

// fail() a six branches. Deux touchent directement le 403 SERVICE_DISABLED (revue finale, I-2) : le
// projet de quota nommé change le message que le CLI doit rendre, sans jamais dire que la variable
// est absente. Les quatre autres (USER_PROJECT_DENIED, 401, 403 générique, 404, statut générique et
// corps illisible) n'avaient aucune couverture avant ce tour.
describe("fail() : les six branches", () => {
  // Corps réel capturé le 29/08 : GSC_QUOTA_PROJECT=dockertest-1268 sur un projet où l'API Search
  // Console n'est jamais activée. Google nomme le projet fautif dans son propre message.
  const SERVICE_DISABLED_NOMME =
    '{"error":{"code":403,"status":"PERMISSION_DENIED","message":"Google Search Console API has not been used in project dockertest-1268 before or it is disabled.",' +
    '"details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"SERVICE_DISABLED","domain":"googleapis.com","metadata":{"consumer":"projects/dockertest-1268","service":"searchconsole.googleapis.com"}}]}}';
  // Corps réel capturé le 29/08 : GSC_QUOTA_PROJECT=projet-qui-nexiste-pas-123456.
  const USER_PROJECT_DENIED =
    '{"error":{"code":400,"status":"INVALID_ARGUMENT","message":"Project \'projects/projet-qui-nexiste-pas-123456\' not found or deleted.",' +
    '"details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"USER_PROJECT_DENIED","domain":"googleapis.com","metadata":{"consumer":"projects/projet-qui-nexiste-pas-123456"}}]}}';

  test("SERVICE_DISABLED avec un projet de quota nommé : le message nomme ce projet, jamais « variable absente »", async () => {
    const { f } = fake(() => ({ status: 403, text: SERVICE_DISABLED_NOMME }));
    const p = listProperties(f, AUTH); // AUTH.quotaProject = "p-123"
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => {
      expect(`${e.message}${e.hint}`).toContain("p-123");
      expect(`${e.message}${e.hint}`).toContain("gcloud services enable searchconsole.googleapis.com --project=p-123");
      expect(`${e.message}${e.hint}`).not.toContain("absente");
    });
  });
  test("SERVICE_DISABLED sans projet de quota (compte de service) : garde la consigne générique", async () => {
    const { f } = fake(() => ({ status: 403, text: SERVICE_DISABLED_NOMME }));
    const p = listProperties(f, SA); // SA.quotaProject = null
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.hint).toContain("GSC_QUOTA_PROJECT"));
  });
  test("USER_PROJECT_DENIED : le projet nommé par GSC_QUOTA_PROJECT n'existe pas ou n'est pas accessible", async () => {
    const { f } = fake(() => ({ status: 400, text: USER_PROJECT_DENIED }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => {
      expect(e.message).toContain("p-123");
      expect(e.message).toContain("n'existe pas ou n'est pas accessible");
    });
  });
  test("401 : jeton refusé ou expiré", async () => {
    const { f } = fake(() => ({ status: 401, text: '{"error":{"code":401,"message":"Request had invalid authentication credentials."}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => {
      expect(e.message).toContain("jeton refusé");
      expect(e.hint).toContain("gcloud auth application-default login");
    });
  });
  test("403 générique (rôle insuffisant, sans reason reconnue) : renvoie vers les rôles Search Console", async () => {
    const { f } = fake(() => ({ status: 403, text: '{"error":{"code":403,"message":"The caller does not have permission"}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => {
      expect(e.message).toContain("droits insuffisants");
      expect(e.hint).toContain("acces.md");
    });
  });
  test("404 : propriété inconnue", async () => {
    const { f } = fake(() => ({ status: 404, text: '{"error":{"code":404,"message":"Requested entity was not found."}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => {
      expect(e.message).toContain("propriété inconnue");
      expect(e.hint).toContain("console sites");
    });
  });
  test("statut générique (500) : consigne de réessayer", async () => {
    const { f } = fake(() => ({ status: 500, text: '{"error":{"code":500,"message":"Internal error"}}' }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.hint).toContain("réessayer"));
  });
  test("corps illisible : le code seul suffit à choisir la branche générique, sans planter", async () => {
    const { f } = fake(() => ({ status: 500, text: "ceci n'est pas du JSON" }));
    const p = listProperties(f, AUTH);
    await expect(p).rejects.toBeInstanceOf(GscError);
    await p.catch((e: GscError) => expect(e.message).toContain("500"));
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
  test("une réponse sans indexStatusResult rend status null et ne plante pas (spec section 9)", async () => {
    const { f } = fake(() => ({ status: 200, text: '{"inspectionResult":{"inspectionResultLink":"https://search.google.com/z"}}' }));
    const r = await inspectUrl(f, AUTH, "sc-domain:x.com", "https://x.com/");
    expect(r.status).toBeNull();
    expect(r.link).toBe("https://search.google.com/z");
    expect(canonicalMismatch(r.status)).toBe(false);
  });
  test("canonicalMismatch ne dit oui que si les deux sont là et diffèrent", () => {
    const base = { verdict: "PASS", coverageState: "x", robotsTxtState: null, indexingState: null, lastCrawlTime: null, pageFetchState: null, crawledAs: null };
    expect(canonicalMismatch({ ...base, googleCanonical: "https://a/", userCanonical: "https://b/" })).toBe(true);
    expect(canonicalMismatch({ ...base, googleCanonical: "https://a/", userCanonical: null })).toBe(false);
    expect(canonicalMismatch(null)).toBe(false);
  });
});

describe("searchAnalytics", () => {
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
});

describe("aucune écriture", () => {
  test("aucune URL appelée ne vise une soumission, quelle que soit la méthode", async () => {
    const body = await fx("sites");
    const { f, calls } = fake(() => ({ status: 200, text: body }));
    await listProperties(f, AUTH);
    await listSitemaps(f, AUTH, "sc-domain:romain-ecarnot.com").catch(() => {});
    await inspectUrl(f, AUTH, "sc-domain:romain-ecarnot.com", "https://romain-ecarnot.com/").catch(() => {});
    expect(calls.length).toBeGreaterThan(0);
    // Le contrôle porte sur les URL, pas sur le verbe : un sitemaps.submit envoyé en POST passerait
    // une assertion qui ne regarde que la méthode.
    for (const c of calls) expect(/\/sitemaps\/|SubmitFeed|SubmitUrlBatch|indexnow/.test(c.url)).toBe(false);
  });
});

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
