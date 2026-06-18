"use client";

import { useEffect, useState } from "react";
import { detectCountryCode, isMenaRegion } from "@/lib/regional-pricing";

export function useRegionalPricing() {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectCountryCode()
      .then(setCountryCode)
      .finally(() => setLoading(false));
  }, []);

  return {
    countryCode,
    loading,
    isMena: isMenaRegion(countryCode),
  };
}
