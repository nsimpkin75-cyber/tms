/*
  # Access Level Permissions Schema

  Establishes a canonical permissions jsonb structure for access_level_types,
  adds a protected "Full Admin" access level that cannot be deleted,
  and seeds all existing access levels with correct permission flags.

  ## Permission Keys (stored in access_level_types.permissions jsonb)

  ### Dashboard / View access
  - dashboard_employee       — Employee dashboard tab
  - dashboard_manager        — Manager / My Team dashboard tab
  - dashboard_dept_lead      — Department dashboard tab
  - dashboard_admin          — Organisation dashboard tab (leadership view)

  ### Reviews
  - view_review_templates    — View review templates list
  - create_review_templates  — Create and edit review templates
  - delete_review_templates  — Delete review templates
  - start_reviews            — Start / schedule a review cycle
  - edit_submitted_reviews   — Edit reviews within allowed timeframe
  - view_completed_reviews   — View completed review history
  - delete_reviews           — Delete reviews (admin correction)

  ### Career & Skills
  - access_career_pathways   — Career pathways module
  - access_skills_matrix     — Skills matrix module
  - manage_assessment_templates — Create/edit/delete assessment templates

  ### Team & Reporting
  - view_team                — Team views (manager's direct reports)
  - view_reporting           — Reporting dashboards
  - view_nine_box            — 9-box grid

  ### Administration
  - manage_users             — User management
  - manage_org_settings      — Organisation settings
  - manage_access_levels     — Access level management
  - manage_sera              — SERA configuration / settings
  - full_admin               — Full unrestricted access (protected)

  ## Protection
  - is_protected column added: rows with is_protected = true cannot be deleted
  - Full Admin row has is_protected = true
  - Employee row has is_protected = true (always baseline)
*/

-- Add is_protected column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_level_types' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE access_level_types ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Upsert Full Admin (protected, cannot be deleted)
INSERT INTO access_level_types (name, description, permissions, is_system, is_protected, is_active)
VALUES (
  'Full Admin',
  'Full unrestricted system access. This access level cannot be deleted.',
  '{
    "full_admin": true,
    "dashboard_employee": true,
    "dashboard_manager": true,
    "dashboard_dept_lead": true,
    "dashboard_admin": true,
    "view_review_templates": true,
    "create_review_templates": true,
    "delete_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "delete_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "manage_assessment_templates": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "manage_users": true,
    "manage_org_settings": true,
    "manage_access_levels": true,
    "manage_sera": true
  }'::jsonb,
  true,
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system,
  is_protected = EXCLUDED.is_protected,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Mark Employee as protected (always baseline)
UPDATE access_level_types
SET
  is_protected = true,
  permissions = '{
    "dashboard_employee": true,
    "view_own_profile": true,
    "view_own_reviews": true,
    "access_career_pathways": true,
    "access_training": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Employee';

-- Update Admin
UPDATE access_level_types
SET
  permissions = '{
    "full_admin": true,
    "dashboard_employee": true,
    "dashboard_manager": true,
    "dashboard_dept_lead": true,
    "dashboard_admin": true,
    "view_review_templates": true,
    "create_review_templates": true,
    "delete_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "delete_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "manage_assessment_templates": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "manage_users": true,
    "manage_org_settings": true,
    "manage_access_levels": true,
    "manage_sera": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Admin';

-- Update Manager
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_manager": true,
    "view_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "access_training": true,
    "conduct_reviews": true,
    "view_own_profile": true,
    "view_own_reviews": true,
    "view_team_reports": true,
    "access_career_plans": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Manager';

-- Update Department Lead
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_manager": true,
    "dashboard_dept_lead": true,
    "view_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "manage_users": false
  }'::jsonb,
  updated_at = now()
WHERE name = 'Department Lead';

-- Update Exec
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_admin": true,
    "view_review_templates": true,
    "view_completed_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "view_reporting": true,
    "view_nine_box": true,
    "view_team": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Exec';

-- Update L&D Admin
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_admin": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "manage_assessment_templates": true,
    "view_reporting": true,
    "manage_training": true,
    "view_all_users": true,
    "send_assessment_forms": true,
    "create_skills_matrices": true,
    "create_assessment_forms": true,
    "view_own_profile": true,
    "access_reports": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'L&D Admin';
