import { supabase } from './supabase'
import { AppError } from './api'

const BUCKET = 'player-photos'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, matches the bucket policy
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** True when the file looks like an acceptable player photo. */
export function isPhotoFile(file: File): boolean {
  return ACCEPTED.includes(file.type) && file.size <= MAX_BYTES
}

function photoPath(teamId: string, ext: string): string {
  // One folder per team keeps objects from colliding across teams; the random
  // name lets a player replace their photo without clobbering anyone else's.
  return `${teamId}/${crypto.randomUUID()}.${ext}`
}

/** Public URL for an object path in the player-photos bucket. */
export function photoPublicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Extract the bucket-relative path from a public photo URL (or null). */
function pathFromUrl(url: string | null): string | null {
  if (!url) return null
  const marker = `/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length).split('?')[0]
}

/**
 * Upload a player photo to Supabase Storage and return its public URL.
 * Throws AppError with a friendly message on validation / upload failure.
 */
export async function uploadPlayerPhoto(teamId: string, file: File): Promise<string> {
  if (!teamId) throw new AppError('Team not loaded yet — try again in a moment.', 'TEAM_MISSING')
  if (!ACCEPTED.includes(file.type)) {
    throw new AppError('That file type isn’t supported — use a JPG, PNG, WebP or GIF photo.', 'PHOTO_TYPE')
  }
  if (file.size > MAX_BYTES) {
    throw new AppError('That photo is over 5 MB — pick a smaller one.', 'PHOTO_SIZE')
  }

  const path = photoPath(teamId, EXT[file.type])
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (error) {
    throw new AppError('Couldn’t upload the photo. Is the player-photos bucket set up? (Run migration 0012 in Supabase.)', error.message ?? null)
  }
  return photoPublicUrl(path)
}

/** Best-effort delete of a previously uploaded photo (ignores missing files). */
export async function deletePlayerPhoto(url: string | null): Promise<void> {
  const path = pathFromUrl(url)
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
