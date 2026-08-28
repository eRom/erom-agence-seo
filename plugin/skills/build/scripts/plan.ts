#!/usr/bin/env bun
// plan.ts : stratégie + dernier audit → derived/build-plan.json. Toute la lecture disque est ici ; lib/plan.ts est pur.
import { join } from "node:path";
import { parseStrategy, StrategyError } from "../../../lib/strategy";
import { latestAuditDir, parseReport, ReportError } from "../../../lib/report";
import type { Manifest, PageFacts } from "../../audit/scripts/lib/types";
import type { StrategyEval } from "../../audit/scripts/lib/strategy-eval";
import { buildPlan, planSummary } from "./lib/plan";

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (args.includes("--help")) { console.error("usage : bun plan.ts [--audit <dossier>] [--strategy seo/strategy.md] [--seo seo]"); process.exit(2); }
  const seoDir = opt("--seo") ?? "seo";
  const strategyPath = opt("--strategy") ?? join(seoDir, "strategy.md");
  try {
    const strategyFile = Bun.file(strategyPath);
    if (!(await strategyFile.exists())) { console.error(`erreur : ${strategyPath} absent ; lancer /erom-seo:strategy d'abord`); process.exit(1); }
    const strategy = parseStrategy(await strategyFile.text());
    const auditDir = opt("--audit") ?? (await latestAuditDir(seoDir));
    if (!auditDir) { console.error(`erreur : aucun audit avec rapport dans ${join(seoDir, "audits")} ; lancer /erom-seo:audit d'abord`); process.exit(1); }
    const read = async (rel: string) => { const f = Bun.file(join(auditDir, rel)); if (!(await f.exists())) throw new Error(`${join(auditDir, rel)} absent`); return f.text(); };
    const report = parseReport(await read("report.md"));
    const pages = JSON.parse(await read("derived/pages.json")) as PageFacts[];
    const evalFile = Bun.file(join(auditDir, "derived/strategy-eval.json"));
    const strategyEval = (await evalFile.exists()) ? (JSON.parse(await evalFile.text()) as StrategyEval) : null;
    const n0 = await latestAuditDir(seoDir, { level: 0, file: "raw/manifest.json" });
    const homeFinalUrl = n0 ? ((JSON.parse(await Bun.file(join(n0, "raw/manifest.json")).text()) as Manifest).pages[0]?.final ?? null) : null;
    const pkg = Bun.file("package.json");
    const deps = (await pkg.exists()) ? Object.keys({ ...(JSON.parse(await pkg.text()).dependencies ?? {}), ...(JSON.parse(await pkg.text()).devDependencies ?? {}) }) : [];
    const plan = buildPlan({ strategy, strategyPath, report, pages, strategyEval, homeFinalUrl, deps, auditDir });
    await Bun.write(join(auditDir, "derived/build-plan.json"), JSON.stringify(plan, null, 2));
    console.log(`dossier : ${auditDir}`);
    console.log(planSummary(plan));
    for (const w of plan.warnings) console.error(`attention : ${w}`);
  } catch (e) {
    const msg = e instanceof StrategyError ? `${strategyPath} inanalysable : ${e.errors.join(" ; ")}` : e instanceof ReportError ? `rapport inanalysable : ${e.errors.join(" ; ")}` : (e as Error).message;
    console.error(`erreur : ${msg}`);
    process.exit(1);
  }
}
