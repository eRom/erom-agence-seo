import { describe, test, expect } from "bun:test";
import { chooseProvider, getAccessToken, serviceAccountToken, defaultGcloud, AuthError, SCOPE, TOKEN_ENDPOINT, type Fetcher } from "../lib/auth-google";

const gcloudOk = async () => "ya29.FAUX-JETON";
const gcloudKo = async () => null;
const saOk = async () => "sa.FAUX-JETON";

describe("choix du fournisseur (D32)", () => {
  test("GSC_SA_KEY_FILE défini gagne, sinon gcloud", () => {
    expect(chooseProvider({ GSC_SA_KEY_FILE: "/hors/depot/sa.json" })).toBe("service-account");
    expect(chooseProvider({})).toBe("gcloud");
  });
});

describe("getAccessToken", () => {
  test("gcloud : le jeton part avec le projet de quota", async () => {
    const a = await getAccessToken({ GSC_QUOTA_PROJECT: "p-123" }, { gcloud: gcloudOk, serviceAccount: saOk });
    expect(a).toEqual({ token: "ya29.FAUX-JETON", quotaProject: "p-123", provider: "gcloud" });
  });
  test("gcloud sans GSC_QUOTA_PROJECT : erreur qui nomme la variable et la commande d'activation, avant tout appel", async () => {
    const p = getAccessToken({}, { gcloud: gcloudOk, serviceAccount: saOk });
    await expect(p).rejects.toBeInstanceOf(AuthError);
    await p.catch((e: AuthError) => {
      expect(e.hint).toContain("GSC_QUOTA_PROJECT");
      expect(e.hint).toContain("gcloud services enable searchconsole.googleapis.com");
    });
  });
  test("compte de service : pas de projet de quota, et GSC_QUOTA_PROJECT est ignoré", async () => {
    const a = await getAccessToken({ GSC_SA_KEY_FILE: "/hors/depot/sa.json", GSC_QUOTA_PROJECT: "p-123" }, { gcloud: gcloudOk, serviceAccount: saOk });
    expect(a).toEqual({ token: "sa.FAUX-JETON", quotaProject: null, provider: "service-account" });
  });
  test("aucun jeton disponible : erreur avec la commande de connexion et son scope, sans jeton dedans", async () => {
    const p = getAccessToken({ GSC_QUOTA_PROJECT: "p-123" }, { gcloud: gcloudKo, serviceAccount: saOk });
    await expect(p).rejects.toBeInstanceOf(AuthError);
    await p.catch((e: AuthError) => {
      expect(e.hint).toContain("gcloud auth application-default login");
      expect(e.hint).toContain(SCOPE);
    });
  });
});

describe("defaultGcloud (I-1, le seul export qui touche le binaire producteur du secret)", () => {
  // Faux binaires exécutables jetables, écrits dans tmp-sa/ (déjà ignoré par git).
  const ecrireFaux = async (nom: string, script: string) => {
    const chemin = `${import.meta.dir}/tmp-sa/${nom}`;
    await Bun.write(chemin, script);
    const chmod = Bun.spawn(["chmod", "+x", chemin]);
    await chmod.exited;
    return chemin;
  };

  test("sortie 0 avec jeton sur stdout : le jeton est rendu, débarrassé de ses espaces", async () => {
    const chemin = await ecrireFaux("gcloud-ok", "#!/bin/sh\nprintf '  ya29.SCRIPT-JETON\\n'\nexit 0\n");
    expect(await defaultGcloud(chemin)).toBe("ya29.SCRIPT-JETON");
  });

  test("sortie 1 malgré un jeton sur stdout : null, le jeton n'est pas rendu", async () => {
    const chemin = await ecrireFaux("gcloud-echec", "#!/bin/sh\nprintf 'ya29.NE-DOIT-PAS-SORTIR\\n'\nexit 1\n");
    expect(await defaultGcloud(chemin)).toBeNull();
  });

  test("sortie 0 sans rien sur stdout : null", async () => {
    const chemin = await ecrireFaux("gcloud-vide", "#!/bin/sh\nexit 0\n");
    expect(await defaultGcloud(chemin)).toBeNull();
  });

  test("binaire inexistant : null, sans lever", async () => {
    const chemin = `${import.meta.dir}/tmp-sa/gcloud-absent-${Date.now()}`;
    expect(await defaultGcloud(chemin)).toBeNull();
  });
});

