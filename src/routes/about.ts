import { Router } from 'express'
import { getSupabase } from '../config/supabase.js'
import { requireAuth } from '../services/auth.js'
import { deleteObject } from '../services/storage.js'
import { apiBaseFromRequest, resolveMediaUrl } from '../utils/mediaUrl.js'

export const aboutRouter = Router()

type ProfileRow = {
  id: number
  display_name: string
  role_title: string
  years_experience: number
  projects_count: number
  headline: string
  bio: string
  bio_secondary: string | null
  location: string | null
  portrait_key: string | null
  portrait_url: string | null
}

type BrandRow = {
  id: string
  name: string
  logo_key: string | null
  logo_url: string | null
  website_url: string | null
  sort_order: number
  is_published: boolean
}

type ProcessRow = {
  id: string
  title: string
  answer: string
  image_key: string | null
  image_url: string | null
  sort_order: number
  is_published: boolean
}

const DEFAULT_PROFILE = {
  display_name: 'Shahrukh',
  role_title: 'Video Editor & Storyteller',
  years_experience: 5,
  projects_count: 48,
  headline: 'A video editor focused on feeling, timing, and clarity.',
  bio: 'I craft commercials, short films, and branded stories that land with rhythm and emotion. Every cut is intentional — pace for tension, silence for weight, and color for mood.',
  bio_secondary:
    'From rough assembly to final delivery, I collaborate closely with directors and brands to shape footage into narratives audiences remember.',
  location: 'Karachi, Pakistan',
}

async function ensureProfile(): Promise<ProfileRow> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('about_profile').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  if (data) return data as ProfileRow

  const { data: created, error: insertError } = await supabase
    .from('about_profile')
    .insert({ id: 1, ...DEFAULT_PROFILE, portrait_key: null, portrait_url: null })
    .select('*')
    .single()
  if (insertError) throw insertError
  return created as ProfileRow
}

function presentProfile(row: ProfileRow, apiBase: string) {
  return {
    displayName: row.display_name,
    roleTitle: row.role_title,
    yearsExperience: row.years_experience,
    projectsCount: row.projects_count,
    headline: row.headline,
    bio: row.bio,
    bioSecondary: row.bio_secondary,
    location: row.location,
    portraitKey: row.portrait_key,
    portraitUrl: resolveMediaUrl(apiBase, row.portrait_key, row.portrait_url, { stream: true }),
  }
}

function presentBrand(row: BrandRow, apiBase: string) {
  return {
    id: row.id,
    name: row.name,
    logoKey: row.logo_key,
    logoUrl: resolveMediaUrl(apiBase, row.logo_key, row.logo_url, { stream: true }),
    websiteUrl: row.website_url,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
  }
}

function presentProcess(row: ProcessRow, apiBase: string, index: number) {
  return {
    id: row.id,
    number: String(index + 1).padStart(2, '0'),
    title: row.title,
    answer: row.answer,
    imageKey: row.image_key,
    imageUrl: resolveMediaUrl(apiBase, row.image_key, row.image_url, { stream: true }),
    sortOrder: row.sort_order,
    isPublished: row.is_published,
  }
}

