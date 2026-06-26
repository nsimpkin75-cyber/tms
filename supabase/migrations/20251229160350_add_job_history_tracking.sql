/*
  # Job History Tracking System

  1. New Tables
    - `job_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `job_title` (text) - the role/title at this point
      - `department` (text) - department at this point
      - `job_family_id` (uuid) - job family at this point
      - `change_type` (text) - 'role_change', 'department_change', 'promotion', 'lateral_move', 'initial'
      - `effective_date` (date) - when the change took effect
      - `changed_by` (uuid) - who made the change (admin/HR)
      - `notes` (text) - optional notes about the change
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `job_title` column to profiles if not exists
    - This will be the current job title separate from the role field

  3. Security
    - Enable RLS on job_history table
    - Users can view their own history
    - Admins and managers can view team history
    - Only admins can insert/update history records

  4. Function
    - Create a function to track job changes automatically
    - This function will be called when profiles are updated
*/

-- Add job_title to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE profiles ADD COLUMN job_title text;
  END IF;
END $$;

-- Create job history table
CREATE TABLE IF NOT EXISTS job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_title text NOT NULL,
  department text NOT NULL,
  job_family_id uuid REFERENCES job_families(id),
  change_type text NOT NULL CHECK (change_type IN ('initial', 'role_change', 'department_change', 'promotion', 'lateral_move', 'demotion')),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  changed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own job history
CREATE POLICY "Users can view own job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Managers can view their team's job history
CREATE POLICY "Managers can view team job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = job_history.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can view all job history
CREATE POLICY "Admins can view all job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert job history
CREATE POLICY "Admins can insert job history"
  ON job_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update job history
CREATE POLICY "Admins can update job history"
  ON job_history FOR UPDATE
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

-- Create function to determine change type
CREATE OR REPLACE FUNCTION determine_job_change_type(
  old_title text,
  new_title text,
  old_dept text,
  new_dept text,
  old_job_family uuid,
  new_job_family uuid
) RETURNS text AS $$
BEGIN
  -- If department changed
  IF old_dept IS DISTINCT FROM new_dept THEN
    -- Check if it's also a role change
    IF old_title IS DISTINCT FROM new_title OR old_job_family IS DISTINCT FROM new_job_family THEN
      RETURN 'role_change';
    ELSE
      RETURN 'department_change';
    END IF;
  END IF;
  
  -- If job family changed, it's likely a promotion or lateral move
  IF old_job_family IS DISTINCT FROM new_job_family THEN
    RETURN 'lateral_move';
  END IF;
  
  -- If only title changed within same family, check if it's a promotion
  IF old_title IS DISTINCT FROM new_title THEN
    -- You could add logic here to determine if it's a promotion based on job levels
    RETURN 'promotion';
  END IF;
  
  RETURN 'role_change';
END;
$$ LANGUAGE plpgsql;

-- Create function to track job changes
CREATE OR REPLACE FUNCTION track_job_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_type_val text;
BEGIN
  -- Only track if relevant fields changed
  IF (OLD.job_title IS DISTINCT FROM NEW.job_title) OR
     (OLD.department IS DISTINCT FROM NEW.department) OR
     (OLD.job_family_id IS DISTINCT FROM NEW.job_family_id) THEN
    
    -- Determine the type of change
    change_type_val := determine_job_change_type(
      OLD.job_title,
      NEW.job_title,
      OLD.department,
      NEW.department,
      OLD.job_family_id,
      NEW.job_family_id
    );
    
    -- Insert into job history
    INSERT INTO job_history (
      user_id,
      job_title,
      department,
      job_family_id,
      change_type,
      effective_date,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      NEW.job_title,
      NEW.department,
      NEW.job_family_id,
      change_type_val,
      CURRENT_DATE,
      auth.uid(),
      'Automated tracking: ' || 
      CASE 
        WHEN OLD.job_title IS DISTINCT FROM NEW.job_title THEN 'Title changed from ' || COALESCE(OLD.job_title, OLD.role::text, 'Unknown') || ' to ' || COALESCE(NEW.job_title, NEW.role::text, 'Unknown')
        WHEN OLD.department IS DISTINCT FROM NEW.department THEN 'Department changed from ' || OLD.department || ' to ' || NEW.department
        ELSE 'Job details updated'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically track job changes
DROP TRIGGER IF EXISTS track_job_changes_trigger ON profiles;
CREATE TRIGGER track_job_changes_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION track_job_changes();

-- Update profiles to have job_title set from role if not already set
UPDATE profiles
SET job_title = role::text
WHERE job_title IS NULL;

-- Create initial job history records for existing users (one-time migration)
INSERT INTO job_history (user_id, job_title, department, job_family_id, change_type, effective_date, notes)
SELECT 
  id,
  COALESCE(job_title, role::text) as job_title,
  department,
  job_family_id,
  'initial' as change_type,
  COALESCE(created_at::date, CURRENT_DATE) as effective_date,
  'Initial record created during migration'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM job_history WHERE job_history.user_id = profiles.id
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_history_effective_date ON job_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_job_history_change_type ON job_history(change_type);
CREATE INDEX IF NOT EXISTS idx_job_history_department ON job_history(department);

-- Create view for job movement statistics
CREATE OR REPLACE VIEW job_movement_stats AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.job_title as current_job_title,
  p.department as current_department,
  COUNT(jh.id) as total_moves,
  COUNT(CASE WHEN jh.change_type = 'promotion' THEN 1 END) as promotions,
  COUNT(CASE WHEN jh.change_type = 'lateral_move' THEN 1 END) as lateral_moves,
  COUNT(CASE WHEN jh.change_type = 'department_change' THEN 1 END) as department_changes,
  COUNT(CASE WHEN jh.change_type = 'role_change' THEN 1 END) as role_changes,
  MIN(jh.effective_date) as first_role_date,
  MAX(jh.effective_date) as latest_change_date
FROM profiles p
LEFT JOIN job_history jh ON jh.user_id = p.id AND jh.change_type != 'initial'
GROUP BY p.id, p.full_name, p.job_title, p.department;