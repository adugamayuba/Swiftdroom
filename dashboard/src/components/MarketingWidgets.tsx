"use client";

import { VisitorTracker } from "@/components/VisitorTracker";
import { SignupPromoModal } from "@/components/marketing/SignupPromoModal";

export function MarketingWidgets() {
  return (
    <>
      <VisitorTracker />
      <SignupPromoModal />
    </>
  );
}
