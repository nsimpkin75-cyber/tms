/*
  # Add Custom E-Learning Module Builder System

  1. Changes to existing tables
    - Add `module_type` to training_courses ('external' or 'custom')
    - Add `thumbnail_url` for module preview images
    - Add `is_published` for draft/published state

  2. New Tables
    - `training_module_pages`
      - Stores individual pages/slides for custom e-learning modules
      - Supports multiple content types (text, video, image, quiz)
      - Ordered by sort_order
      - Contains rich content in JSONB format

  3. Security
    - Enable RLS on new tables
    - Admins can manage all module content
    - Users can view published module pages

  4. Notes
    - External modules use module_url (YouTube, external links)
    - Custom modules use training_module_pages for content
    - Each page can contain multiple content blocks
*/

-- Add new columns to training_courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'module_type'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN module_type text DEFAULT 'external' CHECK (module_type IN ('external', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN thumbnail_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN is_published boolean DEFAULT true;
  END IF;
END $$;

-- Create training_module_pages table
CREATE TABLE IF NOT EXISTS training_module_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_training_module_pages_course_id ON training_module_pages(course_id);
CREATE INDEX IF NOT EXISTS idx_training_module_pages_sort_order ON training_module_pages(course_id, sort_order);

-- Enable RLS on training_module_pages
ALTER TABLE training_module_pages ENABLE ROW LEVEL SECURITY;

-- Admins can manage all module pages
CREATE POLICY "Admins can manage module pages"
  ON training_module_pages
  FOR ALL
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

-- All authenticated users can view published module pages
CREATE POLICY "Users can view published module pages"
  ON training_module_pages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_courses
      WHERE training_courses.id = training_module_pages.course_id
      AND training_courses.is_published = true
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_training_module_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_training_module_pages_updated_at ON training_module_pages;

CREATE TRIGGER update_training_module_pages_updated_at
  BEFORE UPDATE ON training_module_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_training_module_pages_updated_at();
