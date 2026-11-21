"use client";

import { useFormStatus } from "react-dom";

/** The Exit button of StaffBanner. Disables itself while the exit action runs, so a double click cannot run it twice. */
export function StaffExitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label="Exit staff view"
      disabled={pending}
      className="rounded-md px-2.5 py-1 text-[12px] font-semibold text-bf-copy transition-colors hover:bg-bf-surface-alt hover:text-bf-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bf-brand-strong disabled:opacity-55"
    >
      {pending ? "Exiting…" : "Exit"}
    </button>
  );
}
