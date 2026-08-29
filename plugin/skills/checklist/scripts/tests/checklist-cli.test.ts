import { describe, test, expect } from "bun:test";
import { cp, mkdir, mkdtemp, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const F = `${import.meta.dir}/fixtures/chico`;
const CLI = `${import.meta.dir}/../checklist.ts`;
/** Jamais la vraie clé dans un test : sans clé, aucune requête Bing ; sans --agir, aucune écriture. */
const ENV = { ...process.env, BING_WMT_API_KEY: "" };
const run = (cwd: string, ...args: string[]) => Bun.spawnSync(["bun", CLI, "--today", "2026-08-30", ...args], { cwd, env: ENV });

/** Un dépôt de site factice sur main avec un commit seo(…), la stratégie, un audit n0 du 28/08 et un n2 du 29/08 (vert). */
async function fakeSite(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "erom-seo-checklist-"));
  const n0 = join(cwd, "seo/audits/2026-08-28-n0");
  const n2 = join(cwd, "seo/audits/2026-08-29-n2");
  await mkdir(join(n0, "raw"), { recursive: true });
  await mkdir(n2, { recursive: true });
  await cp(`${F}/strategy.md`, join(cwd, "seo/strategy.md"));
  await cp(`${F}/report.md`, join(n0, "report.md"));
  await cp(`${F}/manifest.json`, join(n0, "raw/manifest.json"));
  await cp(`${F}/report-n2.md`, join(n2, "report.md"));
  const g = (...a: string[]) => { const r = Bun.spawnSync(["git", ...a], { cwd, env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }); if (r.exitCode !== 0) throw new Error(r.stderr.toString()); };
  g("init", "-q", "-b", "main"); g("add", "."); g("commit", "-q", "-m", "seo(IDX-02): canonical absolu");
  return cwd;
}

