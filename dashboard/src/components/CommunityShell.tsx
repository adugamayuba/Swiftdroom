"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Building2,
  LogOut,
  Settings,
} from "lucide-react";
import { apiFetch, setSessionToken } from "@/lib/api-client";
import { useSignOut } from "@/lib/auth-session";

const navItems = [
  { href: "/community", label: "Referrals", icon: LayoutDashboard, exact: true },
  { href: "/community/settings", label: "Community profile", icon: Building2 },
  { href: "/community/account", label: "Account", icon: Settings },
];

interface MeResponse {
  email: string;
  role: string;
  name?: string | null;
  sessionToken?: string;
}

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function CommunityShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const handleSignOut = useSignOut();
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
        if (data.role !== "COMMUNITY_LEADER") {
          router.replace("/dashboard");
          return;
        }
        if (data.sessionToken) setSessionToken(data.sessionToken);
        setUser(data);
        setChecking(false);
      });
  }, [router]);

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color-mix(in_srgb,var(--brand-mint)_25%,white)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-lavender)] border-t-[var(--brand-header)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[color-mix(in_srgb,var(--brand-mint)_20%,white)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[var(--brand-header)] text-white lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href="/community" className="text-lg font-semibold tracking-tight">
            Community Hub
          </Link>
        </div>
        <p className="mx-4 mt-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
          Manage your community referrals and public profile.
        </p>
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
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate px-1 text-xs text-white/45">{user.email}</p>
          <p className="mt-0.5 truncate px-1 text-xs text-[var(--brand-lavender)]">
            Community leader
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

      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-[var(--brand-header)]/10 bg-[var(--brand-header)] px-4 text-white lg:hidden">
        <Link href="/community" className="text-base font-semibold">
          Community Hub
        </Link>
      </header>

      <main className="min-h-screen w-full flex-1 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
