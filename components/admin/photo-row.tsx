"use client";

import { useActionState } from "react";
import { approvePendingPhoto, rejectPendingPhoto, type AdminActionState } from "@/lib/admin/actions";

const initialState: AdminActionState = {};

export function PhotoRow({
  photo,
}: {
  photo: {
    id: string;
    url: string;
    targetName: string;
    createdAtLabel: string;
    uploader: { display_name: string | null } | null;
  };
}) {
  const [approveState, approveAction, approvePending] = useActionState(approvePendingPhoto, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectPendingPhoto, initialState);

  const handled = approveState.success || rejectState.success;
  const error = approveState.error || rejectState.error;

  return (
    <li className="rounded border p-4">
      {photo.url && (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
        <img src={photo.url} alt="" className="h-32 w-32 rounded object-cover" />
      )}
      <p className="mt-2 font-medium">On: {photo.targetName}</p>
      <p className="text-sm text-gray-500">
        Uploaded by {photo.uploader?.display_name ?? "unknown"} · {photo.createdAtLabel}
      </p>
      {handled ? (
        <p className="mt-2 text-sm text-green-600">Handled.</p>
      ) : (
        <div className="mt-2 flex gap-3">
          <form action={approveAction}>
            <input type="hidden" name="photoId" value={photo.id} />
            <button
              type="submit"
              disabled={approvePending || rejectPending}
              className="text-sm underline disabled:opacity-50"
            >
              {approvePending ? "Approving…" : "Approve"}
            </button>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="photoId" value={photo.id} />
            <button
              type="submit"
              disabled={approvePending || rejectPending}
              className="text-sm text-red-600 underline disabled:opacity-50"
            >
              {rejectPending ? "Rejecting…" : "Reject"}
            </button>
          </form>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </li>
  );
}
