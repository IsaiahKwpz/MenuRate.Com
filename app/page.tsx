import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getHomeStats,
  getExploreLocalRestaurants,
  getRestaurantsPreview,
} from "@/lib/restaurants/queries";
import { PlateArt } from "@/components/plate-art";
import { HeroArt } from "@/components/hero-art";

export default async function Home() {
  const supabase = await createClient();
  const [stats, localRestaurants, previewRestaurants] = await Promise.all([
    getHomeStats(supabase),
    getExploreLocalRestaurants(supabase, 3),
    getRestaurantsPreview(supabase, 6),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="mb-4 text-sm font-bold tracking-wide text-olive uppercase">
            Ottawa, dish by dish
          </p>
          <h1 className="font-display text-4xl leading-tight font-bold text-balance sm:text-5xl">
            The good stuff, kept close to <span className="text-rust">home.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-ink-soft">
            Rate the dish, not just the restaurant — so the next person at the table knows exactly
            what to order.
          </p>
          <form action="/search" method="GET" className="mt-7 flex max-w-lg overflow-hidden rounded-lg border border-rule-strong bg-surface">
            <input
              type="search"
              name="q"
              placeholder="Search a dish, a cuisine, or a place"
              className="min-w-0 flex-1 bg-transparent px-5 py-3.5 text-ink placeholder:text-ink-soft focus:outline-none"
            />
            <button type="submit" className="bg-olive px-6 text-sm font-bold text-white hover:brightness-95">
              Search
            </button>
          </form>
        </div>
        <HeroArt />
      </section>

      {stats.restaurantCount > 0 && (
        <div className="mt-10 grid grid-cols-3 divide-x divide-rule border border-rule">
          <div className="min-w-0 bg-surface px-5 py-4">
            <span className="font-display block text-2xl font-extrabold text-rust">
              {stats.ratedRestaurantCount.toLocaleString()}
            </span>
            <span className="text-sm text-ink-soft">restaurants rated</span>
          </div>
          <div className="min-w-0 bg-surface px-5 py-4">
            <span className="font-display block text-2xl font-extrabold text-olive">
              {stats.dishCount.toLocaleString()}
            </span>
            <span className="text-sm text-ink-soft">dishes on the list</span>
          </div>
          <div className="min-w-0 bg-surface px-5 py-4">
            <span className="font-display block text-2xl font-extrabold" style={{ color: "#E8C87E" }}>
              {stats.independentCount.toLocaleString()}
            </span>
            <span className="text-sm text-ink-soft">independent kitchens</span>
          </div>
        </div>
      )}

      {localRestaurants.length > 0 && (
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-3 border-b-2 border-rule-strong pb-3">
            <h2 className="font-display text-xl font-bold">Explore local</h2>
            <span className="text-sm font-semibold text-ink-soft">Independent, Ottawa-owned</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">
            Pinned up for you — kitchens owned and run right here in Ottawa, not part of any chain.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {localRestaurants.map((restaurant, i) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.id}`}
                className="block rounded-sm border border-rule bg-surface p-4 shadow-sm transition hover:shadow-md"
              >
                <PlateArt variant={i} />
                <span className="mt-3 block text-xs font-bold tracking-wide text-olive uppercase">
                  Independent
                </span>
                <span className="font-display block font-bold">{restaurant.name}</span>
                <span className="block text-sm text-ink-soft">{restaurant.address}</span>
                <span className="mt-2 block text-sm font-semibold text-rust">
                  {restaurant.itemCount} {restaurant.itemCount === 1 ? "dish" : "dishes"} on the menu
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-3 border-b-2 border-rule-strong pb-3">
          <h2 className="font-display text-xl font-bold">Around the neighbourhood</h2>
          <span className="text-sm font-semibold text-ink-soft">
            {previewRestaurants.length} of {stats.restaurantCount}
          </span>
        </div>
        <ul>
          {previewRestaurants.map((restaurant) => (
            <li key={restaurant.id} className="border-b border-dashed border-rule py-4">
              <Link href={`/restaurants/${restaurant.id}`} className="font-display font-bold hover:underline">
                {restaurant.name}
              </Link>
              <span className="ml-2 text-sm text-ink-soft">{restaurant.address}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/restaurants"
          className="mt-6 inline-block rounded bg-wood px-5 py-2.5 text-white hover:brightness-110"
        >
          Browse all restaurants
        </Link>
      </section>
    </main>
  );
}
