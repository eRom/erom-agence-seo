// Le catalogue de vérifications (plugin/skills/audit/references/checks/) et la constante
// PREFIXES de contrat.ts n'ont aucun lien mécanique : ce test dérive la liste des préfixes
// depuis les fichiers du catalogue et la compare à la constante, pour qu'une famille ajoutée un
// jour ne puisse pas fuiter en clair chez le client sans qu'un test ne tombe.
import { describe, test, expect } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { PREFIXES } from "../lib/contrat";

const DIR_CHECKS = join(import.meta.dir, "..", "..", "..", "audit", "references", "checks");

/** Les préfixes de tous les identifiants (AI-01, IDX-06, ...) trouvés dans les fichiers du
 *  catalogue, dérivés du contenu, jamais d'une correspondance de noms de fichiers supposée. */
async function prefixesDuCatalogue(): Promise<Set<string>> {
  const fichiers = (await readdir(DIR_CHECKS)).filter((f) => f.endsWith(".md"));
  const prefixes = new Set<string>();
  for (const fichier of fichiers) {
    const texte = await Bun.file(join(DIR_CHECKS, fichier)).text();
    for (const m of texte.matchAll(/\b([A-Z]+)-\d{2}\b/g)) prefixes.add(m[1]);
  }
  return prefixes;
}

describe("PREFIXES (contrat.ts) contre le catalogue de vérifications", () => {
  test("aucun préfixe du catalogue n'est absent de PREFIXES", async () => {
    const duCatalogue = await prefixesDuCatalogue();
    const connus = new Set<string>(PREFIXES);
    const manquants = [...duCatalogue].filter((p) => !connus.has(p)).sort();
    if (manquants.length > 0) {
      throw new Error(
        `nouvelle famille de vérifications dans le catalogue, absente de PREFIXES : ${manquants.join(", ")}. ` +
        `Ajouter ce(s) préfixe(s) à PREFIXES dans plugin/skills/rapport/scripts/lib/contrat.ts, ` +
        `sans quoi idsVisibles() ne détecterait plus ces identifiants s'ils fuitaient dans le texte visible du client.`,
      );
    }
  });

  test("PREFIXES ne porte aucun préfixe orphelin, absent du catalogue", async () => {
    const duCatalogue = await prefixesDuCatalogue();
    const orphelins = PREFIXES.filter((p) => !duCatalogue.has(p));
    expect(orphelins).toEqual([]);
  });

  test("PREFIXES et le catalogue coïncident exactement", async () => {
    const duCatalogue = [...(await prefixesDuCatalogue())].sort();
    expect([...PREFIXES].sort()).toEqual(duCatalogue);
  });
});
