ALTER TABLE organisation_branding
  ADD COLUMN IF NOT EXISTS opal_about TEXT,
  ADD COLUMN IF NOT EXISTS opal_intro_heading TEXT,
  ADD COLUMN IF NOT EXISTS opal_capabilities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS opal_personality JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS opal_communication JSONB DEFAULT '{}'::jsonb;
