import type { Metadata } from "next";
import AdminLayoutGate from "./AdminLayoutGate";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin",
  noIndex: true,
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutGate>{children}</AdminLayoutGate>;
}
