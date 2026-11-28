"use client";

import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { IconButton } from "../primitives/Button";
import type { DnsRecord } from "./status";

const columns = "sm:grid sm:grid-cols-[4.5rem_minmax(0,3fr)_minmax(0,2fr)] sm:gap-4";

/**
 * The DNS records to create, the name and the value each with its own copy button beside it. Column headings on a wide
 * screen; on a phone each record stacks with its own labels.
 */
export function DnsRecords({ records }: { records: DnsRecord[] }) {
  const [copied, setCopied] = React.useState("");
  if (records.length === 0) return null;

  function copy(key: string, text: string) {
    // The tick only once the browser has taken it: a refusal leaves the button as it was.
    navigator.clipboard?.writeText(text).then(() => setCopied(key), () => setCopied(""));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-bf-line text-bf-ink">
      <div aria-hidden className={`hidden border-b border-bf-line bg-bf-surface-alt px-3 py-1.5 text-xs font-semibold text-bf-muted ${columns}`}>
        <span>Type</span>
        <span>Name</span>
        <span>Value</span>
      </div>
      <ul className="divide-y divide-bf-line">
        {records.map((r, i) => {
          const same = records.filter((o) => o.type === r.type);
          const which = `${r.type} record${same.length > 1 ? ` ${same.indexOf(r) + 1}` : ""}`;
          return (
            <li key={`${i} ${r.type} ${r.name}`} className={`space-y-1.5 px-3 py-2 text-xs sm:items-center sm:space-y-0 ${columns}`}>
              <span className="font-semibold">{r.type}</span>
              {(["name", "value"] as const).map((field) => {
                const key = `${field} ${r.type} ${r.name} ${r.value}`;
                const done = copied === key;
                return (
                  <span key={field} className="flex min-w-0 items-center gap-1">
                    <span aria-hidden className="w-11 shrink-0 text-bf-muted sm:hidden">{field === "name" ? "Name" : "Value"}</span>
                    <code className="min-w-0 break-all font-mono">{r[field]}</code>
                    <IconButton
                      icon={done ? <CheckIcon className="text-bf-ok-ink" /> : <CopyIcon />}
                      label={done ? "Copied" : `Copy ${field} of ${which}`}
                      onClick={() => copy(key, r[field])}
                    />
                  </span>
                );
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
