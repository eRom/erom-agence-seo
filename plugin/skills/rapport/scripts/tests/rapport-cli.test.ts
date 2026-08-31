import { describe, test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preparer, rendreDossier } from "../rapport";

const RAPPORT = await Bun.file(`${import.meta.dir}/fixtures/report-chico-n0.md`).text();
const RAPPORT_SAIN = await Bun.file(`${import.meta.dir}/fixtures/report-chico-sain.md`).text();
const CLIENT = await Bun.file(`${import.meta.dir}/fixtures/client-conforme.md`).text();
const COMPLET = CLIENT.replace("<!-- couvre: SD-01, SD-02 -->", "<!-- couvre: SD-01, SD-02, STRAT-01, STRAT-02 -->");

async function dossierAvec(client?: string): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "rapport-"));
  await writeFile(join(d, "report.md"), RAPPORT);
  if (client) await writeFile(join(d, "rapport-client.md"), client);
  return d;
}

describe("preparer", () => {
  test("sort les six trouvailles graves et le compte de mineurs, sans rien écrire", async () => {
    const d = await dossierAvec();
    const sortie = await preparer(d);
    for (const id of ["SD-01", "SD-02", "IDX-02", "TAG-01", "STRAT-01", "STRAT-02"]) {
      expect(sortie).toContain(id);
    }
    // Assertion ancrée sur son libellé : un simple toContain("7") passerait sur du code faux,
    // le chemin mkdtemp contenant presque toujours un chiffre 7. Le libellé ne prétend plus
    // « à annoncer » : ce compte est disponible au moment du preparer, pas encore celui qui
    // sera réellement annoncé (l'action peut en retenir une, D49).
    expect(sortie).toContain("points mineurs et info disponibles : 7");
    expect(await Bun.file(join(d, "rapport-client.md")).exists()).toBe(false);
  });

  test("ne sort aucune trouvaille mineure quand il y a du grave : elles ne sont pas la matière du rapport client", async () => {
    const sortie = await preparer(await dossierAvec());
    expect(sortie).not.toContain("SD-03");
  });

  test("quand l'audit ne porte aucune trouvaille grave, la sortie détaille les mineures pour nourrir l'action (D49)", async () => {
    // report-chico-sain.md : 0 Critique, 0 Important, 1 Mineur (SD-03), 2 Info (PERF-01, AI-01).
    // Sans matière, le modèle ne peut construire aucune action sur ce cas, pourtant le plus fréquent.
    const d = await mkdtemp(join(tmpdir(), "rapport-sain-"));
    await writeFile(join(d, "report.md"), RAPPORT_SAIN);
    const sortie = await preparer(d);
    expect(sortie).toContain("trouvailles graves (0)");
    for (const id of ["SD-03", "PERF-01", "AI-01"]) {
      expect(sortie).toContain(id);
    }
    expect(sortie).toContain("pourquoi");
    expect(sortie).toContain("correctif");
  });
});

describe("rendreDossier", () => {
  test("écrit le HTML quand le lint passe", async () => {
    const d = await dossierAvec(COMPLET);
    await rendreDossier(d);
    const html = await Bun.file(join(d, "rapport-client.html")).text();
    expect(html).toContain("<title>Comment chercher le bonheur</title>");
    expect(html).not.toMatch(/(src|href)\s*=\s*["']https?:\/\//);
    // Le défaut trouvé en revue, sur ce rendu réel : le commentaire de provenance de tokens.css
    // (chemin du dépôt du DS institut, version du paquet) arrivait intact dans ce HTML.
    expect(html).not.toContain("erom-design-system-institutionnel");
    expect(html).not.toContain("erom-institut 0.1.0");
  });

  test("n'écrit RIEN quand le lint refuse", async () => {
    const d = await dossierAvec(CLIENT); // STRAT-01 et STRAT-02 non couvertes
    await expect(rendreDossier(d)).rejects.toThrow(/STRAT-01/);
    expect(await Bun.file(join(d, "rapport-client.html")).exists()).toBe(false);
  });
});
