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
          background: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #ffffff 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#0a0a0a",
            lineHeight: 1.1,
          }}
        >
          Stop retyping your resume.
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#737373",
            lineHeight: 1.2,
          }}
        >
          Start getting interviews.
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 24,
            color: "#525252",
            maxWidth: 820,
            lineHeight: 1.5,
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
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#0a0a0a",
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#a3a3a3",
            }}
          >
            Workday · Greenhouse · Lever
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
