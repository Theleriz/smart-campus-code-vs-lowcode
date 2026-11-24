# Low-code solution: Appsmith

**Live app (public, view only):** https://app.appsmith.com/app/smart-campus-room-checker-lowcode/page1-6b0598525441f3e820a02932

Platform: Appsmith Cloud, free plan (no subscription), editor version 2.7.3-SNAPSHOT, built on 2026-11-24.
App name: *Smart Campus Room Checker Lowcode*, one page, no datasource, no queries.

## What is in this folder

| File | Purpose |
|---|---|
| `RoomCheck.js` | The Appsmith **JS Object** `RoomCheck`, the same code as in the app (`check`, `run`, `runTests`, `testRows`, `fingerprint`, fixed `bookings`) |
| `bookings.json` | The same three fictional bookings as `src/contract/data.ts` |
| `parity.test.ts` | Runs `RoomCheck.js` outside Appsmith and compares it with the code-based `checkRoom` (T1–T7 and 3 000 generated inputs) |
| `ui-check-appsmith.mjs` | Playwright script: T1–T8 through the **published** app, XSS and binding probes, 375 px screenshot |
| `access-check.mjs` | Safe access check: anonymous `/edit` access, e-mail leak, JS Object visibility |

## Widgets (how to rebuild the app)

| Widget | Type | Key settings |
|---|---|---|
| `Text1` | Text | `Smart Campus · Seminar Room 7 (low-code, Appsmith) — fictional data · {{RoomCheck.fingerprint()}}` |
| `NowInput` | Input, single-line text | Label "Current time (simulated, HH:MM)", default `09:30` |
| `StartInput` | Input, single-line text | Label "Start time (HH:MM)", default `12:00` |
| `DurationInput` | Input, **Number** | Label "Duration (minutes, 1–120)", default `60`, Min/Max empty (the JS Object validates) |
| `BlockedSwitch` | Switch | Label "Room blocked (maintenance)", default state **off** |
| `Button1` | Button | Label "Check availability", onClick (JS) `{{RoomCheck.run()}}` |
| `ResultText` | Text | `{{ appsmith.store.result ? (… "✅ Available" / "❌ Unavailable" / "⚠️ Check your input") + " — " + message + " [available · reasonCode]" : "Choose a start time …" }}` |
| `BookingsTable` | Table | Table data (JS) `{{RoomCheck.bookings}}` |
| `Button2` | Button | Label "Run T1–T8", onClick (JS) `{{RoomCheck.runTests()}}` |
| `TestsTable` | Table | Table data (JS) `{{appsmith.store.tests \|\| []}}`. Bind it once to `{{RoomCheck.testRows()}}` so that the 5 columns are created, then switch back |

Steps: create an app → JS tab → new JS Object, rename to `RoomCheck`, paste `RoomCheck.js` (from `export default` on) → UI tab → add the widgets above, rename them exactly → set the properties → **Deploy** → Share → "Make application public" (only for the demo).

## Things the platform could not do (or not easily)

- **Responsive layout:** the fixed grid squeezes widgets at 375 px instead of stacking them (label text breaks per letter). The code-based app stacks cards properly.
- **Versioning:** no diff/review of changes inside the editor. Git sync is offered but was not set up; the JSON export is Appsmith-specific.
- **Unit tests inside the platform:** none. We test the JS Object outside Appsmith (`parity.test.ts`) and the app through its UI (`ui-check-appsmith.mjs`).
- **Security headers / dependency control:** managed by the vendor, not configurable on the free plan.
