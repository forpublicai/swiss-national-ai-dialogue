import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

// Per-process connection ceiling. Keep replicas × max under Postgres'
// max_connections when scaling out; a connection-starved request then fails
// fast instead of holding its working set on the heap while it waits (which
// caused out-of-memory crashes under launch load).
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 10);
const CONNECT_TIMEOUT_MS = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? 10_000);

function getDb(): Db {
  if (cached) return cached;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    max: POOL_MAX,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });
  cached = drizzle(pool, { schema });
  return cached;
}

// Lazy proxy so importing `db` at module load time doesn't trigger
// connection setup. Next.js's build-time page-data collection imports
// API route modules without DATABASE_URL set, and we don't want that
// to throw. The actual `getDb()` only runs on first property access.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
