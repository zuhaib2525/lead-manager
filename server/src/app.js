import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { STATUSES, SOURCES, validateLead, validateCredentials } from "./validate.js";

const SORTABLE = { name: "name", company: "company", status: "status", created: "created_at" };

export function createApp(db, { jwtSecret = "dev-secret" } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));

  const sign = (u) => jwt.sign({ sub: u.id }, jwtSecret, { expiresIn: "7d" });
  const fail = (res, code, message, errors) => res.status(code).json({ message, errors });

  function auth(req, res, next) {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    try {
      req.userId = jwt.verify(token, jwtSecret).sub;
      next();
    } catch {
      fail(res, 401, "Please sign in again.");
    }
  }

  // ---------- Auth ----------
  app.post("/api/auth/signup", (req, res) => {
    const { errors, value } = validateCredentials(req.body);
    if (Object.keys(errors).length) return fail(res, 400, "Check the highlighted fields.", errors);
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(value.email))
      return fail(res, 409, "An account with this email already exists.", { email: "Already registered." });
    const hash = bcrypt.hashSync(value.password, 10);
    const { lastInsertRowid } = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(value.email, hash);
    const user = { id: Number(lastInsertRowid), email: value.email };
    res.status(201).json({ token: sign(user), user });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").trim());
    if (!row || !bcrypt.compareSync(String(password || ""), row.password_hash))
      return fail(res, 401, "Incorrect email or password.");
    res.json({ token: sign(row), user: { id: row.id, email: row.email } });
  });

  app.get("/api/auth/me", auth, (req, res) => {
    const u = db.prepare("SELECT id, email FROM users WHERE id = ?").get(req.userId);
    u ? res.json({ user: u }) : fail(res, 401, "Please sign in again.");
  });

  // ---------- Leads ----------
  app.get("/api/meta", (_req, res) => res.json({ statuses: STATUSES, sources: SOURCES }));

  app.get("/api/leads/stats", auth, (req, res) => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    const rows = db.prepare("SELECT status, COUNT(*) AS n FROM leads WHERE user_id = ? GROUP BY status").all(req.userId);
    let total = 0;
    for (const r of rows) { counts[r.status] = r.n; total += r.n; }
    res.json({ total, byStatus: counts });
  });

  app.get("/api/leads", auth, (req, res) => {
    const { search = "", status = "", sort = "created", order = "desc" } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const where = ["user_id = ?"];
    const params = [req.userId];
    if (STATUSES.includes(status)) { where.push("status = ?"); params.push(status); }
    if (String(search).trim()) {
      const like = `%${String(search).trim().replace(/[\\%_]/g, "\\$&")}%`;
      where.push("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\')");
      params.push(like, like, like);
    }
    const col = SORTABLE[sort] || "created_at";
    const dir = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";
    const clause = where.join(" AND ");

    const total = db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE ${clause}`).get(...params).n;
    const data = db
      .prepare(`SELECT * FROM leads WHERE ${clause} ORDER BY ${col} ${dir}, id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);
    res.json({ data, meta: { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) } });
  });

  const findOwned = (req) =>
    db.prepare("SELECT * FROM leads WHERE id = ? AND user_id = ?").get(Number(req.params.id), req.userId);

  app.post("/api/leads", auth, (req, res) => {
    const { errors, value: v } = validateLead(req.body);
    if (Object.keys(errors).length) return fail(res, 400, "Check the highlighted fields.", errors);
    const { lastInsertRowid } = db
      .prepare("INSERT INTO leads (user_id, name, email, phone, company, source, status) VALUES (?,?,?,?,?,?,?)")
      .run(req.userId, v.name, v.email, v.phone, v.company, v.source, v.status);
    res.status(201).json(db.prepare("SELECT * FROM leads WHERE id = ?").get(lastInsertRowid));
  });

  app.get("/api/leads/:id", auth, (req, res) => {
    const lead = findOwned(req);
    lead ? res.json(lead) : fail(res, 404, "Lead not found.");
  });

  app.put("/api/leads/:id", auth, (req, res) => {
    const existing = findOwned(req);
    if (!existing) return fail(res, 404, "Lead not found.");
    const { errors, value: v } = validateLead({ ...existing, ...req.body });
    if (Object.keys(errors).length) return fail(res, 400, "Check the highlighted fields.", errors);
    db.prepare(
      "UPDATE leads SET name=?, email=?, phone=?, company=?, source=?, status=?, updated_at=datetime('now') WHERE id=?"
    ).run(v.name, v.email, v.phone, v.company, v.source, v.status, existing.id);
    res.json(db.prepare("SELECT * FROM leads WHERE id = ?").get(existing.id));
  });

  app.delete("/api/leads/:id", auth, (req, res) => {
    const existing = findOwned(req);
    if (!existing) return fail(res, 404, "Lead not found.");
    db.prepare("DELETE FROM leads WHERE id = ?").run(existing.id);
    res.status(204).end();
  });

  app.use("/api", (_req, res) => fail(res, 404, "Endpoint not found."));

  // Serve the built frontend in production
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed") return fail(res, 400, "Request body is not valid JSON.");
    console.error(err);
    fail(res, 500, "Something went wrong on our side.");
  });

  return app;
}