describe("serviceAccountToken", () => {
  // Une vraie paire RSA fabriquée dans le test : la signature est vérifiée avec la clé publique,
  // ce qui prouve que le JWT est signé pour de bon et pas seulement bien formé.
  const paire = async () => {
    const p = await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", p.privateKey);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8))).match(/.{1,64}/g)!.join("\n");
    return { pub: p.publicKey, pem: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n` };
  };
  const decode = (s: string) => JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));

  test("signe un JWT RS256 vérifiable et l'échange contre un jeton", async () => {
    const { pub, pem } = await paire();
    const dir = `${import.meta.dir}/tmp-sa`;
    await Bun.write(`${dir}/ok.json`, JSON.stringify({ client_email: "agence@projet.iam.gserviceaccount.com", private_key: pem }));
    let vu: { url: string; body?: string; headers?: Record<string, string> } | null = null;
    const f: Fetcher = async (url, init = {}) => { vu = { url, body: init.body, headers: init.headers }; return { status: 200, text: '{"access_token":"sa.JETON"}' }; };

    expect(await serviceAccountToken(`${dir}/ok.json`, f)).toBe("sa.JETON");
    expect(vu!.url).toBe(TOKEN_ENDPOINT);
    expect(vu!.headers!["content-type"]).toBe("application/x-www-form-urlencoded");
    const params = new URLSearchParams(vu!.body!);
    expect(params.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");

    const [h, c, sig] = params.get("assertion")!.split(".");
    expect(decode(h)).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = decode(c);
    expect(claims.iss).toBe("agence@projet.iam.gserviceaccount.com");
    expect(claims.scope).toBe(SCOPE);
    expect(claims.aud).toBe(TOKEN_ENDPOINT);
    expect(claims.exp - claims.iat).toBe(3540);
    // base64url : ni remplissage, ni + ni /
    for (const part of [h, c, sig]) expect(part).not.toMatch(/[=+/]/);
    const octets = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0));
    expect(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pub, octets, new TextEncoder().encode(`${h}.${c}`))).toBe(true);
  });

  test("un refus de Google ne laisse fuir ni la clé privée ni le JWT", async () => {
    const { pem } = await paire();
    const dir = `${import.meta.dir}/tmp-sa`;
    await Bun.write(`${dir}/ok.json`, JSON.stringify({ client_email: "x@y.iam.gserviceaccount.com", private_key: pem }));
    let jwtEnvoye = "";
    const f: Fetcher = async (_url, init = {}) => {
      jwtEnvoye = new URLSearchParams(init.body ?? "").get("assertion") ?? "";
      return { status: 400, text: '{"error":"invalid_grant"}' };
    };
    const p = serviceAccountToken(`${dir}/ok.json`, f);
    await expect(p).rejects.toBeInstanceOf(AuthError);
    await p.catch((e: AuthError) => {
      const tout = `${e.message}${e.hint}`;
      expect(jwtEnvoye.length).toBeGreaterThan(100); // le JWT a bien été formé, sinon le test ne prouve rien
      expect(tout).not.toContain(jwtEnvoye);
      expect(tout).not.toContain("PRIVATE KEY");
      expect(e.hint).toContain("ACC-04");
    });
  });

  test("clé incomplète ou fichier absent : erreur lisible, pas une trace", async () => {
    const dir = `${import.meta.dir}/tmp-sa`;
    await Bun.write(`${dir}/casse.json`, JSON.stringify({ client_email: "x@y.z" }));
    const f: Fetcher = async () => ({ status: 200, text: '{"access_token":"x"}' });
    await expect(serviceAccountToken(`${dir}/casse.json`, f)).rejects.toBeInstanceOf(AuthError);
    await expect(serviceAccountToken(`${dir}/absent.json`, f)).rejects.toBeInstanceOf(AuthError);
  });

  test("I-3 : réponse HTTP 200 au corps non-JSON (portail captif) : AuthError, pas une trace SyntaxError brute", async () => {
    const { pem } = await paire();
    const dir = `${import.meta.dir}/tmp-sa`;
    await Bun.write(`${dir}/ok.json`, JSON.stringify({ client_email: "x@y.iam.gserviceaccount.com", private_key: pem }));
    const f: Fetcher = async () => ({ status: 200, text: "<html>portail captif</html>" });
    await expect(serviceAccountToken(`${dir}/ok.json`, f)).rejects.toBeInstanceOf(AuthError);
  });
});
