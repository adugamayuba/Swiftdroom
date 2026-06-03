import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Chrome Extension", href: "/register" },
    { label: "How it works", href: "#how-it-works" },
  ],
  Resources: [
    { label: "Blog", href: "/blog" },
    { label: "FAQ", href: "#faq" },
    { label: "Testimonials", href: "#testimonials" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "mailto:hello@swiftdroom.com" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
  Account: [
    { label: "Log in", href: "/login" },
    { label: "Sign up", href: "/register" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-8">
        <div className="flex flex-col gap-10 border-b border-[var(--border)] pb-12 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/" className="text-2xl font-semibold text-[var(--brand-header)]">
              Swiftdroom
            </Link>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="al-btn-lavender">
                Start free setup
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-neutral-50 px-5 py-2.5 text-sm font-medium text-[var(--brand-header)] hover:border-[var(--brand-header)]/30"
              >
                Log in
              </Link>
            </div>
          </div>
          <div className="grid flex-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
              <div key={heading}>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-header)]/45">
                  {heading}
                </h3>
                <ul className="mt-4 space-y-3">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-[var(--brand-header)]/65 transition hover:text-[var(--brand-header)]"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 px-2">
          <svg
            viewBox="0 0 1000 140"
            className="mx-auto block h-auto w-full max-w-5xl select-none"
            aria-hidden
            role="img"
          >
            <text
              x="500"
              y="95"
              textAnchor="middle"
              fill="none"
              stroke="#e5e5e0"
              strokeWidth="2"
              style={{
                fontSize: "110px",
                fontWeight: 700,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                letterSpacing: "-0.03em",
              }}
            >
              Swiftdroom
            </text>
          </svg>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-[var(--brand-header)]/45">
            &copy; {new Date().getFullYear()} Swiftdroom. All rights reserved.
          </p>
          <p className="text-xs text-[var(--brand-header)]/45">
            Job applications, without the repetition.
          </p>
        </div>
      </div>
    </footer>
  );
}
