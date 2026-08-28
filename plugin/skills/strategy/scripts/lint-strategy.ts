#!/usr/bin/env bun
import { lintStrategy } from "../../../lib/strategy";

if (import.meta.main) {
  const path = Bun.argv[2];
  if (!path) { console.error("usage : bun lint-strategy.ts <strategy.md>"); process.exit(2); }
  const errors = lintStrategy(await Bun.file(path).text());
  if (errors.length) { console.log(errors.map((e) => `ERREUR  ${e}`).join("\n")); process.exit(1); }
  console.log("stratégie conforme");
}
