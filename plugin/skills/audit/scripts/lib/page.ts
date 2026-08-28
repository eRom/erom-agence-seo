import { parse, type HTMLElement } from "node-html-parser";
import type { JsonLdBlock, OrganizationFacts, PageFacts } from "./types";

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

function findOrganization(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) { for (const n of node) { const r = findOrganization(n); if (r) return r; } return null; }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const types = ([] as unknown[]).concat(o["@type"] ?? []).filter((t): t is string => typeof t === "string");
    if (types.some((t) => t === "Organization" || t.endsWith("Organization") || t.endsWith("Business"))) return o;
    if (o["@graph"]) return findOrganization(o["@graph"]);
  }
  return null;
}

/** Premier bloc JSON-LD de type Organization (ou sous-type), y compris dans un @graph. */
export function extractOrganization(blocks: unknown[]): OrganizationFacts | null {
  for (const b of blocks) {
    const o = findOrganization(b);
    if (o) {
      const sameAs = ([] as unknown[]).concat(o.sameAs ?? []).filter((s): s is string => typeof s === "string");
      return { name: typeof o.name === "string" ? o.name : null, description: typeof o.description === "string" ? o.description : null, sameAs };
    }
  }
  return null;
}

/** Texte visible d'un élément : scripts, styles et gabarits retirés, un espace entre blocs (structuredText), espaces réduits. */
export function visibleText(el: HTMLElement | null): string {
  if (!el) return "";
  for (const x of el.querySelectorAll("script, style, noscript, template")) (x as HTMLElement).remove();
  return el.structuredText.replace(/\s+/g, " ").trim();
}

/** Les 400 premiers caractères de <main> s'il existe, sinon de <body>. */
export function opening(html: string): string {
  const doc = parse(html);
  const main = doc.querySelector("main");
  return visibleText(main ?? doc.querySelector("body")).slice(0, 400);
}

export function bodyText(html: string): string {
  return visibleText(parse(html).querySelector("body"));
}

export function extractPageFacts(html: string, url: string, status: number, headers: Record<string, string>, slug: string): PageFacts {
  const doc = parse(html);
  const openingText = opening(html);
  const attr = (sel: string, a: string) => doc.querySelector(sel)?.getAttribute(a) ?? null;
  const jsonld: JsonLdBlock[] = [];
  const parsedBlocks: unknown[] = [];
  let datePublished: string | null = null;
  let dateModified: string | null = null;
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.text);
      parsedBlocks.push(j);
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
    organization: extractOrganization(parsedBlocks),
    opening: openingText,
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
