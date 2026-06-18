"use client";

import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { formatPlanPrice } from "@/lib/regional-pricing";
import { useRegionalPricing } from "@/hooks/useRegionalPricing";

export function PricingSection() {
  const plans = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];
  const { countryCode, isMena } = useRegionalPricing();

  return (
    <section id="pricing" className="bg-[var(--brand-mint)] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--brand-header)]">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-[var(--brand-header)]/65">
            Pay for applications you actually use. Every plan includes the Chrome extension,
            AI answer generation, and application tracking.
          </p>
          {isMena && (
            <p className="mt-2 text-sm font-medium text-[var(--brand-header)]/70">
              Prices shown in AED for Middle East · billed in USD
            </p>
          )}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const regional = formatPlanPrice(plan, countryCode);
            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border bg-white p-8 ${
                  plan.popular
                    ? "border-[var(--brand-header)] shadow-md"
                    : "border-[var(--border)]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-sm bg-[var(--brand-lavender)] px-3 py-1 text-xs font-medium text-[var(--brand-header)]">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-[var(--brand-header)]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[var(--brand-header)]/55">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight text-[var(--brand-header)]">
                    {regional.priceLabel}
                  </span>
                  <span className="text-sm text-[var(--brand-header)]/55">{regional.suffix}</span>
                </div>
                {regional.sublabel && (
                  <p className="mt-1 text-xs text-[var(--brand-header)]/45">{regional.sublabel}</p>
                )}
                <p className="mt-2 text-sm font-medium text-[var(--brand-header)]">
                  {plan.applicationsLimit} applications per month
                </p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-[var(--brand-header)]/65">
                      <span className="text-[var(--brand-header)]">—</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 block w-full rounded-md py-2.5 text-center text-sm font-medium transition ${
                    plan.popular
                      ? "bg-[var(--brand-header)] text-white hover:bg-[var(--brand-dark-elevated)]"
                      : "border border-[var(--brand-header)]/20 text-[var(--brand-header)] hover:border-[var(--brand-header)]"
                  }`}
                >
                  Get started
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
