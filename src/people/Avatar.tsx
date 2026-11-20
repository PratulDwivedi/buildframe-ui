"use client";

import * as React from "react";
import { SparklesIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { categoryOf, categoryStyle } from "../lib/category";
import { initials, type AvatarUser } from "./initials";

/**
 * A person: their picture, or their initials on a colour picked from their name, so the same person is the same
 * colour everywhere. Merged from the shell's own avatar and vyapar_ping components/ui/avatar.
 *
 * `variant="ai"` is the assistant: the violet reserved for it and a mark instead of initials.
 * `colour="brand"` keeps the brand tint (the account menu). `decorative` hides it from screen readers when the
 * name is written beside it; otherwise it is an image named after the person.
 */
export type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<AvatarSize, string> = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-[11px]",
  lg: "size-10 text-sm",
};

export function Avatar({
  user,
  size = "md",
  variant = "person",
  colour = "category",
  decorative = false,
  className,
}: {
  user: AvatarUser;
  size?: AvatarSize;
  variant?: "person" | "ai";
  colour?: "category" | "brand";
  decorative?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = React.useState(false);
  const name = user.name?.trim() || user.email || "Unknown";
  const a11y = decorative ? ({ "aria-hidden": true } as const) : ({ role: "img", "aria-label": name } as const);
  const base = cn("grid shrink-0 select-none place-items-center overflow-hidden rounded-full font-semibold", SIZES[size], className);

  if (variant === "ai") {
    return (
      <span data-bf-avatar {...a11y} title={decorative ? undefined : name} className={cn(base, "bg-bf-ai-bg text-bf-ai-strong")}>
        <SparklesIcon className="size-[55%]" aria-hidden />
      </span>
    );
  }

  if (user.avatar && !broken) {
    return (
      <span data-bf-avatar {...a11y} title={decorative ? undefined : name} className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
      </span>
    );
  }

  return (
    <span
      data-bf-avatar
      {...a11y}
      title={decorative ? undefined : name}
      className={cn(base, colour === "brand" && "bg-bf-brand-bg text-bf-brand-strong")}
      style={colour === "category" ? categoryStyle(categoryOf(name)) : undefined}
    >
      {initials(user)}
    </span>
  );
}

/**
 * Several people, overlapping, with "+N" past `max`. The group is named with everyone in it, so nothing depends
 * on hovering; the "+N" also carries the hidden names as its title.
 */
export function AvatarStack({
  users,
  max = 4,
  size = "sm",
  className,
}: {
  users: (AvatarUser & { kind?: "person" | "assistant" })[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}) {
  if (users.length === 0) return null;
  const nameOf = (u: AvatarUser) => u.name?.trim() || u.email || "Unknown";
  const shown = users.slice(0, max);
  const hidden = users.slice(max);
  return (
    <span role="group" aria-label={users.map(nameOf).join(", ")} className={cn("inline-flex items-center", className)}>
      {shown.map((u, i) => (
        <Avatar
          key={`${nameOf(u)}-${i}`}
          user={u}
          size={size}
          variant={u.kind === "assistant" ? "ai" : "person"}
          decorative
          className={cn("ring-2 ring-bf-surface", i > 0 && "-ml-1.5")}
        />
      ))}
      {hidden.length > 0 && (
        <span
          title={hidden.map(nameOf).join(", ")}
          className={cn("-ml-1.5 grid shrink-0 place-items-center rounded-full bg-bf-neutral-bg font-semibold text-bf-neutral-ink ring-2 ring-bf-surface", SIZES[size])}
        >
          +{hidden.length}
        </span>
      )}
    </span>
  );
}
