
CREATE TABLE IF NOT EXISTS organisation_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Organisation identity
  platform_name text NOT NULL DEFAULT 'Evolo',
  tagline text NOT NULL DEFAULT 'The People Operating System',
  subtitle text NOT NULL DEFAULT 'Bringing people and organisations together for continuous growth.',
  logo_url text,
  favicon_url text,

  -- Colour palette
  color_primary text NOT NULL DEFAULT '#0891b2',
  color_primary_dark text NOT NULL DEFAULT '#0e7490',
  color_secondary text NOT NULL DEFAULT '#64748b',
  color_accent text NOT NULL DEFAULT '#06b6d4',
  color_background text NOT NULL DEFAULT '#f1f5f9',
  color_card_bg text NOT NULL DEFAULT '#ffffff',
  color_text_primary text NOT NULL DEFAULT '#0f172a',
  color_text_secondary text NOT NULL DEFAULT '#64748b',
  color_success text NOT NULL DEFAULT '#16a34a',
  color_warning text NOT NULL DEFAULT '#d97706',
  color_error text NOT NULL DEFAULT '#dc2626',
  color_info text NOT NULL DEFAULT '#2563eb',
  color_sidebar_bg text NOT NULL DEFAULT '#1e293b',
  color_sidebar_text text NOT NULL DEFAULT '#cbd5e1',
  color_sidebar_active text NOT NULL DEFAULT '#0891b2',

  -- Typography
  font_family text NOT NULL DEFAULT 'Inter',
  font_size_base text NOT NULL DEFAULT '16px',

  -- Button style
  button_radius text NOT NULL DEFAULT '0.5rem',
  button_style text NOT NULL DEFAULT 'filled',

  -- Card style
  card_radius text NOT NULL DEFAULT '0.75rem',
  card_shadow text NOT NULL DEFAULT 'sm',
  card_border text NOT NULL DEFAULT 'light',
  card_spacing text NOT NULL DEFAULT 'normal',

  -- Opal branding
  opal_display_name text NOT NULL DEFAULT 'Opal',
  opal_welcome_message text NOT NULL DEFAULT 'Hi! I''m Opal, your AI Growth Guide. How can I help you today?',
  opal_color_theme text NOT NULL DEFAULT 'cyan',
  opal_avatar_url text,

  -- Metadata
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Ensure only one active branding row
CREATE UNIQUE INDEX IF NOT EXISTS organisation_branding_active ON organisation_branding (is_active) WHERE is_active = true;

-- RLS
ALTER TABLE organisation_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_branding" ON organisation_branding FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_branding" ON organisation_branding FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "update_branding" ON organisation_branding FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "delete_branding" ON organisation_branding FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default Evolo branding
INSERT INTO organisation_branding (
  platform_name, tagline, subtitle,
  color_primary, color_primary_dark, color_secondary, color_accent,
  color_background, color_card_bg, color_text_primary, color_text_secondary,
  color_success, color_warning, color_error, color_info,
  color_sidebar_bg, color_sidebar_text, color_sidebar_active,
  font_family, button_radius, button_style,
  card_radius, card_shadow, card_border, card_spacing,
  opal_display_name, opal_welcome_message, opal_color_theme,
  is_active
) VALUES (
  'Evolo', 'The People Operating System', 'Bringing people and organisations together for continuous growth.',
  '#0891b2', '#0e7490', '#64748b', '#06b6d4',
  '#f1f5f9', '#ffffff', '#0f172a', '#64748b',
  '#16a34a', '#d97706', '#dc2626', '#2563eb',
  '#1e293b', '#cbd5e1', '#0891b2',
  'Inter', '0.5rem', 'filled',
  '0.75rem', 'sm', 'light', 'normal',
  'Opal', 'Hi! I''m Opal, your AI Growth Guide. How can I help you today?', 'cyan',
  true
);
