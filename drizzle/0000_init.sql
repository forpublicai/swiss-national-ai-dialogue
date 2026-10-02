CREATE SCHEMA "snad";
--> statement-breakpoint
CREATE TABLE "snad"."access_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "snad"."chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"type" text NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contribution_draft" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "snad"."contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"topic_key" text NOT NULL,
	"text" text NOT NULL,
	"locale" text NOT NULL,
	"canton" text,
	"source" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snad"."responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"answer" jsonb,
	"skipped" boolean DEFAULT false NOT NULL,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snad"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_version_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"start_locale" text,
	"end_locale" text,
	"canton" text,
	"status" text DEFAULT 'active' NOT NULL,
	"archetype" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "snad"."study_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_hash" text NOT NULL,
	"label" text NOT NULL,
	"definition" jsonb NOT NULL,
	"notes" text,
	"created_by" text DEFAULT 'code' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snad"."chats" ADD CONSTRAINT "chats_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "snad"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snad"."contributions" ADD CONSTRAINT "contributions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "snad"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snad"."responses" ADD CONSTRAINT "responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "snad"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snad"."sessions" ADD CONSTRAINT "sessions_study_version_id_study_versions_id_fk" FOREIGN KEY ("study_version_id") REFERENCES "snad"."study_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "snad_access_keys_key_hash_uq" ON "snad"."access_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "snad_access_keys_created_at_idx" ON "snad"."access_keys" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "snad_chats_session_step_type_uq" ON "snad"."chats" USING btree ("session_id","step_id","type");--> statement-breakpoint
CREATE INDEX "snad_chats_actor_idx" ON "snad"."chats" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "snad_contributions_session_topic_uq" ON "snad"."contributions" USING btree ("session_id","topic_key");--> statement-breakpoint
CREATE INDEX "snad_contributions_topic_status_idx" ON "snad"."contributions" USING btree ("topic_key","status");--> statement-breakpoint
CREATE UNIQUE INDEX "snad_responses_session_step_uq" ON "snad"."responses" USING btree ("session_id","step_id");--> statement-breakpoint
CREATE INDEX "snad_responses_step_idx" ON "snad"."responses" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "snad_sessions_study_version_idx" ON "snad"."sessions" USING btree ("study_version_id");--> statement-breakpoint
CREATE INDEX "snad_sessions_status_idx" ON "snad"."sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "snad_sessions_last_active_idx" ON "snad"."sessions" USING btree ("last_active_at");--> statement-breakpoint
CREATE UNIQUE INDEX "snad_study_versions_definition_hash_uq" ON "snad"."study_versions" USING btree ("definition_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "snad_study_versions_active_uq" ON "snad"."study_versions" USING btree ("is_active") WHERE is_active;