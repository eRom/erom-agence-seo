// Logique pure de strategy-eval.ts : compare une stratégie aux faits collectés. Aucun réseau, aucun disque.
import { cadenceDays, keywordMatches, normalizeText, type Cadence, type Strategy } from "../../../../lib/strategy";

/** Sous-ensemble de PageFacts (lib/types.ts) utilisé ici ; `opening` et `organization` sont les champs ajoutés par le chantier 2. */
export type PageFactsLike = {
  url: string; slug: string; status: number; title: string | null; h1: string[]; opening: string;
  organization: { name: string | null; description: string | null; sameAs: string[] } | null;
  dateModified: string | null; lastModified: string | null; visibleDates: string[]; challenge: boolean;
};

export type PageEval = {
  page: string; url: string | null; found: boolean; status: number | null; keyword: string;
  inTitle: boolean | null; inH1: boolean | null; inOpening: boolean | null;
  cadence: Cadence; lastKnownDate: string | null; cadenceRespected: boolean | null;
  /** Vrai si la page prévue a été trouvée dans la collecte mais protégée par un challenge anti-bot ; faux sinon (y compris page vraiment absente). */
  challenge: boolean;
};
export type StrategyEval = {
  strategy: { path: string; date: string; statut: string; site: string };
  pages: PageEval[];
  identity: { sentence: string; onHome: boolean; organizationPresent: boolean; inOrganization: boolean; expectedName: string; organizationName: string | null; nameMatches: boolean };
  sameAs: { url: string; present: boolean }[];
  indexnow: { declared: string | null; fetched: boolean; status: number | null; contentMatches: boolean | null };
};

/** Chemin d'une URL sans barre finale ; « / » pour la racine. */
export function pathOf(url: string): string {
  try { return new URL(url).pathname.replace(/\/+$/, "") || "/"; } catch { return url; }
}

/** URL comparable : schéma ignoré, hôte en minuscules, barre finale retirée. */
export function normalizeUrl(u: string): string {
  try { const p = new URL(u); return `${p.host.toLowerCase()}${p.pathname.replace(/\/+$/, "")}${p.search}`; } catch { return u.trim().toLowerCase(); }
}

const FR_MONTHS: Record<string, string> = { janvier: "01", "février": "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06", juillet: "07", "août": "08", aout: "08", septembre: "09", octobre: "10", novembre: "11", "décembre": "12", decembre: "12" };

/** Jour ISO depuis une date ISO, HTTP (Last-Modified), « 12/06/2026 » ou « 12 juin 2026 » ; null sinon. */
export function parseDateLoose(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = t.toLowerCase().match(/^(\d{1,2})(?:er)?\s+([a-zéû]+)\s+(\d{4})$/);
  if (m && FR_MONTHS[m[2]]) return `${m[3]}-${FR_MONTHS[m[2]]}-${m[1].padStart(2, "0")}`;
  if (/\d{4}/.test(t)) { const d = new Date(t); if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10); }
  return null;
}

export function lastKnownDate(p: PageFactsLike): string | null {
  const dates = [p.dateModified, p.lastModified, ...p.visibleDates].map(parseDateLoose).filter((d): d is string => d !== null);
  return dates.length ? dates.sort().at(-1)! : null;
}

export function evaluateStrategy(input: {
  strategy: Strategy; strategyPath: string; pages: PageFactsLike[]; homeText: string;
  indexnow: { status: number | null; content: string | null }; today: string;
}): StrategyEval {
  const { strategy, pages, today } = input;
  const byPath = new Map(pages.map((p) => [pathOf(p.url), p]));
  const home = byPath.get("/") ?? pages.find((p) => p.slug === "index") ?? null;
  const org = home?.organization ?? null;
  const sentence = normalizeText(strategy.identite);

  const pageEvals: PageEval[] = strategy.pages.map((plan) => {
    const p = byPath.get(pathOf(plan.page));
    const found = Boolean(p && p.status === 200 && !p.challenge);
    const days = cadenceDays(plan.cadence);
    const last = p ? lastKnownDate(p) : null;
    const respected = found && days !== null && last ? (Date.parse(today) - Date.parse(last)) / 86400000 <= days : null;
    return {
      page: plan.page, url: p?.url ?? null, found, status: p?.status ?? null, keyword: plan.motCle,
      inTitle: found ? keywordMatches(plan.motCle, p!.title ?? "") : null,
      inH1: found ? p!.h1.some((h) => keywordMatches(plan.motCle, h)) : null,
      inOpening: found ? keywordMatches(plan.motCle, p!.opening) : null,
      cadence: plan.cadence, lastKnownDate: last, cadenceRespected: respected,
      challenge: Boolean(p?.challenge),
    };
  });

  const declared = strategy.indexnow;
  const fetched = declared !== null && input.indexnow.status !== null;
  return {
    strategy: { path: input.strategyPath, date: strategy.date, statut: strategy.statut, site: strategy.site },
    pages: pageEvals,
    identity: {
      sentence: strategy.identite,
      onHome: sentence !== "" && normalizeText(input.homeText).includes(sentence),
      organizationPresent: org !== null,
      inOrganization: sentence !== "" && org?.description ? normalizeText(org.description).includes(sentence) : false,
      expectedName: strategy.entite.nom,
      organizationName: org?.name ?? null,
      nameMatches: org?.name ? normalizeText(org.name) === normalizeText(strategy.entite.nom) : false,
    },
    sameAs: strategy.entite.sameAs.map((url) => ({ url, present: (org?.sameAs ?? []).some((s) => normalizeUrl(s) === normalizeUrl(url)) })),
    indexnow: {
      declared, fetched, status: declared !== null ? input.indexnow.status : null,
      contentMatches: declared === null ? null : input.indexnow.status === 200 && (input.indexnow.content ?? "").trim() === declared,
    },
  };
}
