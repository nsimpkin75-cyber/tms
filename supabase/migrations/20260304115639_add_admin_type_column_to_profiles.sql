/*
  # Add admin_type column to profiles table
  
  1. Purpose
    - Add admin_type column to support different admin levels
    - Add missing columns that the frontend expects
  
  2. Changes
    - Add admin_type column (nullable)
    - Add has_strategic_roadmap_access column
    - Add manager_id and job_family_id if missing
  
  3. Security
    - No policy changes needed
*/

-- Add admin_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'admin_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_type text CHECK (admin_type IN ('full_admin', 'job_families_admin', 'people_admin'));
  END IF;
END $$;

-- Add has_strategic_roadmap_access column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_strategic_roadmap_access'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_strategic_roadmap_access boolean DEFAULT false;
  END IF;
END $$;

-- Add manager_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);
  END IF;
END $$;

-- Add job_family_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'job_family_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN job_family_id uuid REFERENCES job_families(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON profiles(job_family_id);
  END IF;
END $$;

-- Update Nicola to be a full admin
UPDATE profiles 
SET admin_type = 'full_admin', 
    role = 'admin'
WHERE email = 'nicola.hurcombe@eposnow.com';
