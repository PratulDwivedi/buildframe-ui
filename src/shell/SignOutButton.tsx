"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonSize, type ButtonVariant } from "../primitives/Button";
import { FormError } from "../primitives/Field";

/** Supabase reports a failed sign-out by resolving `{ error }`, not by throwing; both count as a failure here. */
function failed(result: unknown): boolean {
  return typeof result === "object" && result !== null && "error" in result && Boolean((result as { error: unknown }).error);
}

/**
 * Signs the person out, then sends them to `to`.
 *
 * Why it exists: on a "not authorised" screen a plain link to the login page is a trap. The app's proxy bounces anyone
 * with a valid session away from the login page, straight back to the screen they were on. Someone signed in to a
 * different Buildframe product (easy on localhost, where one session cookie is sent to every port) can only get out by
 * clearing cookies by hand. Signing out first is the only thing that works. `to` can also be the same invitation link,
 * now signed out.
 *
 * Nothing is navigated if signing out fails (it throws, or resolves `{ error }`): the person sees a message and can try
 * again. Without that the proxy would send them straight back, which is the trap again.
 *
 * Passing `signOut`: this is a client component, so `signOut` is a function prop and cannot be handed over from a server
 * component. Each app keeps a tiny client wrapper that supplies it, for example
 *   'use client'; export default function SignOut(p) { return <SignOutButton signOut={() => createClient().auth.signOut()} {...p} /> }
 * and uses that wrapper from its pages. `fullReload` does a full page load instead of a client navigation, for an app that
 * must drop every cached server payload.
 */
export function SignOutButton({
  signOut,
  to,
  label = "Sign out",
  busyLabel = "Signing out…",
  variant = "primary",
  size,
  className,
  children,
  fullReload = false,
  onError,
}: {
  signOut: () => Promise<unknown>;
  to: string;
  label?: string;
  busyLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Shown instead of `label` when given. */
  children?: ReactNode;
  fullReload?: boolean;
  onError?: (error: unknown) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const result = await signOut();
      if (failed(result)) throw (result as { error: unknown }).error;
    } catch (e) {
      setBusy(false);
      setProblem("Could not sign out. Check your connection and try again.");
      onError?.(e);
      return;
    }
    if (fullReload) {
      window.location.assign(to);
      return;
    }
    router.push(to);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      <Button type="button" variant={variant} size={size} className={className} onClick={run} disabled={busy}>
        {busy ? busyLabel : (children ?? label)}
      </Button>
      <FormError message={problem} />
    </span>
  );
}
