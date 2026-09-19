import { Readable } from 'node:stream'
import { Router } from 'express'
import { createPresignedDownloadUrl, getObjectStream } from '../services/storage.js'

export const mediaRouter = Router()

function sanitizeKey(raw: unknown): string | null {
  const key = String(raw ?? '')
    .trim()
    .replace(/^\/+/, '')
  if (!key || key.includes('..') || key.length > 512) return null
  return key
}

/**
 * Private-bucket media access.
 * Default: 302 redirect to a short-lived signed B2 URL (best for Vercel + video seeking).
 * ?stream=1: pipe bytes through the API (true proxy).
 */
mediaRouter.get('/', async (req, res) => {
  try {
    const key = sanitizeKey(req.query.key)
    if (!key) {
      res.status(400).json({ error: 'Missing or invalid key' })
      return
    }

    const useStream = req.query.stream === '1'

    if (!useStream) {
      const url = await createPresignedDownloadUrl(key, 60 * 60)
      res.setHeader('Cache-Control', 'private, max-age=300')
      res.redirect(302, url)
      return
    }

    const range = typeof req.headers.range === 'string' ? req.headers.range : undefined
    const object = await getObjectStream(key, range)

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Content-Type', object.ContentType || 'application/octet-stream')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')

    if (object.ContentLength !== undefined) {
      res.setHeader('Content-Length', String(object.ContentLength))
    }
    if (object.ContentRange) {
      res.status(206)
      res.setHeader('Content-Range', object.ContentRange)
    }

    const body = object.Body
    if (!body) {
      res.status(404).json({ error: 'Media not found' })
      return
    }

    if (body instanceof Readable) {
      body.pipe(res)
      return
    }

    const bytes = await body.transformToByteArray()
    res.end(Buffer.from(bytes))
  } catch (err) {
    console.error('Media proxy error:', err)
    const message = err instanceof Error ? err.message : ''
    if (!res.headersSent) {
      if (/cap exceeded|AccessDenied/i.test(message)) {
        res.status(503).json({
          error:
            'Media storage download cap exceeded. Raise Backblaze Class B caps, or re-upload files (new uploads use Supabase Storage).',
        })
        return
      }
      res.status(404).json({ error: 'Media not found' })
    }
  }
})
