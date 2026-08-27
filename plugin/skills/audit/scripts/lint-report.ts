#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { OFFICIAL_DOMAINS, parseChecks } from "./lib/checks";

/** Isole le contenu d'une section `## titre` jusqu'au prochain `## ` (ou fin de fichier). */
function section(md: string, heading: string): string {
  const i = md.indexOf(heading);
  if (i < 0) return "";
  const rest = md.slice(i + heading.length);
  const next = rest.search(/\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

function findingBlocks(md: string): string[] {
  return md.split(/^### \[/m).slice(1);
}

/**
 * Ids des vérifications de niveau 0 déclarées dans references/checks/*.md.
 * Choix assumé pour ce chantier : scope niveau 0 uniquement (aucun audit de niveau 2 n'existe encore en pratique,
 * il arrivera avec le chantier 2 ; l'invariant sera étendu à ce moment-là).
 */
async function level0Ids(checksDir: string): Promise<string[]> {
  const files = (await readdir(checksDir)).filter((f) => f.endsWith(".md"));
  const all: ReturnType<typeof parseChecks> = [];
  for (const f of files) all.push(...parseChecks(await Bun.file(`${checksDir}/${f}`).text()));
  return all.filter((c) => c.niveau === 0).map((c) => c.id);
}

/** Lint pur : rend la liste des erreurs (vide = rapport conforme). Ne touche ni au disque ni à process.exit. */
export async function lintReport(md: string, checksDir: string): Promise<string[]> {
  const errors: string[] = [];

  if (md.includes("—")) errors.push("em dash présent");
  for (const h of ["## En bref", "## Trouvailles", "## Ce que je n'ai pas pu voir", "## Vérifications passées", "## Annexe : collecte"]) if (!md.includes(h)) errors.push(`section manquante : ${h}`);

  const blocks = findingBlocks(md);
  for (const b of blocks) {
    const head = b.split("\n")[0];
    const m = head.match(/^(Critique|Important|Mineur|Info)\]\s+([A-Z]+-\d{2})\s*:/);
    if (!m) { errors.push(`en-tête de trouvaille mal formé : ${head}`); continue; }
    const id = m[2];
    for (const f of ["Preuve", "Pourquoi", "Source", "Correctif", "Effort"]) if (!new RegExp(`^${f}\\s*:`, "m").test(b)) errors.push(`${id} : champ ${f} manquant`);
    const src = b.match(/^Source\s*:\s*(\S+)\s+«/m);
    if (!src) errors.push(`${id} : Source sans URL ou sans citation`);
    else {
      const host = new URL(src[1]).hostname;
      if (!OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) errors.push(`${id} : source hors domaines admis : ${src[1]}`);
    }
    if (!/^Effort\s*:\s*(rapide|moyen|lourd)\s*$/m.test(b)) errors.push(`${id} : Effort doit valoir rapide, moyen ou lourd`);
  }
  const findingIds = blocks.map((b) => b.split("\n")[0].match(/([A-Z]+-\d{2})/)?.[1]).filter(Boolean) as string[];
  if (new Set(findingIds).size !== findingIds.length) errors.push("un id apparaît deux fois dans les trouvailles");

  // R-1 : chaque vérification du niveau 0 doit apparaître exactement une fois dans l'union de Trouvailles,
  // Vérifications passées, et Ce que je n'ai pas pu voir (comme trouvaille, ligne "ID nom", ou id cité littéralement
  // avec sa raison). Absente des trois ou présente dans plus d'une : erreur.
  const passedSection = section(md, "## Vérifications passées");
  const passedIds = new Set([...passedSection.matchAll(/^([A-Z]+-\d{2})\b/gm)].map((m) => m[1]));
  const notSeenSection = section(md, "## Ce que je n'ai pas pu voir");
  for (const id of await level0Ids(checksDir)) {
    const where = [
      findingIds.includes(id) ? "trouvailles" : null,
      passedIds.has(id) ? "passées" : null,
      new RegExp(`\\b${id}\\b`).test(notSeenSection) ? "non vues" : null,
    ].filter((x): x is string => x !== null);
    if (where.length === 0) errors.push(`${id} : absent du rapport (ni trouvaille, ni passée, ni « non vue » avec sa raison)`);
    else if (where.length > 1) errors.push(`${id} : présent dans plus d'une section (${where.join(", ")})`);
  }

  return errors;
}

if (import.meta.main) {
  const path = Bun.argv[2];
  if (!path) { console.error("usage : bun lint-report.ts <report.md>"); process.exit(2); }
  const md = await Bun.file(path).text();
  const checksDir = `${import.meta.dir}/../references/checks`;
  const errors = await lintReport(md, checksDir);
  if (errors.length) { console.log(errors.map((e) => `ERREUR  ${e}`).join("\n")); process.exit(1); }
  console.log(`rapport conforme : ${findingBlocks(md).length} trouvailles`);
}
