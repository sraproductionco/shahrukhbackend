import { Router } from 'express'
import { requireAuth } from '../services/auth.js'
import { createSupabaseUploadUrl, ensureMediaBucket } from '../services/supabaseStorage.js'
import { slugify } from '../utils/slugify.js'

export const uploadsRouter = Router()

uploadsRouter.post('/presign', requireAuth, async (req, res) => {
  try {
    const filename = String(req.body?.filename ?? '').trim()
    const contentType = String(req.body?.contentType ?? 'application/octet-stream')
    const kind = String(req.body?.kind ?? 'video') // video | thumbnail | image

    if (!filename) {
      res.status(400).json({ error: 'filename is required' })
      return
    }

    await ensureMediaBucket()

    const safeName = slugify(filename.replace(/\.[^.]+$/, '')) || 'file'
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin'
    const folder = kind === 'thumbnail' || kind === 'image' ? 'thumbnails' : 'videos'
    const key = `${folder}/${Date.now()}-${safeName}.${ext}`

    // Prefer Supabase Storage — Backblaze free tier Class B caps block downloads.
    const result = await createSupabaseUploadUrl(key, contentType)
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to create upload URL',
    })
  }
})
