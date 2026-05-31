import Link from "next/link";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/Header";
import { PricingSection } from "@/components/marketing/PricingSection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="border-b border-neutral-200">
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
                Job application software
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-5xl md:leading-tight">
                Fill applications in minutes, not hours.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-neutral-600">
                Swiftdroom is a Chrome extension and dashboard that autofills Workday,
                Greenhouse, and Lever forms from your profile — and writes tailored answers
                to open-ended questions using your resume and the job description.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Create your account
                </Link>
                <p className="text-sm text-neutral-500">
                  Set up your profile first. Subscribe when you are ready to apply.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-neutral-200 bg-neutral-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  The same fields. Every single time.
                </h2>
                <p className="mt-4 leading-relaxed text-neutral-600">
                  Job seekers spend 20–40 minutes per application re-entering contact info,
                  work history, and writing custom answers — often on platforms with
                  inconsistent form structures that break standard autofill tools.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-8">
                <dl className="space-y-6">
                  {[
                    ["Average time per application", "32 min"],
                    ["Fields re-entered manually", "40+"],
                    ["Custom written answers per week", "15–30"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-neutral-100 pb-4 last:border-0 last:pb-0">
                      <dt className="text-sm text-neutral-500">{label}</dt>
                      <dd className="text-sm font-semibold text-neutral-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-neutral-200 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
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
                <div key={step}>
                  <span className="text-sm font-medium text-neutral-400">{step}</span>
                  <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-neutral-200 bg-neutral-50 py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Built for real ATS platforms</h2>
            <p className="mt-4 max-w-2xl text-neutral-600">
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
                <div key={title} className="rounded-lg border border-neutral-200 bg-white p-6">
                  <h3 className="font-semibold text-neutral-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />

        {/* FAQ */}
        <section id="faq" className="py-24">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold tracking-tight">Common questions</h2>
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
                <div key={q}>
                  <dt className="font-medium text-neutral-900">{q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-neutral-600">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-neutral-200 bg-neutral-900 py-20 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ready to spend less time on forms?
            </h2>
            <p className="mt-4 text-neutral-400">
              Create your profile in five minutes. Start applying when you subscribe.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-block rounded-md bg-white px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
