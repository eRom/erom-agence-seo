// Les six règles de D47, amendées par D49. Pur : deux chaînes en entrée, la liste des refus en sortie.
// D49 : l'action de la semaine peut s'appuyer sur n'importe quelle trouvaille, y compris Mineur ou Info ;
// les sections d'inventaire ne portent que du Critique et de l'Important ; le compte de points mineurs
// annoncé exclut celles que l'action a déjà remontées.
import { parseReport, ReportError, type Severity } from "../../../../lib/report";
import { parseRapportClient, RapportClientError, idsVisibles, lignesEmDash } from "./contrat";

const GRAVES: readonly Severity[] = ["Critique", "Important"];

export function verifier(clientMd: string, rapportMd: string): string[] {
  const refus: string[] = [];

  let client;
  try { client = parseRapportClient(clientMd); }
  catch (e) { return (e as RapportClientError).errors; }

  // Un rapport technique illisible se nomme, il ne remonte pas en stack trace : c'est la
  // convention du dépôt, déjà tenue par checklist.ts et par plan.ts, qui importent ReportError.
  let rapport;
  try { rapport = parseReport(rapportMd); }
  catch (e) {
    if (e instanceof ReportError) return [`rapport technique inanalysable : ${e.errors.join(" ; ")}`];
    throw e;
  }
  const graves = rapport.findings.filter((f) => GRAVES.includes(f.severity));
  const mineurs = rapport.findings.filter((f) => !GRAVES.includes(f.severity));
  const connus = new Map(rapport.findings.map((f) => [f.id, f.severity] as const));

  const parAction = new Set(client.action.couvre);
  const parSections = new Set([...client.bloque, ...client.freine].flatMap((s) => s.couvre));

  for (const f of graves) {
    if (!parAction.has(f.id) && !parSections.has(f.id)) {
      refus.push(`${f.id} (${f.severity}) n'est couverte ni par l'action ni par une section : « ${f.title} »`);
    }
  }
  for (const id of parSections) {
    const sev = connus.get(id);
    if (sev === undefined) refus.push(`${id} est couverte mais absente du rapport technique`);
    else if (!GRAVES.includes(sev)) refus.push(`${id} est ${sev} : une section d'inventaire ne porte que du Critique ou de l'Important (D49)`);
  }
  for (const id of parAction) {
    if (!connus.has(id)) refus.push(`${id} est couverte par l'action mais absente du rapport technique`);
  }

  const restants = mineurs.filter((f) => !parAction.has(f.id)).length;
  if (client.mineursAnnonces !== restants) {
    refus.push(`compte de points mineurs faux : ${client.mineursAnnonces} annoncés, ${restants} attendus`);
  }
  for (const { ligne, id } of idsVisibles(clientMd)) {
    refus.push(`ligne ${ligne} : l'identifiant ${id} est visible par le client`);
  }
  for (const ligne of lignesEmDash(clientMd)) {
    refus.push(`ligne ${ligne} : tiret cadratin interdit dans un document remis à un tiers`);
  }
  // Le rendu ne connaît que le paragraphe et la liste numérotée. Tout autre balisage
  // arriverait en clair chez le client (des backticks, des astérisques), ce qui est pire
  // qu'un rendu pauvre. On le refuse à l'écriture plutôt que d'étendre le rendu.
  for (const s of [client.action, ...client.bloque, ...client.freine]) {
    if (/`/.test(s.corps)) refus.push(`section « ${s.titre} » : accent grave, le rendu l'afficherait tel quel`);
    if (/\*\*|__/.test(s.corps)) refus.push(`section « ${s.titre} » : gras Markdown, le rendu l'afficherait tel quel`);
    if (/^- /m.test(s.corps)) refus.push(`section « ${s.titre} » : liste à tirets, seule la liste numérotée est rendue`);
  }
  return refus;
}
