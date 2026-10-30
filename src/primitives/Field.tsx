import * as React from "react";
import { cn } from "../lib/cn";

/** One input look, so an input on the login page and one on a product form cannot drift apart. */
export const inputClass =
  "h-10 w-full min-w-0 rounded-[0.625rem] border border-bf-line bg-bf-surface px-3 text-sm text-bf-ink " +
  "placeholder:text-bf-muted outline-none transition-colors focus:border-bf-brand focus:ring-3 focus:ring-bf-brand/15 " +
  "disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-bf-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(inputClass, "h-auto py-2 leading-relaxed", className)} {...rest} />;
});

export function Label({ className, required, children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-[13px] font-semibold text-bf-ink", className)} {...rest}>
      {children}
      {required && <span className="ml-0.5 text-bf-danger-ink">*</span>}
    </label>
  );
}

/** Label, control, then a hint line under it. */
export function Field({
  label,
  htmlFor,
  hint,
  required,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  required?: boolean;
  /** Shown in place of the hint. */
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-bf-danger-ink">{error}</p>
      ) : hint ? (
        <p className="text-xs text-bf-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("rounded-lg border border-bf-danger-line bg-bf-danger-bg px-3 py-2 text-sm text-bf-danger-ink", className)}>
      {message}
    </p>
  );
}

export function FormNotice({ message, className }: { message: string | null | undefined; className?: string }) {
  if (!message) return null;
  return (
    <p role="status" className={cn("rounded-lg border border-bf-line bg-bf-ok-bg px-3 py-2 text-sm text-bf-ok-ink", className)}>
      {message}
    </p>
  );
}

/** A real checkbox, sized and coloured to match. */
export const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { indeterminate?: boolean }>(
  function Checkbox({ className, indeterminate, ...rest }, ref) {
    const inner = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inner.current!);
    React.useEffect(() => {
      if (inner.current) inner.current.indeterminate = !!indeterminate;
    }, [indeterminate]);
    return (
      <input
        ref={inner}
        type="checkbox"
        className={cn("size-4 shrink-0 cursor-pointer rounded border-bf-line-strong accent-[var(--bf-brand)]", className)}
        {...rest}
      />
    );
  },
);
