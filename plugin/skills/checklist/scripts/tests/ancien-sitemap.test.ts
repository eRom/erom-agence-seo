import { describe, test, expect } from "bun:test";
import type { FetchResult, Hop } from "../../../../skills/audit/scripts/lib/types";
import { checkRedirections, judgeChain } from "../lib/ancien-sitemap";

const SITE = "https://www.chico.org";
function result(requested: string, chain: Hop[], status: number, final: string, error?: string): FetchResult {
  return { requested, final, status, chain, headers: {}, body: new Uint8Array(), ms: 1, ...(error ? { error } : {}) };
}

describe("verdict d'une chaîne", () => {
  test("301 puis 200 sur le site : ok ; 308 aussi ; deux sauts permanents aussi", () => {
    expect(judgeChain(result("https://old.fr/a", [{ url: "https://old.fr/a", status: 301, location: `${SITE}/a` }, { url: `${SITE}/a`, status: 200 }], 200, `${SITE}/a`), SITE)).toEqual({ url: "https://old.fr/a", ok: true, detail: "301 → 200" });
    expect(judgeChain(result("https://old.fr/b", [{ url: "https://old.fr/b", status: 308 }, { url: "https://chico.org/b", status: 301 }, { url: `${SITE}/b`, status: 200 }], 200, `${SITE}/b`), SITE).ok).toBe(true);
  });
  test("404 direct, 302 temporaire, 301 vers un 404, 301 hors site : tous en défaut, avec la raison", () => {
    expect(judgeChain(result("https://old.fr/c", [{ url: "https://old.fr/c", status: 404 }], 404, "https://old.fr/c"), SITE)).toMatchObject({ ok: false, detail: "404 sans redirection" });
    expect(judgeChain(result("https://old.fr/d", [{ url: "https://old.fr/d", status: 302 }, { url: `${SITE}/d`, status: 200 }], 200, `${SITE}/d`), SITE).detail).toContain("302 est temporaire");
    expect(judgeChain(result("https://old.fr/e", [{ url: "https://old.fr/e", status: 301 }, { url: `${SITE}/e`, status: 404 }], 404, `${SITE}/e`), SITE)).toMatchObject({ ok: false, detail: "301 → 404" });
    expect(judgeChain(result("https://old.fr/f", [{ url: "https://old.fr/f", status: 301 }, { url: "https://ailleurs.fr/f", status: 200 }], 200, "https://ailleurs.fr/f"), SITE).detail).toContain("hors site");
    expect(judgeChain(result("https://old.fr/g", [], 0, "https://old.fr/g", "TimeoutError: x"), SITE)).toMatchObject({ ok: false, detail: "TimeoutError: x" });
  });
  test("checkRedirections suit les URL dans l'ordre, une par une", async () => {
    const seen: string[] = [];
    const f = async (u: string) => { seen.push(u); return result(u, [{ url: u, status: 301 }, { url: `${SITE}/x`, status: 200 }], 200, `${SITE}/x`); };
    const out = await checkRedirections(["https://old.fr/1", "https://old.fr/2"], SITE, f);
    expect(seen).toEqual(["https://old.fr/1", "https://old.fr/2"]);
    expect(out.every((r) => r.ok)).toBe(true);
  });
});
