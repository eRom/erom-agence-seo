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
});
