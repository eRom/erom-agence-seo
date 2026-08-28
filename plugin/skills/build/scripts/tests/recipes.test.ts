import { describe, test, expect } from "bun:test";
import { allowedBuildDomain, BUILD_DOMAINS, parseRecipes } from "../lib/recipes";
import { KINDS } from "../lib/plan";

const NEXTJS = await Bun.file(`${import.meta.dir}/../../references/nextjs.md`).text();

const SAMPLE = `# Recettes

## Pièges transverses
- rien

### Canonical (IDX-02)
Fichiers : app/layout.tsx
Recette  :
\`\`\`tsx
// Source : pas une source, on est dans un bloc de code
export const metadata = { alternates: { canonical: "/" } };
\`\`\`
Piège    : premier piège
Piège    : second piège
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « metadataBase is a convenience option »
Source   : https://example.com/x « à la main » [manuel]

### Deux ids (TAG-01, TAG-02)
Fichiers : page.tsx
Source   : https://nextjs.org/docs « x »
`;

describe("parseRecipes", () => {
  test("blocs, ids, champs ; un bloc de code n'est jamais lu", () => {
    const r = parseRecipes(SAMPLE);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({
      title: "Canonical", ids: ["IDX-02"], fichiers: "app/layout.tsx", pieges: ["premier piège", "second piège"],
      sources: [
        { url: "https://nextjs.org/docs/app/api-reference/functions/generate-metadata", quote: "metadataBase is a convenience option", manual: false },
        { url: "https://example.com/x", quote: "à la main", manual: true },
      ],
    });
    expect(r[1].ids).toEqual(["TAG-01", "TAG-02"]);
  });
  test("domaines admis : la doc du framework et de l'hébergeur, plus ceux des moteurs", () => {
    expect(BUILD_DOMAINS).toContain("nextjs.org");
    expect(BUILD_DOMAINS).toContain("developers.google.com");
    expect(allowedBuildDomain("https://nextjs.org/docs/app")).toBe(true);
    expect(allowedBuildDomain("https://vercel.com/docs/domains")).toBe(true);
    expect(allowedBuildDomain("https://example.com/")).toBe(false);
    expect(allowedBuildDomain("pas une url")).toBe(false);
  });
});

describe("references/nextjs.md", () => {
  const recipes = parseRecipes(NEXTJS);
  test("tout id de genre code ou texte a sa recette", () => {
    const covered = new Set(recipes.flatMap((r) => r.ids));
    for (const [id, k] of Object.entries(KINDS)) if (k.kind !== "hors-build") expect(covered.has(id), `${id} sans recette`).toBe(true);
  });
  test("chaque recette a des fichiers et au moins une source sur un domaine admis, sans em dash", () => {
    expect(recipes.length).toBeGreaterThan(0);
    for (const r of recipes) {
      expect(r.fichiers, `${r.title} sans Fichiers`).not.toBe("");
      expect(r.sources.length, `${r.title} sans Source`).toBeGreaterThan(0);
      for (const s of r.sources) { expect(allowedBuildDomain(s.url), `${r.title} : ${s.url}`).toBe(true); expect(s.quote, `${r.title} : citation vide`).not.toBe(""); }
    }
    expect(NEXTJS.includes("—")).toBe(false);
  });
});
