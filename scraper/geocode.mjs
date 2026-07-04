// OpenStreetMap Nominatim - free, no API key, chosen for the same reason
// as Leaflet+OSM for map tiles (spec Section 6): zero recurring cost
// pre-revenue. Usage policy requires max 1 request/second and a
// descriptive User-Agent identifying the application.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "MenuRateScraper/0.1 (+https://github.com/IsaiahKwpz/MenuRate.Com)";
const MIN_DELAY_MS = 1100;

let lastRequestAt = 0;
async function throttleNominatim() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

export async function geocode(address) {
  await throttleNominatim();

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return null;

  const results = await res.json();
  if (!results.length) return null;

  return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
}
