// Standalone entry point - architecturally separate from the Next.js app
// (spec Section 9): no imports from app/lib/components, runs on its own
// schedule, doesn't serve requests. Invoke with `npm run scrape`.
//
// There's no host to actually schedule this on yet (the app itself isn't
// deployed anywhere - see project memory). Once it is, this is what a
// weekly cron/scheduled job would invoke.

import { readFileSync } from "node:fs";
import { sources } from "./sources.mjs";
import { isAggregatorDomain } from "./aggregators.mjs";
import { isAllowedByRobots } from "./robots.mjs";
import { throttle } from "./rateLimiter.mjs";
import { extractRestaurantData } from "./parse.mjs";
import { geocode } from "./geocode.mjs";
import { createScraperClient, ingestRestaurant } from "./ingest.mjs";
import { fetchRenderedHtml, closeBrowser } from "./browser.mjs";

export const USER_AGENT = "MenuRateScraper/0.1 (+https://github.com/IsaiahKwpz/MenuRate.Com)";

export function loadEnv() {
  return Object.fromEntries(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

export async function scrapeSource(source, supabase) {
  console.log(`\n--- ${source.url} ---`);

  if (isAggregatorDomain(source.url)) {
    console.log("Skipped: aggregator domain, never scraped per spec Section 5.");
    return { url: source.url, status: "skipped-aggregator" };
  }

  const allowed = await isAllowedByRobots(source.url, USER_AGENT);
  if (!allowed) {
    console.log("Skipped: disallowed by robots.txt.");
    return { url: source.url, status: "skipped-robots" };
  }

  await throttle(source.url);
  const { ok, status, html } = await fetchRenderedHtml(source.url, USER_AGENT);
  if (!ok) {
    console.log(`Skipped: fetch failed (HTTP ${status}).`);
    return { url: source.url, status: "fetch-failed" };
  }

  const data = extractRestaurantData(html);
  if (!data || data.items.length === 0) {
    console.log("Skipped: no schema.org Menu markup found on this page.");
    return { url: source.url, status: "no-structured-data" };
  }

  console.log(`Found "${data.name}" with ${data.items.length} menu item(s).`);

  const coords = await geocode(data.address);
  if (!coords) {
    console.log("Warning: geocoding failed - ingesting without lat/lng.");
  }

  const result = await ingestRestaurant(
    supabase,
    {
      name: data.name,
      address: data.address,
      type: source.type,
      brandName: source.brandName,
      items: data.items,
    },
    coords,
  );

  console.log(
    `Ingested: restaurant ${result.wasNew ? "created" : "matched an existing restaurant"}, ` +
      `${result.itemsCreated} item(s) created, ${result.itemsUpdated} item(s) price-updated.`,
  );

  return { url: source.url, status: "ok", ...result };
}

async function main() {
  if (sources.length === 0) {
    console.log("No sources configured - add real restaurant URLs to scraper/sources.mjs.");
    return;
  }

  const env = loadEnv();
  const supabase = createScraperClient(env);

  const results = [];
  try {
    for (const source of sources) {
      try {
        results.push(await scrapeSource(source, supabase));
      } catch (err) {
        console.error(`Error scraping ${source.url}:`, err.message);
        results.push({ url: source.url, status: "error", error: err.message });
      }
    }
  } finally {
    await closeBrowser();
  }

  console.log("\n--- Summary ---");
  for (const r of results) {
    console.log(`${r.status.padEnd(22)} ${r.url}`);
  }
}

main();
