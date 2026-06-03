import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--brand-header)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Swiftdroom
        </Link>
        <nav className="hidden items-center gap-1 rounded-full bg-[var(--brand-dark-elevated)] px-2 py-1.5 md:flex">
          <Link
            href="#features"
            className="rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#testimonials"
            className="rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Testimonials
          </Link>
          <Link
            href="/blog"
            className="rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Blog
          </Link>
          <Link
            href="#pricing"
            className="rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-white transition hover:text-white/80"
          >
            Log in
          </Link>
          <Link href="/register" className="al-btn-lavender !px-4 !py-2">
            Start free setup
          </Link>
        </div>
      </div>
    </header>
  );
}
