"use client";

import { useSyncExternalStore } from "react";
import { LocationSnapshot } from "@/components/location-snapshot";

const QUERY = "(min-width: 1024px)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

// The sidebar copy of the map - desktop only. Uses useSyncExternalStore
// (React's recommended pattern for syncing with a browser API like
// matchMedia) rather than a CSS `hidden` class, because LocationSnapshot's
// Leaflet map measures its container at mount time; a container merely
// hidden via CSS still reports zero size and breaks the initial view. On
// mobile this renders nothing at all - LocationPopoutButton (near the top
// of the page) is the mobile equivalent instead.
export function LocationSnapshotDesktop({
  lat,
  lng,
  address,
}: {
  lat: number | null;
  lng: number | null;
  address: string;
}) {
  const isDesktop = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isDesktop) return null;
  return <LocationSnapshot lat={lat} lng={lng} address={address} />;
}
