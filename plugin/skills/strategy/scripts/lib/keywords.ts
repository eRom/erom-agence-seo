// Parties pures de keywords.ts : parseurs Bing et Wikimedia, entrées dérivées, garde anti-fuite de clé.

export type BingPoint = { date: string; impressions: number; broadImpressions: number };
export type BingSummary = { fetchedAt: string; weeks: number; total: number; last: number; points: BingPoint[] };
export type WikiSummary = { article: string; fetchedAt: string; monthly: { month: string; views: number }[]; average: number };
export type KeywordStatut = "mesuré" | "non mesurable gratuitement" | "non interrogé (clé absente)" | `erreur : ${string}`;
export type KeywordEntry = { keyword: string; statut: KeywordStatut; bing: BingSummary | null; wikipedia: WikiSummary | null };

/** Échantillon réel du 2026-08-27 (tests/fixtures/bing-keywordstats-seo-fr.json) :
 * {"d":[{"__type":"KeywordStats:#Microsoft.Bing.Webmaster.Api","BroadImpressions":651,"Date":"\/Date(1772265600000)\/","Impressions":242,"Query":"seo"}, …]}
 * Réponse vide : {"d":[]}. La date est un epoch en millisecondes dans « /Date(…)/ ». */
export function parseBingStats(json: unknown): BingPoint[] {
  const d = (json as { d?: unknown })?.d;
  if (!Array.isArray(d)) throw new Error("réponse Bing sans tableau d");
  return d.map((row: Record<string, unknown>) => {
    const ms = String(row.Date ?? "").match(/\/Date\((\d+)\)\//);
    if (!ms) throw new Error(`date Bing illisible : ${String(row.Date)}`);
    return { date: new Date(Number(ms[1])).toISOString().slice(0, 10), impressions: Number(row.Impressions ?? 0), broadImpressions: Number(row.BroadImpressions ?? 0) };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function bingSummary(points: BingPoint[], fetchedAt: string): BingSummary | null {
  if (points.length === 0) return null;
  return { fetchedAt, weeks: points.length, total: points.reduce((n, p) => n + p.impressions, 0), last: points[points.length - 1].impressions, points };
}

/** Échantillon réel (tests/fixtures/wikimedia-pageviews-seo-fr-30j.json), granularité daily ; en monthly le timestamp
 * vaut « 2026070100 » pour juillet 2026. {"items":[{"project":"fr.wikipedia","article":"…","granularity":"daily","timestamp":"2026072700","access":"all-access","agent":"user","views":62}, …]} */
export function parseWikimediaMonthly(json: unknown): { month: string; views: number }[] {
  const items = (json as { items?: unknown })?.items;
  if (!Array.isArray(items)) throw new Error("réponse Wikimedia sans tableau items");
  return items.map((it: Record<string, unknown>) => {
    const ts = String(it.timestamp ?? "");
    if (!/^\d{10}$/.test(ts)) throw new Error(`timestamp Wikimedia illisible : ${ts}`);
    return { month: `${ts.slice(0, 4)}-${ts.slice(4, 6)}`, views: Number(it.views ?? 0) };
  });
}

export function wikiSummary(article: string, monthly: { month: string; views: number }[], fetchedAt: string): WikiSummary {
  const average = monthly.length ? Math.round(monthly.reduce((n, m) => n + m.views, 0) / monthly.length) : 0;
  return { article, fetchedAt, monthly, average };
}

export function entryFor(keyword: string, bing: BingSummary | null, keyPresent: boolean, error: string | null, wikipedia: WikiSummary | null): KeywordEntry {
  const statut: KeywordStatut = error ? `erreur : ${error}` : !keyPresent ? "non interrogé (clé absente)" : bing ? "mesuré" : "non mesurable gratuitement";
  return { keyword, statut, bing, wikipedia };
}

/** Invariant de sécurité : rien de ce qui contient la clé ne s'écrit sur disque. */
export function assertNoSecret(content: string, secret: string | null): void {
  if (secret && secret.length >= 8 && content.includes(secret)) throw new Error("refus d'écrire : le contenu contient la clé API");
}

/** Nom de fichier d'un mot-clé : « plombier nantes » → plombier_nantes, comme les échantillons du 27/08. */
export function keywordSlug(keyword: string): string {
  return keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "mot_cle";
}

/** Nom de fichier sûr pour un titre d'article Wikipédia fourni par --wiki : retire les séparateurs de
 * chemin (/ et \) et les points en tête, sans toucher à la casse ni aux underscores existants — un titre
 * légitime comme « Optimisation_pour_les_moteurs_de_recherche » ressort identique. Empêche une valeur du
 * type « ../../../../tmp/X » d'écrire hors de out/raw/. */
export function safeArticleFilename(article: string): string {
  return article.replace(/[/\\]/g, "").replace(/^\.+/, "");
}

/** Bornes mensuelles pour Wikimedia : 12 mois pleins avant le mois courant (le mois en cours est exclu
 * car incomplet), au format AAAAMMJJ. */
export function wikimediaRange(today: Date): { start: string; end: string } {
  const y = today.getUTCFullYear(), m = today.getUTCMonth();
  const start = new Date(Date.UTC(y, m - 12, 1)), end = new Date(Date.UTC(y, m, 0));
  const f = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return { start: f(start), end: f(end) };
}
