"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/AdminShell";

/** Password admin at /admin/s uses its own shell — not the user ADMIN_EMAIL gate. */
export default function AdminLayoutGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin/s")) {
    return <>{children}</>;
  }
  return <AdminShell>{children}</AdminShell>;
}
