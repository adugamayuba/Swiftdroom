import Link from "next/link";
import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/Header";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PricingSection } from "@/components/marketing/PricingSection";
import { HeroBackground } from "@/components/marketing/HeroBackground";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { CompaniesSection } from "@/components/marketing/CompaniesSection";
import { BlogSection } from "@/components/marketing/BlogSection";
import { HomeJsonLd } from "@/components/marketing/JsonLd";
import { buildPageMetadata } from "@/lib/seo";
import { BtnPrimary, SectionLabel, SectionTitle } from "@/components/marketing/marketing-ui";

export const metadata: Metadata = buildPageMetadata();

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[var(--al-black)]">
      <HomeJsonLd />
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="relative flex min-h-[calc(100dvh-4.25rem)] items-center overflow-hidden border-b border-[var(--al-border)] bg-white">
          <HeroBackground />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto max-w-4xl">
              <h1 className="font-serif text-5xl font-normal leading-[1.05] tracking-tight text-[var(--al-black)] md:text-6xl lg:text-7xl">
                Built to apply
                <br />
                <span className="text-[var(--al-muted)]">at scale</span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--al-muted)] md:text-xl">
                Swiftdroom provides job seekers with the tools to autofill Workday,
                Greenhouse, and Lever — and write tailored answers from your resume.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <BtnPrimary href="/register">Get started</BtnPrimary>
                <Link
                  href="#how-it-works"
                  className="text-sm font-medium text-[var(--al-black)] underline-offset-4 hover:underline"
                >
                  See how it works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats — AngelList "By the numbers" */}
        <section className="border-b border-[var(--al-border)] bg-[var(--al-surface)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>By the numbers</SectionLabel>
            <div className="mt-12 grid gap-12 sm:grid-cols-3">
              {[
                ["12,000+", "Applications autofilled"],
                ["4.2 min", "Average time saved per app"],
                ["89%", "Users report more interviews"],
              ].map(([stat, label]) => (
                <div key={label}>
                  <p className="font-serif text-4xl tracking-tight text-[var(--al-black)] md:text-5xl">
                    {stat}
                  </p>
                  <p className="mt-2 text-sm text-[var(--al-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-[var(--al-border)] bg-white py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-16 md:grid-cols-2 md:items-center">
              <div>
                <SectionLabel>The problem</SectionLabel>
                <SectionTitle className="mt-3">
                  The same fields.
                  <br />
                  Every single time.
                </SectionTitle>
                <p className="mt-6 leading-relaxed text-[var(--al-muted)]">
                  Job seekers spend 20–40 minutes per application re-entering contact info,
                  work history, and writing custom answers — often on platforms with
                  inconsistent form structures that break standard autofill tools.
                </p>
              </div>
              <div className="rounded-sm border border-[var(--al-border)] bg-[var(--al-surface)] p-8">
                <dl className="space-y-6">
                  {[
                    ["Average time per application", "32 min"],
                    ["Fields re-entered manually", "40+"],
                    ["Custom written answers per week", "15–30"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-[var(--al-border)] pb-4 last:border-0 last:pb-0"
                    >
                      <dt className="text-sm text-[var(--al-muted)]">{label}</dt>
                      <dd className="text-sm font-semibold text-[var(--al-black)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* How it works — product cards */}
        <section id="how-it-works" className="border-b border-[var(--al-border)] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>How it works</SectionLabel>
            <SectionTitle className="mt-3">Three steps to faster applications</SectionTitle>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Build your profile",
                  desc: "Upload your resume and enter your details once. Swiftdroom uses this as the source of truth for every application.",
                },
                {
                  title: "Subscribe and install",
                  desc: "Choose a plan based on how many applications you need. Install the Chrome extension and connect your account.",
                },
                {
                  title: "Apply with the sidebar",
                  desc: "Open the side panel on any application page. Scan the form, review autofilled fields, and insert AI-written answers.",
                },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="rounded-sm border border-[var(--al-border)] bg-white p-8 transition hover:border-[var(--al-black)]"
                >
                  <h3 className="text-lg font-semibold text-[var(--al-black)]">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--al-muted)]">{desc}</p>
                  <Link
                    href="/register"
                    className="mt-6 inline-block text-sm font-medium text-[var(--al-green)] hover:underline"
                  >
                    Learn more →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-[var(--al-border)] bg-[var(--al-surface)] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <SectionLabel>Features</SectionLabel>
            <SectionTitle className="mt-3">Built for real ATS platforms</SectionTitle>
            <p className="mt-4 max-w-2xl text-[var(--al-muted)]">
              Swiftdroom reads visual labels on the page — not HTML attributes — so it works
              where basic autofill fails.
            </p>
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {[
                {
                  title: "Label-based field detection",
                  desc: "Maps fields by what they say on screen, including Workday, Greenhouse, and Lever layouts.",
                },
                {
                  title: "Persona-based AI answers",
                  desc: "Maintain multiple focus profiles and switch per application.",
                },
                {
                  title: "Click-to-insert ghostwriter",
                  desc: "Generate answers from the job description and your resume. You review before inserting.",
                },
                {
                  title: "Co-pilot, never autopilot",
                  desc: "Swiftdroom fills fields and highlights uncertain mappings. You click submit yourself.",
                },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="rounded-sm border border-[var(--al-border)] bg-white p-8"
                >
                  <h3 className="font-semibold text-[var(--al-black)]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--al-muted)]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TestimonialsSection />
        <CompaniesSection />
        <BlogSection />
        <PricingSection />

        {/* FAQ */}
        <section id="faq" className="border-b border-[var(--al-border)] py-24">
          <div className="mx-auto max-w-3xl px-6">
            <SectionLabel>FAQ</SectionLabel>
            <SectionTitle className="mt-3">Common questions</SectionTitle>
            <dl className="mt-12 space-y-10">
              {[
                {
                  q: "Does Swiftdroom submit applications for me?",
                  a: "No. Swiftdroom is a co-pilot. It fills fields and generates draft answers, but you review everything and submit manually.",
                },
                {
                  q: "What counts as an application?",
                  a: "Each time you log an application or generate an AI answer through the extension counts toward your monthly limit.",
                },
                {
                  q: "Can I use Swiftdroom without subscribing?",
                  a: "You can create an account and set up your profile for free. The Chrome extension requires an active subscription.",
                },
                {
                  q: "Which job boards are supported?",
                  a: "Swiftdroom works on most web-based application forms, including Workday, Greenhouse, Lever, and company career pages.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="border-b border-[var(--al-border)] pb-10 last:border-0">
                  <dt className="font-medium text-[var(--al-black)]">{q}</dt>
                  <dd className="mt-3 text-sm leading-relaxed text-[var(--al-muted)]">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[var(--al-black)] py-24 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-serif text-3xl font-normal tracking-tight md:text-4xl">
              Ready to spend less time on forms?
            </h2>
            <p className="mt-4 text-neutral-400">
              Create your profile in five minutes. Start applying when you subscribe.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-sm bg-white px-6 py-3 text-sm font-medium text-[var(--al-black)] transition hover:bg-neutral-100"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
