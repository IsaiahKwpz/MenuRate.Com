// One-off ingestion of the first real-restaurant research batch (Ottawa area).
// Run with: node scripts/ingest-batch1.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local.
//
// Data was gathered by AI-assisted manual research against each restaurant's
// own official site (see docs/build-progress.md) - never aggregators, never
// fabricated. Reuses the scraper's geocode/ingest helpers so this batch goes
// through the same dedup-safe path a real scrape would.

import { readFileSync } from "node:fs";
import { createScraperClient, ingestRestaurant } from "../scraper/ingest.mjs";
import { geocode } from "../scraper/geocode.mjs";

import { independents1 } from "./data/independents-1.mjs";
import { independents2 } from "./data/independents-2.mjs";
import { independents3 } from "./data/independents-3.mjs";
import { independents4 } from "./data/independents-4.mjs";
import { chains1 } from "./data/chains-1.mjs";
import { chains2 } from "./data/chains-2.mjs";
import { chains3 } from "./data/chains-3.mjs";
import { chains4 } from "./data/chains-4.mjs";
import { chains5 } from "./data/chains-5.mjs";

const independents = [...independents1, ...independents2, ...independents3, ...independents4];
const chains = [...chains1, ...chains2, ...chains3, ...chains4, ...chains5];

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const supabase = createScraperClient(env);

function cleanItems(items) {
  return items.map((item) => ({
    name: item.name,
    price: item.price,
    category: item.category ?? null,
  }));
}

async function ingestOne(name, address, type, brandName, items) {
  const coords = await geocode(address);
  if (!coords) console.log(`  (geocoding failed for "${address}" - ingesting without lat/lng)`);

  const result = await ingestRestaurant(
    supabase,
    { name, address, type, brandName, items: cleanItems(items) },
    coords,
  );
  console.log(
    `${name.padEnd(45)} ${result.wasNew ? "created" : "matched existing"} - ` +
      `${result.itemsCreated} item(s) created, ${result.itemsUpdated} price-updated`,
  );
  return { name, address, ...result };
}

async function main() {
  const results = [];

  console.log(`\n--- Independents (${independents.length}) ---`);
  for (const r of independents) {
    try {
      results.push(await ingestOne(r.name, r.address, "independent", undefined, r.items));
    } catch (err) {
      console.error(`ERROR ingesting ${r.name}:`, err.message);
      results.push({ name: r.name, error: err.message });
    }
  }

  console.log(`\n--- Chains (${chains.length} brands) ---`);
  for (const c of chains) {
    console.log(`\n${c.brandName} (${c.locations.length} location(s)):`);
    for (const loc of c.locations) {
      const streetLabel = loc.address.split(",")[0];
      const name = `${c.brandName} - ${streetLabel}`;
      try {
        results.push(await ingestOne(name, loc.address, "chain", c.brandName, c.items));
      } catch (err) {
        console.error(`ERROR ingesting ${name}:`, err.message);
        results.push({ name, error: err.message });
      }
    }
  }

  const succeeded = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);
  const totalItemsCreated = succeeded.reduce((sum, r) => sum + (r.itemsCreated ?? 0), 0);

  console.log(`\n--- Summary ---`);
  console.log(`${succeeded.length} restaurant(s) ingested successfully, ${failed.length} failed.`);
  console.log(`${totalItemsCreated} total menu item(s) created.`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.error}`);
  }
}

main();
