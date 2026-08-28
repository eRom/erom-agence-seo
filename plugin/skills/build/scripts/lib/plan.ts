// Logique pure de plan.ts : joint la stratégie, le rapport et les faits collectés en un plan de build. Aucun réseau, aucun disque.
import type { Strategy } from "../../../../lib/strategy";
import type { Report, Severity } from "../../../../lib/report";
import type { PageFacts } from "../../../audit/scripts/lib/types";
import { pathOf, type StrategyEval } from "../../../audit/scripts/lib/strategy-eval";

export type Kind = "code" | "texte" | "hors-build";
export type KindEntry = { kind: Kind; ou?: string };

/** Genre de chaque vérification du catalogue (spec chantier 3, D19 et 5.3). `ou` : où agir quand build ne peut pas. */
export const KINDS: Record<string, KindEntry> = {
  "ROBOTS-01": { kind: "code" }, "ROBOTS-02": { kind: "code" }, "ROBOTS-03": { kind: "code" }, "ROBOTS-04": { kind: "code" }, "ROBOTS-05": { kind: "code" }, "ROBOTS-06": { kind: "code" },
  "SNIP-01": { kind: "code" }, "SNIP-02": { kind: "code" }, "SNIP-03": { kind: "code" },
  "IDX-01": { kind: "code" }, "IDX-02": { kind: "code" }, "IDX-05": { kind: "code" },
  "IDX-03": { kind: "hors-build", ou: "certificat et redirection HTTP vers HTTPS chez l'hébergeur (Vercel : automatique)" },
  "IDX-04": { kind: "hors-build", ou: "Vercel : Project Settings, Domains, « Redirect to » sur le domaine secondaire ; ailleurs : le DNS ou la configuration de l'hébergeur. next.config n'est pas le bon endroit" },
  "SD-01": { kind: "code" }, "SD-02": { kind: "code" }, "SD-03": { kind: "code" },
  "TAG-01": { kind: "code" }, "TAG-02": { kind: "code" }, "TAG-04": { kind: "code" },
  "TAG-03": { kind: "texte" },
  "FRESH-01": { kind: "code" }, "FRESH-02": { kind: "code" },
  "REND-01": { kind: "code" },
  "PERF-01": { kind: "hors-build", ou: "PageSpeed Insights (pagespeed.web.dev) pour lire les données de terrain, puis un chantier de performance à part" },
  "AI-01": { kind: "hors-build", ou: "sans effet sur Google ; un llms.txt ne se justifie que pour un site de documentation" },
  "AI-02": { kind: "code" },
  "STRAT-01": { kind: "texte" }, "STRAT-02": { kind: "texte" }, "STRAT-03": { kind: "code" },
  "STRAT-04": { kind: "hors-build", ou: "calendrier éditorial : mettre à jour le contenu à la cadence promise, puis propager la date (visible et dateModified)" },
};
export const DEFAULT_KIND: KindEntry = { kind: "hors-build", ou: "hors du périmètre de build : vérification de niveau 1 ou inconnue" };
export function kindOf(id: string): KindEntry { return KINDS[id] ?? DEFAULT_KIND; }

export type PlanFinding = { id: string; severity: Severity; title: string; kind: Kind; correctif: string; effort: string; ou?: string };
export type TexteField = "title" | "description" | "h1" | "opening";
export type PlanPage = {
  page: string; intention: string; motCle: string; secondaires: string[]; cadence: string;
  current: {
    url: string; status: number; title: string | null; description: string | null; h1: string[]; opening: string; canonical: string | null;
    jsonldTypes: string[]; datePublished: string | null; dateModified: string | null; challenge: boolean;
  } | null;
  missing: { title: boolean; h1: boolean; opening: boolean } | null;
  textes: TexteField[];
};
export type Organization = {
  "@context": "https://schema.org"; "@type": "Organization"; name: string; url: string; description: string; sameAs: string[]; telephone?: string; address?: string;
};
export type BuildPlan = {
  generatedAt: string;
  audit: { dir: string; date: string; niveau: number; counts: Record<Severity, number> };
  strategy: { path: string; statut: string; date: string; site: string };
  stack: "nextjs" | "autre";
  canonicalBase: { origin: string; source: "audit niveau 0" | "stratégie" };
  findings: PlanFinding[];
  pages: PlanPage[];
  organization: Organization;
  indexnow: { key: string; file: string } | null;
  warnings: string[];
};

const SEV_RANK: Record<Severity, number> = { Critique: 0, Important: 1, Mineur: 2, Info: 3 };
const KIND_RANK: Record<Kind, number> = { code: 0, texte: 1, "hors-build": 2 };

export type BuildPlanInput = {
  strategy: Strategy; strategyPath: string; report: Report; pages: PageFacts[]; strategyEval: StrategyEval | null;
  homeFinalUrl: string | null; deps: string[]; auditDir: string; now?: string;
};

