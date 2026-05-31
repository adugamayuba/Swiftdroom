import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/Header";
import { PricingSection } from "@/components/marketing/PricingSection";
import { Zap, Brain, Target, Shield, ArrowRight, CheckCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MarketingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
              <Zap className="h-3.5 w-3.5" />
              AI-powered job application co-pilot
            </div>

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl md:leading-tight">
              Apply to jobs{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                10× faster
              </span>
            </h1>

            <p className="mt-6 text-xl leading-relaxed text-white/60">
              Swiftdroom autofills Workday, Greenhouse, and Lever forms from your profile
              and writes tailored answers using your resume and the job description.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 hover:shadow-indigo-500/30"
              >
                Start for free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-base font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                See how it works
              </a>
            </div>

            <p className="mt-4 text-sm text-white/30">
              Free profile setup · No credit card to start
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-20 grid grid-cols-3 gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 md:grid-cols-3">
            {[
              ["32 min", "Average time saved per application"],
              ["40+", "Form fields autofilled instantly"],
              ["3 ATS", "Workday · Greenhouse · Lever"],
            ].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-white md:text-4xl">{val}</p>
                <p className="mt-2 text-sm text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">How it works</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Three steps to fewer wasted hours</h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                color: "from-indigo-500 to-blue-500",
                title: "Build your profile once",
                desc: "Upload your resume and enter your details. Swiftdroom stores everything as your permanent autofill source.",
              },
              {
                step: "02",
                color: "from-violet-500 to-purple-500",
                title: "Install the extension",
                desc: "Subscribe, install the Chrome extension, paste your API token. Takes under two minutes.",
              },
              {
                step: "03",
                color: "from-purple-500 to-pink-500",
                title: "Apply with the co-pilot",
                desc: "Open the sidebar on any job application. Scan the form, autofill fields, generate AI answers, review and submit.",
              },
            ].map(({ step, color, title, desc }) => (
              <div key={step} className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 transition hover:border-white/20 hover:bg-white/8">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-sm font-bold text-white shadow-lg`}>
                  {step}
                </div>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-white/10 bg-white/[0.02] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Built different</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight">
                Works where basic autofill fails
              </h2>
              <p className="mt-5 leading-relaxed text-white/50">
                Modern ATS platforms use dynamic DOM, iframes, and obfuscated field names. Swiftdroom reads
                visual labels on screen — not HTML attributes — so it works on Workday, Greenhouse,
                Lever, and any company career page.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  "Label-based field detection — reads what's on screen",
                  "Persona switching — different profiles per role type",
                  "AI ghostwriter — tailored answers from your resume + JD",
                  "You review everything before submitting",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4">
              {[
                { icon: Target, title: "Label-based detection", desc: "Maps fields by what they say on screen, not broken HTML attributes." },
                { icon: Brain, title: "AI answer generation", desc: "GPT-4o writes tailored answers to open-ended questions — you approve." },
                { icon: Zap, title: "Instant autofill", desc: "One click fills contact info, work history, and education across any ATS." },
                { icon: Shield, title: "Co-pilot, not autopilot", desc: "You review and submit. Swiftdroom helps — it never acts for you." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-indigo-500/30 hover:bg-indigo-500/5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-white/40">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">FAQ</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Common questions</h2>
          </div>
          <dl className="mt-12 space-y-6">
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
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your dashboard at any time. You keep access until the end of your billing period.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <dt className="font-semibold text-white">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-white/50">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/10 py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/15 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Stop re-typing the same information.
          </h2>
          <p className="mt-5 text-lg text-white/50">
            Set up your profile in five minutes. Start applying smarter.
          </p>
          <Link
            href="/register"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            Create your free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
