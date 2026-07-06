import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantWithMenu } from "@/lib/restaurants/queries";
import { getOwnClaimStatus } from "@/lib/claims/queries";
import { getApprovedPhotosForTarget, getOwnPendingPhotosForTarget } from "@/lib/photos/queries";
import { getAppliedTagNamesForItems } from "@/lib/contributions/queries";
import { ReportButton } from "@/components/report-button";
import { ClaimRestaurantButton } from "@/components/claim-restaurant-button";
import { OwnerApprovalToggle } from "@/components/owner-approval-toggle";
import { PhotoUploadForm } from "@/components/photo-upload-form";
import { PhotoGallery } from "@/components/photo-gallery";
import { AddDishButton } from "@/components/add-dish-button";
import { MenuCategoryFilter } from "@/components/menu-category-filter";
import { LocationSnapshotDesktop } from "@/components/location-snapshot-desktop";
import { LocationPopoutButton } from "@/components/location-popout-button";
import { RestaurantEditForm } from "@/components/restaurant-edit-form";
import { RatingBadge } from "@/components/rating-badge";
import { RestaurantRatingForm } from "@/components/restaurant-rating-form";
import {
  getRestaurantRatingAgg,
  getRestaurantReviews,
  getUserRestaurantRating,
} from "@/lib/restaurant-ratings/queries";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const result = await getRestaurantWithMenu(supabase, id).catch(() => null);
  if (!result) notFound();
  const { restaurant, items } = result;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = !!user && restaurant.owner_user_id === user.id;
  const claimStatus =
    !restaurant.owner_user_id && user
      ? await getOwnClaimStatus(supabase, restaurant.id, user.id)
      : null;

  const [approvedPhotos, ownPendingPhotos, tagNamesByItem, restaurantRating, restaurantReviews] = await Promise.all([
    getApprovedPhotosForTarget(supabase, "restaurant", restaurant.id),
    user
      ? getOwnPendingPhotosForTarget(supabase, "restaurant", restaurant.id, user.id)
      : Promise.resolve([]),
    getAppliedTagNamesForItems(
      supabase,
      items.map((item) => item.id),
    ),
    getRestaurantRatingAgg(supabase, restaurant.id),
    getRestaurantReviews(supabase, restaurant.id),
  ]);
  const photos = [...approvedPhotos, ...ownPendingPhotos];
  const userRestaurantRating = user ? await getUserRestaurantRating(supabase, restaurant.id, user.id) : null;

  const categoryOrder: string[] = [];
  for (const item of items) {
    const key = item.category ?? "Other";
    if (!categoryOrder.includes(key)) categoryOrder.push(key);
  }

  const filterableItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    currency: item.currency,
    is_active: item.is_active,
    category: item.category ?? "Other",
    tags: tagNamesByItem.get(item.id) ?? [],
    locationRating: item.locationRating,
    brandRating: item.brandRating,
  }));

  const isChain = restaurant.type === "chain" && restaurant.brand !== null;
  const currentPath = `/restaurants/${restaurant.id}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{restaurant.name}</h1>
          <p className="text-sm text-ink-soft">{restaurant.address}</p>
          <div className="mt-1 flex items-center gap-3">
            <RatingBadge rating={restaurantRating} label="Overall" />
            {restaurantReviews.length > 0 && (
              <a href="#restaurant-reviews" className="text-sm text-ink-soft underline">
                See reviews
              </a>
            )}
          </div>
          {restaurant.status !== "active" && (
            <span className="mt-2 inline-block rounded bg-rust/20 px-2 py-0.5 text-xs text-ink">
              {restaurant.status.replace("_", " ")}
            </span>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <LocationPopoutButton lat={restaurant.lat} lng={restaurant.lng} address={restaurant.address} />
            <ReportButton
              targetType="restaurant"
              targetId={restaurant.id}
              isSignedIn={!!user}
              currentPath={currentPath}
            />
            {restaurant.owner_user_id ? (
              <span className="text-xs text-ink-soft">✓ Verified owner</span>
            ) : (
              <ClaimRestaurantButton
                restaurantId={restaurant.id}
                isSignedIn={!!user}
                currentPath={currentPath}
                initialStatus={claimStatus}
              />
            )}
            <PhotoUploadForm
              targetType="restaurant"
              targetId={restaurant.id}
              isSignedIn={!!user}
              currentPath={currentPath}
            />
            <AddDishButton restaurantId={restaurant.id} isSignedIn={!!user} currentPath={currentPath} />
          </div>
          {isOwner && (
            <OwnerApprovalToggle
              restaurantId={restaurant.id}
              requireOwnerApproval={restaurant.require_owner_approval}
            />
          )}

          {items.length === 0 ? (
            <p className="mt-8 text-ink-soft">No menu items yet.</p>
          ) : (
            <MenuCategoryFilter
              items={filterableItems}
              categories={categoryOrder}
              isChain={isChain}
              brandName={restaurant.brand?.name}
            />
          )}

          <section className="mt-10">
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Rate this restaurant</h2>
            {user ? (
              <RestaurantRatingForm restaurantId={restaurant.id} existingRating={userRestaurantRating} />
            ) : (
              <p className="text-sm text-ink-soft">
                <Link href={`/login?next=${currentPath}`} className="underline">
                  Sign in
                </Link>{" "}
                or{" "}
                <Link href={`/sign-up?next=${currentPath}`} className="underline">
                  sign up
                </Link>{" "}
                to rate this restaurant overall.
              </p>
            )}
          </section>

          <section id="restaurant-reviews" className="mt-8 scroll-mt-6">
            <h2 className="mb-3 font-display text-lg font-bold text-ink">
              Restaurant reviews ({restaurantReviews.length})
            </h2>
            {restaurantReviews.length === 0 ? (
              <p className="text-sm text-ink-soft">No overall reviews yet — be the first.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {restaurantReviews.map((r) => (
                  <li key={r.id} className="rounded border border-rule bg-surface p-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-medium text-ink">{r.user?.display_name ?? "Anonymous"}</span>
                      <span className="text-sm text-ink-soft" aria-label={`${r.score} out of 5`}>
                        {"★".repeat(r.score)}
                        {"☆".repeat(5 - r.score)}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <LocationSnapshotDesktop lat={restaurant.lat} lng={restaurant.lng} address={restaurant.address} />
          <PhotoGallery photos={photos} isSignedIn={!!user} currentPath={currentPath} />

          <div>
            <h2 className="mb-3 font-display text-lg font-bold text-ink">Suggest an edit</h2>
            {user ? (
              <RestaurantEditForm restaurantId={restaurant.id} restaurant={restaurant} />
            ) : (
              <p className="text-sm text-ink-soft">
                <Link href={`/login?next=${currentPath}`} className="underline">
                  Sign in
                </Link>{" "}
                to suggest an edit.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
