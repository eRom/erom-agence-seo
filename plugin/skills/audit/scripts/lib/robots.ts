import robotsParser from "robots-parser";
import type { RobotsEval, RobotsSemantics } from "./types";

function semanticsFor(status: number): RobotsSemantics {
  if (status === 0) return "unreachable";
  if (status === 429) return "rate-limited-429";
  if (status >= 500) return "disallow-all-5xx";
  if (status >= 400) return "allow-all-4xx";
  return "rules";
}

/**
 * Applique robots.txt pour chaque bot, sur la racine et sur chaque page collectée.
 * Sémantique hors 200 : G-ROBOTS (4xx sauf 429 = aucune restriction ; 5xx = Google arrête de crawler) et RFC 9309.
 * `null` = aucun verdict possible (fichier absent, en erreur, ou URL hors hôte).
 */
export function evaluateRobots(robotsUrl: string, status: number, txt: string | null, bots: string[], pageUrls: string[]): RobotsEval {
  const origin = new URL(robotsUrl).origin;
  const semantics = semanticsFor(status);
  const nullVerdicts = () => Object.fromEntries(bots.map((b) => [b, { root: null, pages: Object.fromEntries(pageUrls.map((p) => [p, null])) }]));
  if (semantics !== "rules" || txt === null) {
    return { status, semantics, parseable: false, sitemaps: [], bots: nullVerdicts() };
  }
  const parser = robotsParser(robotsUrl, txt);
  const verdict = (u: string, b: string): boolean | null => {
    const v = parser.isAllowed(u, b);
    return v === undefined ? null : v;
  };
  return {
    status,
    semantics,
    parseable: true,
    sitemaps: parser.getSitemaps(),
    bots: Object.fromEntries(bots.map((b) => [b, { root: verdict(`${origin}/`, b), pages: Object.fromEntries(pageUrls.map((p) => [p, verdict(p, b)])) }])),
  };
}
