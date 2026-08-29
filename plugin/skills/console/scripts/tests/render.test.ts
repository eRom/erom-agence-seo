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
  test("une propriété sans sitemap déclaré le dit en clair", () => {
    const out = renderSites({ google: [{ property: prop, sitemaps: [] }], googleError: null, bing: [], bingError: null });
    expect(out).toContain("aucun sitemap déclaré");
  });
  test("un sitemap sans détail de contenu ne fabrique pas de chiffre", () => {
    const out = renderSites({ google: [{ property: prop, sitemaps: [{ ...sitemap, contents: [] }] }], googleError: null, bing: [], bingError: null });
    expect(out).toContain("sans détail");
    expect(out).not.toMatch(/soumis \d/);
  });
  test("un compte Bing non vide nomme chaque site, son statut de vérification et ses flux", () => {
    const out = renderSites({
      google: [], googleError: null,
      bing: [
        { site: { Url: "https://x.com", IsVerified: true }, feeds: [1, 2] },
        { site: { Url: "https://y.com", IsVerified: false }, feeds: [] },
      ],
      bingError: null,
    });
    expect(out).toContain("https://x.com");
    expect(out).toContain("https://y.com");
    expect(out).toContain("vérifié");
    expect(out).toContain("non vérifié");
    expect(out).toContain("2 flux déclaré(s)");
    expect(out).toContain("0 flux déclaré(s)");
    expect(out).not.toContain("aucun site dans ce compte Bing");
  });
  test("un refus Google n'empêche pas Bing de répondre", () => {
    const out = renderSites({ google: null, googleError: "jeton refusé ou expiré", bing: [], bingError: null });
    expect(out).toContain("jeton refusé ou expiré");
    expect(out).toContain("aucun site dans ce compte Bing");
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
  test("sur un refus de droits, le rôle observé est nommé quand même (spec section 8)", () => {
    const out = renderInspect({
      url: "https://a/", property: { siteUrl: "sc-domain:a.com", permissionLevel: "siteFullUser" },
      google: null, googleError: "droits insuffisants sur cette propriété", bing: null, bingError: null,
    });
    expect(out).toContain("siteFullUser");
    expect(out).toContain("droits insuffisants");
  });
  test("une inspection sans état rend la phrase dédiée, pas un blanc (spec section 9)", () => {
    const out = renderInspect({ url: "https://a/", property: prop, google: { link: null, status: null }, googleError: null, bing: null, bingError: null });
    expect(out).toContain("aucun état renvoyé par Google");
  });
  test("une charge Bing réduite à son __type ne laisse pas la section vide", () => {
    const out = renderInspect({
      url: "https://a/", property: prop, google: null, googleError: "x",
      bing: { __type: "UrlInfo:#Microsoft.Bing.Webmaster.Api" }, bingError: null,
    });
    expect(out).toContain("pas dans l'index Bing");
  });
});

describe("renderCrawl", () => {
  test("dit toujours que Google n'expose pas ses statistiques de crawl, et relaie la raison Bing", () => {
    const out = renderCrawl({ site: "https://romain-ecarnot.com", bing: null, bingError: "aucun site dans ce compte Bing" });
    expect(out).toContain("Google : pas de statistiques de crawl en API");
    expect(out).toContain("aucun site dans ce compte Bing");
  });
  test("sans erreur et sans données, la section Bing n'est jamais vide", () => {
    const out = renderCrawl({ site: "https://a", bing: null, bingError: null });
    expect(out).toContain("aucune statistique lue");
  });
  test("avec des données, compte les statistiques et dit l'absence d'erreur de crawl", () => {
    const out = renderCrawl({ site: "https://a", bing: { stats: [{ x: 1 }], issues: [] }, bingError: null });
    expect(out).toContain("1 entrée(s) de statistiques");
    expect(out).toContain("aucune erreur de crawl remontée par Bing");
  });
  test("des erreurs de crawl remontées par Bing sont comptées, pas noyées dans la phrase d'absence", () => {
    const out = renderCrawl({ site: "https://a", bing: { stats: [{ x: 1 }], issues: [{ y: 1 }, { y: 2 }] }, bingError: null });
    expect(out).toContain("2 erreur(s) de crawl");
    expect(out).not.toContain("aucune erreur de crawl remontée par Bing");
  });
});

describe("pas de tiret cadratin", () => {
  // Le filet doit voir chaque chaîne littérale de render.ts au moins une fois : sinon un tiret injecté
  // dans une branche non exercée passerait la suite sans être vu (trouvaille de la revue du 29/08).
  test("aucune sortie n'en contient, sur toutes les branches de rendu", () => {
    const sitesPleine = renderSites({ google: [{ property: prop, sitemaps: [sitemap] }], googleError: null, bing: [], bingError: null });
    const sitesSansSitemap = renderSites({ google: [{ property: prop, sitemaps: [] }], googleError: null, bing: [], bingError: null });
    const sitesSansDetail = renderSites({ google: [{ property: prop, sitemaps: [{ ...sitemap, contents: [] }] }], googleError: null, bing: [], bingError: null });
    const sitesBingPeuple = renderSites({
      google: [], googleError: null,
      bing: [
        { site: { Url: "https://x.com", IsVerified: true }, feeds: [1, 2] },
        { site: { Url: "https://y.com", IsVerified: false }, feeds: [] },
      ],
      bingError: null,
    });
    const sitesGoogleEnErreur = renderSites({ google: null, googleError: "jeton refusé ou expiré", bing: [], bingError: null });

    const inspectAvecLien = renderInspect({
      url: "https://romain-ecarnot.com/", property: prop,
      google: { link: "https://search.google.com/x", status: known }, googleError: null, bing: null, bingError: "clé absente",
    });
    const inspectMismatch = renderInspect({
      url: "https://a/", property: prop,
      google: { link: null, status: { ...known, userCanonical: "https://a/" } }, googleError: null, bing: null, bingError: null,
    });
    const inspectSansEtat = renderInspect({ url: "https://a/", property: prop, google: { link: null, status: null }, googleError: null, bing: null, bingError: null });
    const inspectBingType = renderInspect({
      url: "https://a/", property: prop, google: null, googleError: "x",
      bing: { __type: "UrlInfo:#Microsoft.Bing.Webmaster.Api" }, bingError: null,
    });

    const crawlSansDonnees = renderCrawl({ site: "https://a", bing: null, bingError: null });
    const crawlSansErreur = renderCrawl({ site: "https://a", bing: { stats: [{ x: 1 }], issues: [] }, bingError: null });
    const crawlAvecErreurs = renderCrawl({ site: "https://a", bing: { stats: [{ x: 1 }], issues: [{ y: 1 }, { y: 2 }] }, bingError: null });

    const sorties = [
      sitesPleine, sitesSansSitemap, sitesSansDetail, sitesBingPeuple, sitesGoogleEnErreur,
      inspectAvecLien, inspectMismatch, inspectSansEtat, inspectBingType,
      crawlSansDonnees, crawlSansErreur, crawlAvecErreurs,
    ];
    for (const o of sorties) expect(o).not.toContain("—");
  });
});
