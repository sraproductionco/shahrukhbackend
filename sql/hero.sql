-- Hero settings (single-row site config)
CREATE TABLE IF NOT EXISTS hero_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  box_text TEXT NOT NULL DEFAULT 'Great videos aren’t just captured. They’re crafted through storytelling, pacing, and purposeful editing.',
  video_key TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO hero_settings (id, box_text)
VALUES (
  1,
  'Great videos aren’t just captured. They’re crafted through storytelling, pacing, and purposeful editing.'
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS hero_settings_updated_at ON hero_settings;
CREATE TRIGGER hero_settings_updated_at
  BEFORE UPDATE ON hero_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT ALL ON TABLE hero_settings TO anon, authenticated, service_role;
ALTER TABLE hero_settings DISABLE ROW LEVEL SECURITY;
