# Engineering effort and comparison matrix (Task 06)

## How the time was measured

Both solutions were built in the same session by me working with an AI coding assistant, on 2026-11-24. Times come from command timestamps and the session log (start, commit, deploy, test runs). They are **measured wall-clock minutes**, rounded to whole minutes. Where a phase boundary was not timestamped, the split is an estimate and is marked "≈".

Important context: the assistant typed the code and drove the Appsmith editor. A student doing it by hand would need more time for both. The **ratio** between the two is the more useful number.

| Phase | Code-based (React + TypeScript) | Low-code (Appsmith Cloud, free plan) |
|---|---|---|
| Setup | 1 min (copy repo, `npm ci`, baseline checks) | ≈3 min (account sign-in by the student, not timed exactly; new app) |
| Implementation | ≈3 min (contract module, UI component, tabs) | ≈12 min (JS Object, 11 widgets, labels, bindings, events, deploy, make public) |
| Debugging / repair | ≈2 min (XSS probe could not type into a number field; mobile text wrap) | ≈8 min (see defects below) |
| Testing | ≈1 min to run (unit + UI script, 8 / 8) | ≈2 min to run (UI script on the public app, 8 / 8) |
| **Total** | **≈7 min** (18:45 → 18:52) | **≈25 min** (≈18:56 → 19:21) |

### Defects found while building (both unresolved count = 0 at the end)

| # | Solution | Defect | How it was found | Fixed by |
|---|---|---|---|---|
| D1 | Code | Mobile result line broke `11:00–12:00` mid-number (`break-all`) | screenshot review | `break-words` |
| D2 | Code (test) | Playwright cannot type text into `<input type=number>` | UI script error | set the value like a script would; recorded that the browser drops it |
| D3 | Low-code | Widgets could not be dragged by synthetic mouse events (HTML5 drag) | nothing was added to the canvas | started the drag through the palette card, then dropped with a click |
| D4 | Low-code | Some property values (two labels, a default value, `TestsTable` data) were **not saved** when the next edit (rename) came too quickly | reading the property values back after reload | re-entered with a real click in the field and waited before the next edit |
| D5 | Low-code | `BlockedSwitch` default flipped back to **on** after the widget rename | reading the property after reload | switched off again, verified after reload |
| D6 | Low-code | `TestsTable` stayed empty: the table only creates its columns when it sees data in the editor | public UI run showed "0 PASS cells" | bound it to `RoomCheck.testRows()` once (5 columns created), then back to `appsmith.store.tests` |
| D7 | Low-code (test) | Appsmith's button wrapper intercepts pointer events, so Playwright refused to click | UI script timeout | `click({ force: true })` |

D4 and D5 are the worst kind of low-code defect: the editor showed the new value, but the saved app did not have it, and nothing warned about it. They were found only because the values were read back after a reload and then tested on the published app.

## Comparison matrix

| Criterion | Code-based | Low-code (Appsmith) |
|---|---|---|
| **Functional tests** | **8 / 8** (UI) + 34 unit tests for the contract | **8 / 8** (UI on the published app) + parity test of its logic on 3 000 inputs |
| **Build and repair time** | **≈7 min** (5 build + 2 repair) | **≈25 min** (15 build + 8 repair + 2 test) |
| **Customization** | Full: any layout, responsive at 375 px, in-app test runner, `data-testid`s, exact messages. | Good for forms and tables; logic in JS Objects. Limited layout: the fixed grid does not reflow well at 375 px (label breaks per letter); table columns depend on editor-time data; widget styles only through the property pane. |
| **Security controls** | All in our hands: validation in one pure module, React escapes output, no `dangerouslySetInnerHTML`, no network call in this feature. We also own the work: CSP/headers are not set yet; `npm audit` shows 14 dev-dependency advisories to fix (0 in production dependencies). | Platform runs hosting, TLS, login, editor access (anonymous `/edit` → login page). We still own the app: validation in the JS Object, the public-share switch, not exposing `appsmith.user.*` (the default Text widget showed the editor's e-mail), no secrets in JS Objects (their code is sent to every viewer). No control over headers or platform dependencies. |
| **Versioning / portability** | Git history (each step a commit), diffs, code review, tests in the repo; runs on any Node host or as static files. | Appsmith keeps its own saved state (no diff, no review). Git sync is offered ("Connect Git") but was not set up; JSON export is Appsmith-specific. The logic is portable only because we copied the JS Object into the repo (`lowcode/appsmith/RoomCheck.js`) and test it there. |
| **Ongoing cost** | $0 (public GitHub repo; static hosting such as GitHub Pages is free). Maintenance: dependency updates are our job. | $0 on the free cloud plan, no subscription bought. Paid plan needed for features shown as locked in the UI, for example application-level access ("For application-level access, try out our business plan"). Platform updates are automatic (version 2.7.3-SNAPSHOT, "released 1 day ago"): no work, but also no control. |

**Measured vs. impression.** Test counts, times, defects D1–D7, the 375 px screenshots, the audit numbers and the access-check results are measured. The statements "good for forms and tables" and "a student by hand would need more time" are my impressions.

## Recommendation

For the Smart Campus checker I recommend the **code-based** solution as the main product: it was faster to build and repair here, it is the only one with reviewable history and real automated tests, it works on narrow screens, and nothing is locked to one vendor.

Appsmith is a reasonable choice for a **quick internal tool** around the same rules (for example a staff page with tables), as long as:

1. the rules live in **one JS Object** that is also kept in git and tested outside the platform (as `lowcode/appsmith/parity.test.ts` does here);
2. every change is checked on the **published** app after a reload, because the editor can show values that were not saved (D4, D5);
3. public sharing is a conscious decision, and no `appsmith.user` data or secrets are placed in widgets or JS Objects.
