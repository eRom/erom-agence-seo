import { describe, it, expect } from "bun:test";
import { chargerTheme } from "../lib/theme";

describe("chargerTheme", () => {
  it("rend exactement trois fontes", async () => {
    const theme = await chargerTheme();
    expect(theme.fontes).toHaveLength(3);
  });

  it("expose le champ 'fontes' avec base64 non vide pour chaque entrée", async () => {
    const theme = await chargerTheme();
    expect(theme).toHaveProperty("fontes");
    for (const fonte of theme.fontes) {
      expect(fonte.base64).toBeTruthy();
      expect(typeof fonte.base64).toBe("string");
      expect(fonte.base64.length).toBeGreaterThan(0);
    }
  });

  it("charge les tokens contenant le bleu Souverain", async () => {
    const theme = await chargerTheme();
    expect(theme.tokens).toContain("#122B78");
  });

  it("retire le commentaire de provenance (chemin du dépôt, version du paquet) sans toucher aux tokens", async () => {
    // Le défaut trouvé en revue : ce commentaire de tête documente la provenance du DS institut
    // (D45) et doit rester dans tokens.css, mais atterrissait tel quel dans le <style> du client.
    const theme = await chargerTheme();
    expect(theme.tokens).not.toContain("erom-design-system-institutionnel");
    expect(theme.tokens).not.toContain("erom-institut 0.1.0");
    // Retrait du commentaire, pas du contenu : les tokens utilisés par le rendu doivent survivre,
    // y compris l'écart volontaire sur la pile de polices que le commentaire justifiait.
    expect(theme.tokens).toContain("--papier-fond: #FAF8F5");
    expect(theme.tokens).toContain("--encre: #1C1A19");
    expect(theme.tokens).toContain("--bleu-700: #122B78");
    expect(theme.tokens).toContain("--serif: 'Spectral', Georgia, 'Times New Roman', serif;");
    expect(theme.tokens.trim().startsWith(":root {")).toBe(true);
  });
});
