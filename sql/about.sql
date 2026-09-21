-- About page: editor profile (singleton) + brands + work-process steps

CREATE TABLE IF NOT EXISTS about_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'Shahrukh',
  role_title TEXT NOT NULL DEFAULT 'Video Editor',
  years_experience INTEGER NOT NULL DEFAULT 5,
  projects_count INTEGER NOT NULL DEFAULT 40,
  headline TEXT NOT NULL DEFAULT 'Crafting stories through timing, rhythm, and emotion.',
  bio TEXT NOT NULL DEFAULT '',
  bio_secondary TEXT,
  location TEXT DEFAULT 'Karachi, Pakistan',
  portrait_key TEXT,
  portrait_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO about_profile (
  id, display_name, role_title, years_experience, projects_count, headline, bio, bio_secondary, location
) VALUES (
  1,
  'Shahrukh',
  'Video Editor & Storyteller',
  5,
  48,
  'A video editor focused on feeling, timing, and clarity.',
  'I craft commercials, short films, and branded stories that land with rhythm and emotion. Every cut is intentional — pace for tension, silence for weight, and color for mood.',
  'From rough assembly to final delivery, I collaborate closely with directors and brands to shape footage into narratives audiences remember.',
  'Karachi, Pakistan'
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS about_profile_updated_at ON about_profile;
CREATE TRIGGER about_profile_updated_at
  BEFORE UPDATE ON about_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT ALL ON TABLE about_profile TO anon, authenticated, service_role;
ALTER TABLE about_profile DISABLE ROW LEVEL SECURITY;

-- Brands / companies the editor has worked with
CREATE TABLE IF NOT EXISTS about_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_key TEXT,
  logo_url TEXT,
  website_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS about_brands_sort_idx ON about_brands (sort_order ASC, created_at ASC);

DROP TRIGGER IF EXISTS about_brands_updated_at ON about_brands;
CREATE TRIGGER about_brands_updated_at
  BEFORE UPDATE ON about_brands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT ALL ON TABLE about_brands TO anon, authenticated, service_role;
ALTER TABLE about_brands DISABLE ROW LEVEL SECURITY;

INSERT INTO about_brands (name, logo_url, sort_order)
SELECT * FROM (VALUES
  ('Nova Media', 'https://images.unsplash.com/photo-1611162617474-5b21e11e55d5?auto=format&fit=crop&w=200&q=80', 0),
  ('Apex Films', 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=200&q=80', 1),
  ('Pulse Brand', 'https://images.unsplash.com/photo-1611162618071-b39a2ec1558c?auto=format&fit=crop&w=200&q=80', 2),
  ('Studio North', 'https://images.unsplash.com/photo-1599305445671-ac4069a44d92?auto=format&fit=crop&w=200&q=80', 3),
  ('Frame & Co', 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80', 4)
) AS v(name, logo_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM about_brands LIMIT 1);

-- Work process steps (numbered interactive section)
CREATE TABLE IF NOT EXISTS about_process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  answer TEXT NOT NULL,
  image_key TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS about_process_sort_idx ON about_process_steps (sort_order ASC, created_at ASC);

DROP TRIGGER IF EXISTS about_process_updated_at ON about_process_steps;
CREATE TRIGGER about_process_updated_at
  BEFORE UPDATE ON about_process_steps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

GRANT ALL ON TABLE about_process_steps TO anon, authenticated, service_role;
ALTER TABLE about_process_steps DISABLE ROW LEVEL SECURITY;

INSERT INTO about_process_steps (title, answer, image_url, sort_order)
SELECT * FROM (VALUES
  (
    'How does the creative briefing process work?',
    'We start with a discovery call — goals, audience, references, and delivery platforms. I map tone, pacing, and must-hit moments so the edit has a clear north star before a single cut lands on the timeline.',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
    0
  ),
  (
    'What does the first assembly look like?',
    'You receive a story-first rough cut focused on structure and emotion. We lock narrative beats early, then refine timing, sound, and polish in the next rounds instead of chasing effects too soon.',
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80',
    1
  ),
  (
    'How do feedback and revisions work?',
    'Feedback is collected in clear rounds with timestamps and priorities. I implement changes efficiently, protect the story arc, and keep versions organized so nothing gets lost between notes.',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80',
    2
  ),
  (
    'What finishing touches are included?',
    'Color, sound design, titles, and motion polish are treated as part of the narrative — not afterthoughts. The final master is tuned for mood, clarity, and platform-ready delivery.',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
    3
  ),
  (
    'How is the project delivered?',
    'You get export packages for ads, reels, and cinematic masters — with specs matched to each platform. Assets are labeled, versioned, and ready to publish or hand off to your team.',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80',
    4
  )
) AS v(title, answer, image_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM about_process_steps LIMIT 1);
