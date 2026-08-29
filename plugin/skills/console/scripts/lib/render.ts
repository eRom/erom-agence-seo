// plugin/skills/console/scripts/lib/render.ts
// Une ligne par fait, jamais un tableau (lecture sur mobile), jamais un tiret cadratin.
// Un moteur qui n'a pas répondu écrit sa raison ; il ne laisse jamais un blanc.
import type { Property, BingSite } from "./resolve";
import { canonicalMismatch, type Inspection, type SitemapInfo } from "./gsc";

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
    out.push(b.feeds === null ? "    flux non lisibles" : `    ${b.feeds.length} flux déclaré(s)`);
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
    // Les champs d'UrlInfo n'ont jamais été capturés (incertitude 1) : on affiche ce que Bing envoie,
    // sans en inventer. Le `__type` de l'enveloppe .NET ne sert à rien à l'écran.
    const avant = out.length;
    for (const [k, val] of Object.entries(v.bing)) if (!k.startsWith("__")) out.push(`  ${k} : ${String(val)}`);
    // Une enveloppe .NET réduite à son `__type` laisserait la section vide, ce que la règle interdit.
    if (out.length === avant) out.push(`  ${HORS_INDEX}`);
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
