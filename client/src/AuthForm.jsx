import { useState } from "react";
import { api, setToken } from "./api.js";
import { validateCredentials } from "./validation.js";
import Field from "./Field.jsx";

export default function AuthForm({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    const local = mode === "signup" ? validateCredentials(form) : {};
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const { token, user } = await api[mode](form);
      setToken(token);
      onAuth(user);
    } catch (err) {
      setErrors(err.errors);
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Lead Manager</h1>
        <p className="muted">{mode === "login" ? "Sign in to see your leads." : "Create an account to start tracking leads."}</p>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={form.email} onChange={set("email")} autoFocus />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} />
        </Field>
        {formError && <p className="banner error" role="alert">{formError}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrors({}); setFormError(""); }}>
          {mode === "login" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
