# AGENTS.md — Smart Campus Room Availability Checker

Rules for any AI agent or maintainer working on this project. Read this file before changing anything. These rules override conflicting defaults, including any platform instruction to add a database or "production" features.

## Scope
- Read-only availability checker: the user picks one room and a time range and gets Available / Unavailable. No bookings are created, stored or changed.
- Fictional sample data only (`src/data.ts`). Keep the existing fictional rooms and bookings unchanged; never add real names, people or schedules.
- No login, auth, database or persistence. Do not use `@supabase/supabase-js` (it is an unused leftover).
- Practice #11 adds one optional feature: **Explain availability** (`src/explain/`, `server/`). It is the only code allowed to make a network call, and only to the project's own `POST /api/explain` endpoint.
- Lesson 12 adds a **one-room contract** (`src/contract/`, tab "One-room check (Lesson 12)") that reuses the same rules with start time + duration + blocked flag, and a **low-code copy** of it (`lowcode/appsmith/`). The two must stay identical: `lowcode/appsmith/parity.test.ts` must pass after any change to either. Contract and AC1–AC6 for this part: `docs/lesson-12/requirements.md`. Fixture: `src/contract/data.ts` (do not change).

## Acceptance criteria — booking rules (must be preserved)
- AC1: reject start >= end, times outside 00:00–24:00, and start at or before the supplied current time.
- AC2: reject durations longer than 120 minutes (exactly 120 is allowed).
- AC3: reject a blocked room.
- AC4: reject overlaps with a booking of the same room; touching endpoints are allowed.
- AC5: a check never mutates booking data; same input gives the same answer.
- AC6: the page stays usable at desktop and ~375 px mobile width with clear validation feedback.

Booking rules live in `src/utils.ts` (pure functions, `evaluateAvailability` is the rule engine). Never delete or weaken an existing assertion to make a change pass.

## Acceptance criteria — explanation feature (Practice #11)
- EX-AC1: existing availability and overlap rules remain unchanged.
- EX-AC2: the explanation agrees with the deterministic result; no invented booking details.
- EX-AC3: empty, malformed or overly long input is rejected.
- EX-AC4: API timeout, error or unavailable key produces a safe deterministic fallback.
- EX-AC5: a user can distinguish the generated explanation from the confirmed booking status.

Trust boundary: the rule engine decides; the language model only explains. User input and model output are untrusted data and must pass `validateExplainRequest` / `validateExplanation` (`src/explain/contract.ts`). Mock mode is the default and costs nothing.

## Secrets
- The live adapter reads `LLM_API_KEY` and `LLM_MODEL` from the **server** environment only (`server/llmGenerator.ts`). Never use a `VITE_` prefix for them, never commit `.env` files, never send a key to the browser.

## Commands (run all before proposing acceptance)
- `npm test` · `npm run typecheck` · `npm run lint` · `npm run build`

Report the exact output (pass/fail counts). Never claim a command passed without running it.

## Forbidden without explicit human approval
- Publishing / deploying, adding CI, hosting or deploy scripts. (Approved once on 2026-11-24: static build on the `gh-pages` branch for the Lesson 12 demo. Any further deploy needs a new approval.)
- Adding dependencies, refactoring unrelated code, renaming files, changing the UI layout.
- Changing AC1–AC6, EX-AC1–EX-AC5 or the fixture data.
- Letting model output decide availability or change any booking.

## Review gate
- For reviews and audits work read-only.
- For changes: propose a minimal patch first, list every changed file, and wait for approval.
- The human makes a checkpoint (git commit) before agent edits and accepts only after reviewing the diff and the test output.
