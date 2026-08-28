import { describe, test, expect } from "bun:test";
import { analyseStrategy, cadenceDays, keywordMatches, lintStrategy, normalizeText, parseStrategy, StrategyError } from "../strategy";
import { VALID } from "./fixtures/strategy-valide";

describe("parseStrategy", () => {
  const s = parseStrategy(VALID);
  test("en-tête", () => {
    expect(s.site).toBe("commentchercherbonheur.org");
    expect(s.date).toBe("2026-08-28");
    expect(s.statut).toBe("brouillon");
    expect(s.dataDir).toBe("seo/strategy/2026-08-28/");
  });
  test("identité : première ligne non vide", () => {
    expect(s.identite).toBe("L'Institut C.H.I.C.O. est un centre de coaching qui vend le bonheur comme une science exacte.");
  });
  test("cibles", () => {
    expect(s.cibles).toEqual({ audience: "grand public francophone", langue: "fr", pays: "FR", surfaces: ["AI Overviews", "ChatGPT"], pourquoi: "audience grand public." });
  });
  test("pages", () => {
    expect(s.pages).toHaveLength(2);
    expect(s.pages[1]).toEqual({ page: "/methode", intention: "informationnelle", motCle: "méthode bonheur", secondaires: ["bonheur au travail"], cadence: "trimestriel", signaux: "Bing FR : rien, non mesurable gratuitement (2026-08-28)" });
    expect(s.pages[0].secondaires).toEqual(["bonheur", "coaching"]);
  });
  test("entité, concurrents, indexnow", () => {
    expect(s.entite).toEqual({ nom: "L'Institut C.H.I.C.O.", sameAs: ["https://x.com/chico", "https://www.tipeee.com/chico"], nap: null });
    expect(s.concurrents).toEqual([]);
    expect(s.indexnow).toBeNull();
  });
  test("tableau de concurrents, NAP, clé IndexNow", () => {
    const md = VALID
      .replace("Aucun concurrent identifié.", "| Concurrent | Ce qu'il vise | Ce qu'on prend, ce qu'on évite |\n|---|---|---|\n| exemple.fr | pages piliers | on prend les piliers |")
      .replace("NAP : non", "NAP :\nAdresse : 1 rue du Bonheur, 44000 Nantes\nTéléphone : 02 00 00 00 00")
      .replace("IndexNow : non", "IndexNow : a1b2c3d4e5f6");
    const t = parseStrategy(md);
    expect(t.concurrents).toEqual([{ domaine: "exemple.fr", vise: "pages piliers", prendEvite: "on prend les piliers" }]);
    expect(t.entite.nap).toEqual({ adresse: "1 rue du Bonheur, 44000 Nantes", telephone: "02 00 00 00 00" });
    expect(t.indexnow).toBe("a1b2c3d4e5f6");
  });
  test("un fichier fautif lève StrategyError avec la liste", () => {
    expect(() => parseStrategy(VALID.replace("## Entité", "## Entite"))).toThrow(StrategyError);
  });
});

describe("lintStrategy", () => {
  test("le gabarit rempli passe", () => expect(lintStrategy(VALID)).toEqual([]));
  const cases: [string, string, string, RegExp][] = [
    ["section manquante", "## Liens externes\n", "## Liens\n", /section manquante : ## Liens externes/],
    ["sections dans le désordre", "## Entité", "## Zz", /section manquante|désordre/],
    ["en-tête sans statut", "Statut : brouillon", "Statut : bof", /ligne 2/],
    ["intention hors vocabulaire", "| informationnelle |", "| info |", /intention « info » hors vocabulaire/],
    ["cadence hors vocabulaire", "| trimestriel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n\n## Entité", "| mensuel | Bing FR : rien, non mesurable gratuitement (2026-08-28) |\n\n## Entité", /cadence « mensuel » hors vocabulaire/],
    ["page sans /", "| /methode |", "| methode |", /doit commencer par \//],
    ["page en double", "| /methode |", "| / |", /« \/ » en double/],
    ["mot-clé principal vide", "| méthode bonheur |", "|  |", /mot-clé principal vide/],
    ["signaux sans date", "non mesurable gratuitement (2026-08-28) |\n\n## Entité", "non mesurable gratuitement |\n\n## Entité", /Signaux sans date/],
    ["nom manquant", "Nom : L'Institut C.H.I.C.O.", "Nom :", /« Nom : » manquant/],
    ["NAP absent", "NAP : non", "", /NAP : non/],
    ["clé IndexNow mal formée", "IndexNow : non", "IndexNow : abc", /clé IndexNow mal formée/],
    ["IndexNow manquant", "IndexNow : non", "", /IndexNow : <clé>/],
    ["ce qu'on ne sait pas vide", "Volumes : Bing interrogé le 2026-08-28, rien.", "", /Ce qu'on ne sait pas : section vide/],
    ["tiret cadratin", "Pas d'achat de liens.", "Pas d'achat — jamais.", /tiret cadratin/],
    ["langue manquante", "Langue : fr", "", /« Langue : » manquante/],
  ];
  for (const [name, from, to, re] of cases) {
    test(name, () => {
      const md = VALID.replace(from, to);
      expect(md, "le remplacement doit avoir eu lieu").not.toBe(VALID);
      expect(lintStrategy(md).join("\n")).toMatch(re);
    });
  }
  test("ordre des sections", () => {
    const md = VALID.replace("## Cibles\nAudience : grand public francophone\nLangue : fr\nPays : FR\nSurfaces IA : AI Overviews, ChatGPT\nPourquoi : audience grand public.\n\n", "")
      + "\n## Cibles\nAudience : x\nLangue : fr\nPays : FR\n";
    expect(lintStrategy(md).join("\n")).toMatch(/désordre/);
  });
  test("analyseStrategy rend aussi la stratégie partielle", () => {
    const { strategy, errors } = analyseStrategy(VALID.replace("Langue : fr", ""));
    expect(errors).toHaveLength(1);
    expect(strategy.pages).toHaveLength(2);
  });
});

describe("normalizeText et keywordMatches", () => {
  test("accents, casse, ponctuation, sigle à points", () => {
    expect(normalizeText("  L'Institut C.H.I.C.O. : Méthode  ")).toBe("l institut chico methode");
    expect(keywordMatches("institut chico", "L'Institut C.H.I.C.O. : le bonheur")).toBe(true);
  });
  test("Agence SEO à Nantes vise agence seo nantes", () => {
    expect(keywordMatches("agence seo nantes", "Agence SEO à Nantes, conseil")).toBe(true);
  });
  test("les mots vides du mot-clé sont ignorés", () => {
    expect(keywordMatches("méthode du bonheur", "La méthode C.H.I.C.O. pour le bonheur")).toBe(true);
  });
  test("un mot manquant fait échouer", () => {
    expect(keywordMatches("agence seo nantes", "Agence SEO à Rennes")).toBe(false);
  });
  test("mot partiel : seo ne vise pas seoul", () => {
    expect(keywordMatches("seo", "Voyage à Séoul")).toBe(false);
  });
  test("mot-clé fait de mots vides", () => {
    expect(keywordMatches("de la", "de la")).toBe(false);
  });
});

test("cadenceDays", () => {
  expect(cadenceDays("2 semaines")).toBe(14);
  expect(cadenceDays("4 semaines")).toBe(28);
  expect(cadenceDays("trimestriel")).toBe(92);
  expect(cadenceDays("annuel")).toBe(366);
  expect(cadenceDays("aucune")).toBeNull();
});
