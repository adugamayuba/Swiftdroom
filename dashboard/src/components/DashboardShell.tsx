"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, User, Users, Briefcase, Settings, LogOut } from "lucide-react";
import { apiFetch, clearSessionToken } from "@/lib/api-client";

const NAV = [
  { href: "/dashboard",                label: "Overview",      icon: LayoutDashboard },
  { href: "/dashboard/profile",        label: "Profile",       icon: User },
  { href: "/dashboard/personas",       label: "Personas",      icon: Users },
  { href: "/dashboard/applications",   label: "Applications",  icon: Briefcase },
  { href: "/dashboard/settings",       label: "Settings",      icon: Settings },
];

interface Me {
  email: string; name: string | null; plan: string;
  role: string; onboardingComplete: boolean; hasActiveSubscription: boolean;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    apiFetch("/api/me").then(async (r) => {
      if (!r.ok) { router.replace("/login"); return; }
      const data: Me = await r.json();
      if (!data.onboardingComplete) { router.replace("/onboarding"); return; }
      if (!data.hasActiveSubscription) { router.replace("/subscribe"); return; }
      setUser(data);
    });
  }, [router]);

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearSessionToken();
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  const planLabel = user.plan !== "NONE"
    ? user.plan.charAt(0) + user.plan.slice(1).toLowerCase()
    : "Free";

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-14 items-center border-b border-neutral-100 px-5">
          <Link href="/dashboard" className="text-base font-extrabold tracking-tight text-neutral-950">
            Swiftdroom
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-neutral-100 text-neutral-950"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="border-t border-neutral-100 p-3 space-y-1">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-neutral-900">{user.name || user.email}</p>
            <p className="text-xs text-neutral-400">{planLabel} plan</p>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}
