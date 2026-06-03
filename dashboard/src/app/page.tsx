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

export const metadata: Metadata = buildPageMetadata();

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[var(--brand-header)]">
      <HomeJsonLd />
      <MarketingHeader />

      <main>
        {/* Hero — fills viewport below header; stats appear on scroll */}
        <section className="relative flex min-h-[calc(100dvh-4.25rem)] items-center overflow-hidden bg-[var(--brand-dark)]">
          <HeroBackground />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--brand-hero-accent)] md:text-6xl md:leading-[1.05]">
                Stop retyping your resume.
                <br />
                <span className="text-white">Start getting interviews.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                Swiftdroom is a Chrome extension and dashboard that autofills Workday,
                Greenhouse, and Lever forms from your profile — and writes tailored answers
                to open-ended questions using your resume and the job description.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link href="/register" className="al-btn-white">
                  Create your account
                </Link>
                <p className="text-sm text-white/50">
                  Set up your profile first. Subscribe when you are ready to apply.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof stats */}
        <section className="bg-[var(--brand-olive)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 sm:grid-cols-3">
              {[
                ["12,000+", "Applications autofilled"],
                ["4.2 min", "Average time saved per app"],
                ["89%", "Users report more interviews"],
              ].map(([stat, label]) => (
                <div key={label}>
                  <p className="text-4xl font-semibold tracking-tight text-[var(--brand-mint-stat)] md:text-5xl">
                    {stat}
                  </p>
                  <p className="mt-2 text-sm text-[var(--brand-cream)]/80">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="bg-[var(--brand-mint)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--brand-header)]">
                  The same fields. Every single time.
                </h2>
                <p className="mt-4 leading-relaxed text-[var(--brand-header)]/70">
                  Job seekers spend 20–40 minutes per application re-entering contact info,
                  work history, and writing custom answers — often on platforms with
                  inconsistent form structures that break standard autofill tools.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--brand-header)]/10 bg-white/60 p-8 backdrop-blur-sm">
                <dl className="space-y-6">
                  {[
                    ["Average time per application", "32 min"],
                    ["Fields re-entered manually", "40+"],
                    ["Custom written answers per week", "15–30"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-[var(--brand-header)]/10 pb-4 last:border-0 last:pb-0"
                    >
                      <dt className="text-sm text-[var(--brand-header)]/60">{label}</dt>
                      <dd className="text-sm font-semibold text-[var(--brand-header)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-[var(--brand-dark)] py-24 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Build your profile",
                  desc: "Upload your resume and enter your details once. Swiftdroom uses this as the source of truth for every application.",
                },
                {
                  step: "02",
                  title: "Subscribe and install",
                  desc: "Choose a plan based on how many applications you need. Install the Chrome extension and connect your account.",
                },
                {
                  step: "03",
                  title: "Apply with the sidebar",
                  desc: "Open the side panel on any application page. Scan the form, review autofilled fields, and insert AI-written answers before you submit.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="border-t border-white/20 pt-6">
                  <span className="text-sm font-medium text-white/40">{step}</span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--brand-header)]">
              Built for real ATS platforms
            </h2>
            <p className="mt-4 max-w-2xl text-[var(--brand-header)]/65">
              Modern applicant tracking systems use dynamic DOM structures, iframes, and
              obfuscated field names. Swiftdroom reads visual labels on the page — not HTML
              attributes — so it works where basic autofill fails.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {[
                {
                  title: "Label-based field detection",
                  desc: "Maps fields by what they say on screen, including Workday, Greenhouse, and Lever layouts.",
                },
                {
                  title: "Persona-based AI answers",
                  desc: "Maintain multiple focus profiles — full-stack, management, domain-specific — and switch per application.",
                },
                {
                  title: "Click-to-insert ghostwriter",
                  desc: "Generate answers to open-ended questions from the job description and your resume. You review before inserting.",
                },
                {
                  title: "Co-pilot, never autopilot",
                  desc: "Swiftdroom fills fields and highlights uncertain mappings. You click submit yourself.",
                },
              ].map(({ title, desc }) => (
                <div
                  key={title}
                  className="rounded-lg border border-[var(--border)] bg-white p-6 shadow-sm"
                >
                  <h3 className="font-semibold text-[var(--brand-header)]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--brand-header)]/65">{desc}</p>
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
        <section id="faq" className="bg-white py-24">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--brand-header)]">
              Common questions
            </h2>
            <dl className="mt-10 space-y-8">
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
                <div key={q} className="border-b border-[var(--border)] pb-8 last:border-0">
                  <dt className="font-medium text-[var(--brand-header)]">{q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--brand-header)]/65">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[var(--brand-dark)] py-20 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to spend less time on forms?
            </h2>
            <p className="mt-4 text-white/60">
              Create your profile in five minutes. Start applying when you subscribe.
            </p>
            <Link href="/register" className="al-btn-white mt-8">
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
