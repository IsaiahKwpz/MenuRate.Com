import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type TypedClient = SupabaseClient<Database>;

export type ReportWithPreview = Database["public"]["Tables"]["reports"]["Row"] & {
  reporterName: string | null;
  preview: string;
  // Only set for target_type "photo" - lets ReportRow show the actual image
  // instead of a text-only preview, since judging a reported photo requires
  // seeing it.
  photoUrl: string | null;
  // Formatted server-side, once, and passed down as a plain string - doing
  // `new Date(...).toLocaleString()` inside the Client Component ReportRow
  // caused a hydration mismatch (Node's default locale on the server
  // formats differently than the browser's locale on the client).
  createdAtLabel: string;
};

// Uses the service-role client - RLS on `reports` only lets a regular user
// see their own reports, but the moderation queue needs to see all of them,
// including the reporter_id IS NULL rows step 6's anomaly detection writes.
export async function getOpenReports(admin: TypedClient): Promise<ReportWithPreview[]> {
  const { data: reports, error } = await admin
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const reporterIds = [
    ...new Set(reports.map((r) => r.reporter_id).filter((id): id is string => !!id)),
  ];
  const { data: reporters } = reporterIds.length
    ? await admin.from("profiles").select("id, display_name").in("id", reporterIds)
    : { data: [] };
  const reporterNameById = new Map((reporters ?? []).map((p) => [p.id, p.display_name]));

  const menuItemIds = reports.filter((r) => r.target_type === "menu_item").map((r) => r.target_id);
  const restaurantIds = reports
    .filter((r) => r.target_type === "restaurant")
    .map((r) => r.target_id);
  const ratingIds = reports.filter((r) => r.target_type === "rating").map((r) => r.target_id);
  const photoIds = reports.filter((r) => r.target_type === "photo").map((r) => r.target_id);

  const [menuItemsRes, restaurantsRes, ratingsRes, photosRes] = await Promise.all([
    menuItemIds.length
      ? admin.from("menu_items").select("id, name, restaurant:restaurants(name)").in("id", menuItemIds)
      : Promise.resolve({ data: [] as { id: string; name: string; restaurant: { name: string } | null }[] }),
    restaurantIds.length
      ? admin.from("restaurants").select("id, name").in("id", restaurantIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ratingIds.length
      ? admin
          .from("ratings")
          .select("id, score, comment, user:profiles(display_name), menu_item:menu_items(name)")
          .in("id", ratingIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            score: number;
            comment: string | null;
            user: { display_name: string | null } | null;
            menu_item: { name: string } | null;
          }[],
        }),
    photoIds.length
      ? admin.from("photos").select("id, target_type, target_id, storage_path").in("id", photoIds)
      : Promise.resolve({
          data: [] as { id: string; target_type: string; target_id: string; storage_path: string }[],
        }),
  ]);

  const menuItemById = new Map((menuItemsRes.data ?? []).map((m) => [m.id, m]));
  const restaurantById = new Map((restaurantsRes.data ?? []).map((r) => [r.id, r]));
  const ratingById = new Map((ratingsRes.data ?? []).map((r) => [r.id, r]));
  const photoById = new Map((photosRes.data ?? []).map((p) => [p.id, p]));

  const photoUrlById = new Map(
    await Promise.all(
      (photosRes.data ?? []).map(async (p) => {
        const { data } = await admin.storage.from("photos").createSignedUrl(p.storage_path, 600);
        return [p.id, data?.signedUrl ?? null] as const;
      }),
    ),
  );

  // Names for whatever a reported photo is attached to - a separate lookup
  // from menuItemById/restaurantById above, since a photo's own target
  // usually isn't itself among the directly-reported menu items/restaurants.
  const photoMenuItemIds = (photosRes.data ?? [])
    .filter((p) => p.target_type === "menu_item")
    .map((p) => p.target_id);
  const photoRestaurantIds = (photosRes.data ?? [])
    .filter((p) => p.target_type === "restaurant")
    .map((p) => p.target_id);
  const [photoMenuItemsRes, photoRestaurantsRes] = await Promise.all([
    photoMenuItemIds.length
      ? admin.from("menu_items").select("id, name").in("id", photoMenuItemIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    photoRestaurantIds.length
      ? admin.from("restaurants").select("id, name").in("id", photoRestaurantIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const photoMenuItemNameById = new Map((photoMenuItemsRes.data ?? []).map((m) => [m.id, m.name]));
  const photoRestaurantNameById = new Map((photoRestaurantsRes.data ?? []).map((r) => [r.id, r.name]));

  return reports.map((report) => {
    let preview = "(content no longer exists)";

    if (report.target_type === "menu_item") {
      const item = menuItemById.get(report.target_id);
      if (item) preview = `Menu item "${item.name}" at ${item.restaurant?.name ?? "unknown restaurant"}`;
    } else if (report.target_type === "restaurant") {
      const restaurant = restaurantById.get(report.target_id);
      if (restaurant) preview = `Restaurant "${restaurant.name}"`;
    } else if (report.target_type === "rating") {
      const rating = ratingById.get(report.target_id);
      if (rating) {
        const who = rating.user?.display_name ?? "unknown user";
        const on = rating.menu_item?.name ?? "unknown item";
        const comment = rating.comment ? `: "${rating.comment}"` : "";
        preview = `${rating.score}★ rating on "${on}" by ${who}${comment}`;
      }
    } else if (report.target_type === "photo") {
      const photo = photoById.get(report.target_id);
      if (photo) {
        const on =
          photo.target_type === "menu_item"
            ? (photoMenuItemNameById.get(photo.target_id) ?? "a menu item")
            : (photoRestaurantNameById.get(photo.target_id) ?? "a restaurant");
        preview = `Photo on ${on}`;
      }
    }

    return {
      ...report,
      reporterName: report.reporter_id ? (reporterNameById.get(report.reporter_id) ?? "Unknown") : null,
      preview,
      photoUrl: report.target_type === "photo" ? (photoUrlById.get(report.target_id) ?? null) : null,
      createdAtLabel: new Date(report.created_at).toLocaleString(),
    };
  });
}

export async function getAllRestaurantsForMerge(admin: TypedClient) {
  const { data, error } = await admin
    .from("restaurants")
    .select("id, name, address")
    .order("name");
  if (error) throw error;
  return data;
}

// createdAtLabel is formatted here, server-side, once - the same
// toLocaleString()-inside-a-Client-Component mistake that caused a
// hydration bug in ReportRow (see the step-7 migration comment/commit)
// applies to any admin row component that would otherwise format
// created_at itself.
export async function getPendingEdits(admin: TypedClient) {
  const { data, error } = await admin
    .from("pending_edits")
    .select("*, menu_item:menu_items(name), user:profiles!pending_edits_user_id_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((edit) => ({ ...edit, createdAtLabel: new Date(edit.created_at).toLocaleString() }));
}

export async function getPendingTags(admin: TypedClient) {
  const { data, error } = await admin
    .from("pending_tags")
    .select("*, proposer:profiles!pending_tags_proposed_by_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((tag) => ({ ...tag, createdAtLabel: new Date(tag.created_at).toLocaleString() }));
}

export async function getPendingClaims(admin: TypedClient) {
  const { data, error } = await admin
    .from("restaurant_claims")
    .select(
      "*, restaurant:restaurants(name, address), claimant:profiles!restaurant_claims_user_id_fkey(display_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((claim) => ({ ...claim, createdAtLabel: new Date(claim.created_at).toLocaleString() }));
}

// Every upload lands here today, not just ones an automated scan flagged as
// borderline - see lib/moderation/scan.ts for why (no API configured yet).
export async function getPendingPhotos(admin: TypedClient) {
  const { data, error } = await admin
    .from("photos")
    .select("*, uploader:profiles!photos_uploaded_by_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const menuItemIds = data.filter((p) => p.target_type === "menu_item").map((p) => p.target_id);
  const restaurantIds = data.filter((p) => p.target_type === "restaurant").map((p) => p.target_id);
  const [menuItemsRes, restaurantsRes] = await Promise.all([
    menuItemIds.length
      ? admin.from("menu_items").select("id, name").in("id", menuItemIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    restaurantIds.length
      ? admin.from("restaurants").select("id, name").in("id", restaurantIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const menuItemNameById = new Map((menuItemsRes.data ?? []).map((m) => [m.id, m.name]));
  const restaurantNameById = new Map((restaurantsRes.data ?? []).map((r) => [r.id, r.name]));

  return Promise.all(
    data.map(async (photo) => {
      const { data: signed } = await admin.storage.from("photos").createSignedUrl(photo.storage_path, 600);
      const targetName =
        photo.target_type === "menu_item"
          ? (menuItemNameById.get(photo.target_id) ?? "Unknown menu item")
          : (restaurantNameById.get(photo.target_id) ?? "Unknown restaurant");
      return {
        ...photo,
        url: signed?.signedUrl ?? "",
        targetName,
        createdAtLabel: new Date(photo.created_at).toLocaleString(),
      };
    }),
  );
}
