#!/usr/bin/env bun
import { join } from "node:path";
import { parseStrategy, StrategyError } from "../../../lib/strategy";
import { bodyText } from "./lib/page";
import { evaluateStrategy } from "./lib/strategy-eval";
import type { Manifest, PageFacts } from "./lib/types";

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const dir = args[0];
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const strategyPath = opt("--strategy") ?? "seo/strategy.md";
  const today = opt("--today") ?? new Date().toISOString().slice(0, 10);
  if (!dir || dir.startsWith("--")) { console.error("usage : bun strategy-eval.ts <dossier d'audit> [--strategy seo/strategy.md] [--today AAAA-MM-JJ]"); process.exit(2); }
  try {
    const strategy = parseStrategy(await Bun.file(strategyPath).text());
    const manifest = JSON.parse(await Bun.file(join(dir, "raw/manifest.json")).text()) as Manifest;
    const pages = JSON.parse(await Bun.file(join(dir, "derived/pages.json")).text()) as PageFacts[];
    const homeFile = Bun.file(join(dir, "raw/pages/index.html"));
    const homeText = (await homeFile.exists()) ? bodyText(await homeFile.text()) : "";
    const ixFile = Bun.file(join(dir, "raw/indexnow.txt"));
    const result = evaluateStrategy({
      strategy, strategyPath, pages, homeText, today,
      indexnow: { status: manifest.indexnow?.status ?? null, content: (await ixFile.exists()) ? await ixFile.text() : null },
    });
    await Bun.write(join(dir, "derived/strategy-eval.json"), JSON.stringify(result, null, 2));
    const ko = result.pages.filter((p) => !p.found || p.inTitle === false || p.inH1 === false || p.inOpening === false).length;
    const ident = result.identity.onHome && result.identity.inOrganization ? "en place" : "à placer";
    const ix = result.indexnow.declared ? (result.indexnow.contentMatches ? "servie" : "non servie") : "non prévue";
    console.log(`évaluation stratégique : ${result.pages.length} pages prévues, ${ko} en défaut, identité ${ident}, sameAs ${result.sameAs.filter((s) => s.present).length}/${result.sameAs.length}, IndexNow ${ix}`);
  } catch (e) {
    console.error(`erreur : ${e instanceof StrategyError ? `${strategyPath} inanalysable : ${e.errors.join(" ; ")}` : (e as Error).message}`);
    process.exit(1);
  }
}
