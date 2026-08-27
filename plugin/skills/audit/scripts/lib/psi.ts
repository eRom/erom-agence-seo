import type { PsiFacts } from "./types";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export function parsePsi(json: unknown, strategy: "MOBILE" | "DESKTOP"): PsiFacts {
  const j = (json ?? {}) as Record<string, any>;
  if (j.error) return { ok: false, strategy, error: `${j.error.code ?? "?"} ${j.error.message ?? ""}`.trim() };
  const le = j.loadingExperience as Record<string, any> | undefined;
  const metricsRaw = (le?.metrics ?? {}) as Record<string, any>;
  const metrics: Record<string, { percentile: number; category: string }> = {};
  for (const [k, v] of Object.entries(metricsRaw)) if (v && typeof v.percentile === "number") metrics[k] = { percentile: v.percentile, category: String(v.category ?? "") };
  const field = Object.keys(metrics).length ? { originFallback: Boolean(le?.origin_fallback), overall: (le?.overall_category as string | undefined) ?? null, metrics } : undefined;
  const cats = (j.lighthouseResult?.categories ?? {}) as Record<string, any>;
  const score = (c: string) => (typeof cats[c]?.score === "number" ? cats[c].score : null);
  const lab = j.lighthouseResult ? { performance: score("performance"), seo: score("seo") } : undefined;
  return { ok: true, strategy, field, lab };
}

/** Un seul appel par audit. Le quota avec clé n'est pas documenté : le code HTTP est conservé dans PsiFacts.error, à charge de l'appelant de le journaliser ou de l'afficher ; on n'insiste jamais. */
export async function fetchPsi(url: string, key: string, strategy: "MOBILE" | "DESKTOP"): Promise<PsiFacts> {
  const q = new URLSearchParams({ url, strategy, key });
  q.append("category", "PERFORMANCE");
  q.append("category", "SEO");
  try {
    const res = await fetch(`${ENDPOINT}?${q}`, { signal: AbortSignal.timeout(90000) });
    const json = await res.json().catch(() => ({}));
    const parsed = parsePsi(json, strategy);
    if (!res.ok && parsed.ok) return { ok: false, strategy, error: `HTTP ${res.status}` };
    return parsed;
  } catch (e) {
    return { ok: false, strategy, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}
