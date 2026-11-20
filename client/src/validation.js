// Mirrors server/src/validate.js so users get instant feedback; the server remains the source of truth.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s().-]{7,20}$/;

export function validateLead(v) {
  const e = {};
  if (!v.name.trim()) e.name = "Name is required.";
  if (!v.email.trim()) e.email = "Email is required.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!v.phone.trim()) e.phone = "Phone is required.";
  else if (!PHONE_RE.test(v.phone.trim())) e.phone = "Enter a valid phone number (7–20 digits).";
  if (!v.company.trim()) e.company = "Company is required.";
  if (!v.source) e.source = "Choose a source.";
  return e;
}

export function validateCredentials({ email, password }) {
  const e = {};
  if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
  if (password.length < 8) e.password = "Password must be at least 8 characters.";
  return e;
}
