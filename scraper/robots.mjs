// Minimal robots.txt parser - handles per-user-agent groups and
// longest-matching-path-wins for Allow/Disallow, which covers the common
// real-world cases. Doesn't implement wildcard/`$` path patterns from the
// (non-standardized) robots.txt extensions some crawlers support.

function parseRobots(text) {
  const groups = [];
  let current = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "disallow" || key === "allow") && current) {
      current.rules.push({ type: key, path: value });
    }
  }

  return groups;
}

function robotsAllows(text, path, userAgent) {
  const groups = parseRobots(text);
  const ua = userAgent.toLowerCase();

  let matched = groups.find((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  if (!matched) matched = groups.find((g) => g.agents.includes("*"));
  if (!matched) return true;

  let best = null;
  for (const rule of matched.rules) {
    if (rule.path === "") continue;
    if (path.startsWith(rule.path) && (!best || rule.path.length > best.path.length)) {
      best = rule;
    }
  }

  return !best || best.type === "allow";
}

export async function isAllowedByRobots(targetUrl, userAgent) {
  const { origin, pathname } = new URL(targetUrl);
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": userAgent } });
    if (!res.ok) return true; // no robots.txt -> nothing disallows us
    const text = await res.text();
    return robotsAllows(text, pathname, userAgent);
  } catch {
    return true; // can't reach robots.txt - don't let a network blip block a legitimate scrape
  }
}
