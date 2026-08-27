import { USER_AGENT, type FetchResult, type Hop } from "./types";

export type FetchOptions = { timeoutMs?: number; maxHops?: number; userAgent?: string };

/** Recupere une URL en suivant les redirections une par une, pour garder la chaine complete. Ne leve jamais : les erreurs vont dans `error`, status 0. */
export async function fetchChain(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const { timeoutMs = 15000, maxHops = 5, userAgent = USER_AGENT } = opts;
  const chain: Hop[] = [];
  let current = url;
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  try {
    for (let i = 0; i <= maxHops; i++) {
      const res = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": userAgent, accept: "text/html,application/xml,text/xml,text/plain,*/*" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const location = res.headers.get("location") ?? undefined;
      chain.push({ url: current, status: res.status, location });
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }
      return { requested: url, final: current, status: res.status, chain, headers: Object.fromEntries(res.headers), body: new Uint8Array(await res.arrayBuffer()), ms: ms() };
    }
    return { requested: url, final: current, status: 0, chain, headers: {}, body: new Uint8Array(), error: `plus de ${maxHops} redirections`, ms: ms() };
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return { requested: url, final: current, status: 0, chain, headers: {}, body: new Uint8Array(), error, ms: ms() };
  }
}

export const text = (r: FetchResult): string => new TextDecoder().decode(r.body);
