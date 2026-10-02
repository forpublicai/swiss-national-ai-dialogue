import { readFileSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envLocal = readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
    const match = envLocal.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    // no .env.local — fall through to the dev default
  }
  return "postgresql://postgres:postgres@localhost:5433/dialogue_dev";
}

export default async function globalSetup() {
  const pool = new Pool({ connectionString: resolveDatabaseUrl() });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.join(__dirname, "..", "drizzle"),
    });

  } finally {
    await pool.end();
  }
}
