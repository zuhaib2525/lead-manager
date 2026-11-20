import { test, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createDb } from "../src/db.js";
import { createApp } from "../src/app.js";

const app = createApp(createDb());
const api = () => request(app);
const lead = { name: "Asha Verma", email: "asha@acme.com", phone: "+91 98765 43210", company: "Acme", source: "Website" };
let token, token2;

const signup = async (email) =>
  (await api().post("/api/auth/signup").send({ email, password: "password123" })).body.token;
const authed = (t) => ({ Authorization: `Bearer ${t}` });

before(async () => {
  token = await signup("a@test.com");
  token2 = await signup("b@test.com");
});

test("rejects unauthenticated requests", async () => {
  await api().get("/api/leads").expect(401);
});

test("signup rejects weak input and duplicates", async () => {
  await api().post("/api/auth/signup").send({ email: "nope", password: "x" }).expect(400);
  await api().post("/api/auth/signup").send({ email: "a@test.com", password: "password123" }).expect(409);
});

test("login works and fails on wrong password", async () => {
  await api().post("/api/auth/login").send({ email: "a@test.com", password: "password123" }).expect(200);
  await api().post("/api/auth/login").send({ email: "a@test.com", password: "wrongpass1" }).expect(401);
});

test("create validates required fields and email", async () => {
  const res = await api().post("/api/leads").set(authed(token)).send({ ...lead, email: "bad", name: "" }).expect(400);
  assert.ok(res.body.errors.email && res.body.errors.name);
});

test("full CRUD cycle with status update", async () => {
  const created = await api().post("/api/leads").set(authed(token)).send(lead).expect(201);
  assert.equal(created.body.status, "New");
  const id = created.body.id;
  const upd = await api().put(`/api/leads/${id}`).set(authed(token)).send({ status: "Qualified" }).expect(200);
  assert.equal(upd.body.status, "Qualified");
  await api().delete(`/api/leads/${id}`).set(authed(token)).expect(204);
  await api().get(`/api/leads/${id}`).set(authed(token)).expect(404);
});

test("users only see their own leads", async () => {
  const { body } = await api().post("/api/leads").set(authed(token)).send(lead).expect(201);
  await api().get(`/api/leads/${body.id}`).set(authed(token2)).expect(404);
  await api().delete(`/api/leads/${body.id}`).set(authed(token2)).expect(404);
  const list = await api().get("/api/leads").set(authed(token2)).expect(200);
  assert.equal(list.body.meta.total, 0);
});

test("search, status filter, sorting, pagination and stats", async () => {
  const t = await signup("c@test.com");
  const mk = (name, status) => api().post("/api/leads").set(authed(t)).send({ ...lead, name, status });
  for (const [n, s] of [["Zoe", "New"], ["Amit", "Lost"], ["Mira", "Lost"], ["Neil", "Contacted"]]) await mk(n, s);

  const byStatus = await api().get("/api/leads?status=Lost").set(authed(t));
  assert.equal(byStatus.body.meta.total, 2);
  const search = await api().get("/api/leads?search=mi").set(authed(t));
  assert.deepEqual(search.body.data.map((l) => l.name).sort(), ["Amit", "Mira"]);
  const sorted = await api().get("/api/leads?sort=name&order=asc&limit=2&page=2").set(authed(t));
  assert.deepEqual(sorted.body.data.map((l) => l.name), ["Neil", "Zoe"]);
  assert.equal(sorted.body.meta.pages, 2);
  const stats = await api().get("/api/leads/stats").set(authed(t));
  assert.deepEqual(stats.body, { total: 4, byStatus: { New: 1, Contacted: 1, Qualified: 0, Lost: 2 } });
});

test("search treats % literally", async () => {
  const t = await signup("d@test.com");
  await api().post("/api/leads").set(authed(t)).send({ ...lead, name: "Plain" });
  const r = await api().get("/api/leads?search=%25").set(authed(t));
  assert.equal(r.body.meta.total, 0);
});

test("malformed JSON returns 400", async () => {
  await api().post("/api/leads").set(authed(token)).set("Content-Type", "application/json").send("{bad").expect(400);
});
