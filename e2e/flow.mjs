import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const errors = [];
function watch(page, who) {
  page.on("pageerror", (e) => errors.push(`${who} pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/youtube|ERR_|net::|Failed to load resource/i.test(m.text())) errors.push(`${who} console: ${m.text()}`); });
}
const shot = (p, n) => p.screenshot({ path: `e2e/shots/${n}.png`, fullPage: false });

// ---------- Alaa ----------
const a = await browser.newContext(phone);
const pa = await a.newPage(); watch(pa, "alaa");
await pa.goto(BASE); await shot(pa, "01-landing");
await pa.getByRole("link", { name: /Start a blend/ }).click();
await pa.waitForURL("**/new"); await shot(pa, "02-guide");

// wrong file first
await pa.setInputFiles("#takeout-file", "e2e/wrong.json");
await pa.getByText(/couldn't find your watch history/i).first().waitFor(); await shot(pa, "03-error");
await pa.getByRole("button", { name: /Show me the steps again/ }).click();

await pa.setInputFiles("#takeout-file", "e2e/alaa-takeout.zip");
await pa.getByText(/Here's what you listen to/).first().waitFor(); await shot(pa, "04-summary");
await pa.getByPlaceholder("What should friends see?").fill("Alaa");
await pa.getByRole("button", { name: "Create my blend link" }).click();
await pa.waitForURL(/\/b\/[a-z0-9]{8}$/);
await pa.getByText("Send this link to a friend").first().waitFor(); await shot(pa, "05-invite");
const link = pa.url();
console.log("blend link:", link);

// ---------- Sara ----------
const s = await browser.newContext(phone);
const ps = await s.newPage(); watch(ps, "sara");
await ps.goto(link);
await ps.getByText(/wants to blend with you/).first().waitFor(); await shot(ps, "06-friend-landing");
await ps.getByRole("button", { name: /Add my history/ }).click();
await ps.setInputFiles("#takeout-file", "e2e/sara-takeout.zip");
await ps.getByText(/Here's what you listen to/).first().waitFor();
await ps.getByPlaceholder("What should friends see?").fill("Sara");
await ps.getByRole("button", { name: "Join the blend" }).click();
await ps.getByRole("dialog", { name: "Your match" }).waitFor(); await shot(ps, "07-reveal");
await ps.getByRole("button", { name: /See all/ }).click();
await shot(ps, "08-blend");
const titles = await ps.locator("main ul li button > span:nth-child(2) > span:first-child").allTextContents();
console.log("Sara sees songs:", titles);

// Alaa's invite page should flip to the blend by itself
await pa.getByRole("dialog", { name: "Your match" }).waitFor({ timeout: 15000 });
console.log("Alaa auto-refreshed into the blend");
await pa.getByRole("button", { name: "Close" }).click();
await pa.getByRole("button", { name: /Play blend/ }).click();
await pa.waitForTimeout(1500);
await shot(pa, "09-playing-mobile");

// ---------- Lina joins: group of 3 ----------
const l = await browser.newContext(phone);
const pl = await l.newPage(); watch(pl, "lina");
await pl.goto(link);
await pl.getByRole("button", { name: /Add my history/ }).click();
await pl.setInputFiles("#takeout-file", "e2e/alaa-takeout.zip"); // same taste as Alaa, for testing
await pl.getByText(/Here's what you listen to/).first().waitFor();
await pl.getByPlaceholder("What should friends see?").fill("Lina");
await pl.getByRole("button", { name: "Join the blend" }).click();
await pl.getByRole("dialog").waitFor();
await pl.getByRole("button", { name: /See all/ }).click();
await shot(pl, "10-group");
await pl.getByRole("radio", { name: /Any 2/ }).click();
await shot(pl, "11-group-any2");

// ---------- Desktop ----------
const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: await s.storageState() });
const pd = await d.newPage(); watch(pd, "desktop");
await pd.goto(link);
await pd.getByRole("dialog").waitFor();
await shot(pd, "12a-desktop-reveal");
await pd.getByRole("button", { name: "Close" }).click();
await pd.getByRole("button", { name: /Play blend/ }).click();
await pd.waitForTimeout(1500);
await shot(pd, "12-desktop");

// ---------- Home lists blends, leave works ----------
await pl.goto(BASE); await shot(pl, "13-home");
await pl.goto(link);
pl.once("dialog", (dlg) => dlg.accept());
await pl.locator("summary[aria-label='More options']").click();
await pl.getByRole("button", { name: /Leave this blend/ }).click();
await pl.waitForURL(BASE + "/");
const afterLeave = await (await fetch(link)).text();
console.log("Lina left; she is now shown the join page:", /Add my history/.test(afterLeave));

// 404
const r = await pd.goto(BASE + "/b/zzzzzzzz"); console.log("unknown blend status:", r.status());

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "No page errors");
await browser.close();
