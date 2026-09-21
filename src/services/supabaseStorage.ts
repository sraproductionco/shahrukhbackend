import { getSupabase } from '../config/supabase.js'

export const MEDIA_BUCKET = 'portfolio'

let bucketReady: Promise<void> | null = null

/** Ensure a public portfolio bucket exists (idempotent). */
export async function ensureMediaBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const supabase = getSupabase()
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()
      if (listError) throw listError

      const exists = (buckets ?? []).some((b) => b.name === MEDIA_BUCKET)
      if (!exists) {
        const { error } = await supabase.storage.createBucket(MEDIA_BUCKET, {
          public: true,
          fileSizeLimit: 52428800, // 50MB — Supabase free-plan max
        })
        if (error && !/already exists/i.test(error.message)) throw error
      } else {
        const { error } = await supabase.storage.updateBucket(MEDIA_BUCKET, {
          public: true,
          fileSizeLimit: 52428800,
        })
        if (error && !/not authorized|already|exceeded/i.test(error.message)) {
          console.warn('updateBucket:', error.message)
        }
      }
    })().catch((err) => {
      bucketReady = null
      throw err
    })
  }
  await bucketReady
}

export async function createSupabaseUploadUrl(path: string, contentType: string) {
  await ensureMediaBucket()
  const supabase = getSupabase()

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: true })

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create Supabase upload URL')
  }

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)

  return {
    key: path,
    uploadUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.publicUrl,
    contentType,
    provider: 'supabase' as const,
  }
}

export function supabasePublicUrl(path: string): string {
  const supabase = getSupabase()
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteSupabaseObject(path: string) {
  await ensureMediaBucket()
  const supabase = getSupabase()
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path])
  if (error) throw error
}

export function isSupabaseMediaKey(key: string | null | undefined): boolean {
  if (!key) return false
  return key.startsWith('thumbnails/') || key.startsWith('videos/') || key.startsWith('images/')
}

export function isDirectPublicMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (/supabase\.co\/storage\//i.test(url)) return true
  if (/\/api\/media/i.test(url)) return false
  if (/backblaze|b2\./i.test(url)) return false
  return /^https?:\/\//i.test(url)
}
