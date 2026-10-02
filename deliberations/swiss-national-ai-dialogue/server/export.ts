import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  snadChats,
  snadContributions,
  snadResponses,
  snadSessions,
  snadStudyVersions,
} from "./db-schema";

import { listParticipants } from "./participants";
import { wrapUpSpecsOf } from "./progress";
import { buildOpenerIndex } from "./sessions";
import { parsePinnedStudyDefinition } from "./study";
import {
  SNAD_NPS_STEP_ID,
  SNAD_SHAPE_QUESTION_EN,
  SNAD_SHAPE_STEP_ID,
  SNAD_SKIP_TOPIC_MESSAGE,
} from "./constants";
import type { SnadStudyDefinition, StoredOpenerSpec } from "../types";

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

// RFC 4180 with a UTF-8 BOM so Excel opens German/French text correctly.
function toCsv(rows: string[][]): string {
  return `\uFEFF${rows
    .map((row) => row.map(csvField).join(","))
    .join("\r\n")}\r\n`;
}

export async function sessionsCsv(): Promise<string> {
  const { participants } = await listParticipants();
  return toCsv([
    [
      "session_id",
      "created_at",
      "status",
      "canton",
      "start_locale",
      "end_locale",
      "current_locale",
      "language_switched",
      "answered_topics",
      "total_topics",
      "reached_finale",
      "progress_step_id",
      "nps",
      "nps_comment",
      "next_question_suggestion",
      "active_ms",
      "elapsed_ms",
      "quote_interview_replies",
      "other_chat_count",
    ],
    ...participants.map((participant) => [
      participant.id,
      participant.createdAt.toISOString(),
      participant.status,
      participant.canton ?? "",
      participant.startLocale ?? "",
      participant.endLocale ?? "",
      participant.locale,
      String(participant.languageSwitched),
      String(participant.answeredTopics),
      String(participant.totalTopics),
      String(participant.progress.reachedFinale),
      participant.progress.step.id,
      participant.nps === null ? "" : String(participant.nps),
      participant.npsComment ?? "",
      participant.shapeSuggestion ?? "",
      String(participant.activeMs),
      String(participant.elapsedMs),
      String(participant.quoteInterviewReplies),
      String(participant.otherChatCount),
    ]),
  ]);
}

function isSkipSentinel(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { skipped?: unknown }).skipped === true
  );
}

function englishQuestionsOf(
  definition: SnadStudyDefinition,
): Map<string, string> {
  return new Map(
    definition.topics.flatMap((topic) =>
      topic.openers.sequence.flatMap((step) =>
        (step.mode === "always" ? [step.opener] : step.pool).map(
          (spec) => [spec.id, spec.question.en] as const,
        ),
      ),
    ),
  );
}

