# Security review of both solutions (Task 07, Lecture #12)

Scope: our own code, our own Appsmith app and its public link. No third-party service was scanned. The runtime checks were a few normal page loads and clicks on our own app (DAST perspective, "safe manual checks").

Legend: ✅ checked and OK · ⚠️ checked, weakness or follow-up · ➖ not applicable

## Checklist

| # | Check | Code-based | Evidence | Low-code (Appsmith) | Evidence |
|---|---|---|---|---|---|
| 1 | Input validation is server/logic-side, not only in the widget | ✅ All rules in `validateInput` (strict `HH:MM` regex, duration digits only 1–120, fail-closed on bad "now" or bad booking data). The UI only passes raw values. | `src/contract/roomContract.ts`, 34 tests | ✅ Same rules in the `RoomCheck` JS Object; the widgets have no own validation (Min/Max empty on purpose, so both apps behave the same). ⚠️ Platform-level Min/Max could be added as a second layer. | parity test (3 000 inputs), T4–T6 |
| 2 | Injection (SQL / code / template) | ✅ No database, no query, no `eval`; user text only goes through a regex. | grep: no `eval`, no DB client | ✅ No datasource/query. Typed `{{appsmith.user.email}}` is treated as text → `INVALID_START`, not evaluated. | [appsmith-ui-check.txt](test-output/appsmith-ui-check.txt) |
| 3 | XSS in output | ✅ React escapes text; no `dangerouslySetInnerHTML`/`innerHTML` in `src/`; messages never echo user input. Probe `<img src=x onerror=alert(1)>`: no `<img>` injected, no alert. | [ui-check.txt](test-output/ui-check.txt), unit tests "hostile input is rejected and never echoed" | ✅ Same probe on the public app: no `<img>` injected, no alert; the message does not contain the payload. ⚠️ Not tested: whether a Text widget renders HTML from a binding. Rule for later changes: never bind raw user text into a Text widget. | [lowcode-xss-probe.png](screenshots/lowcode-xss-probe.png) |
| 4 | Sensitive-data exposure | ✅ Fictional data only, no personal data, no login. | `src/contract/data.ts` | ⚠️→✅ **Found:** the default Text widget template is `Hello {{appsmith.user.name \|\| appsmith.user.email}}`. In the editor it showed my account name ("Hello Theleriz"); for a user without a name it falls back to the e-mail. Replaced in both Text widgets before publishing. Anonymous viewer: no e-mail-like value in visible text or API responses. | [appsmith-access-check.txt](test-output/appsmith-access-check.txt) |
| 5 | Permissions / least privilege | ✅ Static page, nothing to protect; repository is public by design (no secrets). | `git ls-files` (no `.env`) | ✅ Workspace has one member (me, Administrator); nobody invited. Anonymous `/edit` → redirected to `/user/login`. ⚠️ Free plan has workspace-level roles only ("For application-level access, try out our business plan"). | Share dialog, access check |
| 6 | Public sharing | ✅ Public GitHub repo is intended. | – | ⚠️ "Make application public" is **on** (needed for the demo link). Anyone with the link can view and use the app; it has no data worth protecting. Switch it off after grading. | Share dialog |
| 7 | Secrets | ✅ No secret in the repo or bundle. The older LLM key (Practice #11) is read only from the server environment (`LLM_API_KEY`), never `VITE_`. | grep for keys, `.gitignore` has `.env` | ✅ No secret anywhere. ⚠️ JS Object code is downloaded by every viewer (confirmed: the source is in the viewer's API responses), so a secret placed there would be public. | access check: "JS Object source in API responses: true" |
| 8 | Connectors / integrations | ✅ No network call in the Lesson 12 feature. | – | ✅ No datasource connected; offered sample DBs and AI integrations (OpenAI, Google AI, …) were skipped. | editor: Queries empty |
| 9 | Dependencies (SCA) | ⚠️ We are responsible. `npm audit --omit=dev`: **0** vulnerabilities in production dependencies. `npm audit` (all): **14** advisories, all in dev tooling (vite ≤6.4.3 high, vitest/tinypool critical, esbuild dev-server, typescript-eslint). They affect the dev server and test runner, not the built page. Fix = major upgrade of vite/vitest (breaking) → separate task. Unused `@supabase/supabase-js` should be removed. | [npm-audit.txt](test-output/npm-audit.txt) | ⚠️ Platform responsibility: Appsmith Cloud updates itself (v2.7.3-SNAPSHOT). We cannot audit or pin it. Our part: keep the JS Object free of third-party libraries (it uses none). | editor footer |
| 10 | Runtime checks (DAST) | ✅ UI probes on localhost: XSS payload, number-field sanitising, 375 px layout. ⚠️ No security headers (CSP, X-Frame-Options) on the dev server; add them when it is deployed. Do not expose the Vite dev server to a network (esbuild advisory). | `docs/lesson-12/ui-check/ui-check.mjs` | ✅ On the public URL: XSS and binding probes, anonymous editor access, e-mail leak check. Headers are controlled by the platform. | `lowcode/appsmith/ui-check-appsmith.mjs`, `access-check.mjs` |
| 11 | AI-agent safety | ✅ The assistant only edited this repo; every change was reviewed and committed by me; tests were run, never assumed. | git history | ✅ The assistant only used my Appsmith account to build this one app; I signed in myself; no credentials were typed by the assistant; no imported templates. | – |

## Shared-responsibility summary

| Area | Code-based: who | Low-code: who |
|---|---|---|
| Business rules and validation | us | us (JS Object) |
| Output encoding | React (framework) + us | platform widgets + us |
| Hosting, TLS, login to editor | us (when deployed) | Appsmith |
| Dependency / platform updates | us (`npm audit`, upgrades) | Appsmith |
| Sharing and access settings | GitHub repo visibility | Appsmith share dialog (public on) |

**Conclusion.** Low-code did not remove security work. It moved hosting and patching to the vendor. The two issues that mattered in the low-code app came from **defaults** (a greeting that shows the user's e-mail, the public switch). We found them only because we reviewed the app's settings. In the code-based app, the remaining work is dependency upgrades and security headers before any deployment.
