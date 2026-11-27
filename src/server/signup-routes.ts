import { createBf, bfEnvFromProcess, type BfEnv } from "./bf";

/**
 * The two public routes a product offers so that a marketing site, which holds no platform secret, can sign up a new
 * organisation: `POST /api/signup` and `POST /api/signup/resend`. The caller is anonymous by design, so the person check
 * (`verifyHuman`, for example Turnstile) runs before anything else.
 *
 * Server only. The product supplies its name, the return addresses it allows and where a new organisation's site lives.
 */
export type SignupRoutesOptions = {
  product: string;
  /** `redirect_to` must start with one of these. Give each a path ending in "/". The platform checks its own list too. */
  returnPrefixes: string[];
  verifyHuman: (token: string | null, headers: Headers) => Promise<{ ok: true } | { ok: false; reason: string }>;
  /** The address of a new organisation's own site, answered as `site_url`. */
  siteUrl: (tenantCode: string) => string;
  /** What the organisation is called in messages, for example "business". */
  organisationLabel: string;
  env?: BfEnv | (() => BfEnv);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });
/** The platform's refusals keep their status; no status at all means it was never reached. */
const refused = (out: { error: string; status?: number }) =>
  fail(out.status === undefined ? 502 : out.status >= 400 ? out.status : 400, out.error);

export function createSignupRoutes(options: SignupRoutesOptions) {
  const bf = createBf(options.product, options.env ?? bfEnvFromProcess);

  /** The parts both routes share: a JSON object body, the person check, an allowed return address. */
  async function open(req: Request): Promise<{ body: Record<string, unknown>; redirectTo: string } | Response> {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return fail(400, "Body must be JSON");
    const human = await options.verifyHuman(str(body.turnstile_token) || null, req.headers);
    if (!human.ok) return fail(400, human.reason);
    return { body, redirectTo: str(body.redirect_to) };
  }
  const allowed = (url: string) => options.returnPrefixes.some((p) => url.startsWith(p));

  async function signup(req: Request): Promise<Response> {
    const opened = await open(req);
    if (opened instanceof Response) return opened;
    const { body, redirectTo } = opened;
    const company = str(body.company_name);
    const fullName = str(body.full_name);
    const email = str(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (company.length < 2 || company.length > 120) {
      return fail(400, `Give your ${options.organisationLabel} a name (2 to 120 characters)`);
    }
    if (!fullName) return fail(400, "Tell us your name");
    if (!EMAIL_RE.test(email)) return fail(400, "That does not look like an email address");
    if (password.length < 8) return fail(400, "Choose a password of at least 8 characters");
    if (!allowed(redirectTo)) return fail(400, "That return address is not allowed");

    const out = await bf.call<{ tenant_code?: string; mail_sent?: boolean; mail_error?: string | null }>({
      mode: "new_tenant",
      company_name: company,
      full_name: fullName,
      email,
      password,
      phone: str(body.phone) || null,
      redirect_to: redirectTo,
    });
    if (!out.ok) return refused(out);
    if (!out.tenant_code) return fail(502, "The platform did not say what was created. Please contact us");

    // The organisation exists either way. A mail that did not go is otherwise invisible: log why, never answer it.
    if (out.mail_sent === false) console.error("[signup] confirmation mail not sent:", out.tenant_code, out.mail_error);

    return Response.json({
      ok: true,
      tenant_code: out.tenant_code,
      site_url: options.siteUrl(out.tenant_code),
      mail_sent: out.mail_sent !== false,
    });
  }

  /** "Resend the email". The platform answers the same for every address, so this does too. */
  async function resend(req: Request): Promise<Response> {
    const opened = await open(req);
    if (opened instanceof Response) return opened;
    const { body, redirectTo } = opened;
    const email = str(body.email).toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(400, "That does not look like an email address");
    if (!allowed(redirectTo)) return fail(400, "That return address is not allowed");
    const out = await bf.call({ mode: "resend_confirmation", email, redirect_to: redirectTo });
    return out.ok ? Response.json({ ok: true }) : refused(out);
  }

  return { signup, resend };
}
