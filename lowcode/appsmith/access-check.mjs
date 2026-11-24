// Lesson 12 – safe DAST-style access check of our own published Appsmith app (anonymous browser, 2 page loads).
// Usage: PW_MODULE=<path to playwright-core/index.mjs> node lowcode/appsmith/access-check.mjs
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.env.PW_MODULE).href);
const APP = "https://app.appsmith.com/app/smart-campus-room-checker-lowcode/page1-6b0598525441f3e820a02932";
const browser = await chromium.launch({ executablePath: process.env.BROWSER ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });

// 1) Can an anonymous visitor open the editor?
const p1 = await browser.newPage();
await p1.goto(`${APP}/edit`, { waitUntil: "domcontentloaded" });
await p1.waitForTimeout(6000);
console.log(`Anonymous /edit -> ${new URL(p1.url()).pathname} | login form visible: ${await p1.locator("input[type=password]").count() > 0}`);

// 2) Is the JS Object source shipped to the browser of an anonymous viewer?
const p2 = await browser.newPage();
let codeSeen = false, emailLike = false;
p2.on("response", async (r) => {
  if (!r.url().includes("/api/")) return;
  try {
    const t = await r.text();
    if (t.includes("MAX_DURATION") || t.includes("toMinutes")) codeSeen = true;
    const emails = (t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) ?? []).filter((e) => !/^anonymousUser@|@appsmith\.com$/.test(e));
    if (emails.length) { emailLike = true; console.log(`  e-mail-like value in ${new URL(r.url()).pathname} (${emails.length}x, not printed)`); }
  } catch { /* ignore bodies that cannot be read */ }
});
await p2.goto(APP, { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(8000);
const pageText = await p2.locator("body").innerText();
console.log(`Viewer page: JS Object source in API responses: ${codeSeen}`);
console.log(`Viewer page: e-mail-like string in API responses (besides anonymousUser and @appsmith.com): ${emailLike}`);
console.log(`Viewer page: e-mail-like string in visible text: ${/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(pageText)}`);
await browser.close();
