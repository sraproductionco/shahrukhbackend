import { Router } from 'express'
import { getSupabase } from '../config/supabase.js'
import { requireAuth } from '../services/auth.js'
import { deleteObject } from '../services/storage.js'
import { apiBaseFromRequest, resolveMediaUrl } from '../utils/mediaUrl.js'

export const heroRouter = Router()

const DEFAULTS = {
  box_text:
    'Great videos aren’t just captured. They’re crafted through storytelling, pacing, and purposeful editing.',
  headline: 'I CRAFT VISUALS THAT GRAB & HOLD ATTENTION.',
  headline_highlight: 'GRAB & HOLD',
  subheadline:
    'Specializing in fast-paced storytelling, dynamic motion graphics, and retention-focused edits for creators & brands.',
  primary_cta_label: 'Watch Showreel',
  secondary_cta_label: "Let's Collaborate",
  secondary_cta_url: '/contact',
  showreel_title: 'Editing Showreel',
  showreel_url: null as string | null,
  stat1_value: '50M+',
  stat1_label: 'Total Views',
  stat2_value: '120+',
  stat2_label: 'Reels Edited',
  stat3_value: '98%',
  stat3_label: 'Retention Rate',
}

type HeroRow = {
  id: number
  box_text: string
  video_key: string | null
  video_url: string | null
  headline: string
  headline_highlight: string
  subheadline: string
  primary_cta_label: string
  secondary_cta_label: string
  secondary_cta_url: string
  showreel_title: string
  showreel_url: string | null
  stat1_value: string
  stat1_label: string
  stat2_value: string
  stat2_label: string
  stat3_value: string
  stat3_label: string
}

type ReelRow = {
  id: string
  title: string
  badge_text: string
  overlay_title: string | null
  author: string | null
  category_badge: string | null
  thumbnail_key: string | null
  thumbnail_url: string | null
  video_key: string | null
  video_url: string | null
  sort_order: number
  is_featured: boolean
  is_published: boolean
}

async function ensureHeroRow(): Promise<HeroRow> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('hero_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  if (data) return data as HeroRow

  const { data: created, error: insertError } = await supabase
    .from('hero_settings')
    .insert({
      id: 1,
      ...DEFAULTS,
      video_key: null,
      video_url: null,
    })
    .select('*')
    .single()
  if (insertError) throw insertError
  return created as HeroRow
}

function presentHero(row: HeroRow, apiBase: string) {
  return {
    boxText: row.box_text || DEFAULTS.box_text,
    videoKey: row.video_key,
    videoUrl: resolveMediaUrl(apiBase, row.video_key, row.video_url),
    headline: row.headline || DEFAULTS.headline,
    headlineHighlight: row.headline_highlight || DEFAULTS.headline_highlight,
    subheadline: row.subheadline || DEFAULTS.subheadline,
    primaryCtaLabel: row.primary_cta_label || DEFAULTS.primary_cta_label,
    secondaryCtaLabel: row.secondary_cta_label || DEFAULTS.secondary_cta_label,
    secondaryCtaUrl: row.secondary_cta_url || DEFAULTS.secondary_cta_url,
    showreelTitle: row.showreel_title || DEFAULTS.showreel_title,
    showreelUrl: row.showreel_url,
    stats: [
      { value: row.stat1_value || DEFAULTS.stat1_value, label: row.stat1_label || DEFAULTS.stat1_label },
      { value: row.stat2_value || DEFAULTS.stat2_value, label: row.stat2_label || DEFAULTS.stat2_label },
      { value: row.stat3_value || DEFAULTS.stat3_value, label: row.stat3_label || DEFAULTS.stat3_label },
    ],
  }
}

function presentReel(row: ReelRow, apiBase: string) {
  return {
    id: row.id,
    title: row.title,
    badgeText: row.badge_text,
    overlayTitle: row.overlay_title,
    author: row.author,
    categoryBadge: row.category_badge,
    thumbnailKey: row.thumbnail_key,
    thumbnailUrl: resolveMediaUrl(apiBase, row.thumbnail_key, row.thumbnail_url, { stream: true }),
    videoKey: row.video_key,
    videoUrl: resolveMediaUrl(apiBase, row.video_key, row.video_url),
    sortOrder: row.sort_order,
    isFeatured: row.is_featured,
    isPublished: row.is_published,
  }
}

