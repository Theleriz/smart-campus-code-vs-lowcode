# Agentic code review report (Tasks 06–07)

## Setup (Task 06)

- **Reviewer:** a separate AI review agent, started fresh, with read-only instructions (no file edits, no state-changing git commands, no servers). It could only run `npm test`, `npm run typecheck`, `npm run lint` and throwaway scripts outside the repository.
- **Input given:** the diff `1244d9d..HEAD` (baseline checkpoint → feature commit), `README.md`, `AGENTS.md`, the acceptance criteria EX-AC1–EX-AC5 and AC1–AC6, and the security rules (no keys in the browser, no personal data, untrusted input and output).
- **Prompt:** the course's suggested review prompt: *read-only agentic code reviewer; inspect the diff in context, repository instructions and tests; review correctness, security, maintainability and performance; give severity, file, evidence, reproduction or verification method and a minimal fix for each issue; do not edit files; separate confirmed findings from hypotheses.*
- The agent ran the test suite (54 passed at that time), typecheck and lint. It also compared the baseline `checkAvailability` with the new `evaluateAvailability` over **489,648 input combinations: 0 differences**.

## Findings and my verification

Status after my own check: **Confirmed** = I reproduced it with a failing test or a concrete code trace; **Plausible / unverified** = reasonable but could not be reproduced here; **Unsupported** = the evidence does not hold.

| ID | Sev. | Finding (agent) | My verification | Status | Action |
|---|---|---|---|---|---|
| F1 | Medium | Output check is a short blocklist: "is now available", "is yours", "meets every booking rule, so you can use it" pass for an **unavailable** room (EX-AC2) | Wrote 4 failing tests in `src/explain/review.test.ts` → all failed before the fix | **Confirmed** | **Fixed (fix 1)** |
| F2 | Medium | Invented people/events ("Professor Smith is teaching…") and a wrong reason ("closed for maintenance" for an overlap) pass | 2 failing tests → failed before the fix | **Confirmed** | **Fixed (fix 2)** |
| F8 | Low | Bidi override / Cyrillic look-alike / zero-width characters pass the validator and can display "available" | 3 failing tests → failed before the fix | **Confirmed** | Fixed together with F1 |
| F4 | Low | Server trusts the decision from the client: a forged `isAvailable:true` for an overlapping slot passes | Test in `review.test.ts` shows the forged request is accepted | **Confirmed** | Not fixed; impact limited (see below) |
| F3 | Low | False positives: correct text like "does not overlap any booking" or "Room 204 is available" is rejected | Code trace: `NEGATIVE_RE` has no negation handling; only the full room label is removed before the number check | **Confirmed** (frequency with a live model: unverified) | Not fixed; fails safe (fallback is shown) |
| F5 | Low | Content-Type check uses `includes()`; no Origin check or rate limit on a paid endpoint | Header check confirmed by code; cross-site use not reproduced | **Confirmed** (bypass) / **Plausible** (exploit) | Not fixed; only relevant when a key is set on a dev machine |
| F6 | Low | Oversized body is read to the end; client abort does not cancel the model call | Code trace in `server/vitePlugin.ts` | **Confirmed** | Not fixed (bounded by the 4 s server timeout) |
| F7 | Low | Server 504/502 are shown as "service error" instead of "timed out" or "failed the safety check" | Code trace in `adapters.ts` (only 503/404 are mapped) | **Confirmed** | Not fixed (label only, fallback still correct) |
| F9 | Low | The "rules unchanged" test is circular, because `checkAvailability` now calls `evaluateAvailability` | Correct | **Confirmed** | Test renamed to what it really checks; EX-AC1 evidence is the 26 unchanged baseline tests plus the agent's 489,648-case comparison |
| F10 | Low | No tests for middleware, live generator, UI labels, non-503 HTTP statuses | Correct for unit tests; UI labels are covered by the Edge UI run (11 scenarios) | **Confirmed** (partly covered) | Follow-up |
| F11 | Info | `effort: "low"` may be rejected by some models → live path always falls back | No API key, so it cannot be tested | **Plausible / unverified** | Documented |
| F12 | Info | New dev dependencies and relaxed AGENTS.md rules need human approval; UI script needs undeclared `playwright-core` | Process note: the backend adapter and SDK are required by the Practice #11 brief and were accepted by me as the human owner; the UI script documents `PW_MODULE` | **Plausible**; approval now recorded here | Documented |
| F13 | Info | The mock text is labelled "AI-generated", and only the first failed rule is explained | First half: the card already shows a **"Mock AI"** badge next to the title, so a user can tell it is the mock → **Unsupported**. Second half (only `codes[0]`): confirmed by design, and all reasons stay visible in the status card | **Unsupported** / confirmed by design | No change |

