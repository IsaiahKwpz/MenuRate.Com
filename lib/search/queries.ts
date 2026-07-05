import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type TypedClient = SupabaseClient<Database>;

// Fuzzy via word_similarity (see migration 20260715000000) so a typo or a
// missing apostrophe ("moxies" for "Moxie's") still finds a match instead
// of requiring an exact substring.
export async function searchRestaurants(supabase: TypedClient, query: string) {
  const { data, error } = await supabase.rpc("search_restaurants", { search_query: query });
  if (error) throw error;
  return data;
}

export async function searchMenuItems(supabase: TypedClient, query: string) {
  const { data, error } = await supabase.rpc("search_menu_items", { search_query: query });

  if (error) throw error;
  return data;
}

// Teaser lists for the search page's empty state (no query, no category
// picked yet) - previously just a blank instruction line.
export async function getTopRatedDishes(supabase: TypedClient, limit = 6) {
  const { data, error } = await supabase.rpc("top_rated_dishes", { result_limit: limit });
  if (error) throw error;
  return data;
}

export async function getTopRatedRestaurants(supabase: TypedClient, limit = 5) {
  const { data, error } = await supabase.rpc("top_rated_restaurants", { result_limit: limit });
  if (error) throw error;
  return data;
}

export type MenuItemSearchResult = {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  category: string | null;
  restaurant_id: string;
  restaurant_name: string;
  brand_id: string | null;
  brand_name: string | null;
  avg_score: number | null;
  rating_count: number | null;
};

// Dish-type tags only (not cuisine/attribute) - those are what "browse by
// category" means here. Counted client-side rather than via an embedded
// PostgREST count, since menu_item_tags has no restaurant-scoping to filter
// on and a plain fetch-then-count is simpler to get right.
export async function getBrowseCategories(supabase: TypedClient) {
  const [{ data: tags, error: tagsError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from("tags").select("id, name").eq("type", "dish_type"),
    supabase.from("menu_item_tags").select("tag_id"),
  ]);
  if (tagsError) throw tagsError;
  if (linksError) throw linksError;

  const countByTag = new Map<string, number>();
  for (const link of links) {
    countByTag.set(link.tag_id, (countByTag.get(link.tag_id) ?? 0) + 1);
  }

  return tags
    .map((t) => ({ id: t.id, name: t.name, count: countByTag.get(t.id) ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

// Mirrors search_menu_items' RPC shape so the search page can render both
// paths (free-text vs. category) with the same code. Originally two app-side
// queries (fetch matching item IDs, then fetch ratings via .in(ids)), but
// that broke for any popular tag - "Pizza" alone matches 115+ items, and
// that many UUIDs in a PostgREST .in() filter produces a request URL that
// exceeds the HTTP header size limit. Doing the join in the database (see
// migration 20260713000000/20260714000000) avoids ever shipping a large ID
// list at all. Takes an array so the sidebar can select multiple categories
// at once (OR match, deduped in the RPC).
export async function searchMenuItemsByTags(
  supabase: TypedClient,
  tagIds: string[],
): Promise<MenuItemSearchResult[]> {
  const { data, error } = await supabase.rpc("search_menu_items_by_tags", { target_tag_ids: tagIds });
  if (error) throw error;
  return data;
}

// Backs price/rating-only filtering (no query, no category picked) - the
// filter sidebar used to only appear once a query or tag was chosen, so
// there was nothing to filter on its own.
export async function browseMenuItems(supabase: TypedClient, limit = 300): Promise<MenuItemSearchResult[]> {
  const { data, error } = await supabase.rpc("browse_menu_items", { result_limit: limit });
  if (error) throw error;
  return data;
}

export function filterMenuItems(
  items: MenuItemSearchResult[],
  filters: { minPrice?: number; maxPrice?: number; minRating?: number },
): MenuItemSearchResult[] {
  return items.filter((item) => {
    if (filters.minPrice != null && (item.price == null || item.price < filters.minPrice)) return false;
    if (filters.maxPrice != null && (item.price == null || item.price > filters.maxPrice)) return false;
    if (filters.minRating != null && (item.avg_score == null || item.avg_score < filters.minRating)) return false;
    return true;
  });
}

export type SearchResultDish = {
  name: string;
  items: MenuItemSearchResult[];
};

export type SearchResultGroup = {
  key: string;
  label: string;
  isBrand: boolean;
  brandId: string | null;
  locationCount: number;
  dishes: SearchResultDish[];
};

// Chains group by brand instead of by individual location (a chain search
// used to show one near-identical card per location, e.g. eight "Lone Star
// Texas Grill" cards for one Ottawa-wide search). Dishes within a brand are
// deduped by exact name - the same convention the spec already uses for
// brand-wide rating rollups (see brand_item_ratings) - keeping every
// matching location's own item under that dish so the UI can list "which
// locations have it." Independent restaurants (no brand_id) are unaffected:
// one group per restaurant, one item per dish, exactly as before.
export function groupSearchResults(items: MenuItemSearchResult[]): SearchResultGroup[] {
  const groups = new Map<string, SearchResultGroup>();

  for (const item of items) {
    const isBrand = Boolean(item.brand_id);
    const key = isBrand ? `brand:${item.brand_id}` : `restaurant:${item.restaurant_id}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: isBrand ? (item.brand_name ?? item.restaurant_name) : item.restaurant_name,
        isBrand,
        brandId: item.brand_id,
        locationCount: 0,
        dishes: [],
      });
    }

    const group = groups.get(key)!;
    let dish = group.dishes.find((d) => d.name === item.name);
    if (!dish) {
      dish = { name: item.name, items: [] };
      group.dishes.push(dish);
    }
    dish.items.push(item);
  }

  for (const group of groups.values()) {
    group.locationCount = new Set(group.dishes.flatMap((d) => d.items.map((i) => i.restaurant_id))).size;
    group.dishes.sort((a, b) => a.name.localeCompare(b.name));
  }

  return Array.from(groups.values()).sort((a, b) => {
    const totalA = a.dishes.reduce((sum, d) => sum + d.items.length, 0);
    const totalB = b.dishes.reduce((sum, d) => sum + d.items.length, 0);
    return totalB - totalA;
  });
}

export type RatingAggregate = { avg_score: number | null; rating_count: number | null };

// Batched lookup for the brand-wide rating of every (brand, dish name) pair
// visible on the page - avoids one round trip per dish.
export async function getBrandItemRatings(
  supabase: TypedClient,
  brandIds: string[],
): Promise<Map<string, RatingAggregate>> {
  const map = new Map<string, RatingAggregate>();
  if (brandIds.length === 0) return map;

  const { data, error } = await supabase
    .from("brand_item_ratings")
    .select("*")
    .in("brand_id", brandIds);
  if (error) throw error;

  for (const row of data) {
    if (row.brand_id && row.item_name) {
      map.set(`${row.brand_id}:${row.item_name}`, { avg_score: row.avg_score, rating_count: row.rating_count });
    }
  }
  return map;
}
