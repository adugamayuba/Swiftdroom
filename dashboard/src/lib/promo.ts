/** Site-wide welcome promo shown in ads, popup, and register. */
export const WELCOME_PROMO_CODE = "WELCOME";

export function isWelcomePromoCode(code: string): boolean {
  return code.trim().toUpperCase() === WELCOME_PROMO_CODE;
}

export function getWelcomeStripePromotionId(): string | null {
  return process.env.STRIPE_PROMO_WELCOME?.trim() || null;
}

export function normalizePromoOrReferralCode(code: string): string {
  return code.trim().toUpperCase();
}
