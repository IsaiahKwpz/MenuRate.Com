// One-off seed script: populates realistic sample ratings so the app shows
// real numbers instead of "No ratings yet" everywhere (the ratings table
// was genuinely empty pre-launch). Creates a pool of clearly-fake demo
// reviewer accounts (".invalid" email domain - reserved by RFC 2606, never
// deliverable/real) and spreads varied, backdated ratings across a broad
// sample of menu items.
//
// created_at is backdated 2-150 days into the past for every row - well
// outside both anti-fraud triggers from 20260707000000_rating_integrity.sql
// (60-minute burst window, 24-hour per-user cap), which compare against the
// real current time at insert. Without backdating, a bulk seed of this shape
// (many accounts rating things in one run) is exactly the pattern those
// triggers exist to catch, and would self-flag every restaurant touched.
//
// Run with: node scripts/seed-ratings.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local.
// Swap or clear this data (delete profiles with a "@thelocalplate.invalid"
// email, cascades to their ratings) before real users are live.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const REVIEWER_NAMES = [
  "Alex M.", "Jordan K.", "Sam T.", "Casey L.", "Morgan P.", "Taylor R.",
  "Jamie D.", "Riley S.", "Avery N.", "Quinn B.", "Reese H.", "Drew C.",
  "Skyler F.", "Emerson G.", "Rowan V.", "Charlie W.", "Dakota J.", "Finley A.",
  "Harper E.", "Kendall O.", "Logan Y.", "Parker I.", "Sage U.", "Blake Z.",
  "Cameron Q.", "Devon X.", "Ellis Y.", "Frankie W.", "Gray V.", "Hayden U.",
  "Indigo T.", "Jules S.", "Kai R.", "Lane Q.", "Marlowe P.", "Nico O.",
  "Ocean N.", "Peyton M.", "River L.", "Shay K.",
];

const POSITIVE_COMMENTS = [
  "Really solid, would order again.",
  "One of my favourites here.",
  "Better than I expected.",
  "Great portion for the price.",
  "Consistently good every time.",
];
const NEUTRAL_COMMENTS = ["It's fine, nothing special.", "Decent but a bit pricey.", "Average, wouldn't rush back for this one."];
const NEGATIVE_COMMENTS = ["Wasn't a fan.", "Disappointing compared to other spots.", "Wouldn't order this again."];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedScore() {
  const r = Math.random();
  if (r < 0.3) return 5;
  if (r < 0.65) return 4;
  if (r < 0.85) return 3;
  if (r < 0.95) return 2;
  return 1;
}

function commentFor(score) {
  if (Math.random() > 0.2) return null;
  if (score >= 4) return pick(POSITIVE_COMMENTS);
  if (score === 3) return pick(NEUTRAL_COMMENTS);
  return pick(NEGATIVE_COMMENTS);
}

function backdatedTimestamp() {
  const daysAgo = 2 + Math.random() * 148;
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

async function ensureReviewers() {
  const profiles = [];
  for (let i = 0; i < REVIEWER_NAMES.length; i++) {
    const displayName = REVIEWER_NAMES[i];
    const email = `seed-reviewer-${i + 1}@thelocalplate.invalid`;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (!createError) {
      profiles.push(created.user.id);
      continue;
    }

    if (createError.message?.toLowerCase().includes("already been registered")) {
      const { data: existing, error: lookupError } = await supabase
        .from("profiles")
        .select("id")
        .eq("display_name", displayName)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) {
        profiles.push(existing.id);
        continue;
      }
    }

    throw createError;
  }
  return profiles;
}

async function fetchAllActiveItems() {
  const pageSize = 1000;
  let from = 0;
  const items = [];
  while (true) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id")
      .eq("is_active", true)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    items.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return items;
}

async function main() {
  console.log("Creating/reusing demo reviewer accounts...");
  const reviewerIds = await ensureReviewers();
  console.log(`${reviewerIds.length} reviewer accounts ready.`);

  console.log("Fetching active menu items...");
  const items = await fetchAllActiveItems();
  console.log(`${items.length} active menu items found.`);

  const selected = items.filter(() => Math.random() < 0.4);
  console.log(`Seeding ratings for ${selected.length} items (~40% sample)...`);

  const rows = [];
  for (const item of selected) {
    const ratingCount = 1 + Math.floor(Math.random() * 6);
    const reviewers = [...reviewerIds].sort(() => Math.random() - 0.5).slice(0, ratingCount);
    for (const userId of reviewers) {
      const score = weightedScore();
      rows.push({
        user_id: userId,
        menu_item_id: item.id,
        score,
        comment: commentFor(score),
        created_at: backdatedTimestamp(),
      });
    }
  }

  console.log(`Inserting ${rows.length} ratings...`);
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("ratings").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
    console.log(`  ${inserted}/${rows.length}`);
  }

  console.log(`Done. Seeded ${inserted} ratings across ${selected.length} items from ${reviewerIds.length} reviewers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
