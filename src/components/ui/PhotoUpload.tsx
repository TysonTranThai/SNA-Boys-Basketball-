import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { uploadPlayerPhoto, deletePlayerPhoto } from '@/lib/photo'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  name: string
  /** Current photo URL (from profiles.photo_url). */
  value: string | null
  onChange: (url: string | null) => void
  /** Team id — photos are stored under a per-team folder. */
  teamId: string
  size?: 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Photo upload control: pick a file, upload it to Supabase Storage, and hand
 * the public URL back via onChange. Replaces the old paste-a-URL field.
 */
export function PhotoUpload({ name, value, onChange, teamId, size = 'lg', className }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    setError(null)
    // Show a local preview immediately; upload in the background.
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)
    try {
      const url = await uploadPlayerPhoto(teamId, file)
      // Replace the old photo once the new one is live.
      if (value) void deletePlayerPhoto(value).catch(() => {})
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t upload the photo.')
    } finally {
      URL.revokeObjectURL(objectUrl)
      setPreview(null)
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (value) void deletePlayerPhoto(value).catch(() => {})
    onChange(null)
    setError(null)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-3">
        <Avatar name={name} src={preview ?? value} size={size} />
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {uploading ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleRemove()}>
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG, WebP or GIF · up to 5 MB</p>
        </div>
      </div>
      {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
