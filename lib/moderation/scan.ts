// Proactive image moderation (spec Section 6): "run uploaded photos through
// an automated image-moderation API (e.g. AWS Rekognition, Google Vision
// SafeSearch) before... they go live." No such API is configured in this
// environment - IMAGE_MODERATION_API_KEY in .env.local is an empty
// placeholder, the same situation step 9 hit with geocoding before it fell
// back to a free alternative.
//
// Every upload currently holds in 'pending' for manual admin review instead
// of an automated pass/fail - see lib/photos/actions.ts. This is a
// *stricter* proactive posture than an automated scan alone (100% human
// review before anything goes public, not a probabilistic filter), not a
// weaker one. Swap this function's body for a real Rekognition/SafeSearch
// call once IMAGE_MODERATION_API_KEY is populated - a photo that comes back
// clearly clean could then auto-approve instead of queuing.

export type ModerationResult = {
  autoApprove: boolean;
  reason: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature matches the real API call this will become
export async function scanImage(storagePath: string): Promise<ModerationResult> {
  return {
    autoApprove: false,
    reason: "No automated moderation API configured - held for manual review.",
  };
}
