"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanImage } from "@/lib/moderation/scan";

export type PhotoActionState = {
  error?: string;
  success?: boolean;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type PhotoTargetType = "menu_item" | "restaurant";

export async function submitPhoto(
  _prevState: PhotoActionState,
  formData: FormData,
): Promise<PhotoActionState> {
  const targetType = formData.get("targetType") as PhotoTargetType;
  const targetId = formData.get("targetId") as string;
  const file = formData.get("photo") as File | null;
  const agreedToRights = formData.get("agreedToRights") === "on";

  if (!targetType || !targetId) return { error: "Missing target." };
  if (!file || file.size === 0) return { error: "Choose a photo to upload." };
  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) return { error: "Only JPEG, PNG, or WEBP images are allowed." };
  if (file.size > MAX_BYTES) return { error: "Photo must be under 5MB." };
  if (!agreedToRights) {
    return { error: "You must confirm you own this photo or have permission to share it." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to sign in to add a photo." };

  const storagePath = `${user.id}/${randomUUID()}.${ext}`;

  // Uses the service-role client for both the upload and the row insert -
  // the `photos` bucket is private with no storage.objects policies (see
  // the step-11 migration), so writes go through here rather than a direct
  // authenticated upload.
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("photos")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  // Documented stub today (lib/moderation/scan.ts) - always defers to
  // manual admin review until a real moderation API is configured.
  await scanImage(storagePath);

  const { error: insertError } = await admin.from("photos").insert({
    target_type: targetType,
    target_id: targetId,
    storage_path: storagePath,
    uploaded_by: user.id,
  });
  if (insertError) {
    await admin.storage.from("photos").remove([storagePath]);
    return { error: insertError.message };
  }

  revalidatePath(targetType === "menu_item" ? `/menu-items/${targetId}` : `/restaurants/${targetId}`);
  return { success: true };
}
