#!/usr/bin/env bun
// Refuse un rapport client qui ne tient pas le contrat de D47. Sort 1 en nommant chaque refus.
import { join } from "node:path";
import { verifier } from "./lib/verifier";

export async function lintDossier(dossier: string): Promise<string[]> {
  const client = await Bun.file(join(dossier, "rapport-client.md")).text();
  const rapport = await Bun.file(join(dossier, "report.md")).text();
  return verifier(client, rapport);
}

if (import.meta.main) {
  const dossier = process.argv[2];
  if (!dossier) { console.error("usage : lint-client.ts <dossier d'audit>"); process.exit(2); }
  const refus = await lintDossier(dossier);
  if (refus.length === 0) { console.log("rapport client conforme"); process.exit(0); }
  console.error(`rapport client refusé, ${refus.length} point(s) :`);
  for (const r of refus) console.error(`  - ${r}`);
  process.exit(1);
}
