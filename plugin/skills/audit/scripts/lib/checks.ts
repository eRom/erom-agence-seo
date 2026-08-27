export type CheckSource = { url: string; quote: string; manual: boolean };
export type Check = {
  id: string; title: string; couche: string; niveau: number; severite: string;
  verifie: string; comment: string; sources: CheckSource[]; etudes: string[]; correctif: string; effort: string;
};

export const OFFICIAL_DOMAINS = [
  "developers.google.com", "support.google.com", "web.dev",
  "developers.openai.com", "support.claude.com", "docs.perplexity.ai", "support.apple.com",
  "blogs.bing.com", "bing.com", "indexnow.org", "sitemaps.org", "rfc-editor.org", "schema.org", "w3.org",
];

const FIELD = /^([A-Za-zÉé]+)\s*:\s*(.*)$/;

/** Lit un fichier de références et rend une entrée par bloc `### ID : titre`. Les lignes de continuation (indentées) prolongent le champ courant. */
export function parseChecks(md: string): Check[] {
  const out: Check[] = [];
  let cur: (Partial<Check> & { sources: CheckSource[]; etudes: string[] }) | null = null;
  let field: string | null = null;
  const flush = () => { if (cur?.id) out.push({ couche: "", niveau: NaN, severite: "", verifie: "", comment: "", correctif: "", effort: "", title: "", ...cur } as Check); cur = null; field = null; };
  for (const raw of md.split("\n")) {
    const h = raw.match(/^###\s+([A-Z]+-\d{2})\s*:\s*(.+)$/);
    if (h) { flush(); cur = { id: h[1], title: h[2].trim(), sources: [], etudes: [] }; continue; }
    if (!cur) continue;
    if (/^\s+\S/.test(raw) && field) { // continuation
      const v = raw.trim();
      if (field === "source") { const last = cur.sources[cur.sources.length - 1]; if (last) last.quote = `${last.quote} ${v}`.trim(); }
      else if (field === "etude") cur.etudes[cur.etudes.length - 1] += ` ${v}`;
      else (cur as any)[field] = `${(cur as any)[field]} ${v}`.trim();
      continue;
    }
    const m = raw.match(FIELD);
    if (!m) { if (raw.trim() === "") field = null; continue; }
    const key = m[1].toLowerCase().replace(/é/g, "e");
    const val = m[2].trim();
    switch (key) {
      case "couche": cur.couche = val; field = "couche"; break;
      case "niveau": cur.niveau = Number(val); field = "niveau"; break;
      case "severite": cur.severite = val; field = "severite"; break;
      case "verifie": cur.verifie = val; field = "verifie"; break;
      case "comment": cur.comment = val; field = "comment"; break;
      case "correctif": cur.correctif = val; field = "correctif"; break;
      case "effort": cur.effort = val; field = "effort"; break;
      case "source": {
        const s = val.match(/^(\S+)\s+«\s*(.*?)\s*»\s*(\[manuel\])?\s*$/);
        cur.sources.push(s ? { url: s[1], quote: s[2], manual: Boolean(s[3]) } : { url: val, quote: "", manual: false });
        field = "source"; break;
      }
      case "etude": cur.etudes.push(val); field = "etude"; break;
      default: field = null;
    }
  }
  flush();
  return out;
}
