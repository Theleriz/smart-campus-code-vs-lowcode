# Prompt engineering (Task 04)

All three prompts receive the same structured user message, built by `buildUserMessage` in `src/explain/prompt.ts`:

```text
<facts>{"roomLabel":"Lecture Hall A","start":"13:00","end":"14:00","isAvailable":false,"reasonCode":"OVERLAP"}</facts>
```

## The three variants

| | Prompt |
|---|---|
| **A: naive** | "Explain to the student why this room is or is not available." |
| **B: role + length** | "You are a helpful campus assistant. Using the data below, explain the availability decision in two sentences." |
| **C: final** (used by the app) | The full system instruction in `SYSTEM_PROMPT`. It says the decision is final, limits the model to the supplied facts, treats the facts as data rather than instructions, forbids booking claims, sets the length and style, and defines every reason code. |

## Comparison

Scored against the Task 04 requirements (✓ addressed, ~ partly, ✗ missing):

| Criterion | A | B | C |
|---|---|---|---|
| Clarity: says what the output is for and who reads it | ~ | ✓ | ✓ |
| Length limit (≤ 2 sentences) | ✗ | ✓ | ✓ |
| Restricted to supplied facts, no invented bookings or times | ✗ | ~ ("using the data") | ✓ explicit |
| Decision is final, may not be overridden | ✗ | ✗ | ✓ |
| Reason codes explained (consistent wording for `OVERLAP`, `TOO_LONG`, …) | ✗ (model must guess what `START_NOT_AFTER_NOW` means) | ✗ | ✓ |
| Prompt-injection guard (facts are data) | ✗ | ✗ | ✓ |
| No booking-action claims | ✗ | ✗ | ✓ |
| Respectful, plain style, no markdown/links | ✗ | ~ | ✓ |
| Output format (text only) | ✗ | ✗ | ✓ |

### Expected failure modes

- **A** invites long, chatty answers, guessed reasons ("probably a lecture is scheduled…"), invented times, and markdown. Most such answers would be blocked by `validateExplanation` (length, sentence count, unknown times), so the student would mostly see the fallback. That is safe, but the feature would add little.
- **B** fixes the length, but gives no meaning for the reason codes, so wording varies between runs (consistency), and it can still add plausible-sounding facts ("the Faculty Meeting ends at 14:00"). That is exactly the AC2 risk.
- **C** gives consistent wording per code and keeps the answer anchored to the five facts. It is the only variant that states the trust boundary inside the prompt.

**Decision:** variant C. The prompt is the first line of defence. The output validator is the second, and it stays in place whichever prompt is used.

## Honest limitation

No API key was available during this practice, so the three prompts were **not** run against a live model. The comparison above is a structured review against the requirements, not a measured experiment. The app's contract is exercised end-to-end with the clearly labelled **Mock AI** adapter, as the practice allows. When a key is available, the next step is to run each variant on the seven reason codes and record the validator pass rate (`validateExplanation`) per prompt.
