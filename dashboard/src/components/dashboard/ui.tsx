import { clsx } from "clsx";

export const inputClass = "app-input";
export const labelClass = "app-label";
export const textareaClass =
  "app-input mt-4 min-h-[12rem] font-mono resize-y";

export function DashboardPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--brand-header)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--brand-header)]/55">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function DashboardCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("app-card", className)}>{children}</div>
  );
}

export function DashboardSpinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-lavender)] border-t-[var(--brand-header)]" />
    </div>
  );
}

export function DashboardEmpty({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-dashed border-[var(--border)] bg-white/80 p-12 text-center text-sm text-[var(--brand-header)]/55",
        className,
      )}
    >
      {message}
    </div>
  );
}
