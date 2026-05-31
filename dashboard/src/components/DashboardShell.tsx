"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  User,
  Users,
  Briefcase,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { apiFetch, clearSessionToken } from "@/lib/api-client";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/personas", label: "Personas", icon: Users },
  { href: "/dashboard/applications", label: "Applications", icon: Briefcase },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface MeResponse {
  email: string;
  name: string | null;
  plan: string;
  role: string;
  onboardingComplete: boolean;
  hasActiveSubscription: boolean;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiFetch("/api/me")
      .then(async (r) => {
        if (!r.ok) { router.replace("/login"); return null; }
        return r.json() as Promise<MeResponse>;
      })
      .then((data) => {
        if (!data) return;
        if (!data.onboardingComplete) { router.replace("/onboarding"); return; }
        if (!data.hasActiveSubscription) { router.replace("/subscribe"); return; }
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const planLabel = user.plan !== "NONE" ? user.plan.charAt(0) + user.plan.slice(1).toLowerCase() : "Free";

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-white/10 bg-slate-900">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href="/dashboard" className="text-lg font-bold text-white">
            Swift<span className="text-indigo-400">droom</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-indigo-400" />}
              </Link>
            );
          })}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-400/70 transition hover:bg-amber-400/10 hover:text-amber-300"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-lg bg-white/5 px-3 py-2.5">
            <p className="truncate text-xs font-medium text-white">{user.name || user.email}</p>
            <p className="truncate text-xs text-white/30">{planLabel} plan</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 bg-slate-950 p-8">{children}</main>
    </div>
  );
}
