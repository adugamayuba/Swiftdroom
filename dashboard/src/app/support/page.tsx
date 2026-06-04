import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { LegalPageLayout } from "@/components/marketing/LegalPageLayout";
import { CHROME_WEB_STORE_URL } from "@/lib/chrome-store";
import { PRODUCTION_SITE_URL } from "@/lib/site";

const CONTACT = "hello@swiftdroom.com";

export default function SupportPage() {
  return (
    <LegalPageLayout title="Support" lastUpdated="June 4, 2026">
      <p>
        We&apos;re here to help you get the most out of Swiftdroom — the dashboard at{" "}
        <a href={PRODUCTION_SITE_URL}>{PRODUCTION_SITE_URL}</a> and the Chrome extension. Reach out
        anytime and we&apos;ll get back to you as soon as we can.
      </p>

      <div className="not-prose mt-8 flex flex-col gap-4 sm:flex-row">
        <a
          href={`mailto:${CONTACT}`}
          className="al-btn-lavender inline-flex items-center justify-center gap-2"
        >
          <Mail className="h-4 w-4" aria-hidden />
          Email {CONTACT}
        </a>
        {CHROME_WEB_STORE_URL ? (
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-neutral-50 px-5 py-2.5 text-sm font-medium text-[var(--brand-header)] hover:border-[var(--brand-header)]/30"
          >
            Chrome extension
          </a>
        ) : null}
      </div>

      <h2>Common topics</h2>

      <h3>Getting started</h3>
      <ul>
        <li>
          Create an account at <Link href="/register">Sign up</Link>, complete your profile and
          resume, then choose a plan.
        </li>
        <li>
          Install the Chrome extension from the Web Store and log in on{" "}
          {PRODUCTION_SITE_URL} — it connects automatically.
        </li>
        <li>
          Open a job application (Workday, Greenhouse, Lever, or a company careers page), open the
          Swiftdroom side panel, and use <strong>Scan &amp; Autofill</strong>.
        </li>
      </ul>

      <h3>Chrome extension</h3>
      <ul>
        <li>
          <strong>Not connecting?</strong> Make sure you&apos;re logged into the dashboard in the same
          browser profile, then refresh <Link href="/dashboard/settings">Settings</Link>.
        </li>
        <li>
          <strong>Fields not filling?</strong> Run Scan &amp; Autofill once per page. Map any
          uncertain fields in the side panel before submitting.
        </li>
        <li>
          <strong>AI answers:</strong> Ghostwriter drafts are suggestions — review and edit before
          you submit any application.
        </li>
      </ul>

      <h3>Billing &amp; plans</h3>
      <ul>
        <li>
          Manage your subscription from{" "}
          <Link href="/dashboard/settings">Dashboard → Settings</Link> via the Stripe billing portal.
        </li>
        <li>
          Application limits reset each billing period. Your usage appears on the Settings page.
        </li>
        <li>
          For charge questions or refunds, email {CONTACT} with the email on your account.
        </li>
      </ul>

      <h3>Account &amp; data</h3>
      <ul>
        <li>
          Password reset and login issues: use <Link href="/login">Log in</Link> or contact us if
          you&apos;re locked out.
        </li>
        <li>
          Privacy and data handling: see our <Link href="/privacy">Privacy Policy</Link>.
        </li>
        <li>
          To request account or data deletion, email {CONTACT} from your registered address.
        </li>
      </ul>

      <h2>Response time</h2>
      <p>
        We typically reply within one business day (Monday–Friday, US time). Urgent billing or
        access issues are prioritized.
      </p>

      <h2>Before you write</h2>
      <p>Including these details helps us resolve issues faster:</p>
      <ul>
        <li>The email on your Swiftdroom account</li>
        <li>Browser and OS (e.g. Chrome on macOS)</li>
        <li>The job application URL or ATS (Workday, Greenhouse, etc.)</li>
        <li>Screenshots of the side panel or any error message</li>
      </ul>

      <p className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--brand-mint)]/40 p-4 text-sm">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-header)]" aria-hidden />
        <span>
          Swiftdroom never submits applications on your behalf. If something looks wrong on an
          employer site, pause and contact us — we&apos;re happy to help troubleshoot.
        </span>
      </p>

      <p>
        See also our <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPageLayout>
  );
}
