import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { CheckCircle } from "lucide-react";

export function PricingSection() {
  const plans = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];

  return (
    <section id="pricing" className="border-y border-white/10 bg-white/[0.02] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-white/50">
            Pay for applications you actually use. Every plan includes the Chrome extension,
            AI answer generation, and application tracking.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-8 transition ${
                plan.popular
                  ? "border-indigo-500/50 bg-indigo-600/10 shadow-xl shadow-indigo-600/10"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-indigo-600/30">
                    Most popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-white/40">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-white">
                  {plan.priceLabel}
                </span>
                <span className="text-sm text-white/40">/month</span>
              </div>
              <p className="mt-1 text-sm font-medium text-indigo-400">
                {plan.applicationsLimit} applications / month
              </p>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-white/60">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-bold transition ${
                  plan.popular
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500"
                    : "border border-white/20 text-white hover:border-white/40 hover:bg-white/10"
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
