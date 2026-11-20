import { createHash } from "node:crypto";

/**
 * Calls to the platform's `bf-signup` edge function (buildframe-account/supabase/functions/bf-signup), which owns every
 * login, organisation and invitation mail. The caller proves it is a Buildframe server with the project's secret key,
 * sent on `apikey`. The secret key is used only here, where there is no user yet or the action is the platform's.
 *
 * Server only. `createBf("qevli")` binds the product name once; the body's own `product` can never override it.
 */
export type BfResult<T> = ({ ok: true } & T) | { ok: false; error: string; status?: number };

export type BfEnv = { url?: string; secretKey?: string };

export type SignupInput = { companyName: string; fullName: string; email: string; password: string; redirectTo: string };
export type SignupResult =
  | { ok: true; tenantCode: string; companyName: string; mailSent: boolean; mailError: string | null }
  | { ok: false; error: string };

/** Reads the usual environment names. `||`, not `??`: a Vercel Sensitive variable can exist and be EMPTY. */
export const bfEnvFromProcess = (): BfEnv => ({
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  secretKey: process.env.SUPABASE_SECRET_KEY || "",
});

export function createBf(product: string, env: BfEnv | (() => BfEnv) = bfEnvFromProcess) {
  async function call<T extends object>(body: Record<string, unknown>): Promise<BfResult<T>> {
    const { url: rawUrl, secretKey } = typeof env === "function" ? env() : env;
    const url = rawUrl?.replace(/\/+$/, "");
    if (!url || !secretKey) return { ok: false, error: "This server is not configured to reach the platform" };

    let res: Response;
    try {
      res = await fetch(`${url}/functions/v1/bf-signup`, {
        method: "POST",
        headers: { apikey: secretKey, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, product }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      return { ok: false, error: "Could not reach the platform. Try again in a minute." };
    }
    const out = (await res.json().catch(() => null)) as (BfResult<T> & { error?: string }) | null;
    if (!out) return { ok: false, error: `The platform did not answer (${res.status})`, status: res.status };
    if (!out.ok) return { ok: false, error: out.error ?? "Unknown error", status: res.status };
    return out;
  }

  /** Self-serve sign-up: mode `new_tenant`. The platform sends the confirmation mail (template `signup_confirm`). */
  async function signUpOrganisation(input: SignupInput): Promise<SignupResult> {
    const out = await call<{ tenant_code: string; company_name: string; mail_sent: boolean; mail_error: string | null }>({
      mode: "new_tenant",
      company_name: input.companyName,
      full_name: input.fullName,
      email: input.email,
      password: input.password,
      redirect_to: input.redirectTo,
      data: {},
    });
    if (!out.ok) return { ok: false, error: out.error };
    return { ok: true, tenantCode: out.tenant_code, companyName: out.company_name, mailSent: out.mail_sent, mailError: out.mail_error };
  }

  /** Mails a reset link (mode `request_password_reset`). The platform answers the same whether or not the address has an account. */
  async function requestPasswordReset(email: string, redirectTo: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const out = await call<Record<string, never>>({ mode: "request_password_reset", email, redirect_to: redirectTo });
    return out.ok ? { ok: true } : { ok: false, error: out.error };
  }

  const hashInviteToken = (token: string) => createHash("sha256").update(token).digest("hex");

  return { call, signUpOrganisation, requestPasswordReset, hashInviteToken };
}
