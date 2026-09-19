import { Router } from 'express'
import { getSupabase } from '../config/supabase.js'
import { requireAuth } from '../services/auth.js'
import { apiBaseFromRequest, mediaProxyUrl } from '../utils/mediaUrl.js'
import { isDirectPublicMediaUrl } from '../services/supabaseStorage.js'

export const heroRouter = Router()

const DEFAULT_BOX =
  'Great videos aren’t just captured. They’re crafted through storytelling, pacing, and purposeful editing.'

type HeroRow = {
  id: number
  box_text: string
  video_key: string | null
  video_url: string | null
}

async function ensureHeroRow() {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('hero_settings').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  if (data) return data as HeroRow

  const { data: created, error: insertError } = await supabase
    .from('hero_settings')
    .insert({
      id: 1,
      box_text: DEFAULT_BOX,
      video_key: null,
      video_url: null,
    })
    .select('*')
    .single()

  if (insertError) throw insertError
  return created as HeroRow
}

function presentHero(row: HeroRow, apiBase: string) {
  const videoUrl = isDirectPublicMediaUrl(row.video_url)
    ? row.video_url
    : mediaProxyUrl(apiBase, row.video_key) ?? row.video_url ?? null

  return {
    boxText: row.box_text || DEFAULT_BOX,
    videoKey: row.video_key,
    videoUrl,
  }
}

heroRouter.get('/', async (req, res) => {
  try {
    const row = await ensureHeroRow()
    res.json({ hero: presentHero(row, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load hero settings' })
  }
})

heroRouter.put('/', requireAuth, async (req, res) => {
  try {
    await ensureHeroRow()
    const updates: Record<string, unknown> = {}

    if (req.body?.boxText !== undefined) {
      const text = String(req.body.boxText).trim()
      if (!text) {
        res.status(400).json({ error: 'Box text is required' })
        return
      }
      updates.box_text = text
    }

    if (req.body?.video_key !== undefined) {
      updates.video_key = req.body.video_key ? String(req.body.video_key) : null
    }
    if (req.body?.video_url !== undefined) {
      updates.video_url = req.body.video_url ? String(req.body.video_url) : null
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

    res.json({ hero: presentHero(data as HeroRow, apiBaseFromRequest(req)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update hero settings' })
  }
})
