import Link from "next/link";
import { clsx } from "clsx";

/** AngelList-inspired marketing primitives */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--al-muted)]">
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={clsx(
        "font-serif text-3xl font-normal tracking-tight text-[var(--al-black)] md:text-4xl lg:text-[2.75rem]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function BtnPrimary({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center rounded-sm bg-[var(--al-black)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--al-black-soft)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function BtnSecondary({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center rounded-sm border border-[var(--al-border)] bg-white px-6 py-3 text-sm font-medium text-[var(--al-black)] transition hover:border-[var(--al-black)]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
