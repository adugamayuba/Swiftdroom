import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Chrome Extension", href: "/register" },
    { label: "How it works", href: "#how-it-works" },
  ],
  Resources: [
    { label: "Blog", href: "#blog" },
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
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                {heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-neutral-600 transition hover:text-neutral-900"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 overflow-hidden">
          <p
            className="footer-outline-text select-none text-center font-extrabold uppercase leading-none tracking-tighter"
            aria-hidden
          >
            Swiftdroom
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-8 sm:flex-row">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Swiftdroom. All rights reserved.
          </p>
          <p className="text-xs text-neutral-400">
            Job applications, without the repetition.
          </p>
        </div>
      </div>
    </footer>
  );
}
