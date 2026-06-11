import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import {
  buildPageMetadata,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
} from "@/lib/seo";
import SessionKeeper from "@/components/SessionKeeper";
import { MobileDesktopBanner } from "@/components/MobileDesktopNotice";
import { MarketingWidgets } from "@/components/MarketingWidgets";
import { GoogleAdsTag } from "@/components/GoogleAdsTag";
import { getApiUrlEnv } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...buildPageMetadata(),
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    ...buildPageMetadata().openGraph,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — AI job application autofill`,
      },
    ],
  },
  twitter: {
    ...buildPageMetadata().twitter,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  other: {
    "swiftdroom-api-url":
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl = getApiUrlEnv();

  return (
    <html lang="en">
      <head>
        {apiUrl ? <meta name="swiftdroom-api-url" content={apiUrl} /> : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAdsTag />
        <SessionKeeper />
        {children}
        <MobileDesktopBanner />
        <MarketingWidgets />
        <Analytics />
      </body>
    </html>
  );
}
