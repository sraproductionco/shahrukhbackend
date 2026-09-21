import { Router } from 'express'
import { requireAuth } from '../services/auth.js'
import { createSupabaseUploadUrl } from '../services/supabaseStorage.js'
import { mediaProvider } from '../utils/mediaUrl.js'
import { createPresignedUploadUrl } from '../services/storage.js'
import { slugify } from '../utils/slugify.js'

export const uploadsRouter = Router()

/**
 * Presign upload.
 * Default: Supabase public bucket (no B2 download caps / no credit card).
 * Set MEDIA_PROVIDER=b2 to use Backblaze instead.
 */
uploadsRouter.post('/presign', requireAuth, async (req, res) => {
  try {
    const filename = String(req.body?.filename ?? '').trim()
    const contentType = String(req.body?.contentType ?? 'application/octet-stream')
    const kind = String(req.body?.kind ?? 'video') // video | thumbnail | image

    if (!filename) {
      res.status(400).json({ error: 'filename is required' })
      return
    }

    const safeName = slugify(filename.replace(/\.[^.]+$/, '')) || 'file'
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin'
    const folder = kind === 'thumbnail' || kind === 'image' ? 'thumbnails' : 'videos'
    const key = `${folder}/${Date.now()}-${safeName}.${ext}`

    if (mediaProvider() === 'b2') {
      const result = await createPresignedUploadUrl(key, contentType, 3600)
      res.json({ ...result, provider: 'b2' })
      return
    }

    const result = await createSupabaseUploadUrl(key, contentType)
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to create upload URL',
    })
  }
})
