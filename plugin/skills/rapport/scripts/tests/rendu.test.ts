import { describe, test, expect } from "bun:test";
import { parseRapportClient } from "../lib/contrat";
import { rendre } from "../lib/rendu";
import type { Theme } from "../lib/theme";

const CLIENT = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();
const THEME: Theme = {
  tokens: ":root { --papier-fond: #FAF8F5; --encre: #1C1A19; --bleu-700: #122B78; }",
  fontes: [
    { nom: "Spectral", poids: 400, style: "normal", base64: "AAAA" },
    { nom: "Spectral", poids: 600, style: "normal", base64: "BBBB" },
    { nom: "Spectral", poids: 400, style: "italic", base64: "CCCC" },
  ],
};

const html = () => rendre(parseRapportClient(CLIENT), THEME);

describe("rendre", () => {
  test("le document est autonome : aucune ressource distante", () => {
    // L'invariant de D46. On assère le comportement, pas le texte du code.
    expect(html()).not.toMatch(/(src|href)\s*=\s*["']https?:\/\//);
  });

  test("les trois fontes sont embarquées en base64", () => {
    const out = html();
    expect(out.match(/@font-face/g)).toHaveLength(3);
    expect(out).toContain("data:font/woff2;base64,AAAA");
  });

  test("embarquer les fontes, c'est les redistribuer : l'avis de licence accompagne le fichier", () => {
    // Condition 2 de l'OFL 1.1. Le document part chez un tiers avec la police dedans.
    const out = html();
    expect(out).toContain("The Spectral Project Authors");
    expect(out).toContain("SIL Open Font License");
  });

  test("aucun identifiant de catalogue ne survit dans le HTML remis au client", () => {
    const avecCouvre = html();
    expect(avecCouvre).not.toContain("couvre:");
    expect(avecCouvre).not.toMatch(/\b(AI|FRESH|IDX|PERF|REND|ROBOTS|SD|SNIP|STRAT|TAG)-\d{2}\b/);
  });

  test("le titre du document est le nom du site", () => {
    expect(html()).toContain("<title>Comment chercher le bonheur</title>");
  });

  test("une section absente ne laisse pas de titre vide", () => {
    // La fixture n'a aucune Critique : « Ce qui bloque » ne doit pas apparaître.
    expect(html()).not.toContain("Ce qui bloque");
    expect(html()).toContain("Ce qui freine");
  });

  test("le document porte une feuille d'impression", () => {
    expect(html()).toContain("@media print");
  });

  test("le texte du client est présent et échappé", () => {
    const r = parseRapportClient(CLIENT.replace("Vos pages se chargent vite", "Moins de 2s & <2 requêtes"));
    const out = rendre(r, THEME);
    expect(out).toContain("Moins de 2s &amp; &lt;2 requêtes");
  });
});
