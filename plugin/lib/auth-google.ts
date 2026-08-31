// Un jeton, deux fournisseurs derrière une seule fonction (D32) : gcloud aujourd'hui, compte de service demain.
// La bascule coûte une variable d'environnement et rien dans les appels.
export type Provider = "gcloud" | "service-account";
export type GoogleAuth = { token: string; quotaProject: string | null; provider: Provider };
export type Env = { GSC_SA_KEY_FILE?: string; GSC_QUOTA_PROJECT?: string };
export type GcloudRunner = () => Promise<string | null>;
// auth-google déclare son propre Fetcher : gsc.ts (tâche 3) n'existe pas encore, et déclarera la même forme.
export type FetchInit = { method?: "GET" | "POST" | "PUT"; headers?: Record<string, string>; body?: string };
// `final` porte l'URL après redirections. Optionnel : seul console update s'en sert, pour connaître
// l'origine réellement servie (D53). Les appelants qui l'ignorent ne changent pas.
export type Fetcher = (url: string, init?: FetchInit) => Promise<{ status: number; text: string; final?: string }>;

export const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
/** Le scope d'écriture. Il couvre webmasters.readonly : demander celui-ci ne retire aucune lecture. */
export const SCOPE_WRITE = "https://www.googleapis.com/auth/webmasters";
export const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export const LOGIN_HINT =
  `aucun jeton Google. Lance :\n` +
  `  gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,${SCOPE}\n` +
  `ou pose GSC_SA_KEY_FILE vers la clé JSON d'un compte de service (voir references/acces.md).`;

export const SUBMIT_HINT =
  `ce jeton n'a pas le droit d'écrire dans Search Console. Relance :\n` +
  `  gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,${SCOPE_WRITE}\n` +
  `Ce scope couvre aussi toutes les lectures : rien d'autre ne change. Voir references/acces.md, ACC-07.`;

export const QUOTA_HINT =
  `GSC_QUOTA_PROJECT absente. Avec le fournisseur gcloud, l'API Search Console exige un projet de quota. Pose :\n` +
  `  export GSC_QUOTA_PROJECT="<projet>"\n` +
  `et active l'API dessus une fois :\n` +
  `  gcloud services enable searchconsole.googleapis.com --project=<projet>\n` +
  `Un compte de service (GSC_SA_KEY_FILE) n'en a pas besoin.`;

export const SA_HINT =
  `clé de compte de service refusée. Vérifie GSC_SA_KEY_FILE et que le compte est bien ajouté comme ` +
  `utilisateur de la propriété. Voir references/acces.md, ACC-04.`;

export class AuthError extends Error {
  constructor(message: string, readonly hint: string) { super(message); this.name = "AuthError"; }
}

export function chooseProvider(env: Env): Provider {
  return env.GSC_SA_KEY_FILE ? "service-account" : "gcloud";
}

export async function getAccessToken(
  env: Env,
  deps: { gcloud: GcloudRunner; serviceAccount: (path: string) => Promise<string> },
): Promise<GoogleAuth> {
  if (chooseProvider(env) === "service-account") {
    const token = await deps.serviceAccount(env.GSC_SA_KEY_FILE!);
    return { token, quotaProject: null, provider: "service-account" };
  }
  const quotaProject = env.GSC_QUOTA_PROJECT ?? null;
  if (!quotaProject) throw new AuthError("projet de quota absent", QUOTA_HINT);
  const token = await deps.gcloud();
  if (!token) throw new AuthError("jeton indisponible", LOGIN_HINT);
  return { token, quotaProject, provider: "gcloud" };
}

/**
 * Appelle le binaire gcloud. Sa sortie n'est jamais journalisée : c'est un jeton porteur.
 * Le nom du binaire est paramétrable pour les tests ; assignable à GcloudRunner (appel sans argument).
 */
export const defaultGcloud = async (binaire = "gcloud"): Promise<string | null> => {
  try {
    const p = Bun.spawn([binaire, "auth", "application-default", "print-access-token"], { stdout: "pipe", stderr: "ignore" });
    const out = (await new Response(p.stdout).text()).trim();
    return (await p.exited) === 0 && out.length > 0 ? out : null;
  } catch {
    return null;
  }
};

/** base64url sans remplissage, la forme que RFC 7515 impose à un JWT. */
function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));

/** Le corps d'une clé PEM PKCS8, décodé en octets. */
function pkcs8Bytes(pem: string): Uint8Array {
  const body = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

/**
 * Flux serveur à serveur documenté par Google : JWT signé RS256, échangé contre un jeton d'accès.
 * Rien de ce qui sort d'ici, message d'erreur compris, ne contient la clé privée, le JWT ou le jeton.
 */
export async function serviceAccountToken(keyFilePath: string, fetcher: Fetcher, now: () => number = Date.now): Promise<string> {
  let email: string, privateKey: string;
  try {
    const j = JSON.parse(await Bun.file(keyFilePath).text()) as { client_email?: string; private_key?: string };
    if (!j.client_email || !j.private_key) throw new Error("champs manquants");
    email = j.client_email; privateKey = j.private_key;
  } catch {
    // I-1 : jamais keyFilePath dans le message. Un chemin de clé réel nomme souvent le client (dossier,
    // sous-domaine) et remonte jusqu'à derived/console.json et au manifeste (spec section 7) ; SA_HINT
    // nomme déjà GSC_SA_KEY_FILE, ça suffit à corriger sans rien perdre en exploitabilité.
    throw new AuthError("clé de compte de service illisible", SA_HINT);
  }
  const iat = Math.floor(now() / 1000);
  const header = b64urlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  // 3540 s (59 min), une minute sous le maximum documenté par Google : marge contre une horloge locale légèrement en retard.
  const claims = b64urlText(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_ENDPOINT, exp: iat + 3540, iat }));
  let jwt: string;
  try {
    const key = await crypto.subtle.importKey("pkcs8", pkcs8Bytes(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
    jwt = `${header}.${claims}.${b64url(sig)}`;
  } catch {
    throw new AuthError("clé privée du compte de service inutilisable", SA_HINT);
  }
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString();
  const r = await fetcher(TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (r.status !== 200) throw new AuthError(`Google a refusé la clé de compte de service (HTTP ${r.status})`, SA_HINT);
  let token: string | undefined;
  try {
    token = (JSON.parse(r.text) as { access_token?: string }).access_token;
  } catch {
    throw new AuthError("réponse de jeton illisible", SA_HINT);
  }
  if (!token) throw new AuthError("réponse de jeton sans access_token", SA_HINT);
  return token;
}
