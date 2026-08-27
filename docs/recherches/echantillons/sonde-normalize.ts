const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
function tidy(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").replace(/\s+([,.;:)\]])/g, "$1").trim();
}
/** Page HTML : balises retirées, entités décodées ensuite (le texte visible peut contenir "<title>" encodé). */
export function normalizePage(html: string): string {
  const noTags = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  return tidy(decodeEntities(noTags));
}
/** Citation : jamais de retrait de balises, une citation peut contenir "<title>" littéralement. */
export function normalizeQuote(q: string): string { return tidy(decodeEntities(q)); }
