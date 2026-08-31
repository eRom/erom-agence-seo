import { describe, test, expect } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifier } from "../lib/verifier";
import { lintDossier } from "../lint-client";

const CLIENT = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();
const RAPPORT = await Bun.file(`${import.meta.dir}/fixtures/report-chico-n0.md`).text();
const SAIN = await Bun.file(`${import.meta.dir}/fixtures/client-sain.md`).text();
const RAPPORT_SAIN = await Bun.file(`${import.meta.dir}/fixtures/report-chico-sain.md`).text();

describe("verifier", () => {
  test("la fixture conforme laisse deux Important non couvertes, et le dit", () => {
    // client-conforme.md couvre TAG-01, IDX-02, SD-01, SD-02 ; le rapport en porte six.
    const refus = verifier(CLIENT, RAPPORT);
    expect(refus.join("\n")).toContain("STRAT-01");
    expect(refus.join("\n")).toContain("STRAT-02");
  });

  test("aucun refus quand les six Important sont couvertes", () => {
    const complet = CLIENT.replace(
      "<!-- couvre: SD-01, SD-02 -->",
      "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->",
    );
    expect(verifier(complet, RAPPORT)).toEqual([]);
  });

  test("refuse une trouvaille mineure glissée dans une section d'inventaire", () => {
    const avecMineur = CLIENT.replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02, SD-03 -->");
    expect(verifier(avecMineur, RAPPORT).join("\n")).toContain("SD-03");
  });

  test("refuse un compte de points mineurs faux", () => {
    const fauxCompte = CLIENT
      .replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->")
      .replace("7 points mineurs", "3 points mineurs");
    expect(verifier(fauxCompte, RAPPORT).join("\n")).toContain("compte de points mineurs faux");
  });

  test("exige la couverture d'une trouvaille Critique, pas seulement Important", () => {
    // report-chico-n0.md n'a aucune Critique ; on en fabrique une à partir d'une Important réelle,
    // non couverte par client-conforme.md, pour vérifier que GRAVES traite les deux pareil.
    const rapportAvecCritique = RAPPORT.replace("[Important] STRAT-01", "[Critique] STRAT-01");
    expect(rapportAvecCritique).not.toEqual(RAPPORT);
    expect(verifier(CLIENT, rapportAvecCritique).join("\n")).toContain("STRAT-01 (Critique)");
  });

  test("refuse un couvre: échappé dans la synthèse d'ouverture, hors de tout bloc, en nommant la ligne", () => {
    // Le cas démontré par la revue : sans ce refus, verifier() disait « conforme » alors que
    // TAG-01 finissait lisible dans le HTML produit par rendre().
    const complet = CLIENT.replace(
      "<!-- couvre: SD-01, SD-02 -->",
      "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->",
    );
    expect(verifier(complet, RAPPORT)).toEqual([]); // le témoin : sans la fuite, aucun refus.
    const fuite = complet.replace(
      "Votre site est en bonne santé technique",
      "<!-- couvre: TAG-01 -->\nVotre site est en bonne santé technique",
    );
    const ligne = fuite.split("\n").findIndex((l) => l.trim() === "<!-- couvre: TAG-01 -->") + 1;
    const refus = verifier(fuite, RAPPORT).join("\n");
    expect(refus).toContain(`ligne ${ligne}`);
    expect(refus).toContain("couvre");
  });
});

