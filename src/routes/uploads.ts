import { Router } from 'express'
import { requireAuth } from '../services/auth.js'
import { createPresignedUploadUrl } from '../services/storage.js'
import { createSupabaseUploadUrl, ensureMediaBucket } from '../services/supabaseStorage.js'
import { slugify } from '../utils/slugify.js'

export const uploadsRouter = Router()

/** Supabase free-plan global file limit is 50MB. Keep headroom. */
const SUPABASE_MAX_BYTES = 45 * 1024 * 1024

uploadsRouter.post('/presign', requireAuth, async (req, res) => {
  try {
    const filename = String(req.body?.filename ?? '').trim()
    const contentType = String(req.body?.contentType ?? 'application/octet-stream')
    const kind = String(req.body?.kind ?? 'video') // video | thumbnail | image
    const size = Number(req.body?.size ?? 0)

    if (!filename) {
      res.status(400).json({ error: 'filename is required' })
      return
    }

    const safeName = slugify(filename.replace(/\.[^.]+$/, '')) || 'file'
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin'
    const folder = kind === 'thumbnail' || kind === 'image' ? 'thumbnails' : 'videos'
    const key = `${folder}/${Date.now()}-${safeName}.${ext}`

    // Videos (and any large file) → Backblaze B2.
    // Images under ~45MB → Supabase public storage.
    const useB2 = kind === 'video' || size > SUPABASE_MAX_BYTES

    if (useB2) {
      const result = await createPresignedUploadUrl(key, contentType, 3600)
      res.json({ ...result, provider: 'b2', maxBytes: null })
      return
    }

    await ensureMediaBucket()
    const result = await createSupabaseUploadUrl(key, contentType)
    res.json({ ...result, maxBytes: SUPABASE_MAX_BYTES })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to create upload URL',
    })
  }
})
