/**
 * Smart lock access through Seam (August, Yale, Schlage, Kwikset, and more). [CONFIRM partners]
 * Rules the app already follows, and the backend must enforce:
 *  1. The member approves access for one job and one time window.
 *  2. The unlock only works inside that window, then relocks on its own.
 *  3. Every unlock and lock is written to door_events and shown to the member.
 */
export async function unlockForJob(_deviceId: string, jobId: string, actor: string) {
  if (!process.env.SEAM_API_KEY) return { ok: true, demo: true, jobId, actor };
  // TODO(IT): call Seam locks.unlock_door after checking approval + time window server side.
  return { ok: true, jobId, actor };
}
export async function lockForJob(_deviceId: string, jobId: string, actor: string) {
  if (!process.env.SEAM_API_KEY) return { ok: true, demo: true, jobId, actor };
  // TODO(IT): call Seam locks.lock_door and write a door_events row.
  return { ok: true, jobId, actor };
}
