import { cn } from "../lib/cn";
import { StaffExitButton } from "./StaffExitButton";

/** What the platform's staff-session function returns (read or edit, why, until when, whose data). */
export interface StaffBannerSession {
  mode: "read" | "edit";
  reason?: string | null;
  expires_at: string;
  tenant_name: string;
}

export interface StaffBannerLink {
  code: string;
  name: string;
  url: string;
}

/**
 * Only https addresses, same-site paths and local development addresses (http on localhost or 127.0.0.1, exactly that host)
 * are linked; anything else (javascript:, data:, other plain http, "//host", a look-alike host) is dropped.
 */
const safeUrl = (url: string) =>
  url.startsWith("https://") ||
  (url.startsWith("/") && !url.startsWith("//")) ||
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?(\/|$)/.test(url);

/**
 * The bar shown on every console page while platform staff are inside a customer's organisation, so it is never a
 * surprise whose data the next action touches. Read-only and editing sessions look different and say so in words.
 *
 * The app passes: the session; `exitAction`, a server action that ends the session (used as the form action);
 * `formatTime`, **required**, because this renders on the server and a default would show the server's time zone (use the
 * tenant's own format or a fixed zone); and, only on the platform console, `links` to the other product consoles.
 * Server-component safe: it holds no state (the Exit button is a small client component).
 */
export function StaffBanner({
  session,
  exitAction,
  formatTime,
  links,
}: {
  session: StaffBannerSession;
  exitAction: (formData: FormData) => void | Promise<void>;
  formatTime: (iso: string) => string;
  links?: StaffBannerLink[];
}) {
  const edit = session.mode === "edit";
  const until = Number.isNaN(Date.parse(session.expires_at)) ? null : formatTime(session.expires_at);
  const shown = (links ?? []).filter((l) => safeUrl(l.url));
  return (
    <div
      role="region"
      aria-label="Staff view"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-bf-line px-4 py-2 text-[13px] sm:px-7",
        edit ? "bg-bf-warn-bg text-bf-warn-ink" : "bg-bf-brand-bg text-bf-ink",
      )}
    >
      <span>
        <span className="font-semibold">Staff view: {session.tenant_name}</span>
        {" · "}
        {edit ? "you can change things" : "read-only"}
        {until ? ` · until ${until}` : null}
        {session.reason ? <span>{" · "}{session.reason}</span> : null}
      </span>
      {shown.length > 0 ? (
        <span className="flex flex-wrap gap-2">
          {shown.map((l) => (
            <a key={l.code} href={l.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {l.name}
            </a>
          ))}
        </span>
      ) : null}
      <form action={exitAction} className="ml-auto">
        <StaffExitButton />
      </form>
    </div>
  );
}
