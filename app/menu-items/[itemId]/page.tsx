import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMenuItemDetail, getRatingsForItem, getUserRating } from "@/lib/ratings/queries";
import { getAppliedTagsForItem, getAvailableTagsForItem } from "@/lib/contributions/queries";
import { getApprovedPhotosForTarget, getOwnPendingPhotosForTarget } from "@/lib/photos/queries";
import { RatingBadge } from "@/components/rating-badge";
import { RatingForm } from "@/components/rating-form";
import { ReportButton } from "@/components/report-button";
import { TagSection } from "@/components/tag-section";
import { EditItemForm } from "@/components/edit-item-form";
import { PhotoUploadForm } from "@/components/photo-upload-form";
import { PhotoGallery } from "@/components/photo-gallery";

export default async function MenuItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const supabase = await createClient();

  const detail = await getMenuItemDetail(supabase, itemId).catch(() => null);
  if (!detail) notFound();
  const { item, restaurant, locationRating, brandRating } = detail;

  const [
    {
      data: { user },
    },
    ratings,
    appliedTags,
    availableTags,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getRatingsForItem(supabase, itemId),
    getAppliedTagsForItem(supabase, itemId),
    getAvailableTagsForItem(supabase, itemId),
  ]);

  const userRating = user ? await getUserRating(supabase, itemId, user.id) : null;
  const isChain = restaurant.type === "chain" && restaurant.brand !== null;

  const [approvedPhotos, ownPendingPhotos] = await Promise.all([
    getApprovedPhotosForTarget(supabase, "menu_item", itemId),
    user ? getOwnPendingPhotosForTarget(supabase, "menu_item", itemId, user.id) : Promise.resolve([]),
  ]);
  const photos = [...approvedPhotos, ...ownPendingPhotos];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm underline">
        ← {restaurant.name}
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">{item.name}</h1>
      {!item.is_active && (
        <p className="text-xs text-gray-400">No longer on the menu</p>
      )}
      {item.description && <p className="mt-1 text-gray-600">{item.description}</p>}
      {item.price != null && (
        <p className="mt-1 text-sm text-gray-500">
          ${item.price.toFixed(2)} {item.currency}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1">
        <RatingBadge rating={locationRating} label={isChain ? "This location" : undefined} />
        {isChain && (
          <RatingBadge rating={brandRating} label={`All ${restaurant.brand!.name} locations`} />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <ReportButton
          targetType="menu_item"
          targetId={item.id}
          isSignedIn={!!user}
          currentPath={`/menu-items/${item.id}`}
        />
        <PhotoUploadForm
          targetType="menu_item"
          targetId={item.id}
          isSignedIn={!!user}
          currentPath={`/menu-items/${item.id}`}
        />
      </div>
      <PhotoGallery photos={photos} isSignedIn={!!user} currentPath={`/menu-items/${item.id}`} />

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-medium">Tags</h2>
        {user ? (
          <TagSection menuItemId={item.id} appliedTags={appliedTags} availableTags={availableTags} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {appliedTags.length === 0 ? (
              <span className="text-sm text-gray-500">No tags yet.</span>
            ) : (
              appliedTags.map((tag) => (
                <span key={tag.id} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                  {tag.name}
                </span>
              ))
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Rate this</h2>
        {user ? (
          <RatingForm
            menuItemId={item.id}
            restaurantId={restaurant.id}
            existingRating={userRating}
          />
        ) : (
          <p className="text-sm text-gray-600">
            <Link href={`/login?next=/menu-items/${item.id}`} className="underline">
              Sign in
            </Link>{" "}
            or{" "}
            <Link href={`/sign-up?next=/menu-items/${item.id}`} className="underline">
              sign up
            </Link>{" "}
            to rate this.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Ratings ({ratings.length})</h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-gray-500">No ratings yet — be the first.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ratings.map((r) => (
              <li key={r.id} className="rounded border p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{r.user?.display_name ?? "Anonymous"}</span>
                  <span className="text-sm text-gray-500" aria-label={`${r.score} out of 5`}>
                    {"★".repeat(r.score)}
                    {"☆".repeat(5 - r.score)}
                  </span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                <div className="mt-2">
                  <ReportButton
                    targetType="rating"
                    targetId={r.id}
                    isSignedIn={!!user}
                    currentPath={`/menu-items/${item.id}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Suggest an edit</h2>
        {user ? (
          <EditItemForm menuItemId={item.id} item={item} />
        ) : (
          <p className="text-sm text-gray-600">
            <Link href={`/login?next=/menu-items/${item.id}`} className="underline">
              Sign in
            </Link>{" "}
            to suggest an edit.
          </p>
        )}
      </section>
    </main>
  );
}
