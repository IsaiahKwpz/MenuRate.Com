import { ReportButton } from "@/components/report-button";
import type { PhotoWithUrl } from "@/lib/photos/queries";

export function PhotoGallery({
  photos,
  isSignedIn,
  currentPath,
}: {
  photos: PhotoWithUrl[];
  isSignedIn: boolean;
  currentPath: string;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {photos.map((photo) => (
        <div key={photo.id} className="flex flex-col items-start gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed
              Supabase Storage URLs, not a domain next/image is configured for */}
          <img
            src={photo.url}
            alt=""
            className={`h-24 w-24 rounded object-cover ${photo.status !== "approved" ? "opacity-50" : ""}`}
          />
          {photo.status === "approved" ? (
            <ReportButton
              targetType="photo"
              targetId={photo.id}
              isSignedIn={isSignedIn}
              currentPath={currentPath}
            />
          ) : (
            <span className="text-[10px] text-gray-400">Pending review</span>
          )}
        </div>
      ))}
    </div>
  );
}
