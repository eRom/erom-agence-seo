// plugin/skills/console/scripts/lib/render.ts
// Une ligne par fait, jamais un tableau (lecture sur mobile), jamais un tiret cadratin.
// Un moteur qui n'a pas répondu écrit sa raison ; il ne laisse jamais un blanc.
import type { Property, BingSite } from "../../../../lib/resolve";
import { canonicalMismatch, type Inspection, type SitemapInfo } from "../../../../lib/gsc";
import { parseDotNetDate, DATE_JAMAIS } from "../../../../lib/bing";

export type SitesView = {
  google: { property: Property; sitemaps: SitemapInfo[] | null }[] | null; googleError: string | null;
  bing: { site: BingSite; feeds: unknown[] | null }[] | null; bingError: string | null;
};
export type InspectView = {
  url: string; property: Property | null;
  google: Inspection | null; googleError: string | null;
  bing: Record<string, unknown> | null; bingError: string | null;
};
export type CrawlView = { site: string; bing: { stats: unknown[]; issues: unknown[] } | null; bingError: string | null };

/** Une ligne seulement si la valeur est là : un champ absent ne s'affiche pas comme vide. */
const line = (k: string, v: string | null): string[] => (v ? [`  ${k} : ${v}`] : []);

/** Décode une date .NET Bing en ISO. Rend `secours` sur la sentinelle DATE_JAMAIS ou une valeur absente. */
function bingDate(v: unknown, secours: string | null = null): string | null {
  const ms = parseDotNetDate(v);
  return ms === null || ms <= DATE_JAMAIS ? secours : new Date(ms).toISOString();
}

export function renderSites(v: SitesView): string {
  const out: string[] = ["Google Search Console"];
  if (v.googleError) out.push(`  ${v.googleError}`);
  else if (!v.google || v.google.length === 0) out.push("  aucune propriété visible par ce compte");
  else for (const g of v.google) {
    out.push(`  ${g.property.siteUrl} (${g.property.permissionLevel})`);
    if (g.sitemaps === null) out.push("    sitemaps non lisibles pour cette propriété");
    else if (g.sitemaps.length === 0) out.push("    aucun sitemap déclaré");
    else for (const s of g.sitemaps) {
      const c = s.contents[0];
      const chiffres = c ? `soumis ${c.submitted ?? "?"}, indexé ${c.indexed ?? "?"}` : "sans détail";
      out.push(`    ${s.path} : ${chiffres}, ${s.errors ?? "?"} erreurs, ${s.warnings ?? "?"} avertissements`);
      out.push(...line("  soumis le", s.lastSubmitted), ...line("  lu le", s.lastDownloaded));
    }
  }
  out.push("", "Bing Webmaster Tools");
  if (v.bingError) out.push(`  ${v.bingError}`);
  else if (!v.bing || v.bing.length === 0) out.push("  aucun site dans ce compte Bing");
  else for (const b of v.bing) {
    out.push(`  ${b.site.Url} (${b.site.IsVerified ? "vérifié" : "non vérifié"})`);
    if (b.feeds === null) out.push("    flux non lisibles");
    else if (b.feeds.length === 0) out.push("    aucun flux déclaré");
    else for (const flux of b.feeds) {
      const f = (flux ?? {}) as Record<string, unknown>;
      out.push(`    ${typeof f.Url === "string" ? f.Url : "flux sans URL"}`);
      out.push(...line("  statut", typeof f.Status === "string" ? f.Status : null));
      out.push(...line("  soumis le", bingDate(f.Submitted)));
      out.push(...line("  dernier crawl", bingDate(f.LastCrawled)));
      out.push(...line("  URLs", typeof f.UrlCount === "number" ? String(f.UrlCount) : null));
    }
  }
  return out.join("\n");
}

/** Ce que Bing dit quand il n'a rien sur cette URL, ou que le site n'est pas dans le compte (spec section 5.4). */
const HORS_INDEX = "pas dans l'index Bing, ou site hors du compte";

export function renderInspect(v: InspectView): string {
  const out: string[] = [`URL : ${v.url}`, "", "Google Search Console"];
  // La propriété et son rôle s'écrivent avant tout branchement : sur un 403, c'est le rôle qui explique
  // le refus, et le laisser dans la branche du succès le rendrait invisible exactement quand il sert.
  if (v.property) out.push(`  propriété : ${v.property.siteUrl} (${v.property.permissionLevel})`);
  if (v.googleError) out.push(`  ${v.googleError}`);
  else if (!v.google?.status) out.push("  aucun état renvoyé par Google");
  else {
    const s = v.google.status;
    out.push(`  verdict : ${s.verdict}`, `  couverture : ${s.coverageState}`);
    out.push(
      ...line("robots.txt", s.robotsTxtState), ...line("indexation", s.indexingState),
      ...line("dernier crawl", s.lastCrawlTime), ...line("récupération", s.pageFetchState),
      ...line("exploré en", s.crawledAs),
      ...line("canonical retenu par Google", s.googleCanonical), ...line("canonical déclaré", s.userCanonical),
    );
    if (canonicalMismatch(s)) out.push("  attention : Google a retenu un autre canonical que celui déclaré");
    out.push(...line("voir", v.google.link));
  }
  out.push("", "Bing Webmaster Tools");
  if (v.bingError) out.push(`  ${v.bingError}`);
  else if (!v.bing) out.push(`  ${HORS_INDEX}`);
  else {
    // Une URL inconnue de Bing ne rend pas null : un objet complet dont les dates valent DateTime.MinValue
    // (capture du 29/08, GetUrlInfo sur /page-qui-nexiste-pas). C'est la sentinelle qui dit « jamais découverte ».
    const decouverte = parseDotNetDate(v.bing.DiscoveryDate);
    if (decouverte === null || decouverte <= DATE_JAMAIS) out.push(`  ${HORS_INDEX}`);
    else {
      out.push(`  découverte le : ${new Date(decouverte).toISOString()}`);
      out.push(`  dernier crawl : ${bingDate(v.bing.LastCrawledDate, "jamais")}`);
      const taille = v.bing.DocumentSize;
      if (typeof taille === "number" && taille !== 0) out.push(`  taille : ${taille} octets`);
      const liens = v.bing.AnchorCount;
      if (typeof liens === "number" && liens !== 0) out.push(`  liens entrants : ${liens}`);
      const sousUrl = v.bing.TotalChildUrlCount;
      if (typeof sousUrl === "number" && sousUrl !== 0) out.push(`  sous-URL connues : ${sousUrl}`);
      // HttpStatus vaut 0 même sur une URL connue et indexée (capture du 29/08, romain-ecarnot.com/) :
      // ce n'est pas un discriminant, l'afficher induirait en erreur. Url n'est pas répétée, __type et
      // IsPage ne disent rien à l'écran.
    }
  }
  return out.join("\n");
}

export function renderCrawl(v: CrawlView): string {
  const out: string[] = [
    `Site : ${v.site}`, "",
    "Google Search Console", "  Google : pas de statistiques de crawl en API", "",
    "Bing Webmaster Tools",
  ];
  if (v.bingError) out.push(`  ${v.bingError}`);
  else if (!v.bing) out.push("  aucune statistique lue");
  else {
    out.push(`  ${v.bing.stats.length} entrée(s) de statistiques`);
    out.push(v.bing.issues.length === 0 ? "  aucune erreur de crawl remontée par Bing" : `  ${v.bing.issues.length} erreur(s) de crawl`);
  }
  return out.join("\n");
}