heroRouter.get('/', async (req, res) => {
  try {
    const apiBase = apiBaseFromRequest(req)
    const all = String(req.query.all ?? '') === '1'
    const hero = await ensureHeroRow()

    let reels: ReelRow[] = []
    try {
      let reelsQuery = getSupabase()
        .from('hero_reels')
        .select('*')
        .order('sort_order', { ascending: true })
      if (!all) reelsQuery = reelsQuery.eq('is_published', true)
      const { data, error } = await reelsQuery
      if (error) throw error
      reels = (data as ReelRow[] | null) ?? []
    } catch (err) {
      console.warn('hero_reels unavailable yet', err)
      reels = []
    }

    res.json({
      hero: presentHero(hero, apiBase),
      reels: reels.map((r) => presentReel(r, apiBase)),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load hero settings' })
  }
})

heroRouter.put('/', requireAuth, async (req, res) => {
  try {
    await ensureHeroRow()
    const updates: Record<string, unknown> = {}
    const map: Record<string, string> = {
      boxText: 'box_text',
      headline: 'headline',
      headlineHighlight: 'headline_highlight',
      subheadline: 'subheadline',
      primaryCtaLabel: 'primary_cta_label',
      secondaryCtaLabel: 'secondary_cta_label',
      secondaryCtaUrl: 'secondary_cta_url',
      showreelTitle: 'showreel_title',
      showreelUrl: 'showreel_url',
      stat1Value: 'stat1_value',
      stat1Label: 'stat1_label',
      stat2Value: 'stat2_value',
      stat2Label: 'stat2_label',
      stat3Value: 'stat3_value',
      stat3Label: 'stat3_label',
      video_key: 'video_key',
      video_url: 'video_url',
    }

    for (const [from, to] of Object.entries(map)) {
      if (req.body?.[from] === undefined) continue
      const raw = req.body[from]
      if (from === 'video_key' || from === 'video_url' || from === 'showreelUrl') {
        updates[to] = raw ? String(raw).trim() : null
      } else {
        updates[to] = String(raw ?? '').trim()
      }
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('hero_settings')
      .update(updates)
      .eq('id', 1)
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    const apiBase = apiBaseFromRequest(req)
    const { data: reels } = await supabase
      .from('hero_reels')
      .select('*')
      .order('sort_order', { ascending: true })

    res.json({
      hero: presentHero(data as HeroRow, apiBase),
      reels: (reels as ReelRow[] | null)?.map((r) => presentReel(r, apiBase)) ?? [],
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update hero settings' })
  }
})

heroRouter.post('/reels', requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title ?? '').trim()
    if (!title) {
      res.status(400).json({ error: 'Title is required' })
      return
    }

    const supabase = getSupabase()
    if (req.body?.is_featured === true) {
      await supabase.from('hero_reels').update({ is_featured: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    }

    const { data, error } = await supabase
      .from('hero_reels')
      .insert({
        title,
        badge_text: String(req.body?.badge_text ?? '').trim(),
        overlay_title: req.body?.overlay_title ? String(req.body.overlay_title).trim() : null,
        author: req.body?.author ? String(req.body.author).trim() : null,
        category_badge: req.body?.category_badge ? String(req.body.category_badge).trim() : null,
        thumbnail_key: req.body?.thumbnail_key ? String(req.body.thumbnail_key) : null,
        thumbnail_url: req.body?.thumbnail_url ? String(req.body.thumbnail_url) : null,
        video_key: req.body?.video_key ? String(req.body.video_key) : null,
        video_url: req.body?.video_url ? String(req.body.video_url) : null,
        sort_order: Number(req.body?.sort_order) || 0,
        is_featured: Boolean(req.body?.is_featured),
        is_published: req.body?.is_published !== false,
      })
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    res.status(201).json({ reel: presentReel(data as ReelRow, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create reel' })
  }
})

heroRouter.put('/reels/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {}
    const fields = [
      'title',
      'badge_text',
      'overlay_title',
      'author',
      'category_badge',
      'thumbnail_key',
      'thumbnail_url',
      'video_key',
      'video_url',
      'sort_order',
      'is_featured',
      'is_published',
    ] as const

    for (const field of fields) {
      if (req.body?.[field] === undefined) continue
      if (field === 'sort_order') updates[field] = Number(req.body[field]) || 0
      else if (field === 'is_featured' || field === 'is_published') updates[field] = Boolean(req.body[field])
      else if (
        field === 'overlay_title' ||
        field === 'author' ||
        field === 'category_badge' ||
        field.endsWith('_key') ||
        field.endsWith('_url')
      ) {
        updates[field] = req.body[field] ? String(req.body[field]).trim() : null
      } else {
        updates[field] = String(req.body[field] ?? '').trim()
      }
    }

    const supabase = getSupabase()
    if (updates.is_featured === true) {
      await supabase.from('hero_reels').update({ is_featured: false }).neq('id', req.params.id)
    }

    const { data, error } = await supabase
      .from('hero_reels')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    res.json({ reel: presentReel(data as ReelRow, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update reel' })
  }
})

heroRouter.delete('/reels/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data: existing } = await supabase
      .from('hero_reels')
      .select('thumbnail_key, video_key')
      .eq('id', req.params.id)
      .maybeSingle()

    const { error } = await supabase.from('hero_reels').delete().eq('id', req.params.id)
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    for (const key of [existing?.thumbnail_key, existing?.video_key]) {
      if (!key) continue
      try {
        await deleteObject(String(key))
      } catch (err) {
        console.warn('Failed to delete reel media', key, err)
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete reel' })
  }
})
