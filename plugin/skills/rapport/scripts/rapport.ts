#!/usr/bin/env bun
// Le verbe rapport : deux gestes autour du jugement de Claude.
//   --preparer [dossier]  sort la matière du rapport client, n'écrit rien
//   --rendre <dossier>    lint le Markdown client puis écrit le HTML
import { join } from "node:path";
import { latestAuditDir, parseReport, type Severity } from "../../../lib/report";
import { lintDossier } from "./lint-client";
import { parseRapportClient } from "./lib/contrat";
import { chargerTheme } from "./lib/theme";
import { rendre } from "./lib/rendu";

const GRAVES: readonly Severity[] = ["Critique", "Important"];

/** Résout le dossier d'audit : celui passé en argument, sinon le dernier sur disque. */
export async function resoudre(dossier?: string): Promise<string> {
  if (dossier) return dossier;
  const dernier = await latestAuditDir();
  if (!dernier) throw new Error("aucun audit trouvé sous seo/audits/. Lancer /erom-seo:audit d'abord.");
  return dernier;
}

/** La matière du jugement : trouvailles graves, points forts, compte de mineurs. N'écrit rien. */
export async function preparer(dossier: string): Promise<string> {
  const rapport = parseReport(await Bun.file(join(dossier, "report.md")).text());
  const graves = rapport.findings.filter((f) => GRAVES.includes(f.severity));
  const mineurs = rapport.findings.filter((f) => !GRAVES.includes(f.severity));
  const lignes: string[] = [
    `dossier : ${dossier}`,
    `site : ${rapport.site}`,
    `date de la collecte : ${rapport.date} (niveau ${rapport.niveau}, ${rapport.nbPages} pages)`,
    // Ce compte n'est pas celui qui sera annoncé en Méthode : si l'action retient une de ces
    // mineures (D49), le compte réel en Méthode vaut ce nombre moins une. Le libellé le dit.
    `points mineurs et info disponibles : ${mineurs.length} (le compte annoncé en Méthode exclut celle que l'action retiendrait)`,
    "",
    `trouvailles graves (${graves.length}), à couvrir toutes :`,
  ];
  for (const f of graves) {
    lignes.push(
      "", `  ${f.id} [${f.severity}] ${f.title}`,
      `    pourquoi   : ${f.pourquoi}`,
      `    preuve     : ${f.preuve}`,
      `    correctif  : ${f.correctif}`,
      `    effort     : ${f.effort}`,
    );
  }
  if (graves.length === 0) {
    // Le cas de D49 : sans trouvaille grave, l'action de la semaine doit s'appuyer sur une
    // mineure ou une info. Sans ce détail, le modèle n'a sous les yeux aucune matière pour la
    // construire, alors que c'est exactement le cas où il en a besoin.
    lignes.push(
      "",
      "aucune trouvaille grave : l'action de la semaine s'appuie sur l'une des mineures ci-dessous (D49) :",
    );
    for (const f of mineurs) {
      lignes.push(
        "", `  ${f.id} [${f.severity}] ${f.title}`,
        `    pourquoi   : ${f.pourquoi}`,
        `    correctif  : ${f.correctif}`,
      );
    }
  }
  lignes.push("", `points forts disponibles (${rapport.passed.length}) : ${rapport.passed.join(", ")}`);
  return lignes.join("\n");
}

/** Lint puis rend. Lève sans rien écrire si le lint refuse. */
export async function rendreDossier(dossier: string): Promise<void> {
  const refus = await lintDossier(dossier);
  if (refus.length > 0) throw new Error(`rapport client refusé :\n  - ${refus.join("\n  - ")}`);
  const client = parseRapportClient(await Bun.file(join(dossier, "rapport-client.md")).text());
  const theme = await chargerTheme();
  await Bun.write(join(dossier, "rapport-client.html"), rendre(client, theme));
}

const GESTES = ["--preparer", "--rendre", "--rendre-seul"] as const;

if (import.meta.main) {
  const args = process.argv.slice(2);
  const geste = args.find((a) => a.startsWith("--")) ?? "--preparer";
  // Le geste se valide avant que le dossier ne se résolve : sinon `--bidon` dans un dossier
  // sans audit répond « aucun audit trouvé » au lieu de dire que le drapeau n'existe pas.
  if (!GESTES.includes(geste as (typeof GESTES)[number])) {
    console.error(`geste inconnu : ${geste}`);
    console.error("usage : rapport.ts [--preparer|--rendre|--rendre-seul] [dossier]");
    process.exit(2);
  }
  try {
    const dossier = await resoudre(args.find((a) => !a.startsWith("--")));
    if (geste === "--preparer") {
      console.log(await preparer(dossier));
    } else {
      await rendreDossier(dossier);
      console.log(`rapport client écrit : ${join(dossier, "rapport-client.html")}`);
    }
  } catch (e) {
    // Un fichier absent se nomme, il ne remonte pas en ENOENT brut : même convention que checklist.ts.
    const m = (e as NodeJS.ErrnoException).code === "ENOENT"
      ? `fichier attendu introuvable : ${(e as NodeJS.ErrnoException).path ?? "chemin inconnu"}`
      : (e as Error).message;
    console.error(m);
    process.exit(1);
  }
}
