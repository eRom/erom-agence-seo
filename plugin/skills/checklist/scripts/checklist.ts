#!/usr/bin/env bun
// checklist.ts : stratégie + audits + git + ancien fichier → seo/checklist.md. Toute la lecture disque, git et réseau est ici ;
// lib/checklist.ts est pur. Sans --agir, aucune écriture sortante (D26).
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseStrategy, StrategyError } from "../../../lib/strategy";
import { latestAuditDir, parseReport, ReportError, type Report } from "../../../lib/report";
import type { Manifest } from "../../../skills/audit/scripts/lib/types";
import { fetchChain } from "../../../skills/audit/scripts/lib/fetch";
import { decodeSitemapBody, parseSitemap } from "../../../lib/sitemap";
import { sameSite } from "../../../lib/url";
import { kindOf } from "../../../skills/build/scripts/lib/plan";
import { assertNoSecret } from "../../../skills/strategy/scripts/lib/keywords";
import { checklistSummary, ChecklistError, computeChecklist, dueToday, parseChecklist, renderChecklist, type BingSite, type ChecklistInput, type RedirectCheck } from "./lib/checklist";
import { bingSubmitFeed, bingUserSites, defaultFetcher, pingIndexNow, redact, urlsOnOrigin } from "./lib/actions";
import { checkRedirections } from "./lib/ancien-sitemap";

export const ANCIEN_SITEMAP = "checklist/ancien-sitemap.xml";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function git(cwd: string, ...args: string[]): string | null {
  const r = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  return r.exitCode === 0 ? r.stdout.toString().trim() || null : null;
}

async function readReport(dir: string | null): Promise<{ dir: string; report: Report } | null> {
  if (!dir) return null;
  return { dir, report: parseReport(await Bun.file(join(dir, "report.md")).text()) };
}

