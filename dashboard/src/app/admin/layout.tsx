import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, clearSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold text-neutral-900">
              Swiftdroom Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
                Overview
              </Link>
              <Link href="/admin/users" className="text-neutral-600 hover:text-neutral-900">
                Users
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
              User dashboard
            </Link>
            <form
              action={async () => {
                "use server";
                await clearSession();
                redirect("/login");
              }}
            >
              <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
