import { createClient } from "@supabase/supabase-js";

export function createScraperClient(env) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findOrCreateBrand(supabase, brandName) {
  const { data: existing } = await supabase.from("brands").select("id").eq("name", brandName).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("brands")
    .insert({ name: brandName })
    .select()
    .single();
  if (error) throw error;
  return created.id;
}

// Dedup + upsert. "Every Restaurant is explicitly marked type at
// creation/scrape time (not inferred)" (spec Section 7) - type/brandName
// come from the curated source list, never guessed from page content.
export async function ingestRestaurant(supabase, restaurant, coords) {
  const { name, address, type, brandName, items } = restaurant;

  const { data: matchedId, error: matchError } = await supabase.rpc("find_matching_restaurant", {
    candidate_name: name,
    candidate_address: address,
  });
  if (matchError) throw matchError;

  let restaurantId = matchedId;
  let wasNew = false;

  if (!restaurantId) {
    const brandId = type === "chain" && brandName ? await findOrCreateBrand(supabase, brandName) : null;

    const { data: created, error: insertError } = await supabase
      .from("restaurants")
      .insert({
        name,
        address,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        type,
        brand_id: brandId,
        source: "scraped",
      })
      .select()
      .single();
    if (insertError) throw insertError;

    restaurantId = created.id;
    wasNew = true;
  }

  let itemsCreated = 0;
  let itemsUpdated = 0;

  for (const item of items) {
    const { data: existingItem } = await supabase
      .from("menu_items")
      .select("id, price")
      .eq("restaurant_id", restaurantId)
      .eq("name", item.name)
      .maybeSingle();

    if (existingItem) {
      // Re-run cadence is weekly; prices drift, names/categories rarely
      // do once matched - only price gets refreshed on a re-scrape.
      if (item.price != null && existingItem.price !== item.price) {
        await supabase.from("menu_items").update({ price: item.price }).eq("id", existingItem.id);
        itemsUpdated++;
      }
    } else {
      const { error: itemError } = await supabase.from("menu_items").insert({
        restaurant_id: restaurantId,
        name: item.name,
        price: item.price,
        category: item.category,
        status: "unverified",
      });
      if (itemError) throw itemError;
      itemsCreated++;
    }
  }

  return { restaurantId, wasNew, itemsCreated, itemsUpdated };
}
