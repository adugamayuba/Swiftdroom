import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = `${SITE_NAME} — AI job application autofill`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#f6f6f4",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            color: "#0a0a0a",
            lineHeight: 1.05,
          }}
        >
          Built to apply at scale
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 22,
            color: "#6b6b66",
            maxWidth: 820,
            lineHeight: 1.5,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {DEFAULT_DESCRIPTION}
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 600, color: "#0a0a0a" }}>
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 16, color: "#00a86b" }}>
            Workday · Greenhouse · Lever
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
