import Link from "next/link";
import { PLANS } from "@/lib/plans";

export function PricingSection() {
  const plans = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];

  return (
    <section id="pricing" className="py-24 border-b border-neutral-100">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-4xl font-black tracking-tight text-neutral-950">Pricing</h2>
        <p className="mt-3 max-w-lg text-neutral-500">
          Every plan includes the Chrome extension, AI answer generation, and application tracking.
          Pay only for what you use.
        </p>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-8 ${
                plan.popular
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-neutral-200 bg-white"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-6">
                  <span className="rounded-full bg-violet-900 px-3 py-1 text-xs font-bold text-white">
                    Most popular
                  </span>
                </div>
              )}

              <h3 className={`font-bold ${plan.popular ? "text-white" : "text-neutral-950"}`}>
                {plan.name}
              </h3>

              <div className="mt-4 flex items-end gap-1">
                <span className={`text-5xl font-black tracking-tight ${plan.popular ? "text-white" : "text-neutral-950"}`}>
                  {plan.priceLabel}
                </span>
                <span className={`mb-1 text-sm ${plan.popular ? "text-violet-200" : "text-neutral-400"}`}>/mo</span>
              </div>
              <p className={`mt-1 text-sm font-semibold ${plan.popular ? "text-violet-200" : "text-violet-600"}`}>
                {plan.applicationsLimit} applications / month
              </p>

              <ul className="mt-7 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.popular ? "text-violet-100" : "text-neutral-600"}`}>
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${plan.popular ? "bg-violet-300" : "bg-violet-600"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-bold transition ${
                  plan.popular
                    ? "bg-white text-violet-700 hover:bg-violet-50"
                    : "border border-neutral-300 text-neutral-950 hover:border-violet-600 hover:text-violet-600"
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