**Agent vs. manual inspection.** Before reading the report I inspected the diff myself and listed: no rate limit on the live endpoint (= F5), server trusting client facts (= F4), wrong failure label on static hosts (close to F7), and sentence or number checks that might reject good text (= F3). I missed F1, F2 and F8. I had tested the validator only with my own wording, and the agent attacked it with paraphrases and Unicode. In the other direction, the agent's F13 "can't tell it is a mock" did not hold up against the actual UI.

## The two fixes (Task 07)

### Fix 1: the explanation must state the confirmed status (F1, plus F8)

*Why necessary:* EX-AC2 is the core promise of the feature. A model answer like "Good news, Lecture Hall A is now available" next to an **Unavailable** status would directly mislead a student. A blocklist of positive phrases can never be complete.
*Change (`src/explain/contract.ts`):* positive confirmation instead of a blocklist. An unavailable explanation must contain "unavailable", "not available" or "cannot be booked". An available explanation must contain "available", not negated. Any bare "available" or usable-wording ("is yours", "you can use", "meets every…") in an unavailable explanation is rejected. Only printable ASCII plus the en dash and the typographic apostrophe is allowed, which removes bidi, zero-width and look-alike tricks.

### Fix 2: the stated reason must be the engine's reason, with no invented names (F2)

*Why necessary:* "no invented booking details" (EX-AC2). A wrong reason ("closed for maintenance" instead of an overlap) or an invented person gives false information, even when the status word is right.
*Change:* each reason code has keywords (for example OVERLAP needs "overlap…" or "existing booking"). The explanation must contain its own reason's keywords and none of another reason's. A capitalised word in the middle of a sentence that is not part of the room label is treated as an invented name and rejected.

### Regression results

| | Before fix | After fix |
|---|---|---|
| `src/explain/review.test.ts` | 9 failed, 2 passed ([output](test-output/review-repro-before.txt)) | 11 passed ([output](test-output/review-repro-after.txt)) |
| Old booking tests (utils, regression, risk) | 26 passed | 26 passed |
| All tests | 54 passed + 9 failing new | **65 passed** |
| Typecheck / lint / build | pass | pass |
| UI run in Edge (11 scenarios) | 11/11 | 11/11, decision unchanged in all |

The guard test "every mock and fallback text for every reason code passes the validator" still passes, so the stricter rules do not reject the app's own wording.

## Ready for demonstration?

**Yes, in mock mode.** The feature meets EX-AC1–EX-AC5 with evidence: tests, UI run and screenshots.

**Unresolved (deliberately left, all low or info):**
- F4: the server does not recompute the decision. The impact is limited because there is no shared state and only the caller sees their own explanation. The next step would be to re-run `evaluateAvailability` on the server.
- F3: the validator is strict and may reject some correct live-model wording. It fails safe (fallback), but it would lower the value of the live mode.
- F5 / F6 / F7: hardening of the dev-server endpoint (exact Content-Type, Origin check, rate limit, early 413, cancel on disconnect, precise failure labels). Needed before the live mode is used anywhere except a local machine.
- F11: the live LLM path has never been run against a real model (no API key). Only its contract is tested, through the handler tests and the HTTP-adapter test.

The human reviewer (me) made the final decision on each finding above. The agent had no write access and no merge rights.
