export type PlanId = "STARTER" | "PRO" | "BUSINESS";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  applicationsLimit: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    price: 9.99,
    priceLabel: "$9.99",
    applicationsLimit: 50,
    description: "For active job seekers applying weekly",
    features: [
      "50 applications per month",
      "Chrome extension access",
      "AI answer generation",
      "Application tracking",
      "1 persona profile",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 19.99,
    priceLabel: "$19.99",
    applicationsLimit: 150,
    description: "For intensive search campaigns",
    features: [
      "150 applications per month",
      "Everything in Starter",
      "Unlimited personas",
      "Priority AI generation",
      "Field mapping persistence",
    ],
    popular: true,
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    price: 39.99,
    priceLabel: "$39.99",
    applicationsLimit: 500,
    description: "For recruiters, coaches, and power users",
    features: [
      "500 applications per month",
      "Everything in Pro",
      "Bulk profile management",
      "Usage analytics",
      "Priority support",
    ],
  },
};

export function getPlanFromPriceId(priceId: string): PlanId | null {
  const map: Record<string, PlanId> = {
    [process.env.STRIPE_PRICE_STARTER || ""]: "STARTER",
    [process.env.STRIPE_PRICE_PRO || ""]: "PRO",
    [process.env.STRIPE_PRICE_BUSINESS || ""]: "BUSINESS",
  };
  return map[priceId] || null;
}

export function getPriceIdForPlan(planId: PlanId): string {
  const map: Record<PlanId, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO: process.env.STRIPE_PRICE_PRO,
    BUSINESS: process.env.STRIPE_PRICE_BUSINESS,
  };
  const priceId = map[planId];
  if (!priceId) throw new Error(`Missing Stripe price ID for plan ${planId}`);
  return priceId;
}
