import { describe, test, expect } from "bun:test";
import { lintStrategy } from "../../../../lib/strategy";

const template = await Bun.file(`${import.meta.dir}/../../references/strategy-template.md`).text();

describe("strategy-template.md", () => {
  test("le gabarit est lui-même conforme au lint", () => {
    expect(lintStrategy(template)).toEqual([]);
  });
  test("le gabarit porte les huit sections et les six colonnes", () => {
    for (const s of ["## Identité", "## Cibles", "## Concurrents", "## Pages ↔ mots-clés", "## Entité", "## Liens externes", "## Cadence de fraîcheur", "## Ce qu'on ne sait pas"]) expect(template).toContain(s);
    expect(template).toContain("| Page | Intention | Mot-clé principal | Secondaires | Cadence | Signaux |");
  });
});

describe("lint-strategy CLI", () => {
  const run = (path: string) => Bun.spawnSync(["bun", `${import.meta.dir}/../lint-strategy.ts`, path]);
  test("sort 0 sur le gabarit", () => {
    expect(run(`${import.meta.dir}/../../references/strategy-template.md`).exitCode).toBe(0);
  });
  test("sort 1 et nomme le défaut sur un fichier fautif", async () => {
    const bad = `${import.meta.dir}/bad-strategy.tmp.md`;
    await Bun.write(bad, template.replace("IndexNow : non", "IndexNow : abc"));
    const r = run(bad);
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString()).toContain("clé IndexNow mal formée");
  });
  test("sort 2 sans argument", () => {
    expect(Bun.spawnSync(["bun", `${import.meta.dir}/../lint-strategy.ts`]).exitCode).toBe(2);
  });
});
