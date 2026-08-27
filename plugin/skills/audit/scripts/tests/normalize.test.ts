import { describe, test, expect } from "bun:test";
import { normalizePage, normalizeQuote } from "../lib/normalize";

describe("normalizePage / normalizeQuote", () => {
  test("entité encodée dans la page, balise littérale dans la citation", () => {
    const page = "<p>Make sure every page has a title in the &lt;title&gt; element.</p>";
    expect(normalizePage(page)).toContain(normalizeQuote("a title in the <title> element"));
  });
  test("balise <code> au milieu d'une phrase", () => {
    const page = "<p>You can provide multiple <code>sameAs</code> URLs.</p>";
    expect(normalizePage(page)).toContain(normalizeQuote("You can provide multiple sameAs URLs"));
  });
  test("retour à la ligne dans un texte brut (RFC)", () => {
    const page = "the crawler MUST assume complete\n   disallow.";
    expect(normalizePage(page)).toContain(normalizeQuote("the crawler MUST assume complete disallow"));
  });
  test("espace avant la virgule après une balise", () => {
    const page = "treat all 4xx errors, except <code>429</code>, as if";
    expect(normalizePage(page)).toContain(normalizeQuote("except 429, as if"));
  });
  test("apostrophes typographiques et scripts ignorés", () => {
    const page = "<script>var x = 'didn’t';</script><p>file didn’t exist</p>";
    expect(normalizePage(page)).toContain(normalizeQuote("file didn't exist"));
    expect(normalizePage(page)).not.toContain("var x");
  });
});
