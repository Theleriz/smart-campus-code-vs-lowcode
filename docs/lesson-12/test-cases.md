# Eight identical tests on both solutions (Task 05)

Inputs are in [requirements.md](requirements.md#common-test-inputs-prepared-before-implementation). Simulated now = 09:30.

## Results

| Test | Input | Expected | Code-based: observed | Low-code (Appsmith): observed |
|---|---|---|---|---|
| T1 | 12:00, 60 min | Available | **PASS** – Available, "The room is free from 12:00 to 13:00." | **PASS** – ✅ Available, same message, `reasonCode: AVAILABLE` |
| T2 | 11:00, 60 min | Unavailable (overlap) | **PASS** – Unavailable, `OVERLAP`, "Overlaps with "Thesis Defense" (10:00–11:30)." | **PASS** – ❌ Unavailable, `OVERLAP`, same message |
| T3 | 12:00, 60 min, blocked | Unavailable (blocked) | **PASS** – Unavailable, `ROOM_BLOCKED` | **PASS** – ❌ Unavailable, `ROOM_BLOCKED` |
| T4 | duration 0 | validation error | **PASS** – "Check your input", `INVALID_DURATION`, "Duration must be a whole number of minutes from 1 to 120." | **PASS** – ⚠️ Check your input, `INVALID_DURATION`, same message |
| T5 | duration 121 | validation error | **PASS** – `INVALID_DURATION` | **PASS** – `INVALID_DURATION` |
| T6 | start 09:00 | validation error | **PASS** – `START_IN_PAST`, "Start time must be in the future (after 09:30)." | **PASS** – `START_IN_PAST`, same message |
| T7 | 11:30, 60 min | Available (touches B2) | **PASS** – Available 11:30–12:30 | **PASS** – Available 11:30–12:30 |
| T8 | after T1–T7 | bookings unchanged | **PASS** – `3 bookings · #c36cc934` before and after; list is frozen | **PASS** – fingerprint and bookings table text identical before and after |
| **Total** | | | **8 / 8** | **8 / 8** |

Both columns were observed **through the user interface**, not only in unit tests:

- Code-based: Chrome via Playwright on the local dev server, 1280 px – [ui-check.txt](test-output/ui-check.txt), [ui-check.json](test-output/ui-check.json).
- Low-code: Chrome via Playwright on the **published public Appsmith URL**, anonymous browser – [appsmith-ui-check.txt](test-output/appsmith-ui-check.txt), [appsmith-ui-check.json](test-output/appsmith-ui-check.json).

Nothing in the low-code column is simulated: every row was clicked in the running Appsmith app.

### Extra evidence

| Check | Code-based | Low-code |
|---|---|---|
| In-app "Run T1–T8" button | 8 / 8 PASS ([screenshot](screenshots/code-T1-T8-runner.png)) | 8 rows PASS, shown over 2 table pages ([screenshot](screenshots/lowcode-T1-T8-runner.png)) |
| Unit tests | 34 tests in `src/contract/roomContract.test.ts` (T1–T8, boundaries 1/120/−5/60.5/6e1, past = now, 14:00 + 60 touching B3, 14:01 overlap, ends after midnight, XSS/injection strings) | The Appsmith JS Object is also run outside Appsmith in `lowcode/appsmith/parity.test.ts`: same output as the code-based core for T1–T7 and for **3 000 generated inputs**; its `testRows()` reports 8 / 8 |
| XSS probe `<img src=x onerror=alert(1)>` | number field drops the text (browser sanitises it to ""), result `INVALID_DURATION`, no `<img>` injected, no alert | text kept in the field, result `INVALID_START`, message does not echo it, no `<img>` injected, no alert ([screenshot](screenshots/lowcode-xss-probe.png)) |
| Binding probe `{{appsmith.user.email}}` typed as start time | not applicable | treated as plain text → `INVALID_START`; not evaluated |
| Narrow screen 375 px | no horizontal scroll, cards stack ([screenshot](screenshots/code-mobile-375.png)) | no horizontal scroll, but the fixed grid squeezes the widgets: label "Room blocked (maintenance)" breaks letter by letter ([screenshot](screenshots/lowcode-mobile-375.png)) |

## Screenshots

| Test | Code-based | Low-code |
|---|---|---|
| T1 | [code-T1](screenshots/code-T1-valid-free-interval.png) | [lowcode-T1](screenshots/lowcode-T1-valid-free-interval.png) |
| T2 | [code-T2](screenshots/code-T2-overlap-with-existing-booking.png) | [lowcode-T2](screenshots/lowcode-T2-overlap-with-existing-booking.png) |
| T3 | [code-T3](screenshots/code-T3-blocked-room.png) | [lowcode-T3](screenshots/lowcode-T3-blocked-room.png) |
| T4 | [code-T4](screenshots/code-T4-duration-0.png) | [lowcode-T4](screenshots/lowcode-T4-duration-0.png) |
| T5 | [code-T5](screenshots/code-T5-duration-121.png) | [lowcode-T5](screenshots/lowcode-T5-duration-121.png) |
| T6 | [code-T6](screenshots/code-T6-start-in-the-past.png) | [lowcode-T6](screenshots/lowcode-T6-start-in-the-past.png) |
| T7 | [code-T7](screenshots/code-T7-adjacent-interval.png) | [lowcode-T7](screenshots/lowcode-T7-adjacent-interval.png) |
| T1–T8 runner | [code-runner](screenshots/code-T1-T8-runner.png) | [lowcode-runner](screenshots/lowcode-T1-T8-runner.png) |
| Editor / build | [App.tsx + contract](../../src/contract/roomContract.ts) | [widgets](screenshots/lowcode-editor-widgets.jpg), [JS Object](screenshots/lowcode-editor-jsobject.jpg) |

## How to run the tests yourself

**Code-based (local):**

```powershell
npm ci
npm test                 # 109 tests, includes T1–T8 and the Appsmith parity test
npm run dev              # open the page, tab "One-room check (Lesson 12)", press "Run T1–T8"
```

UI check with screenshots (needs Playwright Core and Chrome; the dev server must run on port 5179):

```powershell
npx vite --port 5179
$env:PW_MODULE = "<path>\node_modules\playwright-core\index.mjs"; node docs/lesson-12/ui-check/ui-check.mjs
```

**Low-code (Appsmith, public link):** open the app, press **Run T1–T8**, or type the inputs from the table above and press **Check availability**. Automated:

```powershell
$env:PW_MODULE = "<path>\node_modules\playwright-core\index.mjs"; node lowcode/appsmith/ui-check-appsmith.mjs
```
