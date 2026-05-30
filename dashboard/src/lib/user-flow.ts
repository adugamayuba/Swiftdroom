import type { User } from "@prisma/client";
import { canUseExtension, hasActiveSubscription } from "./subscription";

export function getPostAuthRedirect(user: User): string {
  if (!user.onboardingComplete) return "/onboarding";
  if (!hasActiveSubscription(user)) return "/subscribe";
  return "/dashboard";
}

export { canUseExtension, hasActiveSubscription };
