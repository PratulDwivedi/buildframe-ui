import type { Tone } from "../primitives/Status";

/** A customer's own domain, as the platform's domain functions answer it. */
export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}
export type DomainStatus = "pending" | "active" | "failed" | "removed";

const STATUS: Record<DomainStatus, { label: string; tone: Tone }> = {
  pending: { label: "Waiting to be connected", tone: "warn" },
  active: { label: "Live", tone: "ok" },
  failed: { label: "Not connected", tone: "bad" },
  removed: { label: "Removed", tone: "off" },
};

/** The words and the pill tone for a domain's state, the same wherever it is shown. */
export const domainStatus = (status: DomainStatus) => STATUS[status];
