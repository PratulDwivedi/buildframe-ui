import * as React from "react";
import Link from "next/link";
import { cn } from "../lib/cn";

/**
 * The signed-out page frame: the logo top left, one centred column for the form, and on a wide screen an
 * optional poster on the right. Ported from insightuno's sign-in and sign-up pages (form column + poster),
 * which tripsetu and genfashion share; with no poster it is insightuno's AuthCard.
 */
export function AuthShell({
  logo,
  logoHref = "/",
  eyebrow,
  title,
  intro,
  poster,
  footer,
  children,
}: {
  /** The product or store mark and name. */
  logo: React.ReactNode;
  logoHref?: string;
  /** A small line above the title (the store's name on a back office sign-in). */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  intro?: React.ReactNode;
  /** The right-hand panel from lg up: a line or two about the product. */
  poster?: React.ReactNode;
  /** Under the form: "New here? Create an account", "Back to sign in". */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bf-canvas text-bf-copy">
      <div className="flex flex-1 flex-col px-6 py-8">
        <Link href={logoHref} className="flex items-center gap-2.5 self-start text-bf-ink">
          {logo}
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">
            {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-bf-brand-strong">{eyebrow}</p>}
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-bf-ink">{title}</h1>
            {intro && <p className="mt-2 text-sm text-bf-muted">{intro}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-bf-muted">{footer}</div>}
          </div>
        </div>
      </div>
      {poster && (
        <div className={cn("hidden w-[46%] flex-col justify-center border-l border-bf-line bg-bf-surface p-12 lg:flex")}>{poster}</div>
      )}
    </div>
  );
}

/** A link styled for the auth footers. */
export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-bf-brand-strong underline underline-offset-4">
      {children}
    </Link>
  );
}

/** How an app starts Google sign-in: a link to its own route, or a server action posted with `next`. */
export type GoogleStart = { href: string } | { action: (form: FormData) => void | Promise<void>; next?: string };

const googleClass =
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-[0.625rem] border border-bf-line-strong bg-bf-surface text-sm font-semibold text-bf-ink transition-colors hover:bg-bf-surface-alt";

/** "Continue with Google", then an "or" rule. */
export function GoogleButton({ start, href, label = "Continue with Google" }: { start?: GoogleStart; href?: string; label?: string }) {
  const how: GoogleStart | null = start ?? (href ? { href } : null);
  if (!how) return null;
  const inner = (
    <>
      <GoogleMark />
      {label}
    </>
  );
  return (
    <>
      {"href" in how ? (
        <a href={how.href} className={googleClass}>
          {inner}
        </a>
      ) : (
        <form action={how.action}>
          {how.next && <input type="hidden" name="next" value={how.next} />}
          <button type="submit" className={googleClass}>
            {inner}
          </button>
        </form>
      )}
      <div className="my-5 flex items-center gap-3 text-xs text-bf-muted" role="separator">
        <span className="h-px flex-1 bg-bf-line" />
        or
        <span className="h-px flex-1 bg-bf-line" />
      </div>
    </>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.29v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.29a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.6l4 3.1C6.23 6.87 8.88 4.76 12 4.76Z" />
        </svg>
  );
}

/**
 * After sign-up: the account exists, so this must not look like a failed form or invite a second try (a retry
 * hits "already has an account" and reads as broken). From tripsetu / insightuno.
 */
export function CheckEmail({ email, what, warning, signInHref }: { email: string; what?: string; warning?: string | null; signInHref: string }) {
  return (
    <div className="rounded-2xl border border-bf-line bg-bf-surface p-7 text-center">
      <h2 className="text-lg font-bold text-bf-ink">Check your email</h2>
      <p className="mt-2 text-sm text-bf-copy">
        {what && (
          <>
            <span className="font-semibold text-bf-ink">{what}</span> is set up.{" "}
          </>
        )}
        We have sent a confirmation link to <span className="font-semibold text-bf-ink">{email}</span>. Open it, then sign in.
      </p>
      {warning && <p className="mt-4 rounded-lg bg-bf-warn-bg px-3 py-2 text-sm font-semibold text-bf-warn-ink">{warning}</p>}
      <div className="mt-6">
        <AuthLink href={signInHref}>Go to sign in</AuthLink>
      </div>
    </div>
  );
}
