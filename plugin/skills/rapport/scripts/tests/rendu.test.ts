import { describe, test, expect } from "bun:test";
import { parseRapportClient, PREFIXES } from "../lib/contrat";
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
    // Les dix préfixes viennent de contrat.ts : un onzième préfixe ajouté là doit être couvert
    // ici sans retoucher ce test, sous peine de cesser de le couvrir en silence.
    expect(avecCouvre).not.toMatch(new RegExp(`\\b(${PREFIXES.join("|")})-\\d{2}\\b`));
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

  test("un couvre: échappé dans la synthèse, du Markdown jusqu'au HTML produit, ne laisse plus de trace", () => {
    // Bout en bout : le cas démontré par la revue. Le parseur ne nettoie pas la synthèse (elle est
    // prise en tranche brute), donc c'est ici, au rendu, que la fuite doit être fermée.
    const fuite = CLIENT.replace(
      "Votre site est en bonne santé technique",
      "<!-- couvre: TAG-01 -->\nVotre site est en bonne santé technique",
    );
    const out = rendre(parseRapportClient(fuite), THEME);
    expect(out).not.toContain("TAG-01");
    expect(out).not.toContain("couvre:");
  });

  test("défense en profondeur : un commentaire HTML résiduel est retiré avant l'échappement, même si le lint est contourné", () => {
    // On construit un RapportClient directement, sans passer par parseRapportClient ni verifier :
    // simule le cas où le contrôle en amont a été court-circuité.
    const rapport = parseRapportClient(CLIENT);
    const pollue = { ...rapport, synthese: `${rapport.synthese}\n<!-- couvre: TAG-01 -->` };
    const out = rendre(pollue, THEME);
    expect(out).not.toContain("TAG-01");
    expect(out).not.toContain("couvre:");
  });

  test("l'en-tête (titre, date, synthèse) est protégé des coupures à l'impression", () => {
    const out = html();
    expect(out).toMatch(/<header class="entete">[\s\S]*<h1>/);
    const print = out.split("@media print")[1] ?? "";
    expect(print).toMatch(/\.entete[^}]*break-inside:\s*avoid/);
  });

  test("le bloc Méthode est protégé des coupures à l'impression, comme les autres blocs", () => {
    const print = html().split("@media print")[1] ?? "";
    expect(print).toMatch(/\.methode[^}]*break-inside:\s*avoid/);
  });

  test("les paragraphes évitent veuves et orphelines à l'impression", () => {
    const print = html().split("@media print")[1] ?? "";
    expect(print).toMatch(/\borphans:\s*\d+/);
    expect(print).toMatch(/\bwidows:\s*\d+/);
  });

  test("les alias page-break accompagnent break-inside et break-after pour les moteurs plus anciens", () => {
    const print = html().split("@media print")[1] ?? "";
    expect(print).toContain("page-break-inside");
    expect(print).toContain("page-break-after");
  });
});
