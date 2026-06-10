"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, getSessionToken } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";

const VISITOR_KEY = "swiftdroom_visitor_id";
const SESSION_KEY = "swiftdroom_analytics_session";
const UTM_KEY = "swiftdroom_utm";

type PendingEvent = {
  type: string;
  path?: string;
  label?: string;
  meta?: Record<string, unknown>;
};

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function getUtm(): { utmSource: string; utmMedium: string; utmCampaign: string } {
  const stored = sessionStorage.getItem(UTM_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      /* ignore */
    }
  }
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utmSource: params.get("utm_source") || "",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
  };
  if (utm.utmSource || utm.utmMedium || utm.utmCampaign) {
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  }
  return utm;
}

function isTrackablePath(path: string): boolean {
  if (path.startsWith("/dashboard") || path.startsWith("/admin")) return false;
  if (path.startsWith("/api")) return false;
  return true;
}

/** First-party session tracking: page views, clicks, scroll depth, time on site. */
export function VisitorTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(
    typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY) : null
  );
  const startedAtRef = useRef(Date.now());
  const queueRef = useRef<PendingEvent[]>([]);
  const scrollMarksRef = useRef(new Set<number>());

  const flush = useCallback(async (opts?: { pageView?: boolean; final?: boolean }) => {
    if (typeof window === "undefined") return;
    if (getSessionToken()) return;

    const path = window.location.pathname;
    if (!isTrackablePath(path)) return;

    const events = [...queueRef.current];
    queueRef.current = [];

    const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
    const utm = getUtm();

    try {
      const res = await apiFetch("/api/analytics/collect", {
        method: "POST",
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          visitorId: getVisitorId(),
          landingPath: path,
          referrer: document.referrer.slice(0, 2048),
          ...utm,
          userAgent: navigator.userAgent.slice(0, 512),
          durationSec,
          pageView: opts?.pageView,
          events,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { sessionId?: string };
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          sessionStorage.setItem(SESSION_KEY, data.sessionId);
        }
      }
    } catch {
      queueRef.current.unshift(...events);
    }
  }, []);

  const enqueue = useCallback((event: PendingEvent) => {
    queueRef.current.push(event);
    if (queueRef.current.length >= 8) {
      void flush();
    }
  }, [flush]);

  useEffect(() => {
    if (!isTrackablePath(pathname)) return;
    scrollMarksRef.current.clear();
    enqueue({ type: "page_view", path: pathname });
    trackEvent("page_view", { path: pathname });
    void flush({ pageView: true });
  }, [pathname, enqueue, flush]);

  useEffect(() => {
    if (getSessionToken()) return;

    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a, button, [role='button']");
      if (!target || !(target instanceof HTMLElement)) return;
      const label =
        target.getAttribute("data-track") ||
        target.getAttribute("aria-label") ||
        (target instanceof HTMLAnchorElement ? target.pathname + target.hash : null) ||
        target.textContent?.trim().slice(0, 80) ||
        target.tagName;
      enqueue({
        type: "click",
        path: window.location.pathname,
        label: label || "unknown",
      });
    }

    function onScroll() {
      const doc = document.documentElement;
      const pct = Math.round(
        ((doc.scrollTop + window.innerHeight) / doc.scrollHeight) * 100
      );
      for (const mark of [25, 50, 75, 100]) {
        if (pct >= mark && !scrollMarksRef.current.has(mark)) {
          scrollMarksRef.current.add(mark);
          enqueue({
            type: "scroll",
            path: window.location.pathname,
            label: `${mark}%`,
          });
        }
      }
    }

    const heartbeat = window.setInterval(() => void flush(), 30000);

    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", () => void flush({ final: true }));
    window.addEventListener("beforeunload", () => void flush({ final: true }));

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", () => void flush({ final: true }));
      window.removeEventListener("beforeunload", () => void flush({ final: true }));
    };
  }, [enqueue, flush]);

  return null;
}

export function trackVisitorEvent(
  type: string,
  label?: string,
  meta?: Record<string, unknown>
) {
  if (typeof window === "undefined" || getSessionToken()) return;
  const event = { type, path: window.location.pathname, label: label || "", meta };
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  void apiFetch("/api/analytics/collect", {
    method: "POST",
    body: JSON.stringify({
      sessionId,
      visitorId: localStorage.getItem(VISITOR_KEY) || crypto.randomUUID(),
      events: [event],
    }),
  });
}