describe("verifier, le site sain de D49", () => {
  test("accepte un rapport sans aucune trouvaille grave, dont l'action porte une Info", () => {
    // report-chico-sain.md : 0 Critique, 0 Important, 1 Mineur, 2 Info. L'action porte AI-01.
    expect(verifier(SAIN, RAPPORT_SAIN)).toEqual([]);
  });

  test("le compte annoncé exclut la mineure remontée par l'action", () => {
    // Trois mineures au rapport technique, une portée par l'action : deux restent à annoncer.
    const troisAnnonces = SAIN.replace("2 points mineurs", "3 points mineurs");
    expect(verifier(troisAnnonces, RAPPORT_SAIN).join("\n")).toContain("2 attendus");
  });

  test("refuse la même Info dans une section d'inventaire, alors qu'elle passe dans l'action", () => {
    const dansInventaire = SAIN.replace(
      "## Ce qui marche déjà",
      "## Ce qui freine\n### Pas de données de vitesse\n<!-- couvre: PERF-01 -->\nUn corps.\n\n## Ce qui marche déjà",
    );
    expect(verifier(dansInventaire, RAPPORT_SAIN).join("\n")).toContain("section d'inventaire ne porte que");
  });

  test("refuse un identifiant que le rapport technique ne porte pas", () => {
    const inventé = SAIN.replace("<!-- couvre: AI-01 -->", "<!-- couvre: IDX-01 -->");
    expect(verifier(inventé, RAPPORT_SAIN).join("\n")).toContain("absente du rapport technique");
  });

  test("refuse un balisage que le rendu ne sait pas rendre", () => {
    const gras = SAIN.replace("Créez un fichier nommé llms.txt", "Créez un fichier nommé **llms.txt**");
    expect(verifier(gras, RAPPORT_SAIN).join("\n")).toContain("gras Markdown");
    const backtick = SAIN.replace("Créez un fichier nommé llms.txt", "Créez un fichier nommé `llms.txt`");
    expect(verifier(backtick, RAPPORT_SAIN).join("\n")).toContain("accent grave");
  });

  test("refuse un commentaire HTML dans le texte du client, que le rendu ferait disparaître sans le dire", () => {
    // Le défaut trouvé par la re-revue : sans ce refus, ce passage survit au lint puis s'efface
    // silencieusement au rendu (défense en profondeur de rendu.ts), amputant le texte du client.
    const avecCommentaire = SAIN.replace(
      "Rien ne freine",
      "Rien ne freine, littéralement <!-- ceci --> dans son texte",
    );
    const refus = verifier(avecCommentaire, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("synthèse");
    expect(refus).toContain("commentaire HTML");
  });

  test("un couvre: légitime ne déclenche pas le refus de commentaire HTML : blocs() l'a déjà retiré du corps", () => {
    // Non-régression explicite du nouveau refus : SAIN et le CLIENT complété portent chacun des
    // couvre: normaux, vivant dans un bloc ### et retirés du corps avant que verifier() ne regarde.
    const complet = CLIENT.replace(
      "<!-- couvre: SD-01, SD-02 -->",
      "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->",
    );
    expect(verifier(complet, RAPPORT)).toEqual([]);
    expect(verifier(SAIN, RAPPORT_SAIN)).toEqual([]);
  });

  test("refuse un gras dans « Ce qui marche déjà », zone jusqu'ici hors radar", () => {
    const gras = SAIN.replace(
      "Chaque page a son propre titre et sa propre description",
      "Chaque page a son propre **titre** et sa propre description",
    );
    const refus = verifier(gras, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("Ce qui marche déjà");
    expect(refus).toContain("gras Markdown");
  });

  test("refuse un accent grave dans la synthèse d'ouverture, zone jusqu'ici hors radar", () => {
    const backtick = SAIN.replace("Rien ne freine", "Rien ne `freine`");
    const refus = verifier(backtick, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("synthèse");
    expect(refus).toContain("accent grave");
  });

  test("refuse un gras dans la synthèse d'ouverture", () => {
    const gras = SAIN.replace("Rien ne freine", "Rien ne **freine** pas");
    const refus = verifier(gras, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("synthèse");
    expect(refus).toContain("gras Markdown");
  });

  test("refuse une section d'inventaire qui couvre une trouvaille sans un mot d'explication", () => {
    const sansCorps = SAIN.replace(
      "## Ce qui marche déjà",
      "## Ce qui freine\n### Un frein sans détail\n<!-- couvre: PERF-01 -->\n\n## Ce qui marche déjà",
    );
    expect(verifier(sansCorps, RAPPORT_SAIN).join("\n")).toContain("sans un mot d'explication");
  });
});

describe("verifier, trois fuites de contenu silencieuses (revue finale du 31/08)", () => {
  test("refuse une puce de « Ce qui marche déjà » repliée sur deux lignes : la ligne de continuation disparaît du HTML", () => {
    const repliee = SAIN.replace(
      "- Chaque page a son propre titre et sa propre description",
      "- Chaque page a son propre titre et sa propre description\net une meta bien renseignée",
    );
    const refus = verifier(repliee, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("Ce qui marche déjà");
    expect(refus).toMatch(/ligne \d+/);
  });

  test("refuse un chapeau de prose placé après un titre de section mais avant son premier bloc ###, qui disparaîtrait du HTML", () => {
    const chapeau = SAIN.replace(
      "## À faire cette semaine\n### Ajouter un fichier",
      "## À faire cette semaine\nCette semaine, une seule chose compte.\n### Ajouter un fichier",
    );
    const refus = verifier(chapeau, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("chapeau");
    expect(refus).toMatch(/ligne \d+/);
  });

  test("refuse un gras dans la section « Méthode », zone jusqu'ici hors du contrôle de balisage", () => {
    const gras = SAIN.replace("Relevé du 31 août 2026", "Relevé du **31 août 2026**");
    const refus = verifier(gras, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("Méthode");
    expect(refus).toContain("gras Markdown");
  });

  test("refuse un commentaire HTML dans la section « Méthode », que le rendu amputerait sans un mot", () => {
    const avecCommentaire = SAIN.replace("Relevé du 31 août 2026", "Relevé du 31 août 2026 <!-- brouillon -->");
    const refus = verifier(avecCommentaire, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("Méthode");
    expect(refus).toContain("commentaire HTML");
  });

  test("refuse un gras dans le titre d'un bloc de section, zone jusqu'ici hors du contrôle de balisage", () => {
    const gras = SAIN.replace(
      "### Ajouter un fichier qui présente votre site aux assistants IA",
      "### Ajouter un fichier **llms.txt**",
    );
    const refus = verifier(gras, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("titre de");
    expect(refus).toContain("gras Markdown");
  });

  test("refuse un commentaire HTML dans le titre d'un bloc, que le rendu amputerait sans un mot", () => {
    const avecCommentaire = SAIN.replace(
      "### Ajouter un fichier qui présente votre site aux assistants IA",
      "### Ajouter un fichier <!-- todo --> qui présente votre site aux assistants IA",
    );
    const refus = verifier(avecCommentaire, RAPPORT_SAIN).join("\n");
    expect(refus).toContain("titre de");
    expect(refus).toContain("commentaire HTML");
  });
});

describe("lintDossier, le contrat sur fichiers", () => {
  async function dossier(client: string, rapport: string): Promise<string> {
    const d = await mkdtemp(join(tmpdir(), "lint-client-"));
    await writeFile(join(d, "report.md"), rapport);
    await writeFile(join(d, "rapport-client.md"), client);
    return d;
  }

  test("ne rend aucun refus sur un dossier conforme", async () => {
    expect(await lintDossier(await dossier(SAIN, RAPPORT_SAIN))).toEqual([]);
  });

  test("nomme la ligne du tiret cadratin, ce qu'AC-5 exige", async () => {
    const d = await dossier(SAIN.replace("Vos pages portent", "Vos pages portent — oui —"), RAPPORT_SAIN);
    expect((await lintDossier(d)).join("\n")).toMatch(/ligne \d+ : tiret cadratin/);
  });

  test("nomme un rapport technique illisible au lieu de lever", async () => {
    const d = await dossier(SAIN, "# pas un rapport d'audit\n");
    expect((await lintDossier(d)).join("\n")).toContain("inanalysable");
  });

  test("refuse un identifiant de catalogue visible par le client", () => {
    const fuite = CLIENT
      .replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->")
      .replace("Le titre d'une page", "La vérification TAG-01 dit que le titre d'une page");
    expect(verifier(fuite, RAPPORT).join("\n")).toMatch(/TAG-01.*ligne \d+|ligne \d+.*TAG-01/);
  });

  test("refuse un tiret cadratin, en nommant la ligne", () => {
    const dash = CLIENT
      .replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->")
      .replace("Vos pages se chargent vite", "Vos pages se chargent vite — et bien");
    expect(dash).toContain("—");
    expect(verifier(dash, RAPPORT).join("\n")).toContain("tiret cadratin");
  });

  test("remonte les erreurs de contrat plutôt que de planter", () => {
    expect(verifier("# Rien\n", RAPPORT).length).toBeGreaterThan(0);
  });
});
