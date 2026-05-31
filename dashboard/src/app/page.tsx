import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/Header";
import { PricingSection } from "@/components/marketing/PricingSection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-neutral-100 pt-32 pb-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-indigo-600">
              Chrome extension + dashboard
            </p>
            <h1 className="mt-4 text-5xl font-extrabold leading-[1.1] tracking-tight text-neutral-950 md:text-6xl">
              Stop retyping your resume.
              <br />
              <span className="text-neutral-400">Start getting interviews.</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 leading-relaxed max-w-xl">
              Swiftdroom reads your resume once, then autofills Workday, Greenhouse, and
              Lever forms — and writes tailored answers to every open-ended question.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Set up your profile free
              </Link>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-neutral-500 underline underline-offset-4 transition hover:text-neutral-900"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 text-xs text-neutral-400">
              No credit card to start · subscribe when you're ready to apply
            </p>
          </div>

          {/* Stat bar */}
          <div className="mt-20 grid grid-cols-3 divide-x divide-neutral-100 border border-neutral-100 rounded-xl">
            {[
              { value: "32 min", label: "Saved per application" },
              { value: "40+",    label: "Fields autofilled" },
              { value: "3 ATS",  label: "Workday · Greenhouse · Lever" },
            ].map(({ value, label }) => (
              <div key={label} className="px-8 py-6">
                <p className="text-3xl font-bold text-neutral-950">{value}</p>
                <p className="mt-1 text-sm text-neutral-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-950">
            How it works
          </h2>
          <p className="mt-3 text-neutral-500 max-w-lg">
            You enter your details once. The extension handles the rest on every application.
          </p>

          <div className="mt-14 grid gap-px bg-neutral-100 rounded-xl overflow-hidden md:grid-cols-3">
            {[
              {
                n: "1",
                title: "Upload your resume",
                body: "We extract your name, contact info, work history, and links automatically. You review and confirm.",
              },
              {
                n: "2",
                title: "Install the extension",
                body: "One-click install from your dashboard. Paste your API token and you're connected.",
              },
              {
                n: "3",
                title: "Open and apply",
                body: "Click the Swiftdroom sidebar on any job page. Scan the form, autofill fields, generate answers.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-white p-8">
                <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white">
                  {n}
                </div>
                <h3 className="font-bold text-neutral-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-b border-neutral-100 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-semibold text-indigo-600">Why Swiftdroom</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-950">
                Works where standard autofill breaks
              </h2>
              <p className="mt-4 leading-relaxed text-neutral-600">
                Workday, Greenhouse, and Lever use dynamic DOM structures, shadow roots, and
                obfuscated field names that defeat browser autofill. Swiftdroom reads the
                visual labels on screen — the same ones you see — so it fills the right fields
                every time.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-neutral-700">
                {[
                  "Label-based detection, not fragile attribute matching",
                  "Multiple personas — switch focus per role type",
                  "AI writes answers from your resume + the job description",
                  "You review and submit. Swiftdroom never acts for you.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Autofill", desc: "Contact, education, work history across any ATS" },
                { label: "AI answers", desc: "Open-ended questions written from your resume" },
                { label: "Personas", desc: "Different profiles for different role types" },
                { label: "Tracking", desc: "Every application logged in your dashboard" },
              ].map(({ label, desc }) => (
                <div key={label} className="rounded-xl border border-neutral-200 bg-white p-5">
                  <p className="font-bold text-neutral-950">{label}</p>
                  <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      {/* FAQ */}
      <section id="faq" className="py-24 border-b border-neutral-100">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-950">
            Questions
          </h2>
          <dl className="mt-10 space-y-8">
            {[
              {
                q: "Does Swiftdroom submit applications for me?",
                a: "No. It fills fields and generates draft answers. You review and click submit yourself.",
              },
              {
                q: "What counts as one application toward my limit?",
                a: "Each time you log an application or use AI generation through the extension.",
              },
              {
                q: "Can I use it before subscribing?",
                a: "You can create an account and set up your profile for free. The extension requires an active plan.",
              },
              {
                q: "Which job boards are supported?",
                a: "Workday, Greenhouse, Lever, and most standard web-based application forms.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Cancel from your dashboard — access continues until the billing period ends.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-neutral-100 pb-8 last:border-0 last:pb-0">
                <dt className="font-bold text-neutral-950">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-neutral-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-neutral-950">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-white">
            Ready to apply smarter?
          </h2>
          <p className="mt-4 text-neutral-400">
            Set up your profile in five minutes. Use the extension to apply in five seconds.
          </p>
          <Link
            href="/register"
            className="mt-10 inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-neutral-950 transition hover:bg-neutral-100"
          >
            Get started free
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
