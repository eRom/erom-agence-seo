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
