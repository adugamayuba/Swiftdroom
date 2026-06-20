export type PlanId = "STARTER" | "PRO" | "BUSINESS";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  priceLabel: string;
  applicationsLimit: number;
  autoApplyLimit: number;
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
    autoApplyLimit: 50,
    description: "Your AI agent applies to 50 jobs a month",
    features: [
      "50 auto-applications per month",
      "AI agent finds and applies to jobs 24/7",
      "Greenhouse & Lever auto-submit",
      "Chrome extension autofill",
      "AI answer generation",
      "Application tracking & email updates",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 19.99,
    priceLabel: "$19.99",
    applicationsLimit: 150,
    autoApplyLimit: 150,
    description: "Your AI agent applies to 150 jobs a month",
    features: [
      "150 auto-applications per month",
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
    autoApplyLimit: 500,
    description: "Your AI agent applies to 500 jobs a month",
    features: [
      "500 auto-applications per month",
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
  const priceId = map[planId]?.trim();
  if (!priceId) throw new Error(`Missing Stripe price ID for plan ${planId}`);
  if (priceId.startsWith("prod_")) {
    throw new Error(
      `STRIPE_PRICE_${planId} is a product ID (prod_...). Use the price ID (price_...) from Stripe instead.`
    );
  }
  if (!priceId.startsWith("price_")) {
    throw new Error(
      `STRIPE_PRICE_${planId} must start with price_. Got: ${priceId.slice(0, 12)}...`
    );
  }
  return priceId;
}
