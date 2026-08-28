// Bots de récupération : vont chercher la page au moment de la question. Les bloquer retire des citations.
export const RETRIEVAL_BOTS = ["OAI-SearchBot", "ChatGPT-User", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User"] as const;
// Bots d'entraînement et tokens de contrôle : bloquables sans perte de visibilité.
export const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended", "Applebot-Extended"] as const;
// Moteurs classiques.
export const SEARCH_BOTS = ["Googlebot", "bingbot"] as const;
export const ALL_BOTS: string[] = [...RETRIEVAL_BOTS, ...TRAINING_BOTS, ...SEARCH_BOTS];

export const USER_AGENT = "erom-seo-audit/0.1";

export type Hop = { url: string; status: number; location?: string };

export type FetchResult = {
  requested: string;
  final: string;
  status: number;            // 0 = erreur réseau ou timeout, voir error
  chain: Hop[];
  headers: Record<string, string>;
  body: Uint8Array;
  error?: string;
  ms: number;
};

export type FetchRecord = {
  requested: string;
  final: string;
  status: number;
  chain: Hop[];
  contentType?: string;
  bytes: number;
  fetchedAt: string;
  error?: string;
  file?: string;             // chemin relatif à raw/ si le corps a été sauvegardé
  ms: number;
};

export type RobotsSemantics = "rules" | "allow-all-4xx" | "disallow-all-5xx" | "rate-limited-429" | "unreachable";

export type RobotsEval = {
  status: number;
  semantics: RobotsSemantics;
  parseable: boolean;
  sitemaps: string[];
  bots: Record<string, { root: boolean | null; pages: Record<string, boolean | null> }>;
};

/** Sort des <loc> d'un sitemap : combien listées, combien retenues, et ce qui a été écarté comme hors site (par hôte). */
export type SitemapUrlStats = {
  listed: number;
  kept: number;
  skipped: { host: string; count: number }[];
  rewrittenFrom?: string[];  // hôtes d'origine des <loc> ramenées sur l'origine locale (niveau 2)
};

export type JsonLdBlock = { valid: boolean; hasContext: boolean; types: string[] };

export type OrganizationFacts = { name: string | null; description: string | null; sameAs: string[] };

export type PageFacts = {
  url: string;
  slug: string;
  status: number;
  title: string | null;
  lang: string | null;
  description: string | null;
  robotsMeta: string | null;
  xRobotsTag: string | null;
  canonical: string | null;
  h1: string[];
  jsonld: JsonLdBlock[];
  organization: OrganizationFacts | null;   // premier bloc Organization (ou sous-type), y compris dans un @graph
  opening: string;                          // 400 premiers caractères de <main>, sinon de <body>
  datePublished: string | null;
  dateModified: string | null;
  lastModified: string | null;
  visibleDates: string[];
  textChars: number;
  htmlBytes: number;
  generator: string | null;
  challenge: boolean;        // page de protection anti-bot servie à la place du contenu (title connu ou statut 403/429/503)
};

export type PsiFacts = {
  ok: boolean;
  error?: string;
  strategy: "MOBILE" | "DESKTOP";
  field?: {
    originFallback: boolean;
    overall: string | null;
    metrics: Record<string, { percentile: number; category: string }>;
  };
  lab?: { performance: number | null; seo: number | null };
};

export type Manifest = {
  site: string;
  startedAt: string;
  finishedAt: string;
  level: 0 | 1 | 2;
  userAgent: string;
  maxPages: number;
  robots: FetchRecord;
  sitemaps: FetchRecord[];
  sitemapUrls: SitemapUrlStats;
  llms: FetchRecord;
  pages: FetchRecord[];
  probes: { httpToHttps: FetchRecord; hostVariant: FetchRecord; notFound: FetchRecord };
  stack: { generator: string | null; server: string | null; poweredBy: string | null };
  psi: { attempted: boolean; ok: boolean; error?: string };
};
