/**
 * @jest-environment node
 *
 * DB-authored study versions: bootstrap-from-code-snapshot, editor saves
 * (validation, locale normalization, hash dedup), activation, the
 * new-sessions-pin-active / in-flight-sessions-replay-pinned invariant, and
 * the data-loss warnings for renamed opener ids and removed topics.
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
  snadStudyDefinitionHash,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";
import {
  activateStudyVersion,
  createStudyVersion,
  getStudyVersion,
  listStudyVersions,
  validateStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study-versions";
import { studyVersionCollectionRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/study-versions-route";
import {
  hydrateSession,
  topicStepId,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import type {
  SnadStudyDefinition,
  StoredOpenerSpec,
} from "@/deliberations/swiss-national-ai-dialogue/types";

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "../../../../drizzle"),
  });
});

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE snad.sessions, snad.study_versions RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await (db.$client as Pool).end();
});

function firstAlwaysSpec(definition: SnadStudyDefinition): StoredOpenerSpec {
  const step = definition.topics[0]!.openers.sequence.find(
    (candidate) => candidate.mode === "always",
  );
  if (!step || step.mode !== "always") throw new Error("expected always step");
  return step.opener;
}

function editedDefinition(label: string): SnadStudyDefinition {
  const definition = structuredClone(snadStudyDefinition);
  definition.label = label;
  firstAlwaysSpec(definition).question.en = `Edited for ${label}?`;
  return definition;
}

async function seedSessionOn(versionId: string): Promise<string> {
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: versionId, locale: "en", canton: "ZH" })
    .returning({ id: snadSessions.id });
  return session!.id;
}

const seedActiveVersionWithEditedSuccessor = async () => {
  const bootstrap = await ensureActiveStudyVersion();
  const created = await createStudyVersion({
    definition: editedDefinition("v-next"),
    notes: "integration test edit",
    createdBy: "admin",
  });
  if (!created.ok) {
    throw new Error(`expected save to succeed: ${created.errors.join("; ")}`);
  }
  return { bootstrap, editedId: created.id };
};

describe("bootstrap from the code snapshot", () => {
  it("seeds and activates the code definition exactly once on an empty database", async () => {
    const first = await ensureActiveStudyVersion();
    const second = await ensureActiveStudyVersion();

    expect(first.definitionHash).toBe(snadStudyDefinitionHash);
    expect(second.id).toBe(first.id);
    const versions = await listStudyVersions();
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      id: first.id,
      isActive: true,
      createdBy: "code",
    });
  });

  it("never re-seeds the code snapshot once an editor version is active", async () => {
    const { bootstrap, editedId } = await seedActiveVersionWithEditedSuccessor();
    const activated = await activateStudyVersion(editedId);
    expect(activated.ok).toBe(true);

    const active = await ensureActiveStudyVersion();

    expect(active.id).toBe(editedId);
    expect(active.id).not.toBe(bootstrap.id);
    expect(await listStudyVersions()).toHaveLength(2);
  });
});

describe("editor saves", () => {
  it("rejects a definition whose English copy is missing", async () => {
    const definition = editedDefinition("missing-en");
    firstAlwaysSpec(definition).question.en = "  ";

    const result = await createStudyVersion({
      definition,
      notes: null,
      createdBy: "admin",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join("\n")).toContain("missing en copy");
    expect(await listStudyVersions()).toHaveLength(1);
  });

  it("rejects structurally invalid definitions loudly", async () => {
    const result = await createStudyVersion({
      definition: { id: "swiss-national-ai-dialogue", topics: [] },
      notes: null,
      createdBy: "admin",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a visibleWhen that references a later step", async () => {
    const definition = editedDefinition("bad-visible-when");
    const sequence = definition.topics[0]!.openers.sequence;
    const lastStep = sequence.at(-1)!;
    const lastSpecId =
      lastStep.mode === "always" ? lastStep.opener.id : lastStep.pool[0]!.id;
    firstAlwaysSpec(definition).visibleWhen = {
      openerId: lastSpecId,
      selected: ["anything"],
    };

    const result = await createStudyVersion({
      definition,
      notes: null,
      createdBy: "admin",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join("\n")).toContain("visibleWhen");
  });

  it("auto-fills missing non-English copy from English", async () => {
    const definition = editedDefinition("draft-locale");
    const spec = firstAlwaysSpec(definition);
    spec.question.de = "";

    const created = await createStudyVersion({
      definition,
      notes: null,
      createdBy: "partner",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const stored = await getStudyVersion(created.id);
    const storedSpec = firstAlwaysSpec(stored!.definition);
    expect(storedSpec.question.de).toBe(storedSpec.question.en);
    expect(stored!.summary.createdBy).toBe("partner");
  });

  it("rejects saving a definition identical to an existing version", async () => {
    const bootstrap = await ensureActiveStudyVersion();

    const result = await createStudyVersion({
      definition: structuredClone(snadStudyDefinition),
      notes: null,
      createdBy: "admin",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.duplicateOfId).toBe(bootstrap.id);
    expect(result.errors.join("\n")).toContain("identical definition");
  });

  it("stamps the mixed draw hash on saves of pre-drawHash definitions", async () => {
    const definition = editedDefinition("pre-drawHash edit");
    delete definition.drawHash;

    const created = await createStudyVersion({
      definition,
      notes: null,
      createdBy: "admin",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const stored = await getStudyVersion(created.id);
    expect(stored!.definition.drawHash).toBe("mixed");
  });
});

describe("activation and session pinning", () => {
  it("pins new sessions to the activated version while in-flight sessions replay their pinned wording", async () => {
    const { bootstrap, editedId } = await seedActiveVersionWithEditedSuccessor();
    const inFlightSessionId = await seedSessionOn(bootstrap.id);
    const originalQuestion = firstAlwaysSpec(snadStudyDefinition).question.en;

    const activated = await activateStudyVersion(editedId);
    expect(activated.ok).toBe(true);
    const newSessionId = await seedSessionOn(
      (await ensureActiveStudyVersion()).id,
    );

    const inFlight = await hydrateSession(inFlightSessionId);
    const fresh = await hydrateSession(newSessionId);
    const questionsOf = (payload: typeof fresh) =>
      payload.topics[0]!.event.steps.map((step) => step.question);
    expect(questionsOf(inFlight)).toContain(originalQuestion);
    expect(questionsOf(inFlight)).not.toContain("Edited for v-next?");
    expect(questionsOf(fresh)).toContain("Edited for v-next?");
    expect(questionsOf(fresh)).not.toContain(originalQuestion);
  });

  it("keeps exactly one active version across repeated activations", async () => {
    const { bootstrap, editedId } = await seedActiveVersionWithEditedSuccessor();

    expect((await activateStudyVersion(editedId)).ok).toBe(true);
    expect((await activateStudyVersion(bootstrap.id)).ok).toBe(true);

    const versions = await listStudyVersions();
    expect(versions.filter((version) => version.isActive)).toHaveLength(1);
    expect(versions.find((version) => version.isActive)?.id).toBe(bootstrap.id);
  });

  it("refuses to activate an unknown version", async () => {
    await ensureActiveStudyVersion();

    const result = await activateStudyVersion(
      "00000000-0000-4000-8000-000000000000",
    );

    expect(result.ok).toBe(false);
  });
});

describe("data-loss warnings", () => {
  it("warns when an archetype-referenced opener id is renamed", async () => {
    await ensureActiveStudyVersion();
    const definition = editedDefinition("renamed-archetype-ref");
    const referencedId =
      definition.wrapUp.archetypeRules.mcqItems[0]!.openerId;
    definition.topics.forEach((topic) => {
      topic.openers.sequence.forEach((step) => {
        const specs = step.mode === "always" ? [step.opener] : step.pool;
        specs.forEach((spec) => {
          if (spec.id === referencedId) spec.id = `${referencedId}-renamed`;
        });
      });
    });

    const result = await validateStudyDefinition(definition);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const text = result.warnings.map((warning) => warning.message).join("\n");
    expect(text).toContain(`'${referencedId}'`);
    expect(text).toContain("Archetype scoring");
    expect(text).toContain("orphaned");
  });

  it("warns when a removed topic has recorded responses", async () => {
    const bootstrap = await ensureActiveStudyVersion();
    const sessionId = await seedSessionOn(bootstrap.id);
    const removedTopic = snadStudyDefinition.topics.at(-1)!;
    await db.insert(snadResponses).values({
      sessionId,
      stepId: topicStepId(removedTopic.key),
      answer: { answers: {} },
      skipped: false,
    });
    const definition = editedDefinition("topic-removed");
    definition.topics = definition.topics.filter(
      (topic) => topic.key !== removedTopic.key,
    );

    const result = await validateStudyDefinition(definition);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const warning = result.warnings.find((candidate) =>
      candidate.message.includes(`Topic '${removedTopic.key}'`),
    );
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("1 recorded response");
  });
});

describe("route handlers", () => {
  it("creates a version through the admin collection route and stamps the actor", async () => {
    await ensureActiveStudyVersion();
    const routes = studyVersionCollectionRoutes("admin");

    const response = (await routes.POST(
      new Request("http://test/api/admin/snad/study-versions", {
        method: "POST",
        body: JSON.stringify({
          definition: editedDefinition("via-route"),
          notes: "from route test",
        }),
      }),
    )) as unknown as { status: number; json: () => Promise<{ id: string }> };

    expect(response.status).toBe(201);
    const { id } = await response.json();
    const stored = await getStudyVersion(id);
    expect(stored?.summary.createdBy).toBe("admin");
    expect(stored?.summary.notes).toBe("from route test");
    expect(stored?.summary.isActive).toBe(false);
  });

  it("rejects garbage through the route with a 400 and explicit errors", async () => {
    const routes = studyVersionCollectionRoutes("partner");

    const response = (await routes.POST(
      new Request("http://test/api/partner/snad/study-versions", {
        method: "POST",
        body: JSON.stringify({ definition: { nope: true } }),
      }),
    )) as unknown as {
      status: number;
      json: () => Promise<{ errors: string[] }>;
    };

    expect(response.status).toBe(400);
    expect((await response.json()).errors.length).toBeGreaterThan(0);
  });
});
