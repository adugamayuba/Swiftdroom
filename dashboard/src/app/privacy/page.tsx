import Link from "next/link";
import { LegalPageLayout } from "@/components/marketing/LegalPageLayout";
import { PRODUCTION_SITE_URL } from "@/lib/site";

const LAST_UPDATED = "June 4, 2026";
const CONTACT = "hello@swiftdroom.com";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        Swiftdroom (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website at{" "}
        <a href={PRODUCTION_SITE_URL}>{PRODUCTION_SITE_URL}</a>, the Swiftdroom dashboard, and the
        Swiftdroom Chrome extension (collectively, the &ldquo;Service&rdquo;). This Privacy Policy
        explains what information we collect, how we use it, and your choices.
      </p>

      <h2>1. Who this policy applies to</h2>
      <p>
        This policy applies to visitors of our website, registered users of the dashboard, and
        users of the Chrome extension. If you do not agree with this policy, please do not use the
        Service.
      </p>

      <h2>2. Information we collect</h2>
      <h3>Account and profile information</h3>
      <p>When you create an account, we may collect:</p>
      <ul>
        <li>Name and email address</li>
        <li>Password (stored in hashed form — we do not store plain-text passwords)</li>
        <li>Contact details, location, and professional links you provide (e.g. LinkedIn, GitHub)</li>
        <li>Resume text and uploaded resume files you submit for autofill and AI features</li>
        <li>Job application personas (focus areas, summaries, skills) you configure</li>
      </ul>

      <h3>Chrome extension</h3>
      <p>When you use the extension, we may process:</p>
      <ul>
        <li>
          An API authentication token stored locally in your browser via Chrome&apos;s{" "}
          <code>storage</code> permission, set when you log in on {PRODUCTION_SITE_URL}
        </li>
        <li>
          Form field labels and values on job application pages you interact with, to provide
          autofill and AI-assisted answers
        </li>
        <li>Job posting URLs and application metadata you log through the extension</li>
        <li>Your extension connection status (connected or not) on the dashboard</li>
      </ul>
      <p>
        The extension runs on job application websites (including Workday, Greenhouse, Lever, and
        company career pages). We read visible form labels on pages you visit while using the
        extension — we do not submit applications on your behalf.
      </p>

      <h3>Usage and subscription data</h3>
      <ul>
        <li>Plan type, subscription status, and application usage counts</li>
        <li>Billing information processed by Stripe (we do not store full payment card numbers)</li>
        <li>Basic technical logs (e.g. API requests, errors) for security and reliability</li>
      </ul>

      <h3>AI-generated content</h3>
      <p>
        When you request AI-written answers, we send relevant portions of your resume, profile,
        persona, and job description text to our servers and may use third-party AI providers
        (such as OpenAI) to generate draft responses. You review and insert answers yourself before
        submitting any application.
      </p>

      <h2>3. How we use your information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Provide autofill, AI answer generation, and application tracking features</li>
        <li>Authenticate you across the dashboard and Chrome extension</li>
        <li>Process subscriptions and enforce plan limits</li>
        <li>Improve reliability, security, and product experience</li>
        <li>Respond to support requests</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>4. How we share information</h2>
      <p>We may share information with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> — hosting (e.g. Vercel, Railway), database (e.g.
          Neon), payments (Stripe), file storage (Firebase), and AI (OpenAI), only as needed to
          operate the Service
        </li>
        <li>
          <strong>Legal requirements</strong> — when required by law, court order, or to protect
          rights and safety
        </li>
        <li>
          <strong>Business transfers</strong> — in connection with a merger, acquisition, or sale of
          assets, with notice where required by law
        </li>
      </ul>

      <h2>5. Data storage and security</h2>
      <p>
        Data is stored on secure cloud infrastructure in the United States and/or other regions
        where our providers operate. We use industry-standard measures including encryption in
        transit (HTTPS), hashed passwords, and access controls. No method of transmission over the
        Internet is 100% secure; we cannot guarantee absolute security.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We retain your account and profile data while your account is active. If you delete your
        account or request deletion, we will delete or anonymize personal data within a reasonable
        period, except where we must retain data for legal, tax, or fraud-prevention purposes.
      </p>

      <h2>7. Your rights and choices</h2>
      <p>Depending on your location, you may have the right to:</p>
      <ul>
        <li>Access, correct, or delete personal data we hold about you</li>
        <li>Export your profile data from the dashboard</li>
        <li>Disconnect the Chrome extension by removing it from Chrome and signing out</li>
        <li>Cancel your subscription via billing settings or Stripe customer portal</li>
        <li>Object to or restrict certain processing where applicable by law</li>
      </ul>
      <p>
        To exercise these rights, contact us at{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We will respond within a reasonable timeframe.
      </p>

      <h2>8. Cookies and local storage</h2>
      <p>
        The dashboard uses browser local storage for session tokens. The Chrome extension uses
        Chrome&apos;s local storage for your API connection. We may use analytics on our website
        (such as Vercel Analytics) to understand aggregate usage — not to sell your data.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is not intended for users under 16. We do not knowingly collect personal
        information from children. Contact us if you believe a child has provided data.
      </p>

      <h2>10. International users</h2>
      <p>
        If you access the Service from outside the United States, your information may be
        transferred to and processed in the U.S. or other countries where our providers operate.
        By using the Service, you consent to such transfer where permitted by law.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the revised policy on
        this page and update the &ldquo;Last updated&rdquo; date. Material changes may be
        communicated by email or in-product notice.
      </p>

      <h2>12. Contact us</h2>
      <p>
        Questions about this Privacy Policy or the Chrome extension&apos;s data practices:
      </p>
      <ul>
        <li>
          Email: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </li>
        <li>
          Website: <a href={PRODUCTION_SITE_URL}>{PRODUCTION_SITE_URL}</a>
        </li>
      </ul>
      <p className="mt-8 text-sm text-[var(--brand-header)]/55">
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPageLayout>
  );
}
