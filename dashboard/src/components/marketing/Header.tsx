"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-base font-extrabold tracking-tight text-neutral-950">
          Swiftdroom
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {[["#how-it-works", "How it works"], ["#features", "Features"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-neutral-500 transition hover:text-neutral-900">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/login" className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Get started free
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-100 bg-white md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {[["#how-it-works", "How it works"], ["#features", "Features"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                className="py-2 text-sm text-neutral-600 hover:text-neutral-900">
                {label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3">
              <Link href="/login" className="py-2 text-sm text-neutral-600">Log in</Link>
              <Link href="/register"
                className="rounded-lg bg-neutral-950 px-4 py-2.5 text-center text-sm font-semibold text-white">
                Get started free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <p className="text-sm font-bold text-neutral-950">Swiftdroom</p>
        <div className="flex gap-6 text-sm text-neutral-400">
          <Link href="/login" className="hover:text-neutral-900 transition">Log in</Link>
          <Link href="/register" className="hover:text-neutral-900 transition">Sign up</Link>
          <a href="#pricing" className="hover:text-neutral-900 transition">Pricing</a>
        </div>
      </div>
    </footer>
  );
}
