-- Portfolio services (home carousel slides: image OR autoplay video)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  image_key TEXT,
  image_url TEXT,
  video_key TEXT,
  video_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_sort_idx ON services (sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS services_published_idx ON services (is_published);

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT ALL ON TABLE services TO anon, authenticated, service_role;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- Seed starter slides (replace media anytime from Admin → Services)
INSERT INTO services (title, description, media_type, image_url, sort_order)
SELECT * FROM (VALUES
  (
    'Commercial Editing',
    'High-impact ads and brand spots with tight pacing and clear product storytelling.',
    'image',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80',
    0
  ),
  (
    'Short Film & Narrative',
    'Scene rhythm, performance, and emotional arcs shaped into a finished cut.',
    'image',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80',
    1
  ),
  (
    'Social & Reels',
    'Vertical-first edits optimized for retention, hooks, and platform delivery.',
    'image',
    'https://images.unsplash.com/photo-1611162616475-46b635cb495c?auto=format&fit=crop&w=900&q=80',
    2
  ),
  (
    'Color & Finishing',
    'Look development, polish, titles, and export packages ready for publish.',
    'image',
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80',
    3
  ),
  (
    'Talking Head',
    'Clean interview and presenter edits with pacing that keeps viewers watching.',
    'image',
    'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=900&q=80',
    4
  ),
  (
    'Motion Graphics',
    'Titles, lower thirds, and graphic packages that support the story.',
    'image',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
    5
  )
) AS seed(title, description, media_type, image_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM services LIMIT 1);
