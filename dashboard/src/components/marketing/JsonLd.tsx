import { DEFAULT_DESCRIPTION, getSiteUrl, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

const FAQ_ITEMS = [
  {
    question: "Does Swiftdroom submit applications for me?",
    answer:
      "No. Swiftdroom is a co-pilot. It fills fields and generates draft answers, but you review everything and submit manually.",
  },
  {
    question: "What counts as an application?",
    answer:
      "Each time you log an application or generate an AI answer through the extension counts toward your monthly limit.",
  },
  {
    question: "Can I use Swiftdroom without subscribing?",
    answer:
      "You can create an account and set up your profile for free. The Chrome extension requires an active subscription.",
  },
  {
    question: "Which job boards are supported?",
    answer:
      "Swiftdroom works on most web-based application forms, including Workday, Greenhouse, Lever, and company career pages.",
  },
];

export function HomeJsonLd() {
  const url = getSiteUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url,
    description: SITE_TAGLINE,
    logo: `${url}/opengraph-image`,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description: DEFAULT_DESCRIPTION,
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Chrome",
    description: DEFAULT_DESCRIPTION,
    url,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free profile setup; paid plans for extension access",
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
    </>
  );
}
