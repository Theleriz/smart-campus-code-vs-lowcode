// Lesson 12 – runs T1–T8 through the PUBLISHED Appsmith app (anonymous browser, no login) and saves screenshots.
// Usage: PW_MODULE=<path to playwright-core/index.mjs> node lowcode/appsmith/ui-check-appsmith.mjs [url]
// Output: docs/lesson-12/screenshots/lowcode-*.png and docs/lesson-12/test-output/appsmith-ui-check.json
// Only a handful of normal page loads/clicks on our own public app – no scanning of the platform.
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PW_MODULE ? pathToFileURL(process.env.PW_MODULE).href : "playwright-core");
const URL = process.argv[2] ?? "https://app.appsmith.com/app/smart-campus-room-checker-lowcode/page1-6b0598525441f3e820a02932";
const SHOTS = "docs/lesson-12/screenshots";
const OUT = "docs/lesson-12/test-output";
mkdirSync(SHOTS, { recursive: true });
mkdirSync(OUT, { recursive: true });

// Appsmith widget ids (stable per app): see lowcode/appsmith/README.md
const W = {
  now: ".appsmith_widget_v7u5b0dff5 input",
  start: ".appsmith_widget_53i8w5q2y5 input",
  duration: ".appsmith_widget_lkznkmlfo1 input",
  blocked: ".appsmith_widget_mjc6cw3si4 input[type=checkbox]",
  blockedLabel: ".appsmith_widget_mjc6cw3si4 label",
  check: ".appsmith_widget_tjx0fqkmfn button",
  result: ".appsmith_widget_erbz7m4d7c",
  bookings: ".appsmith_widget_xiba61p5vo",
  runTests: ".appsmith_widget_9xibiinuvf button",
  tests: ".appsmith_widget_6ne8jt61k8",
  title: ".appsmith_widget_lu2vndceaz",
};

