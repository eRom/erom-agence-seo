import { describe, test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preparer, rendreDossier } from "../rapport";

const RAPPORT = await Bun.file(`${import.meta.dir}/fixtures/report-chico-n0.md`).text();
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
    // le chemin mkdtemp contenant presque toujours un chiffre 7.
    expect(sortie).toContain("points mineurs à annoncer : 7");
    expect(await Bun.file(join(d, "rapport-client.md")).exists()).toBe(false);
  });

  test("ne sort aucune trouvaille mineure : elles ne sont pas la matière du rapport client", async () => {
    const sortie = await preparer(await dossierAvec());
    expect(sortie).not.toContain("SD-03");
  });
});

describe("rendreDossier", () => {
  test("écrit le HTML quand le lint passe", async () => {
    const d = await dossierAvec(COMPLET);
    await rendreDossier(d);
    const html = await Bun.file(join(d, "rapport-client.html")).text();
    expect(html).toContain("<title>Comment chercher le bonheur</title>");
    expect(html).not.toMatch(/(src|href)\s*=\s*["']https?:\/\//);
  });

  test("n'écrit RIEN quand le lint refuse", async () => {
    const d = await dossierAvec(CLIENT); // STRAT-01 et STRAT-02 non couvertes
    await expect(rendreDossier(d)).rejects.toThrow(/STRAT-01/);
    expect(await Bun.file(join(d, "rapport-client.html")).exists()).toBe(false);
  });
});
