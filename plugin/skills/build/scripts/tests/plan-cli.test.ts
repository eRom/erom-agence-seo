import { describe, test, expect } from "bun:test";
import { cp, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const F = `${import.meta.dir}/fixtures/chico`;
const CLI = `${import.meta.dir}/../plan.ts`;

/** Un dépôt de site factice : seo/strategy.md, un audit n0 complet, un package.json avec next. */
async function fakeSite(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "erom-seo-build-"));
  const audit = join(cwd, "seo/audits/2026-08-28-n0");
  await mkdir(join(audit, "raw"), { recursive: true });
  await mkdir(join(audit, "derived"), { recursive: true });
  await cp(`${F}/strategy.md`, join(cwd, "seo/strategy.md"));
  await cp(`${F}/report.md`, join(audit, "report.md"));
  await cp(`${F}/manifest.json`, join(audit, "raw/manifest.json"));
  await cp(`${F}/pages.json`, join(audit, "derived/pages.json"));
  await cp(`${F}/strategy-eval.json`, join(audit, "derived/strategy-eval.json"));
  await Bun.write(join(cwd, "package.json"), JSON.stringify({ dependencies: { next: "16.1.1" } }));
  return cwd;
}

describe("plan.ts en ligne de commande", () => {
  test("écrit derived/build-plan.json dans le dernier audit et imprime le bilan", async () => {
    const cwd = await fakeSite();
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const out = r.stdout.toString();
    expect(out).toContain("dossier : seo/audits/2026-08-28-n0");
    expect(out).toContain("plan : 12 trouvailles ouvertes");
    const plan = JSON.parse(await Bun.file(join(cwd, "seo/audits/2026-08-28-n0/derived/build-plan.json")).text());
    expect(plan.stack).toBe("nextjs");
    expect(plan.canonicalBase.origin).toBe("https://www.commentchercherbonheur.org");
    expect(plan.findings).toHaveLength(12);
  });
  test("sans audit : exit 1 et message lisible", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "erom-seo-build-"));
    await mkdir(join(cwd, "seo"), { recursive: true });
    await cp(`${F}/strategy.md`, join(cwd, "seo/strategy.md"));
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("aucun audit avec rapport");
  });
  test("sans stratégie : exit 1, propose le verbe strategy", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "erom-seo-build-"));
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("/erom-seo:strategy");
  });
});
