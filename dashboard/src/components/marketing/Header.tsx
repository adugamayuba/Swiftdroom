"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled ? "border-b border-white/10 bg-slate-950/80 backdrop-blur-xl" : "bg-transparent"
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          Swift<span className="text-indigo-400">droom</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {[["#features", "Features"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-white/60 transition hover:text-white">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-medium text-white/70 transition hover:text-white">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Get started free
          </Link>
        </div>

        <button className="md:hidden text-white/70" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-slate-950/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-6 py-4">
            {[["#features", "Features"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                className="py-2 text-sm text-white/60 hover:text-white">
                {label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              <Link href="/login" className="py-2 text-sm text-white/70">Log in</Link>
              <Link href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
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
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
        <div>
          <p className="text-sm font-bold text-white">
            Swift<span className="text-indigo-400">droom</span>
          </p>
          <p className="mt-1 text-xs text-white/30">Job applications, without the repetition.</p>
        </div>
        <div className="flex gap-6 text-sm text-white/40">
          <Link href="/login" className="hover:text-white transition">Log in</Link>
          <Link href="/register" className="hover:text-white transition">Sign up</Link>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
        </div>
      </div>
    </footer>
  );
}
