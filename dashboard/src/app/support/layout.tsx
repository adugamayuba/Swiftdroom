import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Support",
  description:
    "Get help with Swiftdroom — Chrome extension, billing, account setup, and job application autofill.",
  path: "/support",
});

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
