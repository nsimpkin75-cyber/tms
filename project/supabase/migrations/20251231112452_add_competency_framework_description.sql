/*
  # Add Competency Framework Description Setting
  
  ## Changes
  1. Create system_settings table for application-wide settings
     - Stores key-value pairs for various system configurations
     - Includes competency_framework_description for manager guidance
  
  2. Security
     - Enable RLS on system_settings table
     - Only admins can update settings
     - All authenticated users can read settings
  
  3. Initial Data
     - Add default competency framework description
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Authenticated users can read settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow only admins to update settings
CREATE POLICY "Admins can update settings"
  ON system_settings
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

-- Allow only admins to insert settings
CREATE POLICY "Admins can insert settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default competency framework description
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'competency_framework_description',
  'Use this competency framework to guide performance reviews, career development conversations, and succession planning. Each competency has four levels that define the progression from developing skills to expert mastery. When assessing employees or planning development, refer to the specific level definitions to ensure consistency across the organization.',
  'Description text shown at the top of the Competency Framework page to guide managers'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Add helpful comment
COMMENT ON TABLE system_settings IS 'System-wide configuration settings for the application';
