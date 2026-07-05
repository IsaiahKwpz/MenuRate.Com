import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type TypedClient = SupabaseClient<Database>;
type EditStatus = Database["public"]["Enums"]["edit_status"];

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export type PhotoWithUrl = {
  id: string;
  url: string;
  status: EditStatus;
};

// Signed URLs are always minted with the service-role client, but only for
// rows the caller already reached through an RLS-protected query below -
// the security boundary is the `photos` table's own RLS, not this helper.
async function withSignedUrls(
  photos: { id: string; storage_path: string; status: EditStatus }[],
): Promise<PhotoWithUrl[]> {
  if (photos.length === 0) return [];
  const admin = createAdminClient();
  const results = await Promise.all(
    photos.map(async (photo) => {
      const { data } = await admin.storage
        .from("photos")
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SECONDS);
      return { id: photo.id, url: data?.signedUrl ?? "", status: photo.status };
    }),
  );
  return results.filter((p) => p.url !== "");
}

export async function getApprovedPhotosForTarget(
  supabase: TypedClient,
  targetType: "menu_item" | "restaurant",
  targetId: string,
): Promise<PhotoWithUrl[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path, status")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return withSignedUrls(data);
}

export async function getOwnPendingPhotosForTarget(
  supabase: TypedClient,
  targetType: "menu_item" | "restaurant",
  targetId: string,
  userId: string,
): Promise<PhotoWithUrl[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path, status")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("uploaded_by", userId)
    .neq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return withSignedUrls(data);
}
