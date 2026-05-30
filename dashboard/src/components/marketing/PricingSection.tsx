import Link from "next/link";
import { PLANS } from "@/lib/plans";

export function PricingSection() {
  const plans = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];

  return (
    <section id="pricing" className="border-t border-neutral-200 bg-neutral-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-neutral-600">
            Pay for applications you actually use. Every plan includes the Chrome extension,
            AI answer generation, and application tracking.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-lg border bg-white p-8 ${
                plan.popular
                  ? "border-neutral-900 shadow-sm"
                  : "border-neutral-200"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-neutral-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-neutral-900">
                  {plan.priceLabel}
                </span>
                <span className="text-sm text-neutral-500">/month</span>
              </div>
              <p className="mt-2 text-sm font-medium text-neutral-700">
                {plan.applicationsLimit} applications per month
              </p>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-neutral-600">
                    <span className="text-neutral-400">—</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-8 block w-full rounded-md py-2.5 text-center text-sm font-medium ${
                  plan.popular
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "border border-neutral-300 text-neutral-900 hover:bg-neutral-50"
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
