"use client";

import { useState } from "react";
import { LocationSnapshot } from "@/components/location-snapshot";

// Mobile-only: the map used to only be reachable by scrolling past the
// entire menu (it lived in the sidebar, which stacks below the menu on
// small screens). This puts a button near the top instead. The map only
// mounts once the modal is actually open - Leaflet measures its container's
// size at init time, and mounting it while still hidden would report zero
// size (same reasoning as the mapEverShown gate on the /restaurants List/Map
// toggle), but since this opens via a click there's no hidden-container
// case to guard against here.
export function LocationPopoutButton({
  lat,
  lng,
  address,
}: {
  lat: number | null;
  lng: number | null;
  address: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-rule bg-surface px-3 py-1.5 text-sm text-ink transition hover:border-olive lg:hidden"
      >
        View location
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-4 top-20 rounded border border-rule bg-ground p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Location</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-2xl leading-none text-ink-soft"
              >
                ×
              </button>
            </div>
            <LocationSnapshot lat={lat} lng={lng} address={address} />
          </div>
        </div>
      )}
    </>
  );
}