/** Les URL du sitemap collecté par l'audit n0 : raw/<fichier> de chaque entrée `sitemaps` du manifeste, filtrées sur le site. */
export async function prodSitemapUrls(n0Dir: string, site: string): Promise<{ urls: string[]; feedUrl: string | null }> {
  const manifest = JSON.parse(await Bun.file(join(n0Dir, "raw/manifest.json")).text()) as Manifest;
  const urls = new Set<string>();
  let feedUrl: string | null = null;
  for (const s of manifest.sitemaps) {
    if (s.status !== 200 || !s.file) continue;
    feedUrl ??= s.final;
    const f = Bun.file(join(n0Dir, "raw", s.file));
    if (!(await f.exists())) continue;
    const xml = decodeSitemapBody(new Uint8Array(await f.arrayBuffer()), s.final, s.contentType ?? null);
    for (const u of parseSitemap(xml).locs) if (sameSite(u, `https://${site}`)) urls.add(u);
  }
  return { urls: [...urls], feedUrl };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes("--help")) { console.error("usage : bun checklist.ts [--mise-en-ligne AAAA-MM-JJ] [--ancien-sitemap <url ou fichier>] [--agir] [--seo seo] [--today AAAA-MM-JJ]"); process.exit(2); }
  const seoDir = opt("--seo") ?? "seo";
  // heure locale, pas UTC : entre 0 h et 2 h à Paris, la date UTC est encore la veille et --mise-en-ligne du jour serait refusée comme future
  const today = opt("--today") ?? new Date().toLocaleDateString("sv-SE");
  const agir = args.includes("--agir");
  const key = process.env.BING_WMT_API_KEY ?? null;
  const warn = (m: string) => console.error(redact(`attention : ${m}`, key));
  const fail = (m: string): never => { console.error(redact(`erreur : ${m}`, key)); process.exit(1); };
  const strategyPath = join(seoDir, "strategy.md");
  const outPath = join(seoDir, "checklist.md");
  try {
    const strategyFile = Bun.file(strategyPath);
    if (!(await strategyFile.exists())) fail(`${strategyPath} absent ; lancer /erom-seo:strategy d'abord`);
    const strategy = parseStrategy(await strategyFile.text());
    const site = strategy.site;

    const prevFile = Bun.file(outPath);
    const previous = (await prevFile.exists()) ? parseChecklist(await prevFile.text()) : null;

    // mise en ligne : l'option pose ou change la date ; sinon celle du fichier
    const dateOpt = opt("--mise-en-ligne");
    if (dateOpt !== undefined && (!DATE.test(dateOpt) || Number.isNaN(new Date(`${dateOpt}T00:00:00Z`).getTime()))) fail(`--mise-en-ligne : date AAAA-MM-JJ attendue, reçu ${dateOpt}`);
    if (dateOpt !== undefined && dateOpt > today) fail(`--mise-en-ligne : ${dateOpt} est dans le futur`);
    const miseEnLigne = dateOpt ?? previous?.header.miseEnLigne ?? null;
    // une nouvelle date repart d'une moitié « Après » vide, actions comprises (spec 5.1)
    const prevForCompute = previous && dateOpt !== undefined && dateOpt !== previous.header.miseEnLigne
      ? { ...previous, lines: new Map([...previous.lines].filter(([id]) => Number(id.slice(3)) <= 6)) } : previous;

    const n2 = await readReport(await latestAuditDir(seoDir, { level: 2 }));
    const n0 = await readReport(await latestAuditDir(seoDir, { level: 0 }));
    // origine réellement servie : la home du dernier audit n0 (www ou apex), sinon la stratégie (même règle que build, D21).
    // raw/ est souvent hors git (chico) : à défaut du manifeste, derived/pages.json porte l'URL servie de chaque page (R-1, recette du 29/08).
    let origin = `https://${site}`;
    if (n0) {
      let found: string | null = null;
      try { const m = JSON.parse(await Bun.file(join(n0.dir, "raw/manifest.json")).text()) as Manifest; found = m.pages[0]?.final ?? null; } catch { /* raw/ absent ou illisible : repli sur derived/ */ }
      if (!found) { try { const pages = JSON.parse(await Bun.file(join(n0.dir, "derived/pages.json")).text()) as { url: string }[]; found = pages[0]?.url ?? null; } catch { /* derived/ absent : repli sur la stratégie */ } }
      if (found) { try { origin = new URL(found).origin; } catch { found = null; } }
      if (!found) warn(`${n0.dir} : ni raw/manifest.json ni derived/pages.json lisibles, origine prise dans la stratégie (${origin})`);
    }
    const n0Prod = n0 && miseEnLigne && n0.report.date >= miseEnLigne ? n0 : null;
    if (n0 && miseEnLigne && !n0Prod) warn(`audit niveau 0 ${n0.dir} antérieur à la mise en ligne (${miseEnLigne}) : il ne juge pas la prod`);

    const branch = git(process.cwd(), "rev-parse", "--abbrev-ref", "HEAD") ?? "(pas un dépôt git)";
    const seoCommit = git(process.cwd(), "log", "-1", "--grep=^seo(", "--format=%h %s");

    // ancien sitemap : déclaré maintenant (URL ou fichier) ou déjà sauvegardé
    const savedPath = join(seoDir, ANCIEN_SITEMAP);
    const declared = opt("--ancien-sitemap");
    if (declared !== undefined) {
      let xml: string;
      if (await Bun.file(declared).exists()) xml = await Bun.file(declared).text();
      else {
        const r = await fetchChain(declared, { timeoutMs: 30000 });
        if (r.status !== 200) fail(`--ancien-sitemap : ${declared} répond ${r.status || r.error}`);
        xml = decodeSitemapBody(r.body, declared, r.headers["content-type"] ?? null);
      }
      if (parseSitemap(xml).locs.length === 0) fail(`--ancien-sitemap : aucune <loc> dans ${declared}`);
      await mkdir(join(seoDir, "checklist"), { recursive: true });
      await Bun.write(savedPath, xml);
    }
    const saved = Bun.file(savedPath);
    const ancienLocs = (await saved.exists()) ? parseSitemap(await saved.text()).locs : null;
    const ancienSitemap = ancienLocs ? { path: savedPath, count: ancienLocs.length } : null;
    let redirections: RedirectCheck[] | null = null;
    if (ancienLocs && miseEnLigne) redirections = await checkRedirections(ancienLocs, origin, (u) => fetchChain(u, { timeoutMs: 20000 }));

    // Bing, lecture seule : les sites du compte
    let bing: BingSite[] | null = null;
    if (key) { try { bing = await bingUserSites(defaultFetcher, key); } catch (e) { warn(`Bing : ${(e as Error).message}`); } }
    const bingSiteMatches = (u: string) => sameSite(u, origin);

    // actions (écritures), seulement avec --agir et si tout est réuni
    const actions: ChecklistInput["actions"] = {};
    let feedUrl: string | null = null, urls: string[] = [];
    if (n0Prod) ({ urls, feedUrl } = await prodSitemapUrls(n0Prod.dir, site));
    if (agir && miseEnLigne && n0Prod) {
      const done = (id: string) => prevForCompute?.lines.get(id)?.checked ?? false;
      if (strategy.indexnow && !done("CL-09")) {
        // IndexNow veut toutes les URL sur `host` : un sitemap qui liste l'apex alors que le site sert www (chico) est
        // ramené sur l'origine réellement servie, comme l'audit niveau 2 le fait (R-3, recette du 29/08)
        const { urls: pingUrls, moved } = urlsOnOrigin(urls, origin);
        if (moved) warn(`ping IndexNow : ${moved} URL du sitemap réécrites sur ${origin}, l'hôte réellement servi`);
        actions.indexnow = await pingIndexNow(defaultFetcher, { host: new URL(origin).host, key: strategy.indexnow, urls: pingUrls });
      }
      const bingSite = bing?.find((b) => bingSiteMatches(b.Url) && b.IsVerified) ?? null;
      if (key && bingSite && feedUrl && !done("CL-10")) actions.bing = await bingSubmitFeed(defaultFetcher, key, bingSite.Url, feedUrl);
    } else if (agir) warn("--agir sans effet : mise en ligne non posée ou aucun audit prod depuis");

    // raisons pour lesquelles --agir ne pourra rien faire, connues du CLI seul (spec 5.3, la lib ne les devine pas)
    const pending: ChecklistInput["pending"] = {};
    if (!strategy.indexnow) pending.indexnow = "pas de clé IndexNow dans seo/strategy.md (Cadence de fraîcheur, IndexNow : non)";
    else if (n0Prod && urls.length === 0) pending.indexnow = "aucune URL de sitemap en 200 dans l'audit prod";
    if (!key) pending.bing = "BING_WMT_API_KEY absente, la soumission se fait à la main (voir consoles.md, ligne « Sitemap soumis à Bing »)";
    else if (n0Prod && !feedUrl) pending.bing = "aucun sitemap en 200 dans l'audit prod";

    const cl = computeChecklist({
      site, origin, today, miseEnLigne, previous: prevForCompute, n2, n0, n0Prod, git: { branch, seoCommit },
      horsBuildOu: (id) => { const k = kindOf(id); return k.kind === "hors-build" ? k.ou : undefined; },
      ancienSitemap, redirections, bing, bingSiteMatches, pages: strategy.pages.map((p) => p.page), actions, pending,
    });
    const md = renderChecklist(cl);
    assertNoSecret(md, key);
    await mkdir(seoDir, { recursive: true });
    await Bun.write(outPath, md);
    console.log(`fichier : ${outPath}`);
    console.log(checklistSummary(cl, today));
    for (const l of dueToday(cl, today)) if (l.label.match(/^J\+\d+ (\S+)/)![1] < today) warn(`en retard : ${l.label}`);
    for (const l of cl.lines) if (l.kind === "action" && !l.checked && /^en attente|^à faire/.test(l.note)) warn(`${l.label} : ${l.note}`);
  } catch (e) {
    const msg = e instanceof StrategyError ? `${strategyPath} inanalysable : ${e.errors.join(" ; ")}`
      : e instanceof ReportError ? `rapport inanalysable : ${e.errors.join(" ; ")}`
      : e instanceof ChecklistError ? `${outPath} illisible, rien n'est réécrit : ${e.errors.join(" ; ")}`
      : (e as Error).message;
    fail(msg);
  }
}
