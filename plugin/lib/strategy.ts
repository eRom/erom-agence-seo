// Contrat du fichier seo/strategy.md : parseur, lint, normalisation, règle des mots. Partagé par strategy et audit.

export const INTENTIONS = ["informationnelle", "transactionnelle", "navigationnelle", "locale"] as const;
export const CADENCES = ["2 semaines", "4 semaines", "trimestriel", "annuel", "aucune"] as const;
export type Intention = (typeof INTENTIONS)[number];
export type Cadence = (typeof CADENCES)[number];

export const SECTIONS = ["Identité", "Cibles", "Concurrents", "Pages ↔ mots-clés", "Entité", "Liens externes", "Cadence de fraîcheur", "Ce qu'on ne sait pas"] as const;
export const PAGES_COLUMNS = ["Page", "Intention", "Mot-clé principal", "Secondaires", "Cadence", "Signaux"] as const;
export const CONCURRENTS_COLUMNS = ["Concurrent", "Ce qu'il vise", "Ce qu'on prend, ce qu'on évite"] as const;
export const AUCUN_CONCURRENT = "Aucun concurrent identifié.";
/** https://www.indexnow.org/documentation (lu le 2026-08-28) : 8 à 128 caractères, a-z, A-Z, 0-9 et tirets. */
export const INDEXNOW_KEY = /^[A-Za-z0-9-]{8,128}$/;
const HEADER = /^(\d{4}-\d{2}-\d{2}) · Statut : (brouillon|validée) · Données : (seo\/strategy\/\d{4}-\d{2}-\d{2}(?:-\d+)?\/)$/;
const DATE = /\d{4}-\d{2}-\d{2}/;

export type PagePlan = { page: string; intention: Intention; motCle: string; secondaires: string[]; cadence: Cadence; signaux: string };
export type Concurrent = { domaine: string; vise: string; prendEvite: string };
export type Nap = { adresse: string; telephone: string };
export type Strategy = {
  site: string;
  date: string;
  statut: "brouillon" | "validée";
  dataDir: string;
  identite: string;
  cibles: { audience: string; langue: string; pays: string; surfaces: string[]; pourquoi: string };
  concurrents: Concurrent[];
  pages: PagePlan[];
  entite: { nom: string; sameAs: string[]; nap: Nap | null };
  liensExternes: string;
  cadenceFraicheur: string;
  indexnow: string | null;
  inconnu: string;
};

export class StrategyError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "StrategyError"; }
}

/** Mots vides ignorés par la règle des mots. Liste fixe, courte, française. */
export const STOP_WORDS = new Set(["le", "la", "les", "l", "un", "une", "des", "du", "de", "d", "a", "au", "aux", "en", "et", "ou", "pour", "sur", "par", "dans", "avec", "sans", "ce", "cet", "cette", "ces", "son", "sa", "ses", "votre", "vos", "notre", "nos", "mon", "ma", "mes"]);

/** Minuscules, accents retirés, sigles à points recollés (C.H.I.C.O. → chico), ponctuation remplacée par des espaces, espaces réduits. */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/(?<=\p{L})\.(?=\p{L})/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

/** Vrai si chaque mot du mot-clé, hors mots vides, apparaît comme mot entier dans le texte. « Agence SEO à Nantes » vise « agence seo nantes ». */
export function keywordMatches(keyword: string, text: string): boolean {
  const tokens = normalizeText(keyword).split(" ").filter((t) => t && !STOP_WORDS.has(t));
  if (tokens.length === 0) return false;
  const present = new Set(normalizeText(text).split(" "));
  return tokens.every((t) => present.has(t));
}

export function cadenceDays(c: Cadence): number | null {
  return { "2 semaines": 14, "4 semaines": 28, trimestriel: 92, annuel: 366, aucune: null }[c];
}

type Sections = Map<string, string[]>;

