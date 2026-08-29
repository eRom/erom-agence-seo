import { describe, test, expect } from "bun:test";
import { parseRecipes } from "../../../build/scripts/lib/recipes";
import { OFFICIAL_DOMAINS } from "../../../audit/scripts/lib/checks";

const ACCES = await Bun.file(`${import.meta.dir}/../../references/acces.md`).text();
const SKILL = await Bun.file(`${import.meta.dir}/../../SKILL.md`).text();
const DOMAINS = [...OFFICIAL_DOMAINS, "learn.microsoft.com", "search.google.com"];
const allowed = (url: string) => { try { const h = new URL(url).hostname; return DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; } };

describe("references/acces.md", () => {
  const entries = parseRecipes(ACCES);
  test("chaque entrée porte un id ACC-nn et au moins une source officielle réellement citée", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      for (const id of e.ids) expect(id, `${e.title}`).toMatch(/^ACC-\d{2}$/);
      expect(e.sources.length, `${e.title} : aucune source`).toBeGreaterThan(0);
      for (const s of e.sources) expect(allowed(s.url), `${e.title} : ${s.url}`).toBe(true);
      const real = e.sources.filter((s) => !s.manual);
      expect(real.length, `${e.title} : au moins une source vérifiable par check-sources.ts`).toBeGreaterThan(0);
      // Une citation vide est incluse par n'importe quelle page : check-sources.ts la déclarerait OK.
      for (const s of real) expect(s.quote, `${e.title} : citation vide`).not.toBe("");
    }
  });
  test("un chemin de clics par entrée, comme consoles.md", () => {
    const blocks = ACCES.split(/^### /m).slice(1);
    expect(blocks.length).toBe(entries.length);
    for (const b of blocks) expect(b, `${b.split("\n")[0]} : ligne « Chemin : » manquante`).toMatch(/^Chemin\s*:/m);
  });
  test("les deux gestes qui commandent tout sont couverts : bascule compte de service, délégation Bing", () => {
    const ids = entries.flatMap((e) => e.ids);
    expect(ids).toContain("ACC-04");
    expect(ids).toContain("ACC-06");
  });
  test("aucun tiret cadratin, ni dans la référence ni dans la skill", () => {
    expect(ACCES).not.toContain("—");
    expect(SKILL).not.toContain("—");
  });
});
