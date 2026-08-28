// Lecture d'un fichier de recettes (skills/build/references/*.md) : un bloc `### Titre (ID, ID)` par recette, champs
// `Fichiers`, `Recette` (suivi d'un bloc de code, ignoré ici), `Piège` (répétable), `Source` (URL « citation »).
import { OFFICIAL_DOMAINS } from "../../../audit/scripts/lib/checks";

export type RecipeSource = { url: string; quote: string; manual: boolean };
export type Recipe = { title: string; ids: string[]; fichiers: string; pieges: string[]; sources: RecipeSource[] };

/** Domaines admis pour les sources d'une recette : la doc du framework et de l'hébergeur, plus ceux des moteurs. */
export const BUILD_DOMAINS: string[] = ["nextjs.org", "vercel.com", "react.dev", ...OFFICIAL_DOMAINS];

export function allowedBuildDomain(url: string): boolean {
  try { const h = new URL(url).hostname; return BUILD_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; }
}

export function parseRecipes(md: string): Recipe[] {
  const out: Recipe[] = [];
  let cur: Recipe | null = null;
  let inFence = false;
  for (const raw of md.split("\n")) {
    if (/^\s*```/.test(raw)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = raw.match(/^###\s+(.+?)\s*\(([A-Z]+-\d{2}(?:\s*,\s*[A-Z]+-\d{2})*)\)\s*$/);
    if (h) { cur = { title: h[1].trim(), ids: h[2].split(",").map((s) => s.trim()), fichiers: "", pieges: [], sources: [] }; out.push(cur); continue; }
    if (!cur) continue;
    const m = raw.match(/^(Fichiers|Piège|Source)\s*:\s*(.*)$/);
    if (!m) continue;
    const val = m[2].trim();
    if (m[1] === "Fichiers") cur.fichiers = val;
    else if (m[1] === "Piège") cur.pieges.push(val);
    else {
      const s = val.match(/^(\S+)\s+«\s*(.*?)\s*»\s*(\[manuel\])?\s*$/);
      cur.sources.push(s ? { url: s[1], quote: s[2], manual: Boolean(s[3]) } : { url: val, quote: "", manual: false });
    }
  }
  return out;
}
