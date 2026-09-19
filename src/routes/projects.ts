import { Router } from 'express'
import { getSupabase } from '../config/supabase.js'
import { requireAuth } from '../services/auth.js'
import { slugify } from '../utils/slugify.js'
import { deleteObject } from '../services/storage.js'
import { apiBaseFromRequest, withProxiedMedia, withProxiedMediaList } from '../utils/mediaUrl.js'

export const projectsRouter = Router()

const projectSelect = `
  id, title, slug, description, category_id, thumbnail_key, thumbnail_url,
  video_key, video_url, duration_seconds, is_featured, is_published, sort_order,
  created_at, updated_at,
  categories ( id, name, slug )
`

projectsRouter.get('/', async (req, res) => {
  try {
    const supabase = getSupabase()
    const publishedOnly = req.query.all !== '1'
    const category = req.query.category ? String(req.query.category) : null
    const featured = req.query.featured === '1'

    let query = supabase.from('projects').select(projectSelect)

    if (publishedOnly) query = query.eq('is_published', true)
    if (featured) query = query.eq('is_featured', true)

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    let projects = data ?? []
    if (category) {
      projects = projects.filter(
        (p) => (p.categories as { slug?: string } | null)?.slug === category,
      )
    }

    const apiBase = apiBaseFromRequest(req)
    res.json({ projects: withProxiedMediaList(projects, apiBase) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

projectsRouter.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('projects')
      .select(projectSelect)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    const apiBase = apiBaseFromRequest(req)
    res.json({ projects: withProxiedMediaList(data ?? [], apiBase) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

projectsRouter.get('/:slug', async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('projects')
      .select(projectSelect)
      .eq('slug', req.params.slug)
      .eq('is_published', true)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      res.status(404).json({ error: 'Project not found' })
      return
    }
    const apiBase = apiBaseFromRequest(req)
    res.json({ project: withProxiedMedia(data, apiBase) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load project' })
  }
})

projectsRouter.post('/', requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim()
    const video_key = String(req.body?.video_key ?? '').trim()
    const video_url = String(req.body?.video_url ?? '').trim()

    if (!title || !video_key || !video_url) {
      res.status(400).json({ error: 'title, video_key, and video_url are required' })
      return
    }

    const payload = {
      title,
      slug: slugify(String(req.body?.slug ?? title)),
      description: req.body?.description ? String(req.body.description).trim() : null,
      category_id: req.body?.category_id || null,
      thumbnail_key: req.body?.thumbnail_key ? String(req.body.thumbnail_key) : null,
      thumbnail_url: req.body?.thumbnail_url ? String(req.body.thumbnail_url) : null,
      video_key,
      video_url,
      duration_seconds: req.body?.duration_seconds ? Number(req.body.duration_seconds) : null,
      is_featured: Boolean(req.body?.is_featured),
      is_published: Boolean(req.body?.is_published ?? true),
      sort_order: Number(req.body?.sort_order ?? 0),
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('projects')
      .insert(payload)
      .select(projectSelect)
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(201).json({ project: withProxiedMedia(data, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

projectsRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {}
    const fields = [
      'title',
      'description',
      'category_id',
      'thumbnail_key',
      'thumbnail_url',
      'video_key',
      'video_url',
      'duration_seconds',
      'is_featured',
      'is_published',
      'sort_order',
      'slug',
    ] as const

    for (const field of fields) {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }
    if (updates.title && !updates.slug) {
      updates.slug = slugify(String(updates.title))
    }
    if (updates.slug) updates.slug = slugify(String(updates.slug))

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', req.params.id)
      .select(projectSelect)
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.json({ project: withProxiedMedia(data, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

projectsRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data: existing, error: findError } = await supabase
      .from('projects')
      .select('video_key, thumbnail_key')
      .eq('id', req.params.id)
      .maybeSingle()

    if (findError) throw findError
    if (!existing) {
      res.status(404).json({ error: 'Project not found' })
      return
    }

    const { error } = await supabase.from('projects').delete().eq('id', req.params.id)
    if (error) throw error

    try {
      if (existing.video_key) await deleteObject(String(existing.video_key))
      if (existing.thumbnail_key) await deleteObject(String(existing.thumbnail_key))
    } catch (storageErr) {
      console.warn('Storage cleanup warning:', storageErr)
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})
