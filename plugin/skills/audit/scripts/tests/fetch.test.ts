import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { fetchChain, text } from "../lib/fetch";

let server: ReturnType<typeof Bun.serve>;
let base = "";

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const p = new URL(req.url).pathname;
      if (p === "/old") return new Response(null, { status: 301, headers: { location: "/new" } });
      if (p === "/new") return new Response("<html><title>ok</title></html>", { headers: { "content-type": "text/html", "last-modified": "Wed, 26 Aug 2026 20:49:21 GMT" } });
      if (p === "/loop") return new Response(null, { status: 302, headers: { location: "/loop" } });
      if (p === "/slow") return new Promise((r) => setTimeout(() => r(new Response("late")), 1500));
      if (p === "/ua") return new Response(req.headers.get("user-agent") ?? "");
      return new Response("nope", { status: 404 });
    },
  });
  base = `http://localhost:${server.port}`;
});
afterAll(() => server.stop(true));

describe("fetchChain", () => {
  test("suit une redirection et garde la chaine", async () => {
    const r = await fetchChain(`${base}/old`);
    expect(r.status).toBe(200);
    expect(r.final).toBe(`${base}/new`);
    expect(r.chain.map((h) => h.status)).toEqual([301, 200]);
    expect(r.chain[0].location).toBe("/new");
    expect(r.headers["last-modified"]).toBe("Wed, 26 Aug 2026 20:49:21 GMT");
    expect(text(r)).toContain("<title>ok</title>");
    expect(r.ms).toBeGreaterThanOrEqual(0);
  });
  test("rend le 404 tel quel", async () => {
    const r = await fetchChain(`${base}/absent`);
    expect(r.status).toBe(404);
    expect(r.chain).toHaveLength(1);
  });
  test("s'arrete sur une boucle de redirections", async () => {
    const r = await fetchChain(`${base}/loop`, { maxHops: 3 });
    expect(r.status).toBe(0);
    expect(r.error).toContain("redirections");
    expect(r.chain).toHaveLength(4);
  });
  test("expire sans planter", async () => {
    const r = await fetchChain(`${base}/slow`, { timeoutMs: 200 });
    expect(r.status).toBe(0);
    expect(r.error).toMatch(/timeout|abort/i);
  });
  test("envoie le user-agent de l'outil", async () => {
    const r = await fetchChain(`${base}/ua`);
    expect(text(r)).toBe("erom-seo-audit/0.1");
  });
});
