"use client";

import { trackEvent } from "@/lib/analytics";

export function DemoVideoSection() {
  return (
    <section id="demo" className="bg-[var(--brand-cream)] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--brand-header)]/50">
            Product demo
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--brand-header)] md:text-3xl">
            See Swiftdroom in action
          </h2>
          <p className="mt-4 text-[var(--brand-header)]/65">
            Watch how autofill and AI ghostwriter handle a real job application, from
            login to tracked submission in under a minute.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-xl border border-[var(--brand-header)]/10 bg-[var(--brand-header)] shadow-xl">
          <video
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            onPlay={() => trackEvent("demo_video_play")}
          >
            <source src="/demo/swiftdroom-demo.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--brand-header)]/50">
          Best experienced on desktop Chrome with the extension installed.
        </p>
      </div>
    </section>
  );
}
