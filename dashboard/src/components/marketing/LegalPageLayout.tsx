import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-[var(--brand-header)]">
      <MarketingHeader />
      <main>
        <section className="bg-[var(--brand-mint)] py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-6">
            <Link
              href="/"
              className="text-sm font-medium text-[var(--brand-header)]/55 transition hover:text-[var(--brand-header)]"
            >
              ← Back to home
            </Link>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-[var(--brand-header)]/55">Last updated: {lastUpdated}</p>
          </div>
        </section>
        <section className="py-12 md:py-16">
          <div className="legal-content mx-auto max-w-3xl px-6">{children}</div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
