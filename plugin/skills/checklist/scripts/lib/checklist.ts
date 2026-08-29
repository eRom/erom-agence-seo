// Logique pure de checklist.ts : la table des lignes, la lecture et l'écriture de seo/checklist.md, le calcul des cases.
// Aucun réseau, aucun disque, aucun git : tout arrive par ChecklistInput (spec chantier 4, D24, D25, D27).
import type { Report } from "../../../../lib/report";

export type LineKind = "auto" | "main" | "action";
export type Phase = "avant" | "apres";
export type LineDef = { id: string; label: string; kind: LineKind; phase: Phase; jour?: number; consigne?: string };

/** Les quinze lignes, dans l'ordre du fichier (spec 4.3). Le libellé est la clé de reconnaissance (D27), jamais la position. */
export const LINES: readonly LineDef[] = [
  { id: "CL-01", label: "Audit niveau 2 vert", kind: "auto", phase: "avant" },
  { id: "CL-02", label: "Branche seo-build fusionnée", kind: "auto", phase: "avant" },
  { id: "CL-03", label: "Hors build réglés", kind: "main", phase: "avant", consigne: "chaque hors build à l'endroit dit par son « ou »" },
  { id: "CL-04", label: "Search Console : propriété créée", kind: "main", phase: "avant", consigne: "search.google.com/search-console, Ajouter une propriété, type Domaine, enregistrement TXT chez le registrar" },
  { id: "CL-05", label: "Bing Webmaster Tools : site ajouté", kind: "main", phase: "avant", consigne: "bing.com/webmasters, Ajouter un site, Importer depuis Google Search Console" },
  { id: "CL-06", label: "Ancien sitemap sauvegardé", kind: "auto", phase: "avant" },
  { id: "CL-07", label: "Prod verte", kind: "auto", phase: "apres" },
  { id: "CL-08", label: "Redirections de l'ancien site", kind: "auto", phase: "apres" },
  { id: "CL-09", label: "Ping IndexNow", kind: "action", phase: "apres" },
  { id: "CL-10", label: "Sitemap soumis à Bing", kind: "action", phase: "apres" },
  { id: "CL-11", label: "sitemap soumis dans Search Console", kind: "main", phase: "apres", jour: 1, consigne: "Search Console, Sitemaps, coller https://<site>/sitemap.xml (rôle Owner)" },
  { id: "CL-12", label: "pages clés indexées", kind: "main", phase: "apres", jour: 3, consigne: "Search Console, Inspection d'URL, une page par sous-ligne" },
  { id: "CL-13", label: "premières impressions", kind: "main", phase: "apres", jour: 7, consigne: "Search Console, Performances, 7 derniers jours" },
  { id: "CL-14", label: "rapports IA lus", kind: "main", phase: "apres", jour: 30, consigne: "Search Console, Performances, filtre Generative AI (pas sur toutes les propriétés) ; Bing Webmaster Tools, AI Performance" },
  { id: "CL-15", label: "audit de contrôle", kind: "main", phase: "apres", jour: 90, consigne: "relance /erom-seo:checklist, l'audit niveau 0 est refait ; le niveau 1 arrive au chantier 5" },
];
export const SUB_CL04 = "site client : ajouter le compte de l'agence comme utilisateur de la propriété (rôle minimal)";
export const SUB_CL05 = "site client : le client délègue le site en lecture seule au compte de l'agence (écran Users) ; ne jamais demander sa clé";

export type Line = { id: string; label: string; kind: LineKind; phase: Phase; checked: boolean; note: string; sub: string[] };
export type Header = { site: string; miseEnLigne: string | null; dernierPassage: string; auditLocal: string | null; auditProd: string | null };
export type Checklist = { header: Header; lines: Line[] };
export type ParsedLine = { id: string; checked: boolean; kind: LineKind; note: string; sub: string[] };
export type ParsedChecklist = { header: Header; lines: Map<string, ParsedLine> };

export class ChecklistError extends Error {
  constructor(public readonly errors: string[]) { super(errors.join("\n")); this.name = "ChecklistError"; }
}

/** Date AAAA-MM-JJ décalée de n jours, en UTC (J+30 d'un 29 août est le 28 septembre). */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`date invalide : ${date}`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Libellé rendu : les jalons portent « J+n <date> : » devant, calculé depuis la mise en ligne ; sans date, « J+n : ». */
export function renderedLabel(def: LineDef, miseEnLigne: string | null): string {
  if (def.jour === undefined) return def.label;
  return miseEnLigne ? `J+${def.jour} ${addDays(miseEnLigne, def.jour)} : ${def.label}` : `J+${def.jour} : ${def.label}`;
}

