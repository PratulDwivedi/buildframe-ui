/**
 * Did this session come from a password reset link, just now? Supabase records how a session was made in the access
 * token's `amr` claim; a reset link adds `{ method: "recovery", timestamp }`. This is the gate on choosing a new password
 * without the old one. A cookie may steer the page, but on its own it proves nothing: any signed-in session could send
 * it and change the shared login's password.
 */
export const RECOVERY_WINDOW_S = 600;
/** The auth server's clock may run a little ahead of ours. */
export const CLOCK_SKEW_S = 30;

export function cameFromRecentRecovery(amr: unknown, nowSeconds: number, windowSeconds = RECOVERY_WINDOW_S): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((e) => {
    if (!e || typeof e !== "object") return false;
    const { method, timestamp } = e as { method?: unknown; timestamp?: unknown };
    return method === "recovery" && typeof timestamp === "number" && timestamp <= nowSeconds + CLOCK_SKEW_S && nowSeconds - timestamp <= windowSeconds;
  });
}