describe("checklist.ts en ligne de commande", () => {
  test("premier passage, pas déployé : moitié Avant d'après le n2 et git, moitié Après vide, fichier écrit", async () => {
    const cwd = await fakeSite();
    const r = run(cwd);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(r.stdout.toString()).toContain("fichier : seo/checklist.md");
    const md = await Bun.file(join(cwd, "seo/checklist.md")).text();
    expect(md).toContain("Mise en ligne : non · Dernier passage : 2026-08-30 · Audit local : seo/audits/2026-08-29-n2 · Audit prod : aucun");
    expect(md).toContain("- [x] Audit niveau 2 vert · auto · seo/audits/2026-08-29-n2/report.md · 0 Critique, 0 Important");
    expect(md).toMatch(/- \[x\] Branche seo-build fusionnée · auto · git : [0-9a-f]{7} seo\(IDX-02\): canonical absolu/);
    expect(md).toContain("- [ ] Hors build réglés · main ·");
    expect(md).toContain("  - IDX-04 :");
    expect(md).toContain("- [ ] Bing Webmaster Tools : site ajouté · main ·");
    expect(md).toContain("- [ ] Prod verte · auto · pas encore déployé");
    expect(md).toContain("- [ ] J+1 : sitemap soumis dans Search Console · main ·");
  });
  test("raw/ hors git : l'origine servie vient de derived/pages.json, sinon de la stratégie avec un avertissement (R-1)", async () => {
    // chico garde seo/**/raw/ hors git : le manifeste du n0 n'est plus sur le disque, derived/pages.json si
    const cwd = await fakeSite();
    await unlink(join(cwd, "seo/audits/2026-08-28-n0/raw/manifest.json"));
    await mkdir(join(cwd, "seo/audits/2026-08-28-n0/derived"), { recursive: true });
    await cp(`${F}/pages.json`, join(cwd, "seo/audits/2026-08-28-n0/derived/pages.json"));
    const r = run(cwd);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(r.stderr.toString()).not.toContain("origine prise dans la stratégie");
    expect(await Bun.file(join(cwd, "seo/checklist.md")).text()).toContain("  - https://www.commentchercherbonheur.org/methode");
    // ni manifeste ni pages.json : la stratégie, et on le dit
    await unlink(join(cwd, "seo/audits/2026-08-28-n0/derived/pages.json"));
    const r2 = run(cwd);
    expect(r2.exitCode, r2.stderr.toString()).toBe(0);
    expect(r2.stderr.toString()).toContain("origine prise dans la stratégie (https://commentchercherbonheur.org)");
    expect(await Bun.file(join(cwd, "seo/checklist.md")).text()).toContain("  - https://commentchercherbonheur.org/methode");
  });
  test("une case main cochée à la main survit ; la mise en ligne date les jalons et lit le n0 postérieur", async () => {
    const cwd = await fakeSite();
    expect(run(cwd).exitCode).toBe(0);
    const p = join(cwd, "seo/checklist.md");
    await Bun.write(p, (await Bun.file(p).text()).replace("- [ ] Search Console : propriété créée", "- [x] Search Console : propriété créée"));
    const r = run(cwd, "--mise-en-ligne", "2026-08-29");
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const md = await Bun.file(p).text();
    expect(md).toContain("- [x] Search Console : propriété créée");
    expect(md).toContain("Mise en ligne : 2026-08-29");
    expect(md).toContain("- [ ] J+90 2026-11-27 : audit de contrôle");
    // le seul n0 date du 28/08, avant la mise en ligne : la prod n'est pas jugée
    expect(md).toContain("- [ ] Prod verte · auto · aucun audit prod depuis la mise en ligne");
    expect(r.stderr.toString()).toContain("antérieur à la mise en ligne");
    // relancer sans option garde la date
    expect(run(cwd).exitCode).toBe(0);
    expect(await Bun.file(p).text()).toContain("Mise en ligne : 2026-08-29");
  });
  test("un n0 postérieur à la mise en ligne juge la prod ; sans --agir le ping reste « à faire »", async () => {
    const cwd = await fakeSite();
    const n0b = join(cwd, "seo/audits/2026-08-30-n0");
    await mkdir(join(n0b, "raw"), { recursive: true });
    await cp(`${F}/report-n2.md`, join(n0b, "report.md"));
    await cp(`${F}/manifest.json`, join(n0b, "raw/manifest.json"));
    // manifest.json déclare sitemap-0.xml (status 200) sans le fichier brut ; prodSitemapUrls le lit vraiment (F2)
    await Bun.write(join(n0b, "raw/sitemap-0.xml"), '<?xml version="1.0"?><urlset><url><loc>https://www.commentchercherbonheur.org/</loc></url></urlset>');
    const r = run(cwd, "--mise-en-ligne", "2026-08-29");
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const md = await Bun.file(join(cwd, "seo/checklist.md")).text();
    expect(md).toContain("- [x] Prod verte · auto · seo/audits/2026-08-30-n0/report.md · 0 Critique · 0 Important · 0 Mineur · 0 Info");
    expect(md).toContain("- [ ] Ping IndexNow · action · à faire : relance avec --agir");
    expect(md).toContain("- [ ] Sitemap soumis à Bing · action · en attente : Bing Webmaster Tools pas encore configuré");
    // sans clé Bing (ENV la vide) la ligne 5 reste à la main : pending.bing ne s'évalue même pas
    expect(md).toContain("- [ ] Bing Webmaster Tools : site ajouté · main ·");
  });
  test("une nouvelle date de mise en ligne remet la moitié Après à zéro, actions comprises", async () => {
    const cwd = await fakeSite();
    const n0b = join(cwd, "seo/audits/2026-08-30-n0");
    await mkdir(join(n0b, "raw"), { recursive: true });
    await cp(`${F}/report-n2.md`, join(n0b, "report.md"));
    await cp(`${F}/manifest.json`, join(n0b, "raw/manifest.json"));
    // manifest.json déclare sitemap-0.xml (status 200) sans le fichier brut ; prodSitemapUrls le lit vraiment (F2)
    await Bun.write(join(n0b, "raw/sitemap-0.xml"), '<?xml version="1.0"?><urlset><url><loc>https://www.commentchercherbonheur.org/</loc></url></urlset>');
    expect(run(cwd, "--mise-en-ligne", "2026-08-29").exitCode).toBe(0);
    const p = join(cwd, "seo/checklist.md");
    await Bun.write(p, (await Bun.file(p).text()).replace("- [ ] Ping IndexNow · action · à faire : relance avec --agir", "- [x] Ping IndexNow · action · 2026-08-30 · 200, 10 URL"));
    // relancer sans option : la case cochée à la main survit
    expect(run(cwd).exitCode).toBe(0);
    expect(await Bun.file(p).text()).toContain("- [x] Ping IndexNow · action · 2026-08-30 · 200, 10 URL");
    // relancer avec une nouvelle date de mise en ligne : la moitié Après repart de zéro
    const r = run(cwd, "--mise-en-ligne", "2026-08-30");
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    const md = await Bun.file(p).text();
    expect(md).toContain("Mise en ligne : 2026-08-30");
    expect(md).toContain("- [ ] Ping IndexNow · action ·");
  });
  test("ancien sitemap depuis un fichier : sauvegardé sous seo/checklist/, compté sur la ligne 6", async () => {
    const cwd = await fakeSite();
    const old = join(cwd, "old.xml");
    await Bun.write(old, '<?xml version="1.0"?><urlset><url><loc>https://old.fr/a</loc></url><url><loc>https://old.fr/b</loc></url></urlset>');
    const r = run(cwd, "--ancien-sitemap", old);
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(await Bun.file(join(cwd, "seo/checklist/ancien-sitemap.xml")).exists()).toBe(true);
    expect(await Bun.file(join(cwd, "seo/checklist.md")).text()).toContain("- [x] Ancien sitemap sauvegardé · auto · seo/checklist/ancien-sitemap.xml · 2 URL");
  });
  test("ligne inconnue dans le fichier : exit 1, fichier intact", async () => {
    const cwd = await fakeSite();
    expect(run(cwd).exitCode).toBe(0);
    const p = join(cwd, "seo/checklist.md");
    const broken = (await Bun.file(p).text()).replace("Ancien sitemap sauvegardé", "Ancien sitemap archivé");
    await Bun.write(p, broken);
    const r = run(cwd);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("libellé inconnu");
    expect(await Bun.file(p).text()).toBe(broken);
  });
  test("date invalide ou future : exit 1 ; sans stratégie : exit 1 et propose le verbe strategy", async () => {
    const cwd = await fakeSite();
    expect(run(cwd, "--mise-en-ligne", "hier").exitCode).toBe(1);
    expect(run(cwd, "--mise-en-ligne", "2027-01-01").exitCode).toBe(1);
    const empty = await mkdtemp(join(tmpdir(), "erom-seo-checklist-"));
    const r = run(empty);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain("/erom-seo:strategy");
  });
});