const JALON = /^J\+\d+(?: \d{4}-\d{2}-\d{2})? : (.+)$/;
/** Retrouve la définition d'une ligne à partir de son libellé rendu ; null si inconnu (D27). */
export function defByLabel(label: string): LineDef | null {
  const bare = label.match(JALON)?.[1] ?? label;
  return LINES.find((d) => d.label === bare) ?? null;
}

const HEADER_1 = /^# Checklist SEO\/GEO : (.+)$/;
const HEADER_2 = /^Mise en ligne : (\d{4}-\d{2}-\d{2}|non) · Dernier passage : (\d{4}-\d{2}-\d{2}) · Audit local : (.+?) · Audit prod : (.+)$/;
const LINE = /^- \[( |x)\] (.+?) · (auto|main|action) · (.*)$/;
const SUB = /^  - (.+)$/;

/** Lit un seo/checklist.md écrit par renderChecklist. Lève ChecklistError sur un en-tête ou une ligne inconnue ; ne devine jamais. */
export function parseChecklist(md: string): ParsedChecklist {
  const errors: string[] = [];
  const rows = md.split("\n");
  const site = rows[0]?.match(HEADER_1)?.[1]?.trim();
  if (!site) errors.push("première ligne : « # Checklist SEO/GEO : <site> » attendu");
  const h = rows[1]?.match(HEADER_2);
  if (!h) errors.push("deuxième ligne : « Mise en ligne : … · Dernier passage : … · Audit local : … · Audit prod : … » attendu");
  const lines = new Map<string, ParsedLine>();
  let cur: ParsedLine | null = null;
  for (const [i, row] of rows.slice(2).entries()) {
    if (row.trim() === "" || row.startsWith("## ")) { cur = null; continue; }
    const s = row.match(SUB);
    if (s) { if (cur) cur.sub.push(s[1]); else errors.push(`ligne ${i + 3} : sous-ligne sans case au-dessus`); continue; }
    const m = row.match(LINE);
    if (!m) { errors.push(`ligne ${i + 3} : forme inconnue : ${row}`); cur = null; continue; }
    const def = defByLabel(m[2]);
    if (!def) { errors.push(`ligne ${i + 3} : libellé inconnu : ${m[2]}`); cur = null; continue; }
    if (lines.has(def.id)) errors.push(`ligne ${i + 3} : « ${def.label} » en double`);
    cur = { id: def.id, checked: m[1] === "x", kind: m[3] as LineKind, note: m[4].trim(), sub: [] };
    lines.set(def.id, cur);
  }
  if (errors.length) throw new ChecklistError(errors);
  return {
    header: { site: site!, miseEnLigne: h![1] === "non" ? null : h![1], dernierPassage: h![2], auditLocal: h![3] === "aucun" ? null : h![3], auditProd: h![4] === "aucun" ? null : h![4] },
    lines,
  };
}

export function renderChecklist(cl: Checklist): string {
  const { header: hd } = cl;
  const out = [
    `# Checklist SEO/GEO : ${hd.site}`,
    `Mise en ligne : ${hd.miseEnLigne ?? "non"} · Dernier passage : ${hd.dernierPassage} · Audit local : ${hd.auditLocal ?? "aucun"} · Audit prod : ${hd.auditProd ?? "aucun"}`,
  ];
  for (const phase of ["avant", "apres"] as const) {
    out.push("", phase === "avant" ? "## Avant le déploiement" : "## Après le déploiement");
    for (const l of cl.lines.filter((l) => l.phase === phase)) {
      out.push(`- [${l.checked ? "x" : " "}] ${l.label} · ${l.kind} · ${l.note}`);
      for (const s of l.sub) out.push(`  - ${s}`);
    }
  }
  return out.join("\n") + "\n";
}

export type RedirectCheck = { url: string; ok: boolean; detail: string };
export type BingSite = { Url: string; IsVerified: boolean };
export type ActionResult = { ok: boolean; status: number; message: string; urls?: number };

