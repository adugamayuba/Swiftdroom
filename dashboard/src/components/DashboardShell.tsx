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
} from "lucide-react";
import { clsx } from "clsx";
import { apiFetch, clearSessionToken } from "@/lib/api-client";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/personas", label: "Personas", icon: Users },
  { href: "/dashboard/applications", label: "Applications", icon: Briefcase },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface MeResponse {
  email: string;
  plan: string;
  role: string;
  onboardingComplete: boolean;
  hasActiveSubscription: boolean;
  name?: string | null;
  usage?: { used: number; limit: number };
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
  const [user, setUser] = useState<MeResponse | null>(null);
  const [checking, setChecking] = useState(true);

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
        setUser(data);
        setChecking(false);
      });
  }, [router]);

  async function handleSignOut() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearSessionToken();
    router.push("/login");
  }

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

  return (
    <div className="flex min-h-screen bg-[color-mix(in_srgb,var(--brand-mint)_20%,white)]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[var(--brand-header)] text-white">
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
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-64 min-h-screen flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
