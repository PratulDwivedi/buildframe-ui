"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * One button shape, four intents, four sizes (InsightUno's `btn btn-primary btn-sm`, as utilities so it
 * does not depend on an app's CSS). Give `href` for a link that looks like a button.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon" | "icon-sm";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors " +
  "disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bf-brand-strong [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-bf-brand text-bf-on-brand hover:bg-bf-brand-hover shadow-sm",
  secondary: "border border-bf-line-strong bg-bf-surface text-bf-ink hover:bg-bf-surface-alt",
  ghost: "text-bf-copy hover:bg-bf-surface-alt hover:text-bf-ink",
  danger: "bg-bf-danger text-white hover:bg-bf-danger-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-3 text-[13px]",
  md: "h-10 rounded-[0.625rem] px-4 text-sm",
  icon: "size-10 rounded-[0.625rem]",
  "icon-sm": "size-8 rounded-lg [&_svg]:size-[15px]",
};

export function buttonClass({ variant = "secondary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; pending?: boolean; className?: string; children?: React.ReactNode };

export function Button({
  variant,
  size,
  pending,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Common & React.ComponentProps<"button">) {
  return (
    <button type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={buttonClass({ variant, size, className })} {...rest}>
      {pending ? <Loader2Icon className="animate-spin" /> : null}
      {pending && (size === "icon" || size === "icon-sm") ? null : children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  href,
  ...rest
}: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}

/**
 * An icon-only button. The label is the accessible name and the hover title, so an icon is never unlabelled.
 */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "icon-sm",
  href,
  pending,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  variant?: ButtonVariant;
  size?: "icon" | "icon-sm";
  href?: string;
  pending?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  if (href && !rest.disabled) {
    return (
      <ButtonLink href={href} variant={variant} size={size} aria-label={label} title={label} className={rest.className}>
        {icon}
      </ButtonLink>
    );
  }
  return (
    <Button variant={variant} size={size} pending={pending} aria-label={label} title={label} {...rest}>
      {icon}
    </Button>
  );
}
