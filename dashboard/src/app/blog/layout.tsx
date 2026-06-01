import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog — Job search guides and tips",
  description:
    "Practical guides on Workday autofill, AI application answers, and job search strategy from the Swiftdroom team.",
  path: "/blog",
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
