// Contrat de rapport-client.md, le Markdown que Claude écrit et que le rendu transforme en HTML.
// Le rapport technique (report.md) a son propre contrat dans plugin/lib/report.ts ; les deux ne se mélangent pas.

export type SectionClient = { titre: string; couvre: string[]; corps: string };
export type RapportClient = {
  site: string; date: string; synthese: string;
  action: SectionClient; bloque: SectionClient[]; freine: SectionClient[];
  marche: string[]; methode: string; mineursAnnonces: number;
};

export class RapportClientError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "RapportClientError"; }
}

/** Les dix préfixes du catalogue, relevés sur skills/audit/references/checks/. ROBOTS, jamais ROB. */
export const PREFIXES = ["AI", "FRESH", "IDX", "PERF", "REND", "ROBOTS", "SD", "SNIP", "STRAT", "TAG"] as const;
const ID_SOURCE = `\\b(${PREFIXES.join("|")})-\\d{2}\\b`;
const ID_EXACT = new RegExp(`^(${PREFIXES.join("|")})-\\d{2}$`);
const COUVRE_RE = /^<!--\s*couvre\s*:\s*(.+?)\s*-->\s*$/;

const TITRES = {
  action: "## À faire cette semaine", bloque: "## Ce qui bloque",
  freine: "## Ce qui freine", marche: "## Ce qui marche déjà", methode: "## Méthode",
} as const;

/** Contenu d'une section `## titre` jusqu'au prochain `## ` (ou la fin). Null si la section est absente. */
function section(md: string, heading: string): string | null {
  const i = md.indexOf(`\n${heading}`);
  if (i < 0) return null;
  const rest = md.slice(i + heading.length + 1);
  const next = rest.search(/\n## /);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

/** Découpe une section en blocs `### titre`, chacun pouvant porter un commentaire couvre:. */
function blocs(sec: string, errors: string[], ou: string): SectionClient[] {
  const out: SectionClient[] = [];
  for (const bloc of sec.split(/^### /m).slice(1)) {
    const [titre, ...lignes] = bloc.split("\n");
    const couvre: string[] = [];
    const corps: string[] = [];
    for (const l of lignes) {
      // Le trim est solidaire de celui d'idsVisibles : sans lui, un commentaire indenté
      // n'est pas parsé ici mais reste exclu du détecteur de fuite, et ses identifiants
      // partent en clair dans le HTML du client. Les deux tests le verrouillent.
      const m = l.trim().match(COUVRE_RE);
      if (m) {
        for (const id of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
          if (ID_EXACT.test(id)) couvre.push(id);
          else errors.push(`${ou} « ${titre.trim()} » : identifiant illisible « ${id} »`);
        }
        continue;
      }
      corps.push(l);
    }
    out.push({ titre: titre.trim(), couvre, corps: corps.join("\n").trim() });
  }
  return out;
}

/** Lit un rapport client conforme au gabarit. Lève RapportClientError en listant tout ce qui cloche. */
export function parseRapportClient(md: string): RapportClient {
  const errors: string[] = [];
  const lignes = md.split("\n");

  const site = lignes[0]?.match(/^# (.+)$/)?.[1]?.trim();
  if (!site) errors.push("première ligne : « # <nom du site> » attendu");
  const date = lignes[1]?.match(/^Revue du (.+)$/)?.[1]?.trim();
  if (!date) errors.push("deuxième ligne : « Revue du <date> » attendu");

  const secAction = section(md, TITRES.action);
  if (secAction === null) errors.push("section « À faire cette semaine » absente");
  const actions = secAction === null ? [] : blocs(secAction, errors, "action");
  if (secAction !== null && actions.length !== 1) {
    errors.push(`section « À faire cette semaine » : une seule action attendue, ${actions.length} trouvée(s)`);
  }
  if (actions[0] && actions[0].corps === "") errors.push("l'action de la semaine n'a pas de corps");

  const secMethode = section(md, TITRES.methode);
  if (secMethode === null) errors.push("section « Méthode » absente");
  const mMineurs = (secMethode ?? "").match(/(\d+)\s+points?\s+mineurs?/);
  if (!mMineurs) errors.push("section « Méthode » : la ligne du compte de points mineurs est absente");

  const finEntete = md.indexOf("\n## ");
  const synthese = (finEntete < 0 ? "" : md.slice(0, finEntete)).split("\n").slice(2).join("\n").trim();
  if (synthese === "") errors.push("la synthèse d'ouverture est absente");

  const secBloque = section(md, TITRES.bloque);
  const secFreine = section(md, TITRES.freine);
  const secMarche = section(md, TITRES.marche);
  const bloque = secBloque === null ? [] : blocs(secBloque, errors, "blocage");
  const freine = secFreine === null ? [] : blocs(secFreine, errors, "frein");

  if (errors.length) throw new RapportClientError(errors);
  return {
    site: site!, date: date!, synthese, action: actions[0]!, bloque, freine,
    marche: (secMarche ?? "").split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim()),
    methode: secMethode!, mineursAnnonces: Number(mMineurs![1]),
  };
}

/** Les identifiants de catalogue visibles par le client, hors commentaires couvre:. */
export function idsVisibles(md: string): { ligne: number; id: string }[] {
  const out: { ligne: number; id: string }[] = [];
  const re = new RegExp(ID_SOURCE, "g");
  md.split("\n").forEach((l, i) => {
    if (COUVRE_RE.test(l.trim())) return;
    for (const m of l.matchAll(re)) out.push({ ligne: i + 1, id: m[0] });
  });
  return out;
}

/** Les numéros de ligne portant un tiret cadratin. */
export function lignesEmDash(md: string): number[] {
  const out: number[] = [];
  md.split("\n").forEach((l, i) => { if (l.includes("—")) out.push(i + 1); });
  return out;
}

/** Les numéros de ligne (1-based) de tous les commentaires couvre: du document, où qu'ils soient.
 *  Même expression régulière et même .trim() que blocs() et idsVisibles : c'est cette solidarité
 *  qui garantit qu'aucun commentaire n'échappe à la fois au parseur et au détecteur de fuite. */
export function lignesCouvre(md: string): number[] {
  const out: number[] = [];
  md.split("\n").forEach((l, i) => { if (COUVRE_RE.test(l.trim())) out.push(i + 1); });
  return out;
}

const SECTIONS_A_BLOCS: readonly string[] = [TITRES.action, TITRES.bloque, TITRES.freine];

/** Les lignes de lignesCouvre() qui ne tombent dans aucun bloc ### d'une section à blocs
 *  (À faire cette semaine, Ce qui bloque, Ce qui freine) : la synthèse d'ouverture, Méthode,
 *  Ce qui marche déjà, ou le préambule d'une section à blocs avant son premier ###. blocs()
 *  les ignore sans le dire, et idsVisibles() les exempte à tort parce qu'ils ressemblent à un
 *  couvre: légitime : c'est cette combinaison qui laisse un identifiant fuiter jusqu'au client. */
export function couvreMalPlaces(md: string): number[] {
  const legit = new Set<number>();
  let dansSectionABlocs = false;
  let dansBloc = false;
  md.split("\n").forEach((l, i) => {
    if (/^## /.test(l)) { dansSectionABlocs = SECTIONS_A_BLOCS.includes(l.trimEnd()); dansBloc = false; return; }
    if (/^### /.test(l)) { if (dansSectionABlocs) dansBloc = true; return; }
    if (dansSectionABlocs && dansBloc) legit.add(i + 1);
  });
  return lignesCouvre(md).filter((n) => !legit.has(n));
}
