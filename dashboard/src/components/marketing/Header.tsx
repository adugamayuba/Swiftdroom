import Link from "next/link";
import { BtnPrimary } from "@/components/marketing/marketing-ui";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--al-border)] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-[var(--al-black)]"
        >
          Swiftdroom
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
          >
            Features
          </Link>
          <Link
            href="#testimonials"
            className="text-sm text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
          >
            Testimonials
          </Link>
          <Link
            href="/blog"
            className="text-sm text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
          >
            Blog
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="text-sm text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
          >
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--al-black)] hover:underline"
          >
            Sign in
          </Link>
          <BtnPrimary href="/register" className="!px-4 !py-2">
            Get started
          </BtnPrimary>
        </div>
      </div>
    </header>
  );
}
