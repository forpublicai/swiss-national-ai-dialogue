// drizzle-kit's schema entry point: tables are defined in the deliberation's
// own server/db-schema.ts and only re-exported here.
export {
  snadSchema,
  snadStudyVersions,
  snadSessions,
  snadResponses,
  snadChats,
  snadContributions,
  snadAccessKeys,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
