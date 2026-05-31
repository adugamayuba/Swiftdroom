"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        if (!r.ok) {
          router.push("/login");
          return null;
        }
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
      const res = await apiFetch("/api/upload/resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setProfile((p) => ({
        ...p,
        resumeText: data.resumeText,
        resumeFileName: data.resumeFileName,
      }));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await apiFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to save profile");
      return;
    }

    if (data.onboardingComplete) {
      router.push("/subscribe");
    } else {
      setError("Please upload your resume and fill in all required fields.");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold text-neutral-900">
            Swiftdroom
          </Link>
          <span className="text-sm text-neutral-500">Step {step} of 2</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Set up your profile
        </h1>
        <p className="mt-2 text-neutral-600">
          This information powers autofill and AI answer generation. You only enter it once.
        </p>

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-8">
            <h2 className="font-medium text-neutral-900">Upload your resume</h2>
            <p className="mt-1 text-sm text-neutral-500">
              PDF or text file. We extract the content so AI can write tailored answers.
            </p>
            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 px-6 py-12 hover:border-neutral-400">
              <span className="text-sm font-medium text-neutral-700">
                {profile.resumeFileName || "Choose a file or drag it here"}
              </span>
              <span className="mt-1 text-xs text-neutral-400">PDF, TXT, or MD up to 10MB</span>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={handleResumeUpload}
                disabled={loading}
              />
            </label>
            {profile.resumeText && (
              <button
                onClick={() => setStep(2)}
                className="mt-6 w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleComplete} className="mt-8 space-y-6">
            <div className="rounded-lg border border-neutral-200 bg-white p-8">
              <h2 className="font-medium text-neutral-900">Basic details</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  ["fullName", "Full name", true],
                  ["email", "Email", true],
                  ["phone", "Phone", false],
                  ["location", "Location", false],
                ].map(([key, label, required]) => (
                  <div key={key as string}>
                    <label className="block text-sm font-medium text-neutral-700">
                      {label}
                    </label>
                    <input
                      required={required as boolean}
                      type={key === "email" ? "email" : "text"}
                      value={profile[key as keyof typeof profile]}
                      onChange={(e) =>
                        setProfile({ ...profile, [key as string]: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-8">
              <h2 className="font-medium text-neutral-900">Links</h2>
              <div className="mt-6 space-y-4">
                {[
                  ["linkedinUrl", "LinkedIn URL"],
                  ["githubUrl", "GitHub URL"],
                  ["portfolioUrl", "Portfolio URL"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-neutral-700">
                      {label}
                    </label>
                    <input
                      type="url"
                      value={profile[key as keyof typeof profile]}
                      onChange={(e) =>
                        setProfile({ ...profile, [key as string]: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Continue to plans"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
