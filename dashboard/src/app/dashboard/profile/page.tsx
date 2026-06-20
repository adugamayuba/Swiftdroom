"use client";

import { useEffect, useState } from "react";
import { Save, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardSpinner,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/dashboard/ui";

interface Profile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  resumeText: string;
  resumeFileName: string;
}

const emptyProfile: Profile = {
  fullName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  resumeText: "",
  resumeFileName: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setProfile({ ...emptyProfile, ...data.profile });
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await apiFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setProfile((p) => ({
        ...p,
        resumeText: text.slice(0, 50000),
        resumeFileName: file.name,
      }));
    };
    reader.readAsText(file);
  }

  if (loading) return <DashboardSpinner />;

  return (
    <div className="max-w-2xl">
      <DashboardPageHeader
        title="Profile"
        subtitle="Your baseline data, the source of truth for autofill"
      />

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <DashboardCard className="p-6">
          <h2 className="font-semibold text-[var(--brand-header)]">Basic info</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              value={profile.fullName}
              onChange={(v) => setProfile({ ...profile, fullName: v })}
            />
            <Field
              label="Email"
              type="email"
              value={profile.email}
              onChange={(v) => setProfile({ ...profile, email: v })}
            />
            <Field
              label="Phone"
              value={profile.phone}
              onChange={(v) => setProfile({ ...profile, phone: v })}
            />
            <Field
              label="Location"
              value={profile.location}
              onChange={(v) => setProfile({ ...profile, location: v })}
              placeholder="City, State"
            />
          </div>
        </DashboardCard>

        <DashboardCard className="p-6">
          <h2 className="font-semibold text-[var(--brand-header)]">Links</h2>
          <div className="mt-4 space-y-4">
            <Field
              label="LinkedIn"
              value={profile.linkedinUrl}
              onChange={(v) => setProfile({ ...profile, linkedinUrl: v })}
              placeholder="https://linkedin.com/in/..."
            />
            <Field
              label="GitHub"
              value={profile.githubUrl}
              onChange={(v) => setProfile({ ...profile, githubUrl: v })}
              placeholder="https://github.com/..."
            />
            <Field
              label="Portfolio"
              value={profile.portfolioUrl}
              onChange={(v) => setProfile({ ...profile, portfolioUrl: v })}
              placeholder="https://..."
            />
          </div>
        </DashboardCard>

        <DashboardCard className="p-6">
          <h2 className="font-semibold text-[var(--brand-header)]">Resume</h2>
          <p className="mt-1 text-sm text-[var(--brand-header)]/55">
            Paste or upload your resume text. AI uses this for tailored answers.
          </p>
          <div className="mt-4">
            <label className="app-btn-secondary inline-flex cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload text file
              <input
                type="file"
                accept=".txt,.md"
                className="hidden"
                onChange={handleResumeUpload}
              />
            </label>
            {profile.resumeFileName && (
              <span className="ml-3 text-sm text-[var(--brand-header)]/55">
                {profile.resumeFileName}
              </span>
            )}
          </div>
          <textarea
            value={profile.resumeText}
            onChange={(e) =>
              setProfile({ ...profile, resumeText: e.target.value })
            }
            rows={12}
            placeholder="Paste your resume content here..."
            className={textareaClass}
          />
        </DashboardCard>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="app-btn-primary">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save profile"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600">Profile saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}
