#!/usr/bin/env bun
import { OFFICIAL_DOMAINS } from "./lib/checks";

const path = Bun.argv[2];
if (!path) { console.error("usage : bun lint-report.ts <report.md>"); process.exit(2); }
const md = await Bun.file(path).text();
const errors: string[] = [];

if (md.includes("—")) errors.push("em dash présent");
for (const h of ["## En bref", "## Trouvailles", "## Ce que je n'ai pas pu voir", "## Vérifications passées", "## Annexe : collecte"]) if (!md.includes(h)) errors.push(`section manquante : ${h}`);

const blocks = md.split(/^### \[/m).slice(1);
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
const ids = blocks.map((b) => b.split("\n")[0].match(/([A-Z]+-\d{2})/)?.[1]).filter(Boolean);
if (new Set(ids).size !== ids.length) errors.push("un id apparaît deux fois dans les trouvailles");

if (errors.length) { console.log(errors.map((e) => `ERREUR  ${e}`).join("\n")); process.exit(1); }
console.log(`rapport conforme : ${blocks.length} trouvailles`);
