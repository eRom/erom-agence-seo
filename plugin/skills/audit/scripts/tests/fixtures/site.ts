/** Site jouet pour les tests d'intégration et la recette AC-3. `bun tests/fixtures/site.ts` le sert sur le port 8787. */
const page = (title: string, extraHead: string, body: string) =>
  `<!DOCTYPE html><html lang="fr"><head><title>${title}</title><meta name="description" content="${title} - description">${extraHead}</head><body><h1>${title}</h1><p>${"Contenu réel visible sans JavaScript. ".repeat(20)}</p></body></html>`;

/**
 * `homeInSitemap` : le sitemap liste aussi la home, montage courant qui coûtait un slot de plafond avant le correctif.
 * `prodHost` : les locs a/b/c du sitemap sont construites sur cet hôte de prod au lieu de l'origine servie (niveau 2).
 */
export function startFixtureSite(port = 0, opts: { homeInSitemap?: boolean; prodHost?: string } = {}) {
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
        case "/sitemap-pages.xml": {
          // la dernière loc est volontairement hors site : elle doit être écartée ET comptée, jamais écartée en silence
          const base = opts.prodHost ? `https://${opts.prodHost}` : origin;
          const locs = [...(opts.homeInSitemap ? [`${base}/`] : []), `${base}/a`, `${base}/b`, `${base}/c`, "https://autre.fr/hors-site"];
          return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`, { headers: { "content-type": "application/xml" } });
        }
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
