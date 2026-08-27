import { parse, type HTMLElement } from "node-html-parser";
import type { JsonLdBlock, PageFacts } from "./types";

export function slugFor(url: string): string {
  const u = new URL(url);
  const path = decodeURIComponent(u.pathname).replace(/\/+$/, "");
  if (!path) return "index";
  let s = path.replace(/^\//, "").replace(/[^\p{L}\p{N}._-]+/gu, "_").replace(/_+/g, "_");
  if (s.length > 80) s = s.slice(0, 72) + "-" + Bun.hash(url).toString(16).slice(0, 6);
  return s;
}

function collectTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) { for (const n of node) collectTypes(n, out); return; }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") out.push(x);
    if (o["@graph"]) collectTypes(o["@graph"], out);
  }
}

function findKey(node: unknown, key: string): string | null {
  if (Array.isArray(node)) { for (const n of node) { const v = findKey(n, key); if (v) return v; } return null; }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o[key] === "string") return o[key] as string;
    for (const v of Object.values(o)) { const r = findKey(v, key); if (r) return r; }
  }
  return null;
}

const FR_MONTHS = "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";
const DATE_PATTERNS = [
  /\b\d{4}-\d{2}-\d{2}(?:T[\d:+\-.]+Z?)?\b/g,
  new RegExp(`\\b\\d{1,2}(?:er)?\\s(?:${FR_MONTHS})\\s\\d{4}\\b`, "gi"),
  /\b\d{2}\/\d{2}\/\d{4}\b/g,
];

/** Pages de protection anti-bot servies à la place du contenu, parfois en 200 (lemonde.fr, 2026-08-27 : « Client Challenge », 3 038 octets). */
const CHALLENGE = /client challenge|just a moment|attention required|access denied|are you a human|verify you are human|un instant/i;

export function extractPageFacts(html: string, url: string, status: number, headers: Record<string, string>, slug: string): PageFacts {
  const doc = parse(html);
  const attr = (sel: string, a: string) => doc.querySelector(sel)?.getAttribute(a) ?? null;
  const jsonld: JsonLdBlock[] = [];
  let datePublished: string | null = null;
  let dateModified: string | null = null;
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.text);
      const types: string[] = [];
      collectTypes(j, types);
      jsonld.push({ valid: true, hasContext: findKey(j, "@context") !== null, types });
      datePublished ??= findKey(j, "datePublished");
      dateModified ??= findKey(j, "dateModified");
    } catch {
      jsonld.push({ valid: false, hasContext: false, types: [] });
    }
  }
  const visibleDates = new Set<string>();
  for (const t of doc.querySelectorAll("time")) { const d = t.getAttribute("datetime"); if (d) visibleDates.add(d); }
  for (const el of doc.querySelectorAll("script, style, noscript, template")) (el as HTMLElement).remove();
  const bodyText = (doc.querySelector("body")?.text ?? "").replace(/\s+/g, " ").trim();
  for (const re of DATE_PATTERNS) for (const m of bodyText.matchAll(re)) { if (visibleDates.size < 10) visibleDates.add(m[0]); }
  const title = doc.querySelector("title")?.text.trim() || null;
  return {
    url,
    slug,
    status,
    title,
    lang: attr("html", "lang"),
    description: attr('meta[name="description"]', "content"),
    robotsMeta: attr('meta[name="robots"]', "content"),
    xRobotsTag: headers["x-robots-tag"] ?? null,
    canonical: attr('link[rel="canonical"]', "href"),
    h1: doc.querySelectorAll("h1").map((h) => h.text.replace(/\s+/g, " ").trim()),
    jsonld,
    datePublished,
    dateModified,
    lastModified: headers["last-modified"] ?? null,
    visibleDates: [...visibleDates],
    textChars: bodyText.length,
    htmlBytes: new TextEncoder().encode(html).length,
    generator: attr('meta[name="generator"]', "content"),
    challenge: CHALLENGE.test(title ?? "") || [403, 429, 503].includes(status),
  };
}
