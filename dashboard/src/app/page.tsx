import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/Header";
import { PricingSection } from "@/components/marketing/PricingSection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 border-b border-neutral-100">
        <div className="mx-auto max-w-5xl px-6">

          {/* Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            Chrome extension + dashboard
          </div>

          {/* Headline */}
          <h1 className="mt-5 text-[3.5rem] font-black leading-[1.08] tracking-tight text-neutral-950 md:text-7xl">
            Apply to jobs<br />
            <span className="text-violet-600">in minutes</span>,<br />
            not hours.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-neutral-500 leading-relaxed">
            Upload your resume once. Swiftdroom autofills Workday, Greenhouse, and Lever
            forms and writes tailored answers to every open-ended question — using your
            actual resume and the job description.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              Start free — no card needed
            </Link>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-400 transition hover:text-neutral-700">
              How it works →
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 flex flex-wrap gap-10">
            {[
              { n: "32 min", t: "saved per application" },
              { n: "40+",    t: "form fields autofilled" },
              { n: "3 ATS",  t: "Workday · Greenhouse · Lever" },
            ].map(({ n, t }) => (
              <div key={t}>
                <p className="text-3xl font-black text-neutral-950">{n}</p>
                <p className="mt-0.5 text-sm text-neutral-400">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem band ────────────────────────────────────────────── */}
      <section className="bg-neutral-950 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-base font-semibold text-neutral-400">
            You&apos;ve filled in your name, email, and work history{" "}
            <span className="text-white">hundreds of times</span>.
            Swiftdroom makes it the last time.
          </p>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-4xl font-black tracking-tight text-neutral-950">
            How it works
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Upload your resume",
                body: "We pull your name, contact info, and links automatically. You confirm the details — takes 60 seconds.",
              },
              {
                n: "02",
                title: "Subscribe and install",
                body: "Pick a plan, install the Chrome extension, paste your API token. Done in two minutes.",
              },
              {
                n: "03",
                title: "Open the co-pilot and apply",
                body: "Open the Swiftdroom sidebar on any job page. Scan, autofill, generate answers, then submit yourself.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="border-l-2 border-violet-600 pl-5">
                <p className="text-xs font-bold uppercase tracking-widest text-violet-600">{n}</p>
                <h3 className="mt-2 text-lg font-bold text-neutral-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-neutral-50 border-b border-neutral-100">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-16 md:grid-cols-2 md:items-start">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-neutral-950">
                Works where browser<br />autofill doesn&apos;t
              </h2>
              <p className="mt-5 text-neutral-500 leading-relaxed">
                Workday, Greenhouse, and Lever use dynamic field names and shadow DOM that
                break standard autofill. Swiftdroom reads the labels you see on screen and
                maps them to your profile — no fragile attribute matching.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  ["Visual label detection", "Reads what's on screen, not broken HTML attributes"],
                  ["Persona switching", "Different profiles for engineering, management, or domain-specific roles"],
                  ["AI answer generation", "Open-ended questions answered from your resume + the job description"],
                  ["Co-pilot, not autopilot", "You review everything. You click submit."],
                ].map(([title, desc]) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />
                    <span>
                      <span className="font-semibold text-neutral-900">{title} — </span>
                      <span className="text-sm text-neutral-500">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Contact autofill",  desc: "Name, email, phone, address across any form" },
                { label: "Work history",      desc: "Roles, companies, dates — mapped automatically" },
                { label: "AI ghostwriter",    desc: "Tailored answers in seconds, not minutes" },
                { label: "App tracking",      desc: "Every application logged and searchable" },
              ].map(({ label, desc }) => (
                <div key={label} className="rounded-xl border border-neutral-200 bg-white p-5">
                  <p className="text-sm font-bold text-neutral-950">{label}</p>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-4xl font-black tracking-tight text-neutral-950">Questions</h2>
          <dl className="mt-12 divide-y divide-neutral-100">
            {[
              { q: "Does Swiftdroom submit applications for me?", a: "No. It fills fields and generates drafts — you review and submit yourself." },
              { q: "What counts as one application?", a: "Each time you log an application or use AI generation through the extension." },
              { q: "Can I use it before paying?", a: "Yes. Create an account and set up your profile for free. The extension requires an active plan." },
              { q: "Which job boards work?", a: "Workday, Greenhouse, Lever, and most standard web application forms." },
              { q: "Can I cancel anytime?", a: "Yes — from your dashboard. Access continues until the billing period ends." },
            ].map(({ q, a }) => (
              <div key={q} className="py-6">
                <dt className="font-bold text-neutral-950">{q}</dt>
                <dd className="mt-2 text-sm text-neutral-500 leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-24 bg-violet-600">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-black tracking-tight text-white">
            Ready to apply smarter?
          </h2>
          <p className="mt-4 text-violet-200">
            Set up your profile in five minutes. Use the extension to apply in five seconds.
          </p>
          <Link
            href="/register"
            className="mt-10 inline-block rounded-lg bg-white px-8 py-3.5 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
          >
            Get started free
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
