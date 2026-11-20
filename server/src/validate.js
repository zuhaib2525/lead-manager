export const STATUSES = ["New", "Contacted", "Qualified", "Lost"];
export const SOURCES = ["Website", "Referral", "LinkedIn", "Cold call", "Event", "Other"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s().-]{7,20}$/;

/** Validates a lead payload. Returns { errors, value }; errors is {} when valid. */
export function validateLead(body = {}) {
  const v = {};
  for (const k of ["name", "email", "phone", "company", "source", "status"]) {
    v[k] = typeof body[k] === "string" ? body[k].trim() : "";
  }
  if (!v.status) v.status = "New";

  const errors = {};
  if (!v.name) errors.name = "Name is required.";
  else if (v.name.length > 100) errors.name = "Name must be 100 characters or fewer.";
  if (!v.email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(v.email)) errors.email = "Enter a valid email address.";
  if (!v.phone) errors.phone = "Phone is required.";
  else if (!PHONE_RE.test(v.phone)) errors.phone = "Enter a valid phone number (7–20 digits).";
  if (!v.company) errors.company = "Company is required.";
  else if (v.company.length > 100) errors.company = "Company must be 100 characters or fewer.";
  if (!SOURCES.includes(v.source)) errors.source = "Choose a source.";
  if (!STATUSES.includes(v.status)) errors.status = "Choose a valid status.";
  return { errors, value: v };
}

export function validateCredentials({ email, password } = {}) {
  const errors = {};
  const e = typeof email === "string" ? email.trim() : "";
  if (!EMAIL_RE.test(e)) errors.email = "Enter a valid email address.";
  if (typeof password !== "string" || password.length < 8)
    errors.password = "Password must be at least 8 characters.";
  return { errors, value: { email: e, password } };
}
