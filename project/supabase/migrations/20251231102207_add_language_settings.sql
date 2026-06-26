/*
  # Add Language Settings

  1. New Tables
    - `organisation_settings`
      - `id` (uuid, primary key)
      - `language` (text, default 'en-GB' for British English)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `organisation_settings` table
    - Add policy for authenticated users to read settings
    - Add policy for admin users to update settings

  3. Notes
    - Supports multiple languages with 'en-GB' (British English) as default
    - Only one record exists for organisation-wide settings
*/

-- Create organisation_settings table
CREATE TABLE IF NOT EXISTS organisation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text DEFAULT 'en-GB' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE organisation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read settings
CREATE POLICY "Authenticated users can read organisation settings"
  ON organisation_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can update settings
CREATE POLICY "Admins can update organisation settings"
  ON organisation_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert settings
CREATE POLICY "Admins can insert organisation settings"
  ON organisation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default settings (only if no settings exist)
INSERT INTO organisation_settings (language)
SELECT 'en-GB'
WHERE NOT EXISTS (SELECT 1 FROM organisation_settings);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organisation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS organisation_settings_updated_at ON organisation_settings;
CREATE TRIGGER organisation_settings_updated_at
  BEFORE UPDATE ON organisation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organisation_settings_updated_at();
