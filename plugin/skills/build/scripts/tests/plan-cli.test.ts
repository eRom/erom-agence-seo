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

/**
 * Le même site, avec en plus un audit niveau 2 plus récent (report-n2.md, 0 trouvaille, IDX-04 non applicable en
 * local) : celui que plan.ts choisit par défaut (dernier par date). Sert R-6 : ses hors build de niveau 0 doivent
 * être rapatriés depuis l'audit n0 plus ancien.
 */
async function fakeSiteWithN2(): Promise<string> {
  const cwd = await fakeSite();
  const audit = join(cwd, "seo/audits/2026-08-29-n2");
  await mkdir(join(audit, "derived"), { recursive: true });
  await cp(`${F}/report-n2.md`, join(audit, "report.md"));
  await cp(`${F}/pages.json`, join(audit, "derived/pages.json"));
  await cp(`${F}/strategy-eval.json`, join(audit, "derived/strategy-eval.json"));
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

describe("plan.ts, hors build de l'audit niveau 0 fusionnés dans le plan (R-6)", () => {
  test("le dernier audit (n2, sans IDX-04) part chercher IDX-04 dans le n0 plus ancien", async () => {
    const cwd = await fakeSiteWithN2();
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const out = r.stdout.toString();
    expect(out).toContain("dossier : seo/audits/2026-08-29-n2");
    expect(out).toContain("plan : 1 trouvailles ouvertes");
    const plan = JSON.parse(await Bun.file(join(cwd, "seo/audits/2026-08-29-n2/derived/build-plan.json")).text());
    expect(plan.findings).toHaveLength(1);
    expect(plan.findings[0]).toMatchObject({ id: "IDX-04", kind: "hors-build", origine: "seo/audits/2026-08-28-n0" });
    expect(plan.findings[0].ou).toContain("Vercel");
  });
  test("audit n2 ciblé explicitement mais identique au seul n0 disponible : rien à fusionner", async () => {
    const cwd = await fakeSite();
    const r = Bun.spawnSync(["bun", CLI, "--audit", "seo/audits/2026-08-28-n0"], { cwd });
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    // Cet audit est lui-même niveau 0 : la fusion ne se déclenche que pour un plan parti d'un niveau 2.
    expect(r.stdout.toString()).toContain("plan : 12 trouvailles ouvertes");
  });
  test("--audit pointe déjà sur le dernier n0 : même dossier des deux côtés, rien à fusionner", async () => {
    const cwd = await fakeSiteWithN2();
    // On force le plan sur le n0 lui-même (niveau 0) : latestAuditDir(level:0) rendrait ce même dossier, donc ignoré.
    const r = Bun.spawnSync(["bun", CLI, "--audit", "seo/audits/2026-08-28-n0"], { cwd });
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(r.stdout.toString()).toContain("plan : 12 trouvailles ouvertes");
  });
});

describe("plan.ts, rapport niveau 0 illisible", () => {
  test("le plan sort quand même, sans hors build rapatrié, et le dit sur stderr", async () => {
    const cwd = await fakeSiteWithN2();
    await Bun.write(join(cwd, "seo/audits/2026-08-28-n0/report.md"), "pas un rapport");
    const r = Bun.spawnSync(["bun", CLI], { cwd });
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(r.stderr.toString()).toContain("attention : rapport niveau 0 seo/audits/2026-08-28-n0/report.md illisible");
    const plan = JSON.parse(await Bun.file(join(cwd, "seo/audits/2026-08-29-n2/derived/build-plan.json")).text());
    expect(plan.findings).toEqual([]);
  });
});
