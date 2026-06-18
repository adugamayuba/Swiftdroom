"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { DashboardCard, DashboardPageHeader, DashboardSpinner } from "@/components/dashboard/ui";

export default function TailorResumePage() {
  const searchParams = useSearchParams();
  const [html, setHtml] = useState("");
  const [plainText, setPlainText] = useState("");
  const [fileName, setFileName] = useState("swiftdroom-resume.html");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const company = searchParams.get("company") || "";
  const role = searchParams.get("role") || "";
  const jobDescription = searchParams.get("jd") || "";

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      const res = await apiFetch("/api/resume/tailor", {
        method: "POST",
        body: JSON.stringify({ company, role, jobDescription }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Could not tailor resume");
        return;
      }
      setHtml(data.html || "");
      setPlainText(data.plainText || "");
      if (data.fileName) setFileName(data.fileName);
    }
    void run();
  }, [company, role, jobDescription]);

  function downloadHtml() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPlainText() {
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.html$/i, ".txt");
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  if (loading) return <DashboardSpinner />;

  return (
    <div className="max-w-4xl">
      <DashboardPageHeader
        title="Tailored resume"
        subtitle={role && company ? `${role} at ${company}` : "Optimized for this job"}
      />

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && (
        <>
          <p className="mt-4 text-sm text-[var(--brand-header)]/65">
            Professional layout tuned for this role. Download the HTML file or use Print → Save as PDF
            for a polished copy to attach or upload.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={printPdf} className="app-btn-primary">
              Download PDF (Print)
            </button>
            <button type="button" onClick={downloadHtml} className="app-btn-secondary">
              Download resume (.html)
            </button>
            <button type="button" onClick={downloadPlainText} className="app-btn-secondary">
              Download plain text
            </button>
            <Link href="/dashboard/jobs" className="app-btn-secondary">
              Back to jobs
            </Link>
          </div>

          <DashboardCard className="mt-6 overflow-hidden p-0 shadow-sm ring-1 ring-[var(--border)]">
            <iframe
              title="Tailored resume preview"
              srcDoc={html}
              className="h-[900px] w-full border-0 bg-white"
            />
          </DashboardCard>

          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-[var(--brand-header)]/65">
              Plain text version
            </summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-md border border-[var(--border)] bg-white p-4 text-xs">
              {plainText}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