export type ChecklistInput = {
  site: string;
  /** Origine réellement servie (hôte observé par le dernier audit n0, www ou apex), pour les URL absolues. */
  origin: string;
  today: string;
  miseEnLigne: string | null;
  previous: ParsedChecklist | null;
  n2: { dir: string; report: Report } | null;
  /** Dernier audit niveau 0, quel qu'il soit : sert aux hors build. */
  n0: { dir: string; report: Report } | null;
  /** Le même n0 s'il est daté du jour de la mise en ligne ou après ; sinon null : la prod n'a pas encore été vue. */
  n0Prod: { dir: string; report: Report } | null;
  git: { branch: string; seoCommit: string | null };
  horsBuildOu: (id: string) => string | undefined;
  ancienSitemap: { path: string; count: number } | null;
  redirections: RedirectCheck[] | null;
  /** null = pas de clé Bing (ligne 5 reste « main ») ; sinon les sites du compte, même vides. */
  bing: BingSite[] | null;
  bingSiteMatches: (siteUrl: string) => boolean;
  pages: string[];
  actions: { indexnow?: ActionResult; bing?: ActionResult };
  /** Raisons données par le CLI pour lesquelles --agir ne pourra rien faire, vides si tout est réuni. */
  pending: { indexnow?: string; bing?: string };
};

const vert = (r: Report) => r.counts.Critique === 0 && r.counts.Important === 0;
const comptes = (r: Report) => `${r.counts.Critique} Critique, ${r.counts.Important} Important`;

