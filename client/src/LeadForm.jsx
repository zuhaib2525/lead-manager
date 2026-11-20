import { useEffect, useState } from "react";
import { api } from "./api.js";
import { validateLead } from "./validation.js";
import Field from "./Field.jsx";

const EMPTY = { name: "", email: "", phone: "", company: "", source: "", status: "New" };

export default function LeadForm({ lead, meta, onClose, onSaved }) {
  const [form, setForm] = useState(lead ? { ...EMPTY, ...lead } : EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    const local = validateLead(form);
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const saved = lead ? await api.update(lead.id, form) : await api.create(form);
      onSaved(saved, !!lead);
    } catch (err) {
      setErrors(err.errors);
      setFormError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="lead-form-title" onSubmit={submit} noValidate>
        <h2 id="lead-form-title">{lead ? "Edit lead" : "Add lead"}</h2>
        <div className="grid">
          <Field label="Name" error={errors.name}><input value={form.name} onChange={set("name")} autoFocus /></Field>
          <Field label="Company" error={errors.company}><input value={form.company} onChange={set("company")} /></Field>
          <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone" error={errors.phone}><input type="tel" value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Source" error={errors.source}>
            <select value={form.source} onChange={set("source")}>
              <option value="">Select a source</option>
              {meta.sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Status" error={errors.status}>
            <select value={form.status} onChange={set("status")}>
              {meta.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {formError && <p className="banner error" role="alert">{formError}</p>}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? "Saving…" : lead ? "Save changes" : "Add lead"}</button>
        </div>
      </form>
    </div>
  );
}
