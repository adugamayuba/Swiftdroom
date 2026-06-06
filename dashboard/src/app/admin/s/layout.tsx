import type { Metadata } from "next";
import AdminSShell from "@/components/AdminSShell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin",
  noIndex: true,
});

export default function AdminSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminSShell>{children}</AdminSShell>;
}
