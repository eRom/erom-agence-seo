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
