// Renders pages with a real (headless) browser before parsing, instead of
// a plain fetch. Needed because many real restaurant/chain sites are
// JavaScript-rendered - the address/menu content, and any structured data
// describing it, gets injected client-side after the initial HTML loads,
// so a plain fetch never sees it. One shared browser instance for the
// whole scraper run (launching a browser per page would be wasteful);
// each page gets its own context so cookies/state don't leak between
// sites.

import { chromium } from "playwright";

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch();
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

export async function fetchRenderedHtml(url, userAgent) {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent });
  const page = await context.newPage();

  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    try {
      // Best-effort: some sites (chat widgets, analytics beacons) never
      // go fully idle. Whatever's rendered after this short wait is what
      // we parse - better than waiting the full 20s timeout every time.
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch {
      // proceed with whatever has rendered so far
    }

    const html = await page.content();
    return { ok: response ? response.ok() : false, status: response ? response.status() : 0, html };
  } finally {
    await context.close();
  }
}
