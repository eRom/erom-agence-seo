#!/usr/bin/env bun
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchChain, text } from "./lib/fetch";
import { evaluateRobots } from "./lib/robots";
import { collectSitemapUrls, formatSkippedWarning, sitemapCandidates } from "./lib/sitemap";
import { pageKey, rewriteToOrigin, sameSite } from "../../../lib/url";
import { extractPageFacts, slugFor } from "./lib/page";
import { fetchPsi } from "./lib/psi";
import { collectLevel1, deriveConsole } from "./lib/level1";
import { ALL_BOTS, USER_AGENT, type FetchRecord, type FetchResult, type Manifest, type PageFacts, type StrategyRef } from "./lib/types";
import { parseStrategy, StrategyError, type Strategy } from "../../../lib/strategy";
import { getAccessToken, defaultGcloud, serviceAccountToken, AuthError, type GoogleAuth } from "../../../lib/auth-google";
import type { Fetcher } from "../../../lib/gsc";
import { assertNoSecret } from "../../strategy/scripts/lib/keywords";

export type CollectOptions = {
  url: string;
  out?: string;
  maxPages?: number;
  pages?: string[];
  level?: 0 | 1 | 2;
  psiKey?: string | null;
  delayMs?: number;
  noPsi?: boolean;
  strategyPath?: string | null;
  /** Injecté par les tests pour observer, ou ne pas observer, les appels aux consoles. En usage réel,
   *  absent : la branche niveau 1 construit son fetcher sur le fetch global. C'est le même motif que
   *  console.ts, où toutes les dépendances entrent en paramètre pour rendre « aucune requête ne part » testable. */
  consoleFetcher?: Fetcher;
  /** Injecté par les tests pour fournir, ou refuser, un accès Google sans jamais appeler `getAccessToken`
   *  ni le vrai binaire gcloud (round 1 de revue : un test qui passe par le vrai gcloud dépend du poste qui
   *  le lance et n'est plus déterministe). En usage réel, absent : la branche niveau 1 résout l'accès elle-même. */
  consoleAuth?: { auth: GoogleAuth | null; authError: string | null };
};

function toRecord(r: FetchResult, file?: string): FetchRecord {
  return { requested: r.requested, final: r.final, status: r.status, chain: r.chain, contentType: r.headers["content-type"], bytes: r.body.length, fetchedAt: new Date().toISOString(), error: r.error, file, ms: r.ms };
}

/**
 * Réserve seo/audits/<date>-n<niveau>/ (ou son premier suffixe -2, -3… libre) sous le répertoire courant, de façon
 * atomique : `mkdir` NON récursif sur le dossier candidat lui-même, pour obtenir EEXIST si un autre process l'a créé
 * entre-temps plutôt que d'écrire dedans. Le parent seo/audits/ est créé récursivement en amont : c'est sûr même en
 * concurrence, aucun contenu n'y est jamais écrit directement, une création concurrente du même parent réussit des
 * deux côtés.
 */
async function reserveOutDir(level: 0 | 1 | 2): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const parent = "seo/audits";
  await mkdir(parent, { recursive: true });
  const base = `${parent}/${date}-n${level}`;
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    try {
      await mkdir(candidate);
      return candidate;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw e;
    }
  }
}

/** Liste des pages à collecter : la home, puis les --page, puis le sitemap ; même site (apex ou www), sans doublon. */
export function wantedPages(origin: string, explicit: string[], fromSitemap: string[]): string[] {
  const wanted: string[] = [];
  const seen = new Set<string>();
  for (const u of [`${origin}/`, ...explicit, ...fromSitemap]) {
    try {
      const abs = new URL(u, origin).toString();
      const key = pageKey(abs);
      if (!sameSite(abs, origin) || seen.has(key)) continue;
      seen.add(key);
      wanted.push(abs);
    } catch { /* URL invalide ignorée */ }
  }
  return wanted;
}

/** Niveau 2 si l'hôte est local. `--level` reste disponible pour forcer. Le niveau 1 ne se détecte
 *  jamais tout seul (D37) : les accès de la machine sont permanents, une détection automatique
 *  enverrait des requêtes à des tiers sans qu'on l'ait demandé. */
export function detectLevel(url: string): 0 | 2 {
  const h = new URL(url).hostname;
  return h === "localhost" || h === "127.0.0.1" ? 2 : 0;
}

/**
 * Lit et parse une stratégie. `explicit` distingue un chemin passé par `--strategy-path` du défaut `seo/strategy.md` :
 * défaut absent = `null`, silencieux ; chemin explicite absent = erreur consignée (une faute de frappe ne doit pas
 * faire tourner l'audit sans couche stratégique en silence).
 */
