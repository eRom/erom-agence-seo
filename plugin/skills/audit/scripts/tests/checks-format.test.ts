import { describe, test, expect } from "bun:test";
import { readdir } from "node:fs/promises";
import { parseChecks, OFFICIAL_DOMAINS } from "../lib/checks";

const dir = `${import.meta.dir}/../../references/checks`;
const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
const all = [];
for (const f of files) all.push(...parseChecks(await Bun.file(`${dir}/${f}`).text()).map((c) => ({ ...c, file: f })));

describe("format des vérifications", () => {
  test("au moins une vérification par fichier", () => {
    for (const f of files) expect(all.some((c) => c.file === f), f).toBe(true);
  });
  test("identifiants uniques et bien formés", () => {
    const ids = all.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[A-Z]+-\d{2}$/);
  });
  test("chaque vérification a tous ses champs et des valeurs admises", () => {
    for (const c of all) {
      expect(["absolue", "stratégique"], c.id).toContain(c.couche);
      expect([0, 1, 2], c.id).toContain(c.niveau);
      expect(["Critique", "Important", "Mineur", "Info"], c.id).toContain(c.severite);
      expect(["rapide", "moyen", "lourd"], c.id).toContain(c.effort);
      for (const k of ["verifie", "comment", "correctif"] as const) expect(c[k].length, `${c.id} ${k}`).toBeGreaterThan(10);
    }
  });
  test("règle D5 : au moins une source officielle avec citation, domaine admis", () => {
    for (const c of all) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      for (const s of c.sources) {
        const host = new URL(s.url).hostname;
        expect(OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)), `${c.id} ${s.url}`).toBe(true);
        expect(s.quote.length, `${c.id} citation`).toBeGreaterThan(15);
      }
    }
  });
  test("aucun em dash dans les références", async () => {
    for (const f of files) expect(await Bun.file(`${dir}/${f}`).text(), f).not.toContain("—");
  });
});
