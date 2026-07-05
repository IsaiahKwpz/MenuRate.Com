"use client";

import { useActionState } from "react";
import { dismissReport, removeReport, type AdminActionState } from "@/lib/admin/actions";
import type { ReportWithPreview } from "@/lib/admin/queries";

const initialState: AdminActionState = {};

export function ReportRow({ report }: { report: ReportWithPreview }) {
  const [dismissState, dismissAction, dismissPending] = useActionState(dismissReport, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeReport, initialState);

  const handled = dismissState.success || removeState.success;
  const error = dismissState.error || removeState.error;

  return (
    <li className="rounded border p-4">
      <p className="font-medium">{report.preview}</p>
      {report.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
        <img src={report.photoUrl} alt="" className="mt-2 h-32 w-32 rounded object-cover" />
      )}
      <p className="text-sm text-gray-500">
        Reason: {report.reason} · Reported by {report.reporterName ?? "system (automated)"} ·{" "}
        {report.createdAtLabel}
      </p>
      {handled ? (
        <p className="mt-2 text-sm text-green-600">Handled.</p>
      ) : (
        <div className="mt-2 flex gap-3">
          <form action={dismissAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <button
              type="submit"
              disabled={dismissPending || removePending}
              className="text-sm underline disabled:opacity-50"
            >
              {dismissPending ? "Dismissing…" : "Dismiss"}
            </button>
          </form>
          <form action={removeAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <button
              type="submit"
              disabled={dismissPending || removePending}
              className="text-sm text-red-600 underline disabled:opacity-50"
            >
              {removePending ? "Removing…" : "Remove"}
            </button>
          </form>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </li>
  );
}
