import { describe, test, expect } from "bun:test";
import { evaluateRobots } from "../lib/robots";

const fixture = (host: string) => Bun.file(`${import.meta.dir}/fixtures/robots/${host}.txt`).text();
const BOTS = ["OAI-SearchBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "GPTBot", "Googlebot", "bingbot", "Google-Extended"];

describe("evaluateRobots", () => {
  test("lemonde.fr bloque Claude-User et Claude-SearchBot, laisse OAI-SearchBot", async () => {
    const e = evaluateRobots("https://www.lemonde.fr/robots.txt", 200, await fixture("www.lemonde.fr"), BOTS, ["https://www.lemonde.fr/politique/"]);
    expect(e.semantics).toBe("rules");
    expect(e.parseable).toBe(true);
    expect(e.bots["Claude-User"].root).toBe(false);
    expect(e.bots["Claude-SearchBot"].root).toBe(false);
    expect(e.bots["OAI-SearchBot"].root).toBe(true);
    expect(e.bots["Googlebot"].root).toBe(true);
    expect(e.bots["Claude-User"].pages["https://www.lemonde.fr/politique/"]).toBe(false);
    expect(e.sitemaps.length).toBeGreaterThan(0);
  });
  test("lefigaro.fr : Disallow / battu par Allow /voyages (règle la plus longue)", async () => {
    const e = evaluateRobots("https://www.lefigaro.fr/robots.txt", 200, await fixture("www.lefigaro.fr"), BOTS, ["https://www.lefigaro.fr/voyages/paris", "https://www.lefigaro.fr/politique/x"]);
    expect(e.bots["OAI-SearchBot"].root).toBe(false);
    expect(e.bots["OAI-SearchBot"].pages["https://www.lefigaro.fr/voyages/paris"]).toBe(true);
    expect(e.bots["OAI-SearchBot"].pages["https://www.lefigaro.fr/politique/x"]).toBe(false);
  });
  test("leboncoin.fr laisse passer tout le monde à la racine", async () => {
    const e = evaluateRobots("https://www.leboncoin.fr/robots.txt", 200, await fixture("www.leboncoin.fr"), BOTS, []);
    for (const b of BOTS) expect(e.bots[b].root).toBe(true);
  });
  test("nytimes.com bloque toute récupération IA mais pas Googlebot", async () => {
    const e = evaluateRobots("https://www.nytimes.com/robots.txt", 200, await fixture("www.nytimes.com"), BOTS, []);
    for (const b of ["OAI-SearchBot", "Claude-User", "Claude-SearchBot", "PerplexityBot"]) expect(e.bots[b].root).toBe(false);
    expect(e.bots["Googlebot"].root).toBe(true);
  });
  test("404 : aucune restriction, verdicts null, sémantique allow-all-4xx", () => {
    const e = evaluateRobots("https://x.fr/robots.txt", 404, null, BOTS, ["https://x.fr/a"]);
    expect(e.semantics).toBe("allow-all-4xx");
    expect(e.parseable).toBe(false);
    expect(e.bots["Claude-User"].root).toBeNull();
    expect(e.bots["Claude-User"].pages["https://x.fr/a"]).toBeNull();
  });
  test("503 : disallow-all-5xx ; 429 : rate-limited-429 ; 0 : unreachable", () => {
    expect(evaluateRobots("https://x.fr/robots.txt", 503, null, BOTS, []).semantics).toBe("disallow-all-5xx");
    expect(evaluateRobots("https://x.fr/robots.txt", 429, null, BOTS, []).semantics).toBe("rate-limited-429");
    expect(evaluateRobots("https://x.fr/robots.txt", 0, null, BOTS, []).semantics).toBe("unreachable");
  });
  test("le groupe est trouvé sans tenir compte de la casse", () => {
    const txt = "User-agent: claude-user\nDisallow: /\n\nUser-agent: *\nAllow: /\n";
    const e = evaluateRobots("https://x.fr/robots.txt", 200, txt, ["Claude-User", "Googlebot"], []);
    expect(e.bots["Claude-User"].root).toBe(false);
    expect(e.bots["Googlebot"].root).toBe(true);
  });
});
