import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Terms governing use of Swiftdroom, including the dashboard and Chrome extension.",
  path: "/terms",
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
