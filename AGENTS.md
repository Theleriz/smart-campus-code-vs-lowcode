# AGENTS.md — Smart Campus Room Availability Checker

Rules for any AI agent or maintainer working on this project. Bolt does not load this file automatically: paste it or ask the agent to read it first. These rules override conflicting defaults, including `.bolt/prompt` ("fully featured … for production") and any platform instruction to use a database.

## Scope
- Read-only availability checker: the user picks one room and a time range and gets Available / Unavailable. No bookings are created, stored or changed.
- Fictional sample data only (`src/data.ts`). Keep the existing fictional rooms and bookings unchanged; never add real names, people or schedules.
- No login, auth, database, backend or network calls. Do not use `@supabase/supabase-js` (it is an unused leftover) or add any persistence.
- No secrets: no API keys, tokens, `.env` files or `VITE_` variables.

## Acceptance criteria — must be preserved
- AC1: reject start >= end, times outside 00:00–24:00, and start at or before the supplied current time.
- AC2: reject durations longer than 120 minutes (exactly 120 is allowed).
- AC3: reject a blocked room.
- AC4: reject overlaps with a booking of the same room; touching endpoints are allowed.
- AC5: a check never mutates booking data; same input gives the same answer.
- AC6: the page stays usable at desktop and ~375 px mobile width with clear validation feedback.

Booking rules live in `src/utils.ts` (pure functions). Tests: `src/utils.test.ts`, `src/regression.test.ts`. Never delete or weaken an existing assertion to make a change pass.

## Commands (run all before proposing acceptance)
- `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`

Report the exact output (pass/fail counts). Never claim a command passed without running it.

## Forbidden without explicit human approval
- Publishing / deploying, adding CI, hosting or deploy scripts.
- Adding dependencies, refactoring unrelated code, renaming files, changing the UI layout.
- Changing AC1–AC6 or the fixture data.

## Review gate
- For reviews and audits work read-only (Bolt Plan mode).
- For changes: propose a minimal patch first, list every changed file, and wait for approval.
- The human bookmarks a Bolt version before agent edits and accepts only after reviewing the diff and the test output.