/** Public: full about page payload */
aboutRouter.get('/', async (req, res) => {
  try {
    const apiBase = apiBaseFromRequest(req)
    const all = String(req.query.all ?? '') === '1'
    const supabase = getSupabase()
    const profile = await ensureProfile()

    let brandsQuery = supabase.from('about_brands').select('*').order('sort_order', { ascending: true })
    let processQuery = supabase
      .from('about_process_steps')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!all) {
      brandsQuery = brandsQuery.eq('is_published', true)
      processQuery = processQuery.eq('is_published', true)
    }

    const [{ data: brands, error: bErr }, { data: steps, error: pErr }] = await Promise.all([
      brandsQuery,
      processQuery,
    ])
    if (bErr) throw bErr
    if (pErr) throw pErr

    res.json({
      profile: presentProfile(profile, apiBase),
      brands: (brands as BrandRow[] | null)?.map((b) => presentBrand(b, apiBase)) ?? [],
      process: (steps as ProcessRow[] | null)?.map((s, i) => presentProcess(s, apiBase, i)) ?? [],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load about page' })
  }
})

aboutRouter.put('/profile', requireAuth, async (req, res) => {
  try {
    await ensureProfile()
    const updates: Record<string, unknown> = {}
    const map: Record<string, string> = {
      displayName: 'display_name',
      roleTitle: 'role_title',
      yearsExperience: 'years_experience',
      projectsCount: 'projects_count',
      headline: 'headline',
      bio: 'bio',
      bioSecondary: 'bio_secondary',
      location: 'location',
      portrait_key: 'portrait_key',
      portrait_url: 'portrait_url',
    }

    for (const [from, to] of Object.entries(map)) {
      if (req.body?.[from] !== undefined) {
        if (from === 'yearsExperience' || from === 'projectsCount') {
          updates[to] = Number(req.body[from]) || 0
        } else if (from === 'portrait_key' || from === 'portrait_url') {
          updates[to] = req.body[from] ? String(req.body[from]) : null
        } else {
          updates[to] = req.body[from] == null ? null : String(req.body[from]).trim()
        }
      }
    }

    if (updates.display_name !== undefined && !updates.display_name) {
      res.status(400).json({ error: 'Display name is required' })
      return
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('about_profile')
      .update(updates)
      .eq('id', 1)
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    res.json({ profile: presentProfile(data as ProfileRow, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

aboutRouter.post('/brands', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim()
    if (!name) {
      res.status(400).json({ error: 'Brand name is required' })
      return
    }
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('about_brands')
      .insert({
        name,
        logo_key: req.body?.logo_key ? String(req.body.logo_key) : null,
        logo_url: req.body?.logo_url ? String(req.body.logo_url) : null,
        website_url: req.body?.website_url ? String(req.body.website_url) : null,
        sort_order: Number(req.body?.sort_order) || 0,
        is_published: req.body?.is_published !== false,
      })
      .select('*')
      .single()
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(201).json({ brand: presentBrand(data as BrandRow, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create brand' })
  }
})

aboutRouter.put('/brands/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {}
    if (req.body?.name !== undefined) updates.name = String(req.body.name).trim()
    if (req.body?.logo_key !== undefined) updates.logo_key = req.body.logo_key ? String(req.body.logo_key) : null
    if (req.body?.logo_url !== undefined) updates.logo_url = req.body.logo_url ? String(req.body.logo_url) : null
    if (req.body?.website_url !== undefined)
      updates.website_url = req.body.website_url ? String(req.body.website_url) : null
    if (req.body?.sort_order !== undefined) updates.sort_order = Number(req.body.sort_order) || 0
    if (req.body?.is_published !== undefined) updates.is_published = Boolean(req.body.is_published)

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('about_brands')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.json({ brand: presentBrand(data as BrandRow, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update brand' })
  }
})

aboutRouter.delete('/brands/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('about_brands')
      .select('logo_key')
      .eq('id', req.params.id)
      .maybeSingle()
    const { error } = await supabase.from('about_brands').delete().eq('id', req.params.id)
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    if (existing?.logo_key) {
      try {
        await deleteObject(String(existing.logo_key))
      } catch (err) {
        console.warn('Failed to delete brand logo', err)
      }
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete brand' })
  }
})

aboutRouter.post('/process', requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim()
    const answer = String(req.body?.answer ?? '').trim()
    if (!title || !answer) {
      res.status(400).json({ error: 'Title and answer are required' })
      return
    }
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('about_process_steps')
      .insert({
        title,
        answer,
        image_key: req.body?.image_key ? String(req.body.image_key) : null,
        image_url: req.body?.image_url ? String(req.body.image_url) : null,
        sort_order: Number(req.body?.sort_order) || 0,
        is_published: req.body?.is_published !== false,
      })
      .select('*')
      .single()
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(201).json({
      step: presentProcess(data as ProcessRow, apiBaseFromRequest(req), Number(data.sort_order) || 0),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create process step' })
  }
})

aboutRouter.put('/process/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {}
    if (req.body?.title !== undefined) updates.title = String(req.body.title).trim()
    if (req.body?.answer !== undefined) updates.answer = String(req.body.answer).trim()
    if (req.body?.image_key !== undefined)
      updates.image_key = req.body.image_key ? String(req.body.image_key) : null
    if (req.body?.image_url !== undefined)
      updates.image_url = req.body.image_url ? String(req.body.image_url) : null
    if (req.body?.sort_order !== undefined) updates.sort_order = Number(req.body.sort_order) || 0
    if (req.body?.is_published !== undefined) updates.is_published = Boolean(req.body.is_published)

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('about_process_steps')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.json({
      step: presentProcess(data as ProcessRow, apiBaseFromRequest(req), Number(data.sort_order) || 0),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update process step' })
  }
})

aboutRouter.delete('/process/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('about_process_steps')
      .select('image_key')
      .eq('id', req.params.id)
      .maybeSingle()
    const { error } = await supabase.from('about_process_steps').delete().eq('id', req.params.id)
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    if (existing?.image_key) {
      try {
        await deleteObject(String(existing.image_key))
      } catch (err) {
        console.warn('Failed to delete process image', err)
      }
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete process step' })
  }
})
