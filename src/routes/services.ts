import { Router } from 'express'
import { getSupabase } from '../config/supabase.js'
import { requireAuth } from '../services/auth.js'
import { deleteObject } from '../services/storage.js'
import { apiBaseFromRequest, mediaProxyUrl } from '../utils/mediaUrl.js'
import { isDirectPublicMediaUrl } from '../services/supabaseStorage.js'

export const servicesRouter = Router()

type ServiceRow = {
  id: string
  title: string
  description: string | null
  media_type: 'image' | 'video'
  image_key: string | null
  image_url: string | null
  video_key: string | null
  video_url: string | null
  sort_order: number
  is_published: boolean
}

function presentService(row: ServiceRow, apiBase: string) {
  const imageUrl = isDirectPublicMediaUrl(row.image_url)
    ? row.image_url
    : mediaProxyUrl(apiBase, row.image_key) ?? row.image_url ?? null
  const videoUrl = isDirectPublicMediaUrl(row.video_url)
    ? row.video_url
    : mediaProxyUrl(apiBase, row.video_key) ?? row.video_url ?? null

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    mediaType: row.media_type,
    imageKey: row.image_key,
    imageUrl,
    videoKey: row.video_key,
    videoUrl,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
  }
}

servicesRouter.get('/', async (req, res) => {
  try {
    const all = String(req.query.all ?? '') === '1'
    const supabase = getSupabase()
    let query = supabase.from('services').select('*').order('sort_order', { ascending: true })
    if (!all) query = query.eq('is_published', true)

    const { data, error } = await query
    if (error) throw error

    const apiBase = apiBaseFromRequest(req)
    res.json({
      services: (data ?? []).map((row) => presentService(row as ServiceRow, apiBase)),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load services' })
  }
})

servicesRouter.post('/', requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim()
    if (!title) {
      res.status(400).json({ error: 'Title is required' })
      return
    }

    const media_type = req.body?.media_type === 'video' ? 'video' : 'image'
    const description = req.body?.description ? String(req.body.description).trim() : null
    const sort_order = Number(req.body?.sort_order ?? 0)
    const is_published = req.body?.is_published !== false

    const image_key = req.body?.image_key ? String(req.body.image_key) : null
    const image_url = req.body?.image_url ? String(req.body.image_url) : null
    const video_key = req.body?.video_key ? String(req.body.video_key) : null
    const video_url = req.body?.video_url ? String(req.body.video_url) : null

    if (media_type === 'video' && !video_key && !video_url) {
      res.status(400).json({ error: 'Video is required for video services' })
      return
    }
    if (media_type === 'image' && !image_key && !image_url) {
      res.status(400).json({ error: 'Image is required for image services' })
      return
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('services')
      .insert({
        title,
        description,
        media_type,
        image_key,
        image_url,
        video_key,
        video_url,
        sort_order,
        is_published,
      })
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    res.status(201).json({
      service: presentService(data as ServiceRow, apiBaseFromRequest(req)),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create service' })
  }
})

servicesRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {}
    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim()
      if (!title) {
        res.status(400).json({ error: 'Title is required' })
        return
      }
      updates.title = title
    }
    if (req.body?.description !== undefined) {
      updates.description = req.body.description ? String(req.body.description).trim() : null
    }
    if (req.body?.media_type !== undefined) {
      updates.media_type = req.body.media_type === 'video' ? 'video' : 'image'
    }
    if (req.body?.sort_order !== undefined) updates.sort_order = Number(req.body.sort_order)
    if (req.body?.is_published !== undefined) updates.is_published = Boolean(req.body.is_published)
    if (req.body?.image_key !== undefined) {
      updates.image_key = req.body.image_key ? String(req.body.image_key) : null
    }
    if (req.body?.image_url !== undefined) {
      updates.image_url = req.body.image_url ? String(req.body.image_url) : null
    }
    if (req.body?.video_key !== undefined) {
      updates.video_key = req.body.video_key ? String(req.body.video_key) : null
    }
    if (req.body?.video_url !== undefined) {
      updates.video_url = req.body.video_url ? String(req.body.video_url) : null
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    res.json({
      service: presentService(data as ServiceRow, apiBaseFromRequest(req)),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update service' })
  }
})

servicesRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data: existing, error: loadError } = await supabase
      .from('services')
      .select('image_key, video_key')
      .eq('id', req.params.id)
      .maybeSingle()

    if (loadError) throw loadError

    const { error } = await supabase.from('services').delete().eq('id', req.params.id)
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    const keys = [existing?.image_key, existing?.video_key].filter(Boolean) as string[]
    await Promise.all(
      keys.map(async (key) => {
        try {
          await deleteObject(key)
        } catch (err) {
          console.warn('Failed to delete service media', key, err)
        }
      }),
    )

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete service' })
  }
})
