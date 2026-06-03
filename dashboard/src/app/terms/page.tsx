import Link from "next/link";
import { LegalPageLayout } from "@/components/marketing/LegalPageLayout";
import { PRODUCTION_SITE_URL } from "@/lib/site";

const LAST_UPDATED = "June 4, 2026";
const CONTACT = "hello@swiftdroom.com";

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Swiftdroom at{" "}
        <a href={PRODUCTION_SITE_URL}>{PRODUCTION_SITE_URL}</a>, including our website, dashboard,
        and Chrome extension (the &ldquo;Service&rdquo;). By creating an account or using the
        Service, you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Swiftdroom is a job application co-pilot. It helps you autofill application forms and
        generate draft answers using your profile and resume. <strong>You are solely responsible</strong> for
        reviewing all autofilled content and submitted applications. Swiftdroom does not submit
        applications on your behalf.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 16 years old and able to form a binding contract. You must provide
        accurate account information and keep your credentials secure.
      </p>

      <h2>3. Accounts and subscriptions</h2>
      <ul>
        <li>Some features require a paid subscription after profile setup.</li>
        <li>Plan limits (e.g. applications per month) apply as described at checkout.</li>
        <li>Payments are processed by Stripe; subscription terms follow the plan you select.</li>
        <li>You may cancel according to billing settings; fees already paid are non-refundable except where required by law.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful, fraudulent, or misleading purposes</li>
        <li>Submit false information in job applications</li>
        <li>Attempt to reverse engineer, abuse, or overload our systems</li>
        <li>Share account credentials or resell access without permission</li>
        <li>Use automated means to circumvent usage limits</li>
      </ul>

      <h2>5. Your content</h2>
      <p>
        You retain ownership of resume and profile content you upload. You grant us a limited
        license to host, process, and display that content solely to provide the Service,
        including AI-assisted features you request.
      </p>

      <h2>6. AI-generated content</h2>
      <p>
        AI outputs are suggestions only. We do not guarantee accuracy, completeness, or that
        employers will accept AI-assisted answers. You must verify all content before use.
      </p>

      <h2>7. Third-party sites</h2>
      <p>
        The extension interacts with third-party job application sites (employers, ATS platforms).
        We are not affiliated with Workday, Greenhouse, Lever, or listed employers. Their terms
        apply when you use their sites.
      </p>

      <h2>8. Disclaimer of warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES
        OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT UNINTERRUPTED OR ERROR-FREE OPERATION.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, SWIFTDROOM AND ITS AFFILIATES SHALL NOT BE LIABLE
        FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
        PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR
        ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE
        CLAIM, OR ONE HUNDRED U.S. DOLLARS ($100), WHICHEVER IS GREATER.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify Swiftdroom against claims arising from your use of the Service,
        your job applications, or your violation of these Terms or applicable law.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate access for
        violation of these Terms or for operational reasons, with notice where reasonable.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may modify these Terms. Continued use after changes constitutes acceptance. Material
        changes will be posted on this page with an updated date.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of the United States and the State of Delaware,
        without regard to conflict-of-law principles, except where mandatory local law applies.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
      <p className="mt-8 text-sm text-[var(--brand-header)]/55">
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPageLayout>
  );
}
