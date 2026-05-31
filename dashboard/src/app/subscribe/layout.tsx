import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Subscribe",
  noIndex: true,
});

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
