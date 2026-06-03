"use client";

import {
  Briefcase,
  FileText,
  Mail,
  MapPin,
  PenLine,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

const ICONS = [
  { Icon: Briefcase, top: "12%", left: "8%", delay: "0s", duration: "18s" },
  { Icon: FileText, top: "22%", left: "78%", delay: "2s", duration: "22s" },
  { Icon: Mail, top: "68%", left: "12%", delay: "4s", duration: "20s" },
  { Icon: MapPin, top: "58%", left: "85%", delay: "1s", duration: "24s" },
  { Icon: PenLine, top: "38%", left: "92%", delay: "3s", duration: "19s" },
  { Icon: User, top: "78%", left: "72%", delay: "5s", duration: "21s" },
  { Icon: Zap, top: "8%", left: "55%", delay: "1.5s", duration: "17s" },
  { Icon: Sparkles, top: "48%", left: "4%", delay: "2.5s", duration: "23s" },
  { Icon: FileText, top: "85%", left: "42%", delay: "0.5s", duration: "20s" },
  { Icon: Briefcase, top: "32%", left: "62%", delay: "3.5s", duration: "25s" },
  { Icon: Mail, top: "18%", left: "28%", delay: "4.5s", duration: "18s" },
  { Icon: PenLine, top: "72%", left: "58%", delay: "1s", duration: "22s" },
];

export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {ICONS.map(({ Icon, top, left, delay, duration }, i) => (
        <div
          key={i}
          className="hero-float absolute text-[var(--al-border)]"
          style={{
            top,
            left,
            animationDelay: delay,
            animationDuration: duration,
          }}
        >
          <Icon
            className="h-6 w-6 md:h-7 md:w-7"
            strokeWidth={1.25}
            stroke="currentColor"
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}
