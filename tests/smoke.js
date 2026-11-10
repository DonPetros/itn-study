"use strict";
/**
 * Headless Chrome walk-through. Expects the site at SMOKE_URL (default http://127.0.0.1:8812/).
 * Exits non-zero on console errors or failed assertions.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const URL = process.env.SMOKE_URL || "http://127.0.0.1:8812/";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const SHOTS = path.join(__dirname, "..", "screens");
fs.mkdirSync(SHOTS, { recursive: true });

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

(async () => {
  const errors = [];
  const pageErrors = [];
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().startsWith(URL)) {
      errors.push("HTTP " + res.status() + " " + res.url());
    }
  });

  async function shot(name) {
    await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true });
  }

  await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });
  const title = await page.title();
  if (title !== "ITN Study") fail("title was " + title);
  const heading = await page.$eval(".name", (el) => el.textContent);
  if (heading !== "ITN Study") fail("home heading " + heading);
  const modCount = await page.$$eval(".mod", (els) => els.length);
  if (modCount !== 17) fail("expected 17 modules, got " + modCount);
  const cd = await page.$eval(".countdown .v", (el) => el.textContent);
  if (!/days left|Due today|due date has passed|1 day left/i.test(cd)) fail("countdown text: " + cd);
  await shot("01-home");

  // Open module 1, first card
  await page.click('.mod[href="#/module/m01"]');
  await page.waitForSelector(".step h3");
  const cardTitle = await page.$eval(".step h3", (el) => el.textContent);
  if (!cardTitle) fail("empty card title");
  await shot("02-card");
  await page.click('button[data-go="#/module/m01/1"]');
  await page.waitForFunction(() => document.querySelector(".cnt")?.textContent === "2/10");

  // Quiz: pick first option and check
  await page.goto(URL + "#/module/m01/quiz", { waitUntil: "networkidle0" });
  await page.waitForSelector(".opt");
  await page.click(".opt");
  await page.click('button[data-quiz="check"]');
  await page.waitForSelector(".why");
  const why = await page.$eval(".why", (el) => el.textContent);
  if (!/why/i.test(why) || why.length < 20) fail("missing why: " + why);
  await shot("03-quiz-feedback");

  // Subnet drill
  await page.goto(URL + "#/drill/subnet", { waitUntil: "networkidle0" });
  await page.waitForSelector(".opt, .q");
  const prompt = await page.$eval(".q", (el) => el.textContent);
  if (!prompt) fail("empty drill prompt");
  if (await page.$(".opt")) {
    await page.click(".opt");
    await page.click('button[data-drill="check"]');
    await page.waitForSelector(".why");
    const steps = await page.$$eval(".why li", (els) => els.length);
    if (steps < 2) fail("expected worked steps, got " + steps);
  }
  await shot("04-drill");

  // Cards home
  await page.goto(URL + "#/cards", { waitUntil: "networkidle0" });
  await page.waitForSelector(".name");
  const due = await page.$eval(".stat .v", (el) => el.textContent);
  if (!/^\d+$/.test(due)) fail("due count " + due);
  await shot("05-cards");

  // Focus home
  await page.goto(URL + "#/focus", { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-focus-start]");
  await shot("06-focus");

  // Settings + dark theme
  await page.goto(URL + "#/me", { waitUntil: "networkidle0" });
  await page.waitForSelector('[data-set="theme"]');
  await page.click('[data-set="theme"]');
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  if (!isDark) fail("dark theme did not apply");
  await shot("07-settings-dark");
  await page.click('[data-set="theme"]'); // leave light as default for later

  await browser.close();
  const ignored = errors.filter((t) => /favicon|Download the React DevTools/i.test(t));
  const real = errors.filter((t) => !ignored.includes(t)).concat(pageErrors);
  if (real.length) {
    console.error("Console/page errors:");
    real.forEach((t) => console.error(" -", t));
    process.exitCode = 1;
  }
  console.log("smoke ok, console errors=" + real.length);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
