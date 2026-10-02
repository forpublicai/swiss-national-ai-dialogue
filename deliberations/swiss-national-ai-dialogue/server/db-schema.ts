import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const snadSchema = pgSchema("snad");

export const snadStudyVersions = snadSchema.table(
  "study_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    definitionHash: text("definition_hash").notNull(),
    label: text("label").notNull(),
    definition: jsonb("definition").notNull(),
    notes: text("notes"),
    createdBy: text("created_by", { enum: ["code", "admin", "partner"] })
      .notNull()
      .default("code"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("snad_study_versions_definition_hash_uq").on(t.definitionHash),
    uniqueIndex("snad_study_versions_active_uq")
      .on(t.isActive)
      .where(sql`is_active`),
  ],
);

export const snadSessions = snadSchema.table(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studyVersionId: uuid("study_version_id")
      .notNull()
      .references(() => snadStudyVersions.id),
    locale: text("locale").notNull(),
    startLocale: text("start_locale"),
    endLocale: text("end_locale"),
    canton: text("canton"),
    status: text("status", {
      enum: ["active", "wrap_up", "completed"],
    })
      .notNull()
      .default("active"),
    archetype: text("archetype"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("snad_sessions_study_version_idx").on(t.studyVersionId),
    index("snad_sessions_status_idx").on(t.status),
    index("snad_sessions_last_active_idx").on(t.lastActiveAt),
  ],
);

export const snadResponses = snadSchema.table(
  "responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => snadSessions.id, { onDelete: "cascade" }),
    stepId: text("step_id").notNull(),
    answer: jsonb("answer").$type<Record<string, unknown>>(),
    skipped: boolean("skipped").notNull().default(false),
    locale: text("locale"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("snad_responses_session_step_uq").on(t.sessionId, t.stepId),
    index("snad_responses_step_idx").on(t.stepId),
  ],
);

export const snadChats = snadSchema.table(
  "chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => snadSessions.id, { onDelete: "cascade" }),
    stepId: text("step_id").notNull(),
    actorId: text("actor_id").notNull(),
    type: text("type", { enum: ["topic", "feedback", "other"] }).notNull(),
    messages: jsonb("messages")
      .$type<Array<{ role: "user" | "assistant"; content: string }>>()
      .notNull()
      .default([]),
    contributionDraft: text("contribution_draft"),
    status: text("status", { enum: ["active", "completed"] })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("snad_chats_session_step_type_uq").on(
      t.sessionId,
      t.stepId,
      t.type,
    ),
    index("snad_chats_actor_idx").on(t.actorId),
  ],
);

export const snadContributions = snadSchema.table(
  "contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => snadSessions.id, { onDelete: "cascade" }),
    topicKey: text("topic_key").notNull(),
    text: text("text").notNull(),
    locale: text("locale").notNull(),
    canton: text("canton"),
    source: text("source", { enum: ["write", "chat"] }).notNull(),
    status: text("status", { enum: ["approved", "pending", "hidden"] })
      .notNull()
      .default("pending"),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("snad_contributions_session_topic_uq").on(
      t.sessionId,
      t.topicKey,
    ),
    index("snad_contributions_topic_status_idx").on(t.topicKey, t.status),
  ],
);

export const snadAccessKeys = snadSchema.table(
  "access_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    label: text("label").notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("snad_access_keys_key_hash_uq").on(t.keyHash),
    index("snad_access_keys_created_at_idx").on(t.createdAt),
  ],
);
