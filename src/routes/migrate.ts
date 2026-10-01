import { Router } from 'express'
import pg from 'pg'

export const migrateRouter = Router()

const HERO_V2_SQL = `
ALTER TABLE hero_settings
  ADD COLUMN IF NOT EXISTS headline TEXT NOT NULL DEFAULT 'I CRAFT VISUALS THAT GRAB & HOLD ATTENTION.',
  ADD COLUMN IF NOT EXISTS headline_highlight TEXT NOT NULL DEFAULT 'GRAB & HOLD',
  ADD COLUMN IF NOT EXISTS subheadline TEXT NOT NULL DEFAULT 'Specializing in fast-paced storytelling, dynamic motion graphics, and retention-focused edits for creators & brands.',
  ADD COLUMN IF NOT EXISTS primary_cta_label TEXT NOT NULL DEFAULT 'Watch Showreel',
  ADD COLUMN IF NOT EXISTS secondary_cta_label TEXT NOT NULL DEFAULT 'Let''s Collaborate',
  ADD COLUMN IF NOT EXISTS secondary_cta_url TEXT NOT NULL DEFAULT '/contact',
  ADD COLUMN IF NOT EXISTS showreel_title TEXT NOT NULL DEFAULT 'Editing Showreel',
  ADD COLUMN IF NOT EXISTS showreel_url TEXT,
  ADD COLUMN IF NOT EXISTS stat1_value TEXT NOT NULL DEFAULT '50M+',
  ADD COLUMN IF NOT EXISTS stat1_label TEXT NOT NULL DEFAULT 'Total Views',
  ADD COLUMN IF NOT EXISTS stat2_value TEXT NOT NULL DEFAULT '120+',
  ADD COLUMN IF NOT EXISTS stat2_label TEXT NOT NULL DEFAULT 'Reels Edited',
  ADD COLUMN IF NOT EXISTS stat3_value TEXT NOT NULL DEFAULT '98%',
  ADD COLUMN IF NOT EXISTS stat3_label TEXT NOT NULL DEFAULT 'Retention Rate';

CREATE TABLE IF NOT EXISTS hero_reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  badge_text TEXT NOT NULL DEFAULT '',
  overlay_title TEXT,
  author TEXT,
  category_badge TEXT,
  thumbnail_key TEXT,
  thumbnail_url TEXT,
  video_key TEXT,
  video_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hero_reels_sort_idx ON hero_reels (sort_order ASC, created_at ASC);

DROP TRIGGER IF EXISTS hero_reels_updated_at ON hero_reels;
CREATE TRIGGER hero_reels_updated_at
  BEFORE UPDATE ON hero_reels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT ALL ON TABLE hero_reels TO anon, authenticated, service_role;
ALTER TABLE hero_reels DISABLE ROW LEVEL SECURITY;

INSERT INTO hero_reels (title, badge_text, overlay_title, author, category_badge, thumbnail_url, sort_order, is_featured)
SELECT * FROM (VALUES
  (
    'Kitchen Restock',
    '1.2M+ Views',
    'KITCHEN RESTOCK',
    'by SRA Production',
    'Social Edit',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    0,
    FALSE
  ),
  (
    'Ottoman Pickles',
    'Viral Pace',
    'OTTOMAN PICKLES',
    'by SRA Production',
    'Food/Vlog',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    1,
    TRUE
  ),
  (
    'Talking Head Edit',
    'Subtitles & FX',
    'TALKING HEAD',
    'by SRA Production',
    'Creator Edit',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    2,
    FALSE
  )
) AS v(title, badge_text, overlay_title, author, category_badge, thumbnail_url, sort_order, is_featured)
WHERE NOT EXISTS (SELECT 1 FROM hero_reels LIMIT 1);
`

migrateRouter.post('/hero-v2', async (req, res) => {
  try {
    const secret = String(req.headers['x-migrate-secret'] ?? req.query.secret ?? '')
    const expected = process.env.ADMIN_JWT_SECRET || ''
    if (!expected || secret !== expected) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const client = new pg.Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    })

    await client.connect()
    await client.query(HERO_V2_SQL)
    const reels = await client.query('select count(*)::int as n from hero_reels')
    await client.end()

    res.json({ ok: true, reels: reels.rows[0].n })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Migration failed',
    })
  }
})
