"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Users,
  Briefcase,
  Settings,
  LogOut,
} from "lucide-react";
import { apiFetch, clearSessionToken } from "@/lib/api-client";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Briefcase },
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
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-neutral-200 bg-white">
        <div className="flex h-16 items-center border-b border-neutral-200 px-6">
          <span className="text-lg font-semibold text-neutral-900">
            Swiftdroom
          </span>
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 p-4">
          <p className="truncate px-3 text-xs text-neutral-400">{user.email}</p>
          <p className="truncate px-3 text-xs capitalize text-neutral-400">
            {user.plan.toLowerCase()} plan
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
