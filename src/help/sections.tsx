import * as React from "react";

// No "use client": a help text built from these can be written in a server component, so a list of steps is
// keyed here and never crosses to the client as an array of elements.

/** One titled part of a help panel. */
export function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[13px] font-semibold text-bf-ink">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/** Numbered steps. */
export function HelpSteps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  );
}
