// Parses schema.org Restaurant/Menu/MenuItem JSON-LD - a real, if not
// universal, standard some restaurant sites embed for SEO. Sites without
// structured data return null here and get skipped rather than guessed at
// with fragile HTML heuristics (spec Section 5 scope is name/price/
// category only - no descriptions/photos, so there's little upside to a
// riskier generic scraper for the fields actually wanted).

function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // Malformed JSON-LD on the page - skip that block, not the whole page.
    }
  }
  return blocks;
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function hasType(node, typeName) {
  return asArray(node?.["@type"]).some((t) => String(t).toLowerCase() === typeName.toLowerCase());
}

function flattenGraph(blocks) {
  const nodes = [];
  for (const block of blocks) {
    if (Array.isArray(block)) nodes.push(...block);
    else if (block?.["@graph"]) nodes.push(...asArray(block["@graph"]));
    else if (block) nodes.push(block);
  }
  return nodes;
}

function extractAddress(addr) {
  if (!addr) return null;
  if (typeof addr === "string") return addr;
  const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : null;
}

function extractPrice(offers) {
  if (!offers) return null;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  const raw = offer?.price ?? offer?.priceSpecification?.price;
  if (raw == null) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function extractItemsFromMenu(menuNode) {
  const items = [];

  for (const section of asArray(menuNode.hasMenuSection)) {
    const category = section.name ?? null;
    for (const menuItem of asArray(section.hasMenuItem)) {
      if (menuItem.name) {
        items.push({ name: menuItem.name, price: extractPrice(menuItem.offers), category });
      }
    }
  }

  // Some sites list items directly on the menu with no sections.
  for (const menuItem of asArray(menuNode.hasMenuItem)) {
    if (menuItem.name) {
      items.push({ name: menuItem.name, price: extractPrice(menuItem.offers), category: null });
    }
  }

  return items;
}

export function extractRestaurantData(html) {
  const nodes = flattenGraph(extractJsonLdBlocks(html));

  const restaurantNode = nodes.find((n) => hasType(n, "Restaurant") || hasType(n, "FoodEstablishment"));
  if (!restaurantNode) return null;

  const name = restaurantNode.name;
  const address = extractAddress(restaurantNode.address);
  if (!name || !address) return null;

  let menuNode = restaurantNode.hasMenu;
  if (menuNode && typeof menuNode === "string") {
    menuNode = nodes.find((n) => n["@id"] === menuNode) ?? null;
  }
  if (!menuNode || typeof menuNode !== "object") {
    menuNode = nodes.find((n) => hasType(n, "Menu")) ?? null;
  }

  const items = menuNode ? extractItemsFromMenu(menuNode) : [];

  return { name, address, items };
}
