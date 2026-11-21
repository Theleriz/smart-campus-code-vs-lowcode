// Practice #11 – UI check of the "Explain availability" feature in Microsoft Edge (desktop 1280 px + mobile 375 px).
// Usage: PW_MODULE=<path to playwright-core/index.mjs> node docs/ui-check/ui-check.mjs [url]
// Writes screenshots to docs/screenshots/ and observed results to docs/test-output/ui-check.json.
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PW_MODULE ? pathToFileURL(process.env.PW_MODULE).href : "playwright-core");
const URL = process.argv[2] ?? "http://localhost:5178/";
const SHOTS = "docs/screenshots";
mkdirSync(SHOTS, { recursive: true });
mkdirSync("docs/test-output", { recursive: true });

const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];

async function run(id, title, opts) {
  const page = await browser.newPage({ viewport: opts.viewport ?? { width: 1280, height: 1000 } });
  await page.goto(URL);
  await page.getByText("Smart Campus").first().waitFor();
  if (opts.now) await page.fill("#current-time", opts.now);
  await page.getByText(opts.room, { exact: true }).click();
  await page.locator('[aria-label="Start exact time"]').fill(opts.start);
  await page.locator('[aria-label="End exact time"]').fill(opts.end);
  await page.getByRole("button", { name: "Check Availability" }).click();
  const section = page.locator("section", { hasText: "3. Check Availability" });
  const decisionBefore = (await section.locator("p.text-lg").innerText()).trim();

  if (opts.engine) await page.selectOption("#engine", opts.engine);
  if (opts.simulate) {
    await page.locator("details summary").click();
    await page.selectOption("#simulate", opts.simulate);
  }
  const t0 = Date.now();
  await page.getByRole("button", { name: "Explain availability" }).click();
  const card = page.getByTestId("explanation");
  await card.waitFor({ timeout: 10_000 });
  const latencyMs = Date.now() - t0;
  const decisionAfter = (await section.locator("p.text-lg").innerText()).trim();
  const source = await card.getAttribute("data-source");
  const label = (await card.locator("p").first().innerText()).trim();
  const text = (await card.locator("p").nth(1).innerText()).trim();
  await section.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/${id}.png`, fullPage: !!opts.viewport });
  results.push({ id, title, input: opts, decisionBefore, decisionAfter, decisionUnchanged: decisionBefore === decisionAfter, source, label, text, latencyMs });
  console.log(`${id} ${title}\n   decision ${decisionBefore} -> ${decisionAfter} | ${source} | ${label}\n   ${text}`);
  await page.close();
}

await run("01-available", "Available slot, Mock AI", { room: "Study Room 204", start: "10:00", end: "11:00" });
await run("02-overlap", "Overlap with existing booking", { room: "Lecture Hall A", start: "13:00", end: "14:00" });
await run("03-blocked-room", "Blocked room", { room: "Computer Lab 3", start: "10:00", end: "11:00" });
await run("04-invalid-time", "Start after end", { room: "Study Room 204", start: "12:00", end: "11:00" });
await run("05-past-time", "Start before current time", { room: "Study Room 204", start: "09:00", end: "10:00" });
await run("06-too-long", "Longer than 120 minutes", { room: "Seminar Room 7", start: "11:30", end: "14:00" });
await run("07-timeout", "Simulated timeout -> fallback", { room: "Lecture Hall A", start: "13:00", end: "14:00", simulate: "timeout" });
await run("08-api-error", "Simulated API failure -> fallback", { room: "Study Room 204", start: "10:00", end: "11:00", simulate: "error" });
await run("09-hallucination", "Hallucinated model answer -> blocked", { room: "Lecture Hall A", start: "13:00", end: "14:00", simulate: "invalid-output" });
await run("10-live-no-key", "Live LLM selected, no server key -> fallback", { room: "Auditorium B", start: "10:00", end: "11:00", engine: "llm" });
await run("11-mobile-overlap", "Mobile 375 px", { room: "Lecture Hall A", start: "13:00", end: "14:00", viewport: { width: 375, height: 812 } });

await browser.close();
writeFileSync("docs/test-output/ui-check.json", JSON.stringify(results, null, 2));
const bad = results.filter((r) => !r.decisionUnchanged);
console.log(`\n${results.length} UI scenarios, decision unchanged in ${results.length - bad.length}/${results.length}`);
