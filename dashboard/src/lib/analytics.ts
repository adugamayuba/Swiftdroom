import { track } from "@vercel/analytics";

export type AnalyticsEvent =
  | "login"
  | "logout"
  | "register"
  | "subscribe_checkout"
  | "subscribe_activated"
  | "demo_video_play"
  | "cta_register_click"
  | "extension_install_click"
  | "referral_link_visit";

export function trackEvent(
  name: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
) {
  try {
    track(name, properties);
  } catch {
    // Analytics is best-effort; never block UX.
  }
}
