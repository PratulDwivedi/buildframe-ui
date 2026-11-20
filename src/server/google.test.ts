// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGoogleSignIn, GoogleError } from "./google";

const g = createGoogleSignIn({ clientId: "cid.apps.googleusercontent.com", clientSecret: "secret" });
const ORIGIN = "https://qevli.example";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
const good = (pending: { nonce: string }, over: object = {}) => ({
  iss: "https://accounts.google.com", aud: "cid.apps.googleusercontent.com", exp: Math.floor(Date.now() / 1000) + 600,
  nonce: sha(pending.nonce), email: "Hello+Riya@buildframe.tech", email_verified: true, name: "Riya Kapoor", picture: "p", sub: "42", ...over,
});
const tokenReply = (idToken: string) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id_token: idToken }) }));
afterEach(() => vi.unstubAllGlobals());

const code = async (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof GoogleError ? e.code : "other"));

describe("configuration", () => {
  it("is configured only with both the id and the secret", () => {
    expect(g.configured()).toBe(true);
    expect(createGoogleSignIn({ clientId: "a", clientSecret: "" }).configured()).toBe(false);
    expect(createGoogleSignIn({ clientId: " ", clientSecret: "b" }).configured()).toBe(false);
  });
  it("refuses to start when not configured", () => {
    expect(() => createGoogleSignIn({ clientId: "", clientSecret: "" }).startSignIn(ORIGIN, "/app")).toThrow(GoogleError);
  });
});

describe("startSignIn", () => {
  const { url, pending } = g.startSignIn(ORIGIN, "/app/x");
  const q = new URL(url).searchParams;
  it("sends state, PKCE and the nonce HASH (never the raw nonce) to Google", () => {
    expect(new URL(url).origin + new URL(url).pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(q.get("state")).toBe(pending.state);
    expect(q.get("nonce")).toBe(sha(pending.nonce));
    expect(q.get("nonce")).not.toBe(pending.nonce);
    expect(q.get("code_challenge")).toBe(createHash("sha256").update(pending.verifier).digest("base64url"));
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("scope")).toBe("openid email profile");
    expect(q.get("redirect_uri")).toBe(`${ORIGIN}/auth/google/callback`);
    expect(pending.next).toBe("/app/x");
  });
  it("makes new secrets each time", () => {
    const b = g.startSignIn(ORIGIN, "/app").pending;
    expect(b.state).not.toBe(pending.state);
    expect(b.verifier).not.toBe(pending.verifier);
  });
});

describe("exchangeCode", () => {
  const { pending } = g.startSignIn(ORIGIN, "/app");
  const run = (state = pending.state) => g.exchangeCode({ code: "c", state, origin: ORIGIN, pending });

  it("returns the verified identity with the RAW nonce and a lower-cased email", async () => {
    tokenReply(jwt(good(pending)));
    expect(await run()).toMatchObject({ email: "hello+riya@buildframe.tech", nonce: pending.nonce, name: "Riya Kapoor", sub: "42" });
  });
  it("sends the verifier and secret to Google's token endpoint", async () => {
    tokenReply(jwt(good(pending)));
    await run();
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body);
    expect(body.get("code_verifier")).toBe(pending.verifier);
    expect(body.get("client_secret")).toBe("secret");
  });
  it("refuses a wrong state before calling Google", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect(await code(run("other"))).toBe("state_mismatch");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ["bad_issuer", { iss: "https://evil.example" }],
    ["bad_audience", { aud: "someone-else" }],
    ["expired", { exp: 1 }],
    ["nonce_mismatch", { nonce: "x" }],
    ["no_email", { email: "" }],
    ["email_unverified", { email_verified: false }],
    ["email_unverified", { email_verified: "true" }],
  ])("refuses a token that fails with %s", async (expected, over) => {
    tokenReply(jwt(good(pending, over)));
    expect(await code(run())).toBe(expected);
  });
  it("accepts aud as a list that includes ours with azp, and refuses a multi-audience token without it", async () => {
    tokenReply(jwt(good(pending, { aud: ["cid.apps.googleusercontent.com", "x"], azp: "cid.apps.googleusercontent.com" })));
    expect(await code(run())).toBe("ok");
    tokenReply(jwt(good(pending, { aud: ["cid.apps.googleusercontent.com", "x"] })));
    expect(await code(run())).toBe("bad_audience");
  });
  it("turns a network failure and a tampered cookie into a GoogleError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await code(run())).toBe("network");
    expect(await code(g.exchangeCode({ code: "c", state: "s", origin: ORIGIN, pending: {} as never }))).toBe("state_mismatch");
    expect(await code(g.exchangeCode({ code: "c", state: undefined as never, origin: ORIGIN, pending }))).toBe("state_mismatch");
  });
  it("refuses a malformed token and a refusal from Google", async () => {
    tokenReply("not-a-jwt");
    expect(await code(run())).toBe("bad_id_token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) }));
    expect(await code(run())).toBe("invalid_grant");
  });
});
