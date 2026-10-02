/**
 * @jest-environment node
 *
 * The partner-facing CSV exports: long-format answers keyed back to opener
 * ids, RFC 4180 escaping with a BOM for Excel, the email step never leaving
 * the DB, and the /export/[kind] route contract.
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  SNAD_EMAIL_STEP_ID,
  SNAD_NPS_STEP_ID,
  SNAD_SHAPE_QUESTION_EN,
  SNAD_SHAPE_STEP_ID,
  SNAD_SKIP_TOPIC_MESSAGE,
} from "@/deliberations/swiss-national-ai-dialogue/server/constants";
import {
  snadChats,
  snadContributions,
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import {
  answersCsv,
  chatsCsv,
  quotesCsv,
  sessionsCsv,
} from "@/deliberations/swiss-national-ai-dialogue/server/export";
import { exportRoutes } from "@/deliberations/swiss-national-ai-dialogue/server/export-route";
import {
  buildTopicEvent,
  topicStepId,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";
import type { SnadSequenceStep } from "@/deliberations/swiss-national-ai-dialogue/types";

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "../../../../drizzle"),
  });
});

beforeEach(async () => {
  await db.execute(
    sql`TRUNCATE snad.sessions, snad.study_versions RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await (db.$client as Pool).end();
});

function parseCsv(csv: string): string[][] {
  const body = csv.startsWith("\uFEFF") ? csv.slice(1) : csv;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (inQuotes) {
      if (char !== '"') field += char;
      else if (body[i + 1] === '"') {
        field += '"';
        i++;
      } else inQuotes = false;
    } else if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" && body[i + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function records(csv: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(csv);
  return rows.map((row) =>
    Object.fromEntries(header!.map((name, index) => [name, row[index] ?? ""])),
  );
}

async function seedSession(canton = "BE"): Promise<string> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: version.id, locale: "en", canton })
    .returning({ id: snadSessions.id });
  return session!.id;
}

type OpenerStep = Exclude<SnadSequenceStep, { kind: "share_more" }>;

function openersDealtTo(sessionId: string, topicKey: string): OpenerStep[] {
  return buildTopicEvent(
    snadStudyDefinition,
    sessionId,
    topicKey,
    "en",
  ).steps.filter(
    (step): step is OpenerStep =>
      step.kind !== "share_more" && Boolean(step.opener_id),
  );
}

function answerFor(step: OpenerStep): unknown {
  if (step.kind === "binary") return { choice: "a" };
  if (step.kind === "slider") return { position: 42 };
  if (step.kind === "ranking") {
    return { order: step.options.map((option) => option.label) };
  }
  if (step.kind === "budget") {
    return { allocation: { [step.options[0]!.label]: step.total } };
  }
  return { selected: [step.options[0]!.label] };
}

const seedAnsweredSessionWithWrapUpAndEmail = async () => {
  const sessionId = await seedSession();
  const topicKey = snadStudyDefinition.topics[0]!.key;
  const [answered, skipped] = openersDealtTo(sessionId, topicKey);
  await db.insert(snadResponses).values([
    {
      sessionId,
      stepId: topicStepId(topicKey),
      answer: {
        answers: {
          [answered!.question]: answerFor(answered!),
          [skipped!.question]: { skipped: true },
        },
        share_more: "skip",
      },
      locale: "en",
    },
    {
      sessionId,
      stepId: SNAD_NPS_STEP_ID,
      answer: { nps: 9, comment: "Merci" },
      locale: "en",
    },
    {
      sessionId,
      stepId: SNAD_EMAIL_STEP_ID,
      answer: { email: "private@example.com" },
      locale: "en",
    },
    {
      sessionId,
      stepId: SNAD_SHAPE_STEP_ID,
      answer: { text: "How should schools teach AI?" },
      locale: "en",
    },
  ]);
  return { sessionId, topicKey, answered: answered!, skipped: skipped! };
};

describe("sessionsCsv", () => {
  it("includes a seeded session with its canton and nps", async () => {
    const sessionId = await seedSession("ZH");
    await db.insert(snadResponses).values({
      sessionId,
      stepId: SNAD_NPS_STEP_ID,
      answer: { nps: 7, comment: "ok" },
      locale: "en",
    });

    const rows = records(await sessionsCsv());

    expect(rows.find((row) => row.session_id === sessionId)).toMatchObject({
      status: "active",
      canton: "ZH",
      current_locale: "en",
      nps: "7",
      nps_comment: "ok",
    });
  });
});

describe("answersCsv", () => {
  it("emits one row per recorded answer, keyed back to the opener", async () => {
    const seeded = await seedAnsweredSessionWithWrapUpAndEmail();

    const rows = records(await answersCsv());

    const answeredRow = rows.find(
      (row) => row.opener_id === seeded.answered.opener_id,
    );
    expect(answeredRow).toMatchObject({
      session_id: seeded.sessionId,
      topic_key: seeded.topicKey,
      kind: seeded.answered.kind,
      question_en: seeded.answered.question,
      skipped: "false",
      locale: "en",
    });
    expect(JSON.parse(answeredRow!.answer_json!)).toEqual(
      answerFor(seeded.answered),
    );
  });

  it("marks a per-question skip sentinel as skipped", async () => {
    const seeded = await seedAnsweredSessionWithWrapUpAndEmail();

    const rows = records(await answersCsv());

    expect(
      rows.find((row) => row.opener_id === seeded.skipped.opener_id),
    ).toMatchObject({
      topic_key: seeded.topicKey,
      skipped: "true",
      answer_json: '{"skipped":true}',
    });
  });

  it("includes the question they want asked next, as its own wrap-up row", async () => {
    const seeded = await seedAnsweredSessionWithWrapUpAndEmail();

    const rows = records(await answersCsv());

    const shapeRow = rows.find((row) => row.opener_id === SNAD_SHAPE_STEP_ID);
    expect(shapeRow).toMatchObject({
      session_id: seeded.sessionId,
      topic_key: "wrap-up",
      kind: "shape",
      question_en: SNAD_SHAPE_QUESTION_EN,
      skipped: "false",
    });
    expect(JSON.parse(shapeRow!.answer_json!)).toEqual({
      text: "How should schools teach AI?",
    });
  });

  it("includes the NPS wrap-up row but never the email step", async () => {
    const seeded = await seedAnsweredSessionWithWrapUpAndEmail();

    const csv = await answersCsv();

    const npsRow = records(csv).find((row) => row.opener_id === "wrapup-nps");
    expect(npsRow).toMatchObject({
      session_id: seeded.sessionId,
      topic_key: "wrap-up",
      skipped: "false",
    });
    expect(JSON.parse(npsRow!.answer_json!)).toEqual({
      nps: 9,
      comment: "Merci",
    });
    expect(csv).not.toContain(SNAD_EMAIL_STEP_ID);
    expect(csv).not.toContain("private@example.com");
  });
});

describe("quotesCsv", () => {
  it("escapes commas, quotes and newlines per RFC 4180, after a BOM", async () => {
    const sessionId = await seedSession("ZH");
    const text = 'Zurich says: "yes, mostly"\nBern disagrees';
    await db.insert(snadContributions).values({
      sessionId,
      topicKey: "closing",
      text,
      locale: "de",
      canton: "ZH",
      source: "chat",
      status: "approved",
    });

    const csv = await quotesCsv();

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Zurich says: ""yes, mostly""\nBern disagrees"');
    expect(records(csv).find((row) => row.session_id === sessionId)).toMatchObject({
      topic_key: "closing",
      locale: "de",
      canton: "ZH",
      source: "chat",
      status: "approved",
      featured: "false",
      text,
    });
  });
});

describe("chatsCsv", () => {
  it("flattens a feedback chat into one row per turn, dropping the skip sentinel", async () => {
    const sessionId = await seedSession();
    await db.insert(snadChats).values([
      {
        sessionId,
        stepId: "closing",
        actorId: "closing-interviewer",
        type: "feedback",
        status: "completed",
        messages: [
          { role: "assistant", content: "What stayed with you?" },
          { role: "user", content: "The energy question" },
          { role: "user", content: SNAD_SKIP_TOPIC_MESSAGE },
        ],
      },
      {
        sessionId,
        stepId: "topic:kickoff",
        actorId: "topic-interviewer",
        type: "topic",
        status: "completed",
        messages: [{ role: "user", content: "topic chat turn" }],
      },
    ]);

    const rows = records(await chatsCsv());

    expect(rows.map((row) => [row.turn_index, row.role, row.content])).toEqual([
      ["0", "assistant", "What stayed with you?"],
      ["1", "user", "The energy question"],
    ]);
    expect(rows[0]).toMatchObject({
      session_id: sessionId,
      chat_type: "feedback",
      step_id: "closing",
      chat_status: "completed",
    });
  });
});

describe("exportRoutes", () => {
  const get = (kind: string) =>
    exportRoutes("admin").GET(
      new Request(`http://localhost/api/admin/snad/export/${kind}`),
      { params: Promise.resolve({ kind }) },
    );

  it("rejects an unknown kind", async () => {
    const res = await get("emails");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "unknown_export" });
  });

  it("serves a known kind as a csv attachment", async () => {
    await seedSession();

    const res = await get("sessions");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="snad-sessions-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(await res.text()).toContain("session_id,created_at,status");
  });
});
