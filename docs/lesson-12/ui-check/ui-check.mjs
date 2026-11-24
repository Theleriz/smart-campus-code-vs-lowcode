// Lesson 12 – runs T1–T8 through the real UI (desktop 1280 px + narrow 375 px) and saves screenshots.
// Usage: PW_MODULE=<path to playwright-core/index.mjs> node docs/lesson-12/ui-check/ui-check.mjs [url]
// Output: docs/lesson-12/screenshots/code-*.png and docs/lesson-12/test-output/ui-check.json
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PW_MODULE ? pathToFileURL(process.env.PW_MODULE).href : "playwright-core");
const URL = process.argv[2] ?? "http://localhost:5179/";
const SHOTS = "docs/lesson-12/screenshots";
const OUT = "docs/lesson-12/test-output";
mkdirSync(SHOTS, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const cases = [
  { id: "T1", title: "Valid free interval", start: "12:00", duration: "60", blocked: false, expect: "AVAILABLE" },
  { id: "T2", title: "Overlap with existing booking", start: "11:00", duration: "60", blocked: false, expect: "UNAVAILABLE" },
  { id: "T3", title: "Blocked room", start: "12:00", duration: "60", blocked: true, expect: "UNAVAILABLE" },
  { id: "T4", title: "Duration = 0", start: "12:00", duration: "0", blocked: false, expect: "INVALID_INPUT" },
  { id: "T5", title: "Duration = 121", start: "12:00", duration: "121", blocked: false, expect: "INVALID_INPUT" },
  { id: "T6", title: "Start in the past", start: "09:00", duration: "30", blocked: false, expect: "INVALID_INPUT" },
  { id: "T7", title: "Adjacent interval", start: "11:30", duration: "60", blocked: false, expect: "AVAILABLE" },
];

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URL);
await page.getByText("Seminar Room 7").first().waitFor();
const fingerprintBefore = await page.getByTestId("fingerprint").innerText();

const results = [];
for (const c of cases) {
  await page.fill("#now", "09:30");
  await page.fill("#start-time", c.start);
  await page.fill("#duration", c.duration);
  await page.setChecked("#blocked", c.blocked);
  await page.getByRole("button", { name: "Check availability" }).click();
  const card = page.getByTestId("result");
  const status = await card.getAttribute("data-status");
  const code = await card.getAttribute("data-code");
  const message = await page.getByTestId("result-message").innerText();
  const name = `code-${c.id}-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  const pass = status === c.expect;
  results.push({ ...c, observedStatus: status, reasonCode: code, message, pass, screenshot: `${name}.png` });
  console.log(`${c.id} ${pass ? "PASS" : "FAIL"}  expected ${c.expect}, observed ${status} (${code}) – ${message}`);
}

const fingerprintAfter = await page.getByTestId("fingerprint").innerText();
const t8 = fingerprintBefore === fingerprintAfter;
results.push({ id: "T8", title: "Bookings unchanged", expect: fingerprintBefore, observedStatus: fingerprintAfter, pass: t8 });
console.log(`T8 ${t8 ? "PASS" : "FAIL"}  before "${fingerprintBefore}", after "${fingerprintAfter}"`);

// In-app runner (same core, one click) – evidence screenshot.
await page.getByRole("button", { name: "Run T1–T8" }).click();
const summary = await page.getByTestId("acceptance-summary").innerText();
console.log(`In-app runner: ${summary}`);
await page.screenshot({ path: `${SHOTS}/code-T1-T8-runner.png`, fullPage: true });

// XSS / injection probe through the UI (DAST-style, local only).
// Playwright refuses to type text into a number field, so set it the way a script would and
// let the browser sanitise it; React gets the same input event a user would trigger.
const PAYLOAD = "<img src=x onerror=alert(1)>";
const storedValue = await page.evaluate((payload) => {
  const el = document.querySelector("#duration");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(el, payload);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return el.value;
}, PAYLOAD);
console.log(`XSS probe: number field kept ${JSON.stringify(storedValue)} after setting the payload`);
let dialog = false;
page.on("dialog", async (d) => { dialog = true; await d.dismiss(); });
await page.getByRole("button", { name: "Check availability" }).click();
const xssCode = await page.getByTestId("result").getAttribute("data-code");
const injectedImg = await page.locator("img[src='x']").count();
console.log(`XSS probe: reasonCode ${xssCode}, injected <img> count ${injectedImg}, alert fired ${dialog}`);
await page.close();

// Narrow screen (375 px).
const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
await mobile.goto(URL);
await mobile.fill("#start-time", "11:00");
await mobile.getByRole("button", { name: "Check availability" }).click();
await mobile.screenshot({ path: `${SHOTS}/code-mobile-375.png`, fullPage: true });
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(`Mobile 375 px: horizontal overflow ${overflow}`);
await mobile.close();
await browser.close();

const passed = results.filter((r) => r.pass).length;
writeFileSync(
  `${OUT}/ui-check.json`,
  JSON.stringify({ url: URL, ranAt: new Date().toISOString(), passed, total: results.length, results,
    inAppRunner: summary, xssProbe: { payload: PAYLOAD, storedValue, reasonCode: xssCode, injectedImg, alertFired: dialog }, mobileOverflow: overflow }, null, 2),
);
console.log(`\n${passed} / ${results.length} passed`);
