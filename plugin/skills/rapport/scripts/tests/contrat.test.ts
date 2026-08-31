import { describe, test, expect } from "bun:test";
import { parseRapportClient, RapportClientError, idsVisibles, lignesEmDash } from "../lib/contrat";

const CONFORME = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();

const erreursDe = (md: string): string[] => {
  try { parseRapportClient(md); return []; }
  catch (e) { return (e as RapportClientError).errors; }
};

describe("parseRapportClient, cas nominal", () => {
  test("lit l'en-tête, l'action et ses identifiants couverts", () => {
    const r = parseRapportClient(CONFORME);
    expect(r.site).toBe("Comment chercher le bonheur");
    expect(r.date).toBe("31 août 2026");
    expect(r.action.titre).toBe("Donner un titre propre à vos six pages principales");
    expect(r.action.couvre).toEqual(["TAG-01", "IDX-02"]);
    expect(r.action.corps).toContain("Le titre d'une page est la ligne bleue");
  });

  test("une section absente n'est pas une erreur : un rapport sans Critique n'a pas de « Ce qui bloque »", () => {
    const r = parseRapportClient(CONFORME);
    expect(r.bloque).toEqual([]);
    expect(r.freine).toHaveLength(1);
    expect(r.freine[0].couvre).toEqual(["SD-01", "SD-02"]);
  });

  test("lit les points forts et le compte de mineurs annoncé", () => {
    const r = parseRapportClient(CONFORME);
    expect(r.marche).toHaveLength(2);
    expect(r.mineursAnnonces).toBe(7);
  });
});

describe("parseRapportClient, refus", () => {
  test("refuse un rapport sans action de la semaine", () => {
    const errs = erreursDe(CONFORME.replace("## À faire cette semaine", "## Autre chose"));
    expect(errs.join("\n")).toContain("À faire cette semaine » absente");
  });

  test("refuse deux actions : le rapport en porte une seule", () => {
    const deux = CONFORME.replace("## Ce qui freine", "### Une deuxième action\nUn corps.\n\n## Ce qui freine");
    expect(erreursDe(deux).join("\n")).toContain("une seule action attendue, 2 trouvée(s)");
  });

  test("refuse un compte de points mineurs absent", () => {
    const sansCompte = CONFORME.replace(/\d+ points mineurs[^\n]*\n?/, "");
    expect(erreursDe(sansCompte).join("\n")).toContain("compte de points mineurs est absente");
  });

  test("refuse un identifiant illisible dans couvre:", () => {
    const errs = erreursDe(CONFORME.replace("<!-- couvre: TAG-01, IDX-02 -->", "<!-- couvre: TAG-1, BIDON-02 -->"));
    expect(errs.join("\n")).toContain("TAG-1");
    expect(errs.join("\n")).toContain("BIDON-02");
  });

  test("refuse une synthèse d'ouverture absente", () => {
    const sansSynthese = CONFORME.replace(/Votre site est en bonne santé[^\n]*\n/, "");
    expect(erreursDe(sansSynthese).join("\n")).toContain("synthèse d'ouverture est absente");
  });
});

describe("détecteurs de surface", () => {
  test("idsVisibles ignore les commentaires couvre: et attrape le texte visible", () => {
    expect(idsVisibles(CONFORME)).toEqual([]);
    const fuite = CONFORME.replace("Le titre d'une page", "La vérification TAG-01 dit que le titre d'une page");
    const vus = idsVisibles(fuite);
    expect(vus).toHaveLength(1);
    expect(vus[0].id).toBe("TAG-01");
  });

  test("idsVisibles connaît le préfixe ROBOTS, qui n'est pas ROB", () => {
    expect(idsVisibles("Le fichier ROBOTS-02 bloque un bot.")).toHaveLength(1);
  });

  test("un commentaire couvre: indenté est parsé, pas versé dans le corps", () => {
    // Sans le trim dans blocs(), cette ligne n'est pas reconnue comme couvre: mais reste
    // exclue d'idsVisibles : le lint passe et les identifiants partent dans le HTML client.
    const indente = CONFORME.replace("<!-- couvre: TAG-01, IDX-02 -->", "  <!-- couvre: TAG-01, IDX-02 -->");
    const r = parseRapportClient(indente);
    expect(r.action.couvre).toEqual(["TAG-01", "IDX-02"]);
    expect(r.action.corps).not.toContain("couvre:");
    expect(idsVisibles(indente)).toEqual([]);
  });

  test("lignesEmDash rend le numéro de ligne fautive", () => {
    expect(lignesEmDash(CONFORME)).toEqual([]);
    expect(lignesEmDash("ligne une\nune phrase — coupée\n")).toEqual([2]);
  });
});
