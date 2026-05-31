import Link from "next/link";
import { PLANS } from "@/lib/plans";

export function PricingSection() {
  const plans = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];

  return (
    <section id="pricing" className="py-24 border-b border-neutral-100">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-neutral-950">Pricing</h2>
        <p className="mt-3 text-neutral-500">
          Pay for applications you use. Every plan includes the Chrome extension,
          AI generation, and application tracking.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-8 ${
                plan.popular
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                  Most popular
                </span>
              )}
              <h3 className={`font-bold ${plan.popular ? "text-white" : "text-neutral-950"}`}>
                {plan.name}
              </h3>
              <p className={`mt-1 text-sm ${plan.popular ? "text-neutral-400" : "text-neutral-500"}`}>
                {plan.description}
              </p>

              <div className="mt-6 flex items-end gap-1">
                <span className={`text-5xl font-extrabold tracking-tight ${plan.popular ? "text-white" : "text-neutral-950"}`}>
                  {plan.priceLabel}
                </span>
                <span className={`mb-1 text-sm ${plan.popular ? "text-neutral-400" : "text-neutral-400"}`}>
                  /mo
                </span>
              </div>
              <p className={`mt-1 text-sm font-medium ${plan.popular ? "text-indigo-400" : "text-indigo-600"}`}>
                {plan.applicationsLimit} applications / month
              </p>

              <ul className="mt-7 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm ${plan.popular ? "text-neutral-300" : "text-neutral-600"}`}>
                    <span className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${plan.popular ? "bg-indigo-400" : "bg-neutral-400"}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-bold transition ${
                  plan.popular
                    ? "bg-white text-neutral-950 hover:bg-neutral-100"
                    : "border border-neutral-300 text-neutral-950 hover:bg-neutral-50"
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
