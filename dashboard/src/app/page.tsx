import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/Header";
import { TrackedRegisterLink } from "@/components/marketing/TrackedRegisterLink";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PricingSection } from "@/components/marketing/PricingSection";
import { HeroBackground } from "@/components/marketing/HeroBackground";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { CompaniesSection } from "@/components/marketing/CompaniesSection";
import { BlogSection } from "@/components/marketing/BlogSection";
import { DemoVideoSection } from "@/components/marketing/DemoVideoSection";
import { HomeJsonLd } from "@/components/marketing/JsonLd";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata();

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[var(--brand-header)]">
      <HomeJsonLd />
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="relative flex min-h-[calc(100dvh-4.25rem)] items-center overflow-hidden bg-[var(--brand-dark)]">
          <HeroBackground />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Your AI agent is ready to apply to jobs right now
              </div>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--brand-hero-accent)] md:text-6xl md:leading-[1.05]">
                Your AI agent applies
                <br />
                <span className="text-white">to jobs while you sleep.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                Swiftdroom automatically finds matching jobs, fills every field, writes
                tailored answers, and submits applications on your behalf — 24 hours a day.
                You get email updates on every submission.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <TrackedRegisterLink source="hero" className="al-btn-white">
                  Start your AI agent
                </TrackedRegisterLink>
                <p className="text-sm text-white/50">
                  Set up your profile once. The agent handles the rest.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-[var(--brand-olive)] py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 sm:grid-cols-3">
              {[
                ["24 / 7", "AI agent is always running"],
                ["50–500", "Applications submitted per month"],
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
                  Job searching is a full-time job. It shouldn't have to be.
                </h2>
                <p className="mt-4 leading-relaxed text-[var(--brand-header)]/70">
                  The average job seeker spends 20–40 minutes per application re-entering
                  the same information and writing custom answers. At 10 applications a week,
                  that's hours you'll never get back — every single week.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--brand-header)]/10 bg-white/60 p-8 backdrop-blur-sm">
                <dl className="space-y-6">
                  {[
                    ["Time spent per manual application", "32 min"],
                    ["Form fields re-entered per application", "40+"],
                    ["Hours lost per week (10 apps)", "5–7 hrs"],
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

        <DemoVideoSection />

        {/* How it works */}
        <section id="how-it-works" className="bg-[var(--brand-dark)] py-24 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Build your profile once",
                  desc: "Upload your resume and enter your details. This is the only time you'll ever fill in your experience, contact info, and preferences.",
                },
                {
                  step: "02",
                  title: "Turn on the AI agent",
                  desc: "Subscribe and enable auto-apply. Your agent instantly starts scanning job boards, scoring matches, and queuing applications.",
                },
                {
                  step: "03",
                  title: "Get email updates on submissions",
                  desc: "While you focus on your day, the agent fills every field, generates tailored answers, and submits — then emails you a summary of every application sent.",
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
              A fully autonomous job application agent
            </h2>
            <p className="mt-4 max-w-2xl text-[var(--brand-header)]/65">
              Not just an autofill tool. A server-side agent that actively searches, matches,
              applies, and reports — without you lifting a finger.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {[
                {
                  title: "Applies to jobs automatically",
                  desc: "The agent runs every 15 minutes on our servers. It finds Greenhouse and Lever roles that match your profile and submits full applications — no browser open needed.",
                },
                {
                  title: "AI-written tailored answers",
                  desc: "Custom cover letter questions? Our AI generates concise, resume-backed answers for every free-text field before submitting.",
                },
                {
                  title: "Email digest after every batch",
                  desc: "You get an email for every batch of applications submitted — company name, role title, and your monthly usage at a glance.",
                },
                {
                  title: "Chrome extension for everything else",
                  desc: "For Workday and other platforms, install the extension. One click fills every field and writes AI answers — you review and submit.",
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
                  q: "Does Swiftdroom actually submit applications for me?",
                  a: "Yes. The AI agent runs on our servers every 15 minutes, finds jobs that match your profile, fills every field, and submits. You receive an email summary after each batch.",
                },
                {
                  q: "Which job platforms can the agent apply to?",
                  a: "The auto-apply agent works on Greenhouse and Lever job postings — two of the most common ATS platforms used by tech companies. For Workday, LinkedIn, and other platforms, the Chrome extension autofills forms so you can review and submit in seconds.",
                },
                {
                  q: "What counts as an application toward my monthly limit?",
                  a: "Every job the agent submits on your behalf counts. If you also apply manually via the extension, that counts too. Your usage resets at the start of each billing period.",
                },
                {
                  q: "Can I pause or control which jobs the agent applies to?",
                  a: "Yes. Set your minimum match score (50–100%), daily cap, and a custom cover note. You can pause the agent any time and resume it from the Auto Apply dashboard.",
                },
                {
                  q: "Can I use Swiftdroom without subscribing?",
                  a: "You can register and build your profile for free. The AI agent and Chrome extension require an active subscription. Use promo code WELCOME for 20% off your first month.",
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
              Start your AI agent today.
            </h2>
            <p className="mt-4 text-white/60">
              Build your profile in five minutes. Your agent starts applying immediately.
            </p>
            <TrackedRegisterLink source="footer_cta" className="al-btn-white mt-8">
              Create your account
            </TrackedRegisterLink>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
