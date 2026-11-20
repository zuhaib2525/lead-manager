import { createDb } from "./db.js";
import { createApp } from "./app.js";

const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  console.error("JWT_SECRET must be set in production.");
  process.exit(1);
}
const db = createDb(process.env.DB_FILE || "./leads.db");
const app = createApp(db, { jwtSecret: secret || "dev-secret" });
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
