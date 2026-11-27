// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignupRoutes, type SignupRoutesOptions } from "./signup-routes";

const env = { url: "https://proj.supabase.co", secretKey: "sb_secret_x" };
const reply = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ status, json: async () => body });
afterEach(() => vi.unstubAllGlobals());

const options = (over: Partial<SignupRoutesOptions> = {}): SignupRoutesOptions => ({
  product: "acme",
  env,
  returnPrefixes: ["https://www.example.com/products/acme/"],
  verifyHuman: vi.fn().mockResolvedValue({ ok: true }),
  siteUrl: (code) => `https://${code}.acme.example.com`,
  organisationLabel: "business",
  ...over,
});
const post = (body: unknown) =>
  new Request("https://app.example.com/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const good = {
  company_name: " Acme Realty ",
  full_name: "Asha",
  email: " Hello+Asha@Example.com ",
  password: "long enough",
  phone: "",
  redirect_to: "https://www.example.com/products/acme/signup/confirmed",
  turnstile_token: "tok",
};

describe("createSignupRoutes: signup", () => {
  it("checks the person first, then calls bf-signup and answers with the new address", async () => {
    const fetchMock = reply({ ok: true, tenant_code: "acme-realty", mail_sent: true });
    vi.stubGlobal("fetch", fetchMock);
    const opts = options();
    const res = await createSignupRoutes(opts).signup(post(good));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, tenant_code: "acme-realty", site_url: "https://acme-realty.acme.example.com", mail_sent: true });
    expect(opts.verifyHuman).toHaveBeenCalledWith("tok", expect.any(Headers));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      product: "acme", mode: "new_tenant", company_name: "Acme Realty", full_name: "Asha",
      email: "hello+asha@example.com", password: "long enough", phone: null, redirect_to: good.redirect_to,
    });
  });

  it("calls nothing when the person check fails, and says why", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await createSignupRoutes(options({ verifyHuman: async () => ({ ok: false, reason: "Complete the check" }) })).signup(post(good));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Complete the check" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [{ company_name: "A" }, "Give your business a name (2 to 120 characters)"],
    [{ full_name: " " }, "Tell us your name"],
    [{ email: "nope" }, "That does not look like an email address"],
    [{ password: "short" }, "Choose a password of at least 8 characters"],
    [{ redirect_to: "https://evil.example.net/" }, "That return address is not allowed"],
  ])("refuses %o without calling the platform", async (patch, error) => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await createSignupRoutes(options()).signup(post({ ...good, ...patch }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses a body that is not a JSON object", async () => {
    const routes = createSignupRoutes(options());
    expect((await routes.signup(post("not json"))).status).toBe(400);
    expect((await routes.signup(post("null"))).status).toBe(400);
  });

  it("passes the platform's refusal and status through", async () => {
    vi.stubGlobal("fetch", reply({ ok: false, error: "Signup is not open for Acme" }, 403));
    const res = await createSignupRoutes(options()).signup(post(good));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "Signup is not open for Acme" });
  });

  it("answers 502 when the platform cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect((await createSignupRoutes(options()).signup(post(good))).status).toBe(502);
  });

  it("logs a mail that did not go and keeps the reason out of the answer", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", reply({ ok: true, tenant_code: "acme", mail_sent: false, mail_error: "quota" }));
    const body = await (await createSignupRoutes(options()).signup(post(good))).json();
    expect(body.mail_sent).toBe(false);
    expect(JSON.stringify(body)).not.toContain("quota");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("createSignupRoutes: resend", () => {
  const ask = { email: "Hello+Asha@example.com", redirect_to: good.redirect_to, turnstile_token: "tok" };

  it("asks for a new confirmation mail and answers only ok", async () => {
    const fetchMock = reply({ ok: true, extra: "x" });
    vi.stubGlobal("fetch", fetchMock);
    const res = await createSignupRoutes(options()).resend(post(ask));
    expect(await res.json()).toEqual({ ok: true });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      product: "acme", mode: "resend_confirmation", email: "hello+asha@example.com", redirect_to: good.redirect_to,
    });
  });

  it("checks the person, the address and the return address", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const blocked = createSignupRoutes(options({ verifyHuman: async () => ({ ok: false, reason: "no" }) }));
    expect((await blocked.resend(post(ask))).status).toBe(400);
    const routes = createSignupRoutes(options());
    expect((await routes.resend(post({ ...ask, email: "x" }))).status).toBe(400);
    expect((await routes.resend(post({ ...ask, redirect_to: "https://evil.example.net/" }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
