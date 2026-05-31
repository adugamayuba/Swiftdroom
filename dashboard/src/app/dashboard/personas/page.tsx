"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

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

  if (loading) return <p className="text-slate-500">Loading personas...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Personas</h1>
          <p className="mt-1 text-slate-500">
            Context vectors for AI — switch focus per application
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add persona
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
        >
          <h2 className="font-semibold text-slate-900">New persona</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Name (e.g. Full-Stack Focus)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Focus (e.g. React, Node, AWS)"
              value={form.focus}
              onChange={(e) => setForm({ ...form, focus: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="Experience summary for this persona..."
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            rows={4}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Key skills (comma-separated)"
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {persona.name}
                  </h3>
                  {persona.isDefault && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Default
                    </span>
                  )}
                </div>
                {persona.focus && (
                  <p className="mt-1 text-sm text-indigo-600">{persona.focus}</p>
                )}
                {persona.summary && (
                  <p className="mt-2 text-sm text-slate-600">{persona.summary}</p>
                )}
                {persona.skills && (
                  <p className="mt-2 text-xs text-slate-400">
                    Skills: {persona.skills}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {!persona.isDefault && (
                  <button
                    onClick={() => setDefault(persona.id)}
                    title="Set as default"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-amber-500"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(persona.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {personas.length === 0 && (
          <p className="text-center text-slate-500">
            No personas yet. Create one to tailor AI answers per role type.
          </p>
        )}
      </div>
    </div>
  );
}
