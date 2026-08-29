import { describe, test, expect } from "bun:test";
import { parseReport } from "../../../../lib/report";
import { kindOf } from "../../../../skills/build/scripts/lib/plan";
import { addDays, checklistSummary, ChecklistError, computeChecklist, dueToday, LINES, parseChecklist, renderChecklist, renderedLabel, type ChecklistInput } from "../lib/checklist";

const F = `${import.meta.dir}/fixtures/chico`;
const n0 = parseReport(await Bun.file(`${F}/report.md`).text());
const n2 = parseReport(await Bun.file(`${F}/report-n2.md`).text());
const horsBuildOu = (id: string) => { const k = kindOf(id); return k.kind === "hors-build" ? k.ou : undefined; };
const matches = (u: string) => /commentchercherbonheur\.org/.test(u);

/** Un site avant déploiement : n2 vert, sur main, un commit seo, pas de clé Bing. */
const base: ChecklistInput = {
  site: "commentchercherbonheur.org", origin: "https://www.commentchercherbonheur.org", today: "2026-08-29", miseEnLigne: null, previous: null,
  n2: { dir: "seo/audits/2026-08-29-n2-3", report: n2 }, n0: { dir: "seo/audits/2026-08-28-n0", report: n0 }, n0Prod: null,
  git: { branch: "main", seoCommit: "1a2b3c4 seo(IDX-02): canonical absolu" }, horsBuildOu,
  ancienSitemap: null, redirections: null, bing: null, bingSiteMatches: matches, pages: ["/", "/methode"], actions: {},
};

describe("addDays et libellés des jalons", () => {
  test("J+30 d'un 29 août est le 28 septembre, J+90 le 27 novembre", () => {
    expect(addDays("2026-08-29", 30)).toBe("2026-09-28");
    expect(addDays("2026-08-29", 90)).toBe("2026-11-27");
    expect(addDays("2026-08-29", 1)).toBe("2026-08-30");
  });
  test("date invalide refusée", () => expect(() => addDays("hier", 1)).toThrow(/date invalide/));
  test("un jalon porte sa date quand la mise en ligne est connue, sinon rien", () => {
    const j1 = LINES.find((d) => d.id === "CL-11")!;
    expect(renderedLabel(j1, "2026-08-29")).toBe("J+1 2026-08-30 : sitemap soumis dans Search Console");
    expect(renderedLabel(j1, null)).toBe("J+1 : sitemap soumis dans Search Console");
  });
});

describe("avant le déploiement", () => {
  const cl = computeChecklist(base);
  const by = (id: string) => cl.lines.find((l) => l.id === id)!;
  test("audit n2 vert et commit seo sur main cochent les deux premières lignes, avec leur preuve", () => {
    expect(by("CL-01").checked).toBe(true);
    expect(by("CL-01").note).toContain("seo/audits/2026-08-29-n2-3/report.md");
    expect(by("CL-02").checked).toBe(true);
    expect(by("CL-02").note).toContain("1a2b3c4");
  });
  test("les hors build du dernier n0 sont listés sous la ligne 3 avec leur « ou »", () => {
    expect(by("CL-03").checked).toBe(false);
    expect(by("CL-03").sub.some((s) => s.startsWith("IDX-04") && s.includes("Vercel"))).toBe(true);
  });
  test("sans clé Bing la ligne 5 est à la main ; la moitié après est vide", () => {
    expect(by("CL-05").kind).toBe("main");
    for (const l of cl.lines.filter((l) => l.phase === "apres")) expect(l.checked).toBe(false);
    expect(by("CL-09").note).toBe("pas encore déployé");
  });
  test("sur une branche seo-build la ligne 2 dit de fusionner", () => {
    const l = computeChecklist({ ...base, git: { branch: "seo-build-2026-08-29", seoCommit: "1a2b3c4 seo(x)" } }).lines.find((l) => l.id === "CL-02")!;
    expect(l.checked).toBe(false);
    expect(l.note).toContain("seo-build-2026-08-29");
  });
  test("un audit n2 avec une trouvaille Critique laisse la ligne 1 vide", () => {
    const l = computeChecklist({ ...base, n2: { dir: "seo/audits/x-n2", report: n0 } }).lines.find((l) => l.id === "CL-01")!;
    expect(l.checked).toBe(false);
  });
});

