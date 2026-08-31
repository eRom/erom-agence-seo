// Les six règles de D47, amendées par D49. Pur : deux chaînes en entrée, la liste des refus en sortie.
// D49 : l'action de la semaine peut s'appuyer sur n'importe quelle trouvaille, y compris Mineur ou Info ;
// les sections d'inventaire ne portent que du Critique et de l'Important ; le compte de points mineurs
// annoncé exclut celles que l'action a déjà remontées.
import { parseReport, ReportError, type Severity } from "../../../../lib/report";
import { parseRapportClient, RapportClientError, idsVisibles, lignesEmDash, couvreMalPlaces } from "./contrat";

const GRAVES: readonly Severity[] = ["Critique", "Important"];

/** Le rendu ne connaît que le paragraphe et la liste numérotée : tout autre balisage arriverait
 *  en clair chez le client (des backticks, des astérisques). On le refuse à l'écriture. `zone`
 *  nomme l'endroit du document pour un message utile, sans le forcer dans une forme qu'il n'a pas. */
function refuserBalisage(refus: string[], zone: string, texte: string): void {
  if (/`/.test(texte)) refus.push(`${zone} : accent grave, le rendu l'afficherait tel quel`);
  if (/\*\*|__/.test(texte)) refus.push(`${zone} : gras Markdown, le rendu l'afficherait tel quel`);
  if (/^- /m.test(texte)) refus.push(`${zone} : liste à tirets, seule la liste numérotée est rendue`);
}

export function verifier(clientMd: string, rapportMd: string): string[] {
  const refus: string[] = [];

  let client;
  try { client = parseRapportClient(clientMd); }
  catch (e) {
    if (e instanceof RapportClientError) return e.errors;
    throw e;
  }

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
  const sectionsInventaire = [...client.bloque, ...client.freine];
  const parSections = new Set(sectionsInventaire.flatMap((s) => s.couvre));

  for (const s of sectionsInventaire) {
    if (s.couvre.length > 0 && s.corps === "") {
      refus.push(`section « ${s.titre} » : couvre ${s.couvre.join(", ")} sans un mot d'explication`);
    }
  }

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
  // Un couvre: hors d'un bloc ### (synthèse, Méthode, Ce qui marche déjà) n'est jamais retiré
  // par le parseur, et idsVisibles() l'exempte à tort parce qu'il en a la forme : sans ce refus,
  // l'identifiant qu'il porte finit lisible, échappé, dans le HTML remis au client.
  for (const ligne of couvreMalPlaces(clientMd)) {
    refus.push(`ligne ${ligne} : commentaire couvre: hors d'un bloc de section, il fuira dans le document remis au client`);
  }
  for (const { ligne, id } of idsVisibles(clientMd)) {
    refus.push(`ligne ${ligne} : l'identifiant ${id} est visible par le client`);
  }
  for (const ligne of lignesEmDash(clientMd)) {
    refus.push(`ligne ${ligne} : tiret cadratin interdit dans un document remis à un tiers`);
  }

  for (const s of [client.action, ...sectionsInventaire]) {
    refuserBalisage(refus, `section « ${s.titre} »`, s.corps);
  }
  refuserBalisage(refus, "la synthèse d'ouverture", client.synthese);
  for (const puce of client.marche) {
    refuserBalisage(refus, "« Ce qui marche déjà »", puce);
  }
  return refus;
}
