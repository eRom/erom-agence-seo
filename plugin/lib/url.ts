// Primitives d'URL partagées par les skills. Extraites de skills/audit/scripts/lib/sitemap.ts le 30/08
// (D40) : `plugin/lib/` ne doit dépendre d'aucune skill, et resolve.ts avait besoin de sameSite.
// Aucune logique n'a changé pendant le déplacement.

/** Retire un seul « www. » de tête, casse ignorée. */
function bareHost(host: string): string {
  const h = host.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

/** Hôte comparable d'une URL, null si elle n'est pas analysable. Le port fait partie de l'identité du site. */
function comparableHost(u: string): string | null {
  try { return bareHost(new URL(u).host); } catch { return null; }
}

/**
 * Même site : même hôte à un « www. » près, schéma indifférent. Un sitemap qui liste ses URLs sur l'apex alors que le
 * site est servi en www (ou l'inverse) reste chez lui ; c'est un montage courant, l'exclure vide l'audit en silence.
 * Les URLs ne sont jamais réécrites : la chaîne de redirection collectée reste la preuve du montage réel.
 */
export function sameSite(u: string, origin: string): boolean {
  const a = comparableHost(u);
  const b = comparableHost(origin);
  return a !== null && b !== null && a === b;
}

/** Clé d'unicité d'une page, sans schéma ni « www. » : la home listée en apex et servie en www est la même page. */
export function pageKey(u: string): string {
  try { const p = new URL(u); return `${bareHost(p.host)}${p.pathname}${p.search}`; } catch { return u; }
}

/** Même chemin et même requête, mais sur l'origine donnée. Rend null si l'URL est inanalysable. */
export function rewriteToOrigin(u: string, origin: string): string | null {
  try {
    const p = new URL(u);
    const o = new URL(origin);
    p.protocol = o.protocol;
    p.host = o.host;
    return p.toString();
  } catch { return null; }
}
