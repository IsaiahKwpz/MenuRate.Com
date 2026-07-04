// Manually curated restaurant sources - the spec's suggested discovery
// mechanism (Google Places API, to *locate* a restaurant's own website)
// was deliberately skipped for now to avoid a Google Cloud billing setup
// detour; add real restaurant-owned URLs here as you find them.
//
// NEVER add an aggregator URL (Yelp/Uber Eats/DoorDash/Skip the Dishes/
// Grubhub) - scraper/index.mjs refuses those outright, but don't rely on
// that check; the rule is "restaurant-owned domains only" (spec Section 5).
//
// type/brandName are set explicitly here, never inferred from page
// content (spec Section 7: "Every Restaurant is explicitly marked type
// ... not inferred"). brandName is required when type is "chain" - all
// locations sharing a brandName get grouped under the same Brand row.

export const sources = [
  // {
  //   url: "https://example-independent-restaurant.ca/menu",
  //   type: "independent",
  // },
  // {
  //   url: "https://example-chain-location.ca/menu",
  //   type: "chain",
  //   brandName: "Example Chain Co.",
  // },
];
