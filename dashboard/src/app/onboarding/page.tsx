"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { friendlyUserMessage } from "@/lib/user-messages";

type ExtractedContact = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
};

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  resumeText: string;
  resumeFileName: string;
};

const EMPTY_PROFILE: Profile = {
  fullName: "", email: "", phone: "", location: "",
  linkedinUrl: "", githubUrl: "", portfolioUrl: "",
  resumeText: "", resumeFileName: "",
};

export default function OnboardingPage() {
  const router = useRouter();

  // step: "upload" | "review" | "saving"
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extractedKeys, setExtractedKeys] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  useEffect(() => {
    apiFetch("/api/me").then(async (r) => {
      if (!r.ok) { router.push("/login"); return; }
      const data = await r.json();
      if (data.onboardingComplete) {
        router.push(data.hasActiveSubscription ? "/dashboard" : "/subscribe");
      }
    });
    apiFetch("/api/profile").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      if (data.profile) setProfile((p) => ({ ...EMPTY_PROFILE, ...data.profile }));
    });
  }, [router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch("/api/upload/resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          friendlyUserMessage(data.error, "We couldn't upload your resume. Please try again.")
        );
      }

      const extracted: ExtractedContact = data.extracted || {};
      const keys = Object.entries(extracted)
        .filter(([, v]) => v)
        .map(([k]) => k);
      setExtractedKeys(keys);

      // Merge extracted into profile state — only fill blanks
      setProfile((p) => ({
        ...p,
        resumeText: data.resumeText,
        resumeFileName: data.resumeFileName,
        fullName: p.fullName || extracted.fullName || "",
        email: p.email || extracted.email || "",
        phone: p.phone || extracted.phone || "",
        location: p.location || extracted.location || "",
        linkedinUrl: p.linkedinUrl || extracted.linkedinUrl || "",
        githubUrl: p.githubUrl || extracted.githubUrl || "",
        portfolioUrl: p.portfolioUrl || extracted.portfolioUrl || "",
      }));

      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't upload your resume. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.fullName.trim()) { setError("Full name is required."); return; }
    if (!profile.email.trim()) { setError("Email is required."); return; }

    setSaving(true);
    setError("");

    const res = await apiFetch("/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        ...profile,
        // Always include resumeText explicitly so the PUT never clears it
        resumeText: profile.resumeText || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(
        friendlyUserMessage(data.error, "We couldn't save your profile. Please try again.")
      );
      return;
    }
    if (data.onboardingComplete) {
      router.push("/subscribe");
    } else {
      const missing: string[] = data.missing || [];
      if (missing.includes("resume text")) {
        setError("Your resume text wasn't saved — go back and re-upload your PDF.");
      } else if (missing.length > 0) {
        setError(`Please fill in: ${missing.join(", ")}.`);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  function Field({
    label, fieldKey, type = "text", placeholder = "", autoExtracted = false,
  }: {
    label: string; fieldKey: keyof Profile; type?: string; placeholder?: string; autoExtracted?: boolean;
  }) {
    const value = profile[fieldKey];
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-700">
            {label}
            {(fieldKey === "fullName" || fieldKey === "email") && (
              <span className="ml-1 text-red-400">*</span>
            )}
          </label>
          {autoExtracted && value && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              from resume
            </span>
          )}
        </div>
        <input
          type={type}
          required={fieldKey === "fullName" || fieldKey === "email"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setProfile((p) => ({ ...p, [fieldKey]: e.target.value }))}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition ${
            autoExtracted && value
              ? "border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              : "border-neutral-300 bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          }`}
        />
      </div>
    );
  }

  const wasExtracted = (key: string) => extractedKeys.includes(key);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-base font-bold tracking-tight text-neutral-900">
            Swiftdroom
          </Link>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <span className={step === "upload" ? "font-semibold text-neutral-900" : ""}>
              1. Resume
            </span>
            <span>→</span>
            <span className={step === "review" ? "font-semibold text-neutral-900" : ""}>
              2. Confirm details
            </span>
            <span>→</span>
            <span className="text-neutral-300">3. Subscribe</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === "upload" && (
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Upload your resume</h1>
            <p className="mt-2 text-neutral-500">
              We'll read your contact details and experience automatically. You review before saving.
            </p>

            <label className={`mt-8 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition ${
              uploading
                ? "border-blue-300 bg-blue-50"
                : "border-neutral-300 bg-white hover:border-neutral-400 hover:bg-neutral-50"
            }`}>
              {uploading ? (
                <>
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  <div>
                    <p className="font-medium text-blue-700">Reading your resume…</p>
                    <p className="mt-1 text-sm text-blue-500">Extracting contact details</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
                    <Upload className="h-6 w-6 text-neutral-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">Click to upload your resume</p>
                    <p className="mt-1 text-sm text-neutral-400">PDF · up to 10 MB</p>
                  </div>
                </>
              )}
              <input
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>

            <p className="mt-4 text-sm text-neutral-400">
              We extract your name, email, phone, location, and links automatically.
              You'll review everything before we save it.
            </p>
          </div>
        )}

        {step === "review" && (
          <form onSubmit={handleSave}>
            <div className="mb-8 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Resume uploaded — {profile.resumeFileName}
                </p>
                {extractedKeys.length > 0 ? (
                  <p className="mt-0.5 text-sm text-emerald-700">
                    Auto-filled {extractedKeys.length} field{extractedKeys.length !== 1 ? "s" : ""} from your resume.
                    Fields highlighted in green were detected automatically — edit anything that looks wrong.
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-emerald-700">
                    Text extracted. Fill in your contact details below.
                  </p>
                )}
              </div>
            </div>

            <h1 className="text-2xl font-bold text-neutral-900">Confirm your details</h1>
            <p className="mt-1 text-neutral-500">
              Review what we found and fill in anything that's missing.
            </p>

            <div className="mt-8 space-y-6">
              <div className="rounded-xl border border-neutral-200 bg-white p-6">
                <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                  Contact
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" fieldKey="fullName" placeholder="Jane Smith" autoExtracted={wasExtracted("fullName")} />
                  <Field label="Email" fieldKey="email" type="email" placeholder="jane@email.com" autoExtracted={wasExtracted("email")} />
                  <Field label="Phone" fieldKey="phone" type="tel" placeholder="+1 (555) 000-0000" autoExtracted={wasExtracted("phone")} />
                  <Field label="Location" fieldKey="location" placeholder="San Francisco, CA" autoExtracted={wasExtracted("location")} />
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-6">
                <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                  Links <span className="ml-1 font-normal normal-case text-neutral-400">(optional)</span>
                </h2>
                <div className="space-y-4">
                  <Field label="LinkedIn" fieldKey="linkedinUrl" type="url" placeholder="https://linkedin.com/in/yourname" autoExtracted={wasExtracted("linkedinUrl")} />
                  <Field label="GitHub" fieldKey="githubUrl" type="url" placeholder="https://github.com/yourname" autoExtracted={wasExtracted("githubUrl")} />
                  <Field label="Portfolio" fieldKey="portfolioUrl" type="url" placeholder="https://yoursite.com" autoExtracted={wasExtracted("portfolioUrl")} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setStep("upload"); setError(""); }}
                className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Change resume
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : <>Save and continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