export async function answersCsv(): Promise<string> {
  const [versions, responses] = await Promise.all([
    db
      .select({
        id: snadStudyVersions.id,
        definition: snadStudyVersions.definition,
      })
      .from(snadStudyVersions),
    db
      .select({
        sessionId: snadResponses.sessionId,
        stepId: snadResponses.stepId,
        answer: snadResponses.answer,
        skipped: snadResponses.skipped,
        locale: snadResponses.locale,
        createdAt: snadResponses.createdAt,
        studyVersionId: snadSessions.studyVersionId,
      })
      .from(snadResponses)
      .innerJoin(snadSessions, eq(snadSessions.id, snadResponses.sessionId))
      .orderBy(desc(snadResponses.createdAt)),
  ]);
  const definitions = new Map(
    versions.map((version) => [
      version.id,
      parsePinnedStudyDefinition(version.definition),
    ]),
  );
  const byVersion = new Map(
    [...definitions].map(([id, definition]) => [
      id,
      {
        index: buildOpenerIndex(definition, id),
        englishByOpenerId: englishQuestionsOf(definition),
        wrapUpSpecs: new Map<string, StoredOpenerSpec>(
          wrapUpSpecsOf(definition).map((spec) => [spec.id, spec]),
        ),
      },
    ]),
  );

  const rows = responses.flatMap((response) => {
    const version = byVersion.get(response.studyVersionId);
    if (!version) return [];
    const locale = response.locale ?? "";
    const answeredAt = response.createdAt.toISOString();
    if (response.stepId.startsWith("topic:")) {
      const topicKey = response.stepId.slice("topic:".length);
      const answers = response.answer?.answers;
      if (!answers || typeof answers !== "object") return [];
      return Object.entries(answers as Record<string, unknown>).flatMap(
        ([question, value]) => {
          const match = version.index.byQuestion.get(question);
          if (!match) return [];
          return [
            [
              response.sessionId,
              topicKey,
              match.openerId,
              match.step.kind,
              version.englishByOpenerId.get(match.openerId) ?? "",
              JSON.stringify(value),
              String(response.skipped || isSkipSentinel(value)),
              locale,
              answeredAt,
            ],
          ];
        },
      );
    }
    if (response.stepId === SNAD_NPS_STEP_ID) {
      return [
        [
          response.sessionId,
          "wrap-up",
          SNAD_NPS_STEP_ID,
          "nps",
          "Net Promoter Score",
          JSON.stringify(response.answer),
          String(response.skipped || isSkipSentinel(response.answer)),
          locale,
          answeredAt,
        ],
      ];
    }
    if (response.stepId === SNAD_SHAPE_STEP_ID) {
      return [
        [
          response.sessionId,
          "wrap-up",
          SNAD_SHAPE_STEP_ID,
          "shape",
          SNAD_SHAPE_QUESTION_EN,
          JSON.stringify(response.answer),
          String(response.skipped || isSkipSentinel(response.answer)),
          locale,
          answeredAt,
        ],
      ];
    }
    const spec = version.wrapUpSpecs.get(response.stepId);
    if (!spec) return [];
    return [
      [
        response.sessionId,
        "wrap-up",
        spec.id,
        spec.kind,
        spec.question.en,
        JSON.stringify(response.answer),
        String(response.skipped || isSkipSentinel(response.answer)),
        locale,
        answeredAt,
      ],
    ];
  });

  return toCsv([
    [
      "session_id",
      "topic_key",
      "opener_id",
      "kind",
      "question_en",
      "answer_json",
      "skipped",
      "locale",
      "answered_at",
    ],
    ...rows,
  ]);
}

export async function quotesCsv(): Promise<string> {
  const contributions = await db
    .select()
    .from(snadContributions)
    .orderBy(desc(snadContributions.createdAt));
  return toCsv([
    [
      "id",
      "session_id",
      "created_at",
      "topic_key",
      "locale",
      "canton",
      "source",
      "status",
      "featured",
      "text",
    ],
    ...contributions.map((contribution) => [
      contribution.id,
      contribution.sessionId,
      contribution.createdAt.toISOString(),
      contribution.topicKey,
      contribution.locale,
      contribution.canton ?? "",
      contribution.source,
      contribution.status,
      String(contribution.featured),
      contribution.text,
    ]),
  ]);
}

export async function chatsCsv(): Promise<string> {
  const chats = await db
    .select()
    .from(snadChats)
    .where(inArray(snadChats.type, ["feedback", "other"]))
    .orderBy(desc(snadChats.updatedAt));
  return toCsv([
    [
      "session_id",
      "chat_type",
      "step_id",
      "chat_status",
      "turn_index",
      "role",
      "content",
      "updated_at",
    ],
    ...chats.flatMap((chat) =>
      chat.messages.flatMap((turn, index) =>
        turn.content === SNAD_SKIP_TOPIC_MESSAGE
          ? []
          : [
              [
                chat.sessionId,
                chat.type,
                chat.stepId,
                chat.status,
                String(index),
                turn.role,
                turn.content,
                chat.updatedAt.toISOString(),
              ],
            ],
      ),
    ),
  ]);
}
