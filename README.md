# Swiss National AI Dialogue

A multilingual (en/de/fr/it/rm) civic dialogue about AI in Switzerland. Participants
answer a short questionnaire of opener cards, polls, and multiple-choice questions,
then talk with an AI interviewer (Apertus) that helps them put their views into a
short quote. Results, quotes, and the questionnaire itself are managed from an admin
dashboard.

Next.js 15 (App Router) + PostgreSQL (Drizzle ORM). Any OpenAI-compatible endpoint
serving Apertus works as the model backend.

## Quick start (Docker)

```bash
cp .env.example .env        # then fill in LLM_*, ADMIN_PASSWORD, PARTNER_SESSION_SECRET
docker compose --profile app up --build
```

Open http://localhost:3000 for the dialogue and http://localhost:3000/admin for the
dashboard (any username, `ADMIN_PASSWORD` as the password).

On first boot the app applies its database migrations and installs the
questionnaire from
`deliberations/swiss-national-ai-dialogue/server/study-definition.json` (v19.6, as
last published) as the active version.

## Local development

Requires Node 22, pnpm 9 and Docker.

```bash
cp .env.example .env.local
pnpm install
pnpm start:local            # starts Postgres on :5433, migrates, runs next dev
```

## Configuration

All configuration is environment variables; see `.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `LLM_BASE_URL` | yes | OpenAI-compatible endpoint, without `/v1` |
| `LLM_API_KEY` | yes | Bearer token for that endpoint |
| `LLM_MODEL` | no | Model id (default `apertus-ai/Apertus-v1.5-70B-integration`) |
| `ADMIN_PASSWORD` | yes in production | Basic-auth password for `/admin` |
| `PARTNER_SESSION_SECRET`, `PARTNER_ADMIN_SLUG` | for `/partner` | Enable the access-key admin surface |
| `NEXT_PUBLIC_AMPLITUDE_ID` | no | Amplitude analytics, loaded only after cookie consent |
| `SERVER_ACTIONS_ALLOWED_ORIGINS` | no | Extra hostnames for server actions behind a Host-rewriting proxy |

## Admin surfaces

- **`/admin`**: the full dashboard (results, participants, questions, quotes, the
  questionnaire editor, and access keys). Protected by `ADMIN_PASSWORD`; put it
  behind your VPN or SSO as well if you can.
- **`/partner`**: the same dashboard for collaborators, signed in with a named
  access key created at `/admin` → Access. Keys can be revoked at any time and are
  re-checked on every request.

## Editing the questionnaire

The questionnaire is stored in the database as versioned study definitions. Edit
it in `/admin` → Editor and publish a new version; sessions already in progress
keep the version they started on. The code-authored definition in
`server/study.ts` is only a fallback used when no version exists.

## Before going live

- Replace the operator details in the legal page
  (`deliberations/swiss-national-ai-dialogue/ui/legal/SwissTerms.tsx`) and the
  footer (`ui/landing/SwissFooter.tsx`) with your own organisation, contact
  address, and the processors you actually use.
- Copy for the landing page, FAQ, and UI strings lives in
  `deliberations/swiss-national-ai-dialogue/i18n-strings.ts`.

## Project layout

```
app/                                   Next.js routes (thin adapters)
deliberations/swiss-national-ai-dialogue/
  Page.tsx, ThemedRoot.tsx, i18n*.ts   participant experience
  ui/                                  landing, cards, conversation, end flow
  admin/                               dashboard + questionnaire editor
  server/                              sessions, polls, AI chat, exports, schema
  tests/                               integration, unit, and e2e tests
components/ui/, styles/                base UI components and design tokens
db/, drizzle/                          database pool and migrations
lib/                                   model endpoint, analytics, partner auth
scripts/contribution-interview-eval/   persona evals for the AI interviewer
```

## Tests

```bash
pnpm dev:db                    # Postgres with dialogue_dev + dialogue_test
pnpm tsc && pnpm lint
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/dialogue_test pnpm test:integration
pnpm exec playwright install chromium && pnpm test:e2e
```

## License

MIT, see `LICENSE`.
