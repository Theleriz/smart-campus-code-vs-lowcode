# Reflection on AI use

**What the AI assistant did.** It read the slides and the previous practice, and proposed the shared contract (inputs, outputs, reason codes, rule order). It wrote the code-based contract module, the UI and the tests, and built the Appsmith app in my account after I signed in. It also wrote the UI test scripts for both apps and drafted these documents. I chose the platform (Appsmith), the repository set-up and the public link, and I reviewed the diffs and the results.

**What worked well.**
- Writing the contract and the common test inputs *before* building either app meant both apps could be checked against the same table. Without that, "8 / 8" would mean different things on each side.
- Keeping the Appsmith logic in one JS Object that is also a file in the repo let us test it with the same unit-test runner (`parity.test.ts`, 3 000 generated inputs). That is the strongest evidence that the two apps really implement the same rules.

**What did not work well / where I had to be careful.**
- The low-code editor was the hardest part to automate: drag-and-drop, property fields that looked updated but were not saved (D4, D5), and a table without columns (D6). The assistant reported "set" values that were later missing. I trust only what was read back after a reload and observed on the published app.
- The first UI run of the Appsmith app said "8 / 8" for T1–T8, but its in-app runner table was empty. A green summary can hide a broken feature, so I checked the screenshots as well as the numbers.
- The time measurements are for AI-assisted work. They show the ratio between the two approaches, not how long a person would need.

**Incomplete or simulated parts (clearly labelled).**
- Nothing in the 8-test table is simulated: both columns were run through the real UIs.
- The "current time" is **simulated** in both apps (an input with default 09:30) so the tests are repeatable. A real system would use the server clock.
- The Appsmith app is not connected to Appsmith Git sync, and the JSON export is not in the repository yet. The logic itself is in the repo (`lowcode/appsmith/RoomCheck.js`), and the widget set-up is described in `lowcode/appsmith/README.md`.
- Both apps have a public live demo: code-based on GitHub Pages (https://theleriz.github.io/smart-campus-code-vs-lowcode/, published after my approval), low-code on Appsmith.
- `npm audit` dev-dependency advisories are documented, not fixed (major upgrades, separate task).

**What I would do differently next time.** Connect Appsmith to Git from the start, so the low-code side also gets reviewable history. Read back every property after editing it, not only at the end.