async function readStrategy(path: string, explicit: boolean): Promise<{ ref: StrategyRef; strategy: Strategy | null } | null> {
  const f = Bun.file(path);
  if (!(await f.exists())) return explicit ? { ref: { path, error: "fichier absent" }, strategy: null } : null;
  try {
    const s = parseStrategy(await f.text());
    return { ref: { path, date: s.date, statut: s.statut, pages: s.pages.length }, strategy: s };
  } catch (e) {
    return { ref: { path, error: e instanceof StrategyError ? e.errors.join(" ; ") : String(e) }, strategy: null };
  }
}

export async function runCollect(o: CollectOptions): Promise<Manifest & { out: string }> {
  const site = new URL(o.url);
  const origin = site.origin;
  const level = o.level ?? detectLevel(o.url);
  const out = o.out ?? (await reserveOutDir(level));
  const explicit = o.strategyPath !== undefined && o.strategyPath !== null;
  const strat = o.strategyPath === null ? null : await readStrategy(o.strategyPath ?? "seo/strategy.md", explicit);
  const planned = strat?.strategy?.pages.map((p) => p.page) ?? [];
  const maxPages = Math.max(o.maxPages ?? 10, 1 + planned.length);
  const delay = o.delayMs ?? 250;
  const raw = join(out, "raw");
  const derived = join(out, "derived");
  await mkdir(join(raw, "pages"), { recursive: true });
  await mkdir(derived, { recursive: true });
  const startedAt = new Date().toISOString();
  const save = async (name: string, data: string | Uint8Array) => { await Bun.write(join(raw, name), data); return name; };

  // 1. robots.txt
  const robotsRes = await fetchChain(`${origin}/robots.txt`);
  const robotsTxt = robotsRes.status === 200 ? text(robotsRes) : null;
  const robots = toRecord(robotsRes, robotsTxt !== null ? await save("robots.txt", robotsTxt) : undefined);
  const declared = robotsTxt ? [...robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];

  // 2. sitemaps
  // maxUrls vaut maxPages, pas maxPages - 1 : la home peut être listée dans le sitemap et se dédoublonner ensuite,
  // réserver un slot pour elle en coûtait un pour rien. C'est wantedPages puis le slice(0, maxPages) qui tranchent.
  const declaredLocal = level === 2 ? declared.map((d) => rewriteToOrigin(d, origin) ?? d) : declared;
  const sm = await collectSitemapUrls(sitemapCandidates(declaredLocal, origin), (u) => fetchChain(u), { maxUrls: maxPages, origin, rewriteTo: level === 2 ? origin : undefined });
  const sitemaps: FetchRecord[] = [];
  let n = 0;
  for (const f of sm.fetched) sitemaps.push(toRecord(f.result, f.result.status === 200 ? await save(`sitemap-${n++}.xml`, f.text) : undefined));

  // 3. llms.txt
  const llmsRes = await fetchChain(`${origin}/llms.txt`);
  const llms = toRecord(llmsRes, llmsRes.status === 200 ? await save("llms.txt", text(llmsRes)) : undefined);

  // 4. pages : home, puis les pages prévues par la stratégie, puis les --page, puis le sitemap ; même site, sans doublon
  const wanted = wantedPages(origin, [...planned, ...(o.pages ?? [])], sm.urls);
  const pages: FetchRecord[] = [];
  const facts: PageFacts[] = [];
  let homeHeaders: Record<string, string> = {};
  for (const u of wanted.slice(0, maxPages)) {
    const r = await fetchChain(u);
    const slug = slugFor(u);
    let file: string | undefined;
    if (r.status > 0) {
      const html = text(r);
      file = await save(`pages/${slug}.html`, html);
      await save(`pages/${slug}.headers.json`, JSON.stringify({ status: r.status, final: r.final, headers: r.headers }, null, 2));
      facts.push(extractPageFacts(html, r.final, r.status, r.headers, slug));
      if (u === `${origin}/`) homeHeaders = r.headers;
    }
    pages.push(toRecord(r, file));
    if (delay > 0) await Bun.sleep(delay);
  }
  await Bun.write(join(derived, "pages.json"), JSON.stringify(facts, null, 2));

  // 4b. clé IndexNow déclarée par la stratégie
  let indexnow: FetchRecord | null = null;
  if (strat?.strategy?.indexnow) {
    const r = await fetchChain(`${origin}/${strat.strategy.indexnow}.txt`);
    indexnow = toRecord(r, r.status === 200 ? await save("indexnow.txt", text(r)) : undefined);
  }

  // 5. verdicts robots sur les URL finales des pages
  const robotsEval = evaluateRobots(`${origin}/robots.txt`, robotsRes.status, robotsTxt, ALL_BOTS, facts.map((f) => f.url));
  await Bun.write(join(derived, "robots-eval.json"), JSON.stringify(robotsEval, null, 2));

  // 6. sondes : http vers https, autre hôte (www ou apex), URL inexistante
  const httpUrl = site.protocol === "https:" ? `http://${site.host}/` : `${origin}/`;
  const altHost = site.hostname.startsWith("www.") ? site.hostname.slice(4) : `www.${site.hostname}`;
  const altPort = site.port ? `:${site.port}` : "";
  const notApplicable = (url: string): FetchRecord => ({ requested: url, final: url, status: 0, chain: [], bytes: 0, fetchedAt: new Date().toISOString(), error: "non applicable en local", ms: 0 });
  const altUrl = `${site.protocol}//${altHost}${altPort}/`;
  const notFoundRes = await fetchChain(`${origin}/erom-seo-probe-${crypto.randomUUID().slice(0, 8)}`);
  const probes = {
    httpToHttps: level === 2 ? notApplicable(httpUrl) : toRecord(await fetchChain(httpUrl)),
    hostVariant: level === 2 ? notApplicable(altUrl) : toRecord(await fetchChain(altUrl)),
    // le corps est gardé : un 200 peut être un vrai soft 404 ou une page de challenge anti-bot, seul le contenu le dit
    notFound: toRecord(notFoundRes, notFoundRes.status === 200 ? await save("probe-notfound.html", text(notFoundRes)) : undefined),
  };

  // 7. PageSpeed, un seul appel, mobile
  let psi: Manifest["psi"] = { attempted: false, ok: false, error: "PSI_API_KEY absent : PERF-01 non exécutable" };
  if (level === 2) psi = { attempted: false, ok: false, error: "non applicable en local" };
  else if (o.noPsi) psi = { attempted: false, ok: false, error: "PageSpeed non demandé (--no-psi)" };
  if (level !== 2 && !o.noPsi && o.psiKey) {
    const p = await fetchPsi(`${origin}/`, o.psiKey, "MOBILE");
    await Bun.write(join(derived, "psi.json"), JSON.stringify(p, null, 2));
    psi = { attempted: true, ok: p.ok, error: p.error };
  } else {
    await Bun.write(join(derived, "psi.json"), JSON.stringify({ ok: false, strategy: "MOBILE", error: psi.error }, null, 2));
  }

  // 7b. niveau 1 : les consoles. Jamais atteint sans --level 1 (D37) : les accès de cette machine
  // sont posés en permanence, une détection automatique enverrait des requêtes à des tiers sans qu'on l'ait demandé.
  // bingKey et auth sont déclarés hors du bloc pour rester visibles au moment d'écrire le manifeste :
  // c'est sur cette même paire de secrets qu'il est aussi passé à assertNoSecret.
  let level1: Manifest["level1"] = null;
  const bingKey = level === 1 ? process.env.BING_WMT_API_KEY ?? null : null;
  let auth: GoogleAuth | null = null;
  if (level === 1) {
    // TOUTE la branche est sous try. La spec ouvre sa section 6 par « le niveau 1 ne fait jamais
    // échouer l'audit », et AC-7 exige un code de sortie 0. Or assertNoSecret lève par conception, et
    // deriveConsole, mkdir et Bun.write peuvent lever : une seule exception qui remonte tuerait la
    // collecte APRÈS l'écriture de raw/gsc/ et AVANT celle du manifeste, laissant un dossier sans
    // manifest.json, donc inexploitable par la skill.
    try {
      const fetcher: Fetcher = o.consoleFetcher ?? (async (url, init) => {
        const r = await fetch(url, init);
        return { status: r.status, text: await r.text() };
      });
      let authError: string | null = null;
      if (o.consoleAuth) {
        // Couture de test (round 1 de revue) : évite tout appel au vrai gcloud, déterministe quel que
        // soit l'environnement qui lance la suite (GSC_QUOTA_PROJECT posé ou non).
        auth = o.consoleAuth.auth;
        authError = o.consoleAuth.authError;
      } else {
        try {
          auth = await getAccessToken(process.env, {
            gcloud: () => defaultGcloud(),
            serviceAccount: (p) => serviceAccountToken(p, fetcher),
          });
        } catch (e) {
          authError = e instanceof AuthError ? `${e.message} : ${e.hint}` : String(e);
        }
      }
      const r = await collectLevel1({ fetcher, auth, authError, bingKey },
        { origin, pages: facts.map((f) => ({ url: f.url, slug: f.slug })), today: new Date().toISOString().slice(0, 10), delayMs: delay });
      for (const f of r.raw) {
        // Round 2 de revue : raw/ reçoit des réponses brutes d'API, la même garde que le dérivé et le
        // manifeste s'applique ici, avant l'écriture — un secret qui fuit dans une réponse ne doit pas
        // survivre plus longtemps parce que le fichier qui le porte est un raw/ plutôt qu'un derived/.
        assertNoSecret(f.body, bingKey);
        assertNoSecret(f.body, auth?.token ?? null);
        await mkdir(join(raw, dirname(f.path)), { recursive: true });
        await save(f.path, f.body);
      }
      const derivedConsole = deriveConsole(r, strat?.strategy?.pages.map((p) => ({ page: p.page, motCle: p.motCle })) ?? null, origin);
      const text = JSON.stringify(derivedConsole, null, 2);
      assertNoSecret(text, bingKey);
      assertNoSecret(text, auth?.token ?? null);
      await Bun.write(join(derived, "console.json"), text);
      level1 = { attempted: true, googleError: r.google.error, bingError: r.bing.error };
    } catch (e) {
      // Le message d'assertNoSecret ne contient jamais le secret lui-même (il le nomme, sans le citer).
      level1 = { attempted: true, googleError: e instanceof Error ? e.message : String(e), bingError: null };
    }
  }

  // 8. manifeste
  const home = facts.find((f) => f.slug === "index");
  const manifest: Manifest = {
    site: origin,
    startedAt,
    finishedAt: new Date().toISOString(),
    level,
    userAgent: USER_AGENT,
    maxPages,
    robots,
    sitemaps,
    sitemapUrls: sm.stats,
    llms,
    pages,
    probes,
    stack: { generator: home?.generator ?? null, server: homeHeaders["server"] ?? null, poweredBy: homeHeaders["x-powered-by"] ?? null },
    psi,
    strategy: strat?.ref ?? null,
    indexnow,
    level1,
  };
  const manifestText = JSON.stringify(manifest, null, 2);
  assertNoSecret(manifestText, bingKey);
  assertNoSecret(manifestText, auth?.token ?? null);
  await Bun.write(join(raw, "manifest.json"), manifestText);
  return { ...manifest, out };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const url = args[0];
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const pages = args.flatMap((a, i) => (a === "--page" && args[i + 1] ? [args[i + 1]] : []));
  const out = opt("--out");
  const strategyPathOpt = opt("--strategy-path");
  if (!url || url.startsWith("--")) {
    console.error("usage : bun collect.ts <url> [--out <dossier>] [--max-pages 10] [--page <url>]... [--level 0|1|2] [--no-psi] [--strategy-path <chemin|none>]");
    process.exit(2);
  }
  const m = await runCollect({
    url,
    out,
    maxPages: Number(opt("--max-pages") ?? 10),
    pages,
    level: args.includes("--level") ? (([0, 1, 2] as const).find((n) => n === Number(opt("--level"))) ?? 0) : undefined,
    psiKey: process.env.PSI_API_KEY ?? null,
    noPsi: args.includes("--no-psi"),
    // --strategy-path none désactive la lecture de toute stratégie (strategyPath: null) ; toute autre valeur
    // remplace le chemin par défaut seo/strategy.md. Absent : comportement inchangé (défaut interne à runCollect).
    strategyPath: strategyPathOpt === "none" ? null : strategyPathOpt,
  });
  console.log(`dossier : ${m.out}`);
  console.log(`collecte terminée : ${m.pages.length} pages, robots.txt ${m.robots.status}, ${m.sitemaps.filter((s) => s.status === 200).length} sitemap(s), llms.txt ${m.llms.status}, PageSpeed ${m.psi.ok ? "ok" : m.psi.error}`);
  if (m.level1?.attempted) {
    console.log(`consoles : Google ${m.level1.googleError ?? "ok"}, Bing ${m.level1.bingError ?? "ok"}`);
  }
  if (m.strategy?.error) console.error(`attention : ${m.strategy.path} inanalysable, couche stratégique non évaluée : ${m.strategy.error}`);
  if (m.level === 2 && m.sitemapUrls.rewrittenFrom?.length) console.error(`info : sitemap sur l'hôte de production ${m.sitemapUrls.rewrittenFrom.join(", ")}, URLs ramenées sur ${m.site}`);
  const warning = formatSkippedWarning(m.sitemapUrls);
  if (warning) console.error(warning);
}
