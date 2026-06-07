"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AuthNavLink } from "@/components/marketing/AuthNavLink";

const navLinks = [
  { href: "#demo", label: "Demo" },
  { href: "#features", label: "Features" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "/blog", label: "Blog" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[var(--brand-header)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Swiftdroom
        </Link>
        <nav className="hidden items-center gap-1 rounded-full bg-[var(--brand-dark-elevated)] px-2 py-1.5 lg:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:block">
            <AuthNavLink />
          </div>
          <Link href="/register" className="al-btn-lavender !px-3 !py-2 text-sm sm:!px-4">
            Start free setup
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-white lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-white/10 px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                {label}
              </Link>
            ))}
            <div className="mt-3 border-t border-white/10 pt-3 sm:hidden">
              <AuthNavLink />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