describe("le fichier : rendu puis relecture", () => {
  test("rendu, relu, identique ; les cases main cochées survivent à trois passages", () => {
    const md1 = renderChecklist(computeChecklist(base));
    const p1 = parseChecklist(md1);
    expect(p1.header.miseEnLigne).toBeNull();
    expect(p1.lines.size).toBe(LINES.length);
    const ticked = md1.replace("- [ ] Search Console : propriété créée", "- [x] Search Console : propriété créée");
    let prev = parseChecklist(ticked);
    for (let n = 0; n < 3; n++) prev = parseChecklist(renderChecklist(computeChecklist({ ...base, previous: prev })));
    expect(prev.lines.get("CL-04")!.checked).toBe(true);
    expect(prev.lines.get("CL-05")!.checked).toBe(false);
  });
  test("une ligne inconnue est une erreur, jamais un silence", () => {
    const md = renderChecklist(computeChecklist(base)).replace("Ancien sitemap sauvegardé", "Ancien sitemap archivé");
    expect(() => parseChecklist(md)).toThrow(ChecklistError);
    expect(() => parseChecklist(md)).toThrow(/libellé inconnu : Ancien sitemap archivé/);
  });
  test("un en-tête mal formé est une erreur", () => expect(() => parseChecklist("# Truc\n")).toThrow(/Checklist SEO\/GEO/));
});