/** Découpe le fichier : en-tête (avant le premier `## `) et une entrée par section H2, dans l'ordre d'apparition. */
function split(md: string): { head: string[]; sections: Sections; order: string[] } {
  const head: string[] = [];
  const sections: Sections = new Map();
  const order: string[] = [];
  let cur: string[] | null = null;
  for (const raw of md.split("\n")) {
    const h = raw.match(/^## (.+?)\s*$/);
    if (h) { cur = []; sections.set(h[1], cur); order.push(h[1]); continue; }
    (cur ?? head).push(raw);
  }
  return { head, sections, order };
}

const field = (lines: string[], name: string): string | null => {
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*(.*)$`);
  for (const l of lines) { const m = l.match(re); if (m) return m[1].trim(); }
  return null;
};

const cells = (line: string): string[] => line.split("|").slice(1, -1).map((c) => c.trim());
const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(l);

/** Lit un tableau Markdown : en-tête attendu, puis les lignes. Rend null s'il n'y a aucun tableau. */
function table(lines: string[], columns: readonly string[], where: string, errors: string[]): string[][] | null {
  const rows = lines.filter(isTableLine);
  if (rows.length === 0) return null;
  const header = cells(rows[0]);
  if (header.join(" | ") !== columns.join(" | ")) errors.push(`${where} : colonnes attendues « ${columns.join(" | ")} », lues « ${header.join(" | ")} »`);
  const body = rows.slice(1).filter((l) => !isSeparator(l)).map(cells);
  for (const r of body) if (r.length !== columns.length) errors.push(`${where} : ligne à ${r.length} cellules au lieu de ${columns.length} : « ${r[0] ?? ""} »`);
  return body.filter((r) => r.length === columns.length);
}

/** Analyse complète : rend la stratégie et la liste des défauts. `lintStrategy` et `parseStrategy` en dérivent. */
export function analyseStrategy(md: string): { strategy: Strategy; errors: string[] } {
  const errors: string[] = [];
  if (md.includes("—")) errors.push("tiret cadratin présent");
  const { head, sections, order } = split(md);

  const nonEmpty = head.filter((l) => l.trim() !== "");
  const title = nonEmpty[0]?.match(/^# Stratégie SEO\/GEO : (.+)$/);
  if (!title) errors.push("ligne 1 : attendu « # Stratégie SEO/GEO : <site> »");
  const meta = nonEmpty[1]?.match(HEADER);
  if (!meta) errors.push("ligne 2 : attendu « AAAA-MM-JJ · Statut : brouillon | validée · Données : seo/strategy/AAAA-MM-JJ/ »");

  for (const s of SECTIONS) if (!sections.has(s)) errors.push(`section manquante : ## ${s}`);
  const present = order.filter((o) => (SECTIONS as readonly string[]).includes(o));
  const expected = SECTIONS.filter((s) => sections.has(s));
  if (present.join("|") !== expected.join("|")) errors.push(`sections dans le désordre : ${present.join(", ")}`);
  const sec = (name: string) => sections.get(name) ?? [];

  const identite = sec("Identité").map((l) => l.trim()).find((l) => l !== "") ?? "";
  if (!identite) errors.push("Identité : la première ligne doit être la phrase d'identité");

  const c = sec("Cibles");
  const langue = field(c, "Langue") ?? "";
  const pays = field(c, "Pays") ?? "";
  if (!langue) errors.push("Cibles : « Langue : » manquante");
  if (!pays) errors.push("Cibles : « Pays : » manquant");
  const surfaces = (field(c, "Surfaces IA") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  let concurrents: Concurrent[] = [];
  const cl = sec("Concurrents");
  const ct = table(cl, CONCURRENTS_COLUMNS, "Concurrents", errors);
  if (ct) concurrents = ct.map(([domaine, vise, prendEvite]) => ({ domaine, vise, prendEvite }));
  else if (!cl.some((l) => l.trim() === AUCUN_CONCURRENT)) errors.push(`Concurrents : un tableau, ou la ligne « ${AUCUN_CONCURRENT} »`);

  const pages: PagePlan[] = [];
  const pt = table(sec("Pages ↔ mots-clés"), PAGES_COLUMNS, "Pages ↔ mots-clés", errors);
  if (!pt || pt.length === 0) errors.push("Pages ↔ mots-clés : au moins une ligne");
  const seen = new Set<string>();
  for (const [page, intention, motCle, secondaires, cadence, signaux] of pt ?? []) {
    if (!/^\/\S*$/.test(page)) errors.push(`Pages : « ${page} » doit commencer par / et ne pas contenir d'espace`);
    if (seen.has(page)) errors.push(`Pages : « ${page} » en double`);
    seen.add(page);
    if (!(INTENTIONS as readonly string[]).includes(intention)) errors.push(`Pages ${page} : intention « ${intention} » hors vocabulaire (${INTENTIONS.join(", ")})`);
    if (!motCle) errors.push(`Pages ${page} : mot-clé principal vide`);
    if (!(CADENCES as readonly string[]).includes(cadence)) errors.push(`Pages ${page} : cadence « ${cadence} » hors vocabulaire (${CADENCES.join(", ")})`);
    if (!DATE.test(signaux)) errors.push(`Pages ${page} : Signaux sans date AAAA-MM-JJ`);
    pages.push({ page, intention: intention as Intention, motCle, secondaires: secondaires.split(",").map((s) => s.trim()).filter(Boolean), cadence: cadence as Cadence, signaux });
  }

  const e = sec("Entité");
  const nom = field(e, "Nom") ?? "";
  if (!nom) errors.push("Entité : « Nom : » manquant");
  const sameAs = e.map((l) => l.match(/^\s*-\s*(https?:\/\/\S+)\s*$/)?.[1]).filter((u): u is string => Boolean(u));
  const napLine = field(e, "NAP");
  const adresse = field(e, "Adresse");
  const telephone = field(e, "Téléphone");
  let nap: Nap | null = null;
  if (adresse && telephone) nap = { adresse, telephone };
  else if (napLine !== "non") errors.push("Entité : « NAP : non », ou « Adresse : » et « Téléphone : »");

  const cf = sec("Cadence de fraîcheur");
  const ix = field(cf, "IndexNow");
  let indexnow: string | null = null;
  if (ix === null) errors.push("Cadence de fraîcheur : « IndexNow : <clé> » ou « IndexNow : non » manquant");
  else if (ix !== "non") { if (INDEXNOW_KEY.test(ix)) indexnow = ix; else errors.push("Cadence de fraîcheur : clé IndexNow mal formée (8 à 128 caractères, lettres, chiffres, tirets)"); }

  const inconnu = sec("Ce qu'on ne sait pas").join("\n").trim();
  if (!inconnu) errors.push("Ce qu'on ne sait pas : section vide");

  const strategy: Strategy = {
    site: title?.[1].trim() ?? "",
    date: meta?.[1] ?? "",
    statut: (meta?.[2] as Strategy["statut"]) ?? "brouillon",
    dataDir: meta?.[3] ?? "",
    identite,
    cibles: { audience: field(c, "Audience") ?? "", langue, pays, surfaces, pourquoi: field(c, "Pourquoi") ?? "" },
    concurrents,
    pages,
    entite: { nom, sameAs, nap },
    liensExternes: sec("Liens externes").join("\n").trim(),
    cadenceFraicheur: cf.join("\n").trim(),
    indexnow,
    inconnu,
  };
  return { strategy, errors };
}

export const lintStrategy = (md: string): string[] => analyseStrategy(md).errors;

export function parseStrategy(md: string): Strategy {
  const { strategy, errors } = analyseStrategy(md);
  if (errors.length) throw new StrategyError(errors);
  return strategy;
}
