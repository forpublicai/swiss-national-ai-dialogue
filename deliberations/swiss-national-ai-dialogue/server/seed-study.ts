import { sql } from "drizzle-orm";

import { db } from "@/db";
import { snadStudyVersions } from "./db-schema";

import { hashStudyDefinition, parsePinnedStudyDefinition } from "./study";
import seedDefinition from "./study-definition.json";

// On an empty database, install the questionnaire as last published in
// production (study-definition.json) as the active version. Later edits are
// made in /admin's editor and never overwritten.
export async function seedStudyDefinitionIfEmpty(): Promise<void> {
  const definition = parsePinnedStudyDefinition(seedDefinition);
  await db.execute(sql`
    INSERT INTO ${snadStudyVersions} (definition_hash, label, definition, created_by, is_active)
    SELECT ${hashStudyDefinition(definition)}, ${definition.label}, ${JSON.stringify(definition)}::jsonb, 'admin', true
    WHERE NOT EXISTS (SELECT 1 FROM ${snadStudyVersions})
  `);
}
