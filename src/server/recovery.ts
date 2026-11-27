import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The gate on choosing a new password without the old one. Two things must both hold:
 *
 *  1. a SEAL the product's confirm route made when it redeemed the reset link: a signature over that session, kept in an
 *     httpOnly cookie. A hand made cookie, or another session, fails.
 *  2. the session itself was made from an emailed link in the last ten minutes, by the access token's own `amr` claim.
 *     Supabase Auth records a redeemed reset `token_hash` as `otp` (the code flow records `recovery`), so `amr` alone
 *     cannot tell a reset from an emailed sign in code: that is what the seal is for.
 *
 * Strictly the seal says "this route redeemed an emailed token into this session": Supabase Auth keeps reset and magic
 * link hashes alike, so whoever holds the mailbox could use either, which a reset already allows.
 *
 * Server only. `claims` come from `supabase.auth.getClaims()`; `secret` is a server secret of at least the product's own.
 */
export const RECOVERY_WINDOW_S = 600;
/** The auth server's clock may run a little ahead of ours. */
export const CLOCK_SKEW_S = 30;

export type RecoveryClaims = { sub?: unknown; session_id?: unknown; amr?: unknown } | null | undefined;

const subject = (c: RecoveryClaims) =>
  c && typeof c.sub === "string" && c.sub && typeof c.session_id === "string" && c.session_id ? `${c.sub}.${c.session_id}` : null;

const sign = (who: string, expires: number, secret: string) =>
  createHmac("sha256", secret).update(`bf-recovery.${who}.${expires}`).digest("base64url");

/** The cookie value for the session a reset link has just made, or null when it cannot be made. */
export function sealRecovery(claims: RecoveryClaims, secret: string, nowSeconds: number): string | null {
  const who = subject(claims);
  if (!who || !secret) return null;
  const expires = nowSeconds + RECOVERY_WINDOW_S;
  return `${expires}.${sign(who, expires, secret)}`;
}

function fromRecentLink(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((e) => {
    if (!e || typeof e !== "object") return false;
    const { method, timestamp } = e as { method?: unknown; timestamp?: unknown };
    return (
      (method === "otp" || method === "recovery") &&
      typeof timestamp === "number" &&
      timestamp <= nowSeconds + CLOCK_SKEW_S &&
      nowSeconds - timestamp <= RECOVERY_WINDOW_S
    );
  });
}

export function provesRecovery(seal: unknown, claims: RecoveryClaims, secret: string, nowSeconds: number): boolean {
  const who = subject(claims);
  if (typeof seal !== "string" || !who || !secret) return false;
  const [expiresText, signature, extra] = seal.split(".");
  const expires = Number(expiresText);
  if (!signature || extra !== undefined || !Number.isInteger(expires) || expires < nowSeconds) return false;
  const want = Buffer.from(sign(who, expires, secret));
  const got = Buffer.from(signature);
  return want.length === got.length && timingSafeEqual(want, got) && fromRecentLink(claims!.amr, nowSeconds);
}
