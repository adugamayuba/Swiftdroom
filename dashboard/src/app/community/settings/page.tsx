"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface CommunityForm {
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  website: string;
}

export default function CommunitySettingsPage() {
  const [form, setForm] = useState<CommunityForm>({
    name: "",
    slug: "",
    logoUrl: "",
    description: "",
    website: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/community")
      .then((r) => r.json())
      .then((data) => {
        if (data.community) {
          setForm({
            name: data.community.name,
            slug: data.community.slug,
            logoUrl: data.community.logoUrl,
            description: data.community.description,
            website: data.community.website,
          });
        }
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const res = await apiFetch("/api/community", {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to save.");
      return;
    }

    if (data.community) {
      setForm({
        name: data.community.name,
        slug: data.community.slug,
        logoUrl: data.community.logoUrl,
        description: data.community.description,
        website: data.community.website,
      });
    }
    setMessage("Community profile saved.");
  }

  if (loading) {
    return <p className="text-neutral-500">Loading...</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-[var(--brand-header)]">Community profile</h1>
      <p className="mt-1 text-sm text-[var(--brand-header)]/60">
        This is how your community appears on referral links and in your dashboard.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 app-card p-6">
        <div>
          <label className="block text-sm font-medium text-[var(--brand-header)]">
            Community name
          </label>
          <input
            className="app-input mt-1.5 w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Product Managers Nigeria"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--brand-header)]">
            URL slug
          </label>
          <p className="mt-0.5 text-xs text-[var(--brand-header)]/45">
            Used in referral links. Lowercase letters, numbers, and hyphens only.
          </p>
          <input
            className="app-input mt-1.5 w-full font-mono text-sm"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--brand-header)]">
            Logo URL
          </label>
          <input
            className="app-input mt-1.5 w-full"
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://..."
          />
          {form.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoUrl}
              alt=""
              className="mt-3 h-16 w-16 rounded-xl border object-cover"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--brand-header)]">
            Description
          </label>
          <textarea
            className="app-input mt-1.5 min-h-[120px] w-full"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Tell members what your community is about..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--brand-header)]">
            Website
          </label>
          <input
            className="app-input mt-1.5 w-full"
            type="url"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button type="submit" disabled={saving} className="app-btn-primary px-6 py-2.5">
          {saving ? "Saving..." : "Save community profile"}
        </button>
      </form>
    </div>
  );
}
