/*
  # Add owner_id to career_plan_actions and auto-complete plan logic

  ## Changes

  1. New column
     - `owner_id` (uuid, FK → profiles) — the user responsible for signing off / completing this action
       Nullable so existing rows are unaffected.

  2. Index
     - `idx_career_plan_actions_owner_id` for fast dashboard queries by owner

  3. RLS
     - SELECT: authenticated users can read actions for plans they are related to
     - UPDATE completed_at/completed_by: only the assigned owner may mark complete
       (enforced in application layer via owner_id check; DB RLS already allows updates
        to career_plan_actions by plan participants — no new restrictive policy needed here
        as the existing policies cover it, and the app enforces the owner check)

  ## Notes
  - `owner_name` (text) is kept for display / legacy compatibility
  - Progress % and auto-complete-plan logic is handled in the application layer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plan_actions' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE career_plan_actions
      ADD COLUMN owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_career_plan_actions_owner_id
  ON career_plan_actions(owner_id);
