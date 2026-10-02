// Arbitrary constant shared by every pod so their boot-time migrations
// mutually exclude via pg_advisory_lock (see register()).
const MIGRATION_ADVISORY_LOCK_KEY = 47_11_23;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Imported dynamically (not at top level) because instrumentation.ts is
    // also evaluated in the Edge runtime, where `node:fs`/`node:crypto` don't
    // exist — a static import there fails to load the whole module.
    const { readFileSync } = await import("node:fs");
    const { createHash } = await import("node:crypto");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { sql } = await import("drizzle-orm");
    const { db } = await import("./db");

    // Apply pending migrations on boot. A genuine migration failure must crash
    // the process (and fail the pod's readiness probe) rather than serve a
    // half-migrated schema — previously this was swallowed and the app booted
    // "healthy" only to 500 at runtime.
    //
    // Serialized across pods by a session advisory lock: every replica runs
    // this on boot, and the node-postgres migrator takes no lock of its own, so
    // during a rolling deploy the replicas race the same migration — the losers
    // then crash on already-applied DDL (a non-idempotent `DROP TABLE` throws
    // "relation does not exist"). Holding the lock on a dedicated connection for
    // the whole migrate lets exactly one pod run it while the rest wait, then
    // find nothing pending. A crashed holder drops its connection, so Postgres
    // releases the lock automatically — no stuck lock.
    try {
      const lockClient = await db.$client.connect();
      try {
        await lockClient.query("SELECT pg_advisory_lock($1)", [
          MIGRATION_ADVISORY_LOCK_KEY,
        ]);
        await migrate(db, { migrationsFolder: "./drizzle" });
      } finally {
        await lockClient.query("SELECT pg_advisory_unlock($1)", [
          MIGRATION_ADVISORY_LOCK_KEY,
        ]);
        lockClient.release();
      }
      console.log("[drizzle] Migrations applied successfully");
    } catch (error) {
      console.error("[drizzle] Migration failed:", error);
      throw error;
    }

    // Drift guard. The drizzle migrator decides what to run purely from the
    // newest `created_at` in `drizzle.__drizzle_migrations`, so a database
    // whose ledger was advanced by another branch's colliding hand-set `when`
    // timestamps will SILENTLY skip real migrations and still report success
    //. Independently
    // verify that every migration in the journal is actually recorded in the
    // DB; if any is missing, refuse to start so a bad deploy fails loudly here
    // instead of throwing `relation "..." does not exist` to users.
    try {
      const journal = JSON.parse(
        readFileSync("./drizzle/meta/_journal.json", "utf8"),
      ) as { entries: { tag: string }[] };
      // drizzle records a sha256 of each migration file's contents as `hash`.
      const expected = journal.entries.map((entry) => ({
        tag: entry.tag,
        hash: createHash("sha256")
          .update(readFileSync(`./drizzle/${entry.tag}.sql`, "utf8"))
          .digest("hex"),
      }));
      const result = await db.execute(
        sql`select hash from drizzle.__drizzle_migrations`,
      );
      const appliedHashes = new Set(
        (result.rows as { hash: string }[]).map((row) => row.hash),
      );
      const missing = expected.filter((e) => !appliedHashes.has(e.hash));
      if (missing.length > 0) {
        throw new Error(
          `[drizzle] schema drift: ${missing.length} migration(s) in the journal are not applied to this database (${missing
            .map((m) => m.tag)
            .join(
              ", ",
            )}). Refusing to start — the migration ledger has likely been advanced past these by another branch's colliding timestamps. Reconcile drizzle.__drizzle_migrations before deploying.`,
        );
      }
      console.log(
        `[drizzle] drift check passed — all ${expected.length} journal migrations present`,
      );
    } catch (error) {
      // Only an explicit drift detection should abort boot. For any other
      // (infra) error — unreadable journal, transient query failure — log and
      // continue so the guard itself can never crash-loop the app spuriously.
      if (error instanceof Error && error.message.includes("schema drift")) {
        throw error;
      }
      console.error("[drizzle] drift check skipped due to error:", error);
    }

    const { seedStudyDefinitionIfEmpty } = await import(
      "./deliberations/swiss-national-ai-dialogue/server/seed-study"
    );
    await seedStudyDefinitionIfEmpty();
  }
}
