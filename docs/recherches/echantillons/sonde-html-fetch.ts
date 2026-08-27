import { parse } from "node-html-parser";

// 1. fetch avec chaine de redirections manuelle + timeout + UA
async function fetchChain(url: string, maxHops = 5) {
  const chain: { url: string; status: number; location?: string }[] = [];
  let current = url;
  for (let i = 0; i <= maxHops; i++) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": "erom-seo-audit/0.1" },
      signal: AbortSignal.timeout(15000),
    });
    const loc = res.headers.get("location") ?? undefined;
    chain.push({ url: current, status: res.status, location: loc });
    if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, current).toString(); continue; }
    return { chain, final: current, status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() };
  }
  return { chain, final: current, status: 0, headers: {}, body: "" };
}

const r = await fetchChain("http://lemonde.fr/");
console.log("chaine:", r.chain.map(c => `${c.status} ${c.url}`).join("  ->  "), " final:", r.final);
console.log("headers utiles:", ["content-type","last-modified","x-robots-tag","server"].map(h => `${h}=${r.headers[h] ?? "-"}`).join(" | "));

// 2. extraction HTML
const doc = parse(r.body);
const attr = (sel: string, a: string) => doc.querySelector(sel)?.getAttribute(a) ?? null;
const out = {
  title: doc.querySelector("title")?.text.trim() ?? null,
  lang: attr("html", "lang"),
  description: attr('meta[name="description"]', "content")?.slice(0, 60),
  robots: attr('meta[name="robots"]', "content"),
  canonical: attr('link[rel="canonical"]', "href"),
  h1: doc.querySelectorAll("h1").map(h => h.text.trim().slice(0, 40)),
  og_title: attr('meta[property="og:title"]', "content")?.slice(0, 40),
  jsonld_blocks: doc.querySelectorAll('script[type="application/ld+json"]').map(s => { try { const j = JSON.parse(s.text); return Array.isArray(j) ? j.map(x => x["@type"]) : (j["@graph"] ? j["@graph"].map((x: any) => x["@type"]) : j["@type"]); } catch { return "JSON INVALIDE"; } }),
  text_chars: doc.querySelector("body")?.text.replace(/\s+/g, " ").trim().length ?? 0,
  html_bytes: r.body.length,
};
console.log(JSON.stringify(out, null, 1));
