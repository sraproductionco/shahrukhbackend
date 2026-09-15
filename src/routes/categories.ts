import { Router } from 'express'
import { getSupabase } from '../config/supabase.js'
import { requireAuth } from '../services/auth.js'
import { slugify } from '../utils/slugify.js'

export const categoriesRouter = Router()

categoriesRouter.get('/', async (_req, res) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    res.json({ categories: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load categories' })
  }
})

categoriesRouter.post('/', requireAuth, async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim()
    const description = req.body?.description ? String(req.body.description).trim() : null
    const sort_order = Number(req.body?.sort_order ?? 0)
    if (!name) {
      res.status(400).json({ error: 'Name is required' })
      return
    }

    const slug = slugify(String(req.body?.slug ?? name))
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, slug, description, sort_order })
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.status(201).json({ category: data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

categoriesRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id
    const updates: Record<string, unknown> = {}
    if (req.body?.name !== undefined) updates.name = String(req.body.name).trim()
    if (req.body?.description !== undefined) {
      updates.description = req.body.description ? String(req.body.description).trim() : null
    }
    if (req.body?.sort_order !== undefined) updates.sort_order = Number(req.body.sort_order)
    if (req.body?.slug !== undefined) updates.slug = slugify(String(req.body.slug))
    else if (updates.name) updates.slug = slugify(String(updates.name))

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.json({ category: data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

categoriesRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('categories').delete().eq('id', req.params.id)
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})
