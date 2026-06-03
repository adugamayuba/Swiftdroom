"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardEmpty,
  DashboardPageHeader,
  DashboardSpinner,
  inputClass,
} from "@/components/dashboard/ui";

interface Persona {
  id: string;
  name: string;
  focus: string;
  summary: string;
  skills: string;
  isDefault: boolean;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    focus: "",
    summary: "",
    skills: "",
  });

  function loadPersonas() {
    apiFetch("/api/personas")
      .then((r) => r.json())
      .then((data) => {
        setPersonas(data.personas || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadPersonas();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", focus: "", summary: "", skills: "" });
    setShowForm(false);
    loadPersonas();
  }

  async function setDefault(id: string) {
    await apiFetch(`/api/personas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    loadPersonas();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this persona?")) return;
    await apiFetch(`/api/personas/${id}`, { method: "DELETE" });
    loadPersonas();
  }

  if (loading) return <DashboardSpinner />;

  return (
    <div className="max-w-3xl">
      <DashboardPageHeader
        title="Personas"
        subtitle="Context vectors for AI — switch focus per application"
        action={
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="app-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add persona
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="app-card mt-6 p-6">
          <h2 className="font-semibold text-[var(--brand-header)]">New persona</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Name (e.g. Full-Stack Focus)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="Focus (e.g. React, Node, AWS)"
              value={form.focus}
              onChange={(e) => setForm({ ...form, focus: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Experience summary for this persona..."
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            rows={4}
            className={`${inputClass} mt-4`}
          />
          <input
            placeholder="Key skills (comma-separated)"
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            className={`${inputClass} mt-4`}
          />
          <div className="mt-4 flex gap-2">
            <button type="submit" className="app-btn-primary">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="app-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {personas.map((persona) => (
          <DashboardCard key={persona.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--brand-header)]">{persona.name}</h3>
                  {persona.isDefault && (
                    <span className="rounded-sm bg-[var(--brand-lavender)] px-2 py-0.5 text-xs font-medium text-[var(--brand-header)]">
                      Default
                    </span>
                  )}
                </div>
                {persona.focus && (
                  <p className="mt-1 text-sm text-[var(--brand-tag-text)]">{persona.focus}</p>
                )}
                {persona.summary && (
                  <p className="mt-2 text-sm text-[var(--brand-header)]/65">{persona.summary}</p>
                )}
                {persona.skills && (
                  <p className="mt-2 text-xs text-[var(--brand-header)]/45">
                    Skills: {persona.skills}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {!persona.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault(persona.id)}
                    title="Set as default"
                    className="rounded-md p-2 text-[var(--brand-header)]/45 hover:bg-[var(--brand-mint)] hover:text-[var(--brand-header)]"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(persona.id)}
                  className="rounded-md p-2 text-[var(--brand-header)]/45 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </DashboardCard>
        ))}

        {personas.length === 0 && (
          <DashboardEmpty message="No personas yet. Create one to tailor AI answers per role type." />
        )}
      </div>
    </div>
  );
}