describe("après le déploiement", () => {
  const apres: ChecklistInput = { ...base, miseEnLigne: "2026-08-29", today: "2026-08-30", n0Prod: { dir: "seo/audits/2026-08-30-n0", report: n2 }, bing: [] };
  test("prod verte cochée d'après le n0 postérieur, jalons datés, pages de la stratégie sous J+3", () => {
    const cl = computeChecklist(apres);
    const by = (id: string) => cl.lines.find((l) => l.id === id)!;
    expect(by("CL-07").checked).toBe(true);
    expect(by("CL-11").label).toBe("J+1 2026-08-30 : sitemap soumis dans Search Console");
    expect(by("CL-15").label).toBe("J+90 2026-11-27 : audit de contrôle");
    expect(by("CL-12").sub).toEqual(["https://www.commentchercherbonheur.org/", "https://www.commentchercherbonheur.org/methode"]);
    expect(cl.header.auditProd).toBe("seo/audits/2026-08-30-n0");
  });
  test("la prod qui régresse vide la case avec la raison", () => {
    const l = computeChecklist({ ...apres, n0Prod: { dir: "seo/audits/2026-09-01-n0", report: n0 } }).lines.find((l) => l.id === "CL-07")!;
    expect(l.checked).toBe(false);
    expect(l.note).toContain("Critique");
  });
  test("aucun n0 depuis la mise en ligne : prod verte vide, actions en attente", () => {
    const cl = computeChecklist({ ...apres, n0Prod: null });
    expect(cl.lines.find((l) => l.id === "CL-07")!.note).toContain("aucun audit prod");
    expect(cl.lines.find((l) => l.id === "CL-09")!.note).toContain("en attente");
  });
  test("compte Bing sans le site : ligne 5 auto vide, Bing en attente ; avec le site vérifié : cochée", () => {
    const cl = computeChecklist(apres);
    expect(cl.lines.find((l) => l.id === "CL-05")!).toMatchObject({ kind: "auto", checked: false });
    expect(cl.lines.find((l) => l.id === "CL-10")!.note).toContain("en attente");
    const ok = computeChecklist({ ...apres, bing: [{ Url: "https://www.commentchercherbonheur.org/", IsVerified: true }] });
    expect(ok.lines.find((l) => l.id === "CL-05")!.checked).toBe(true);
    const nv = computeChecklist({ ...apres, bing: [{ Url: "https://www.commentchercherbonheur.org/", IsVerified: false }] });
    expect(nv.lines.find((l) => l.id === "CL-05")!.checked).toBe(false);
    expect(nv.lines.find((l) => l.id === "CL-05")!.note).toContain("IsVerified false");
  });
  test("une action réussie est cochée avec la date et le nombre d'URL, et reste cochée au passage suivant", () => {
    const done = computeChecklist({ ...apres, actions: { indexnow: { ok: true, status: 202, urls: 10, message: "Accepted" } } });
    const l = done.lines.find((l) => l.id === "CL-09")!;
    expect(l).toMatchObject({ checked: true, note: "2026-08-30 · 202, 10 URL" });
    const next = computeChecklist({ ...apres, today: "2026-09-02", previous: parseChecklist(renderChecklist(done)) });
    expect(next.lines.find((l) => l.id === "CL-09")!).toMatchObject({ checked: true, note: "2026-08-30 · 202, 10 URL" });
  });
  test("une action refusée reste vide avec le code", () => {
    const l = computeChecklist({ ...apres, actions: { indexnow: { ok: false, status: 403, message: "clé non servie" } } }).lines.find((l) => l.id === "CL-09")!;
    expect(l).toMatchObject({ checked: false, note: "403 : clé non servie" });
  });
  test("ancien sitemap : une URL en 404 laisse la case vide et la liste", () => {
    const cl = computeChecklist({ ...apres, ancienSitemap: { path: "seo/checklist/ancien-sitemap.xml", count: 2 }, redirections: [{ url: "https://old.fr/a", ok: true, detail: "301 → 200" }, { url: "https://old.fr/b", ok: false, detail: "404" }] });
    const l = cl.lines.find((l) => l.id === "CL-08")!;
    expect(l.checked).toBe(false);
    expect(l.sub).toEqual(["https://old.fr/b → 404"]);
    expect(cl.lines.find((l) => l.id === "CL-06")!.note).toContain("2 URL");
  });
  test("un ancien sitemap sauvegardé puis disparu vide la ligne 6 avec la raison, et le reste sur les passages suivants", () => {
    const saved = computeChecklist({ ...base, ancienSitemap: { path: "seo/checklist/ancien-sitemap.xml", count: 2 } });
    let prev = parseChecklist(renderChecklist(saved));
    for (let n = 0; n < 3; n++) {
      const cl = computeChecklist({ ...base, previous: prev });
      const l = cl.lines.find((l) => l.id === "CL-06")!;
      expect(l.checked, `passage ${n + 2}`).toBe(false);
      expect(l.note).toContain("disparu");
      prev = parseChecklist(renderChecklist(cl));
    }
  });
  test("ancien sitemap disparu après la mise en ligne : la ligne 8 le dit au lieu de « sans objet »", () => {
    const saved = computeChecklist({ ...apres, ancienSitemap: { path: "seo/checklist/ancien-sitemap.xml", count: 2 }, redirections: [] });
    const cl = computeChecklist({ ...apres, previous: parseChecklist(renderChecklist(saved)) });
    const l8 = cl.lines.find((l) => l.id === "CL-08")!;
    expect(l8.checked).toBe(false);
    expect(l8.note).toContain("disparu");
  });
  test("dû aujourd'hui : les jalons échus non cochés", () => {
    const cl = computeChecklist({ ...apres, today: "2026-09-02" });
    expect(dueToday(cl, "2026-09-02").map((l) => l.id)).toEqual(["CL-11", "CL-12"]);
    expect(checklistSummary(cl, "2026-09-02")).toContain("dû aujourd'hui : J+1 2026-08-30 : sitemap soumis dans Search Console ; J+3 2026-09-01 : pages clés indexées");
  });
});
