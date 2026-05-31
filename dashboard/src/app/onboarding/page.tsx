"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, ArrowRight, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeMode, setResumeMode] = useState<"upload" | "paste">("upload");
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    resumeText: "",
    resumeFileName: "",
  });

  useEffect(() => {
    apiFetch("/api/me")
      .then((r) => {
        if (!r.ok) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.onboardingComplete) {
          router.push(data.hasActiveSubscription ? "/dashboard" : "/subscribe");
        }
      });

    apiFetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile((p) => ({ ...p, ...data.profile }));
      });
  }, [router]);

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch("/api/upload/resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setProfile((p) => ({ ...p, resumeText: data.resumeText, resumeFileName: data.resumeFileName }));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasteResume() {
    if (!profile.resumeText.trim()) {
      setError("Please paste your resume text before continuing.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.resumeText.trim()) {
      setError("Resume text is required. Go back and upload or paste your resume.");
      return;
    }
    if (!profile.fullName.trim() || !profile.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await apiFetch("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed to save profile"); return; }
    if (data.onboardingComplete) {
      router.push("/subscribe");
    } else {
      setError("Please make sure your full name, email, and resume are all filled in.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            Swiftdroom
          </Link>
          <div className="flex items-center gap-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step > s ? "bg-emerald-500 text-white" :
                  step === s ? "bg-indigo-500 text-white" :
                  "bg-white/10 text-white/40"
                }`}>
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                <span className={`hidden text-xs sm:block ${step === s ? "text-white" : "text-white/40"}`}>
                  {s === 1 ? "Resume" : "Details"}
                </span>
                {s < 2 && <div className={`h-px w-8 ${step > s ? "bg-emerald-500" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            {step === 1 ? "Add your resume" : "Tell us about yourself"}
          </h1>
          <p className="mt-2 text-indigo-300">
            {step === 1
              ? "This powers autofill and AI answer generation — you only enter it once."
              : "We use this to autofill applications faster."}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2 rounded-xl bg-white/5 p-1">
              {(["upload", "paste"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setResumeMode(mode); setError(""); }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    resumeMode === mode
                      ? "bg-indigo-600 text-white shadow"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {mode === "upload" ? "Upload file" : "Paste text"}
                </button>
              ))}
            </div>

            {resumeMode === "upload" ? (
              <label className={`group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 transition-all ${
                loading ? "border-indigo-500 bg-indigo-500/10" :
                profile.resumeFileName ? "border-emerald-500/50 bg-emerald-500/5" :
                "border-white/20 bg-white/5 hover:border-indigo-500/50 hover:bg-white/10"
              }`}>
                {profile.resumeFileName ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
                      <CheckCircle className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-emerald-400">{profile.resumeFileName}</p>
                      <p className="mt-1 text-sm text-white/40">Click to replace</p>
                    </div>
                  </>
                ) : loading ? (
                  <>
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                    <p className="text-sm text-indigo-300">Extracting resume text...</p>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 transition-all group-hover:bg-indigo-500/30">
                      <Upload className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-white">Drop your resume here</p>
                      <p className="mt-1 text-sm text-white/40">PDF, TXT, or MD · up to 10 MB</p>
                    </div>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={handleResumeUpload}
                  disabled={loading}
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-white/60">
                  <FileText className="h-4 w-4" />
                  Paste your full resume text
                </div>
                <textarea
                  rows={12}
                  value={profile.resumeText}
                  onChange={(e) => setProfile({ ...profile, resumeText: e.target.value })}
                  placeholder="Paste the full text of your resume here — work experience, skills, education, everything..."
                  className="w-full resize-none bg-transparent text-sm text-white placeholder-white/20 outline-none"
                />
                {profile.resumeText.length > 0 && (
                  <p className="mt-2 text-right text-xs text-white/30">{profile.resumeText.length} chars</p>
                )}
              </div>
            )}

            {(profile.resumeFileName || (resumeMode === "paste" && profile.resumeText)) && (
              <button
                onClick={resumeMode === "upload" ? () => setStep(2) : handlePasteResume}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleComplete} className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-5 font-semibold text-white">Basic details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ["fullName", "Full name", "text", true],
                  ["email", "Email", "email", true],
                  ["phone", "Phone", "tel", false],
                  ["location", "Location", "text", false],
                ] as [string, string, string, boolean][]).map(([key, label, type, required]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-medium text-white/70">
                      {label} {required && <span className="text-indigo-400">*</span>}
                    </label>
                    <input
                      required={required}
                      type={type}
                      value={profile[key as keyof typeof profile]}
                      onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-5 font-semibold text-white">Links <span className="ml-2 text-sm font-normal text-white/30">(optional)</span></h2>
              <div className="space-y-4">
                {([
                  ["linkedinUrl", "LinkedIn URL", "https://linkedin.com/in/yourname"],
                  ["githubUrl", "GitHub URL", "https://github.com/yourname"],
                  ["portfolioUrl", "Portfolio URL", "https://yoursite.com"],
                ] as [string, string, string][]).map(([key, label, placeholder]) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-sm font-medium text-white/70">{label}</label>
                    <input
                      type="url"
                      placeholder={placeholder}
                      value={profile[key as keyof typeof profile]}
                      onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/60 transition hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 active:scale-95"
              >
                {loading ? "Saving..." : <>Continue to plans <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
