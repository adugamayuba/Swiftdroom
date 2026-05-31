import type { Metadata } from "next";
import { getAppUrl } from "@/lib/app-url";

export const SITE_NAME = "Swiftdroom";
export const SITE_TAGLINE = "Job applications, without the repetition.";
export const DEFAULT_TITLE = "Swiftdroom — AI Job Application Autofill & Co-Pilot";
export const DEFAULT_DESCRIPTION =
  "Stop retyping your resume on every application. Swiftdroom autofills Workday, Greenhouse, and Lever forms and writes tailored AI answers from your profile.";
export const DEFAULT_KEYWORDS = [
  "job application autofill",
  "Workday autofill",
  "Greenhouse autofill",
  "Lever autofill",
  "AI job application",
  "resume autofill Chrome extension",
  "job search automation",
  "ATS autofill",
  "application co-pilot",
  "Swiftdroom",
];

export function getSiteUrl() {
  return getAppUrl();
}

export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
} = {}): Metadata {
  const url = `${getSiteUrl()}${path}`;
  const pageTitle = title ?? DEFAULT_TITLE;

  return {
    title: title ? { absolute: title } : DEFAULT_TITLE,
    description,
    keywords: DEFAULT_KEYWORDS,
    authors: [{ name: SITE_NAME, url: getSiteUrl() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: path || "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title: pageTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}
