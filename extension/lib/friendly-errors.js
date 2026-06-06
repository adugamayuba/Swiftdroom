const SwiftdroomFriendlyErrors = (() => {
  const BY_CODE = {
    SUBSCRIPTION_REQUIRED:
      "Subscribe to a plan at swiftdroom.com to use the extension.",
    QUOTA_EXCEEDED:
      "You've used all your applications this month. Upgrade your plan or wait for your next billing cycle.",
  };

  const EXACT = {
    Unauthorized: "Please sign in at swiftdroom.com to continue.",
    "Invalid token":
      "Your connection expired. Sign in at swiftdroom.com, open Settings once, then try again.",
    "Active subscription required":
      "Subscribe to a plan at swiftdroom.com to use the extension.",
    "Monthly application limit reached":
      "You've used all your applications this month.",
    "Generation failed": "We couldn't generate an answer. Please try again.",
  };

  function message(raw, code, fallback = "Something went wrong. Please try again.") {
    if (code && BY_CODE[code]) return BY_CODE[code];
    if (raw && EXACT[raw]) return EXACT[raw];
    if (!raw || /request failed|unauthorized|token|api/i.test(raw)) return fallback;
    if (raw.length > 120) return fallback;
    return raw;
  }

  return { message };
})();
