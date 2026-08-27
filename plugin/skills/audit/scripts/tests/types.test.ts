import { describe, test, expect } from "bun:test";
import { ALL_BOTS, RETRIEVAL_BOTS, TRAINING_BOTS, SEARCH_BOTS, USER_AGENT } from "../lib/types";

describe("constantes de bots", () => {
  test("aucun bot n'est à la fois récupération et entraînement", () => {
    for (const b of RETRIEVAL_BOTS) expect(TRAINING_BOTS as readonly string[]).not.toContain(b);
  });
  test("ALL_BOTS est l'union sans doublon", () => {
    expect(new Set(ALL_BOTS).size).toBe(ALL_BOTS.length);
    for (const b of [...RETRIEVAL_BOTS, ...TRAINING_BOTS, ...SEARCH_BOTS]) expect(ALL_BOTS).toContain(b);
  });
  test("les tokens respectent l'alphabet de la RFC 9309 (lettres, _ et -)", () => {
    for (const b of ALL_BOTS) expect(b).toMatch(/^[A-Za-z_-]+$/);
  });
  test("le user-agent identifie l'outil", () => {
    expect(USER_AGENT).toMatch(/^erom-seo-audit\/\d+\.\d+$/);
  });
});
