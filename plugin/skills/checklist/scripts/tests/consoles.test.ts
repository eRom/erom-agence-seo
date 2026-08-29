import { describe, test, expect } from "bun:test";
import { parseRecipes } from "../../../build/scripts/lib/recipes";
import { OFFICIAL_DOMAINS } from "../../../audit/scripts/lib/checks";
import { LINES } from "../lib/checklist";

const CONSOLES = await Bun.file(`${import.meta.dir}/../../references/consoles.md`).text();
const DOMAINS = [...OFFICIAL_DOMAINS, "learn.microsoft.com", "search.google.com"];
const allowed = (url: string) => { try { const h = new URL(url).hostname; return DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; } };

describe("references/consoles.md", () => {
  const entries = parseRecipes(CONSOLES);
  test("chaque entrée porte un id de ligne connu, un chemin de clics et au moins une source officielle", () => {
    expect(entries.length).toBeGreaterThan(0);
    const ids = new Set(LINES.map((l) => l.id));
    for (const e of entries) {
      for (const id of e.ids) expect(ids.has(id), `${e.title} : ${id} n'est pas une ligne de la checklist`).toBe(true);
      expect(e.sources.length, `${e.title} : aucune source`).toBeGreaterThan(0);
      for (const s of e.sources) expect(allowed(s.url), `${e.title} : ${s.url}`).toBe(true);
      const real = e.sources.filter((s) => !s.manual);
      expect(real.length, `${e.title} : au moins une source vérifiable par check-sources.ts`).toBeGreaterThan(0);
      for (const s of real) expect(s.quote, `${e.title} : citation vide`).not.toBe("");
    }
  });
  test("chaque ligne à la main ou action de la checklist a son entrée", () => {
    const covered = new Set(entries.flatMap((e) => e.ids));
    for (const l of LINES.filter((l) => l.kind !== "auto" || l.id === "CL-07" || l.id === "CL-08")) expect(covered.has(l.id), `${l.id} ${l.label} sans entrée dans consoles.md`).toBe(true);
  });
  test("un chemin de clics par entrée, en français, sans em dash", () => {
    expect(CONSOLES.includes("—")).toBe(false);
    const blocks = CONSOLES.split(/^### /m).slice(1);
    expect(blocks.length).toBe(entries.length);
    for (const b of blocks) expect(b, `${b.split("\n")[0]} : ligne « Chemin : » manquante`).toMatch(/^Chemin\s*:/m);
  });
});