export function buildPlan(input: BuildPlanInput): BuildPlan {
  const { strategy, report, pages, strategyEval } = input;
  const warnings: string[] = [];

  const findings: PlanFinding[] = report.findings
    .filter((f) => f.severity !== "Info")
    .map((f) => { const k = kindOf(f.id); return { id: f.id, severity: f.severity, title: f.title, kind: k.kind, correctif: f.correctif, effort: f.effort, ...(k.ou ? { ou: k.ou } : {}) }; })
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.id.localeCompare(b.id));
  const open = new Set(findings.map((f) => f.id));

  let canonicalBase: BuildPlan["canonicalBase"] | null = null;
  if (input.homeFinalUrl) { try { canonicalBase = { origin: new URL(input.homeFinalUrl).origin, source: "audit niveau 0" }; } catch { /* URL illisible : repli ci-dessous */ } }
  if (!canonicalBase) {
    canonicalBase = { origin: `https://${strategy.site}`, source: "stratégie" };
    warnings.push("base canonique prise dans la stratégie : aucun audit niveau 0, l'hôte réellement servi (www ou apex) n'est pas observé");
  }

  if (!strategyEval) warnings.push("audit sans couche stratégique : relancer l'audit avec seo/strategy.md pour connaître les mots-clés manquants par page");
  const byPath = new Map(pages.map((p) => [pathOf(p.url), p]));
  const evalByPage = new Map((strategyEval?.pages ?? []).map((e) => [e.page, e]));
  const planPages: PlanPage[] = strategy.pages.map((plan) => {
    const p = byPath.get(pathOf(plan.page)) ?? null;
    const ev = evalByPage.get(plan.page) ?? null;
    const base = { page: plan.page, intention: plan.intention, motCle: plan.motCle, secondaires: plan.secondaires, cadence: plan.cadence };
    if (!p) { warnings.push(`page ${plan.page} prévue par la stratégie mais absente de la collecte : à créer, contenu à écrire (hors build)`); return { ...base, current: null, missing: null, textes: [] }; }
    const current: NonNullable<PlanPage["current"]> = {
      url: p.url, status: p.status, title: p.title, description: p.description, h1: p.h1, opening: p.opening, canonical: p.canonical,
      jsonldTypes: p.jsonld.flatMap((b) => b.types), datePublished: p.datePublished, dateModified: p.dateModified, challenge: p.challenge,
    };
    if (p.challenge) { warnings.push(`page ${plan.page} servie derrière une protection anti-bot : non évaluée`); return { ...base, current, missing: null, textes: [] }; }
    if (p.status !== 200) { warnings.push(`page ${plan.page} répond ${p.status} : à créer ou à rétablir, hors build`); return { ...base, current, missing: null, textes: [] }; }
    const missing = ev && ev.found ? { title: ev.inTitle === false, h1: ev.inH1 === false, opening: ev.inOpening === false } : null;
    const textes: TexteField[] = [];
    if (missing?.title || p.title === null || open.has("TAG-01")) textes.push("title");
    if (p.description === null || open.has("TAG-02")) textes.push("description");
    if (missing?.h1 || p.h1.length === 0) textes.push("h1");
    if (missing?.opening) textes.push("opening");
    return { ...base, current, missing, textes };
  });

  const nap = strategy.entite.nap;
  const organization: Organization = {
    "@context": "https://schema.org", "@type": "Organization",
    name: strategy.entite.nom, url: `${canonicalBase.origin}/`, description: strategy.identite, sameAs: strategy.entite.sameAs,
    ...(nap ? { telephone: nap.telephone, address: nap.adresse } : {}),
  };

  return {
    generatedAt: input.now ?? new Date().toISOString(),
    audit: { dir: input.auditDir, date: report.date, niveau: report.niveau, counts: report.counts },
    strategy: { path: input.strategyPath, statut: strategy.statut, date: strategy.date, site: strategy.site },
    stack: input.deps.includes("next") ? "nextjs" : "autre",
    canonicalBase,
    findings,
    pages: planPages,
    organization,
    indexnow: strategy.indexnow ? { key: strategy.indexnow, file: `public/${strategy.indexnow}.txt` } : null,
    warnings,
  };
}

/** La ligne de bilan imprimée par plan.ts. */
export function planSummary(plan: BuildPlan): string {
  const c = (k: Kind) => plan.findings.filter((f) => f.kind === k).length;
  const sev = (s: Severity) => plan.findings.filter((f) => f.severity === s).length;
  const pagesTextes = plan.pages.filter((p) => p.textes.length > 0).length;
  return `plan : ${plan.findings.length} trouvailles ouvertes (${sev("Critique")} Critique, ${sev("Important")} Important, ${sev("Mineur")} Mineur) : ${c("code")} code, ${c("texte")} texte, ${c("hors-build")} hors build ; ${pagesTextes} pages avec des textes à valider ; base canonique ${plan.canonicalBase.origin} (${plan.canonicalBase.source})`;
}
