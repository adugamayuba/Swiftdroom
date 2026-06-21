"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  User,
  Users,
  Briefcase,
  Settings,
  LogOut,
  LayoutDashboard,
  Gift,
  Compass,
  Send,
  Inbox,
  MoreHorizontal,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { apiFetch, setSessionToken } from "@/lib/api-client";
import { persistApiToken } from "@/lib/extension-client";
import { useSignOut } from "@/lib/auth-session";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/jobs", label: "Jobs", icon: Compass },
  { href: "/dashboard/auto-apply", label: "Auto Apply", icon: Send },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/personas", label: "Personas", icon: Users },
  { href: "/dashboard/applications", label: "Applications", icon: Briefcase },
  { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

// Items always visible in the mobile bottom tab bar
const MOBILE_TABS = ["/dashboard", "/dashboard/jobs", "/dashboard/auto-apply", "/dashboard/applications"];

interface MeResponse {
  email: string;
  plan: string;
  role: string;
  onboardingComplete: boolean;
  hasActiveSubscription: boolean;
  name?: string | null;
  usage?: { used: number; limit: number };
  sessionToken?: string;
  apiToken?: string;
}

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const handleSignOut = useSignOut();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    apiFetch("/api/me")
      .then(async (r) => {
        if (!r.ok) {
          router.replace("/login");
          return null;
        }
        return r.json() as Promise<MeResponse>;
      })
      .then((data) => {
        if (!data) return;
        if (!data.onboardingComplete) {
          router.replace("/onboarding");
          return;
        }
        if (!data.hasActiveSubscription) {
          router.replace("/subscribe");
          return;
        }
        if (data.sessionToken) setSessionToken(data.sessionToken);
        if (data.apiToken) persistApiToken(data.apiToken);
        setUser(data);
        setChecking(false);
      });
  }, [router]);

  // Close "more" drawer on nav change
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color-mix(in_srgb,var(--brand-mint)_25%,white)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-lavender)] border-t-[var(--brand-header)]" />
      </div>
    );
  }

  const usage = user.usage;
  const usagePct =
    usage && usage.limit > 0
      ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
      : 0;

  const mobilePrimaryItems = navItems.filter((n) => MOBILE_TABS.includes(n.href));
  const moreItems = navItems.filter((n) => !MOBILE_TABS.includes(n.href));

  return (
    <div className="flex min-h-screen bg-[color-mix(in_srgb,var(--brand-mint)_20%,white)]">

      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[var(--brand-header)] text-white lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Swiftdroom
          </Link>
        </div>

        {usage && usage.limit > 0 && (
          <div className="mx-4 mt-4 rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Applications</span>
              <span className="font-medium text-[var(--brand-lavender)]">
                {usage.used}/{usage.limit}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--brand-lavender)] transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = navActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-[var(--brand-lavender)] text-[var(--brand-header)]"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                pathname.startsWith("/admin")
                  ? "bg-[var(--brand-lavender)] text-[var(--brand-header)]"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate px-1 text-xs text-white/45">{user.email}</p>
          <p className="mt-0.5 truncate px-1 text-xs capitalize text-[var(--brand-lavender)]">
            {user.plan.toLowerCase()} plan
          </p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[var(--brand-header)]/10 bg-[var(--brand-header)] px-4 text-white lg:hidden">
        <Link href="/dashboard" className="text-base font-semibold">
          Swiftdroom
        </Link>
        {usage && usage.limit > 0 && (
          <span className="text-xs text-white/55">
            {usage.used}/{usage.limit} apps
          </span>
        )}
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="min-h-screen w-full flex-1 pb-20 pt-14 lg:ml-64 lg:pb-0 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-stretch border-t border-[var(--brand-header)]/10 bg-white shadow-lg lg:hidden">
        {mobilePrimaryItems.map(({ href, label, icon: Icon, exact }) => {
          const active = navActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition",
                active
                  ? "text-[var(--brand-header)]"
                  : "text-[var(--brand-header)]/40 hover:text-[var(--brand-header)]/70"
              )}
            >
              <Icon className={clsx("h-5 w-5", active && "text-[var(--brand-header)]")} />
              {label}
            </Link>
          );
        })}

        {/* More button */}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={clsx(
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition",
            moreOpen
              ? "text-[var(--brand-header)]"
              : "text-[var(--brand-header)]/40 hover:text-[var(--brand-header)]/70"
          )}
        >
          {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          More
        </button>
      </nav>

      {/* ── Mobile "More" drawer ─────────────────────────────────────── */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-16 mx-2 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-header)]/40">
                {user.email}
              </p>
              <p className="mt-0.5 text-xs capitalize text-[var(--brand-lavender)]">
                {user.plan.toLowerCase()} plan
              </p>
            </div>
            <ul className="p-2">
              {moreItems.map(({ href, label, icon: Icon, exact }) => {
                const active = navActive(pathname, href, exact);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                        active
                          ? "bg-[var(--brand-mint)] text-[var(--brand-header)]"
                          : "text-[var(--brand-header)]/65 hover:bg-[var(--brand-mint)]/50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
              {user.role === "ADMIN" && (
                <li>
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--brand-header)]/65 hover:bg-[var(--brand-mint)]/50"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    Admin
                  </Link>
                </li>
              )}
            </ul>
            <div className="border-t border-[var(--border)] p-2">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
