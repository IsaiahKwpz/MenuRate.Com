"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitPhoto, type PhotoActionState } from "@/lib/photos/actions";

const initialState: PhotoActionState = {};

export function PhotoUploadForm({
  targetType,
  targetId,
  isSignedIn,
  currentPath,
}: {
  targetType: "menu_item" | "restaurant";
  targetId: string;
  isSignedIn: boolean;
  currentPath: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitPhoto, initialState);

  if (state.success) {
    return <p className="text-xs text-gray-500">Thanks — your photo is pending review.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-500 underline"
      >
        Add a photo
      </button>
    );
  }

  if (!isSignedIn) {
    return (
      <p className="text-xs text-gray-500">
        <Link href={`/login?next=${encodeURIComponent(currentPath)}`} className="underline">
          Sign in
        </Link>{" "}
        to add a photo.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 text-xs">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        required
        className="text-xs"
      />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="agreedToRights" required />
        I own this photo or have permission to share it.
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="underline">
          {pending ? "Uploading…" : "Upload"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-gray-400">
          Cancel
        </button>
      </div>
      {state.error && <span className="text-red-600">{state.error}</span>}
    </form>
  );
}
