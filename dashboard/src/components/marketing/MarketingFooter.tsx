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
    { label: "Sign in", href: "/login" },
    { label: "Get started", href: "/register" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--al-border)] bg-[var(--al-surface)]">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--al-muted)]">
                {heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-[var(--al-muted)] transition hover:text-[var(--al-black)]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 px-2">
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
              stroke="#d4d4d0"
              strokeWidth="2"
              style={{
                fontSize: "110px",
                fontFamily: "var(--font-instrument-serif), Georgia, serif",
                letterSpacing: "-0.02em",
              }}
            >
              Swiftdroom
            </text>
          </svg>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[var(--al-border)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--al-muted)]">
            &copy; {new Date().getFullYear()} Swiftdroom. All rights reserved.
          </p>
          <p className="text-xs text-[var(--al-muted)]">
            Job applications, without the repetition.
          </p>
        </div>
      </div>
    </footer>
  );
}
