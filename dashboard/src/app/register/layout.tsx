import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Create your account",
  description:
    "Set up your Swiftdroom profile in minutes. Upload your resume once and autofill Workday, Greenhouse, and Lever applications.",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
