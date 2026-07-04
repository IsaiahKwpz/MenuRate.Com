// "Rate-limit per domain (e.g. 1 request per few seconds)" - spec Section 5.

const MIN_DELAY_MS = 3000;
const lastRequestByDomain = new Map();

export async function throttle(targetUrl) {
  const domain = new URL(targetUrl).hostname;
  const last = lastRequestByDomain.get(domain) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestByDomain.set(domain, Date.now());
}
