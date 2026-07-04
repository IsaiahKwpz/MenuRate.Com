// "Rule: scrape restaurant-owned sites only, never aggregators" (spec
// Section 5) - sources.mjs is manually curated so this shouldn't ever
// trigger, but it's cheap insurance against accidentally adding one.

const AGGREGATOR_DOMAINS = [
  "yelp.com",
  "ubereats.com",
  "doordash.com",
  "skipthedishes.com",
  "grubhub.com",
];

export function isAggregatorDomain(url) {
  const host = new URL(url).hostname.toLowerCase();
  return AGGREGATOR_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}
