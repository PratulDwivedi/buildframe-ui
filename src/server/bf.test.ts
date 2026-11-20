// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBf } from "./bf";

const env = { url: "https://proj.supabase.co", secretKey: "sb_secret_x" };
const reply = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ status, json: async () => body });
afterEach(() => vi.unstubAllGlobals());

describe("createBf", () => {
  it("posts to bf-signup with the secret key on apikey and the product name added", async () => {
    const fetchMock = reply({ ok: true, tenant_code: "T1" });
    vi.stubGlobal("fetch", fetchMock);
    const out = await createBf("qevli", env).call({ mode: "x" });
    expect(out).toEqual({ ok: true, tenant_code: "T1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://proj.supabase.co/functions/v1/bf-signup");
    expect(init.headers.apikey).toBe("sb_secret_x");
    expect(JSON.parse(init.body)).toEqual({ mode: "x", product: "qevli" });
  });

  it("the product cannot be overridden by the caller's body", async () => {
    const fetchMock = reply({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await createBf("qevli", env).call({ product: "karaar" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).product).toBe("qevli");
  });

  it("refuses to run when the url or the key is missing or empty (a Vercel sensitive variable can be empty)", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect(await createBf("qevli", { url: "", secretKey: "k" }).call({})).toMatchObject({ ok: false });
    expect(await createBf("qevli", { url: "u", secretKey: "" }).call({})).toMatchObject({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("turns a network failure and a non-JSON answer into ok:false, never a throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    expect(await createBf("qevli", env).call({})).toMatchObject({ ok: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 502, json: async () => { throw new Error("html"); } }));
    expect(await createBf("qevli", env).call({})).toMatchObject({ ok: false, status: 502 });
  });

  it("passes the platform's own error and status through", async () => {
    vi.stubGlobal("fetch", reply({ ok: false, error: "Email already used" }, 409));
    expect(await createBf("qevli", env).call({})).toEqual({ ok: false, error: "Email already used", status: 409 });
  });

  it("signUpOrganisation sends mode new_tenant and maps the answer", async () => {
    const fetchMock = reply({ ok: true, tenant_code: "ACME", company_name: "Acme", mail_sent: true, mail_error: null });
    vi.stubGlobal("fetch", fetchMock);
    const out = await createBf("qevli", env).signUpOrganisation({ companyName: "Acme", fullName: "Riya Kapoor", email: "hello+riya@buildframe.tech", password: "pw12345678", redirectTo: "https://q/app/auth/confirm" });
    expect(out).toEqual({ ok: true, tenantCode: "ACME", companyName: "Acme", mailSent: true, mailError: null });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ mode: "new_tenant", company_name: "Acme", full_name: "Riya Kapoor", redirect_to: "https://q/app/auth/confirm", data: {} });
  });

  it("requestPasswordReset sends the mode and reduces the answer to ok or an error", async () => {
    const fetchMock = reply({ ok: true, extra: 1 });
    vi.stubGlobal("fetch", fetchMock);
    expect(await createBf("qevli", env).requestPasswordReset("a@b.c", "https://q/app/reset-password")).toEqual({ ok: true });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ mode: "request_password_reset", email: "a@b.c", redirect_to: "https://q/app/reset-password" });
  });

  it("hashes an invite token with sha256 hex", () => {
    expect(createBf("qevli", env).hashInviteToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
