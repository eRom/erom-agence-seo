// plugin/lib/resolve.ts
// Search Console a deux sortes de propriété et l'API exige le nom exact (D33) : on choisit dans ce que
// sites.list a rendu, on ne fabrique jamais un siteUrl à partir d'un hôte.
import { sameSite } from "./url";

export type Property = { siteUrl: string; permissionLevel: string };
export type BingSite = { Url: string; IsVerified: boolean };

const DOMAIN_PREFIX = "sc-domain:";

/** Origine en minuscules, chemin tel quel : un serveur ignore la casse de l'hôte, pas celle du chemin. */
function normalizePrefix(u: string): string | null {
  try { const x = new URL(u); return `${x.origin.toLowerCase()}${x.pathname}`; } catch { return null; }
}

/**
 * La propriété qui couvre cette URL, ou null.
 * 1. Les propriétés en préfixe d'URL qui préfixent l'URL ; la plus longue gagne.
 * 2. Sinon les propriétés Domaine dont le domaine est l'hôte ou son suffixe ; la plus spécifique gagne.
 * Le préfixe s'arrête à une frontière de segment : `.../blog` couvre `.../blog` et `.../blog/x`, jamais `.../blogging`.
 */
export function resolveProperty(url: string, properties: Property[]): Property | null {
  const target = normalizePrefix(url);
  if (target === null) return null;
  const host = new URL(url).hostname.toLowerCase();
  const prefixes = properties
    .filter((p) => !p.siteUrl.startsWith(DOMAIN_PREFIX))
    .map((p) => ({ p, n: normalizePrefix(p.siteUrl) }))
    .filter(({ n }) => n !== null && (target === n || target.startsWith(n.endsWith("/") ? n : `${n}/`)))
    .sort((a, b) => b.n!.length - a.n!.length);
  if (prefixes.length > 0) return prefixes[0].p;
  const domains = properties
    .filter((p) => p.siteUrl.startsWith(DOMAIN_PREFIX))
    .map((p) => ({ p, d: p.siteUrl.slice(DOMAIN_PREFIX.length).toLowerCase() }))
    .filter(({ d }) => host === d || host.endsWith(`.${d}`))
    .sort((a, b) => b.d.length - a.d.length);
  return domains.length > 0 ? domains[0].p : null;
}

/** Le site du compte Bing qui correspond à cet hôte, apex et www confondus (sameSite). */
export function resolveBingSite(host: string, sites: BingSite[]): BingSite | null {
  return sites.find((s) => sameSite(s.Url, `https://${host}`)) ?? null;
}
