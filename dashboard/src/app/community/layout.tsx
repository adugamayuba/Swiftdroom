import type { Metadata } from "next";
import CommunityShell from "@/components/CommunityShell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Community Hub",
  description: "Manage your community referrals and profile on Swiftdroom.",
  path: "/community",
  noIndex: true,
});

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommunityShell>{children}</CommunityShell>;
}
