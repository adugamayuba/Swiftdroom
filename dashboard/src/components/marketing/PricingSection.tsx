import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { SectionLabel, SectionTitle } from "@/components/marketing/marketing-ui";

export function PricingSection() {
  const plans = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];

  return (
    <section id="pricing" className="border-b border-[var(--al-border)] bg-[var(--al-surface)] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Pricing</SectionLabel>
          <SectionTitle className="mt-3">Simple, transparent pricing</SectionTitle>
          <p className="mt-4 text-[var(--al-muted)]">
            Pay for applications you actually use. Every plan includes the Chrome extension,
            AI answer generation, and application tracking.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-sm border bg-white p-8 ${
                plan.popular
                  ? "border-[var(--al-black)]"
                  : "border-[var(--al-border)]"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-sm bg-[var(--al-green)] px-3 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-[var(--al-black)]">{plan.name}</h3>
              <p className="mt-1 text-sm text-[var(--al-muted)]">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-serif text-4xl tracking-tight text-[var(--al-black)]">
                  {plan.priceLabel}
                </span>
                <span className="text-sm text-[var(--al-muted)]">/month</span>
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--al-black)]">
                {plan.applicationsLimit} applications per month
              </p>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-[var(--al-muted)]">
                    <span className="text-[var(--al-green)]">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 block w-full rounded-sm py-2.5 text-center text-sm font-medium transition ${
                  plan.popular
                    ? "bg-[var(--al-black)] text-white hover:bg-[var(--al-black-soft)]"
                    : "border border-[var(--al-border)] text-[var(--al-black)] hover:border-[var(--al-black)]"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
