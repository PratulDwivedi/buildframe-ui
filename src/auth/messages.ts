/**
 * Auth helpers with no React: safe to use in pages, server actions and route handlers (exported from core).
 */

/**
 * Where to go after sign-in, only if it is a path inside `prefix` on this site. Anything else (another host,
 * "//evil.example", "/\\evil", a path outside the console) falls back, so ?next= cannot send anyone off-site.
 */
export function safeNext(next: string | null | undefined, prefix: string, fallback: string): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next !== prefix && !next.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`) && !next.startsWith(`${prefix}?`)) return fallback;
  return next;
}

/**
 * The only messages a sign-in page shows from its `?e=` parameter. Routes redirect with a CODE; the page looks it
 * up here. Free text in the URL is never shown, so a crafted link cannot put words on a sign-in page.
 * From buildframe-karaar lib/login-errors.ts (tested there).
 */
export const AUTH_MESSAGES = {
  link_incomplete: "That link is incomplete. Ask for a new one.",
  link_expired: "That link has expired or was already used. Ask for a new one.",
  google_unavailable: "Google sign-in is not available yet.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  signin_incomplete: "That sign-in link is incomplete. Please try again.",
  signin_slow: "That sign-in took too long. Please try again.",
  no_access: "That account has no access here. Sign in with an account that does.",
  confirmed: "Email confirmed. Sign in to continue.",
  password_set: "Password saved. Sign in with it.",
} as const;

export type AuthMessageCode = keyof typeof AUTH_MESSAGES;

export function authMessage(code: string | null | undefined): string | null {
  return code && Object.prototype.hasOwnProperty.call(AUTH_MESSAGES, code) ? AUTH_MESSAGES[code as AuthMessageCode] : null;
}

/**
 * A provider's sign-in error in plain words. The raw text is not shown: it can say whether an address has an
 * account, and it reads like a stack trace.
 */
export function signInErrorText(raw: string | null | undefined): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts. Wait a minute, then try again.";
  if (m.includes("not confirmed") || m.includes("email_not_confirmed")) return "Confirm your email first: open the link we sent, then sign in.";
  if (m.includes("expired") || m.includes("invalid otp") || m.includes("token")) return "That code is wrong or has expired. Ask for a new one.";
  return "That email and password do not match.";
}
