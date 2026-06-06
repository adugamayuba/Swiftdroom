"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch, clearAdminToken, getAdminToken } from "@/lib/api-client";

export default function AdminSShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const isLoginPage = pathname === "/admin/s/login";

  useEffect(() => {
    let cancelled = false;

    if (isLoginPage) {
      setReady(true);
      return;
    }

    // Leaving login: reset so overview cannot flash before auth completes.
    setReady(false);

    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/s/login");
      return;
    }

    apiFetch("/api/admin/s/auth/me")
      .then(async (r) => {
        if (cancelled) return null;
        if (!r.ok) {
          clearAdminToken();
          router.replace("/admin/s/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (!data.configured) {
          clearAdminToken();
          router.replace("/admin/s/login?error=not_configured");
          return;
        }
        if (!data.authenticated) {
          clearAdminToken();
          router.replace("/admin/s/login");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearAdminToken();
        router.replace("/admin/s/login");
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, isLoginPage, router]);

  async function handleLogout() {
    await apiFetch("/api/admin/s/auth/logout", { method: "POST" });
    clearAdminToken();
    router.replace("/admin/s/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin/s" className="text-lg font-semibold text-neutral-900">
              Swiftdroom Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin/s" className="text-neutral-600 hover:text-neutral-900">
                Overview
              </Link>
              <Link
                href="/admin/s/referrals"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Referral payouts
              </Link>
              <Link
                href="/admin/s/users"
                className="text-neutral-600 hover:text-neutral-900"
              >
                Subscription recovery
              </Link>
            </nav>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
