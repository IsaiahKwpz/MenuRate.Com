"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMenuItemUpdate, type EditableField } from "@/lib/contributions/fields";

export type AdminActionState = {
  error?: string;
  success?: boolean;
};

export async function dismissReport(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const reportId = formData.get("reportId") as string;

  const admin = createAdminClient();
  const { error } = await admin.from("reports").update({ status: "dismissed" }).eq("id", reportId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function removeReport(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const reportId = formData.get("reportId") as string;

  const admin = createAdminClient();
  const { data: report, error: reportError } = await admin
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();
  if (reportError || !report) return { error: "Report not found." };

  // "Remove" reuses each entity's existing hide/close state rather than a
  // new moderation-specific flag - is_active already means "no longer
  // shown as current" for menu items, and status='closed' already means
  // "not an active listing" for restaurants. Ratings have no such state,
  // so removal deletes the row outright - RLS never gave regular users a
  // DELETE policy on ratings specifically so this stays admin-only.
  if (report.target_type === "menu_item") {
    await admin.from("menu_items").update({ is_active: false }).eq("id", report.target_id);
  } else if (report.target_type === "restaurant") {
    await admin.from("restaurants").update({ status: "closed" }).eq("id", report.target_id);
  } else if (report.target_type === "rating") {
    const { data: rating } = await admin
      .from("ratings")
      .select("user_id")
      .eq("id", report.target_id)
      .single();
    await admin.from("ratings").delete().eq("id", report.target_id);
    if (rating) {
      await admin.rpc("decrement_trust_score", { target_user_id: rating.user_id });
    }
  } else if (report.target_type === "photo") {
    const { data: photo } = await admin
      .from("photos")
      .select("storage_path, uploaded_by")
      .eq("id", report.target_id)
      .single();
    await admin.from("photos").update({ status: "rejected" }).eq("id", report.target_id);
    if (photo) {
      await admin.storage.from("photos").remove([photo.storage_path]);
      await admin.rpc("decrement_trust_score", { target_user_id: photo.uploaded_by });
    }
  }

  const { error } = await admin.from("reports").update({ status: "removed" }).eq("id", reportId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function mergeRestaurants(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const primaryId = formData.get("primaryId") as string;
  const duplicateId = formData.get("duplicateId") as string;

  if (!primaryId || !duplicateId) {
    return { error: "Pick both restaurants." };
  }
  if (primaryId === duplicateId) {
    return { error: "Pick two different restaurants." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("merge_restaurants", {
    primary_id: primaryId,
    duplicate_id: duplicateId,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function approvePendingEdit(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const editId = formData.get("editId") as string;

  const admin = createAdminClient();
  const { data: pending, error: fetchError } = await admin
    .from("pending_edits")
    .select("*")
    .eq("id", editId)
    .single();
  if (fetchError || !pending) return { error: "Pending edit not found." };

  const { error: updateError } = await admin
    .from("menu_items")
    .update(buildMenuItemUpdate(pending.field as EditableField, pending.new_value))
    .eq("id", pending.menu_item_id);
  if (updateError) return { error: updateError.message };

  // Attributed to the original submitter, not the approving admin - the
  // edit log tracks who made the change, matching the spec's "old value,
  // new value, who, when" framing.
  await admin.from("edit_logs").insert({
    menu_item_id: pending.menu_item_id,
    user_id: pending.user_id,
    field: pending.field,
    old_value: pending.old_value,
    new_value: pending.new_value,
  });

  const { error } = await admin
    .from("pending_edits")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", editId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  revalidatePath(`/menu-items/${pending.menu_item_id}`);
  return { success: true };
}

export async function rejectPendingEdit(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const editId = formData.get("editId") as string;

  const admin = createAdminClient();
  const { error } = await admin
    .from("pending_edits")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", editId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function approvePendingTag(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const tagId = formData.get("tagId") as string;

  const admin = createAdminClient();
  const { data: pending, error: fetchError } = await admin
    .from("pending_tags")
    .select("*")
    .eq("id", tagId)
    .single();
  if (fetchError || !pending) return { error: "Pending tag not found." };

  const { error: insertError } = await admin
    .from("tags")
    .insert({ name: pending.name, type: pending.type });
  if (insertError) return { error: insertError.message };

  const { error } = await admin
    .from("pending_tags")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", tagId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function rejectPendingTag(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const tagId = formData.get("tagId") as string;

  const admin = createAdminClient();
  const { error } = await admin
    .from("pending_tags")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", tagId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function approveRestaurantClaim(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const claimId = formData.get("claimId") as string;

  const admin = createAdminClient();
  const { data: claim, error: fetchError } = await admin
    .from("restaurant_claims")
    .select("*")
    .eq("id", claimId)
    .single();
  if (fetchError || !claim) return { error: "Claim not found." };

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("owner_user_id")
    .eq("id", claim.restaurant_id)
    .single();
  if (restaurant?.owner_user_id) return { error: "This restaurant already has an owner." };

  const { error: updateError } = await admin
    .from("restaurants")
    .update({ owner_user_id: claim.user_id, source: "claimed" })
    .eq("id", claim.restaurant_id);
  if (updateError) return { error: updateError.message };

  const { error } = await admin
    .from("restaurant_claims")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", claimId);
  if (error) return { error: error.message };

  // Any other still-pending claims on the same restaurant are moot now that
  // it has an owner - close them out rather than leaving them stuck in the queue.
  await admin
    .from("restaurant_claims")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("restaurant_id", claim.restaurant_id)
    .eq("status", "pending");

  revalidatePath("/admin/reports");
  revalidatePath(`/restaurants/${claim.restaurant_id}`);
  return { success: true };
}

export async function rejectRestaurantClaim(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const claimId = formData.get("claimId") as string;

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurant_claims")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", claimId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function approvePendingPhoto(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const photoId = formData.get("photoId") as string;

  const admin = createAdminClient();
  const { data: photo, error: fetchError } = await admin
    .from("photos")
    .select("target_type, target_id")
    .eq("id", photoId)
    .single();
  if (fetchError || !photo) return { error: "Photo not found." };

  const { error } = await admin
    .from("photos")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", photoId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  revalidatePath(photo.target_type === "menu_item" ? `/menu-items/${photo.target_id}` : `/restaurants/${photo.target_id}`);
  return { success: true };
}

export async function rejectPendingPhoto(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminUser = await requireAdmin();
  const photoId = formData.get("photoId") as string;

  const admin = createAdminClient();
  const { data: photo, error: fetchError } = await admin
    .from("photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();
  if (fetchError || !photo) return { error: "Photo not found." };

  const { error } = await admin
    .from("photos")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: adminUser.id })
    .eq("id", photoId);
  if (error) return { error: error.message };

  // Reclaim storage and avoid keeping rejected (potentially disallowed)
  // content around any longer than necessary.
  await admin.storage.from("photos").remove([photo.storage_path]);

  revalidatePath("/admin/reports");
  return { success: true };
}