const browser = await chromium.launch({
  executablePath: process.env.BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.locator(W.check).waitFor({ timeout: 60_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS}/lowcode-00-initial.png` });
const initialBlocked = await page.locator(W.blocked).isChecked();
console.log(`Initial state: blocked switch ${initialBlocked ? "ON" : "off"}`);

const fill = async (sel, value) => {
  await page.locator(sel).click();
  await page.locator(sel).press("Control+A");
  await page.locator(sel).pressSequentially(value, { delay: 15 });
};
const setBlocked = async (want) => {
  if ((await page.locator(W.blocked).isChecked()) !== want) await page.locator(W.blockedLabel).first().click();
  await page.waitForTimeout(200);
};

const bookingsText = async () => (await page.locator(W.bookings).innerText()).replace(/\s+/g, " ").trim();
const titleText = async () => (await page.locator(W.title).innerText()).trim();
const fingerprintBefore = await titleText();
const bookingsBefore = await bookingsText();

const cases = [
  { id: "T1", title: "Valid free interval", start: "12:00", duration: "60", blocked: false, expect: "AVAILABLE" },
  { id: "T2", title: "Overlap with existing booking", start: "11:00", duration: "60", blocked: false, expect: "OVERLAP" },
  { id: "T3", title: "Blocked room", start: "12:00", duration: "60", blocked: true, expect: "ROOM_BLOCKED" },
  { id: "T4", title: "Duration = 0", start: "12:00", duration: "0", blocked: false, expect: "INVALID_DURATION" },
  { id: "T5", title: "Duration = 121", start: "12:00", duration: "121", blocked: false, expect: "INVALID_DURATION" },
  { id: "T6", title: "Start in the past", start: "09:00", duration: "30", blocked: false, expect: "START_IN_PAST" },
  { id: "T7", title: "Adjacent interval", start: "11:30", duration: "60", blocked: false, expect: "AVAILABLE" },
];

const results = [];
for (const c of cases) {
  await fill(W.now, "09:30");
  await fill(W.start, c.start);
  await fill(W.duration, c.duration);
  await setBlocked(c.blocked);
  await page.locator(W.check).click({ force: true });
  await page.waitForTimeout(800);
  const text = (await page.locator(W.result).innerText()).trim();
  const code = /reasonCode: ([A-Z_]+)/.exec(text)?.[1] ?? "?";
  const name = `lowcode-${c.id}-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  const pass = code === c.expect;
  results.push({ ...c, observed: text, reasonCode: code, pass, screenshot: `${name}.png` });
  console.log(`${c.id} ${pass ? "PASS" : "FAIL"}  expected ${c.expect}, observed ${code} – ${text}`);
}
await setBlocked(false);

const fingerprintAfter = await titleText();
const bookingsAfter = await bookingsText();
const t8 = fingerprintBefore === fingerprintAfter && bookingsBefore === bookingsAfter;
results.push({ id: "T8", title: "Bookings unchanged", expect: fingerprintBefore, observed: fingerprintAfter, bookingsTableUnchanged: bookingsBefore === bookingsAfter, pass: t8 });
console.log(`T8 ${t8 ? "PASS" : "FAIL"}  fingerprint before/after equal: ${fingerprintBefore === fingerprintAfter}, table equal: ${bookingsBefore === bookingsAfter}`);

// In-app runner (JS Object runTests) – one click, results in the second table.
await page.locator(W.runTests).click({ force: true });
await page.waitForTimeout(1500);
const testsTable = (await page.locator(W.tests).innerText()).replace(/\s+/g, " ");
const passCount = (testsTable.match(/\bPASS\b/g) ?? []).length;
console.log(`In-app runner: ${passCount} PASS cells in the tests table`);
await page.screenshot({ path: `${SHOTS}/lowcode-T1-T8-runner.png`, fullPage: true });

// XSS / injection probe through the published UI (own app, a few requests only).
let dialog = false;
page.on("dialog", async (d) => { dialog = true; await d.dismiss(); });
const PAYLOAD = "<img src=x onerror=alert(1)>";
await fill(W.start, PAYLOAD);
await fill(W.duration, "60");
await page.locator(W.check).click({ force: true });
await page.waitForTimeout(800);
const xssText = (await page.locator(W.result).innerText()).trim();
const injectedImg = await page.locator("img[src='x']").count();
const startValue = await page.locator(W.start).inputValue();
await page.screenshot({ path: `${SHOTS}/lowcode-xss-probe.png` });
console.log(`XSS probe: field kept ${JSON.stringify(startValue)}, result "${xssText}", injected <img> ${injectedImg}, alert ${dialog}`);

// Mustache/binding injection probe: user text must not be evaluated as {{ }}.
await fill(W.start, "{{appsmith.user.email}}");
await page.locator(W.check).click({ force: true });
await page.waitForTimeout(800);
const bindText = (await page.locator(W.result).innerText()).trim();
console.log(`Binding probe: result "${bindText}"`);
await page.close();

// Narrow screen (375 px): Appsmith switches to its mobile layout.
const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
await mobile.goto(URL, { waitUntil: "domcontentloaded" });
await mobile.locator(W.check).waitFor({ timeout: 60_000 });
await mobile.waitForTimeout(1500);
await mobile.locator(W.start).fill("11:00");
await mobile.locator(W.check).click({ force: true });
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: `${SHOTS}/lowcode-mobile-375.png`, fullPage: true });
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(`Mobile 375 px: horizontal overflow ${overflow}`);
await browser.close();

const passed = results.filter((r) => r.pass).length;
writeFileSync(
  `${OUT}/appsmith-ui-check.json`,
  JSON.stringify({ url: URL, ranAt: new Date().toISOString(), passed, total: results.length, results,
    inAppRunnerPassCells: passCount, xssProbe: { payload: PAYLOAD, startValue, result: xssText, injectedImg, alertFired: dialog },
    bindingProbe: bindText, mobileOverflow: overflow }, null, 2),
);
console.log(`\n${passed} / ${results.length} passed`);
