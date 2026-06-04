"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Star, Pencil, Upload, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardEmpty,
  DashboardPageHeader,
  DashboardSpinner,
  inputClass,
  labelClass,
  textareaClass,
} from "@/components/dashboard/ui";

interface Persona {
  id: string;
  name: string;
  focus: string;
  summary: string;
  skills: string;
  resumeText: string;
  resumeFileName: string;
  isDefault: boolean;
}

const emptyForm = {
  name: "",
  focus: "",
  summary: "",
  skills: "",
  resumeText: "",
  resumeFileName: "",
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
    setSaving(true);
    await apiFetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    setCreateForm(emptyForm);
    setShowCreate(false);
    setSaving(false);
    loadPersonas();
  }

  function startEdit(persona: Persona) {
    setEditingId(persona.id);
    setEditForm({
      name: persona.name,
      focus: persona.focus,
      summary: persona.summary,
      skills: persona.skills,
      resumeText: persona.resumeText,
      resumeFileName: persona.resumeFileName,
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    await apiFetch(`/api/personas/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    setEditingId(null);
    loadPersonas();
  }

  async function handleResumeUpload(personaId: string, file: File, isEdit: boolean) {
    setUploadingId(personaId);
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiFetch(`/api/personas/${personaId}/resume`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploadingId(null);

    if (!res.ok) {
      alert(data.error || "Upload failed");
      return;
    }

    if (isEdit && data.persona) {
      setEditForm((f) => ({
        ...f,
        resumeText: data.persona.resumeText,
        resumeFileName: data.persona.resumeFileName,
      }));
    }
    loadPersonas();
  }

  function handleResumeTextFile(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<typeof emptyForm>>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setter((f) => ({
        ...f,
        resumeText: (reader.result as string).slice(0, 50000),
        resumeFileName: file.name,
      }));
    };
    reader.readAsText(file);
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
    if (editingId === id) setEditingId(null);
    loadPersonas();
  }

  function ResumeFields({
    form,
    setForm,
    personaId,
    isEdit,
  }: {
    form: typeof emptyForm;
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
    personaId?: string;
    isEdit: boolean;
  }) {
    return (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--brand-mint)]/20 p-4">
        <p className={labelClass}>Resume for this persona</p>
        <p className="mt-1 text-xs text-[var(--brand-header)]/55">
          Used for AI answers when this persona is selected in the extension. Contact autofill
          still uses your main profile.
        </p>
        {form.resumeFileName && (
          <p className="mt-2 text-sm text-[var(--brand-header)]">
            File: <span className="font-medium">{form.resumeFileName}</span>
          </p>
        )}
        <textarea
          placeholder="Paste resume text, or upload a file below..."
          value={form.resumeText}
          onChange={(e) => setForm({ ...form, resumeText: e.target.value })}
          rows={6}
          className={`${textareaClass} mt-3`}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="app-btn-secondary cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload PDF
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (personaId && file.name.toLowerCase().endsWith(".pdf")) {
                  handleResumeUpload(personaId, file, isEdit);
                } else if (file.name.toLowerCase().endsWith(".txt")) {
                  handleResumeTextFile(e, setForm);
                } else if (personaId) {
                  handleResumeUpload(personaId, file, isEdit);
                } else {
                  alert("Save the persona first, then upload a PDF.");
                }
                e.target.value = "";
              }}
            />
          </label>
          {uploadingId === personaId && (
            <span className="text-xs text-[var(--brand-header)]/55">Uploading…</span>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <DashboardSpinner />;

  return (
    <div className="max-w-3xl">
      <DashboardPageHeader
        title="Personas"
        subtitle="Tailor resumes and AI context for different role types"
        action={
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="app-btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add persona
          </button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="app-card mt-6 p-6">
          <h2 className="font-semibold text-[var(--brand-header)]">New persona</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="Name (e.g. Product Manager)"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="Focus (e.g. B2B SaaS, growth)"
              value={createForm.focus}
              onChange={(e) => setCreateForm({ ...createForm, focus: e.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            placeholder="Experience summary for this persona..."
            value={createForm.summary}
            onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
            rows={4}
            className={`${textareaClass} mt-4`}
          />
          <input
            placeholder="Key skills (comma-separated)"
            value={createForm.skills}
            onChange={(e) => setCreateForm({ ...createForm, skills: e.target.value })}
            className={`${inputClass} mt-4`}
          />
          <ResumeFields form={createForm} setForm={setCreateForm} isEdit={false} />
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="app-btn-primary">
              {saving ? "Saving…" : "Create"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="app-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 space-y-4">
        {personas.map((persona) => (
          <DashboardCard key={persona.id} className="p-5">
            {editingId === persona.id ? (
              <form onSubmit={handleSaveEdit}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--brand-header)]">Edit persona</h3>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md p-2 text-[var(--brand-header)]/45 hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    value={editForm.focus}
                    onChange={(e) => setEditForm({ ...editForm, focus: e.target.value })}
                    className={inputClass}
                    placeholder="Focus"
                  />
                </div>
                <textarea
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  rows={4}
                  className={`${textareaClass} mt-4`}
                  placeholder="Summary"
                />
                <input
                  value={editForm.skills}
                  onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                  className={`${inputClass} mt-4`}
                  placeholder="Skills"
                />
                <ResumeFields
                  form={editForm}
                  setForm={setEditForm}
                  personaId={persona.id}
                  isEdit
                />
                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={saving} className="app-btn-primary">
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="app-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[var(--brand-header)]">{persona.name}</h3>
                    {persona.isDefault && (
                      <span className="rounded-sm bg-[var(--brand-lavender)] px-2 py-0.5 text-xs font-medium text-[var(--brand-header)]">
                        Default
                      </span>
                    )}
                    {persona.resumeText && (
                      <span className="rounded-sm bg-[var(--brand-mint)] px-2 py-0.5 text-xs font-medium text-[var(--brand-header)]">
                        Resume attached
                      </span>
                    )}
                  </div>
                  {persona.focus && (
                    <p className="mt-1 text-sm text-[var(--brand-tag-text)]">{persona.focus}</p>
                  )}
                  {persona.summary && (
                    <p className="mt-2 text-sm text-[var(--brand-header)]/65 line-clamp-3">
                      {persona.summary}
                    </p>
                  )}
                  {persona.skills && (
                    <p className="mt-2 text-xs text-[var(--brand-header)]/45">
                      Skills: {persona.skills}
                    </p>
                  )}
                  {persona.resumeFileName && (
                    <p className="mt-1 text-xs text-[var(--brand-header)]/45">
                      Resume: {persona.resumeFileName}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(persona)}
                    title="Edit persona"
                    className="rounded-md p-2 text-[var(--brand-header)]/45 hover:bg-[var(--brand-mint)] hover:text-[var(--brand-header)]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
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
            )}
          </DashboardCard>
        ))}

        {personas.length === 0 && (
          <DashboardEmpty message="No personas yet. Create one for each type of role you apply to." />
        )}
      </div>
    </div>
  );
}
