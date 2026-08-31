// Charge les tokens et les fonts du thème institut, et rend les fonts encodées en base64.
// Seul module de ce chantier à toucher le disque hors CLI : il lit des fichiers versionnés, jamais le réseau.
import { join } from "node:path";

export type Fonte = { nom: string; poids: number; style: string; base64: string };
export type Theme = { tokens: string; fontes: Fonte[] };

const RACINE = join(import.meta.dir, "..", "..", "references", "theme");

const FONTES: { fichier: string; poids: number; style: string }[] = [
  { fichier: "spectral-v15-latin-regular.woff2", poids: 400, style: "normal" },
  { fichier: "spectral-v15-latin-600.woff2", poids: 600, style: "normal" },
  { fichier: "spectral-v15-latin-italic.woff2", poids: 400, style: "italic" },
];

export async function chargerTheme(racine = RACINE): Promise<Theme> {
  const tokens = await Bun.file(join(racine, "tokens.css")).text();
  const fontes: Fonte[] = [];
  for (const f of FONTES) {
    const octets = await Bun.file(join(racine, f.fichier)).arrayBuffer();
    fontes.push({ nom: "Spectral", poids: f.poids, style: f.style, base64: Buffer.from(octets).toString("base64") });
  }
  return { tokens, fontes };
}
