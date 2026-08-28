// Lecture du rapport d'audit (report.md). Le format est tenu par skills/audit/scripts/lint-report.ts ; ce parseur suit
// les mêmes règles. Partagé par build (chantier 3) et launch (chantier 4).
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export type Severity = "Critique" | "Important" | "Mineur" | "Info";
export const SEVERITIES: readonly Severity[] = ["Critique", "Important", "Mineur", "Info"];
export type Finding = { severity: Severity; id: string; title: string; preuve: string; pourquoi: string; source: string; correctif: string; effort: string };
export type Report = {
  site: string; date: string; niveau: number; couche: boolean; nbPages: number; nbChecks: number;
  findings: Finding[]; passed: string[]; notSeen: string; counts: Record<Severity, number>;
};

export class ReportError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "ReportError"; }
}

const FIELDS = ["Preuve", "Pourquoi", "Source", "Correctif", "Effort"] as const;
const FIELD_LINE = /^(Preuve|Pourquoi|Source|Correctif|Effort)\s*:\s?(.*)$/;

/** Contenu d'une section `## titre` jusqu'au prochain `## ` (ou la fin), chaîne vide si absente. */
function section(md: string, heading: string): string {
  const i = md.indexOf(heading);
  if (i < 0) return "";
  const rest = md.slice(i + heading.length);
  const next = rest.search(/\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

function parseFindings(sec: string, errors: string[]): Finding[] {
  const out: Finding[] = [];
  for (const block of sec.split(/^### \[/m).slice(1)) {
    const [head, ...rest] = block.split("\n");
    const m = head.match(/^(Critique|Important|Mineur|Info)\]\s+([A-Z]+-\d{2})\s*:\s*(.+)$/);
    if (!m) { errors.push(`en-tête de trouvaille mal formé : ${head}`); continue; }
    const fields: Record<string, string> = {};
    let cur: string | null = null;
    for (const line of rest) {
      const f = line.match(FIELD_LINE);
      if (f) { cur = f[1]; fields[cur] = f[2]; continue; }
      // ligne de continuation (un Correctif sur plusieurs lignes, un JSON indenté) : rattachée au champ courant
      if (cur !== null && line.trim() !== "") fields[cur] += `\n${line.trimEnd()}`;
    }
    for (const name of FIELDS) if (fields[name] === undefined) errors.push(`${m[2]} : champ ${name} manquant`);
    out.push({
      severity: m[1] as Severity, id: m[2], title: m[3].trim(),
      preuve: (fields.Preuve ?? "").trim(), pourquoi: (fields.Pourquoi ?? "").trim(), source: (fields.Source ?? "").trim(),
      correctif: (fields.Correctif ?? "").trim(), effort: (fields.Effort ?? "").trim(),
    });
  }
  return out;
}

/** Lit un rapport conforme au gabarit. Lève ReportError si l'en-tête ou un bloc de trouvaille est illisible. */
export function parseReport(md: string): Report {
  const errors: string[] = [];
  const lines = md.split("\n");
  const site = lines[0]?.match(/^# Audit SEO\/GEO : (.+)$/)?.[1]?.trim();
  if (!site) errors.push("première ligne : « # Audit SEO/GEO : <site> » attendu");
  const head = lines.slice(0, 3).join("\n");
  const date = head.match(/(\d{4}-\d{2}-\d{2}) · Niveau/)?.[1];
  const niveau = head.match(/Niveau (\d)/)?.[1];
  const couche = head.match(/Couche stratégique : (oui|non)/)?.[1];
  const nbPages = head.match(/(\d+) pages? collectées?/)?.[1];
  const nbChecks = head.match(/(\d+) vérifications/)?.[1];
  if (!date || !niveau || !couche || !nbPages || !nbChecks) errors.push("en-tête : date, Niveau, Couche stratégique, pages collectées ou vérifications manquant dans les trois premières lignes");
  const findings = parseFindings(section(md, "## Trouvailles"), errors);
  const passed = [...section(md, "## Vérifications passées").matchAll(/^([A-Z]+-\d{2})\b/gm)].map((m) => m[1]);
  const notSeen = section(md, "## Ce que je n'ai pas pu voir").trim();
  if (errors.length) throw new ReportError(errors);
  const counts: Record<Severity, number> = { Critique: 0, Important: 0, Mineur: 0, Info: 0 };
  for (const f of findings) counts[f.severity]++;
  return { site: site!, date: date!, niveau: Number(niveau), couche: couche === "oui", nbPages: Number(nbPages), nbChecks: Number(nbChecks), findings, passed, notSeen, counts };
}

/** Trie les audits par date du nom, puis par nom (alphabétique), puis par mtime. */
export function sortAuditDirs<T extends { date: string; name: string; mtime: number }>(found: T[]): T[] {
  return [...found].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name) || a.mtime - b.mtime);
}

/**
 * Dernier dossier d'audit sous `<seoDir>/audits/` qui contient `file` (report.md par défaut) : par date du nom, puis par
 * date de modification du fichier (deux audits le même jour, niveaux 0 et 2 : le dernier écrit gagne). `level` restreint
 * au niveau demandé. Rend null s'il n'y en a aucun.
 */
export async function latestAuditDir(seoDir = "seo", opts: { level?: number; file?: string } = {}): Promise<string | null> {
  const file = opts.file ?? "report.md";
  const dir = join(seoDir, "audits");
  let names: string[];
  try { names = await readdir(dir); } catch { return null; }
  const found: { dir: string; date: string; name: string; mtime: number }[] = [];
  for (const n of names) {
    const m = n.match(/^(\d{4}-\d{2}-\d{2})-n(\d)(?:-\d+)?$/);
    if (!m || (opts.level !== undefined && Number(m[2]) !== opts.level)) continue;
    const f = Bun.file(join(dir, n, file));
    if (!(await f.exists())) continue;
    found.push({ dir: join(dir, n), date: m[1], name: n, mtime: f.lastModified });
  }
  return sortAuditDirs(found).at(-1)?.dir ?? null;
}