/** Calcule les quinze lignes. Une case « main » cochée dans l'ancien fichier reste cochée ; une case « auto » suit sa source ; une « action » cochée reste faite. */
export function computeChecklist(i: ChecklistInput): Checklist {
  const prev = (id: string) => i.previous?.lines.get(id) ?? null;
  const keepMain = (id: string) => prev(id)?.checked ?? false;
  const line = (def: LineDef, kind: LineKind, checked: boolean, note: string, sub: string[] = []): Line =>
    ({ id: def.id, label: renderedLabel(def, i.miseEnLigne), kind, phase: def.phase, checked, note, sub });
  const lines: Line[] = [];
  // un ancien sitemap déclaré un jour reste déclaré : sa copie présente, ou sa disparition déjà constatée
  const prevCl06 = prev("CL-06")?.note ?? "";
  const ancienDisparu = !i.ancienSitemap && /(ancien-sitemap\.xml · \d+ URL|disparu : redonne --ancien-sitemap)$/.test(prevCl06);

  for (const def of LINES) {
    switch (def.id) {
      case "CL-01": lines.push(i.n2 ? line(def, "auto", vert(i.n2.report), `${i.n2.dir}/report.md · ${comptes(i.n2.report)}`) : line(def, "auto", false, "aucun audit niveau 2 : lance /erom-seo:build")); break;
      case "CL-02": {
        const onMain = i.git.branch === "main" || i.git.branch === "master";
        if (!onMain) lines.push(line(def, "auto", false, `tu es sur ${i.git.branch}, fusionne d'abord`));
        else if (i.git.seoCommit) lines.push(line(def, "auto", true, `git : ${i.git.seoCommit}`));
        else lines.push(line(def, "auto", false, "aucun commit seo(…) sur la branche courante"));
        break;
      }
      case "CL-03": {
        const hb = i.n0 ? i.n0.report.findings.filter((f) => f.severity !== "Info" && i.horsBuildOu(f.id) !== undefined) : [];
        const sub = hb.map((f) => `${f.id} : ${f.title} · ou : ${i.horsBuildOu(f.id)} · vu dans ${i.n0!.dir}`);
        lines.push(line(def, "main", keepMain(def.id), hb.length ? def.consigne! : "aucune trouvaille hors build connue", sub));
        break;
      }
      case "CL-04": lines.push(line(def, "main", keepMain(def.id), def.consigne!, [SUB_CL04])); break;
      case "CL-05": {
        if (i.bing === null) { lines.push(line(def, "main", keepMain(def.id), def.consigne!, [SUB_CL05])); break; }
        const s = i.bing.find((b) => i.bingSiteMatches(b.Url));
        if (!s) lines.push(line(def, "auto", false, `absent du compte Bing de l'agence le ${i.today} · ${def.consigne}`, [SUB_CL05]));
        else lines.push(line(def, "auto", s.IsVerified, `présent dans le compte Bing de l'agence le ${i.today}, ${s.IsVerified ? "vérifié" : "non vérifié (IsVerified false)"} · ${s.Url}`, s.IsVerified ? [] : [SUB_CL05]));
        break;
      }
      case "CL-06": {
        if (i.ancienSitemap) { lines.push(line(def, "auto", true, `${i.ancienSitemap.path} · ${i.ancienSitemap.count} URL`)); break; }
        if (ancienDisparu) { lines.push(line(def, "auto", false, "seo/checklist/ancien-sitemap.xml disparu : redonne --ancien-sitemap")); break; }
        lines.push(line(def, "auto", true, "sans objet (pas d'ancien site)"));
        break;
      }
      case "CL-07": {
        if (!i.miseEnLigne) { lines.push(line(def, "auto", false, "pas encore déployé")); break; }
        if (!i.n0Prod) { lines.push(line(def, "auto", false, "aucun audit prod depuis la mise en ligne")); break; }
        const r = i.n0Prod.report;
        lines.push(line(def, "auto", vert(r), `${i.n0Prod.dir}/report.md · ${enBref(r)}`));
        break;
      }
      case "CL-08": {
        if (!i.miseEnLigne) { lines.push(line(def, "auto", false, "pas encore déployé")); break; }
        if (ancienDisparu) { lines.push(line(def, "auto", false, "ancien sitemap disparu, voir la ligne « Ancien sitemap sauvegardé »")); break; }
        if (!i.ancienSitemap) { lines.push(line(def, "auto", true, "sans objet (pas d'ancien site)")); break; }
        if (!i.redirections) { lines.push(line(def, "auto", false, "ancien sitemap pas encore suivi")); break; }
        const ko = i.redirections.filter((r) => !r.ok);
        lines.push(line(def, "auto", ko.length === 0, ko.length ? `${ko.length} URL sur ${i.redirections.length} ne redirigent pas vers une page en 200` : `${i.redirections.length} URL en 301 ou 308 vers une page en 200 (${i.today})`, ko.map((r) => `${r.url} → ${r.detail}`)));
        break;
      }
      case "CL-09": lines.push(actionLine(def, "indexnow")); break;
      case "CL-10": lines.push(actionLine(def, "bing")); break;
      default: {
        // jalons J+n : à la main, la case survit, les sous-lignes de CL-12 sont les pages de la stratégie
        const sub = def.id === "CL-12" ? i.pages.map((p) => `${i.origin}${p}`) : [];
        lines.push(line(def, "main", keepMain(def.id), def.consigne!, sub));
      }
    }
  }
  return {
    header: { site: i.site, miseEnLigne: i.miseEnLigne, dernierPassage: i.today, auditLocal: i.n2?.dir ?? null, auditProd: i.n0Prod?.dir ?? null },
    lines,
  };

  function actionLine(def: LineDef, which: "indexnow" | "bing"): Line {
    const p = prev(def.id);
    if (!i.miseEnLigne) return line(def, "action", false, "pas encore déployé");
    const res = i.actions[which];
    if (res) return line(def, "action", res.ok, res.ok ? `${i.today} · ${res.status}${res.urls !== undefined ? `, ${res.urls} URL` : ""}` : `${res.status} : ${res.message}`);
    if (p?.checked) return line(def, "action", true, p.note);
    if (which === "bing") {
      const cl05 = lines.find((l) => l.id === "CL-05");
      if (!cl05?.checked) return line(def, "action", false, "en attente : Bing Webmaster Tools pas encore configuré (ligne « Bing Webmaster Tools : site ajouté »)");
    }
    const reason = i.pending[which];
    if (reason) return line(def, "action", false, `en attente : ${reason}`);
    if (!i.n0Prod) return line(def, "action", false, "en attente : aucun audit prod depuis la mise en ligne");
    // une réponse négative ou un refus déjà consigné reste dans le fichier ; --agir relance quand même (done() ne lit que la case)
    if (p && !p.checked && /^(\d+ : |refusé)/.test(p.note)) return line(def, "action", false, p.note);
    return line(def, "action", false, "à faire : relance avec --agir");
  }
}

/** Les quatre comptes du rapport, comme la ligne En bref. */
export function enBref(r: Report): string { return `${r.counts.Critique} Critique · ${r.counts.Important} Important · ${r.counts.Mineur} Mineur · ${r.counts.Info} Info`; }

/** Jalons dus : date passée ou du jour, case vide. */
export function dueToday(cl: Checklist, today: string): Line[] {
  return cl.lines.filter((l) => !l.checked && /^J\+\d+ (\d{4}-\d{2}-\d{2}) :/.test(l.label) && l.label.match(/^J\+\d+ (\d{4}-\d{2}-\d{2}) :/)![1] <= today);
}

export function checklistSummary(cl: Checklist, today: string): string {
  const n = cl.lines.filter((l) => l.checked).length;
  const due = dueToday(cl, today).map((l) => l.label);
  return `checklist : ${n}/${cl.lines.length} cochées · mise en ligne : ${cl.header.miseEnLigne ?? "non"} · dû aujourd'hui : ${due.length ? due.join(" ; ") : "rien"}`;
}
