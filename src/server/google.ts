import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Google sign-in, handled by the app rather than the auth host, so Google knows only the app's domain (the consent
 * screen does not name Supabase, and moving platform later needs no new consent). Ported from genfashion-app, then
 * Karaar, now shared. The one thing delegated is turning the verified identity into a session (`signInWithIdToken`).
 *
 * Flow: GET /auth/google (startSignIn, cookie with the secrets) -> Google -> GET /auth/google/callback (exchangeCode,
 * then signInWithIdToken). Server only. Scopes: openid email profile.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export class GoogleError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PendingSignIn {
  state: string;
  nonce: string;
  verifier: string;
  next: string;
}

export interface GoogleIdentity {
  idToken: string;
  /** The RAW nonce (not the hash that went to Google): GoTrue hashes what it is given. */
  nonce: string;
  email: string;
  name: string | null;
  picture: string | null;
  sub: string;
}

const b64url = (b: Buffer) => b.toString("base64url");
const rand = () => b64url(randomBytes(32));
const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function decodePayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1];
  if (!part) throw new GoogleError("bad_id_token", "Google returned a malformed token.");
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw new GoogleError("bad_id_token", "Google returned a malformed token.");
  }
}

/** The redirect URI, which must match what is registered in Google exactly. */
export const googleRedirectUri = (origin: string) => `${origin}/auth/google/callback`;

/** Reads GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. `||`, not `??`: a Vercel Sensitive variable can be empty. */
export const googleEnvFromProcess = () => ({ clientId: process.env.GOOGLE_CLIENT_ID || "", clientSecret: process.env.GOOGLE_CLIENT_SECRET || "" });

export function createGoogleSignIn(config: { clientId: string; clientSecret: string }) {
  const CLIENT_ID = config.clientId.trim();
  const CLIENT_SECRET = config.clientSecret.trim();

  /** Both halves are needed: the button stays hidden without them. */
  const configured = () => !!CLIENT_ID && !!CLIENT_SECRET;

  /**
   * Start the handshake. Three secrets are generated and kept in an httpOnly cookie for the round trip: `state` (the
   * callback belongs to a sign-in THIS browser started), `nonce` (binds the id_token to this request; the HASH goes to
   * Google, the raw value stays here, which is what GoTrue re-checks) and `verifier` (PKCE: a stolen code is useless).
   */
  function startSignIn(origin: string, next: string): { url: string; pending: PendingSignIn } {
    if (!configured()) throw new GoogleError("not_configured", "Google sign-in isn't configured on this deployment.");
    const pending: PendingSignIn = { state: rand(), nonce: rand(), verifier: rand(), next };
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: googleRedirectUri(origin),
      response_type: "code",
      scope: "openid email profile",
      state: pending.state,
      nonce: sha256hex(pending.nonce),
      code_challenge: b64url(createHash("sha256").update(pending.verifier).digest()),
      code_challenge_method: "S256",
      // Someone with several Google accounts picks, instead of being silently signed in as the last one used.
      prompt: "select_account",
    });
    return { url: `${AUTH_ENDPOINT}?${params}`, pending };
  }

  /**
   * Turn the `?code=` from Google's redirect into a verified identity. The id_token comes over TLS from Google's token
   * endpoint, authenticated with our secret, so its signature need not be checked again here (OIDC 3.1.3.7; Supabase
   * checks it when it mints the session). The claims are checked: state, issuer, audience, expiry, nonce, verified email.
   */
  async function exchangeCode(opts: { code: string; state: string; origin: string; pending: PendingSignIn }): Promise<GoogleIdentity> {
    const { code, state, origin, pending } = opts;
    if (!sameSecret(state, pending.state)) throw new GoogleError("state_mismatch", "That sign-in didn't start here. Please try again.");

    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: googleRedirectUri(origin), grant_type: "authorization_code", code_verifier: pending.verifier }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.id_token) {
      throw new GoogleError(body?.error ?? `http_${res.status}`, body?.error_description ?? "Google refused the sign-in. Please try again.");
    }

    const claims = decodePayload(body.id_token as string);
    if (!ISSUERS.includes(String(claims.iss ?? ""))) throw new GoogleError("bad_issuer", "That token did not come from Google.");
    if (String(claims.aud ?? "") !== CLIENT_ID) throw new GoogleError("bad_audience", "That token was issued for a different app.");
    const exp = Number(claims.exp ?? 0);
    if (!exp || exp * 1000 <= Date.now()) throw new GoogleError("expired", "That sign-in took too long. Please try again.");
    // The token echoes the hash we sent, so compare against the hash.
    if (!sameSecret(String(claims.nonce ?? ""), sha256hex(pending.nonce))) throw new GoogleError("nonce_mismatch", "That sign-in could not be verified. Please try again.");

    const email = String(claims.email ?? "").toLowerCase();
    if (!email) throw new GoogleError("no_email", "That Google account has no email address we can use.");
    // Refusing an unverified address is the conservative call: it is how one person ends up holding another's account.
    if (claims.email_verified !== true) throw new GoogleError("email_unverified", "Google hasn't verified that address. Use a different account.");

    return { idToken: body.id_token, nonce: pending.nonce, email, name: (claims.name as string) ?? null, picture: (claims.picture as string) ?? null, sub: String(claims.sub ?? "") };
  }

  return { configured, startSignIn, exchangeCode };
}
